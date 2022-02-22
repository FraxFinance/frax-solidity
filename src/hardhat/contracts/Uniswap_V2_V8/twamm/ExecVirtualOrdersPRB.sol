//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "prb-math/contracts/PRBMathSD59x18.sol";

///@notice This library handles the execution of long term orders.
library ExecVirtualOrdersPRBLib {
    using PRBMathSD59x18 for int256;

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
            //signed, fixed point arithmetic
            int256 aIn = int256(tokenAIn * 997 / 1000).fromInt();
            int256 bIn = int256(tokenBIn * 997 / 1000).fromInt();
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