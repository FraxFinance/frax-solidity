// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../ERC20/ERC20.sol";

interface IStakingRewardsDualForMigrator {

    struct ILockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 amount;
        uint256 ending_timestamp;
        uint256 multiplier; // 6 decimals of precision. 1x = 1000000
    }

    // Views
    function stakingToken() external view returns (ERC20);

    function lockedStakesOf(address account) external view returns (ILockedStake[] memory);

    function earned(address account) external view returns (uint256, uint256);

    function getRewardForDuration() external view returns (uint256, uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    // Mutative

    function stake(uint256 amount) external;

    function stakeLocked(uint256 amount, uint256 secs) external;

    function withdraw(uint256 amount) external;

    function withdrawLocked(bytes32 kek_id) external;

    function getReward() external;

    function unlockStakes() external; 

    //function exit() external;
}
