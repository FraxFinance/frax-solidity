// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

interface ITC {
  function CONTRACT_ADMIN_ROLE() external view returns(bytes32);
  function SCALE_FACTOR() external view returns(uint256);
  function core() external view returns(address);
  function deposit(uint256 pid, uint256 amount, uint64 lockLength) external;
  function depositInfo(uint256, address, uint256) external view returns(uint256 amount, uint128 unlockBlock, uint128 multiplier);
  function emergencyWithdraw(uint256 pid, address to) external;
  function getTotalStakedInPool(uint256 pid, address user) external view returns(uint256);
  function governorAddPoolMultiplier(uint256 _pid, uint64 lockLength, uint64 newRewardsMultiplier) external;
  function harvest(uint256 pid, address to) external;
  function isContractAdmin(address _admin) external view returns(bool);
  function lockPool(uint256 _pid) external;
  function numPools() external view returns(uint256);
  function openUserDeposits(uint256 pid, address user) external view returns(uint256);
  function pause() external;
  function paused() external view returns(bool);
  function pendingRewards(uint256 _pid, address _user) external view returns(uint256);
  function resetRewards(uint256 _pid) external;
  function rewardMultipliers(uint256, uint128) external view returns(uint128);
  function rewarder(uint256) external view returns(address);
  function set(uint256 _pid, uint120 _allocPoint, address _rewarder, bool overwrite) external;
  function setContractAdminRole(bytes32 newContractAdminRole) external;
  function setCore(address newCore) external;
  function stakedToken(uint256) external view returns(address);
  function totalAllocPoint() external view returns(uint256);
  function unlockPool(uint256 _pid) external;
  function unpause() external;
  function updateBlockReward(uint256 newBlockReward) external;
  function updatePool(uint256 pid) external;
  function userInfo(uint256, address) external view returns(int256 rewardDebt, uint256 virtualAmount);
  function withdrawAllAndHarvest(uint256 pid, address to) external;
  function withdrawFromDeposit(uint256 pid, uint256 amount, address to, uint256 index) external;
}
