// SPDX-License-Identifier: agpl-3.0
pragma solidity >= 0.8.0;

import { KyberMathConstants } from './KyberMathConstants.sol';
import { KyberFullMath } from './KyberFullMath.sol';
import { KyberSafeCast } from './KyberSafeCast.sol';

library KyberLiquidityMath {
  using KyberSafeCast for uint256;

  /// @notice Gets liquidity from qty 0 and the price range
  /// qty0 = liquidity * (sqrt(upper) - sqrt(lower)) / (sqrt(upper) * sqrt(lower))
  /// => liquidity = qty0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
  /// @param lowerSqrtP A lower sqrt price
  /// @param upperSqrtP An upper sqrt price
  /// @param qty0 amount of token0
  /// @return liquidity amount of returned liquidity to not exceed the qty0
  function getLiquidityFromQty0(
    uint160 lowerSqrtP,
    uint160 upperSqrtP,
    uint256 qty0
  ) internal pure returns (uint128) {
    uint256 liq = KyberFullMath.mulDivFloor(lowerSqrtP, upperSqrtP, KyberMathConstants.TWO_POW_96);
    unchecked {
      return KyberFullMath.mulDivFloor(liq, qty0, upperSqrtP - lowerSqrtP).toUint128();
    }
  }

  /// @notice Gets liquidity from qty 1 and the price range
  /// @dev qty1 = liquidity * (sqrt(upper) - sqrt(lower))
  ///   thus, liquidity = qty1 / (sqrt(upper) - sqrt(lower))
  /// @param lowerSqrtP A lower sqrt price
  /// @param upperSqrtP An upper sqrt price
  /// @param qty1 amount of token1
  /// @return liquidity amount of returned liquidity to not exceed to qty1
  function getLiquidityFromQty1(
    uint160 lowerSqrtP,
    uint160 upperSqrtP,
    uint256 qty1
  ) internal pure returns (uint128) {
    unchecked {
      return KyberFullMath.mulDivFloor(qty1, KyberMathConstants.TWO_POW_96, upperSqrtP - lowerSqrtP).toUint128();
    }
  }

  /// @notice Gets liquidity given price range and 2 qties of token0 and token1
  /// @param currentSqrtP current price
  /// @param lowerSqrtP A lower sqrt price
  /// @param upperSqrtP An upper sqrt price
  /// @param qty0 amount of token0 - at most
  /// @param qty1 amount of token1 - at most
  /// @return liquidity amount of returned liquidity to not exceed the given qties
  function getLiquidityFromQties(
    uint160 currentSqrtP,
    uint160 lowerSqrtP,
    uint160 upperSqrtP,
    uint256 qty0,
    uint256 qty1
  ) internal pure returns (uint128) {
    if (currentSqrtP <= lowerSqrtP) {
      return getLiquidityFromQty0(lowerSqrtP, upperSqrtP, qty0);
    }
    if (currentSqrtP >= upperSqrtP) {
      return getLiquidityFromQty1(lowerSqrtP, upperSqrtP, qty1);
    }
    uint128 liq0 = getLiquidityFromQty0(currentSqrtP, upperSqrtP, qty0);
    uint128 liq1 = getLiquidityFromQty1(lowerSqrtP, currentSqrtP, qty1);
    return liq0 < liq1 ? liq0 : liq1;
  }
}