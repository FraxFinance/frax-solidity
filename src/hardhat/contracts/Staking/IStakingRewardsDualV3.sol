// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

interface IStakingRewardsDualV3 {
    struct ILockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    function acceptOwnership() external;
    function addMigrator(address migrator_address) external;
    function calcCurCombinedWeight(address account) external view returns (uint256 old_combined_weight, uint256 new_vefxs_multiplier, uint256 new_combined_weight);
    function combinedWeightOf(address account) external view returns (uint256);
    function earned(address account) external view returns (uint256, uint256);
    function fraxPerLPToken() external view returns (uint256);
    function getReward() external returns (uint256, uint256);
    function getRewardForDuration() external view returns (uint256, uint256);
    function greylist(address) external view returns (bool);
    function greylistAddress(address _address) external;
    function initializeDefault() external;
    function lastTimeRewardApplicable() external view returns (uint256);
    function lastUpdateTime() external view returns (uint256);
    function lockMultiplier(uint256 secs) external view returns (uint256);
    function lock_max_multiplier() external view returns (uint256);
    function lock_time_for_max_multiplier() external view returns (uint256);
    function lock_time_min() external view returns (uint256);
    function lockedLiquidityOf(address account) external view returns (uint256);
    function lockedStakesOf(address account) external view returns (ILockedStake[] memory);
    function migrationsOn() external view returns (bool);
    function migratorApprovedForStaker(address staker_address, address migrator_address) external view returns (bool);
    function migrator_stakeLocked_for(address staker_address, uint256 amount, uint256 secs) external;
    function migrator_withdraw_locked(address staker_address, bytes32 kek_id) external;
    function minVeFXSForMaxBoost(address account) external view returns (uint256);
    function nominateNewOwner(address _owner) external;
    function nominatedOwner() external view returns (address);
    function owner() external view returns (address);
    function periodFinish() external view returns (uint256);
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external;
    function removeMigrator(address migrator_address) external;
    function renewIfApplicable() external;
    function rewardPerToken() external view returns (uint256, uint256);
    function rewardPerTokenStored0() external view returns (uint256);
    function rewardPerTokenStored1() external view returns (uint256);
    function rewardRate0() external view returns (uint256);
    function rewardRate1() external view returns (uint256);
    function rewards0(address) external view returns (uint256);
    function rewards1(address) external view returns (uint256);
    function rewardsCollectionPaused() external view returns (bool);
    function rewardsDuration() external view returns (uint256);
    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min) external;
    function setMultipliers(uint256 _lock_max_multiplier, uint256 _vefxs_max_multiplier, uint256 _vefxs_per_frax_for_max_boost) external;
    function setRewardRates(uint256 _new_rate0, uint256 _new_rate1, bool sync_too) external;
    function setRewardsDuration(uint256 _rewardsDuration) external;
    function setTimelock(address _new_timelock) external;
    function stakeLocked(uint256 liquidity, uint256 secs) external;
    function stakerAllowMigrator(address migrator_address) external;
    function stakerDisallowMigrator(address migrator_address) external;
    function staker_allowed_migrators(address, address) external view returns (bool);
    function stakesUnlocked() external view returns (bool);
    function stakingPaused() external view returns (bool);
    function sync() external;
    function timelock_address() external view returns (address);
    function toggleMigrations() external;
    function toggleRewardsCollection() external;
    function toggleStaking() external;
    function toggleToken1Rewards() external;
    function toggleWithdrawals() external;
    function token1_rewards_on() external view returns (bool);
    function totalCombinedWeight() external view returns (uint256);
    function totalLiquidityLocked() external view returns (uint256);
    function unlockStakes() external;
    function userRewardPerTokenPaid0(address) external view returns (uint256);
    function userRewardPerTokenPaid1(address) external view returns (uint256);
    function userStakedFrax(address account) external view returns (uint256);
    function valid_migrators(address) external view returns (bool);
    function valid_migrators_array(uint256) external view returns (address);
    function veFXSMultiplier(address account) external view returns (uint256);
    function vefxs_max_multiplier() external view returns (uint256);
    function vefxs_per_frax_for_max_boost() external view returns (uint256);
    function withdrawLocked(bytes32 kek_id) external;
    function withdrawalsPaused() external view returns (bool);
}
