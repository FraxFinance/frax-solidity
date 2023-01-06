// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IApeRouter {
  function WETH (  ) external view returns ( address );
  function addLiquidity ( address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline ) external returns ( uint256 amountA, uint256 amountB, uint256 liquidity );
  function addLiquidityETH ( address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline ) external returns ( uint256 amountToken, uint256 amountETH, uint256 liquidity );
  function factory (  ) external view returns ( address );
  function getAmountIn ( uint256 amountOut, uint256 reserveIn, uint256 reserveOut ) external pure returns ( uint256 amountIn );
  function getAmountOut ( uint256 amountIn, uint256 reserveIn, uint256 reserveOut ) external pure returns ( uint256 amountOut );
  function getAmountsIn ( uint256 amountOut, address[] calldata path ) external view returns ( uint256[] memory amounts );
  function getAmountsOut ( uint256 amountIn, address[] calldata path ) external view returns ( uint256[] memory amounts );
  function quote ( uint256 amountA, uint256 reserveA, uint256 reserveB ) external pure returns ( uint256 amountB );
  function removeLiquidity ( address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline ) external returns ( uint256 amountA, uint256 amountB );
  function removeLiquidityETH ( address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline ) external returns ( uint256 amountToken, uint256 amountETH );
  function removeLiquidityETHSupportingFeeOnTransferTokens ( address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline ) external returns ( uint256 amountETH );
  function removeLiquidityETHWithPermit ( address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s ) external returns ( uint256 amountToken, uint256 amountETH );
  function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens ( address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s ) external returns ( uint256 amountETH );
  function removeLiquidityWithPermit ( address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s ) external returns ( uint256 amountA, uint256 amountB );
  function swapETHForExactTokens ( uint256 amountOut, address[] calldata path, address to, uint256 deadline ) external returns ( uint256[] memory amounts );
  function swapExactETHForTokens ( uint256 amountOutMin, address[] calldata path, address to, uint256 deadline ) external returns ( uint256[] memory amounts );
  function swapExactETHForTokensSupportingFeeOnTransferTokens ( uint256 amountOutMin, address[] calldata path, address to, uint256 deadline ) external;
  function swapExactTokensForETH ( uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline ) external returns ( uint256[] memory amounts );
  function swapExactTokensForETHSupportingFeeOnTransferTokens ( uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline ) external;
  function swapExactTokensForTokens ( uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline ) external returns ( uint256[] memory amounts );
  function swapExactTokensForTokensSupportingFeeOnTransferTokens ( uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline ) external;
  function swapTokensForExactETH ( uint256 amountOut, uint256 amountInMax, address[] calldata path, address to, uint256 deadline ) external returns ( uint256[] memory amounts );
  function swapTokensForExactTokens ( uint256 amountOut, uint256 amountInMax, address[] calldata path, address to, uint256 deadline ) external returns ( uint256[] memory amounts );
}
