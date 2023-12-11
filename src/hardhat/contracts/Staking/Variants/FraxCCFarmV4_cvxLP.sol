// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxCrossChainFarmV4_ERC20.sol";

contract FraxCCFarmV4_cvxLP is FraxCrossChainFarmV4_ERC20 {
    string public farm_type = "FraxCCFarmV4_cvxLP";

    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address _stakingToken,
        address _fraxAddress,
        address _timelockAddress,
        address _rewarder_address
    ) 
    FraxCrossChainFarmV4_ERC20(_owner, _rewardTokens, _stakingToken, _fraxAddress, _timelockAddress, _rewarder_address)
    {}
}
