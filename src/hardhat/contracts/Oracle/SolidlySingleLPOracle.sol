// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =================== SolidlySingleLPOracle ===================
// ====================================================================
// Used to price a single Solidly LP Deposit Token

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

// Solidly
import "../Misc_AMOs/solidly/IBaseV1Pair.sol";

contract SolidlySingleLPOracle is Owned {
    using SafeMath for uint256;
    using HomoraMath for uint256;

    // Core
    address public timelock_address;
    address public bot_address;

    // LP related
    address private lp_token_address;
    IBaseV1Pair public pool;

    // Oracle info
    ComboOracle public combo_oracle;
    
    // Prices
    uint256 public price; // Always stored in E6
    uint256 public last_updated_time;

    // AggregatorV3Interface stuff
    uint8 public decimals; // For Chainlink mocking
    string public description;
    uint256 public version = 1;

    // Precision
    uint256 public PRECISE_PRICE_PRECISION = 1e18;
    uint256 public PRICE_PRECISION = 1e6;
    uint256 public PRICE_MISSING_MULTIPLIER = 1e12;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovBot() {
        require(msg.sender == owner || msg.sender == timelock_address || msg.sender == bot_address, "Not owner, tlck, or bot");
        _;
    }

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

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _lp_token_address,
        address _oracle_address,
        address _timelock_address,
        uint8 _decimals,
        string memory _description
    ) Owned(_creator_address) {
        // Core
        timelock_address = _timelock_address;
        combo_oracle = ComboOracle(_oracle_address);

        // LP related
        lp_token_address = _lp_token_address;
        pool = IBaseV1Pair(_lp_token_address);

        // Chainlink mocking related
        decimals = _decimals;

        description = _description;

        last_updated_time = block.timestamp;
    }

    /* ========== VIEWS ========== */

    // UniV2 / SLP Info
    function uniV2LPBasicInfo() public view returns (UniV2LPBasicInfo memory) {
        // Get the reserves
        (uint256 _reserve0, uint256 _reserve1, ) = (pool.getReserves());

        // Get the token1 address
        address token0 = pool.token0();
        address token1 = pool.token1();

        // Return
        return UniV2LPBasicInfo(
            lp_token_address, // [0]
            pool.name(), // [1]
            pool.symbol(), // [2]
            token0, // [3]
            token1, // [4]
            ERC20(token0).decimals(), // [5]
            ERC20(token1).decimals(), // [6]
            _reserve0, // [7]
            _reserve1, // [8]
            pool.totalSupply() // [9]
        );
    }

    // UniV2 / SLP LP Token Price
    // Alpha Homora Fair LP Pricing Method (flash loan resistant)
    // https://cmichel.io/pricing-lp-tokens/
    // https://blog.alphafinance.io/fair-lp-token-pricing/
    // https://github.com/AlphaFinanceLab/alpha-homora-v2-contract/blob/master/contracts/oracle/UniswapV2Oracle.sol
    function uniV2LPPriceInfo() public view returns (UniV2PriceInfo memory) {
        // Get info about the LP token
        UniV2LPBasicInfo memory lp_basic_info = uniV2LPBasicInfo();

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

    // In E18
    function getPrecisePrice() public view returns (uint256) {
        // Get the price info
        UniV2PriceInfo memory the_info = uniV2LPPriceInfo();

        return the_info.precise_price;
    }

    // In E6
    function getPrice() public view returns (uint256) {
        // Get the price info
        UniV2PriceInfo memory the_info = uniV2LPPriceInfo();

        return the_info.short_price;
    }

    // AggregatorV3Interface / Chainlink compatibility
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (0, int256(getPrecisePrice()), 0, block.timestamp, 0);
    }


    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    function setComboOracle(address _combo_oracle) external onlyByOwnGov {
        combo_oracle = ComboOracle(_combo_oracle);
    }
}