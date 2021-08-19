// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../StakingRewardsDualV4.sol";

contract StakingRewardsDualV4_FRAX_OHM is StakingRewardsDualV4 {
    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1, // OHM is E9
        address _stakingToken, 
        address _frax_address,
        address _timelock_address,
        address _veFXS_address
    ) 
    StakingRewardsDualV4(_owner, _rewardsToken0, _rewardsToken1, _stakingToken, _frax_address, _timelock_address, _veFXS_address )
    {}
}
