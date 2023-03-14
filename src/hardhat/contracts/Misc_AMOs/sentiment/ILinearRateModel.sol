// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ILinearRateModel {
  function MAX_EXCESS_USAGE_RATIO (  ) external view returns ( uint256 );
  function OPTIMAL_USAGE_RATIO (  ) external view returns ( uint256 );
  function baseRate (  ) external view returns ( uint256 );
  function getBorrowRatePerSecond ( uint256 liquidity, uint256 totalDebt ) external view returns ( uint256 );
  function slope1 (  ) external view returns ( uint256 );
  function slope2 (  ) external view returns ( uint256 );
}
