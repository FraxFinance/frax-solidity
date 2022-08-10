pragma solidity ^0.8.0;

import '../../core/interfaces/IFraxswapPair.sol';
import '../../core/interfaces/IUniswapV2FactoryV5.sol';
import '../../libraries/Babylonian.sol';
import '../../libraries/FullMath.sol';

// library containing some math for dealing with the liquidity shares of a pair, e.g. computing their exact value
// in terms of the underlying tokens
library UniswapV2LiquidityMathLibraryMini {

    // computes the direction and magnitude of the profit-maximizing trade
    // function computeProfitMaximizingTrade(
    //     uint256 truePriceTokenA,
    //     uint256 truePriceTokenB,
    //     uint256 reserveA,
    //     uint256 reserveB
    // ) pure internal returns (uint256 amountIn) {
    //     bool aToB = ((reserveA * truePriceTokenB) / reserveB) < truePriceTokenA;

    //     uint256 invariant = reserveA * reserveB;

    //     // true price is expressed as a ratio, so both values must be non-zero
    //     require(truePriceTokenA != 0 && truePriceTokenB != 0, "CPMT: ZERO_PRICE");

    //     uint256 leftSide = Babylonian.sqrt(
    //         FullMath.mulDiv(
    //             (invariant * 1000),
    //             aToB ? truePriceTokenA : truePriceTokenB,
    //             (aToB ? truePriceTokenB : truePriceTokenA) * 997
    //         )
    //     );
    //     uint256 rightSide = (aToB ? reserveA * 1000 : reserveB * 1000) / 997;

    //     if (leftSide < rightSide) return (0);

    //     // compute the amount that must be sent to move the price to the profit-maximizing price
    //     amountIn = leftSide - rightSide;
    // }

    function computeProfitMaximizingTrade(
        uint256 inTokenTruePrice,
        uint256 outTokenTruePrice,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 fee
    ) pure internal returns (uint256 amountIn) {
        uint256 invariant = reserveIn * reserveOut;

        // true price is expressed as a ratio, so both values must be non-zero
        require(inTokenTruePrice != 0 && outTokenTruePrice != 0, "CPMT: ZERO_PRICE");

        uint256 leftSide = Babylonian.sqrt(
            FullMath.mulDiv(
                (invariant * 10000),
                inTokenTruePrice,
                outTokenTruePrice * fee
            )
        );
        uint256 rightSide = (reserveIn * 10000) / fee;

        if (leftSide < rightSide) return (0);

        // compute the amount that must be sent to move the price to the profit-maximizing price
        amountIn = leftSide - rightSide;
    }
}
