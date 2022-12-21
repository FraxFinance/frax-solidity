// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

contract OwnerTesting {
  constructor () {}

  function owner() external view returns(address) {}
  function owner_address() external view returns(address) {}
  function controller_address() external view returns(address) {}
  function admin() external view returns(address) {}
  function timelock() external view returns(address) {}
  function timelock_address() external view returns(address) {}
  function custodian() external view returns(address) {}
  function custodian_address() external view returns(address) {}
}