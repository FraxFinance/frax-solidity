// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ISpirit {
  function DELEGATION_TYPEHASH() external view returns (bytes32);
  function DOMAIN_TYPEHASH() external view returns (bytes32);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function checkpoints(address, uint32) external view returns (uint32 fromBlock, uint256 votes);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function delegate(address delegatee) external;
  function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external;
  function delegates(address delegator) external view returns (address);
  function getCurrentVotes(address account) external view returns (uint256);
  function getOwner() external view returns (address);
  function getPriorVotes(address account, uint256 blockNumber) external view returns (uint256);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function mint(address _to, uint256 _amount) external;
  function mint(uint256 amount) external returns (bool);
  function name() external view returns (string memory);
  function nonces(address) external view returns (uint256);
  function numCheckpoints(address) external view returns (uint32);
  function owner() external view returns (address);
  function renounceOwnership() external;
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership(address newOwner) external;
}

