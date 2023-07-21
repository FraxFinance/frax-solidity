// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IKSReinvestmentTokenPool {
  function allowance ( address owner, address spender ) external view returns ( uint256 );
  function approve ( address spender, uint256 amount ) external returns ( bool );
  function balanceOf ( address account ) external view returns ( uint256 );
  function burn ( int24 tickLower, int24 tickUpper, uint128 qty ) external returns ( uint256 qty0, uint256 qty1, uint256 feeGrowthInsideLast );
  function burnRTokens ( uint256 _qty, bool isLogicalBurn ) external returns ( uint256 qty0, uint256 qty1 );
  function decimals (  ) external view returns ( uint8 );
  function decreaseAllowance ( address spender, uint256 subtractedValue ) external returns ( bool );
  function factory (  ) external view returns ( address );
  function flash ( address recipient, uint256 qty0, uint256 qty1, bytes memory data ) external;
  function getFeeGrowthGlobal (  ) external view returns ( uint256 );
  function getLiquidityState (  ) external view returns ( uint128 baseL, uint128 reinvestL, uint128 reinvestLLast );
  function getPoolState (  ) external view returns ( uint160 sqrtP, int24 currentTick, int24 nearestCurrentTick, bool locked );
  function getPositions ( address owner, int24 tickLower, int24 tickUpper ) external view returns ( uint128 liquidity, uint256 feeGrowthInsideLast );
  function getSecondsPerLiquidityData (  ) external view returns ( uint128 secondsPerLiquidityGlobal, uint32 lastUpdateTime );
  function getSecondsPerLiquidityInside ( int24 tickLower, int24 tickUpper ) external view returns ( uint128 secondsPerLiquidityInside );
  function increaseAllowance ( address spender, uint256 addedValue ) external returns ( bool );
  function initializedTicks ( int24 ) external view returns ( int24 previous, int24 next );
  function maxTickLiquidity (  ) external view returns ( uint128 );
  function mint ( address recipient, int24 tickLower, int24 tickUpper, int24[2] memory ticksPrevious, uint128 qty, bytes memory data ) external returns ( uint256 qty0, uint256 qty1, uint256 feeGrowthInsideLast );
  function name (  ) external view returns ( string memory );
  function poolOracle (  ) external view returns ( address );
  function swap ( address recipient, int256 swapQty, bool isToken0, uint160 limitSqrtP, bytes memory data ) external returns ( int256 deltaQty0, int256 deltaQty1 );
  function swapFeeUnits (  ) external view returns ( uint24 );
  function symbol (  ) external view returns ( string memory );
  function tickDistance (  ) external view returns ( int24 );
  function ticks ( int24 ) external view returns ( uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside, uint128 secondsPerLiquidityOutside );
  function token0 (  ) external view returns ( address );
  function token1 (  ) external view returns ( address );
  function totalSupply (  ) external view returns ( uint256 );
  function transfer ( address recipient, uint256 amount ) external returns ( bool );
  function transferFrom ( address sender, address recipient, uint256 amount ) external returns ( bool );
  function tweakPosZeroLiq ( int24 tickLower, int24 tickUpper ) external returns ( uint256 feeGrowthInsideLast );
  function unlockPool ( uint160 initialSqrtP ) external returns ( uint256 qty0, uint256 qty1 );
}
