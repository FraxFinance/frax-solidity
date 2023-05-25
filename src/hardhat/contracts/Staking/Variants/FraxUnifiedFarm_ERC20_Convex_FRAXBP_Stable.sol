// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../../Misc_AMOs/convex/IDepositToken.sol";
import "../../Misc_AMOs/curve/I2pool.sol";
import "../../Misc_AMOs/curve/I2poolToken.sol";

contract FraxUnifiedFarm_ERC20_Convex_FRAXBP_Stable is FraxUnifiedFarm_ERC20 {

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

        // Convex stkcvxBUSDBP and other metaFRAXBPs, where the token is also the pool (Convex Stable/FRAXBP)
        stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        curveToken = I2poolToken(stakingToken.curveToken());
        curvePool = I2pool(address(curveToken));
        frax_is_token0 = false; // Irrelevant here, as token 0 will be FRAXBP
    }

    function fraxPerLPToken() public view override returns (uint256 frax_per_lp_token) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING
        
        // Convex Stable/FRAXBP
        // ============================================
        {
            // Half of the LP is FRAXBP. Half of that should be FRAX.
            // Using 0.25 * virtual price for gas savings
            frax_per_lp_token = curvePool.get_virtual_price() / 4; 
        }

    }
}
