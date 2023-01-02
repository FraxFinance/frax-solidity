// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IDeposit {
  function deposit(uint256 amount) payable external;
  function owner() external view returns(address);
  function payout() external;
  function renounceOwnership() external;
  function transferOwnership(address newOwner) external;
  function wallet() external view returns(address);
  function withdraw(address recipient, uint256 amount) external;
}
