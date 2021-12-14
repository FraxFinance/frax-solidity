// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

import "../FraxUnifiedFarm_UniV3.sol";

contract FraxUnifiedFarm_UniV3_FRAX_RAI is FraxUnifiedFarm_UniV3 {
    constructor (
        address _owner, 
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        uint256 seed_token_id
    ) 
    FraxUnifiedFarm_UniV3(_owner, _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers, _rewardDistributors, seed_token_id)
    {}
}
