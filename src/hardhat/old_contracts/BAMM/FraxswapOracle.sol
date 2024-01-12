// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== FraxswapOracle =========================
// ====================================================================
// Gets token0 and token1 prices from a Fraxswap pair

// Frax Finance: https://github.com/FraxFinance

// Primary Author
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna


import './FixedPoint.sol';
import '../Fraxswap/core/libraries/UQ112x112.sol';
import "hardhat/console.sol";

contract FraxswapOracle {
    using UQ112x112 for uint224;
    using FixedPoint for *;

    /// @notice Gets the prices for token0 and token1 from a Fraxswap pool
    /// @param pool The LP contract
    /// @param period The minimum size of the period between observations, in seconds
    /// @param rounds 2 ^ rounds # of blocks to search
    /// @param maxDiffPerc Max price change from last value
    /// @return result0 The price for token0
    /// @return result1 The price for token1
    function getPrice(
        IFraxswapPair pool, 
        uint period, 
        uint rounds, 
        uint maxDiffPerc
    ) public view returns (uint result0, uint result1) {
        uint lastObservationIndex = pool.getTWAPHistoryLength() - 1;
        IFraxswapPair.TWAPObservation memory lastObservation = pool.TWAPObservationHistory(lastObservationIndex);
        
        // Update last observation up to the current block
        if (lastObservation.timestamp < block.timestamp) { 
            // Update the reserves
            (uint112 _reserve0, uint112 _reserve1, ) = pool.getReserves();

            // Get the latest observed prices
            uint timeElapsed = block.timestamp - lastObservation.timestamp;
            lastObservation.price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            lastObservation.price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
            lastObservation.timestamp = block.timestamp;
        }
       
        // Search for an observation
        // TODO: Dennis explain math
        IFraxswapPair.TWAPObservation memory foundObservation;
        uint step = 2 ** rounds;
        uint min = (lastObservationIndex + 2 > step) ? (lastObservationIndex + 2 - step) : 0; 
        while (step > 1) {
            step = step >> 1;
            uint pos = min + step - 1;
            if (pos <= lastObservationIndex) {
                IFraxswapPair.TWAPObservation memory observation = pool.TWAPObservationHistory(pos);
                if (lastObservation.timestamp - observation.timestamp > period) {
                    foundObservation = observation;
                    min = pos + 1;
                }
            }
        }

        // Reverts when a matching period can not be found
        require (foundObservation.timestamp > 0, "Period too long");

        // Get the price results
        result0 = FixedPoint.uq112x112(uint224((lastObservation.price0CumulativeLast - foundObservation.price0CumulativeLast) / (lastObservation.timestamp - foundObservation.timestamp))).mul(1e18).decode144();
        result1 = FixedPoint.uq112x112(uint224((lastObservation.price1CumulativeLast - foundObservation.price1CumulativeLast) / (lastObservation.timestamp - foundObservation.timestamp))).mul(1e18).decode144();
        
        // Revert if the price changed too much
        uint checkResult0 = 1e36 / result1;
        uint diff = (checkResult0 > result0 ? checkResult0 - result0 : result0 - checkResult0);
        uint diffPerc = (diff * 10000) / result0;
        if (diffPerc > maxDiffPerc) revert("Max diff");
    }

    /// @notice Gets the prices for token0 from a Fraxswap pool
    /// @param pool The LP contract
    /// @param period The minimum size of the period between observations, in seconds
    /// @param rounds 2 ^ rounds # of blocks to search
    /// @param maxDiffPerc Max price change from last value
    /// @return result0 The price for token0
    function getPrice0(IFraxswapPair pool, uint period, uint rounds, uint maxDiffPerc) external view returns (uint result0) {
        (result0, ) = getPrice(pool, period, rounds, maxDiffPerc);
    }

    /// @notice Gets the price for token1 from a Fraxswap pool
    /// @param pool The LP contract
    /// @param period The minimum size of the period between observations, in seconds
    /// @param rounds 2 ^ rounds # of blocks to search
    /// @param maxDiffPerc Max price change from last value
    /// @return result1 The price for token1
    function getPrice1(IFraxswapPair pool, uint period, uint rounds, uint maxDiffPerc) external view returns (uint result1) {
        (, result1) = getPrice(pool, period, rounds, maxDiffPerc);
    }   
}

// Interface used to call FraxswapPair
interface IFraxswapPair {
    function getTWAPHistoryLength() external view returns (uint);
    function TWAPObservationHistory(uint index) external view returns(TWAPObservation memory);
    struct TWAPObservation {
        uint timestamp;
        uint price0CumulativeLast;
        uint price1CumulativeLast;
    }
    function getReserves() external view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast);
}