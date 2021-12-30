// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

import "./AggregatorV3Interface.sol";

contract ChainlinkFXSUSDPriceConsumer {

    AggregatorV3Interface internal priceFeed;


    constructor () public {
        priceFeed = AggregatorV3Interface(0x6Ebc52C8C1089be9eB3945C4350B68B8E4C2233f);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        
        return price;
    }

    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }
}