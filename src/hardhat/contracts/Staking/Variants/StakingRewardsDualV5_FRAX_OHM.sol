// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../StakingRewardsDualV5.sol";

contract StakingRewardsDualV5_FRAX_OHM is StakingRewardsDualV5 {
    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1, // OHM is E9
        address _stakingToken, 
        address _frax_address,
        address _timelock_address,
        address _veFXS_address
    ) 
    StakingRewardsDualV5(_owner, _rewardsToken0, _rewardsToken1, _stakingToken, _frax_address, _timelock_address, _veFXS_address )
    {}
}
