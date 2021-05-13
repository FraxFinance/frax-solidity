// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =======================veFXSRewardsDistributor======================
// ====================================================================
// Collects rewards based on veFXS balance

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

// Originally inspired by Synthetixio, but heavily modified by the Frax team (veFXS portion)
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import "../Utils/ReentrancyGuard.sol";
import "./Owned.sol";

contract veFXSRewardsDistributor is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private veFXS;
    ERC20 public rewardsToken0;

    // Addresses
    address rewards_token_0_address;

    // Admin addresses
    address public owner_address;
    address public timelock_address;

    // Constant for price precision
    uint256 private constant PRICE_PRECISION = 1e6;

    // Reward and period related
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public rewardRate0;
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    // Rewards tracking
    uint256 public rewardPerTokenStored0 = 0;
    mapping(address => uint256) public userRewardPerTokenPaid0;
    mapping(address => uint256) public rewards0;

    // veFXS tracking
    uint256 public totalVeFXSParticipating = 0;
    uint256 public totalVeFXSSupplyStored = 0;
    mapping(address => uint256) public userVeFXSCheckpointed;

    // Greylists
    mapping(address => bool) public greylist;

    // Admin booleans for emergencies
    bool public rewardsCollectionPaused = false; // For emergencies


    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier notRewardsCollectionPaused() {
        require(rewardsCollectionPaused == false,"Rewards collection is paused");
        _;
    }

    modifier updateReward(address account) {
        _updateReward(account);
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _rewardsToken0,
        address _frax_address,
        address _timelock_address,
        address _veFXS_address
    ) public Owned(_owner) {
        owner_address = _owner;
        rewards_token_0_address = _rewardsToken0;
        rewardsToken0 = ERC20(_rewardsToken0);

        veFXS = IveFXS(_veFXS_address);
        lastUpdateTime = block.timestamp;
        timelock_address = _timelock_address;

        // 1 FXS a day at initialization
        rewardRate0 = (uint256(365e18)).div(365 * 86400);
    }

    /* ========== VIEWS ========== */

    function fractionParticipating() external view returns (uint256) {
        return totalVeFXSParticipating.mul(PRICE_PRECISION).div(totalVeFXSSupplyStored);
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalVeFXSSupplyStored == 0) {
            return rewardPerTokenStored0;
        } else {
            return (
                rewardPerTokenStored0.add(
                    lastTimeRewardApplicable()
                        .sub(lastUpdateTime)
                        .mul(rewardRate0)
                        .mul(1e18)
                        .div(totalVeFXSSupplyStored)
                )
            );
        }
    }

    function earned(address account) public view returns (uint256) {
        uint256 reward0 = rewardPerToken();
        return (
            userVeFXSCheckpointed[account]
                .mul(reward0.sub(userRewardPerTokenPaid0[account]))
                .div(1e18)
                .add(rewards0[account])
        );
    }

    function getRewardForDuration() external view returns (uint256) {
        return (rewardRate0.mul(rewardsDuration));
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function _updateReward(address account) internal {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        sync();

        // Get the old and the new veFXS balances
        uint256 old_vefxs_balance = userVeFXSCheckpointed[account];
        uint256 new_vefxs_balance = veFXS.balanceOf(account);

        // Update the user's stored veFXS balance
        userVeFXSCheckpointed[account] = new_vefxs_balance;

        // Update the total amount participating
        if (new_vefxs_balance >= old_vefxs_balance) {
            uint256 weight_diff = new_vefxs_balance.sub(old_vefxs_balance);
            totalVeFXSParticipating = totalVeFXSParticipating.add(weight_diff);
        } else {
            uint256 weight_diff = old_vefxs_balance.sub(new_vefxs_balance);
            totalVeFXSParticipating = totalVeFXSParticipating.sub(weight_diff);
        }

        if (account != address(0)) {
            // Calculate the earnings
            uint256 earned0 = earned(account);
            rewards0[account] = earned0;
            userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
        }
    }

    function checkpoint() external {
        _updateReward(msg.sender);
    }

    function getReward() external nonReentrant notRewardsCollectionPaused updateReward(msg.sender) {
        require(greylist[msg.sender] == false, "Address has been greylisted");

        uint256 reward0 = rewards0[msg.sender];
        if (reward0 > 0) {
            rewards0[msg.sender] = 0;
            rewardsToken0.transfer(msg.sender, reward0);
            emit RewardPaid(msg.sender, reward0, rewards_token_0_address);
        }
    }

    function renewIfApplicable() external {
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }

        // Update the total veFXS supply
        totalVeFXSSupplyStored = veFXS.totalSupply();
    }

    // If the period expired, renew it
    function retroCatchUp() internal {
        // Failsafe check
        require(block.timestamp > periodFinish, "Period has not expired yet!");

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed = uint256(block.timestamp.sub(periodFinish)) / rewardsDuration; // Floor division to the nearest period
        uint256 balance0 = rewardsToken0.balanceOf(address(this));
        require(rewardRate0.mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance0, "Not enough FXS available for rewards!");

        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        uint256 reward0 = rewardPerToken();
        rewardPerTokenStored0 = reward0;
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(rewards_token_0_address);
    }

    function sync() public {
        // Update the total veFXS supply
        totalVeFXSSupplyStored = veFXS.totalSupply();

        if (block.timestamp > periodFinish) {
            retroCatchUp();
        } else {
            uint256 reward0 = rewardPerToken();
            rewardPerTokenStored0 = reward0;
            lastUpdateTime = lastTimeRewardApplicable();
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Only the owner address can ever receive the recovery withdrawal
        ERC20(tokenAddress).transfer(owner_address, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyByOwnerOrGovernance {
        require(periodFinish == 0 || block.timestamp > periodFinish, "Previous rewards period must be complete before changing the duration for the new period");
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function initializeDefault() external onlyByOwnerOrGovernance {
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        totalVeFXSSupplyStored = veFXS.totalSupply();
        emit DefaultInitialization();
    }

    function greylistAddress(address _address) external onlyByOwnerOrGovernance {
        greylist[_address] = !(greylist[_address]);
    }

    function setPauses(bool _rewardsCollectionPaused) external onlyByOwnerOrGovernance {
        rewardsCollectionPaused = _rewardsCollectionPaused;
    }

    function setRewardRate(uint256 _new_rate0, bool sync_too) external onlyByOwnerOrGovernance {
        rewardRate0 = _new_rate0;

        if (sync_too) {
            sync();
        }
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setTimelock(address _new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = _new_timelock;
    }

    /* ========== EVENTS ========== */

    event RewardPaid(address indexed user, uint256 reward, address token_address);
    event RewardsDurationUpdated(uint256 newDuration);
    event RecoveredERC20(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
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
