//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "./interface/IPriceOracle.sol";

contract DummyPriceOracle is IPriceOracle {
   bool isBadData;
   uint256 priceLow;
   uint256 priceHigh;
   function getPrices() external view returns (bool _isBadData, uint256 _priceLow, uint256 _priceHigh) {
      _isBadData = isBadData;
      _priceLow = priceLow;
      _priceHigh = priceHigh;
   }
   
   function setPrices(bool _isBadData, uint256 _priceLow, uint256 _priceHigh) external {
      isBadData = _isBadData;
      priceLow = _priceLow;
      priceHigh = _priceHigh;
   }   
}

