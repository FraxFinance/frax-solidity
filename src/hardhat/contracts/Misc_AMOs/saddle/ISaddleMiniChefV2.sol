// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ISaddleMiniChefV2 {
    struct PoolInfo {
        address lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. SADDLE to distribute per block.
        uint256 lastRewardBlock;  // Last block number that SADDLE distribution occurs.
        uint256 accSaddlePerShare; // Accumulated SADDLE per share, times 1e12. See below.
    }

    function SADDLE () external view returns (address);
    function add (uint256 allocPoint, address _lpToken, address _rewarder) external;
    function batch (bytes[] memory calls, bool revertOnFail) external returns (bool[] memory successes, bytes[] memory results);
    function claimOwnership () external;
    function deposit (uint256 pid, uint256 amount, address to) external;
    function emergencyWithdraw (uint256 pid, address to) external;
    function harvest (uint256 pid, address to) external;
    function lpToken (uint256) external view returns (address);
    function massUpdatePools (uint256[] memory pids) external;
    function owner () external view returns (address);
    function pendingOwner () external view returns (address);
    function pendingSaddle (uint256 _pid, address _user) external view returns (uint256 pending);
    function permitToken (address token, address from, address to, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function poolInfo (uint256) external view returns (uint128 accSaddlePerShare, uint64 lastRewardTime, uint64 allocPoint);
    function poolLength () external view returns (uint256 pools);
    function rewarder (uint256) external view returns (address);
    function saddlePerSecond () external view returns (uint256);
    function set (uint256 _pid, uint256 _allocPoint, address _rewarder, bool overwrite) external;
    function setSaddlePerSecond (uint256 _saddlePerSecond) external;
    function totalAllocPoint () external view returns (uint256);
    function transferOwnership (address newOwner, bool direct, bool renounce) external;
    function updatePool (uint256 pid) external returns (PoolInfo memory pool);
    function userInfo (uint256, address) external view returns (uint256 amount, int256 rewardDebt);
    function withdraw (uint256 pid, uint256 amount, address to) external;
    function withdrawAndHarvest (uint256 pid, uint256 amount, address to) external;
}
