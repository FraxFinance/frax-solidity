//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import '../core/libraries/Math.sol';

///@notice This library handles the execution of long term orders.
library ExecVirtualOrdersLib {

    ///@notice computes the result of virtual trades by the token pools
    function computeVirtualBalances(
        uint256 token0Start,
        uint256 token1Start,
        uint256 token0In,
        uint256 token1In)
    internal pure returns (uint256 token0Out, uint256 token1Out, uint256 ammEndToken0, uint256 ammEndToken1)
    {
        token0Out = 0;
        token1Out = 0;
        //if no tokens are sold to the pool, we don't need to execute any orders
        if (token0In == 0 && token1In == 0) {
            ammEndToken0 = token0Start;
            ammEndToken1 = token1Start;
        }
        //in the case where only one pool is selling, we just perform a normal swap
        else if (token0In == 0) {
            //constant product formula
            uint token1InWithFee = token1In * 997;
            token0Out = token0Start * token1InWithFee / ((token1Start * 1000) + token1InWithFee);
            ammEndToken0 = token0Start - token0Out;
            ammEndToken1 = token1Start + token1In;
        }
        else if (token1In == 0) {
            //contant product formula
            uint token0InWithFee = token0In * 997;
            token1Out = token1Start * token0InWithFee / ((token0Start * 1000) + token0InWithFee);
            ammEndToken0 = token0Start + token0In;
            ammEndToken1 = token1Start - token1Out;
        }
        //when both pools sell, we use the TWAMM formula
        else {
            uint256 aIn = token0In * 997 / 1000;
            uint256 bIn = token1In * 997 / 1000;
            uint256 k = token0Start * token1Start;
            ammEndToken1 = token0Start * (token1Start + bIn) / (token0Start + aIn);
            ammEndToken0 = k / ammEndToken1;
            token0Out = token0Start + aIn - ammEndToken0;
            token1Out = token1Start + bIn - ammEndToken1;
        }
    }
}