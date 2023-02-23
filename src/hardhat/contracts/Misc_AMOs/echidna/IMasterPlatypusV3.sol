// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IMasterPlatypusV3 {
  function acceptOwnership () external;
  function add (uint256 _baseAllocPoint, address _lpToken, address _rewarder) external;
  function claimablePtp (uint256, address) external view returns (uint256);
  function deposit (uint256 _pid, uint256 _amount) external returns (uint256, uint256);
  function depositFor (uint256 _pid, uint256 _amount, address _user) external;
  function dialutingRepartition () external view returns (uint256);
  function emergencyPtpWithdraw () external;
  function emergencyWithdraw (uint256 _pid) external;
  function initialize (address _ptp, address _vePtp, uint256 _ptpPerSec, uint256 _dialutingRepartition, uint256 _startTimestamp) external;
  function massUpdatePools () external;
  function maxPoolLength () external view returns (uint256);
  function migrate (uint256[] memory _pids) external;
  function multiClaim (uint256[] memory _pids) external returns (uint256, uint256[] memory, uint256[] memory);
  function newMasterPlatypus () external view returns (address);
  function nonDialutingRepartition () external view returns (uint256);
  function owner () external view returns (address);
  function ownerCandidate () external view returns (address);
  function pause () external;
  function paused () external view returns (bool);
  function pendingTokens (uint256 _pid, address _user) external view returns (uint256 pendingPtp, address bonusTokenAddress, string memory bonusTokenSymbol, uint256 pendingBonusToken);
  function poolAdjustFactor (uint256 pid) external view returns (uint256);
  function poolInfo (uint256) external view returns (address lpToken, uint256 baseAllocPoint, uint256 lastRewardTimestamp, uint256 accPtpPerShare, address rewarder, uint256 sumOfFactors, uint256 accPtpPerFactorShare, uint256 adjustedAllocPoint);
  function poolLength () external view returns (uint256);
  function proposeOwner (address newOwner) external;
  function ptp () external view returns (address);
  function ptpPerSec () external view returns (uint256);
  function renounceOwnership () external;
  function rewarderBonusTokenInfo (uint256 _pid) external view returns (address bonusTokenAddress, string memory bonusTokenSymbol);
  function set (uint256 _pid, uint256 _baseAllocPoint, address _rewarder, bool overwrite) external;
  function setMaxPoolLength (uint256 _maxPoolLength) external;
  function setNewMasterPlatypus (address _newMasterPlatypus) external;
  function setVePtp (address _newVePtp) external;
  function startTimestamp () external view returns (uint256);
  function totalAdjustedAllocPoint () external view returns (uint256);
  function totalBaseAllocPoint () external view returns (uint256);
  function unpause () external;
  function updateEmissionRate (uint256 _ptpPerSec) external;
  function updateEmissionRepartition (uint256 _dialutingRepartition) external;
  function updateFactor (address _user, uint256 _newVePtpBalance) external;
  function updatePool (uint256 _pid) external;
  function userInfo (uint256, address) external view returns (uint256 amount, uint256 rewardDebt, uint256 factor);
  function vePtp () external view returns (address);
  function version () external pure returns (uint256);
  function withdraw (uint256 _pid, uint256 _amount) external returns (uint256, uint256);
}
