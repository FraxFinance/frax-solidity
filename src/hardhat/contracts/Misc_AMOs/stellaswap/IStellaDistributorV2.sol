// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IStellaDistributorV2 {
  function MAXIMUM_DEPOSIT_FEE_RATE () external view returns (uint16);
  function MAXIMUM_HARVEST_INTERVAL () external view returns (uint256);
  function add (uint256 _allocPoint, address _lpToken, uint16 _depositFeeBP, uint256 _harvestInterval, address[] memory _rewarders) external;
  function canHarvest (uint256 _pid, address _user) external view returns (bool);
  function deposit (uint256 _pid, uint256 _amount) external;
  function depositWithPermit (uint256 pid, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function emergencyWithdraw (uint256 _pid) external;
  function harvestMany (uint256[] memory  _pids) external;
  function investorAddress () external view returns (address);
  function investorPercent () external view returns (uint256);
  function massUpdatePools () external;
  function owner () external view returns (address);
  function pendingTokens (uint256 _pid, address _user) external view returns (address[] memory addresses, string[] memory symbols, uint256[] memory decimals, uint256[] memory amounts);
  function poolInfo (uint256) external view returns (address lpToken, uint256 allocPoint, uint256 lastRewardTimestamp, uint256 accStellaPerShare, uint16 depositFeeBP, uint256 harvestInterval, uint256 totalLp);
  function poolLength () external view returns (uint256);
  function poolRewarders (uint256 _pid) external view returns (address[] memory rewarders);
  function poolRewardsPerSec (uint256 _pid) external view returns (address[] memory addresses, string[] memory symbols, uint256[] memory decimals, uint256[] memory rewardsPerSec);
  function poolTotalLp (uint256 pid) external view returns (uint256);
  function renounceOwnership () external;
  function set (uint256 _pid, uint256 _allocPoint, uint16 _depositFeeBP, uint256 _harvestInterval, address[] memory _rewarders) external;
  function setInvestorAddress (address _investorAddress) external;
  function setInvestorPercent (uint256 _newInvestorPercent) external;
  function setTeamAddress (address _teamAddress) external;
  function setTeamPercent (uint256 _newTeamPercent) external;
  function setTreasuryAddress (address _treasuryAddress) external;
  function setTreasuryPercent (uint256 _newTreasuryPercent) external;
  function startFarming () external;
  function startTimestamp () external view returns (uint256);
  function stella () external view returns (address);
  function stellaPerSec () external view returns (uint256);
  function teamAddress () external view returns (address);
  function teamPercent () external view returns (uint256);
  function totalAllocPoint () external view returns (uint256);
  function totalLockedUpRewards () external view returns (uint256);
  function totalStellaInPools () external view returns (uint256);
  function transferOwnership (address newOwner) external;
  function treasuryAddress () external view returns (address);
  function treasuryPercent () external view returns (uint256);
  function updateAllocPoint (uint256 _pid, uint256 _allocPoint) external;
  function updateEmissionRate (uint256 _stellaPerSec) external;
  function updatePool (uint256 _pid) external;
  function userInfo (uint256, address) external view returns (uint256 amount, uint256 rewardDebt, uint256 rewardLockedUp, uint256 nextHarvestUntil);
  function withdraw (uint256 _pid, uint256 _amount) external;
}
