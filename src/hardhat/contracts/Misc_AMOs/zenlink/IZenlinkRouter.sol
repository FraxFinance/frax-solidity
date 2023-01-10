// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IZenlinkRouter {
  function WNativeCurrency() external view returns (address);
  function addLiquidity(address token0, address token1, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address to, uint256 deadline) external returns (uint256 amount0, uint256 amount1, uint256 liquidity);
  function addLiquidityNativeCurrency(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountNativeCurrencyMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountNativeCurrency, uint256 liquidity);
  function addLiquiditySingleNativeCurrency(address[] memory path, uint256 amountSwapOut, uint256 nativeCurrencySwapInMax, uint256 nativeCurrencyReserveMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountNativeCurrency, uint256 liquidity);
  function addLiquiditySingleToken(address[] memory path, uint256 amountIn, uint256 amountSwapOut, uint256 amountSwapInMax, uint256 amountInReserveMin, address to, uint256 deadline) external returns (uint256 liquidity);
  function factory() external view returns (address);
  function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountIn);
  function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountOut);
  function getAmountsIn(uint256 amountOut, address[] memory path) external view returns (uint256[] memory amounts);
  function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts);
  function removeLiquidity(address token0, address token1, uint256 liquidity, uint256 amount0Min, uint256 amount1Min, address to, uint256 deadline) external returns (uint256 amount0, uint256 amount1);
  function removeLiquidityNativeCurrency(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountNativeCurrencyMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountNativeCurrency);
  function swapExactNativeCurrencyForTokens(uint256 amountOutMin, address[] memory path, address to, uint256 deadline) external returns (uint256[] memory amounts);
  function swapExactTokensForNativeCurrency(uint256 amountIn, uint256 amountOutMin, address[] memory path, address to, uint256 deadline) external returns (uint256[] memory amounts);
  function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] memory path, address to, uint256 deadline) external returns (uint256[] memory amounts);
  function swapNativeCurrencyForExactTokens(uint256 amountOut, address[] memory path, address to, uint256 deadline) external returns (uint256[] memory amounts);
  function swapTokensForExactNativeCurrency(uint256 amountOut, uint256 amountInMax, address[] memory path, address to, uint256 deadline) external returns (uint256[] memory amounts);
  function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] memory path, address to, uint256 deadline) external returns (uint256[] memory amounts);
}
