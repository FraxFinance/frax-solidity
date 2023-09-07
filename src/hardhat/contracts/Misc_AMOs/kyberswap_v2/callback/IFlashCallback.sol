// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title Callback for IPool#flash
/// @notice Any contract that calls IPool#flash must implement this interface
interface IFlashCallback {
  /// @notice Called to `msg.sender` after flash loaning to the recipient from IPool#flash.
  /// @dev This function's implementation must send the loaned amounts with computed fee amounts
  /// The caller of this method must be checked to be a Pool deployed by the canonical Factory.
  /// @param feeQty0 The token0 fee to be sent to the pool.
  /// @param feeQty1 The token1 fee to be sent to the pool.
  /// @param data Data passed through by the caller via the IPool#flash call
  function flashCallback(
    uint256 feeQty0,
    uint256 feeQty1,
    bytes calldata data
  ) external;
}
