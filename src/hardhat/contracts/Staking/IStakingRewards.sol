// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

interface IStakingRewards {
    struct ILockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 amount;
        uint256 ending_timestamp;
        uint256 multiplier; // 6 decimals of precision. 1x = 1000000
    }
    function acceptOwnership() external;
    function balanceOf(address account) external view returns (uint256);
    function boostedBalanceOf(address account) external view returns (uint256);
    function crBoostMultiplier() external view returns (uint256);
    function cr_boost_max_multiplier() external view returns (uint256);
    function earned(address account) external view returns (uint256);
    function getReward() external;
    function getRewardForDuration() external view returns (uint256);
    function greylist(address) external view returns (bool);
    function greylistAddress(address _address) external;
    function initializeDefault() external;
    function lastPauseTime() external view returns (uint256);
    function lastTimeRewardApplicable() external view returns (uint256);
    function lastUpdateTime() external view returns (uint256);
    function lockedBalanceOf(address account) external view returns (uint256);
    function lockedStakesOf(address account) external view returns (ILockedStake[] memory);
    function locked_stake_max_multiplier() external view returns (uint256);
    function locked_stake_min_time() external view returns (uint256);
    function locked_stake_time_for_max_multiplier() external view returns (uint256);
    function nominateNewOwner(address _owner) external;
    function nominatedOwner() external view returns (address);
    function owner() external view returns (address);
    function owner_address() external view returns (address);
    function paused() external view returns (bool);
    function periodFinish() external view returns (uint256);
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external;
    function renewIfApplicable() external;
    function rewardPerToken() external view returns (uint256);
    function rewardPerTokenStored() external view returns (uint256);
    function rewardRate() external view returns (uint256);
    function rewards(address) external view returns (uint256);
    function rewardsDistribution() external view returns (address);
    function rewardsDuration() external view returns (uint256);
    function rewardsFor(address account) external view returns (uint256);
    function rewardsToken() external view returns (address);
    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _locked_stake_time_for_max_multiplier, uint256 _locked_stake_min_time) external;
    function setMultipliers(uint256 _locked_stake_max_multiplier, uint256 _cr_boost_max_multiplier) external;
    function setOwnerAndTimelock(address _new_owner, address _new_timelock) external;
    function setPaused(bool _paused) external;
    function setRewardRate(uint256 _new_rate) external;
    function setRewardsDistribution(address _rewardsDistribution) external;
    function setRewardsDuration(uint256 _rewardsDuration) external;
    function stake(uint256 amount) external;
    function stakeLocked(uint256 amount, uint256 secs) external;
    function stakingDecimals() external view returns (uint256);
    function stakingMultiplier(uint256 secs) external view returns (uint256);
    function stakingToken() external view returns (address);
    function timelock_address() external view returns (address);
    function totalBoostedSupply() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function unlockStakes() external;
    function unlockedBalanceOf(address account) external view returns (uint256);
    function unlockedStakes() external view returns (bool);
    function userRewardPerTokenPaid(address) external view returns (uint256);
    function withdraw(uint256 amount) external;
    function withdrawLocked(bytes32 kek_id) external;
}
