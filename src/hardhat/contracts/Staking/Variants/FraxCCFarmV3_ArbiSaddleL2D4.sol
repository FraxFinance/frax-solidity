// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxCrossChainFarmV3_ERC20.sol";

contract FraxCCFarmV3_ArbiSaddleL2D4 is FraxCrossChainFarmV3_ERC20 {
    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken, 
        address _frax_address,
        address _timelock_address,
        address _rewarder_address
    ) 
    FraxCrossChainFarmV3_ERC20(_owner, _rewardsToken0, _rewardsToken1, _stakingToken, _frax_address, _timelock_address, _rewarder_address)
    {}
}
