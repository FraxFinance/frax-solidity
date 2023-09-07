// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import {IERC20 as IERC20Duplicate} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/// @title Interface for WETH
interface IWETH is IERC20Duplicate {
  /// @notice Deposit ether to get wrapped ether
  function deposit() external payable;

  /// @notice Withdraw wrapped ether to get ether
  function withdraw(uint256) external;
}
