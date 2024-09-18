// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IFraxswap {
    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );

    function token0() external view returns (address);

    function token1() external view returns (address);
}

/// @notice Minimalistic IFraxFarmUniV3
interface IFraxFarmUniV3TokenPositions {
    function uni_token0() external view returns (address);

    function uni_token1() external view returns (address);
}

interface IFraxswapERC20 {
    function decimals() external view returns (uint8);
}

interface IFraxFarm {
    function owner() external view returns (address);

    function stakingToken() external view returns (address);

    function fraxPerLPToken() external view returns (uint256);

    function calcCurCombinedWeight(address account)
        external
        view
        returns (
            uint256 old_combined_weight,
            uint256 new_vefxs_multiplier,
            uint256 new_combined_weight
        );

    function periodFinish() external view returns (uint256);

    function getAllRewardTokens() external view returns (address[] memory);

    function earned(address account) external view returns (uint256[] memory new_earned);

    function totalLiquidityLocked() external view returns (uint256);

    function lockedLiquidityOf(address account) external view returns (uint256);

    function totalCombinedWeight() external view returns (uint256);

    function combinedWeightOf(address account) external view returns (uint256);

    function lockMultiplier(uint256 secs) external view returns (uint256);

    function rewardRates(uint256 token_idx) external view returns (uint256 rwd_rate);

    function userStakedFrax(address account) external view returns (uint256);

    function proxyStakedFrax(address proxy_address) external view returns (uint256);

    function maxLPForMaxBoost(address account) external view returns (uint256);

    function minVeFXSForMaxBoost(address account) external view returns (uint256);

    function minVeFXSForMaxBoostProxy(address proxy_address) external view returns (uint256);

    function veFXSMultiplier(address account) external view returns (uint256 vefxs_multiplier);

    function toggleValidVeFXSProxy(address proxy_address) external;

    function proxyToggleStaker(address staker_address) external;

    function stakerSetVeFXSProxy(address proxy_address) external;

    function getReward(address destination_address) external returns (uint256[] memory);

    function getReward(address destination_address, bool also_claim_extra) external returns (uint256[] memory);

    function vefxs_max_multiplier() external view returns (uint256);

    function vefxs_boost_scale_factor() external view returns (uint256);

    function vefxs_per_frax_for_max_boost() external view returns (uint256);

    function getProxyFor(address addr) external view returns (address);

    function sync() external;

    function nominateNewOwner(address _owner) external;

    function acceptOwnership() external;

    function updateRewardAndBalance(address acct, bool sync) external;

    function setRewardVars(
        address reward_token_address,
        uint256 _new_rate,
        address _gauge_controller_address,
        address _rewards_distributor_address
    ) external;

    function calcCurrLockMultiplier(address account, uint256 stake_idx)
        external
        view
        returns (uint256 midpoint_lock_multiplier);

    function staker_designated_proxies(address staker_address) external view returns (address);

    function sync_gauge_weights(bool andForce) external;
}

interface IFraxFarmTransfers {
    function setAllowance(address spender, uint256 lockId, uint256 amount) external;
    function removeAllowance(address spender, uint256 lockId) external;
    function setApprovalForAll(address spender, bool approved) external;
    function isApproved(address staker, uint256 lockId, uint256 amount) external view returns (bool);
    function transferLockedFrom(
        address sender_address,
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) external returns (uint256);

    function transferLocked(
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) external returns (uint256);

    function beforeLockTransfer(address operator, address from, uint256 lockId, bytes calldata data) external returns (bytes4);
    function onLockReceived(address operator, address from, uint256 lockId, bytes memory data) external returns (bytes4);

}

interface IFraxFarmERC20 is IFraxFarm, IFraxFarmTransfers {
    struct LockedStake {
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /// TODO this references the public getter for `lockedStakes` in the contract
    function lockedStakes(address account, uint256 stake_idx) external view returns (LockedStake memory);

    function lockedStakesOf(address account) external view returns (LockedStake[] memory);

    function lockedStakesOfLength(address account) external view returns (uint256);

    function lockAdditional(uint256 lockId, uint256 addl_liq) external;

    function lockLonger(uint256 lockId, uint256 _newUnlockTimestamp) external;

    function stakeLocked(uint256 liquidity, uint256 secs) external returns (uint256);

