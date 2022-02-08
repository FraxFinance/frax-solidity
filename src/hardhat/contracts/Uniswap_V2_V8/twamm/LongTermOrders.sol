//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../core/interfaces/IERC20V5.sol";
import "./OrderPool.sol";
import "./ExecVirtualOrders.sol";

///@notice This library handles the state and execution of long term orders. 
library LongTermOrdersLib {
    using OrderPoolLib for OrderPoolLib.OrderPool;

    ///@notice information associated with a long term order
    struct Order {
        uint256 id;
        uint256 expirationBlock;
        uint256 saleRate;
        address owner;
        address sellTokenId;
        address buyTokenId;
    }

    ///@notice structure contains full state related to long term orders
    struct LongTermOrders {

        ///@notice minimum block interval between order expiries
        uint256 orderBlockInterval;

        ///@notice last virtual orders were executed immediately before this block
        uint256 lastVirtualOrderBlock;

        ///@notice token pair being traded in embedded amm
        address tokenA;
        address tokenB;

        ///@notice mapping from token address to pool that is selling that token
        ///we maintain two order pools, one for each token that is tradable in the AMM
        OrderPoolLib.OrderPool OrderPoolA;
        OrderPoolLib.OrderPool OrderPoolB;

        ///@notice incrementing counter for order ids
        uint256 orderId;

        ///@notice mapping from order ids to Orders
        mapping(uint256 => Order) orderMap;
    }

    struct ExecuteVirtualOrdersResult {
        uint112 newReserve0;
        uint112 newReserve1;
        uint newTwammReserve0;
        uint newTwammReserve1;
    }

    ///@notice initialize state
    function initialize(LongTermOrders storage self
    , address tokenA
    , address tokenB
    , uint256 lastVirtualOrderBlock
    , uint256 orderBlockInterval) internal {
        self.tokenA = tokenA;
        self.tokenB = tokenB;
        self.lastVirtualOrderBlock = lastVirtualOrderBlock;
        self.orderBlockInterval = orderBlockInterval;
    }

    ///@notice swap token A for token B. Amount represents total amount being sold, numberOfBlockIntervals determines when order expires
    function longTermSwapFromAToB(LongTermOrders storage self, uint256 amountA, uint256 numberOfBlockIntervals) internal returns (uint256) {
        return performLongTermSwap(self, self.tokenA, self.tokenB, amountA, numberOfBlockIntervals);
    }

    ///@notice swap token B for token A. Amount represents total amount being sold, numberOfBlockIntervals determines when order expires
    function longTermSwapFromBToA(LongTermOrders storage self, uint256 amountB, uint256 numberOfBlockIntervals) internal returns (uint256) {
        return performLongTermSwap(self, self.tokenB, self.tokenA, amountB, numberOfBlockIntervals);
    }

    ///@notice adds long term swap to order pool
    function performLongTermSwap(LongTermOrders storage self, address from, address to, uint256 amount, uint256 numberOfBlockIntervals) private returns (uint256) {
        // make sure to update virtual order state (before calling this function)

        // transfer sale amount to contract
        IERC20V5(from).transferFrom(msg.sender, address(this), amount);

        //determine the selling rate based on number of blocks to expiry and total amount
        uint256 currentBlock = block.number;
        uint256 lastExpiryBlock = currentBlock - (currentBlock % self.orderBlockInterval);
        uint256 orderExpiry = self.orderBlockInterval * (numberOfBlockIntervals + 1) + lastExpiryBlock;
        uint256 sellingRate = amount / (orderExpiry - currentBlock);

        require(sellingRate > 0); // tokenRate cannot be zero

        //add order to correct pool
        OrderPoolLib.OrderPool storage OrderPool = from == self.tokenA ? self.OrderPoolA : self.OrderPoolB;
        // self.OrderPoolMap[from];
        OrderPool.depositOrder(self.orderId, sellingRate, orderExpiry);

        //add to order map
        self.orderMap[self.orderId] = Order(self.orderId, orderExpiry, sellingRate, msg.sender, from, to);
        return self.orderId++;
    }

    ///@notice cancel long term swap, pay out unsold tokens and well as purchased tokens
    function cancelLongTermSwap(LongTermOrders storage self, uint256 orderId) internal returns (address sellToken, uint256 unsoldAmount, address buyToken, uint256 purchasedAmount) {
        // make sure to update virtual order state (before calling this function)

        Order storage order = self.orderMap[orderId];

        OrderPoolLib.OrderPool storage OrderPool = order.sellTokenId == self.tokenA ? self.OrderPoolA : self.OrderPoolB;
        // self.OrderPoolMap[order.sellTokenId];
        (unsoldAmount, purchasedAmount) = OrderPool.cancelOrder(orderId);
        buyToken = order.buyTokenId;
        sellToken = order.sellTokenId;

        require(order.owner == msg.sender && (unsoldAmount > 0 || purchasedAmount > 0));
        //transfer to owner
        IERC20V5(order.buyTokenId).transfer(msg.sender, purchasedAmount);
        IERC20V5(order.sellTokenId).transfer(msg.sender, unsoldAmount);
    }

    ///@notice withdraw proceeds from a long term swap (can be expired or ongoing)
    function withdrawProceedsFromLongTermSwap(LongTermOrders storage self, uint256 orderId) internal returns (address proceedToken, uint256 proceeds) {
        // make sure to update virtual order state (before calling this function)

        Order storage order = self.orderMap[orderId];

        OrderPoolLib.OrderPool storage OrderPool = order.sellTokenId == self.tokenA ? self.OrderPoolA : self.OrderPoolB;
        // self.OrderPoolMap[order.sellTokenId];
        proceeds = OrderPool.withdrawProceeds(orderId);
        proceedToken = order.buyTokenId;

        require(order.owner == msg.sender && proceeds > 0);
        //transfer to owner
        IERC20V5(order.buyTokenId).transfer(msg.sender, proceeds);
    }


    ///@notice executes all virtual orders between current lastVirtualOrderBlock and blockNumber
    //also handles orders that expire at end of final block. This assumes that no orders expire inside the given interval
    function executeVirtualTradesAndOrderExpiries(LongTermOrders storage self, ExecuteVirtualOrdersResult memory reserveResult, uint256 blockNumber) private {

        OrderPoolLib.OrderPool storage OrderPoolA = self.OrderPoolA;
        OrderPoolLib.OrderPool storage OrderPoolB = self.OrderPoolB;

        //amount sold from virtual trades
        uint256 blockNumberIncrement = blockNumber - self.lastVirtualOrderBlock;
        uint256 tokenASellAmount = OrderPoolA.currentSalesRate * blockNumberIncrement;
        uint256 tokenBSellAmount = OrderPoolB.currentSalesRate * blockNumberIncrement;

        //initial amm balance
        // reserveResult.newReserve0
        // reserveResult.newReserve1
        
        //updated balances from sales
        (uint256 tokenAOut, uint256 tokenBOut, uint256 ammEndTokenA, uint256 ammEndTokenB) = ExecVirtualOrdersLib.computeVirtualBalances(reserveResult.newReserve0, reserveResult.newReserve1, tokenASellAmount, tokenBSellAmount);

        //update balances reserves
        reserveResult.newReserve0 = uint112(ammEndTokenA);
        reserveResult.newReserve1 = uint112(ammEndTokenB);
        reserveResult.newTwammReserve0 = reserveResult.newTwammReserve0 + tokenAOut - tokenASellAmount;
        reserveResult.newTwammReserve1 = reserveResult.newTwammReserve1 + tokenBOut - tokenBSellAmount;

        //distribute proceeds to pools
        OrderPoolA.distributePayment(tokenBOut);
        OrderPoolB.distributePayment(tokenAOut);

        //handle orders expiring at end of interval
        OrderPoolA.updateStateFromBlockExpiry(blockNumber);
        OrderPoolB.updateStateFromBlockExpiry(blockNumber);

        //update last virtual trade block
        self.lastVirtualOrderBlock = blockNumber;
    }

    ///@notice executes all virtual orders until current block is reached.
    function executeVirtualOrdersUntilBlock(LongTermOrders storage self, uint256 blockNumber, ExecuteVirtualOrdersResult memory reserveResult) internal {
        uint256 nextExpiryBlock = self.lastVirtualOrderBlock - (self.lastVirtualOrderBlock % self.orderBlockInterval) + self.orderBlockInterval;
        //iterate through blocks eligible for order expiries, moving state forward

        OrderPoolLib.OrderPool storage OrderPoolA = self.OrderPoolA;
        OrderPoolLib.OrderPool storage OrderPoolB = self.OrderPoolB;

        while (nextExpiryBlock < blockNumber) {
            // Optimization for skipping blocks with no expiry
            if (self.OrderPoolA.salesRateEndingPerBlock[nextExpiryBlock] > 0
                || self.OrderPoolB.salesRateEndingPerBlock[nextExpiryBlock] > 0) {
                executeVirtualTradesAndOrderExpiries(self, reserveResult, nextExpiryBlock);
            }
            nextExpiryBlock += self.orderBlockInterval;
        }
        //finally, move state to current block if necessary
        if (self.lastVirtualOrderBlock != blockNumber) {
            executeVirtualTradesAndOrderExpiries(self, reserveResult, blockNumber);
        }
    }

}