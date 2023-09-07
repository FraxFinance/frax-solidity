// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title Contains helper function to add or remove uint128 liquidityDelta to uint128 liquidity
library LiqDeltaMath {
  function applyLiquidityDelta(
    uint128 liquidity,
    uint128 liquidityDelta,
    bool isAddLiquidity
  ) internal pure returns (uint128) {
    return isAddLiquidity ? liquidity + liquidityDelta : liquidity - liquidityDelta;
  }
}
