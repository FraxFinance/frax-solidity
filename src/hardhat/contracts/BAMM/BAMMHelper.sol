// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================ BAMMHelper ============================
// ====================================================================
// Has helper functions for the BAMM, especially for unbalanced liquidity calculations

// Frax Finance: https://github.com/FraxFinance

// Primary Author
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Fraxswap/core/FraxswapPair.sol";
import "hardhat/console.sol";

contract BAMMHelper { 

   /// @notice Mints LP from token0 and token1. Swaps to balance the pool first if token0 and token1 are not at the current pool ratio.
   /// @param token0Amount Amount of token0 being sent
   /// @param token1Amount Amount of token1 being sent
   /// @param minLiquidity Minimum amount of LP output expected
   /// @param pool The LP contract
   /// @param fee The swap fee for the LP
   /// @param isFraxswapPool Whether the LP is Fraxswap or just another UniV2-like variant
   function addLiquidityUnbalanced(
      uint token0Amount, 
      uint token1Amount, 
      uint minLiquidity, 
      FraxswapPair pool, 
      uint fee, 
      bool isFraxswapPool
   ) external returns (uint liquidity) {
      // Make sure TWAMM orders are executed first
      if (isFraxswapPool) pool.executeVirtualOrders(block.timestamp); 

      // Get the new reserves
      (uint112 reserve0, uint112 reserve1,) = pool.getReserves();

      // Get the amount to swap. Can be negative.
      IERC20 token0 = IERC20(pool.token0());
      IERC20 token1 = IERC20(pool.token1());
      int256 swapAmount = getSwapAmount(int256(uint(reserve0)), int256(uint(reserve1)), int256(token0Amount), int256(token1Amount), int256(fee));
      
      // Positive = token0 --> token1, Negative = token1 --> token0;
      // Swap to make the pool balanced
      if (swapAmount > 0) {
         // Swap token0 for token1
         // xy = k
         uint amountOut = getAmountOut(reserve0, reserve1, fee, uint(swapAmount));

         if (amountOut > 0) {
            // Take token0 from the sender and give it to the pool
            SafeERC20.safeTransferFrom(token0, msg.sender, address(pool), uint(swapAmount));

            // Swap token0 (excess sitting in the pool) for token1
            pool.swap(0, amountOut, address(this), "");

            // Give the received token1 to the LP for later minting
            SafeERC20.safeTransfer(token1, address(pool), amountOut);
            
            // Subtract the amount of token0 sent in for the swap
            token0Amount -= uint(swapAmount);
         }
      } else {
         // Swap token1 for token0
         // xy = k
         uint amountOut = getAmountOut(reserve1, reserve0, fee, uint(-swapAmount));

         if (amountOut > 0) {
            // Take token1 from the sender and give it to the pool
            SafeERC20.safeTransferFrom(token1, msg.sender, address(pool), uint(-swapAmount));

            // Swap token1 (excess sitting in the pool) for token0
            pool.swap(amountOut, 0, address(this), "");

            // Give the received token0 to the LP for later minting
            SafeERC20.safeTransfer(token0, address(pool), amountOut);

            // Subtract the amount of token1 sent in for the swap
            token1Amount -= uint(-swapAmount);
         }
      }

      // Take the token0 and token1 from the sender and give it to the LP
      SafeERC20.safeTransferFrom(token0, msg.sender, address(pool), token0Amount);
      SafeERC20.safeTransferFrom(token1, msg.sender, address(pool), token1Amount);

      // Mint() sees the new tokens and will mint LP to msg.sender
      // It also executes long term orders, updates the reserves and price accumulators
      liquidity = pool.mint(msg.sender);

      // Revert if the generated liquidity was not enough
      if (liquidity < minLiquidity) revert("minLiquidity");
   }
   

   /// @notice Estimates the amount of LP minted from sending a possibly imbalanced amount of token0 and token1
   /// @param token0Amount Amount of token0 being sent
   /// @param token1Amount Amount of token1 being sent
   /// @param pool The LP contract
   /// @param fee The swap fee for the LP
   /// @param isFraxswapPool Whether the LP is Fraxswap or just another UniV2-like variant
   /// @return liquidity Amount of LP tokens expected
   function estimateLiquidityUnbalanced(
      uint token0Amount, 
      uint token1Amount, 
      FraxswapPair pool, 
      uint fee, 
      bool isFraxswapPool
   ) public view returns (uint liquidity, int256 swapAmount) {
      // Get the pool reserves
      uint112 reserve0;
      uint112 reserve1;
      if (isFraxswapPool) (reserve0, reserve1, , , ) = pool.getReserveAfterTwamm(block.timestamp);
      else (reserve0, reserve1,) = pool.getReserves();

      // Get the amount to swap. Can be negative.
      IERC20 token0 = IERC20(pool.token0());
      IERC20 token1 = IERC20(pool.token1());
      swapAmount = getSwapAmount(int256(uint(reserve0)), int256(uint(reserve1)), int256(token0Amount), int256(token1Amount), int256(fee));
      
      // Positive = token0 --> token1, Negative = token1 --> token0;
      if (swapAmount > 0) {
         // xy = k
         uint amountOut = getAmountOut(reserve0, reserve1, fee, uint(swapAmount));

         // Update local vars
         token0Amount -= uint(swapAmount);
         token1Amount += amountOut;
         reserve0 += uint112(uint(swapAmount));
         reserve1 -= uint112(amountOut);
      } else {
         // xy = k
         uint amountOut = getAmountOut(reserve1, reserve0, fee, uint(-swapAmount));

         // Update local vars
         token1Amount -= uint(-swapAmount);
         token0Amount += amountOut;
         reserve1 += uint112(uint(-swapAmount));
         reserve0 -= uint112(amountOut);
      }

      // Estimate the amount of LP that would be generated 
      uint _totalSupply = pool.totalSupply();
      liquidity = Math.min((token0Amount * _totalSupply) / reserve0, (token1Amount * _totalSupply) / reserve1);
   }   
   
   /// @notice Use xy = k to get the amount of output tokens from a swap
   /// @param reserveIn Reserves of the input token
   /// @param reserveOut Reserves of the output token
   /// @param fee The swap fee for the LP
   /// @param amountIn Amount of input token
   /// @return uint Amount other token expected to be outputted
   function getAmountOut(uint112 reserveIn, uint112 reserveOut, uint fee, uint amountIn) internal pure returns (uint) { 
      uint amountInWithFee = amountIn * fee;
      uint numerator = amountInWithFee * reserveOut;
      uint denominator = (uint(reserveIn) * 10000) + amountInWithFee;
      return numerator / denominator;
   }
   
   /// @notice Uses xy = k. Calculates which token, and how much of it, need to be swapped to balance the pool.
   /// @param RES_A Reserves of token A (not necessarily token0)
   /// @param RES_B Reserves of token B (not necessarily token1)
   /// @param TKN_A_AMT Amount of token A coming in
   /// @param TKN_B_AMT Amount of token B coming in
   /// @return result The amount that needs to be swapped. Positive = tokenA, Negative = tokenB;
   function getSwapAmount(int256 RES_A, int256 RES_B, int256 TKN_A_AMT, int256 TKN_B_AMT, int256 fee) public view returns (int256 result) {
      // Check to see if you need to re-call the function with the inputs swapped
      if (TKN_A_AMT * RES_B >= TKN_B_AMT * RES_A) {
         // Inputs are ok as-is
         int resultOld;
         int resultOutOld;
         int resultAfterFee;
         int XA = RES_A + TKN_A_AMT;
         int YB = RES_B + TKN_B_AMT;
         int resultOut;
         int diffResult;

         // Magical math
         // TODO: Dennis add comments and re-check math
         for (uint i = 0; i < 100; i++) {
            result = (result + (TKN_A_AMT - (resultOutOld + TKN_B_AMT) * XA / YB)) >> 1;

            // Stop when result converges
            if (result != 0 && (((result - resultOld) * 10000000) / result) != 0) { 
               resultAfterFee = (result * fee) / 10000;
               resultOut = (resultAfterFee * RES_B) / (RES_A + resultAfterFee);
               diffResult = resultOut - resultOutOld;

                // Stop when resultsOut converges
               if (diffResult > -2 && diffResult < 2) break;

               // Otherwise keep looping
               resultOld = result;
               resultOutOld = resultOut;
            } else break;
         } 
      } 
      else {
         // Swap the inputs and try this function again
         result = -getSwapAmount(RES_B, RES_A, TKN_B_AMT, TKN_A_AMT, fee);
      }
   }
   
   /// @notice Solve getSwapAmount
   /// @param RES_A Reserves of token A (not necessarily token0)
   /// @param RES_B Reserves of token B (not necessarily token1)
   /// @param TKN_A_AMT Amount of token A coming in
   /// @param TKN_B_AMT Amount of token B coming in
   /// @return result The amount that needs to be swapped. Positive = tokenA is swapped out, Negative = tokenB is swapped out.
   function getSwapAmountSolve(int256 RES_A, int256 RES_B, int256 TKN_A_AMT, int256 TKN_B_AMT, int256 fee) public view returns (int256 result) {
      if ((TKN_A_AMT * RES_B) > (TKN_B_AMT * RES_A)) {
         result = _getSwapAmountSolve(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee);
         if (result < 0) revert("getSwapAmount 1");
      } else {
         result = -_getSwapAmountSolve(RES_B, RES_A, TKN_B_AMT, TKN_A_AMT, fee);
         if (result > 0) revert("getSwapAmount 2");
      }
   }
   
   /// @notice Solve getSwapAmount (internal)
   /// @param RES_A Reserves of token A (not necessarily token0)
   /// @param RES_B Reserves of token B (not necessarily token1)
   /// @param TKN_A_AMT Amount of token A coming in
   /// @param TKN_B_AMT Amount of token B coming in
   /// @return result The amount that needs to be swapped. Positive = tokenA is swapped out, Negative = tokenB is swapped out.
   function _getSwapAmountSolve(int256 RES_A, int256 RES_B, int256 TKN_A_AMT, int256 TKN_B_AMT, int256 fee) internal pure returns (int256 result) {
      // Magical math
      // TODO: Dennis add comments and re-check math
      int256 a = (fee * (RES_B + TKN_B_AMT)) / 10000;
      int256 b = (((fee + 10000) * (RES_A * (RES_B + TKN_B_AMT))) / 10000);
      int256 c;
      uint div_c;
      { 
         (int256 c1, uint div_c1) = mul(RES_A * RES_A, TKN_B_AMT);
         (int256 c2, uint div_c2) = mul(RES_A * RES_B, TKN_A_AMT);
         if (div_c1 > div_c2) {
            c = (c1-c2) / int256(2 ** (div_c1 - div_c2));
            div_c = div_c1;
         } else if (div_c1 < div_c2) {
            c = c1 / int256(2 ** (div_c2 - div_c1)) - c2;
            div_c = div_c2;
         } else {
            c = c1 - c2;
            div_c = div_c1;
         }
      }
      (int256 b2, uint div_b2) = mul(b, b);
      (int256 ac4, uint div_ac4) = mul(4 * a, c);
      div_ac4 += div_c;
      int s;
      uint div_s;
      if (div_b2 > div_ac4) {
         s = (b2 - ac4) / int256(2 ** (div_b2 - div_ac4));
         div_s = div_b2;
      } else if (div_b2 < div_ac4) {
         s = (b2 / int256(2 ** (div_ac4 - div_b2))) - ac4;
         div_s = div_ac4;
      } else {
         s = b2 - ac4;
         div_s = div_b2;
      }
      
      if (div_s % 2 == 1) {
         s = s / 2;
         div_s++;
      }
      result = (sqrtInt(s) * int256(2 ** (div_s / 2)) - b) / (2 * a);
   }
   
   /// @notice Return the log in base 2
   /// @param val The number to log
   /// @return result The resulting logarithm
   function log2(int256 val) internal pure returns (uint result) {
      result = 1;
      if (val < 0) val =- val;
      if (val > 2 ** 128) {
         result += 128;
         val = val / (2 ** 128);
      }
      if (val > 2 ** 64) {
         result += 64;
         val = val / (2 ** 64);
      }
      if (val > 2 ** 32) {
         result += 32;
         val = val / (2 ** 32);
      }
      if (val > 2 ** 16) {
         result += 16;
         val = val / (2 ** 16);
      }
      if (val > 2 ** 8) {
         result += 8;
         val = val / (2 ** 8);
      }
      if (val > 2 ** 4) {
         result += 4;
         val = val / (2 ** 4);
      }
      if (val > 2 ** 2) {
         result += 2;
         val = val / (2 ** 2);
      }
      if (val > 2) {
         result += 1;
      }      
   }
   
   /// @notice Computes square roots using the Babylonian method. Casts an int to a uint
   /// @param y The number to root
   /// @return int The resulting root
   // https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method
   function sqrtInt(int y) internal pure returns (int) {
      return int(sqrt(uint(y)));
   }

   /// @notice Computes square roots using the Babylonian method
   /// @param y The number to root
   /// @return z The resulting root
   // https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method
   function sqrt(uint y) internal pure returns (uint z) {
      if (y > 3) {
         z = y;
         uint x = y / 2 + 1;
         while (x < z) {
            z = x;
            x = (y / x + x) / 2;
         }
      } else if (y != 0) {
         z = 1;
      }
   }

   /// @notice Multiply some numbers using log2
   /// @param a Multiplier
   /// @param b Multiplicand
   /// @return result The multiplication result
   /// @return div TODO: ???
   function mul(int a, int b) internal pure returns (int result, uint div) {
      uint log_a = log2(a);
      uint log_b = log2(b);
      if ((log_a + log_b) > 252) {
         div = log_a + log_b - 252;
         uint div_a = (log_a * div) / (log_a + log_b);
         uint div_b = div - div_a;
         result = (a / int256(2 ** div_a)) * (b / int256(2 ** div_b));
      } else {
         result = a * b;
      }
   }
   

}
