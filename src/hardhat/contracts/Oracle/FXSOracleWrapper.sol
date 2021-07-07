// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

import "../Math/SafeMath.sol";
import "./ChainlinkFXSUSDPriceConsumer.sol";
import "./ChainlinkETHUSDPriceConsumer.sol";
import "../Staking/Owned.sol";

contract FXSOracleWrapper is Owned {
    using SafeMath for uint256;

    ChainlinkFXSUSDPriceConsumer public chainlink_fxs_oracle;
    ChainlinkETHUSDPriceConsumer public chainlink_eth_oracle; // needed to invert the oracle prices in frax contract
    uint256 public chainlink_fxs_oracle_decimals;
    uint256 public chainlink_eth_oracle_decimals;
    uint256 public PRICE_PRECISION = 1e6;
    address public timelock_address;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _creator_address,
        address _timelock_address
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;
    }

    /* ========== VIEWS ========== */

    function getFXSPrice() public view returns (uint256) {
        return uint256(chainlink_fxs_oracle.getLatestPrice()).mul(PRICE_PRECISION).div(10 ** chainlink_fxs_oracle_decimals);
    }

    function getETHPrice() public view returns (uint256) {
        return uint256(chainlink_eth_oracle.getLatestPrice()).mul(PRICE_PRECISION).div(10 ** chainlink_eth_oracle_decimals);
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

    function setChainlinkFXSOracle(address _chainlink_fxs_oracle) external onlyByOwnerOrGovernance {
        chainlink_fxs_oracle = ChainlinkFXSUSDPriceConsumer(_chainlink_fxs_oracle);
        chainlink_fxs_oracle_decimals = uint256(chainlink_fxs_oracle.getDecimals());
    }

    function setChainlinkETHOracle(address _chainlink_eth_oracle) external onlyByOwnerOrGovernance {
        chainlink_eth_oracle = ChainlinkETHUSDPriceConsumer(_chainlink_eth_oracle);
        chainlink_eth_oracle_decimals = uint256(chainlink_eth_oracle.getDecimals());
    }
}