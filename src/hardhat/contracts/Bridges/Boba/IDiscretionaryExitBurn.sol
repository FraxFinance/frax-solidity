// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IDiscretionaryExitBurn {
  function burnAndWithdraw(address _l2Token, uint256 _amount, uint32 _l1Gas, bytes calldata _data) external payable;
}
