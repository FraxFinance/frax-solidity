// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_PosRebase.sol";

contract FraxUnifiedFarm_PosRebase_aFRAX is FraxUnifiedFarm_PosRebase {
    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address _stakingToken 
    ) 
    FraxUnifiedFarm_PosRebase(_owner , _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers, _rewardDistributors, _stakingToken)
    {}
}
