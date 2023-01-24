// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IROARMasterchef {
  function BONUS_MULTIPLIER (  ) external view returns ( uint256 );
  function OLD_MASTER_CHEF (  ) external view returns ( address );
  function add ( uint256 _allocPoint, address _lpToken, bool _withUpdate ) external;
  function bonusEndBlock (  ) external view returns ( uint256 );
  function claimWait (  ) external view returns ( uint256 );
  function deposit ( uint256 _pid, uint256 _amount ) external;
  function emergencyWithdraw ( uint256 _pid ) external;
  function getMultiplier ( uint256 _from, uint256 _to ) external view returns ( uint256 );
  function massUpdatePools (  ) external;
  function migrate ( uint256 _pid ) external;
  function migrator (  ) external view returns ( address );
  function owner (  ) external view returns ( address );
  function pendingKwik ( uint256 _pid, address _user ) external view returns ( uint256 );
  function poolInfo ( uint256 ) external view returns ( address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accKwikPerShare );
  function poolLength (  ) external view returns ( uint256 );
  function renounceOwnership (  ) external;
  function rewardWithdraw (  ) external;
  function roar (  ) external view returns ( address );
  function roarPerBlock (  ) external view returns ( uint256 );
  function set ( uint256 _pid, uint256 _allocPoint, bool _withUpdate ) external;
  function setBlockReward ( uint256 _tokens ) external;
  function setMigrator ( address _migrator ) external;
  function startBlock (  ) external view returns ( uint256 );
  function totalAllocPoint (  ) external view returns ( uint256 );
  function transferOwnership ( address newOwner ) external;
  function updateClaimWait ( uint256 _claimWait ) external;
  function updatePool ( uint256 _pid ) external;
  function updateRewardBlock ( uint256 _blockNumber ) external;
  function updateRewardFirstBlock ( uint256 _blockNumber ) external;
  function userInfo ( uint256, address ) external view returns ( uint256 amount, uint256 rewardDebt, bool migrated );
  function withdraw ( uint256 _pid, uint256 _amount ) external;
}
