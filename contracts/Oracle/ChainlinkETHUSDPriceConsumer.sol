// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract ChainlinkETHUSDPriceConsumer {

    AggregatorV3Interface internal priceFeed;

    /**
     * Network: Kovan
     * Aggregator: ETH/USD
     * Address: 0x9326BFA02ADD2366b30bacB125260Af641031331
     */
    /**
     * Network: Mainnet
     * Aggregator: ETH/USD
     * Address: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
     */

     
    constructor() public {
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int) {
        // (
        //     uint80 roundID, 
        //     int price,
        //     uint startedAt,
        //     uint timeStamp,
        //     uint80 answeredInRound
        // ) = priceFeed.latestRoundData();

        ( ,int price, , uint timeStamp, ) = priceFeed.latestRoundData();

        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");

        // This will return something like 32063000000
        // Divide this by getDecimals to get the "true" price
        // You can can multiply the "true" price by 1e6 to get the frax ecosystem 'price'
        return price;
    }

    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
        // return 8;
    }
}