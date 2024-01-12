// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Oracle/AggregatorV3Interface.sol";

// Balancer
// =========================
import "../../Misc_AMOs/balancer/IAuraGauge.sol";
import "../../Misc_AMOs/balancer/IBalancerMinter.sol";
import "../../Misc_AMOs/balancer/IBalancerVault.sol";
import "../../Misc_AMOs/balancer/IComposableStablePool.sol";

// Bunni
// =========================
// import "../../Misc_AMOs/bunni/IBunniTokenLP.sol";
// import "../../Misc_AMOs/bunni/IBunniGauge.sol";
// import "../../Misc_AMOs/bunni/IBunniLens.sol";
// import "../../Misc_AMOs/bunni/IBunniMinter.sol";
// import "../../Uniswap_V3/IUniswapV3Pool.sol";


contract FraxUnifiedFarm_ERC20_Other is FraxUnifiedFarm_ERC20 {

    // frxETH Pricing
    AggregatorV3Interface internal priceFeedETHUSD = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);

    // Balancer
    IComposableStablePool public lp_tkn;
    IBalancerVault public vault;

    // Bunni
    // IBunniTokenLP public lp_tkn;
    // IUniswapV3Pool public univ3_pool;

    string public farm_type = "ERC20_Convex_Other";

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
        
        // Balancer
        stakingToken = IAuraGauge(_stakingToken);
        lp_tkn = IComposableStablePool(stakingToken.lp_token());
        vault = IBalancerVault(lp_tkn.getVault());

        // Bunni
        // stakingToken = IBunniGauge(_stakingToken);
        // lp_tkn = IBunniTokenLP(stakingToken.lp_token());
        // univ3_pool = IUniswapV3Pool(lp_tkn.pool());
        // address token0 = univ3_pool.token0();
        // frax_is_token0 = (token0 == frax_address);
    }

    // Balancer
    // ----------------------------------------
    function setBalancerAddrs(address _minter, address _vault) public onlyByOwnGov {
        minter = IBalancerMinter(_minter);
        vault = IBalancerVault(_vault);
    }

    // In case the rewards get screwed up
    function toggleBalancer3rdPartyBalClaimer(address _claimer) public onlyByOwnGov {
        minter.toggle_approve_mint(_claimer);
    }

    // Bunni
    // ----------------------------------------
    // function setBunniAddrs(address _lens, address _minter) public onlyByOwnGov {
    //     lens = IBunniLens(_lens);
    //     minter = IBunniMinter(_minter);
    // }

    // // In case the rewards get screwed up
    // function toggleBunni3rdPartyOLITClaimer(address _claimer) public onlyByOwnGov {
    //     minter.toggle_approve_mint(_claimer);
    // }


    // frxETH pricing
    // ----------------------------------------
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

        // Balancer frxETH-pxETH Gauge
        // ============================================
        {
            // Get the pool ID
            bytes32 _poolId = lp_tkn.getPoolId();

            // Get the balances of each token in the pool
            ( , uint256[] memory balances, ) = vault.getPoolTokens(_poolId);
            uint256 frxETH_in_pool = balances[1];
            uint256 frxETH_usd_value_e36 = (1e10) * (frxETH_in_pool * uint256(getLatestETHPriceE8()));

            // Calculate the frxETH value per "actual" LP
            frax_per_lp_token = (frxETH_usd_value_e36) / lp_tkn.getActualSupply();
        }

        // Bunni FRAX/USDC Gauge
        // ============================================
        // {
        //     // Get the BunniKey so you can query the lens
        //     IBunniLens.BunniKey memory bkey = IBunniLens.BunniKey({
        //         pool: univ3_pool,
        //         tickLower: lp_tkn.tickLower(),
        //         tickUpper: lp_tkn.tickUpper()
        //     });
        //     (, uint256 amt0, uint256 amt1) = lens.pricePerFullShare(bkey);

        //     // Calc FRAX per LP
        //     if (frax_is_token0) frax_per_lp_token = amt0;
        //     else frax_per_lp_token = amt1;
        // }

    }
}
