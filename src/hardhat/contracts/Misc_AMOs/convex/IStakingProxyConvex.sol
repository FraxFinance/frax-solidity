// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IStakingProxyConvex {
  function FEE_DENOMINATOR (  ) external view returns ( uint256 );
  function changeRewards ( address _rewardsAddress ) external;
  function checkpointRewards (  ) external;
  function convexCurveBooster (  ) external view returns ( address );
  function convexDepositToken (  ) external view returns ( address );
  function crv (  ) external view returns ( address );
  function curveLpToken (  ) external view returns ( address );
  function cvx (  ) external view returns ( address );
  function earned (  ) external view returns ( address[] memory token_addresses, uint256[] memory total_earned );
  function feeRegistry (  ) external view returns ( address );
  function fxs (  ) external view returns ( address );
  function getReward (  ) external;
  function getReward ( bool _claim, address[] memory _rewardTokenList ) external;
  function getReward ( bool _claim ) external;
  function initialize ( address _owner, address _stakingAddress, address _stakingToken, address _rewardsAddress ) external;
  function lockAdditional ( bytes32 _kek_id, uint256 _addl_liq ) external;
  function lockAdditionalConvexToken ( bytes32 _kek_id, uint256 _addl_liq ) external;
  function lockAdditionalCurveLp ( bytes32 _kek_id, uint256 _addl_liq ) external;
  function lockLonger ( bytes32 _kek_id, uint256 new_ending_ts ) external;
  function owner (  ) external view returns ( address );
  function poolRegistry (  ) external view returns ( address );
  function rewards (  ) external view returns ( address );
  function setVeFXSProxy ( address _proxy ) external;
  function stakeLocked ( uint256 _liquidity, uint256 _secs ) external returns ( bytes32 kek_id );
  function stakeLockedConvexToken ( uint256 _liquidity, uint256 _secs ) external returns ( bytes32 kek_id );
  function stakeLockedCurveLp ( uint256 _liquidity, uint256 _secs ) external returns ( bytes32 kek_id );
  function stakingAddress (  ) external view returns ( address );
  function stakingToken (  ) external view returns ( address );
  function usingProxy (  ) external view returns ( address );
  function vaultType (  ) external pure returns ( uint8 );
  function vaultVersion (  ) external pure returns ( uint256 );
  function vefxsProxy (  ) external view returns ( address );
  function withdrawLocked ( bytes32 _kek_id ) external;
  function withdrawLockedAndUnwrap ( bytes32 _kek_id ) external;
}
