// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IDepositToken {
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function burn(address _from, uint256 _amount) external;
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function mint(address _to, uint256 _amount) external;
  function name() external view returns (string memory);
  function operator() external view returns (address);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
