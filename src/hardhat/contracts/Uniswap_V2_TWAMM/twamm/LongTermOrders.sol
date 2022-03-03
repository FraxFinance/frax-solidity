//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ExecVirtualOrders.sol";

///@notice This library handles the state and execution of long term orders. 
library LongTermOrdersLib {

    using LongTermOrdersLib for OrderPool;

    /// ---------------------------
    /// ----- LongTerm Orders -----
    /// ---------------------------

    uint112 internal constant SELL_RATE_ADDITIONAL_PRECISION = 1000000;

    ///@notice information associated with a long term order
    ///fields should NOT be changed after Order struct is created
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

        ///@notice minimum time interval between order expiries
        uint256 orderTimeInterval;

        ///@notice last virtual orders were executed immediately before this block.timestamp
        uint256 lastVirtualOrderTimestamp;

        ///@notice token pair being traded in embedded amm
        address token0;
        address token1;

        ///@notice mapping from token address to pool that is selling that token
        ///we maintain two order pools, one for each token that is tradable in the AMM
        OrderPool OrderPool0;
        OrderPool OrderPool1;

        ///@notice incrementing counter for order ids, this is the next order id
        uint256 orderId;

        ///@notice mapping from order ids to Orders
        mapping(uint256 => Order) orderMap;
    }

    struct ExecuteVirtualOrdersResult {
        uint112 newReserve0;
        uint112 newReserve1;
        uint256 newTwammReserve0;
        uint256 newTwammReserve1;
    }

    ///@notice initialize state
    function initialize(LongTermOrders storage longTermOrders,
        address token0,
        address token1,
        uint256 lastVirtualOrderTimestamp,
        uint256 orderTimeInterval) internal {
        longTermOrders.token0 = token0;
        longTermOrders.token1 = token1;
        longTermOrders.lastVirtualOrderTimestamp = lastVirtualOrderTimestamp;
        longTermOrders.orderTimeInterval = orderTimeInterval;
    }

    ///@notice get the OrderPool for this token
    function getOrderPool(LongTermOrders storage longTermOrders, address token) internal view returns (OrderPool storage orderPool) {
        orderPool = token == longTermOrders.token0 ? longTermOrders.OrderPool0 : longTermOrders.OrderPool1;
    }

    ///@notice swap token 0 for token 1. Amount represents total amount being sold, numberOfBlockIntervals determines when order expires
    function longTermSwapFrom0To1(LongTermOrders storage longTermOrders, uint256 amount0, uint256 numberOfTimeIntervals) internal returns (uint256) {
        return performLongTermSwap(longTermOrders, longTermOrders.token0, longTermOrders.token1, amount0, numberOfTimeIntervals);
    }

    ///@notice swap token 1 for token 0. Amount represents total amount being sold, numberOfBlockIntervals determines when order expires
    function longTermSwapFrom1To0(LongTermOrders storage longTermOrders, uint256 amount1, uint256 numberOfTimeIntervals) internal returns (uint256) {
        return performLongTermSwap(longTermOrders, longTermOrders.token1, longTermOrders.token0, amount1, numberOfTimeIntervals);
    }

    ///@notice adds long term swap to order pool
    function performLongTermSwap(LongTermOrders storage longTermOrders, address from, address to, uint256 amount, uint256 numberOfTimeIntervals) private returns (uint256) {
        // make sure to update virtual order state (before calling this function)

        //determine the selling rate based on number of blocks to expiry and total amount
        uint256 currentTime = block.timestamp;
        uint256 lastExpiryBlock = currentTime - (currentTime % longTermOrders.orderTimeInterval);
        uint256 orderExpiry = longTermOrders.orderTimeInterval * (numberOfTimeIntervals + 1) + lastExpiryBlock;
        uint256 sellingRate = SELL_RATE_ADDITIONAL_PRECISION * amount / (orderExpiry - currentTime);

        require(sellingRate > 0); // tokenRate cannot be zero

        //add order to correct pool
        OrderPool storage orderPool = getOrderPool(longTermOrders, from);
        orderPoolDepositOrder(orderPool, longTermOrders.orderId, sellingRate, orderExpiry);

        //add to order map
        longTermOrders.orderMap[longTermOrders.orderId] = Order(longTermOrders.orderId, orderExpiry, sellingRate, msg.sender, from, to);
        return longTermOrders.orderId++;
    }

    ///@notice cancel long term swap, pay out unsold tokens and well as purchased tokens
    function cancelLongTermSwap(LongTermOrders storage longTermOrders, uint256 orderId) internal returns (address sellToken, uint256 unsoldAmount, address buyToken, uint256 purchasedAmount) {
        // make sure to update virtual order state (before calling this function)

        Order storage order = longTermOrders.orderMap[orderId];
        buyToken = order.buyTokenId;
        sellToken = order.sellTokenId;

        OrderPool storage orderPool = getOrderPool(longTermOrders, sellToken);
        (unsoldAmount, purchasedAmount) = orderPoolCancelOrder(orderPool, orderId, longTermOrders.lastVirtualOrderTimestamp);

        require(order.owner == msg.sender && (unsoldAmount > 0 || purchasedAmount > 0)); // owner and amounts check
    }

    ///@notice withdraw proceeds from a long term swap (can be expired or ongoing)
    function withdrawProceedsFromLongTermSwap(LongTermOrders storage longTermOrders, uint256 orderId) internal returns (address proceedToken, uint256 proceeds) {
        // make sure to update virtual order state (before calling this function)

        Order storage order = longTermOrders.orderMap[orderId];
        proceedToken = order.buyTokenId;

        OrderPool storage orderPool = getOrderPool(longTermOrders, order.sellTokenId);
        proceeds = orderPoolWithdrawProceeds(orderPool, orderId, longTermOrders.lastVirtualOrderTimestamp);

        require(order.owner == msg.sender && proceeds > 0); // owner and amounts check
    }

    ///@notice executes all virtual orders between current lastVirtualOrderTimestamp and blockTimestamp
    //also handles orders that expire at end of final blockTimestamp. This assumes that no orders expire inside the given interval
    function executeVirtualTradesAndOrderExpiries(LongTermOrders storage longTermOrders, ExecuteVirtualOrdersResult memory reserveResult, uint256 blockTimestamp) private {

        OrderPool storage orderPool0 = longTermOrders.OrderPool0;
        OrderPool storage orderPool1 = longTermOrders.OrderPool1;

        //amount sold from virtual trades
        uint256 blockTimestampEllapsed = blockTimestamp - longTermOrders.lastVirtualOrderTimestamp;
        uint256 token0SellAmount = orderPool0.currentSalesRate * blockTimestampEllapsed / SELL_RATE_ADDITIONAL_PRECISION;
        uint256 token1SellAmount = orderPool1.currentSalesRate * blockTimestampEllapsed / SELL_RATE_ADDITIONAL_PRECISION;

        //initial amm balance
        // reserveResult.newReserve0
        // reserveResult.newReserve1

        //updated balances from sales
        (uint256 token0Out, uint256 token1Out, uint256 ammEndToken0, uint256 ammEndToken1) = ExecVirtualOrdersLib.computeVirtualBalances(reserveResult.newReserve0, reserveResult.newReserve1, token0SellAmount, token1SellAmount);

        //update balances reserves
        reserveResult.newReserve0 = uint112(ammEndToken0);
        reserveResult.newReserve1 = uint112(ammEndToken1);
        reserveResult.newTwammReserve0 = reserveResult.newTwammReserve0 + token0Out - token0SellAmount;
        reserveResult.newTwammReserve1 = reserveResult.newTwammReserve1 + token1Out - token1SellAmount;

        //distribute proceeds to pools
        orderPoolDistributePayment(orderPool0, token1Out);
        orderPoolDistributePayment(orderPool1, token0Out);

        //handle orders expiring at end of interval
        orderPoolUpdateStateFromBlockExpiry(orderPool0, blockTimestamp);
        orderPoolUpdateStateFromBlockExpiry(orderPool1, blockTimestamp);

        //update last virtual trade block
        longTermOrders.lastVirtualOrderTimestamp = blockTimestamp;
    }

    ///@notice executes all virtual orders until blockTimestamp is reached.
    function executeVirtualOrdersUntilBlock(LongTermOrders storage longTermOrders, uint256 blockTimestamp, ExecuteVirtualOrdersResult memory reserveResult) internal {
        uint256 nextExpiryBlockTimestamp = longTermOrders.lastVirtualOrderTimestamp - (longTermOrders.lastVirtualOrderTimestamp % longTermOrders.orderTimeInterval) + longTermOrders.orderTimeInterval;
        //iterate through time intervals eligible for order expiries, moving state forward

        OrderPool storage orderPool0 = longTermOrders.OrderPool0;
        OrderPool storage orderPool1 = longTermOrders.OrderPool1;

        while (nextExpiryBlockTimestamp < blockTimestamp) {
            // Optimization for skipping blocks with no expiry
            if (orderPool0.salesRateEndingPerBlock[nextExpiryBlockTimestamp] > 0
                || orderPool1.salesRateEndingPerBlock[nextExpiryBlockTimestamp] > 0) {
                executeVirtualTradesAndOrderExpiries(longTermOrders, reserveResult, nextExpiryBlockTimestamp);
            }
            nextExpiryBlockTimestamp += longTermOrders.orderTimeInterval;
        }
        //finally, move state to current blockTimestamp if necessary
        if (longTermOrders.lastVirtualOrderTimestamp != blockTimestamp) {
            executeVirtualTradesAndOrderExpiries(longTermOrders, reserveResult, blockTimestamp);
        }
    }

    /// ---------------------------
    /// -------- OrderPool --------
    /// ---------------------------

    ///@notice An Order Pool is an abstraction for a pool of long term orders that sells a token at a constant rate to the embedded AMM.
    ///the order pool handles the logic for distributing the proceeds from these sales to the owners of the long term orders through a modified
    ///version of the staking algorithm from  https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf

    uint256 constant Q112 = 2**112;

    ///@notice you can think of this as a staking pool where all long term orders are staked.
    /// The pool is paid when virtual long term orders are executed, and each order is paid proportionally
    /// by the order's sale rate per time intervals
    struct OrderPool {
        ///@notice current rate that tokens are being sold (per time interval)
        uint256 currentSalesRate;

        ///@notice sum of (salesProceeds_k / salesRate_k) over every period k. Stored as a fixed precision floating point number
        uint256 rewardFactor;

        ///@notice this maps time interval numbers to the cumulative sales rate of orders that expire on that block (time interval)
        mapping(uint256 => uint256) salesRateEndingPerBlock;

        ///@notice map order ids to the block timestamp in which they expire
        mapping(uint256 => uint256) orderExpiry;

        ///@notice map order ids to their sales rate
        mapping(uint256 => uint256) salesRate;

        ///@notice reward factor per order at time of submission
        mapping(uint256 => uint256) rewardFactorAtSubmission;

        ///@notice reward factor at a specific time interval
        mapping(uint256 => uint256) rewardFactorAtBlock;
    }

    ///@notice distribute payment amount to pool (in the case of TWAMM, proceeds from trades against amm)
    function orderPoolDistributePayment(OrderPool storage orderPool, uint256 amount) internal {
        if (orderPool.currentSalesRate != 0) {
            unchecked { // Addition is with overflow
                orderPool.rewardFactor += amount * Q112 * SELL_RATE_ADDITIONAL_PRECISION / orderPool.currentSalesRate;
            }
        }
    }

    ///@notice deposit an order into the order pool.
    function orderPoolDepositOrder(OrderPool storage orderPool, uint256 orderId, uint256 amountPerBlock, uint256 orderExpiry) internal {
        orderPool.currentSalesRate += amountPerBlock;
        orderPool.rewardFactorAtSubmission[orderId] = orderPool.rewardFactor;
        orderPool.orderExpiry[orderId] = orderExpiry;
        orderPool.salesRate[orderId] = amountPerBlock;
        orderPool.salesRateEndingPerBlock[orderExpiry] += amountPerBlock;
    }

    ///@notice when orders expire after a given block, we need to update the state of the pool
    function orderPoolUpdateStateFromBlockExpiry(OrderPool storage orderPool, uint256 blockTimestamp) internal {
        orderPool.currentSalesRate -= orderPool.salesRateEndingPerBlock[blockTimestamp];
        orderPool.rewardFactorAtBlock[blockTimestamp] = orderPool.rewardFactor;
    }

    ///@notice cancel order and remove from the order pool
    function orderPoolCancelOrder(OrderPool storage orderPool, uint256 orderId, uint256 blockTimestamp) internal returns (uint256 unsoldAmount, uint256 purchasedAmount) {
        uint256 expiry = orderPool.orderExpiry[orderId];
        require(expiry > blockTimestamp);

        //calculate amount that wasn't sold, and needs to be returned
        uint256 salesRate = orderPool.salesRate[orderId];
        unsoldAmount = (expiry - blockTimestamp) * salesRate / SELL_RATE_ADDITIONAL_PRECISION;

        //calculate amount of other token that was purchased
        unchecked { // subtraction is with underflow
            purchasedAmount = ((orderPool.rewardFactor - orderPool.rewardFactorAtSubmission[orderId]) * salesRate / SELL_RATE_ADDITIONAL_PRECISION) / Q112;
        }

        //update state
        orderPool.currentSalesRate -= salesRate;
        orderPool.salesRate[orderId] = 0;
        orderPool.orderExpiry[orderId] = 0;
        orderPool.salesRateEndingPerBlock[expiry] -= salesRate;
    }

    ///@notice withdraw proceeds from pool for a given order. This can be done before or after the order has expired.
    //If the order has expired, we calculate the reward factor at time of expiry. If order has not yet expired, we
    //use current reward factor, and update the reward factor at time of staking (effectively creating a new order)
    function orderPoolWithdrawProceeds(OrderPool storage orderPool, uint256 orderId, uint256 blockTimestamp) internal returns (uint256 totalReward) {
        bool orderExpired;
        (orderExpired, totalReward) = orderPoolGetProceeds(orderPool, orderId, blockTimestamp);

        if (orderExpired) {
            //remove stake
            orderPool.salesRate[orderId] = 0;
        }
        //if order has not yet expired, we just adjust the start
        else {
            orderPool.rewardFactorAtSubmission[orderId] = orderPool.rewardFactor;
        }
    }

    ///@notice view function for getting the current proceeds for the given order
    function orderPoolGetProceeds(OrderPool storage orderPool, uint256 orderId, uint256 blockTimestamp) internal view returns (bool orderExpired, uint256 totalReward) {
        uint256 stakedAmount = orderPool.salesRate[orderId];
        require(stakedAmount > 0);
        uint256 orderExpiry = orderPool.orderExpiry[orderId];
        uint256 rewardFactorAtSubmission = orderPool.rewardFactorAtSubmission[orderId];

        //if order has expired, we need to calculate the reward factor at expiry
        if (blockTimestamp > orderExpiry) {
            uint256 rewardFactorAtExpiry = orderPool.rewardFactorAtBlock[orderExpiry];
            unchecked { // subtraction is with underflow
                totalReward = ((rewardFactorAtExpiry - rewardFactorAtSubmission) * stakedAmount / SELL_RATE_ADDITIONAL_PRECISION) / Q112;
            }
            orderExpired = true;
        }
        else {
            unchecked { // subtraction is with underflow
                totalReward = ((orderPool.rewardFactor - rewardFactorAtSubmission) * stakedAmount / SELL_RATE_ADDITIONAL_PRECISION) / Q112;
            }
            orderExpired = false;
        }
    }
}