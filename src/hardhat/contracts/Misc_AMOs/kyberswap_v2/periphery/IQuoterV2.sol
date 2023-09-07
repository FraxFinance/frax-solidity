// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma abicoder v2;

/// @title QuoterV2 Interface
/// @notice Supports quoting the calculated amounts from exact input or exact output swaps.
/// @notice For each pool also tells you the number of initialized ticks crossed and the sqrt price of the pool after the swap.
/// @dev These functions are not marked view because they rely on calling non-view functions and reverting
/// to compute the result. They are also not gas efficient and should not be called on-chain.
interface IQuoterV2 {
  struct QuoteOutput {
    uint256 usedAmount;
    uint256 returnedAmount;
    uint160 afterSqrtP;
    uint32 initializedTicksCrossed;
    uint256 gasEstimate;
  }

  /// @notice Returns the amount out received for a given exact input swap without executing the swap
  /// @param path The path of the swap, i.e. each token pair and the pool fee
  /// @param amountIn The amount of the first token to swap
  /// @return amountOut The amount of the last token that would be received
  /// @return afterSqrtPList List of the sqrt price after the swap for each pool in the path
  /// @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
  /// @return gasEstimate The estimate of the gas that the swap consumes
  function quoteExactInput(bytes memory path, uint256 amountIn)
    external
    returns (
      uint256 amountOut,
      uint160[] memory afterSqrtPList,
      uint32[] memory initializedTicksCrossedList,
      uint256 gasEstimate
    );

  struct QuoteExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint24 feeUnits;
    uint160 limitSqrtP;
  }

  /// @notice Returns the amount out received for a given exact input but for a swap of a single pool
  /// @param params The params for the quote, encoded as `QuoteExactInputSingleParams`
  /// tokenIn The token being swapped in
  /// tokenOut The token being swapped out
  /// fee The fee of the token pool to consider for the pair
  /// amountIn The desired input amount
  /// limitSqrtP The price limit of the pool that cannot be exceeded by the swap
  function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
    external
    returns (QuoteOutput memory);

  /// @notice Returns the amount in required for a given exact output swap without executing the swap
  /// @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
  /// @param amountOut The amount of the last token to receive
  /// @return amountIn The amount of first token required to be paid
  /// @return afterSqrtPList List of the sqrt price after the swap for each pool in the path
  /// @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
  /// @return gasEstimate The estimate of the gas that the swap consumes
  function quoteExactOutput(bytes memory path, uint256 amountOut)
    external
    returns (
      uint256 amountIn,
      uint160[] memory afterSqrtPList,
      uint32[] memory initializedTicksCrossedList,
      uint256 gasEstimate
    );

  struct QuoteExactOutputSingleParams {
    address tokenIn;
    address tokenOut;
    uint256 amount;
    uint24 feeUnits;
    uint160 limitSqrtP;
  }

  /// @notice Returns the amount in required to receive the given exact output amount but for a swap of a single pool
  /// @param params The params for the quote, encoded as `QuoteExactOutputSingleParams`
  /// tokenIn The token being swapped in
  /// tokenOut The token being swapped out
  /// fee The fee of the token pool to consider for the pair
  /// amountOut The desired output amount
  /// limitSqrtP The price limit of the pool that cannot be exceeded by the swap
  function quoteExactOutputSingle(QuoteExactOutputSingleParams memory params)
    external
    returns (QuoteOutput memory);
}
