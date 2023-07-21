// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../../Misc_AMOs/convex/IDepositToken.sol";
import "../../Misc_AMOs/curve/I2poolToken.sol";
import "../../Misc_AMOs/curve/I2pool.sol";

contract FraxUnifiedFarm_ERC20_Convex_Generic is FraxUnifiedFarm_ERC20 {

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

        // // Convex crvUSD/FRAX
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = I2poolTokenNoLending(stakingToken.curveToken());
        // frax_is_token0 = true; 

        // // Convex FRAX/USDP
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = I2poolToken(stakingToken.curveToken());
        // curvePool = I2pool(curveToken.minter());
        // frax_is_token0 = true; 
    }

    function fraxPerLPToken() public view override returns (uint256 frax_per_lp_token) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING
        
        // Convex crvUSD/FRAX
        // ============================================
        // {
        //     // Half of the LP should be FRAX
        //     // Using 0.50 * virtual price for gas savings
        //     frax_per_lp_token = curvePool.get_virtual_price() / 2; 
        // }

    }
}
