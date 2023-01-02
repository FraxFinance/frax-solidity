// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IDepositToken {
  function allowance(address, address) external view returns (uint256);
  function approve(address _spender, uint256 _value) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function burn(address _from, uint256 _value) external returns (bool);
  function decimals() external view returns (uint8);
  function depositor() external view returns (address);
  function initialize(address _pool) external returns (bool);
  function mint(address _to, uint256 _value) external returns (bool);
  function name() external view returns (string memory);
  function pool() external view returns (address);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address _to, uint256 _value) external returns (bool);
  function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
}

