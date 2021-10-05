// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ICvxLocker {
    struct EarnedData {
        address token;
        uint256 amount;
    }

    struct LockedBalance {
        uint112 amount;
        uint112 boosted;
        uint32 unlockTime;
    }

  function addReward(address _rewardsToken, address _distributor, bool _useBoost) external;
  function approveRewardDistributor(address _rewardsToken, address _distributor, bool _approved) external;
  function balanceAtEpochOf(uint256 _epoch, address _user) external view returns (uint256 amount);
  function balanceOf(address _user) external view returns (uint256 amount);
  function balances(address) external view returns (uint112 locked, uint112 boosted, uint32 nextUnlockIndex);
  function boostPayment() external view returns (address);
  function boostRate() external view returns (uint256);
  function boostedSupply() external view returns (uint256);
  function checkpointEpoch() external;
  function claimableRewards(address _account) external view returns (EarnedData[] memory userRewards);
  function cvxCrv() external view returns (address);
  function cvxcrvStaking() external view returns (address);
  function decimals() external view returns (uint8);
  function denominator() external view returns (uint256);
  function epochCount() external view returns (uint256);
  function epochs(uint256) external view returns (uint224 supply, uint32 date);
  function findEpochId(uint256 _time) external view returns (uint256 epoch);
  function getReward(address _account, bool _stake) external;
  function getReward(address _account) external;
  function getRewardForDuration(address _rewardsToken) external view returns (uint256);
  function isShutdown() external view returns (bool);
  function kickExpiredLocks(address _account) external;
  function kickRewardEpochDelay() external view returns (uint256);
  function kickRewardPerEpoch() external view returns (uint256);
  function lastTimeRewardApplicable(address _rewardsToken) external view returns (uint256);
  function lock(address _account, uint256 _amount, uint256 _spendRatio) external;
  function lockDuration() external view returns (uint256);
  function lockedBalanceOf(address _user) external view returns (uint256 amount);
  function lockedBalances(address _user) external view returns (uint256 total, uint256 unlockable, uint256 locked, LockedBalance[] memory lockData);
  function lockedSupply() external view returns (uint256);
  function maximumBoostPayment() external view returns (uint256);
  function maximumStake() external view returns (uint256);
  function minimumStake() external view returns (uint256);
  function name() external view returns (string memory);
  function nextBoostRate() external view returns (uint256);
  function nextMaximumBoostPayment() external view returns (uint256);
  function notifyRewardAmount(address _rewardsToken, uint256 _reward) external;
  function owner() external view returns (address);
  function processExpiredLocks(bool _relock) external;
  function processExpiredLocks(bool _relock, uint256 _spendRatio, address _withdrawTo) external;
  function recoverERC20(address _tokenAddress, uint256 _tokenAmount) external;
  function renounceOwnership() external;
  function rewardData(address) external view returns (bool useBoost, uint40 periodFinish, uint208 rewardRate, uint40 lastUpdateTime, uint208 rewardPerTokenStored);
  function rewardDistributors(address, address) external view returns (bool);
  function rewardPerToken(address _rewardsToken) external view returns (uint256);
  function rewardTokens(uint256) external view returns (address);
  function rewardWeightOf(address _user) external view returns (uint256 amount);
  function rewards(address, address) external view returns (uint256);
  function rewardsDuration() external view returns (uint256);
  function setApprovals() external;
  function setBoost(uint256 _max, uint256 _rate, address _receivingAddress) external;
  function setKickIncentive(uint256 _rate, uint256 _delay) external;
  function setStakeLimits(uint256 _minimum, uint256 _maximum) external;
  function setStakingContract(address _staking) external;
  function shutdown() external;
  function stakeOffsetOnLock() external view returns (uint256);
  function stakingProxy() external view returns (address);
  function stakingToken() external view returns (address);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256 supply);
  function totalSupplyAtEpoch(uint256 _epoch) external view returns (uint256 supply);
  function transferOwnership(address newOwner) external;
  function userLocks(address, uint256) external view returns (uint112 amount, uint112 boosted, uint32 unlockTime);
  function userRewardPerTokenPaid(address, address) external view returns (uint256);
}
