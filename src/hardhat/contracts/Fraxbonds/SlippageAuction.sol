// SPDX-License-Identifier: Unilicense
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= SlippageAuction ==========================
// ====================================================================
// Slippage auction to sell tokens over time. 
// It has 3 parameters:
// - amount to auction 
// - slippage per token bought
// - price decrease per day. 
// For this we can calculate the time the auction will operate at the market price. 
// Example:
// - We auction 10M
// - We pick a slippage such that a 100k buy will result in 0.1% slippage
// => 10M = 100x100k, so total price impact during the auction will be 20% (price impact is twice the slippage)
// - We lower the price 1% per day
// => the auction will be at the market price for at least 20 days.

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Drake Evans: https://github.com/DrakeEvans
// Sam Kazemian: https://github.com/samkazemian

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract SlippageAuction {

   // ==============================================================================
   // Storage
   // ==============================================================================

   /// @notice Slippage precision
   uint128 constant PRECISION = 1e18;
   
   /// @notice Stored information about ongoing auctions
   Auction[] public auctions;


   // ==============================================================================
   // Structs
   // ==============================================================================

   /// @notice Auction information
   /// @param owner Owner / creator of the auction
   /// @param buyToken The token used to buy the sellToken being auctioned off
   /// @param sellToken The token being auctioned off
   /// @param priceDecay Price decay, per day, using PRECISION
   /// @param priceSlippage Slippage fraction. E.g (0.01 * PRECISION) = 1%
   /// @param amountLeft Amount of sellToken remaining to buy
   /// @param amountOut Amount to sellToken already bought
   /// @param lastPrice Price of the last sale, in buyToken amt per sellToken
   /// @param lastBuyTime Time of the last sale
   /// @param exited If the auction ended
   struct Auction {
      address owner;
      address buyToken;
      address sellToken;
      uint128 priceDecay;
      uint128 priceSlippage;
      uint128 amountLeft;
      uint128 amountOut;
      uint128 lastPrice;
      uint32 lastBuyTime;
      bool exited;
   }


   // ==============================================================================
   // Constructor
   // ==============================================================================
   
   constructor() {

   }

   // ==============================================================================
   // Public Functions
   // ==============================================================================

   /// @notice Creates a new auction
   /// @param _buyToken The token used to buy the sellToken being auctioned off
   /// @param _sellToken The token being auctioned off
   /// @param _sellAmount Amount of sellToken being sold
   /// @param _startPrice Starting price of the sellToken, in buyToken
   /// @param _priceDecay Price decay, per day, using PRECISION
   /// @param _priceSlippage Slippage fraction. E.g (0.01 * PRECISION) = 1%
   function createAuction(address _buyToken, address _sellToken, uint128 _sellAmount, uint128 _startPrice, uint128 _priceDecay, uint128 _priceSlippage) external returns (uint _auctionNo) {
      // Take the sellTokens from the sender
      TransferHelper.safeTransferFrom(_sellToken, msg.sender, address(this), _sellAmount);

      // Create the auction
      _auctionNo = auctions.length;
      auctions.push(Auction(
         msg.sender,
         _buyToken,
         _sellToken,
         _priceDecay,
         _priceSlippage,
         _sellAmount,
         0,
         _startPrice,
         uint32(block.timestamp),
         false
      ));
   
      emit AuctionCreated(_auctionNo, _buyToken, _sellToken, _sellAmount, _startPrice, _priceDecay,  _priceSlippage);
   }
   
   /// @notice Buy tokens from an auction
   /// @param _auctionNo Auction ID
   /// @param _amountIn Amount of buyToken in
   /// @param _minAmountOut Minimum amount of sellToken out, otherwise reverts
   function buy(uint _auctionNo, uint128 _amountIn, uint _minAmountOut) external returns (uint128 amountOut) {
      // Get the auction info
      Auction memory auction = auctions[_auctionNo];
      if (auction.exited) revert AuctionAlreadyExited();
      
      // Calculate the sale price (in buyToken per sellToken), factoring in the time decay
      uint128 price = uint128(auction.lastPrice - (auction.priceDecay * (block.timestamp - auction.lastBuyTime)));

      // Calculate the slippage component of the price (in buyToken per sellToken)
      uint128 slippagePerSellTkn = (auction.priceSlippage *_amountIn) / PRECISION;

      // Calculate the output amount of sellToken
      amountOut = uint128((_amountIn * PRECISION) / (price + slippagePerSellTkn));
      if (_minAmountOut > amountOut) revert MinAmountOut(_minAmountOut, amountOut);
      if (amountOut > auction.amountLeft) revert NotEnoughLeftInAuction();
      
      // Update storage
      Auction storage auctionStorage = auctions[_auctionNo];
      auctionStorage.amountLeft -= amountOut;
      auctionStorage.amountOut +=_amountIn;
      auctionStorage.lastPrice = price + (2 * slippagePerSellTkn); // Price impact is twice the slippage
      auctionStorage.lastBuyTime = uint32(block.timestamp);
      
      // Transfer tokens
      TransferHelper.safeTransferFrom(auction.buyToken, msg.sender, address(this), _amountIn);
      TransferHelper.safeTransfer(auction.sellToken, msg.sender, amountOut);

      emit Buy(_auctionNo, auction.buyToken, auction.sellToken, _amountIn, amountOut);

      return amountOut;
   }


   // ==============================================================================
   // Views
   // ==============================================================================

   /// @notice Calculate the amount of sellTokens out for a given auction and buyToken amount
   /// @param _auctionNo Auction ID
   /// @param _amountIn Amount of buyToken in
   /// @return amountOut Minimum amount of sellToken out, otherwise reverts
   function getAmountOut(uint _auctionNo, uint128 _amountIn) external view returns (uint128 amountOut) {
      // Get the auction info
      Auction memory auction = auctions[_auctionNo];
      if (auction.exited) revert AuctionAlreadyExited();

      // Calculate the sale price (in buyToken per sellToken), factoring in the time decay
      uint128 price = uint128(auction.lastPrice - (auction.priceDecay * (block.timestamp - auction.lastBuyTime)));

      // Calculate the slippage component of the price (in buyToken per sellToken)
      uint128 slippage = (auction.priceSlippage * _amountIn) / PRECISION;

      // Calculate the output amount of sellToken
      amountOut = uint128(_amountIn * (PRECISION / (price + slippage)));
      if (amountOut > auction.amountLeft) revert NotEnoughLeftInAuction();
   }

   // ==============================================================================
   // Owner-only Functions
   // ==============================================================================
   
   /// @notice End the auction. Only callable by the auction owner
   /// @param _auctionNo Auction ID
   function exit(uint _auctionNo) external {
      // Get the auction info and perform checks
      Auction memory auction = auctions[_auctionNo];
      if (auction.owner != msg.sender) revert NotAuctionOwner();
      if (auction.exited) revert AuctionAlreadyExited();
      
      // Set the auction as exited
      auctions[_auctionNo].exited = true;
      
      // Return buyToken proceeds from the auction to the sender
      TransferHelper.safeTransfer(auction.buyToken, msg.sender, auction.amountOut);

      // Return any unsold sellToken to the sender
      TransferHelper.safeTransfer(auction.sellToken, msg.sender, auction.amountLeft);

      emit AuctionExited(_auctionNo);
   }

   // ==============================================================================
   // Errors
   // ==============================================================================

   /// @notice If the auction already exited
   error AuctionAlreadyExited();

   /// @notice If the expected amount of output tokens is too low
   /// @param _min_out Minimum out that the user expects
   /// @param _actual_out Actual amount out that would occur
   error MinAmountOut(uint _min_out, uint128 _actual_out);

   /// @notice If msg.sender is not the auction owner
   error NotAuctionOwner();

   /// @notice If there are not enough tokens left to sell in the auction
   error NotEnoughLeftInAuction();


   // ==============================================================================
   // Events
   // ==============================================================================

   /// @dev When an auction is exited by the owner
   event AuctionExited(uint auctionNo);

   /// @dev When someone buys from an auction
   event Buy(uint auctionNo, address buyToken, address sellToken, uint128 amountIn, uint128 amountOut);
   
   /// @dev When an auction is created
   event AuctionCreated(uint auctionNo, address buyToken, address sellToken, uint128 sellAmount, uint128 startPrice, uint128 priceDecay, uint128 priceSlippage);

}
