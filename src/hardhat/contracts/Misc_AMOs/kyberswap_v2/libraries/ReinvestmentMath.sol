// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {MathConstants as C} from './MathConstants.sol';
import {FullMath} from './FullMath.sol';

/// @title Contains helper function to calculate the number of reinvestment tokens to be minted
library ReinvestmentMath {
  /// @dev calculate the mint amount with given reinvestL, reinvestLLast, baseL and rTotalSupply
  /// contribution of lp to the increment is calculated by the proportion of baseL with reinvestL + baseL
  /// then rMintQty is calculated by mutiplying this with the liquidity per reinvestment token
  /// rMintQty = rTotalSupply * (reinvestL - reinvestLLast) / reinvestLLast * baseL / (baseL + reinvestL)
  function calcrMintQty(
    uint256 reinvestL,
    uint256 reinvestLLast,
    uint128 baseL,
    uint256 rTotalSupply
  ) internal pure returns (uint256 rMintQty) {
    uint256 lpContribution = FullMath.mulDivFloor(
      baseL,
      reinvestL - reinvestLLast,
      baseL + reinvestL
    );
    rMintQty = FullMath.mulDivFloor(rTotalSupply, lpContribution, reinvestLLast);
  }
}
