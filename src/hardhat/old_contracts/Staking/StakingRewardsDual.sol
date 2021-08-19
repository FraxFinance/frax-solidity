// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================== StakingRewardsDual ========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Sam Sun: https://github.com/samczsun

// Modified originally from Synthetix.io
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";
import "../Frax/Frax.sol";
import "../Utils/ReentrancyGuard.sol";
import "../Utils/StringHelpers.sol";

// Inheritance
import "./IStakingRewardsDual.sol";
import "./Owned.sol";
import "./Pausable.sol";

contract StakingRewardsDual is IStakingRewardsDual, Owned, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    FRAXStablecoin private FRAX;
    ERC20 public rewardsToken0;
    ERC20 public rewardsToken1;
    ERC20 public stakingToken;
    uint256 public periodFinish;

    // Constant for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant MULTIPLIER_BASE = 1e6;

    // Max reward per second
    uint256 public rewardRate0;
    uint256 public rewardRate1;

    // uint256 public rewardsDuration = 86400 hours;
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    uint256 public lastUpdateTime;
    uint256 private rewardPerTokenStored0;
    uint256 public rewardPerTokenStored1 = 0;
    uint256 public pool_weight0; // This staking pool's percentage of the total FXS being distributed by all pools, 6 decimals of precision
    uint256 public pool_weight1; // This staking pool's percentage of the total TOKEN 2 being distributed by all pools, 6 decimals of precision

    address public owner_address;
    address public timelock_address; // Governance timelock address

    uint256 public locked_stake_max_multiplier = 3000000; // 6 decimals of precision. 1x = 1000000
    uint256 public locked_stake_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public locked_stake_min_time = 604800; // 7 * 86400  (7 days)
    string private locked_stake_min_time_str = "604800"; // 7 days on genesis

    uint256 public cr_boost_max_multiplier = 1000000; // 6 decimals of precision. 1x = 1000000

    mapping(address => uint256) public userRewardPerTokenPaid0;
    mapping(address => uint256) public userRewardPerTokenPaid1;
    mapping(address => uint256) private rewards0;
    mapping(address => uint256) public rewards1;

    uint256 private _staking_token_supply = 0;
    uint256 private _staking_token_boosted_supply = 0;
    mapping(address => uint256) private _unlocked_balances;
    mapping(address => uint256) private _locked_balances;
    mapping(address => uint256) private _boosted_balances;

    mapping(address => LockedStake[]) private lockedStakes;

    mapping(address => bool) public greylist;

    bool public token1_rewards_on = false;

    bool public unlockedStakes; // Release lock stakes in case of system migration

    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 amount;
        uint256 ending_timestamp;
        uint256 multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _frax_address,
        address _timelock_address,
        uint256 _pool_weight0,
        uint256 _pool_weight1
    ) public Owned(_owner){
        owner_address = _owner;
        rewardsToken0 = ERC20(_rewardsToken0);
        rewardsToken1 = ERC20(_rewardsToken1);
        stakingToken = ERC20(_stakingToken);
        FRAX = FRAXStablecoin(_frax_address);
        lastUpdateTime = block.timestamp;
        timelock_address = _timelock_address;
        pool_weight0 = _pool_weight0;
        pool_weight1 = _pool_weight1;

        // 1000 FXS a day
        rewardRate0 = (uint256(365000e18)).div(365 * 86400); 
        rewardRate0 = rewardRate0.mul(pool_weight0).div(1e6);

        // ??? CRVDAO a day eventually
        rewardRate1 = 0; 
        rewardRate1 = rewardRate1.mul(pool_weight1).div(1e6);
        unlockedStakes = false;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external override view returns (uint256) {
        return _staking_token_supply;
    }

    function totalBoostedSupply() external view returns (uint256) {
        return _staking_token_boosted_supply;
    }

    function stakingMultiplier(uint256 secs) public view returns (uint256) {
        uint256 multiplier = uint(MULTIPLIER_BASE).add(secs.mul(locked_stake_max_multiplier.sub(MULTIPLIER_BASE)).div(locked_stake_time_for_max_multiplier));
        if (multiplier > locked_stake_max_multiplier) multiplier = locked_stake_max_multiplier;
        return multiplier;
    }

    function crBoostMultiplier() public view returns (uint256) {
        uint256 multiplier = uint(MULTIPLIER_BASE).add((uint(MULTIPLIER_BASE).sub(FRAX.global_collateral_ratio())).mul(cr_boost_max_multiplier.sub(MULTIPLIER_BASE)).div(MULTIPLIER_BASE) );
        return multiplier;
    }

    // Total unlocked and locked liquidity tokens
    function balanceOf(address account) external override view returns (uint256) {
        return (_unlocked_balances[account]).add(_locked_balances[account]);
    }

    // Total unlocked liquidity tokens
    function unlockedBalanceOf(address account) external view returns (uint256) {
        return _unlocked_balances[account];
    }

    // Total locked liquidity tokens
    function lockedBalanceOf(address account) public view returns (uint256) {
        return _locked_balances[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier
    function boostedBalanceOf(address account) external view returns (uint256) {
        return _boosted_balances[account];
    }

    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    function stakingDecimals() external view returns (uint256) {
        return stakingToken.decimals();
    }

    function rewardsFor(address account) external view returns (uint256, uint256) {
        // You may have use earned() instead, because of the order in which the contract executes 
        return (rewards0[account], rewards1[account]);
    }

    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() internal view returns (uint256, uint256) {
        if (_staking_token_supply == 0) {
            return (rewardPerTokenStored0, rewardPerTokenStored1);
        }
        else {
            return (
                // Boosted emission
                rewardPerTokenStored0.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate0).mul(crBoostMultiplier()).mul(1e18).div(PRICE_PRECISION).div(_staking_token_boosted_supply)
                ),
                // Flat emission
                // Locked stakes will still get more weight with token1 rewards, but the CR boost will be canceled out for everyone
                rewardPerTokenStored1.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate1).mul(1e18).div(_staking_token_boosted_supply)
                )
            );
        }
    }

    function earned(address account) public override view returns (uint256, uint256) {
        (uint256 reward0, uint256 reward1) = rewardPerToken();
        return (
            _boosted_balances[account].mul(reward0.sub(userRewardPerTokenPaid0[account])).div(1e18).add(rewards0[account]),
            _boosted_balances[account].mul(reward1.sub(userRewardPerTokenPaid1[account])).div(1e18).add(rewards1[account])
        );
    }

    function getRewardForDuration() external override view returns (uint256, uint256) {
        return (
            rewardRate0.mul(rewardsDuration).mul(crBoostMultiplier()).div(PRICE_PRECISION),
            rewardRate1.mul(rewardsDuration)
        );
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount) external override nonReentrant notPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(greylist[msg.sender] == false, "address has been greylisted");

        // Pull the tokens from the staker
        TransferHelper.safeTransferFrom(address(stakingToken), msg.sender, address(this), amount);

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.add(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.add(amount);

        // Staking token balance and boosted balance
        _unlocked_balances[msg.sender] = _unlocked_balances[msg.sender].add(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].add(amount);

        emit Staked(msg.sender, amount);
    }

    function stakeLocked(uint256 amount, uint256 secs) external nonReentrant notPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(secs > 0, "Cannot wait for a negative number");
        require(greylist[msg.sender] == false, "address has been greylisted");
        require(secs >= locked_stake_min_time, StringHelpers.strConcat("Minimum stake time not met (", locked_stake_min_time_str, ")") );
        require(secs <= locked_stake_time_for_max_multiplier, "You are trying to stake for too long");

        uint256 multiplier = stakingMultiplier(secs);
        uint256 boostedAmount = amount.mul(multiplier).div(PRICE_PRECISION);
        lockedStakes[msg.sender].push(LockedStake(
            keccak256(abi.encodePacked(msg.sender, block.timestamp, amount)),
            block.timestamp,
            amount,
            block.timestamp.add(secs),
            multiplier
        ));

        // Pull the tokens from the staker
        TransferHelper.safeTransferFrom(address(stakingToken), msg.sender, address(this), amount);

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.add(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.add(boostedAmount);

        // Staking token balance and boosted balance
        _locked_balances[msg.sender] = _locked_balances[msg.sender].add(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].add(boostedAmount);

        emit StakeLocked(msg.sender, amount, secs);
    }

    function withdraw(uint256 amount) public override nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");

        // Staking token balance and boosted balance
        _unlocked_balances[msg.sender] = _unlocked_balances[msg.sender].sub(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].sub(amount);

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.sub(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.sub(amount);

        // Give the tokens to the withdrawer
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function withdrawLocked(bytes32 kek_id) public nonReentrant updateReward(msg.sender) {
        LockedStake memory thisStake;
        thisStake.amount = 0;
        uint theIndex;
        for (uint i = 0; i < lockedStakes[msg.sender].length; i++){ 
            if (kek_id == lockedStakes[msg.sender][i].kek_id){
                thisStake = lockedStakes[msg.sender][i];
                theIndex = i;
                break;
            }
        }
        require(thisStake.kek_id == kek_id, "Stake not found");
        require(block.timestamp >= thisStake.ending_timestamp || unlockedStakes == true, "Stake is still locked!");

        uint256 theAmount = thisStake.amount;
        uint256 boostedAmount = theAmount.mul(thisStake.multiplier).div(PRICE_PRECISION);
        if (theAmount > 0){
            // Staking token balance and boosted balance
            _locked_balances[msg.sender] = _locked_balances[msg.sender].sub(theAmount);
            _boosted_balances[msg.sender] = _boosted_balances[msg.sender].sub(boostedAmount);

            // Staking token supply and boosted supply
            _staking_token_supply = _staking_token_supply.sub(theAmount);
            _staking_token_boosted_supply = _staking_token_boosted_supply.sub(boostedAmount);

            // Remove the stake from the array
            delete lockedStakes[msg.sender][theIndex];

            // Give the tokens to the withdrawer
            stakingToken.safeTransfer(msg.sender, theAmount);

            emit WithdrawnLocked(msg.sender, theAmount, kek_id);
        }

    }

    function getReward() public override nonReentrant updateReward(msg.sender) {
        uint256 reward0 = rewards0[msg.sender];
        uint256 reward1 = rewards1[msg.sender];
        if (reward0 > 0) {
            rewards0[msg.sender] = 0;
            rewardsToken0.transfer(msg.sender, reward0);
            emit RewardPaid(msg.sender, reward0, address(rewardsToken0));
        }
        if (reward1 > 0) {
            rewards1[msg.sender] = 0;
            rewardsToken1.transfer(msg.sender, reward1);
            emit RewardPaid(msg.sender, reward1, address(rewardsToken1));
        }
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
        uint balance0 = rewardsToken0.balanceOf(address(this));
        uint balance1 = rewardsToken1.balanceOf(address(this));
        require(rewardRate0.mul(rewardsDuration).mul(crBoostMultiplier()).mul(num_periods_elapsed + 1).div(PRICE_PRECISION) <= balance0, "Not enough FXS available");
        
        
        if (token1_rewards_on){
            require(rewardRate1.mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance1, "Not enough token1 available for rewards!");
        }
        
        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        (uint256 reward0, uint256 reward1) = rewardPerToken();
        rewardPerTokenStored0 = reward0;
        rewardPerTokenStored1 = reward1;
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingToken));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Admin cannot withdraw the staking token from the contract
        require(tokenAddress != address(stakingToken));
        ERC20(tokenAddress).transfer(owner_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyByOwnGov {
        require(
            periodFinish == 0 || block.timestamp > periodFinish,
            "Reward period incomplete"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function setMultipliers(uint256 _locked_stake_max_multiplier, uint256 _cr_boost_max_multiplier) external onlyByOwnGov {
        require(_locked_stake_max_multiplier >= 1, "Multiplier must be greater than or equal to 1");
        require(_cr_boost_max_multiplier >= 1, "Max CR Boost must be greater than or equal to 1");

        locked_stake_max_multiplier = _locked_stake_max_multiplier;
        cr_boost_max_multiplier = _cr_boost_max_multiplier;
        
        emit MaxCRBoostMultiplier(cr_boost_max_multiplier);
        emit LockedStakeMaxMultiplierUpdated(locked_stake_max_multiplier);
    }

    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _locked_stake_time_for_max_multiplier, uint256 _locked_stake_min_time) external onlyByOwnGov {
        require(_locked_stake_time_for_max_multiplier >= 1, "Mul max time must be >= 1");
        require(_locked_stake_min_time >= 1, "Mul min time must be >= 1");
        
        locked_stake_time_for_max_multiplier = _locked_stake_time_for_max_multiplier;

        locked_stake_min_time = _locked_stake_min_time;
        locked_stake_min_time_str = StringHelpers.uint2str(_locked_stake_min_time);

        emit LockedStakeTimeForMaxMultiplier(locked_stake_time_for_max_multiplier);
        emit LockedStakeMinTime(_locked_stake_min_time);
    }

    function initializeDefault() external onlyByOwnGov {
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit DefaultInitialization();
    }

    function greylistAddress(address _address) external onlyByOwnGov {
        greylist[_address] = !(greylist[_address]);
    }

    function unlockStakes() external onlyByOwnGov {
        unlockedStakes = !unlockedStakes;
    }

    function setRewardRates(uint256 _new_rate0, uint256 _new_rate1) external onlyByOwnGov {
        rewardRate0 = _new_rate0;
        rewardRate1 = _new_rate1;
    }

    function toggleToken1Rewards() external onlyByOwnGov {
        token1_rewards_on = !token1_rewards_on;
    }

    function setOwnerAndTimelock(address _new_owner, address _new_timelock) external onlyByOwnGov {
        owner_address = _new_owner;
        timelock_address = _new_timelock;
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
        else {
            (uint256 reward0, uint256 reward1) = rewardPerToken();
            rewardPerTokenStored0 = reward0;
            rewardPerTokenStored1 = reward1;
            lastUpdateTime = lastTimeRewardApplicable();
        }
        if (account != address(0)) {
            (uint256 earned0, uint256 earned1) = earned(account);
            rewards0[account] = earned0;
            rewards1[account] = earned1;
            userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
            userRewardPerTokenPaid1[account] = rewardPerTokenStored1;
        }
        _;
    }

    modifier onlyByOwnGov() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs);
    event Withdrawn(address indexed user, uint256 amount);
    event WithdrawnLocked(address indexed user, uint256 amount, bytes32 kek_id);
    event RewardPaid(address indexed user, uint256 reward, address token_address);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event DefaultInitialization();
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
    event LockedStakeMinTime(uint256 secs);
    event MaxCRBoostMultiplier(uint256 multiplier);
}
