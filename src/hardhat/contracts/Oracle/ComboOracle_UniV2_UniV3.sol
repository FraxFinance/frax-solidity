// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ===================== ComboOracle_UniV2_UniV3 ======================
// ====================================================================
// Aggregates prices for SLP, UniV2, and UniV3 style LP tokens

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "./AggregatorV3Interface.sol";
import "./IPricePerShareOptions.sol";
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";
import '../Math/HomoraMath.sol';

// ComboOracle
import "../Oracle/ComboOracle.sol";

// UniV2 / SLP
import "../Uniswap/Interfaces/IUniswapV2Pair.sol";
import "../Uniswap/Interfaces/IUniswapV2Router02.sol";

// UniV3
import "../Uniswap_V3/IUniswapV3Factory.sol";
import "../Uniswap_V3/libraries/TickMath.sol";
import "../Uniswap_V3/libraries/LiquidityAmounts.sol";
import "../Uniswap_V3/periphery/interfaces/INonfungiblePositionManager.sol";
import "../Uniswap_V3/IUniswapV3Pool.sol";
import "../Uniswap_V3/ISwapRouter.sol";

contract ComboOracle_UniV2_UniV3 is Owned {
    using SafeMath for uint256;
    using HomoraMath for uint256;
    
    /* ========== STATE VARIABLES ========== */
    
    // Core addresses
    address timelock_address;
    address public frax_address;
    address public fxs_address;

    // Oracle info
    ComboOracle public combo_oracle;

    // UniV2 / SLP
    IUniswapV2Router02 public router;

    // UniV3
    IUniswapV3Factory public univ3_factory;
    INonfungiblePositionManager public univ3_positions;
    ISwapRouter public univ3_router;

    // Precision
    uint256 public PRECISE_PRICE_PRECISION = 1e18;
    uint256 public PRICE_PRECISION = 1e6;
    uint256 public PRICE_MISSING_MULTIPLIER = 1e12;

    /* ========== STRUCTS ========== */

    // ------------ UniV2 ------------

    struct UniV2LPBasicInfo {
        address lp_address;
        string token_name;
        string token_symbol;
        address token0;
        address token1;
        uint256 token0_decimals;
        uint256 token1_decimals;
        uint256 token0_reserves;
        uint256 token1_reserves;
        uint256 lp_total_supply;
    }

    struct UniV2PriceInfo {
        uint256 precise_price; 
        uint256 short_price; 
        string token_symbol;
        string token_name;
        string token0_symbol;
        string token1_symbol;
    }

    // ------------ UniV3 ------------

    struct UniV3NFTBasicInfo {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint256 token0_decimals; 
        uint256 token1_decimals; 
        uint256 lowest_decimals; 
    }

    struct UniV3NFTValueInfo {
        uint256 token0_value;
        uint256 token1_value;
        uint256 total_value;
        string token0_symbol;
        string token1_symbol;
        uint256 liquidity_price;
    }
    
    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        address[] memory _starting_addresses
    ) Owned(_owner_address) {

        // Core addresses
        frax_address = _starting_addresses[0];
        fxs_address = _starting_addresses[1];

        // Oracle info
        combo_oracle = ComboOracle(_starting_addresses[2]);

        // UniV2 / SLP
        router = IUniswapV2Router02(_starting_addresses[3]);

        // UniV3
        univ3_factory = IUniswapV3Factory(_starting_addresses[4]);
        univ3_positions = INonfungiblePositionManager(_starting_addresses[5]);
        univ3_router = ISwapRouter(_starting_addresses[6]);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "You are not an owner or the governance timelock");
        _;
    }

    /* ========== VIEWS ========== */

    // UniV2 / SLP Info
    function uniV2LPBasicInfo(address pair_address) public view returns (UniV2LPBasicInfo memory) {
        // Instantiate the pair
        IUniswapV2Pair the_pair = IUniswapV2Pair(pair_address);

        // Get the reserves
        (uint256 reserve0, uint256 reserve1, ) = (the_pair.getReserves());

        // Get the token1 address
        address token0 = the_pair.token0();
        address token1 = the_pair.token1();

        // Return
        return UniV2LPBasicInfo(
            pair_address, // [0]
            the_pair.name(), // [1]
            the_pair.symbol(), // [2]
            token0, // [3]
            token1, // [4]
            ERC20(token0).decimals(), // [5]
            ERC20(token1).decimals(), // [6]
            reserve0, // [7]
            reserve1, // [8]
            the_pair.totalSupply() // [9]
        );
    }

    // UniV2 / SLP LP Token Price
    // Alpha Homora Fair LP Pricing Method (flash loan resistant)
    // https://cmichel.io/pricing-lp-tokens/
    // https://blog.alphafinance.io/fair-lp-token-pricing/
    // https://github.com/AlphaFinanceLab/alpha-homora-v2-contract/blob/master/contracts/oracle/UniswapV2Oracle.sol
    function uniV2LPPriceInfo(address lp_token_address) public view returns (UniV2PriceInfo memory) {
        // Get info about the LP token
        UniV2LPBasicInfo memory lp_basic_info = uniV2LPBasicInfo(lp_token_address);

        // Get the price of ETH in USD
        uint256 eth_price = combo_oracle.getETHPricePrecise();

        // Alpha Homora method
        uint256 precise_price;
        {
            uint sqrtK = HomoraMath.sqrt(lp_basic_info.token0_reserves * lp_basic_info.token1_reserves).fdiv(lp_basic_info.lp_total_supply); // in 2**112
            uint px0 = combo_oracle.getETHPx112(lp_basic_info.token0); // in 2**112
            uint px1 = combo_oracle.getETHPx112(lp_basic_info.token1); // in 2**112
            // fair token0 amt: sqrtK * sqrt(px1/px0)
            // fair token1 amt: sqrtK * sqrt(px0/px1)
            // fair lp price = 2 * sqrt(px0 * px1)
            // split into 2 sqrts multiplication to prevent uint overflow (note the 2**112)

            // In ETH per unit of LP, multiplied by 2**112.
            uint256 precise_price_eth112 = (((sqrtK * 2 * HomoraMath.sqrt(px0)) / (2 ** 56)) * HomoraMath.sqrt(px1)) / (2 ** 56);


            // In USD
            // Split into 2 parts to avoid overflows
            uint256 precise_price56 = precise_price_eth112 / (2 ** 56); 
            precise_price = (precise_price56 * eth_price) / (2 ** 56);
        }

        return UniV2PriceInfo(
            precise_price, // [0]
            precise_price / PRICE_MISSING_MULTIPLIER, // [1]
            lp_basic_info.token_symbol, // [2]
            lp_basic_info.token_name, // [3]
            ERC20(lp_basic_info.token0).symbol(), // [4]
            ERC20(lp_basic_info.token1).symbol() // [5]
        );
    }

    // UniV2 / SLP LP Token Price
    // Reserves method
    function uniV2LPPriceInfoViaReserves(address lp_token_address) public view returns (UniV2PriceInfo memory) {
        // Get info about the LP token
        UniV2LPBasicInfo memory lp_basic_info = uniV2LPBasicInfo(lp_token_address);

        // Get the price of one of the tokens. Try token0 first.
        // After that, multiply the price by the reserves, then scale to E18
        // Then multiply by 2 since both sides are equal dollar value
        // Then divide the the total number of LP tokens
        uint256 precise_price;
        if (combo_oracle.has_info(lp_basic_info.token0)){
            (uint256 token_precise_price, , ) = combo_oracle.getTokenPrice(lp_basic_info.token0);

            // Multiply by 2 because each token is half of the TVL
            precise_price = (2 * token_precise_price * lp_basic_info.token0_reserves) / lp_basic_info.lp_total_supply;

            // Scale to E18
            precise_price *= (10 ** (uint(18) - lp_basic_info.token0_decimals));
        }
        else {
            (uint256 token_precise_price, , ) = combo_oracle.getTokenPrice(lp_basic_info.token1);
            
            // Multiply by 2 because each token is half of the TVL
            precise_price = (2 * token_precise_price * lp_basic_info.token1_reserves) / lp_basic_info.lp_total_supply;

            // Scale to E18
            precise_price *= (10 ** (uint(18) - lp_basic_info.token1_decimals));
        }

        return UniV2PriceInfo(
            precise_price, // [0]
            precise_price / PRICE_MISSING_MULTIPLIER, // [1]
            lp_basic_info.token_symbol, // [2]
            lp_basic_info.token_name, // [3]
            ERC20(lp_basic_info.token0).symbol(), // [4]
            ERC20(lp_basic_info.token1).symbol() // [5]
        );
    }

    function getUniV3NFTBasicInfo(uint256 token_id) public view returns (UniV3NFTBasicInfo memory) {
        // Get the position information
        (
            , // [0]
            , // [1]
            address token0, // [2]
            address token1, // [3]
            uint24 fee, // [4]
            int24 tickLower, // [5]
            int24 tickUpper, // [6]
            uint128 liquidity, // [7]
            , // [8]
            , // [9]
            , // [10]
            // [11]
        ) = univ3_positions.positions(token_id);

        // Get decimals
        uint256 tkn0_dec = ERC20(token0).decimals();
        uint256 tkn1_dec = ERC20(token1).decimals();

        return UniV3NFTBasicInfo(
            token0, // [0]
            token1, // [1]
            fee, // [2]
            tickLower, // [3]
            tickUpper, // [4]
            liquidity, // [5]
            tkn0_dec,  // [6]
            tkn1_dec,  // [7]
            (tkn0_dec < tkn1_dec) ? tkn0_dec : tkn1_dec // [8]
        );
    }

    // Get stats about a particular UniV3 NFT
    function getUniV3NFTValueInfo(uint256 token_id) public view returns (UniV3NFTValueInfo memory) {
        UniV3NFTBasicInfo memory lp_basic_info = getUniV3NFTBasicInfo(token_id);

        // Get pool price info
        uint160 sqrtPriceX96;
        {
            address pool_address = univ3_factory.getPool(lp_basic_info.token0, lp_basic_info.token1, lp_basic_info.fee);
            IUniswapV3Pool the_pool = IUniswapV3Pool(pool_address);
            (sqrtPriceX96, , , , , , ) = the_pool.slot0();
        }

        // Tick math
        uint256 token0_val_usd = 0;
        uint256 token1_val_usd = 0; 
        {
            // Get the amount of each underlying token in each NFT
            uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(lp_basic_info.tickLower);
            uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(lp_basic_info.tickUpper);

            // Get amount of each token for 0.1% liquidity movement in each direction (1 per mille)
            uint256 liq_pricing_divisor = (10 ** lp_basic_info.lowest_decimals);
            (uint256 token0_1pm_amt, uint256 token1_1pm_amt) = LiquidityAmounts.getAmountsForLiquidity(sqrtPriceX96, sqrtRatioAX96, sqrtRatioBX96, uint128(lp_basic_info.liquidity / liq_pricing_divisor));

            // Get missing decimals
            uint256 token0_miss_dec_mult = 10 ** (uint(18) - lp_basic_info.token0_decimals);
            uint256 token1_miss_dec_mult = 10 ** (uint(18) - lp_basic_info.token1_decimals);

            // Get token prices
            // Will revert if ComboOracle doesn't have a price for both token0 and token1
            (uint256 token0_precise_price, , ) = combo_oracle.getTokenPrice(lp_basic_info.token0);
            (uint256 token1_precise_price, , ) = combo_oracle.getTokenPrice(lp_basic_info.token1);

            // Get the value of each portion
            // Multiply by liq_pricing_divisor as well
            token0_val_usd = (token0_1pm_amt * liq_pricing_divisor * token0_precise_price * token0_miss_dec_mult) / PRECISE_PRICE_PRECISION;
            token1_val_usd = (token1_1pm_amt * liq_pricing_divisor * token1_precise_price * token1_miss_dec_mult) / PRECISE_PRICE_PRECISION;
        }

        // Return the total value of the UniV3 NFT
        uint256 nft_ttl_val = (token0_val_usd + token1_val_usd);

        // Return
        return UniV3NFTValueInfo(
            token0_val_usd,
            token1_val_usd,
            nft_ttl_val,
            ERC20(lp_basic_info.token0).symbol(),
            ERC20(lp_basic_info.token1).symbol(),
            (uint256(lp_basic_info.liquidity) * PRECISE_PRICE_PRECISION) / nft_ttl_val
        );
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address _timelock_address) external onlyByOwnGov {
        timelock_address = _timelock_address;
    }

    function setComboOracle(address _combo_oracle) external onlyByOwnGov {
        combo_oracle = ComboOracle(_combo_oracle);
    }
}
