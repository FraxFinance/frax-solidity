//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interface/IPriceOracle.sol";
import "hardhat/console.sol";

contract Fraxoracle is AggregatorV3Interface,IPriceOracle {
   RoundData[] public roundData;
   uint8 immutable DECIMALS;
   string DESCRIPTION;
   uint immutable VERSION;
   uint immutable MAX_DELAY;
   uint immutable MAX_DEVIATION;
   uint80 public lastCorrectRoundId;
   address public timelock;
   address public priceSource;
   
   struct RoundData {
      uint256 priceLow;
      uint256 priceHigh;
      uint32 timestamp;
      bool isBadData;
   }
   
   constructor(uint8 _DECIMALS, string memory _DESCRIPTION, uint256 _VERSION, uint _MAX_DELAY, uint _MAX_DEVIATION) {
      timelock = msg.sender;
      DECIMALS = _DECIMALS;
      DESCRIPTION = _DESCRIPTION;
      VERSION = _VERSION;
      MAX_DELAY = _MAX_DELAY;
      MAX_DEVIATION = _MAX_DEVIATION;
   }
   
   function decimals() external view returns (uint8) {
      return DECIMALS;
   }

   function description() external view returns (string memory) {
      return DESCRIPTION;
   }

   function version() external view returns (uint256) {
      return VERSION;
   }

   function getRoundData(uint80 _roundId) public view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
      RoundData memory data = roundData[roundId];
      roundId = answeredInRound = _roundId;
      answer = int256((data.priceHigh+data.priceLow)/2);
      startedAt = updatedAt = data.timestamp;
   }

   function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
      return getRoundData(lastCorrectRoundId);
   }
   
   function getPrices() external view returns (bool _isBadData, uint256 _priceLow, uint256 _priceHigh) {
      RoundData memory data = roundData[roundData.length-1];
      _isBadData = data.isBadData || data.timestamp+MAX_DELAY<block.timestamp;
      _priceLow = data.priceLow;
      _priceHigh = data.priceHigh;
   }
   
   function addRoundData(bool _isBadData, uint256 _priceLow, uint256 _priceHigh, uint32 _timestamp) external {
      console.log("_timestamp",_timestamp);
      _requirePriceSource();
      if (_timestamp>block.timestamp) revert("Too soon");
      if (roundData.length>0 && _timestamp<=roundData[roundData.length-1].timestamp) revert("Too late");
      
      if (!_isBadData && (1E18*(_priceHigh-_priceLow))/_priceHigh<MAX_DEVIATION) lastCorrectRoundId=uint80(roundData.length);
      roundData.push(RoundData(_priceLow,_priceHigh,_timestamp,_isBadData));
      
   }
   
   // PriceSource
   function setPriceSource(address newPriceSource) external {
      _requireTimelock();
      priceSource = newPriceSource;
   }
   function _requirePriceSource() internal view {
      if (msg.sender!=priceSource) revert("Not priceSource");
   }
   function _requireTimelock() internal view {
      if (msg.sender!=timelock) revert("Not timelock");
   }
}

