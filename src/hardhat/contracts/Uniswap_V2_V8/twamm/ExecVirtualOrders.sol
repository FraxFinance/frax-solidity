//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '../core/libraries/Math.sol';

///@notice This library handles the execution of long term orders.
library ExecVirtualOrdersLib {

    ///@notice computes the result of virtual trades by the token pools
    function computeVirtualBalances(
        uint256 tokenAStart,
        uint256 tokenBStart,
        uint256 tokenAIn,
        uint256 tokenBIn)
    internal pure returns (uint256 tokenAOut, uint256 tokenBOut, uint256 ammEndTokenA, uint256 ammEndTokenB)
    {
        tokenAOut = 0;
        tokenBOut = 0;
        //if no tokens are sold to the pool, we don't need to execute any orders
        if (tokenAIn == 0 && tokenBIn == 0) {
            ammEndTokenA = tokenAStart;
            ammEndTokenB = tokenBStart;
        }
        //in the case where only one pool is selling, we just perform a normal swap
        else if (tokenAIn == 0) {
            //constant product formula
            uint tokenBInWithFee = tokenBIn * 997;
            tokenAOut = tokenAStart * tokenBInWithFee / ((tokenBStart * 1000) + tokenBInWithFee);
            ammEndTokenA = tokenAStart - tokenAOut;
            ammEndTokenB = tokenBStart + tokenBIn;

        }
        else if (tokenBIn == 0) {
            //contant product formula
            uint tokenAInWithFee = tokenAIn * 997;
            tokenBOut = tokenBStart * tokenAInWithFee / ((tokenAStart * 1000) + tokenAInWithFee);
            ammEndTokenA = tokenAStart + tokenAIn;
            ammEndTokenB = tokenBStart - tokenBOut;
        }
        //when both pools sell, we use the TWAMM formula
        else {
            uint256 aIn = tokenAIn * 997 / 1000;
            uint256 bIn = tokenBIn * 997 / 1000;
            uint256 k = tokenAStart * tokenBStart;
            ammEndTokenB = tokenAStart * (tokenBStart + bIn) / (tokenAStart + aIn);
            ammEndTokenA = k / ammEndTokenB;
            tokenAOut = tokenAStart + aIn - ammEndTokenA;
            tokenBOut = tokenBStart + bIn - ammEndTokenB;
        }
    }
}