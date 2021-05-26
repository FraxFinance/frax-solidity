// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
pragma experimental ;

import "../StakingRewardsDualV2.sol";

contract StakingRewardsDualV2_FRAX3CRV_V2 is StakingRewardsDualV2 {
    constructor(
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _frax_address,
        address _timelock_address,
        uint256 _pool_weight0,
        uint256 _pool_weight1
    )
        public
        StakingRewardsDualV2(
            _owner,
            _rewardsToken0,
            _rewardsToken1,
            _stakingToken,
            _frax_address,
            _timelock_address,
            _pool_weight0,
            _pool_weight1
        )
    {}
}
