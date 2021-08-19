// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../StakingRewardsDualV3.sol";

contract StakingRewardsDualV3_FRAX_IQ is StakingRewardsDualV3 {
    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _frax_address,
        address _timelock_address,
        address _veFXS_address
    ) 
    StakingRewardsDualV3(_owner, _rewardsToken0, _rewardsToken1, _stakingToken, _frax_address, _timelock_address, _veFXS_address )
    {}
}
