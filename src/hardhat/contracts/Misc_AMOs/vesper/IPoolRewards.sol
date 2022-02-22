// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IPoolRewards {
  function VERSION() external view returns(string memory);
  function addRewardToken(address _newRewardToken) external;
  function claimReward(address _account) external;
  function claimable(address _account) external view returns(address[] memory _rewardTokens, uint256[] memory _claimableAmounts);
  function getRewardTokens() external view returns(address[] memory);
  function initialize(address _pool, address[] memory _rewardTokens) external;
  function isRewardToken(address) external view returns(bool);
  function lastTimeRewardApplicable(address _rewardToken) external view returns(uint256);
  function lastUpdateTime(address) external view returns(uint256);
  function notifyRewardAmount(address _rewardToken, uint256 _rewardAmount, uint256 _rewardDuration) external;
  function notifyRewardAmount(address[] memory _rewardTokens, uint256[] memory _rewardAmounts, uint256[] memory _rewardDurations) external;
  function periodFinish(address) external view returns(uint256);
  function pool() external view returns(address);
  function rewardDuration(address) external view returns(uint256);
  function rewardForDuration() external view returns(address[] memory _rewardTokens, uint256[] memory _rewardForDuration);
  function rewardPerToken() external view returns(address[] memory _rewardTokens, uint256[] memory _rewardPerTokenRate);
  function rewardPerTokenStored(address) external view returns(uint256);
  function rewardRates(address) external view returns(uint256);
  function rewardTokens(uint256) external view returns(address);
  function rewards(address, address) external view returns(uint256);
  function updateReward(address _account) external;
  function userRewardPerTokenPaid(address, address) external view returns(uint256);
}