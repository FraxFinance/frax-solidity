// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= FRAXOracleWrapper =========================
// ====================================================================
// The Frax.sol contract needs an oracle with a specific ABI, so this is a
// 'middleman' one that lets it read Chainlink data.

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "./AggregatorV3Interface.sol";
import "../Staking/Owned.sol";

contract FRAXOracleWrapper is Owned {
    using SafeMath for uint256;

    AggregatorV3Interface private priceFeedFRAXETH;

    uint256 public chainlink_frax_eth_decimals;

    uint256 public PRICE_PRECISION = 1e6;
    uint256 public EXTRA_PRECISION = 1e6;
    address public timelock_address;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _timelock_address
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;

        // FRAX / ETH
        priceFeedFRAXETH = AggregatorV3Interface(0x14d04Fff8D21bd62987a5cE9ce543d2F1edF5D3E);
        chainlink_frax_eth_decimals = priceFeedFRAXETH.decimals();
    }

    /* ========== VIEWS ========== */

    function getFRAXPrice() public view returns (uint256 raw_price, uint256 precise_price) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFRAXETH.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        
        // E6
        raw_price = uint256(price).mul(PRICE_PRECISION).div(uint256(10) ** chainlink_frax_eth_decimals);

        // E12
        precise_price = uint256(price).mul(PRICE_PRECISION).mul(EXTRA_PRECISION).div(uint256(10) ** chainlink_frax_eth_decimals);
    }

    // Override the logic of the FRAX-WETH Uniswap TWAP Oracle
    // Expected Parameters: weth address, uint256 1e6
    // Returns: FRAX-WETH Chainlink price (with 1e6 precision)
    function consult(address token, uint amountIn) external view returns (uint amountOut) {
        // safety checks (replacing regular FRAX-WETH oracle in FRAX.sol)
        require(token == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, "must use weth address");
        require(amountIn == 1e6, "must call with 1e6");

        // needs to return it inverted
        (, uint256 frax_precise_price) = getFRAXPrice(); 
        return PRICE_PRECISION.mul(PRICE_PRECISION).mul(EXTRA_PRECISION).div(frax_precise_price);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setChainlinkFRAXETHOracle(address _chainlink_frax_eth_oracle) external onlyByOwnGov {
        priceFeedFRAXETH = AggregatorV3Interface(_chainlink_frax_eth_oracle);
        chainlink_frax_eth_decimals = priceFeedFRAXETH.decimals();
    }

}