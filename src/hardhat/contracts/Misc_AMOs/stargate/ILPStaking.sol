// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ILPStaking {
    function BONUS_MULTIPLIER () external view returns (uint256);
    function add (uint256 _allocPoint, address _lpToken) external;
    function bonusEndBlock () external view returns (uint256);
    function deposit (uint256 _pid, uint256 _amount) external;
    function emergencyWithdraw (uint256 _pid) external;
    function getMultiplier (uint256 _from, uint256 _to) external view returns (uint256);
    function lpBalances (uint256) external view returns (uint256);
    function massUpdatePools () external;
    function owner () external view returns (address);
    function pendingStargate (uint256 _pid, address _user) external view returns (uint256);
    function poolInfo (uint256) external view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accStargatePerShare);
    function poolLength () external view returns (uint256);
    function renounceOwnership () external;
    function set (uint256 _pid, uint256 _allocPoint) external;
    function setStargatePerBlock (uint256 _stargatePerBlock) external;
    function stargate () external view returns (address);
    function stargatePerBlock () external view returns (uint256);
    function startBlock () external view returns (uint256);
    function totalAllocPoint () external view returns (uint256);
    function transferOwnership (address newOwner) external;
    function updatePool (uint256 _pid) external;
    function userInfo (uint256, address) external view returns (uint256 amount, uint256 rewardDebt);
    function withdraw (uint256 _pid, uint256 _amount) external;

    // Extra
    function eTokenPerSecond () external view returns (uint256);
}
