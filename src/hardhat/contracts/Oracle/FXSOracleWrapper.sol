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
// ========================= FXSOracleWrapper =========================
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

contract FXSOracleWrapper is Owned {
    using SafeMath for uint256;

    AggregatorV3Interface private priceFeedFXSUSD;
    AggregatorV3Interface private priceFeedETHUSD;

    uint256 public chainlink_fxs_usd_decimals;
    uint256 public chainlink_eth_usd_decimals;

    uint256 public PRICE_PRECISION = 1e6;
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

        // FXS/USD
        priceFeedFXSUSD = AggregatorV3Interface(0x6Ebc52C8C1089be9eB3945C4350B68B8E4C2233f);
        chainlink_fxs_usd_decimals = priceFeedFXSUSD.decimals();

        // ETH/USD
        priceFeedETHUSD = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
        chainlink_eth_usd_decimals = priceFeedETHUSD.decimals();
    }

    /* ========== VIEWS ========== */

    function getFXSPrice() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFXSUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return uint256(price).mul(PRICE_PRECISION).div(10 ** chainlink_fxs_usd_decimals);
    }

    function getETHPrice() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedETHUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        
        return uint256(price).mul(PRICE_PRECISION).div(10 ** chainlink_eth_usd_decimals);
    }

    // Override the logic of the FXS-WETH Uniswap TWAP Oracle
    // Expected Parameters: weth address, uint256 1e6
    // Returns: FXS Chainlink price (with 1e6 precision)
    function consult(address token, uint amountIn) external view returns (uint amountOut) {
        // safety checks (replacing regular FXS-WETH oracle in FRAX.sol)
        require(token == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, "must use weth address");
        require(amountIn == 1e6, "must call with 1e6");

        // needs to return it inverted
        return getETHPrice().mul(PRICE_PRECISION).div(getFXSPrice());
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setChainlinkFXSUSDOracle(address _chainlink_fxs_usd_oracle) external onlyByOwnGov {
        priceFeedFXSUSD = AggregatorV3Interface(_chainlink_fxs_usd_oracle);
        chainlink_fxs_usd_decimals = priceFeedFXSUSD.decimals();
    }

    function setChainlinkETHUSDOracle(address _chainlink_eth_usd_oracle) external onlyByOwnGov {
        priceFeedETHUSD = AggregatorV3Interface(_chainlink_eth_usd_oracle);
        chainlink_eth_usd_decimals = priceFeedETHUSD.decimals();
    }
}