//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "./OrderPool.sol";


///@notice This library handles the state and execution of long term orders. 
library LongTermOrdersLib {
    using PRBMathSD59x18 for int256;
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
        mapping(address => OrderPoolLib.OrderPool) OrderPoolMap;

        ///@notice incrementing counter for order ids
        uint256 orderId;

         ///@notice mapping from order ids to Orders 
        mapping(uint256 => Order) orderMap;
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
    function longTermSwapFromAToB(LongTermOrders storage self, uint256 amountA, uint256 numberOfBlockIntervals,  mapping(address => uint256) storage reserveMap) internal returns (uint256) {
        return performLongTermSwap(self, self.tokenA, self.tokenB, amountA, numberOfBlockIntervals, reserveMap);
    }

    ///@notice swap token B for token A. Amount represents total amount being sold, numberOfBlockIntervals determines when order expires 
    function longTermSwapFromBToA(LongTermOrders storage self, uint256 amountB, uint256 numberOfBlockIntervals,  mapping(address => uint256) storage reserveMap) internal returns (uint256) {
        return performLongTermSwap(self, self.tokenB, self.tokenA, amountB, numberOfBlockIntervals, reserveMap);
    }

    ///@notice adds long term swap to order pool
    function performLongTermSwap(LongTermOrders storage self, address from, address to, uint256 amount, uint256 numberOfBlockIntervals,  mapping(address => uint256) storage reserveMap) private returns (uint256) {
        //update virtual order state 
        executeVirtualOrdersUntilCurrentBlock(self, reserveMap);
        
        // transfer sale amount to contract
        ERC20(from).transferFrom(msg.sender, address(this), amount);

        //determine the selling rate based on number of blocks to expiry and total amount 
        uint256 currentBlock = block.number;
        uint256 lastExpiryBlock = currentBlock - (currentBlock % self.orderBlockInterval);
        uint256 orderExpiry = self.orderBlockInterval * (numberOfBlockIntervals + 1) + lastExpiryBlock;
        uint256 sellingRate = amount / (orderExpiry - currentBlock);

        //add order to correct pool
        OrderPoolLib.OrderPool storage OrderPool = self.OrderPoolMap[from];
        OrderPool.depositOrder(self.orderId, sellingRate, orderExpiry);

        //add to order map
        self.orderMap[self.orderId] = Order(self.orderId, orderExpiry, sellingRate, msg.sender, from, to);
        return self.orderId++;
    }

    ///@notice cancel long term swap, pay out unsold tokens and well as purchased tokens 
    function cancelLongTermSwap(LongTermOrders storage self, uint256 orderId,  mapping(address => uint256) storage reserveMap) internal {
        //update virtual order state 
        executeVirtualOrdersUntilCurrentBlock(self, reserveMap);

        Order storage order = self.orderMap[orderId];
        require(order.owner == msg.sender, 'sender must be order owner');

        OrderPoolLib.OrderPool storage OrderPool = self.OrderPoolMap[order.sellTokenId];
        (uint256 unsoldAmount, uint256 purchasedAmount) = OrderPool.cancelOrder(orderId);

        require(unsoldAmount > 0 || purchasedAmount > 0, 'no proceeds to withdraw');
        //transfer to owner
        ERC20(order.buyTokenId).transfer(msg.sender, purchasedAmount);
        ERC20(order.sellTokenId).transfer(msg.sender, unsoldAmount);
    }

    ///@notice withdraw proceeds from a long term swap (can be expired or ongoing) 
    function withdrawProceedsFromLongTermSwap(LongTermOrders storage self, uint256 orderId,  mapping(address => uint256) storage reserveMap) internal {
         //update virtual order state 
        executeVirtualOrdersUntilCurrentBlock(self, reserveMap);

        Order storage order = self.orderMap[orderId];
        require(order.owner == msg.sender, 'sender must be order owner');

        OrderPoolLib.OrderPool storage OrderPool = self.OrderPoolMap[order.sellTokenId];
        uint256 proceeds = OrderPool.withdrawProceeds(orderId);

        require(proceeds > 0, 'no proceeds to withdraw');
        //transfer to owner
        ERC20(order.buyTokenId).transfer(msg.sender, proceeds);
    }


    ///@notice executes all virtual orders between current lastVirtualOrderBlock and blockNumber
    //also handles orders that expire at end of final block. This assumes that no orders expire inside the given interval 
    function executeVirtualTradesAndOrderExpiries(LongTermOrders storage self, mapping(address => uint256) storage reserveMap, uint256 blockNumber) private {
        
        //amount sold from virtual trades
        uint256 blockNumberIncrement = blockNumber - self.lastVirtualOrderBlock;
        uint256 tokenASellAmount = self.OrderPoolMap[self.tokenA].currentSalesRate * blockNumberIncrement;
        uint256 tokenBSellAmount = self.OrderPoolMap[self.tokenB].currentSalesRate * blockNumberIncrement;

        //initial amm balance 
        uint256 tokenAStart = reserveMap[self.tokenA];
        uint256 tokenBStart = reserveMap[self.tokenB];
        
        //updated balances from sales 
        (uint256 tokenAOut, uint256 tokenBOut, uint256 ammEndTokenA, uint256 ammEndTokenB) = computeVirtualBalances(tokenAStart, tokenBStart, tokenASellAmount, tokenBSellAmount);
        
        //update balances reserves
        reserveMap[self.tokenA] = ammEndTokenA;
        reserveMap[self.tokenB] = ammEndTokenB;
        
        //distribute proceeds to pools 
        OrderPoolLib.OrderPool storage OrderPoolA = self.OrderPoolMap[self.tokenA];
        OrderPoolLib.OrderPool storage OrderPoolB = self.OrderPoolMap[self.tokenB];

        OrderPoolA.distributePayment(tokenBOut);
        OrderPoolB.distributePayment(tokenAOut);

        //handle orders expiring at end of interval 
        OrderPoolA.updateStateFromBlockExpiry(blockNumber);
        OrderPoolB.updateStateFromBlockExpiry(blockNumber);

        //update last virtual trade block 
        self.lastVirtualOrderBlock = blockNumber;
    }

    ///@notice executes all virtual orders until current block is reached. 
    function executeVirtualOrdersUntilCurrentBlock(LongTermOrders storage self, mapping(address => uint256) storage reserveMap) internal {
        uint256 nextExpiryBlock = self.lastVirtualOrderBlock - (self.lastVirtualOrderBlock % self.orderBlockInterval) + self.orderBlockInterval;
        //iterate through blocks eligible for order expiries, moving state forward
        while(nextExpiryBlock < block.number) {
            executeVirtualTradesAndOrderExpiries(self, reserveMap, nextExpiryBlock);
            nextExpiryBlock += self.orderBlockInterval;
        }
        //finally, move state to current block if necessary 
        if(self.lastVirtualOrderBlock != block.number) {
            executeVirtualTradesAndOrderExpiries(self, reserveMap, block.number);
        }
    }

    ///@notice computes the result of virtual trades by the token pools
    function computeVirtualBalances(
          uint256 tokenAStart
        , uint256 tokenBStart
        , uint256 tokenAIn
        , uint256 tokenBIn) private pure returns (uint256 tokenAOut, uint256 tokenBOut, uint256 ammEndTokenA, uint256 ammEndTokenB)
    {
        //if no tokens are sold to the pool, we don't need to execute any orders
        if(tokenAIn == 0 && tokenBIn == 0) {
            tokenAOut = 0;
            tokenBOut = 0;
            ammEndTokenA = tokenAStart;
            ammEndTokenB = tokenBStart;
        }
        //in the case where only one pool is selling, we just perform a normal swap 
        else if (tokenAIn == 0) {
            //constant product formula
            tokenAOut =  tokenAStart * tokenBIn / (tokenBStart + tokenBIn);
            tokenBOut = 0;
            ammEndTokenA = tokenAStart - tokenAOut;
            ammEndTokenB = tokenBStart + tokenBIn;
            
        }
        else if (tokenBIn == 0) {
            tokenAOut = 0;
            //contant product formula
            tokenBOut =  tokenBStart * tokenAIn / (tokenAStart + tokenAIn);
            ammEndTokenA = tokenAStart + tokenAIn;
            ammEndTokenB = tokenBStart - tokenBOut;
        }
        //when both pools sell, we use the TWAMM formula
        else {
            
            //signed, fixed point arithmetic 
            int256 aIn = int256(tokenAIn).fromInt();
            int256 bIn = int256(tokenBIn).fromInt();
            int256 aStart = int256(tokenAStart).fromInt();
            int256 bStart = int256(tokenBStart).fromInt();
            int256 k = aStart.mul(bStart);

            int256 c = computeC(aStart, bStart, aIn, bIn);
            int256 endA = computeAmmEndTokenA(aIn, bIn, c, k, aStart, bStart);
            int256 endB = aStart.div(endA).mul(bStart);

            int256 outA = aStart + aIn - endA;
            int256 outB = bStart + bIn - endB;

            return (uint256(outA.toInt()), uint256(outB.toInt()), uint256(endA.toInt()), uint256(endB.toInt()));

        }
        
    }

    //helper function for TWAMM formula computation, helps avoid stack depth errors
    function computeC(int256 tokenAStart, int256 tokenBStart, int256 tokenAIn, int256 tokenBIn) private pure returns (int256 c) {
        int256 c1 = tokenAStart.sqrt().mul(tokenBIn.sqrt());
        int256 c2 = tokenBStart.sqrt().mul(tokenAIn.sqrt());
        int256 cNumerator = c1 - c2;
        int256 cDenominator = c1 + c2;
        c = cNumerator.div(cDenominator);
    }

    //helper function for TWAMM formula computation, helps avoid stack depth errors
    function computeAmmEndTokenA(int256 tokenAIn, int256 tokenBIn, int256 c, int256 k, int256 aStart, int256 bStart) private pure returns (int256 ammEndTokenA) {
        //rearranged for numerical stability
        int256 eNumerator = PRBMathSD59x18.fromInt(4).mul(tokenAIn).mul(tokenBIn).sqrt();
        int256 eDenominator = aStart.sqrt().mul(bStart.sqrt()).inv();
        int256 exponent = eNumerator.mul(eDenominator).exp();
        int256 fraction = (exponent + c).div(exponent - c);
        int256 scaling = k.div(tokenBIn).sqrt().mul(tokenAIn.sqrt());
        ammEndTokenA = fraction.mul(scaling);
    }
  
}