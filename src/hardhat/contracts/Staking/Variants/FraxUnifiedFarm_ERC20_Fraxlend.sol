// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import '../../Fraxlend/IFraxlendPair.sol';
import '../../Fraxlend/IFraxlendPairHelper.sol';

contract FraxUnifiedFarm_ERC20_Fraxlend is FraxUnifiedFarm_ERC20 {

    IFraxlendPairHelper public flp_helper = IFraxlendPairHelper(0x1b0bCeD6dd26a7c234506E261BC68C9A3A4031b7);

    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address _stakingToken 
    ) 
    FraxUnifiedFarm_ERC20(_owner , _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers, _rewardDistributors, _stakingToken)
    {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING
        
        // Fraxlend
        // stakingToken = IFraxlendPair(_stakingToken);
        // address token0 = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
        // frax_is_token0 = true;
    }

    function setFraxlendPairHelper(address new_address) public onlyByOwnGov {
        flp_helper = IFraxlendPairHelper(new_address);
    }

    function fraxPerLPToken() public view override returns (uint256) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

        // // Get the amount of FRAX 'inside' of the lp tokens
        // uint256 frax_per_lp_token;

        // // Fraxlend
        // // ============================================
        // {
        //     (frax_per_lp_token, , ) = flp_helper.toAssetAmount(address(stakingToken), 1e18, block.timestamp, block.number, false);
        // }

        // return frax_per_lp_token;
    }
}
