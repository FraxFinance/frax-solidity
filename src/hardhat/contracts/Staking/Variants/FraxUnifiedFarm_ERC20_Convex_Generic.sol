// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../ERC20/IERC20.sol";
// import '../../FXB/IFXB.sol';
import "../../FPI/IFPI.sol";
import "../../Oracle/ICPITrackerOracle.sol";
import "../../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../../Misc_AMOs/convex/IDepositToken.sol";
import "../../Misc_AMOs/curve/I2poolToken.sol";
import "../../Misc_AMOs/curve/I2pool.sol";
import "../../Misc_AMOs/curve/ICurveStableSwapNG.sol";
import "../../Misc_AMOs/curve/ICurveTricryptoOptimizedWETH.sol";
import "../../Oracle/AggregatorV3Interface.sol";


contract FraxUnifiedFarm_ERC20_Convex_Generic is FraxUnifiedFarm_ERC20 {

    string public farm_type = "ERC20_Convex_Generic";

    // IFPI public FPI = IFPI(0x5Ca135cB8527d76e932f34B5145575F9d8cbE08E);
    // ICPITrackerOracle public FPI_ORACLE = ICPITrackerOracle(0x66B7DFF2Ac66dc4d6FBB3Db1CB627BBb01fF3146);

    // Convex tricryptoFRAX
    // ============================================
    AggregatorV3Interface internal priceFeedETHUSD = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);

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

        // Convex crvUSD/FRAX
        // ============================================
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = I2poolTokenNoLending(stakingToken.curveToken());

        // Convex FRAX/PYUSD & NG pools
        // ============================================
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = ICurveStableSwapNG(stakingToken.curveToken());
        // curvePool = ICurveStableSwapNG(curveToken);

        // Convex FRAX/USDP
        // ============================================
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = I2poolToken(stakingToken.curveToken());
        // curvePool = I2pool(curveToken.minter());

        // Convex FRAX/FXB
        // ============================================
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = ICurveStableSwapNG(stakingToken.curveToken());
        // curvePool = ICurveStableSwapNG(curveToken);

        // Convex tricryptoFRAX & Convex triSDT
        // ============================================
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = ICurveTricryptoOptimizedWETH(address(stakingToken.curveToken()));
        // curvePool = ICurveTricryptoOptimizedWETH(address(stakingToken.curveToken()));

    }

    // Convex tricryptoFRAX 
    // ============================================
    function getLatestETHPriceE8() public view returns (int) {
        // Returns in E8
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedETHUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        
        return price;
    }

    function setETHUSDOracle(address _eth_usd_oracle_address) public onlyByOwnGov {
        require(_eth_usd_oracle_address != address(0), "Zero address detected");

        priceFeedETHUSD = AggregatorV3Interface(_eth_usd_oracle_address);
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

        // Convex FRAX/PYUSD
        // ============================================
        // {
        //     // Half of the LP should be FRAX
        //     // Using 0.50 * virtual price for gas savings
        //     frax_per_lp_token = curvePool.get_virtual_price() / 2; 
        // }

        // Convex FRAX/sDAI
        // ============================================
        // {
        //     // Special calculation because FRAX != sDAI
        //     frax_per_lp_token = (IERC20(frax_address).balanceOf(address(curvePool)) * 1e18) / curvePool.totalSupply(); 
        // }

        // Convex FRAX/FPI NG
        // ============================================
        // {
        //     // Count both FRAX and FPI as both are beneficial
        //     uint256 frax_balance = IERC20(frax_address).balanceOf(address(curvePool));
        //     uint256 fpi_value_e36 = FPI.balanceOf(address(curvePool)) * FPI_ORACLE.currPegPrice();
        //     frax_per_lp_token = ((frax_balance * 1e18) + fpi_value_e36) / curvePool.totalSupply(); 
        // }

        // Convex FRAX/FXB
        // ============================================
        // {
        //     // Count both FRAX and FXB as both are beneficial
        //     frax_per_lp_token = curvePool.get_virtual_price(); 
        // }

        // Convex triSDT
        // ============================================
        // {
        //     // One third of the LP should be frxETH
        //     // Using lp_price / 3 for gas savings
        //     frax_per_lp_token = curvePool.lp_price() / 3; 
        // }

        // Convex tricryptoFRAX
        // ============================================
        // {
        //     // Get the value of frxETH in the pool
        //     uint256 frxETH_in_pool = IERC20(0x5E8422345238F34275888049021821E8E08CAa1f).balanceOf(address(curvePool));
        //     uint256 frxETH_usd_val = (frxETH_in_pool * uint256(getLatestETHPriceE8())) / (1e8);
            
        //     // Get the value of FRAX in the pool, assuming it is $1
        //     uint256 frax_balance = IERC20(frax_address).balanceOf(address(curvePool));

        //     // Add both FRAX and frxETH $ values since both are beneficial
        //     frax_per_lp_token = ((frax_balance + frxETH_usd_val) * 1e18) / curvePool.totalSupply();
        // }
    }
}
