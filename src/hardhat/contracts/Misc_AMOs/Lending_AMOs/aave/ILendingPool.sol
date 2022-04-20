// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ILendingPool {
  function FLASHLOAN_PREMIUM_TOTAL (  ) external view returns ( uint256 );
  function LENDINGPOOL_REVISION (  ) external view returns ( uint256 );
  function MAX_NUMBER_RESERVES (  ) external view returns ( uint256 );
  function MAX_STABLE_RATE_BORROW_SIZE_PERCENT (  ) external view returns ( uint256 );
  function borrow ( address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf ) external;
  function deposit ( address asset, uint256 amount, address onBehalfOf, uint16 referralCode ) external;
  function finalizeTransfer ( address asset, address from, address to, uint256 amount, uint256 balanceFromBefore, uint256 balanceToBefore ) external;
  function flashLoan ( address receiverAddress, address[] memory assets, uint256[] memory amounts, uint256[] memory modes, address onBehalfOf, bytes memory params, uint16 referralCode ) external;
  function getAddressesProvider (  ) external view returns ( address );
  // function getConfiguration ( address asset ) external view returns ( tuple );
  // function getReserveData ( address asset ) external view returns ( tuple );
  function getReserveNormalizedIncome ( address asset ) external view returns ( uint256 );
  function getReserveNormalizedVariableDebt ( address asset ) external view returns ( uint256 );
  function getReservesList (  ) external view returns ( address[] memory );
  function getUserAccountData ( address user ) external view returns ( uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor );
  // function getUserConfiguration ( address user ) external view returns ( tuple );
  function initReserve ( address asset, address aTokenAddress, address stableDebtAddress, address variableDebtAddress, address interestRateStrategyAddress ) external;
  function initialize ( address provider ) external;
  function liquidationCall ( address collateralAsset, address debtAsset, address user, uint256 debtToCover, bool receiveAToken ) external;
  function paused (  ) external view returns ( bool );
  function rebalanceStableBorrowRate ( address asset, address user ) external;
  function repay ( address asset, uint256 amount, uint256 rateMode, address onBehalfOf ) external returns ( uint256 );
  function setConfiguration ( address asset, uint256 configuration ) external;
  function setPause ( bool val ) external;
  function setReserveInterestRateStrategyAddress ( address asset, address rateStrategyAddress ) external;
  function setUserUseReserveAsCollateral ( address asset, bool useAsCollateral ) external;
  function swapBorrowRateMode ( address asset, uint256 rateMode ) external;
  function withdraw ( address asset, uint256 amount, address to ) external returns ( uint256 );
}
