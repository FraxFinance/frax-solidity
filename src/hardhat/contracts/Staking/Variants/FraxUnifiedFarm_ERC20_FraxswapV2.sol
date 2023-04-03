// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import '../../Fraxswap/core/interfaces/IFraxswapPair.sol';

contract FraxUnifiedFarm_ERC20_FraxswapV2 is FraxUnifiedFarm_ERC20 {

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
        
        // // Fraxswap
        // stakingToken = IFraxswapPair(_stakingToken);
        // address token0 = stakingToken.token0();
        // frax_is_token0 = (token0 == frax_address);
    }

    function fraxPerLPToken() public view override returns (uint256) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

        // // Get the amount of FRAX 'inside' of the lp tokens
        // uint256 frax_per_lp_token;

        // // Fraxswap
        // // ============================================
        // {
        //     uint256 total_frax_reserves;
        //     // Technically getReserveAfterTwamm is more accurate, but if the TWAMM becomes paused, it will eventually gas out
        //     // (uint256 _reserve0, uint256 _reserve1, , ,) = (stakingToken.getReserveAfterTwamm(block.timestamp));
        //     (uint256 _reserve0, uint256 _reserve1, ) = (stakingToken.getReserves());
        //     if (frax_is_token0) total_frax_reserves = _reserve0;
        //     else total_frax_reserves = _reserve1;

        //     frax_per_lp_token = (total_frax_reserves * 1e18) / stakingToken.totalSupply();
        // }

        // return frax_per_lp_token;
    }
}
