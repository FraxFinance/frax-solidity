// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../../Misc_AMOs/convex/IDepositToken.sol";
import "../../Misc_AMOs/curve/I2pool.sol";
import "../../Misc_AMOs/curve/I2poolToken.sol";

contract FraxUnifiedFarm_ERC20_Convex_FRAXBP_Volatile is FraxUnifiedFarm_ERC20 {

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

        // // Convex stkcvxFPIFRAX and stkcvxFRAXBP. Also Volatile/FRAXBP
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = I2poolToken(stakingToken.curveToken());
        // curvePool = I2pool(curveToken.minter());
        // address token0 = curvePool.coins(0);
        // frax_is_token0 = (token0 == frax_address);
    }

    function fraxPerLPToken() public view override returns (uint256 frax_per_lp_token) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

        // // Convex Volatile/FRAXBP
        // // ============================================
        // {
        //     // Half of the LP is FRAXBP. Half of that should be FRAX.
        //     // Using 0.25 * lp price for gas savings
        //     frax_per_lp_token = (curvePool.lp_price() * (1e18)) / (4 * curvePool.price_oracle()); 
        // }

    }
}
