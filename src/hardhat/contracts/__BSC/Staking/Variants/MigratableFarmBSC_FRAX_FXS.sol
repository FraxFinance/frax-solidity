// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

import "../MigratableFarmBSC.sol";

contract MigratableFarmBSC_FRAX_FXS is MigratableFarmBSC {
    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _timelock_address
    ) 
    MigratableFarmBSC(_owner, _rewardsToken0, _rewardsToken1, _stakingToken, _timelock_address)
    {}
}