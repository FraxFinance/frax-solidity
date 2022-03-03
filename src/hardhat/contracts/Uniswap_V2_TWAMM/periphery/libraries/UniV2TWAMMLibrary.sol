// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= UniV2TWAMMLibrary ========================
// ====================================================================
// TWAMM Library Functions
// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian

import '../../core/interfaces/IUniV2TWAMMPair.sol';

import "./SafeMath.sol";

library UniV2TWAMMLibrary {
    using SafeMath for uint;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniV2TWAMMLibrary: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniV2TWAMMLibrary: ZERO_ADDRESS');
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(uint160(uint(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1)),
                hex'1c447bb356b6f50477137a66c58c198dd8dee98957212c6c3fdacaabcebebf7e' // init code hash
            )))));
    }

    // fetches and sorts the reserves for a pair
    function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);

        (uint reserve0, uint reserve1,) = IUniV2TWAMMPair(pairFor(factory, tokenA, tokenB)).getReserves();

        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function getReservesWithTwamm(address factory, address tokenA, address tokenB) internal returns (uint reserveA, uint reserveB, uint twammReserveA, uint twammReserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);

        IUniV2TWAMMPair pair = IUniV2TWAMMPair(pairFor(factory, tokenA, tokenB));

        pair.executeVirtualOrders(block.timestamp);

        (uint reserve0, uint reserve1,,uint twammReserve0, uint twammReserve1) = pair.getTwammReserves();

        (reserveA, reserveB, twammReserveA, twammReserveB) = tokenA == token0 ? (reserve0, reserve1, twammReserve0, twammReserve1) : (reserve1, reserve0, twammReserve1, twammReserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, 'UniV2TWAMMLibrary: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY');
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'UniV2TWAMMLibrary: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) internal pure returns (uint amountIn) {
        require(amountOut > 0, 'UniV2TWAMMLibrary: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(address factory, uint amountIn, address[] memory path) internal view returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniV2TWAMMLibrary: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            require(IUniV2TWAMMPair(UniV2TWAMMLibrary.pairFor(factory, path[i], path[i + 1])).twammUpToDate(), 'twamm out of date');
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(address factory, uint amountOut, address[] memory path) internal view returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniV2TWAMMLibrary: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            require(IUniV2TWAMMPair(UniV2TWAMMLibrary.pairFor(factory, path[i - 1], path[i])).twammUpToDate(), 'twamm out of date');
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    // performs chained getAmountOut calculations on any number of pairs with Twamm
    function getAmountsOutWithTwamm(address factory, uint amountIn, address[] memory path) internal returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniV2TWAMMLibrary: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            address pairAddress = UniV2TWAMMLibrary.pairFor(factory, path[i], path[i + 1]);
            IUniV2TWAMMPair(pairAddress).executeVirtualOrders(block.timestamp);
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // performs chained getAmountIn calculations on any number of pairs with Twamm
    function getAmountsInWithTwamm(address factory, uint amountOut, address[] memory path) internal returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniV2TWAMMLibrary: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            address pairAddress = UniV2TWAMMLibrary.pairFor(factory, path[i - 1], path[i]);
            IUniV2TWAMMPair(pairAddress).executeVirtualOrders(block.timestamp);
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}
