// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

import "./AggregatorV3Interface.sol";

contract ChainlinkETHUSDPriceConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor() public {
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }
}
