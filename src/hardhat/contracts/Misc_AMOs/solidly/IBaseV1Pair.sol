// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IBaseV1Pair {

  // Structure to capture time period obervations every 30 minutes, used for local oracles
  struct Observation {
      uint timestamp;
      uint reserve0Cumulative;
      uint reserve1Cumulative;
  }

  function allowance(address, address) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address) external view returns (uint256);
  function blockTimestampLast() external view returns (uint256);
  function burn(address to) external returns (uint256 amount0, uint256 amount1);
  function claimFees() external returns (uint256 claimed0, uint256 claimed1);
  function claimable0(address) external view returns (uint256);
  function claimable1(address) external view returns (uint256);
  function current(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut);
  function currentCumulativePrices() external view returns (uint256 reserve0Cumulative, uint256 reserve1Cumulative, uint256 blockTimestamp);
  function decimals() external view returns (uint8);
  function fees() external view returns (address);
  function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
  function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1, uint256 _blockTimestampLast);
  function index0() external view returns (uint256);
  function index1() external view returns (uint256);
  function lastObservation() external view returns (Observation memory);
  function metadata() external view returns (uint256 dec0, uint256 dec1, uint256 r0, uint256 r1, bool st, address t0, address t1);
  function mint(address to) external returns (uint256 liquidity);
  function name() external view returns (string memory);
  function nonces(address) external view returns (uint256);
  function observationLength() external view returns (uint256);
  function observations(uint256) external view returns (uint256 timestamp, uint256 reserve0Cumulative, uint256 reserve1Cumulative);
  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function prices(address tokenIn, uint256 amountIn, uint256 points) external view returns (uint256[] memory);
  function quote(address tokenIn, uint256 amountIn, uint256 granularity) external view returns (uint256 amountOut);
  function reserve0() external view returns (uint256);
  function reserve0CumulativeLast() external view returns (uint256);
  function reserve1() external view returns (uint256);
  function reserve1CumulativeLast() external view returns (uint256);
  function sample(address tokenIn, uint256 amountIn, uint256 points, uint256 window) external view returns (uint256[] memory);
  function skim(address to) external;
  function stable() external view returns (bool);
  function supplyIndex0(address) external view returns (uint256);
  function supplyIndex1(address) external view returns (uint256);
  function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes memory data) external;
  function symbol() external view returns (string memory);
  function sync() external;
  function token0() external view returns (address);
  function token1() external view returns (address);
  function tokens() external view returns (address, address);
  function totalSupply() external view returns (uint256);
  function transfer(address dst, uint256 amount) external returns (bool);
  function transferFrom(address src, address dst, uint256 amount) external returns (bool);
}
