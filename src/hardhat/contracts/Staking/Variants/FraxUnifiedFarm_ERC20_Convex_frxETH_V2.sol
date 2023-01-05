// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20_V2.sol";
// import "../../Curve/ICurvefrxETHETHPool.sol";
// import "../../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
// import "../../Misc_AMOs/convex/IDepositToken.sol";
// import "../../Misc_AMOs/curve/I2pool.sol";
// import "../../Misc_AMOs/curve/I2poolToken.sol";
import "../../Oracle/AggregatorV3Interface.sol";
// import "../../ERC20/IERC20.sol";

contract FraxUnifiedFarm_ERC20_Convex_frxETH is FraxUnifiedFarm_ERC20 {

    AggregatorV3Interface internal priceFeedETHUSD = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);

    /// Added this as an override to the I2Pool version in FraxFarmERC20 to fix compiler warnings
    // ICurvefrxETHETHPool public immutable curvePool;

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

        // Convex frxETHETH only
        stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        curveToken = I2poolToken(stakingToken.curveToken());
        curvePool = ICurvefrxETHETHPool(curveToken.minter());
        // address token0 = curvePool.coins(0);
        // frax_is_token0 = false; // Doesn't matter for frxETH
    }

    function getLatestETHPriceE8() public view returns (int) {
        // Returns in E8
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedETHUSD.latestRoundData();
        // require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        if (price < 0 || updatedAt == 0 || answeredInRound < roundID) revert InvalidChainlinkPrice();
        
        return price;
    }

    function setETHUSDOracle(address _eth_usd_oracle_address) public onlyByOwnGov {
        // require(_eth_usd_oracle_address != address(0), "Zero address detected");
        if (_eth_usd_oracle_address == address(0)) revert CannotBeZero();

        priceFeedETHUSD = AggregatorV3Interface(_eth_usd_oracle_address);
    }

    function fraxPerLPToken() public view override returns (uint256) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

        // Get the amount of FRAX 'inside' of the lp tokens
        uint256 frax_per_lp_token;

        // Convex frxETH/ETH
        // ============================================
        {
            // Assume frxETH = ETH for pricing purposes
            // Get the USD value of the frxETH per LP token
            uint256 frxETH_in_pool = IERC20(0x5E8422345238F34275888049021821E8E08CAa1f).balanceOf(address(curvePool));
            uint256 frxETH_usd_val_per_lp_e8 = (frxETH_in_pool * uint256(getLatestETHPriceE8())) / curveToken.totalSupply();
            frax_per_lp_token = frxETH_usd_val_per_lp_e8 * (1e10); // We use USD as "Frax" here
        }

        return frax_per_lp_token;
    }

    function preTransferProcess(address from, address to) public override {
        stakingToken.user_checkpoint(from);
        stakingToken.user_checkpoint(to);
    }
}