    function withdrawLocked(uint256 lockId, address destination_address) external returns (uint256);
}

interface IFraxFarmUniV3 is IFraxFarm, IFraxFarmUniV3TokenPositions {
    struct LockedNFT {
        uint256 token_id; // for Uniswap V3 LPs
        uint256 liquidity;
        uint256 start_timestamp;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
        int24 tick_lower;
        int24 tick_upper;
    }
    function acceptOwnership (  ) external;
    function addMigrator ( address migrator_address ) external;
    function bypassEmissionFactor (  ) external view returns ( bool );
    function calcCurCombinedWeight ( address account ) external view returns ( uint256 old_combined_weight, uint256 new_vefxs_multiplier, uint256 new_combined_weight );
    function combinedWeightOf ( address account ) external view returns ( uint256 );
    function emissionFactor (  ) external view returns ( uint256 emission_factor );
    function getReward (  ) external returns ( uint256 );
    function getRewardForDuration (  ) external view returns ( uint256 );
    function greylistAddress ( address _address ) external;
    function ideal_tick (  ) external view returns ( int24 );
    function initializeDefault (  ) external;
    function lockMultiplier ( uint256 secs ) external view returns ( uint256 );
    function lock_max_multiplier (  ) external view returns ( uint256 );
    function lock_time_for_max_multiplier (  ) external view returns ( uint256 );
    function lock_time_min (  ) external view returns ( uint256 );
    function lockedLiquidityOf ( address account ) external view returns ( uint256 );
    function lockedNFTsOf ( address account ) external view returns ( LockedNFT[] memory );
    function migrationsOn (  ) external view returns ( bool );
    function migrator_stakeLocked_for ( address staker_address, uint256 token_id, uint256 secs, uint256 start_timestamp ) external;
    function migrator_withdraw_locked ( address staker_address, uint256 token_id ) external;
    function minVeFXSForMaxBoost ( address account ) external view returns ( uint256 );
    function nominateNewOwner ( address _owner ) external;
    function nominatedOwner (  ) external view returns ( address );
    function onERC721Received ( address, address, uint256, bytes memory ) external pure returns ( bytes4 );
    function owner (  ) external view returns ( address );
    function recoverERC20 ( address tokenAddress, uint256 tokenAmount ) external;
    function recoverERC721 ( address tokenAddress, uint256 token_id ) external;
    function removeMigrator ( address migrator_address ) external;
    function rewardRate0 (  ) external view returns ( uint256 rwd_rate );
    function reward_rate_manual (  ) external view returns ( uint256 );
    function rewardsCollectionPaused (  ) external view returns ( bool );
    function rewardsDuration (  ) external view returns ( uint256 );
    function setGaugeController ( address _gauge_controller_address ) external;
    function setLockedNFTTimeForMinAndMaxMultiplier ( uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min ) external;
    function setManualRewardRate ( uint256 _reward_rate_manual, bool sync_too ) external;
    function setMultipliers ( uint256 _lock_max_multiplier, uint256 _vefxs_max_multiplier, uint256 _vefxs_per_frax_for_max_boost ) external;
    function setPauses ( bool _stakingPaused, bool _withdrawalsPaused, bool _rewardsCollectionPaused ) external;
    function setTWAP ( uint32 _new_twap_duration ) external;
    function setTimelock ( address _new_timelock ) external;
    function stakeLocked ( uint256 token_id, uint256 secs ) external;
    function stakerAllowMigrator ( address migrator_address ) external;
    function stakerDisallowMigrator ( address migrator_address ) external;
    function stakesUnlocked (  ) external view returns ( bool );
    function stakingPaused (  ) external view returns ( bool );
    function sync (  ) external;
    function sync_gauge_weight ( bool force_update ) external;
    function timelock_address (  ) external view returns ( address );
    function toggleEmissionFactorBypass (  ) external;
    function toggleMigrations (  ) external;
    function totalCombinedWeight (  ) external view returns ( uint256 );
    function totalLiquidityLocked (  ) external view returns ( uint256 );
    function twap_duration (  ) external view returns ( uint32 );
    function uni_required_fee (  ) external view returns ( uint24 );
    function uni_tick_lower (  ) external view returns ( int24 );
    function uni_tick_upper (  ) external view returns ( int24 );
    function uni_token0 (  ) external view returns ( address );
    function uni_token1 (  ) external view returns ( address );
    function unlockStakes (  ) external;
    function userStakedFrax ( address account ) external view returns ( uint256 );
    function veFXSMultiplier ( address account ) external view returns ( uint256 );
    function vefxs_max_multiplier (  ) external view returns ( uint256 );
    function vefxs_per_frax_for_max_boost (  ) external view returns ( uint256 );
    function withdrawLocked ( uint256 token_id ) external;
    function withdrawalsPaused (  ) external view returns ( bool );
}