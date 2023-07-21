//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract Fraxauction {
   Auction[] public auctions;
   struct Auction {
      address owner;
      address buyToken;
      address sellToken;
      uint sellAmount;
      uint pricePrecision;
      uint startPrice;
      uint endPrice;
      uint startTime;
      uint endTime;
      uint soldAmount;
      uint earnings;
      bool exited;
   }
   
   constructor() {
   }

   function createAuction(address _buyToken, address _sellToken, uint _sellAmount, uint _pricePrecision, uint _startPrice, uint _endPrice, uint _duration) external {
      if (_startPrice<_endPrice) revert("Wrong price");
      TransferHelper.safeTransferFrom(_sellToken, msg.sender, address(this), _sellAmount);
      auctions.push(Auction(msg.sender,_buyToken, _sellToken, _sellAmount, _pricePrecision, _startPrice, _endPrice, block.timestamp, block.timestamp+_duration,0,0,false));
   }
   
   function buy(uint _auctionNo, uint _amountIn, uint _maxPrice) external returns (uint _in, uint _out){
      Auction memory auction = auctions[_auctionNo];
      if (auction.endTime<block.timestamp || auction.exited) revert("Auction ended");
      uint price = auction.startPrice-(auction.startPrice-auction.endPrice)*(block.timestamp-auction.startTime)/(auction.endTime-auction.startTime);
      if (price>_maxPrice) revert("maxPrice");
      uint amountOut = _amountIn*auction.pricePrecision/price;
      if (auction.soldAmount+amountOut>auction.sellAmount) {
         amountOut = auction.sellAmount-auction.soldAmount;
         _amountIn = _amountIn*price/auction.pricePrecision;
      }
      
      auctions[_auctionNo].soldAmount+=amountOut;
      auctions[_auctionNo].earnings+=_amountIn;
      
      TransferHelper.safeTransferFrom(auction.buyToken, msg.sender, address(this), _amountIn);
      TransferHelper.safeTransfer(auction.sellToken, msg.sender, amountOut);
      return (_amountIn,amountOut);
   }
   
   function exit(uint _auctionNo) external {
      Auction memory auction = auctions[_auctionNo];
      if (auction.owner!=msg.sender) revert("Not owner");
      if (auction.exited) revert("Already exited");
      
      auctions[_auctionNo].exited=true;
      
      TransferHelper.safeTransferFrom(auction.buyToken, msg.sender, address(this), auction.earnings);
      TransferHelper.safeTransfer(auction.sellToken, msg.sender, auction.sellAmount-auction.soldAmount);
   }
}
