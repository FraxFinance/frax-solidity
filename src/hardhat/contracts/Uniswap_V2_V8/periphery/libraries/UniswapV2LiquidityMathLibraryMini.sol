pragma solidity ^0.8.0;

import '../../core/interfaces/IUniV2TWAMMPair.sol';
import '../../core/interfaces/IUniswapV2FactoryV5.sol';
import '../../libraries/Babylonian.sol';
import '../../libraries/FullMath.sol';

// library containing some math for dealing with the liquidity shares of a pair, e.g. computing their exact value
// in terms of the underlying tokens
library UniswapV2LiquidityMathLibraryMini {

    // computes the direction and magnitude of the profit-maximizing trade
    function computeProfitMaximizingTrade(
        uint256 truePriceTokenA,
        uint256 truePriceTokenB,
        uint256 reserveA,
        uint256 reserveB,
        bool aToB
    ) pure internal returns (uint256 amountIn) {
        uint256 invariant = reserveA * reserveB;

        uint256 leftSide = Babylonian.sqrt(
            FullMath.mulDiv(
                (invariant * 1000),
                aToB ? truePriceTokenA : truePriceTokenB,
                (aToB ? truePriceTokenB : truePriceTokenA) * 997
            )
        );
        uint256 rightSide = (aToB ? reserveA * 1000 : reserveB * 1000) / 997;

        if (leftSide < rightSide) return (0);

        // compute the amount that must be sent to move the price to the profit-maximizing price
        amountIn = leftSide - rightSide;
    }

}
