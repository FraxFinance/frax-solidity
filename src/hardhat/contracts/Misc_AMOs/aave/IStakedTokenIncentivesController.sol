// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IStakedTokenIncentivesController {
  function DISTRIBUTION_END() external view returns (uint256);
  function EMISSION_MANAGER() external view returns (address);
  function PRECISION() external view returns (uint8);
  function REVISION() external view returns (uint256);
  function REWARD_TOKEN() external view returns (address);
  function STAKE_TOKEN() external view returns (address);
  function assets(address) external view returns (uint104 emissionPerSecond, uint104 index, uint40 lastUpdateTimestamp);
  function claimRewards(address[] memory assets, uint256 amount, address to) external returns (uint256);
  function claimRewardsOnBehalf(address[] memory assets, uint256 amount, address user, address to) external returns (uint256);
  function configureAssets(address[] memory assets, uint256[] memory emissionsPerSecond) external;
  function getAssetData(address asset) external view returns (uint256, uint256, uint256);
  function getClaimer(address user) external view returns (address);
  function getDistributionEnd() external view returns (uint256);
  function getRewardsBalance(address[] memory assets, address user) external view returns (uint256);
  function getUserAssetData(address user, address asset) external view returns (uint256);
  function getUserUnclaimedRewards(address _user) external view returns (uint256);
  function handleAction(address user, uint256 totalSupply, uint256 userBalance) external;
  function initialize(address addressesProvider) external;
  function setClaimer(address user, address caller) external;
  function setDistributionEnd(uint256 distributionEnd) external;
}
