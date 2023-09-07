// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title Callback for IPool#mint
/// @notice Any contract that calls IPool#mint must implement this interface
interface IMintCallback {
  /// @notice Called to `msg.sender` after minting liquidity via IPool#mint.
  /// @dev This function's implementation must send pool tokens to the pool for the minted LP tokens.
  /// The caller of this method must be checked to be a Pool deployed by the canonical Factory.
  /// @param deltaQty0 The token0 quantity to be sent to the pool.
  /// @param deltaQty1 The token1 quantity to be sent to the pool.
  /// @param data Data passed through by the caller via the IPool#mint call
  function mintCallback(
    uint256 deltaQty0,
    uint256 deltaQty1,
    bytes calldata data
  ) external;
}
