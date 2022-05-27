// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

interface ITrueMultiFarm {
  function claim ( address[] memory tokens ) external;
  function claimOwnership (  ) external;
  function claimable ( address token, address account ) external view returns ( uint256 );
  function exit ( address[] memory tokens ) external;
  function farmRewards (  ) external view returns ( uint256 cumulativeRewardPerToken, uint256 totalClaimedRewards, uint256 totalRewards );
  function getShare ( address token ) external view returns ( uint256 );
  function initialize ( address _trueDistributor ) external;
  function isInitialized (  ) external view returns ( bool );
  function owner (  ) external view returns ( address );
  function pendingOwner (  ) external view returns ( address );
  function rewardToken (  ) external view returns ( address );
  function setShares ( address[] memory tokens, uint256[] memory updatedShares ) external;
  function shares (  ) external view returns ( uint256 totalStaked );
  function stake ( address token, uint256 amount ) external;
  function staked ( address token, address staker ) external view returns ( uint256 );
  function stakerRewards ( address ) external view returns ( uint256 cumulativeRewardPerToken, uint256 totalClaimedRewards, uint256 totalRewards );
  function stakes ( address ) external view returns ( uint256 totalStaked );
  function transferOwnership ( address newOwner ) external;
  function trueDistributor (  ) external view returns ( address );
  function unstake ( address token, uint256 amount ) external;
}
