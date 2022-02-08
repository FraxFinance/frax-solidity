// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IZenlinkPair {
  function MINIMUM_LIQUIDITY() external view returns (uint256);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function burn(address to) external returns (uint256 amount0, uint256 amount1);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function factory() external view returns (address);
  function getReserves() external view returns (uint112 _reserve0, uint112 _reserve1);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function initialize(address _token0, address _token1) external;
  function kLast() external view returns (uint256);
  function mint(address to) external returns (uint256 liquidity);
  function name() external view returns (string memory);
  function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
  function symbol() external view returns (string memory);
  function token0() external view returns (address);
  function token1() external view returns (address);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
