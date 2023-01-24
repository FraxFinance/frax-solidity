// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IThenaGaugeV2 {
  function DISTRIBUTION () external view returns (address);
  function DURATION () external view returns (uint256);
  function TOKEN () external view returns (address);
  function _VE () external view returns (address);
  function _balances (address) external view returns (uint256);
  function _periodFinish () external view returns (uint256);
  function _totalSupply () external view returns (uint256);
  function balanceOf (address account) external view returns (uint256);
  function claimFees () external returns (uint256 claimed0, uint256 claimed1);
  function deposit (uint256 amount) external;
  function depositAll () external;
  function earned (address account) external view returns (uint256);
  function external_bribe () external view returns (address);
  function fees0 () external view returns (uint256);
  function fees1 () external view returns (uint256);
  function gaugeRewarder () external view returns (address);
  function getReward () external;
  function internal_bribe () external view returns (address);
  function isForPair () external view returns (bool);
  function lastTimeRewardApplicable () external view returns (uint256);
  function lastUpdateTime () external view returns (uint256);
  function notifyRewardAmount (address token, uint256 reward) external;
  function owner () external view returns (address);
  function periodFinish () external view returns (uint256);
  function renounceOwnership () external;
  function rewardForDuration () external view returns (uint256);
  function rewardPerToken () external view returns (uint256);
  function rewardPerTokenStored () external view returns (uint256);
  function rewardRate () external view returns (uint256);
  function rewardToken () external view returns (address);
  function rewarderPid () external view returns (uint256);
  function rewards (address) external view returns (uint256);
  function setDistribution (address _distribution) external;
  function setGaugeRewarder (address _gaugeRewarder) external;
  function setRewarderPid (uint256 _pid) external;
  function totalSupply () external view returns (uint256);
  function transferOwnership (address newOwner) external;
  function userRewardPerTokenPaid (address) external view returns (uint256);
  function withdraw (uint256 amount) external;
  function withdrawAll () external;
  function withdrawAllAndHarvest () external;
}
