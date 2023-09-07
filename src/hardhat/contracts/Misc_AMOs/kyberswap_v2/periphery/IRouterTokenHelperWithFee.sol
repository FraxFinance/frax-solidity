// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import './IRouterTokenHelper.sol';

interface IRouterTokenHelperWithFee is IRouterTokenHelper {
  /// @notice Unwraps the contract's WETH balance and sends it to recipient as ETH, with a percentage between
  /// 0 (exclusive), and 1 (inclusive) going to feeRecipient
  /// @dev The minAmount parameter prevents malicious contracts from stealing WETH from users.
  function unwrapWethWithFee(
    uint256 minAmount,
    address recipient,
    uint256 feeUnits,
    address feeRecipient
  ) external payable;

  /// @notice Transfers the full amount of a token held by this contract to recipient, with a percentage between
  /// 0 (exclusive) and 1 (inclusive) going to feeRecipient
  /// @dev The minAmount parameter prevents malicious contracts from stealing the token from users
  function transferAllTokensWithFee(
    address token,
    uint256 minAmount,
    address recipient,
    uint256 feeBips,
    address feeRecipient
  ) external payable;
}
