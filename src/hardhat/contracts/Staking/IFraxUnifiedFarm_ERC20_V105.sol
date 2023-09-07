// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IFraxUnifiedFarm_ERC20_V105 {
struct LockedStake {
    uint256 start_timestamp;
    uint256 liquidity;
    uint256 ending_timestamp;
    uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
}
  
  function acceptOwnership (  ) external;
  function calcCurCombinedWeight ( address account ) external view returns ( uint256 old_combined_weight, uint256 new_vefxs_multiplier, uint256 new_combined_weight );
  function calcCurrLockMultiplier ( address account, uint256 stake_idx ) external view returns ( uint256 midpoint_lock_multiplier );
  function changeTokenManager ( address reward_token_address, address new_manager_address ) external;
  function combinedWeightOf ( address account ) external view returns ( uint256 );
  function curvePool (  ) external view returns ( address );
  function curveToken (  ) external view returns ( address );
  function earned ( address account ) external view returns ( uint256[] memory new_earned );
  function fraxPerLPStored (  ) external view returns ( uint256 );
  function fraxPerLPToken (  ) external view returns ( uint256 );
  function getAllRewardTokens (  ) external view returns ( address[] memory  );
  function getLatestETHPriceE8 (  ) external view returns ( int256 );
  function getProxyFor ( address addr ) external view returns ( address );
  function getReward ( address destination_address ) external returns ( uint256[] memory  );
  function getReward2 ( address destination_address, bool claim_extra_too ) external returns ( uint256[] memory  );
  function getRewardExtraLogic ( address destination_address ) external;
  function getRewardForDuration (  ) external view returns ( uint256[] memory  rewards_per_duration_arr );
  function isTokenManagerFor ( address caller_addr, address reward_token_addr ) external view returns ( bool );
  function lastRewardClaimTime ( address ) external view returns ( uint256 );
  function lastUpdateTime (  ) external view returns ( uint256 );
  function lockAdditional ( bytes32 kek_id, uint256 addl_liq ) external;
  function lockLonger ( bytes32 kek_id, uint256 new_ending_ts ) external;
  function lockMultiplier ( uint256 secs ) external view returns ( uint256 );
  function lock_max_multiplier (  ) external view returns ( uint256 );
  function lock_time_for_max_multiplier (  ) external view returns ( uint256 );
  function lock_time_min (  ) external view returns ( uint256 );
  function lockedLiquidityOf ( address account ) external view returns ( uint256 );
  function lockedStakes ( address, uint256 ) external view returns ( bytes32 kek_id, uint256 start_timestamp, uint256 liquidity, uint256 ending_timestamp, uint256 lock_multiplier );
  function lockedStakesOf ( address account ) external view returns ( LockedStake[] memory );
  function lockedStakesOfLength ( address account ) external view returns ( uint256 );
  function maxLPForMaxBoost ( address account ) external view returns ( uint256 );
  function minVeFXSForMaxBoost ( address account ) external view returns ( uint256 );
  function minVeFXSForMaxBoostProxy ( address proxy_address ) external view returns ( uint256 );
  function nominateNewOwner ( address _owner ) external;
  function nominatedOwner (  ) external view returns ( address );
  function owner (  ) external view returns ( address );
  function periodFinish (  ) external view returns ( uint256 );
  function proxyStakedFrax ( address proxy_address ) external view returns ( uint256 );
  function proxyToggleStaker ( address staker_address ) external;
  function proxy_lp_balances ( address ) external view returns ( uint256 );
  function recoverERC20 ( address tokenAddress, uint256 tokenAmount ) external;
  function rewardManagers ( address ) external view returns ( address );
  function rewardRates ( uint256 token_idx ) external view returns ( uint256 rwd_rate );
  function rewardTokenAddrToIdx ( address ) external view returns ( uint256 );
  function rewardsDuration (  ) external view returns ( uint256 );
  function rewardsPerToken (  ) external view returns ( uint256[] memory  newRewardsPerTokenStored );
  function setETHUSDOracle ( address _eth_usd_oracle_address ) external;
  function setMiscVariables ( uint256[6] memory  _misc_vars ) external;
  function setPauses ( bool _stakingPaused, bool _withdrawalsPaused, bool _rewardsCollectionPaused, bool _collectRewardsOnWithdrawalPaused ) external;
  function setRewardVars ( address reward_token_address, uint256 _new_rate, address _gauge_controller_address, address _rewards_distributor_address ) external;
  function stakeLocked ( uint256 liquidity, uint256 secs ) external returns ( bytes32 );
  function stakerSetVeFXSProxy ( address proxy_address ) external;
  function staker_designated_proxies ( address ) external view returns ( address );
  function stakesUnlocked (  ) external view returns ( bool );
  function stakingToken (  ) external view returns ( address );
  function sync (  ) external;
  function sync_gauge_weights ( bool force_update ) external;
  function toggleValidVeFXSProxy ( address _proxy_addr ) external;
  function totalCombinedWeight (  ) external view returns ( uint256 );
  function totalLiquidityLocked (  ) external view returns ( uint256 );
  function unlockStakes (  ) external;
  function userStakedFrax ( address account ) external view returns ( uint256 );
  function veFXSMultiplier ( address account ) external view returns ( uint256 vefxs_multiplier );
  function vefxs_boost_scale_factor (  ) external view returns ( uint256 );
  function vefxs_max_multiplier (  ) external view returns ( uint256 );
  function vefxs_per_frax_for_max_boost (  ) external view returns ( uint256 );
  function withdrawLocked ( bytes32 kek_id, address destination_address, bool claim_rewards ) external returns ( uint256 );
}
