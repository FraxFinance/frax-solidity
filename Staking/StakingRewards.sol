// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

// Stolen with love from Synthetixio
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import "../Utils/ReentrancyGuard.sol";

// Inheritance
import "./IStakingRewards.sol";
import "./RewardsDistributionRecipient.sol";
import "./Pausable.sol";

contract StakingRewards is IStakingRewards, RewardsDistributionRecipient, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    ERC20 public rewardsToken;
    ERC20 public stakingToken;
    uint256 public periodFinish;

    uint256 public rewardRate = 0; // 18 decimals of precision. Reward amount per second

    // uint256 public rewardsDuration = 8 hours;
    uint256 public rewardsDuration = 3 seconds;

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored = 0;

    uint256 public locked_stake_max_multiplier = 3000000; // 6 decimals of precision. 1x = 1000000
    uint256 public locked_stake_time_for_max_multiplier = 365 * 86400; // 1 year

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _staking_token_supply = 0;
    uint256 private _staking_token_boosted_supply = 0;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _boosted_balances;

    mapping(address => LockedStake[]) private lockedStakes;

    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 amount;
        uint256 ending_timestamp;
        uint256 multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    ) public Owned(_owner) {
        rewardsToken = ERC20(_rewardsToken);
        stakingToken = ERC20(_stakingToken);
        rewardsDistribution = _rewardsDistribution;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external override view returns (uint256) {
        return _staking_token_supply;
    }

    function stakingMultiplier(uint256 secs) public view returns (uint256) {
        uint256 multiplier = 1000000 + secs.mul(locked_stake_max_multiplier.sub(1)).div(locked_stake_time_for_max_multiplier);
        if (multiplier > locked_stake_max_multiplier) multiplier = locked_stake_max_multiplier;
        return multiplier;
    }

    function fraxSupply() external view returns (uint256) {
        return _staking_token_supply;
    }

    function balanceOf(address account) external override view returns (uint256) {
        return _balances[account];
    }

    function boostedBalanceOf(address account) external view returns (uint256) {
        return _boosted_balances[account];
    }


    function lockedBalanceOf(address account) public view returns (uint256) {
        uint256 total_locked_balance = 0;
        for (uint i = 0; i < lockedStakes[account].length; i++){ 
            if ( block.timestamp < lockedStakes[account][i].ending_timestamp ){
                total_locked_balance += lockedStakes[account][i].amount;
            }
        }
        return total_locked_balance;
    }

    function unlockedBalanceOf(address account) external view returns (uint256) {
        return (_balances[account]).sub(lockedBalanceOf(account));
    }


    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    function stakingDecimals() external view returns (uint256) {
        return stakingToken.decimals();
    }

    function rewardsFor(address account) external view returns (uint256) {
        // You may have use earned() instead, because of the order in which the contract executes 
        return rewards[account];
    }

    function lastTimeRewardApplicable() public override view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public override view returns (uint256) {
        if (_staking_token_supply == 0) {
            return rewardPerTokenStored;
        }
        else {
            // return lastTimeRewardApplicable().sub(lastUpdateTime);
            return rewardPerTokenStored.add(
                lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).mul(1e18).div(_staking_token_boosted_supply)
            );
            // rewardPerTokenStored.add(
            //     lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).div(_staking_token_supply)
            // );
        }
    }

    function earned(address account) public override view returns (uint256) {
        return _boosted_balances[account].mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).div(1e18).add(rewards[account]);
    }

    // function earned(address account) public override view returns (uint256) {
    //     return _balances[account].mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).add(rewards[account]);
    // }

    function getRewardForDuration() external override view returns (uint256) {
        return rewardRate.mul(rewardsDuration);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount) external override nonReentrant notPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.add(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.add(amount);

        // Staking token balance and boosted balance
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].add(amount);

        // Pull the tokens from the staker
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function stakeLocked(uint256 amount, uint256 secs) external nonReentrant notPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(secs > 0, "Cannot wait for a negative number");

        uint256 multiplier = stakingMultiplier(secs);
        uint256 boostedAmount = amount.mul(multiplier).div(1e6);
        lockedStakes[msg.sender].push(LockedStake(
            keccak256(abi.encodePacked(msg.sender, block.timestamp, amount)),
            block.timestamp,
            amount,
            block.timestamp.add(secs),
            multiplier
        ));

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.add(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.add(boostedAmount);

        // Staking token balance and boosted balance
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].add(boostedAmount);

        // Pull the tokens from the staker
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, amount);
        emit StakeLocked(msg.sender, amount, secs);
    }

    function withdraw(uint256 amount) public override nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");

        // Staking token supply and boosted supply
        _staking_token_supply = _staking_token_supply.sub(amount);
        _staking_token_boosted_supply = _staking_token_boosted_supply.sub(amount);

        // Staking token balance and boosted balance
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        _boosted_balances[msg.sender] = _boosted_balances[msg.sender].sub(amount);

        // Give the tokens to the withdrawer
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function withdrawLocked(bytes32 kek_id) public nonReentrant updateReward(msg.sender) {
        LockedStake memory thisStake;
        uint theIndex;
        for (uint i = 0; i < lockedStakes[msg.sender].length; i++){ 
            if (kek_id == lockedStakes[msg.sender][i].kek_id){
                thisStake = lockedStakes[msg.sender][i];
                theIndex = i;
                break;
            }
        }
        require(block.timestamp >= thisStake.ending_timestamp, "Stake is still locked!");

        uint256 theAmount = thisStake.amount;
        uint256 boostedAmount = theAmount.mul(thisStake.multiplier).div(1e6);
        if (theAmount > 0){
            // Staking token supply and boosted supply
            _staking_token_supply = _staking_token_supply.sub(theAmount);
            _staking_token_boosted_supply = _staking_token_boosted_supply.sub(boostedAmount);

            // Staking token balance and boosted balance
            _balances[msg.sender] = _balances[msg.sender].sub(theAmount);
            _boosted_balances[msg.sender] = _boosted_balances[msg.sender].sub(boostedAmount);

            // Give the tokens to the withdrawer
            stakingToken.safeTransfer(msg.sender, theAmount);

            // Remove the stake from the array
            delete lockedStakes[msg.sender][theIndex];

            emit Withdrawn(msg.sender, theAmount);
            emit WithdrawnLocked(msg.sender, theAmount, kek_id);
        }

    }

    function getReward() public override nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external override {
        withdraw(_balances[msg.sender]);

        // TODO: Add locked stakes too?

        getReward();
    }

    function renewIfApplicable() external {
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
    }

    // If the period expired, renew it
    function retroCatchUp() internal {
        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed = uint256(block.timestamp.sub(periodFinish)) / rewardsDuration; // Floor division to the nearest period
        uint balance = rewardsToken.balanceOf(address(this));
        require(rewardRate.mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance, "Not enough FXS available for rewards!");

        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add((num_periods_elapsed + 1).mul(rewardsDuration));

        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingToken));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // This notifies people that the reward is being changed
    function notifyRewardAmount(uint256 reward) external override onlyRewardsDistribution updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(rewardsDuration);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(rewardsDuration);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = rewardsToken.balanceOf(address(this));
        require(rewardRate <= balance.div(rewardsDuration), "Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit RewardAdded(reward);
    }

    // Added to support recovering LP Rewards from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        // If it's FRAX we have to query the token symbol to ensure its not a proxy or underlying
        bool isFRAX = (keccak256(bytes("FRAX")) == keccak256(bytes(ERC20(tokenAddress).symbol())));
        // Cannot recover the staking token or the rewards token
        require(
            tokenAddress != address(stakingToken) && tokenAddress != address(rewardsToken) && !isFRAX,
            "Cannot withdraw the staking or rewards tokens"
        );
        ERC20(tokenAddress).safeTransfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            periodFinish == 0 || block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration for the new period"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function setLockedStakeMaxMultiplierUpdated(uint256 _locked_stake_max_multiplier) external onlyOwner {
        require(_locked_stake_max_multiplier >= 1, "Multiplier must be greater than or equal to 1");
        locked_stake_max_multiplier = _locked_stake_max_multiplier;
        emit LockedStakeMaxMultiplierUpdated(locked_stake_max_multiplier);
    }

    function setLockedStakeTimeForMaxMultiplier(uint256 _locked_stake_time_for_max_multiplier) external onlyOwner {
        require(_locked_stake_time_for_max_multiplier >= 1, "Multiplier Max Time must be greater than or equal to 1");
        locked_stake_time_for_max_multiplier = _locked_stake_time_for_max_multiplier;
        emit LockedStakeTimeForMaxMultiplier(locked_stake_time_for_max_multiplier);
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
        else {
            rewardPerTokenStored = rewardPerToken();
            lastUpdateTime = lastTimeRewardApplicable();
        }
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs);
    event Withdrawn(address indexed user, uint256 amount);
    event WithdrawnLocked(address indexed user, uint256 amount, bytes32 kek_id);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
}