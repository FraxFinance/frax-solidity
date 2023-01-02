// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ISCREAM {
  function DELEGATION_TYPEHASH() external view returns (bytes32);
  function DOMAIN_TYPEHASH() external view returns (bytes32);
  function allowance(address account, address spender) external view returns (uint256);
  function approve(address spender, uint256 rawAmount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function checkpoints(address, uint32) external view returns (uint32 fromBlock, uint96 votes);
  function decimals() external view returns (uint8);
  function delegate(address delegatee) external;
  function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external;
  function delegates(address) external view returns (address);
  function getCurrentVotes(address account) external view returns (uint96);
  function getPriorVotes(address account, uint256 blockNumber) external view returns (uint96);
  function name() external view returns (string memory);
  function nonces(address) external view returns (uint256);
  function numCheckpoints(address) external view returns (uint32);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address dst, uint256 rawAmount) external returns (bool);
  function transferFrom(address src, address dst, uint256 rawAmount) external returns (bool);
}
