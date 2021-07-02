// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IVirtualBalanceRewardPool {
    function balanceOf(address account) external view returns (uint256);
    function currentRewards() external view returns (uint256);
    function deposits() external view returns (address);
    function donate(uint256 _amount) external returns (bool);
    function duration() external view returns (uint256);
    function earned(address account) external view returns (uint256);
    function getReward() external;
    function getReward(address _account) external;
    function historicalRewards() external view returns (uint256);
    function lastTimeRewardApplicable() external view returns (uint256);
    function lastUpdateTime() external view returns (uint256);
    function newRewardRatio() external view returns (uint256);
    function operator() external view returns (address);
    function periodFinish() external view returns (uint256);
    function queueNewRewards(uint256 _rewards) external;
    function queuedRewards() external view returns (uint256);
    function rewardPerToken() external view returns (uint256);
    function rewardPerTokenStored() external view returns (uint256);
    function rewardRate() external view returns (uint256);
    function rewardToken() external view returns (address);
    function rewards(address) external view returns (uint256);
    function stake(address _account, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function userRewardPerTokenPaid(address) external view returns (uint256);
    function withdraw(address _account, uint256 amount) external;
}