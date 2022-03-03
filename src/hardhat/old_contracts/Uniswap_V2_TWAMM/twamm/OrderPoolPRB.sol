//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "prb-math/contracts/PRBMathUD60x18.sol";

///@notice An Order Pool is an abstraction for a pool of long term orders that sells a token at a constant rate to the embedded AMM. 
///the order pool handles the logic for distributing the proceeds from these sales to the owners of the long term orders through a modified 
///version of the staking algorithm from  https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf
library OrderPoolLib {
    using PRBMathUD60x18 for uint256;

    ///@notice you can think of this as a staking pool where all long term orders are staked.
    /// The pool is paid when virtual long term orders are executed, and each order is paid proportionally
    /// by the order's sale rate per block
    struct OrderPool {
        ///@notice current rate that tokens are being sold (per block)
        uint256 currentSalesRate;

        ///@notice sum of (salesProceeds_k / salesRate_k) over every period k. Stored as a fixed precision floating point number
        uint256 rewardFactor;

        ///@notice this maps block numbers to the cumulative sales rate of orders that expire on that block
        mapping(uint256 => uint256) salesRateEndingPerBlock;

        ///@notice map order ids to the block in which they expire
        mapping(uint256 => uint256) orderExpiry;

        ///@notice map order ids to their sales rate
        mapping(uint256 => uint256) salesRate;

        ///@notice reward factor per order at time of submission
        mapping(uint256 => uint256) rewardFactorAtSubmission;

        ///@notice reward factor at a specific block
        mapping(uint256 => uint256) rewardFactorAtBlock;
    }

    ///@notice distribute payment amount to pool (in the case of TWAMM, proceeds from trades against amm)
    function distributePayment(OrderPool storage self, uint256 amount) internal {
        if (self.currentSalesRate != 0) {
            //floating point arithmetic
            self.rewardFactor += amount.fromUint().div(self.currentSalesRate.fromUint());
        }
    }

    ///@notice deposit an order into the order pool.
    function depositOrder(OrderPool storage self, uint256 orderId, uint256 amountPerBlock, uint256 orderExpiry) internal {
        self.currentSalesRate += amountPerBlock;
        self.rewardFactorAtSubmission[orderId] = self.rewardFactor;
        self.orderExpiry[orderId] = orderExpiry;
        self.salesRate[orderId] = amountPerBlock;
        self.salesRateEndingPerBlock[orderExpiry] += amountPerBlock;
    }

    ///@notice when orders expire after a given block, we need to update the state of the pool
    function updateStateFromBlockExpiry(OrderPool storage self, uint256 blockNumber) internal {
        self.currentSalesRate -= self.salesRateEndingPerBlock[blockNumber];
        self.rewardFactorAtBlock[blockNumber] = self.rewardFactor;
    }

    ///@notice cancel order and remove from the order pool
    function cancelOrder(OrderPool storage self, uint256 orderId) internal returns (uint256 unsoldAmount, uint256 purchasedAmount) {
        uint256 expiry = self.orderExpiry[orderId];
        require(expiry > block.number);

        //calculate amount that wasn't sold, and needs to be returned
        uint256 salesRate = self.salesRate[orderId];
        unsoldAmount = (expiry - block.number) * salesRate;

        //calculate amount of other token that was purchased
        purchasedAmount = (self.rewardFactor - self.rewardFactorAtSubmission[orderId]).mul(salesRate.fromUint()).toUint();

        //update state
        self.currentSalesRate -= salesRate;
        self.salesRate[orderId] = 0;
        self.orderExpiry[orderId] = 0;
        self.salesRateEndingPerBlock[expiry] -= salesRate;
    }

    ///@notice withdraw proceeds from pool for a given order. This can be done before or after the order has expired.
    //If the order has expired, we calculate the reward factor at time of expiry. If order has not yet expired, we
    //use current reward factor, and update the reward factor at time of staking (effectively creating a new order)
    function withdrawProceeds(OrderPool storage self, uint256 orderId) internal returns (uint256 totalReward) {
        uint256 stakedAmount = self.salesRate[orderId];
        require(stakedAmount > 0);
        uint256 orderExpiry = self.orderExpiry[orderId];
        uint256 rewardFactorAtSubmission = self.rewardFactorAtSubmission[orderId];

        //if order has expired, we need to calculate the reward factor at expiry
        if (block.number > orderExpiry) {
            uint256 rewardFactorAtExpiry = self.rewardFactorAtBlock[orderExpiry];
            totalReward = (rewardFactorAtExpiry - rewardFactorAtSubmission).mul(stakedAmount.fromUint()).toUint();
            //remove stake
            self.salesRate[orderId] = 0;
        }
        //if order has not yet expired, we just adjust the start 
        else {
            totalReward = (self.rewardFactor - rewardFactorAtSubmission).mul(stakedAmount.fromUint()).toUint();
            self.rewardFactorAtSubmission[orderId] = self.rewardFactor;
        }
    }
}