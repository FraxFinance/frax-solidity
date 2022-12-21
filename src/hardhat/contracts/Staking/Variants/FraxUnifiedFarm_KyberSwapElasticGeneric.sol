// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_KyberSwapElastic.sol";

contract FraxUnifiedFarm_KyberSwapElasticGeneric is FraxUnifiedFarm_KyberSwapElastic {

    constructor (
        address _owner, 
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address[] memory _coreAddresses, // 0: NFT Manager, 1: ComboOracle
        uint256 seed_token_id
    ) 
    FraxUnifiedFarm_KyberSwapElastic(_owner, _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers, _rewardDistributors, _coreAddresses, seed_token_id )
    {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

    }

}
