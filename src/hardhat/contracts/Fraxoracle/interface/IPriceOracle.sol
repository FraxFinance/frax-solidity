//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IPriceOracle {
   function getPrices() external view returns (bool _isBadData, uint256 _priceLow, uint256 _priceHigh);
}

