//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "hardhat/console.sol";
import "./Fraxoracle.sol";

contract FraxoraclePriceSource {
   Fraxoracle immutable public fraxoracle;
   IPriceOracle immutable public priceOracle;
   constructor(Fraxoracle _fraxoracle, IPriceOracle _priceOracle) {
      fraxoracle=_fraxoracle;
      priceOracle=_priceOracle;
   }
   
   function addRoundData() external {
      (bool _isBadData, uint256 _priceLow, uint256 _priceHigh) = priceOracle.getPrices();
      fraxoracle.addRoundData(_isBadData, _priceLow, _priceHigh, uint32(block.timestamp));
   }
}

