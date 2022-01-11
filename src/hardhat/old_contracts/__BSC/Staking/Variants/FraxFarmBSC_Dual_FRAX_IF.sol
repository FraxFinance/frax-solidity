// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

import "../FraxFarmBSC_Dual_V5.sol";

contract FraxFarmBSC_Dual_FRAX_IF is FraxFarmBSC_Dual_V5 {
    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _timelock_address
    ) 
    FraxFarmBSC_Dual_V5(_owner, _rewardsToken0, _rewardsToken1, _stakingToken, _timelock_address)
    {}
}