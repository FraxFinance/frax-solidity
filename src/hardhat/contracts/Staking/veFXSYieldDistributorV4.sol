// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================veFXSYieldDistributorV4=======================
// ====================================================================
// Distributes Frax protocol yield based on the claimer's veFXS balance
// V3: Yield will now not accrue for unlocked veFXS

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

// Originally inspired by Synthetix.io, but heavily modified by the Frax team (veFXS portion)
// https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../Uniswap/TransferHelper.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import "../Utils/ReentrancyGuard.sol";
import "./Owned.sol";

contract veFXSYieldDistributorV4 is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private veFXS;
    ERC20 public emittedToken;

    // Addresses
    address public emitted_token_address;

    // Admin addresses
    address public timelock_address;

    // Constant for price precision
    uint256 private constant PRICE_PRECISION = 1e6;

    // Yield and period related
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public yieldRate;
    uint256 public yieldDuration = 604800; // 7 * 86400  (7 days)
    mapping(address => bool) public reward_notifiers;

    // Yield tracking
    uint256 public yieldPerVeFXSStored = 0;
    mapping(address => uint256) public userYieldPerTokenPaid;
    mapping(address => uint256) public yields;

    // veFXS tracking
    uint256 public totalVeFXSParticipating = 0;
    uint256 public totalVeFXSSupplyStored = 0;
    mapping(address => bool) public userIsInitialized;
    mapping(address => uint256) public userVeFXSCheckpointed;
    mapping(address => uint256) public userVeFXSEndpointCheckpointed;
    mapping(address => uint256) private lastRewardClaimTime; // staker addr -> timestamp

    // Greylists
    mapping(address => bool) public greylist;

    // Admin booleans for emergencies
    bool public yieldCollectionPaused = false; // For emergencies

    struct LockedBalance {
        int128 amount;
        uint256 end;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require( msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier notYieldCollectionPaused() {
        require(yieldCollectionPaused == false, "Yield collection is paused");
        _;
    }

    modifier checkpointUser(address account) {
        _checkpointUser(account);
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _emittedToken,
        address _timelock_address,
        address _veFXS_address
    ) Owned(_owner) {
        emitted_token_address = _emittedToken;
        emittedToken = ERC20(_emittedToken);

        veFXS = IveFXS(_veFXS_address);
        lastUpdateTime = block.timestamp;
        timelock_address = _timelock_address;

        reward_notifiers[_owner] = true;
    }

    /* ========== VIEWS ========== */

    function fractionParticipating() external view returns (uint256) {
        return totalVeFXSParticipating.mul(PRICE_PRECISION).div(totalVeFXSSupplyStored);
    }

    // Only positions with locked veFXS can accrue yield. Otherwise, expired-locked veFXS
    // is de-facto rewards for FXS.
    function eligibleCurrentVeFXS(address account) public view returns (uint256 eligible_vefxs_bal, uint256 stored_ending_timestamp) {
        uint256 curr_vefxs_bal = veFXS.balanceOf(account);
        
        // Stored is used to prevent abuse
        stored_ending_timestamp = userVeFXSEndpointCheckpointed[account];

        // Only unexpired veFXS should be eligible
        if (stored_ending_timestamp != 0 && (block.timestamp >= stored_ending_timestamp)){
            eligible_vefxs_bal = 0;
        }
        else if (block.timestamp >= stored_ending_timestamp){
            eligible_vefxs_bal = 0;
        }
        else {
            eligible_vefxs_bal = curr_vefxs_bal;
        }
    }

    function lastTimeYieldApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function yieldPerVeFXS() public view returns (uint256) {
        if (totalVeFXSSupplyStored == 0) {
            return yieldPerVeFXSStored;
        } else {
            return (
                yieldPerVeFXSStored.add(
                    lastTimeYieldApplicable()
                        .sub(lastUpdateTime)
                        .mul(yieldRate)
                        .mul(1e18)
                        .div(totalVeFXSSupplyStored)
                )
            );
        }
    }

    function earned(address account) public view returns (uint256) {
        // Uninitialized users should not earn anything yet
        if (!userIsInitialized[account]) return 0;

        // Get eligible veFXS balances
        (uint256 eligible_current_vefxs, uint256 ending_timestamp) = eligibleCurrentVeFXS(account);

        // If your veFXS is unlocked
        uint256 eligible_time_fraction = PRICE_PRECISION;
        if (eligible_current_vefxs == 0){
            // And you already claimed after expiration
            if (lastRewardClaimTime[account] >= ending_timestamp) {
                // You get NOTHING. You LOSE. Good DAY ser!
                return 0;
            }
            // You haven't claimed yet
            else {
                uint256 eligible_time = (ending_timestamp).sub(lastRewardClaimTime[account]);
                uint256 total_time = (block.timestamp).sub(lastRewardClaimTime[account]);
                eligible_time_fraction = PRICE_PRECISION.mul(eligible_time).div(total_time);
            }
        }

        // If the amount of veFXS increased, only pay off based on the old balance
        // Otherwise, take the midpoint
        uint256 vefxs_balance_to_use;
        {
            uint256 old_vefxs_balance = userVeFXSCheckpointed[account];
            if (eligible_current_vefxs > old_vefxs_balance){
                vefxs_balance_to_use = old_vefxs_balance;
            }
            else {
                vefxs_balance_to_use = ((eligible_current_vefxs).add(old_vefxs_balance)).div(2); 
            }
        }

        return (
            vefxs_balance_to_use
                .mul(yieldPerVeFXS().sub(userYieldPerTokenPaid[account]))
                .mul(eligible_time_fraction)
                .div(1e18 * PRICE_PRECISION)
                .add(yields[account])
        );
    }

    function getYieldForDuration() external view returns (uint256) {
        return (yieldRate.mul(yieldDuration));
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function _checkpointUser(address account) internal {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        sync();

        // Calculate the earnings first
        _syncEarned(account);

        // Get the old and the new veFXS balances
        uint256 old_vefxs_balance = userVeFXSCheckpointed[account];
        uint256 new_vefxs_balance = veFXS.balanceOf(account);

        // Update the user's stored veFXS balance
        userVeFXSCheckpointed[account] = new_vefxs_balance;

        // Update the user's stored ending timestamp
        IveFXS.LockedBalance memory curr_locked_bal_pack = veFXS.locked(account);
        userVeFXSEndpointCheckpointed[account] = curr_locked_bal_pack.end;

        // Update the total amount participating
        if (new_vefxs_balance >= old_vefxs_balance) {
            uint256 weight_diff = new_vefxs_balance.sub(old_vefxs_balance);
            totalVeFXSParticipating = totalVeFXSParticipating.add(weight_diff);
        } else {
            uint256 weight_diff = old_vefxs_balance.sub(new_vefxs_balance);
            totalVeFXSParticipating = totalVeFXSParticipating.sub(weight_diff);
        }

        // Mark the user as initialized
        if (!userIsInitialized[account]) {
            userIsInitialized[account] = true;
            lastRewardClaimTime[account] = block.timestamp;
        }
    }

    function _syncEarned(address account) internal {
        if (account != address(0)) {
            uint256 earned0 = earned(account);
            yields[account] = earned0;
            userYieldPerTokenPaid[account] = yieldPerVeFXSStored;
        }
    }

    // Anyone can checkpoint another user
    function checkpointOtherUser(address user_addr) external {
        _checkpointUser(user_addr);
    }

    // Checkpoints the user
    function checkpoint() external {
        _checkpointUser(msg.sender);
    }

    function getYield() external nonReentrant notYieldCollectionPaused checkpointUser(msg.sender) returns (uint256 yield0) {
        require(greylist[msg.sender] == false, "Address has been greylisted");

        yield0 = yields[msg.sender];
        if (yield0 > 0) {
            yields[msg.sender] = 0;
            TransferHelper.safeTransfer(
                emitted_token_address,
                msg.sender,
                yield0
            );
            emit YieldCollected(msg.sender, yield0, emitted_token_address);
        }

        lastRewardClaimTime[msg.sender] = block.timestamp;
    }


    function sync() public {
        // Update the total veFXS supply
        yieldPerVeFXSStored = yieldPerVeFXS();
        totalVeFXSSupplyStored = veFXS.totalSupply();
        lastUpdateTime = lastTimeYieldApplicable();
    }

    function notifyRewardAmount(uint256 amount) external {
        // Only whitelisted addresses can notify rewards
        require(reward_notifiers[msg.sender], "Sender not whitelisted");

        // Handle the transfer of emission tokens via `transferFrom` to reduce the number
        // of transactions required and ensure correctness of the smission amount
        emittedToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update some values beforehand
        sync();

        // Update the new yieldRate
        if (block.timestamp >= periodFinish) {
            yieldRate = amount.div(yieldDuration);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(yieldRate);
            yieldRate = amount.add(leftover).div(yieldDuration);
        }
        
        // Update duration-related info
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(yieldDuration);

        emit RewardAdded(amount, yieldRate);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Added to support recovering LP Yield and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function setYieldDuration(uint256 _yieldDuration) external onlyByOwnGov {
        require( periodFinish == 0 || block.timestamp > periodFinish, "Previous yield period must be complete before changing the duration for the new period");
        yieldDuration = _yieldDuration;
        emit YieldDurationUpdated(yieldDuration);
    }

    function greylistAddress(address _address) external onlyByOwnGov {
        greylist[_address] = !(greylist[_address]);
    }

    function toggleRewardNotifier(address notifier_addr) external onlyByOwnGov {
        reward_notifiers[notifier_addr] = !reward_notifiers[notifier_addr];
    }

    function setPauses(bool _yieldCollectionPaused) external onlyByOwnGov {
        yieldCollectionPaused = _yieldCollectionPaused;
    }

    function setYieldRate(uint256 _new_rate0, bool sync_too) external onlyByOwnGov {
        yieldRate = _new_rate0;

        if (sync_too) {
            sync();
        }
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward, uint256 yieldRate);
    event OldYieldCollected(address indexed user, uint256 yield, address token_address);
    event YieldCollected(address indexed user, uint256 yield, address token_address);
    event YieldDurationUpdated(uint256 newDuration);
    event RecoveredERC20(address token, uint256 amount);
    event YieldPeriodRenewed(address token, uint256 yieldRate);
    event DefaultInitialization();

    /* ========== A CHICKEN ========== */
    //
    //         ,~.
    //      ,-'__ `-,
    //     {,-'  `. }              ,')
    //    ,( a )   `-.__         ,',')~,
    //   <=.) (         `-.__,==' ' ' '}
    //     (   )                      /)
    //      `-'\   ,                    )
    //          |  \        `~.        /
    //          \   `._        \      /
    //           \     `._____,'    ,'
    //            `-.             ,'
    //               `-._     _,-'
    //                   77jj'
    //                  //_||
    //               __//--'/`
    //             ,--'/`  '
    //
    // [hjw] https://textart.io/art/vw6Sa3iwqIRGkZsN1BC2vweF/chicken
}
