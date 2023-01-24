// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBBROARMasterchef {
  function add ( uint256 _allocPoint, address _lpToken, bool _withUpdate ) external;
  function deposit ( uint256 _pid, uint256 _amount ) external;
  function emergencyWithdraw ( uint256 _pid ) external;
  function getAllPoolUserInfos ( uint256 _pid ) external view returns ( address[] memory, uint256[] memory );
  function getAllPoolUsers ( uint256 _pid ) external view returns ( address[] memory );
  function getMultiplier ( uint256 _from, uint256 _to ) external pure returns ( uint256 );
  function massUpdatePools (  ) external;
  function migrate ( uint256 _pid ) external;
  function migrator (  ) external view returns ( address );
  function owner (  ) external view returns ( address );
  function pendingKwik ( uint256 _pid, address _user ) external view returns ( uint256 );
  function poolInfo ( uint256 ) external view returns ( address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accKwikPerShare );
  function poolLength (  ) external view returns ( uint256 );
  function renounceOwnership (  ) external;
  function roar (  ) external view returns ( address );
  function roarPerBlock (  ) external view returns ( uint256 );
  function set ( uint256 _pid, uint256 _allocPoint, bool _withUpdate ) external;
  function setMigrator ( address _migrator ) external;
  function startBlock (  ) external view returns ( uint256 );
  function totalAllocPoint (  ) external view returns ( uint256 );
  function transferOwnership ( address newOwner ) external;
  function updatePool ( uint256 _pid ) external;
  function updateRewardFirstBlock ( uint256 _blockNumber ) external;
  function updateRoar ( address _roar ) external;
  function userInfo ( uint256, address ) external view returns ( uint256 amount, uint256 rewardDebt );
  function withdraw ( uint256 _pid, uint256 _amount ) external;
}
