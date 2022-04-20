// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;


interface IKashiPairMediumRiskV1 {
  function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
  function accrue (  ) external;
  function accrueInfo (  ) external view returns ( uint64 interestPerSecond, uint64 lastAccrued, uint128 feesEarnedFraction );
  function addAsset ( address to, bool skim, uint256 share ) external returns ( uint256 fraction );
  function addCollateral ( address to, bool skim, uint256 share ) external;
  function allowance ( address, address ) external view returns ( uint256 );
  function approve ( address spender, uint256 amount ) external returns ( bool );
  function asset (  ) external view returns ( address );
  function balanceOf ( address ) external view returns ( uint256 );
  function bentoBox (  ) external view returns ( address );
  function borrow ( address to, uint256 amount ) external returns ( uint256 part, uint256 share );
  function claimOwnership (  ) external;
  function collateral (  ) external view returns ( address );
  function cook ( uint8[] calldata actions, uint256[] calldata values, bytes[] calldata datas ) external returns ( uint256 value1, uint256 value2 );
  function decimals (  ) external view returns ( uint8 );
  function exchangeRate (  ) external view returns ( uint256 );
  function feeTo (  ) external view returns ( address );
  function init ( bytes calldata data ) external;
  function liquidate ( address[]  calldata users, uint256[] calldata maxBorrowParts, address to, address swapper, bool open ) external;
  function masterContract (  ) external view returns ( address );
  function name (  ) external view returns ( string memory);
  function nonces ( address ) external view returns ( uint256 );
  function oracle (  ) external view returns ( address );
  function oracleData (  ) external view returns ( bytes calldata);
  function owner (  ) external view returns ( address );
  function pendingOwner (  ) external view returns ( address );
  function permit ( address owner_, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
  function removeAsset ( address to, uint256 fraction ) external returns ( uint256 share );
  function removeCollateral ( address to, uint256 share ) external;
  function repay ( address to, bool skim, uint256 part ) external returns ( uint256 amount );
  function setFeeTo ( address newFeeTo ) external;
  function setSwapper ( address swapper, bool enable ) external;
  function swappers ( address ) external view returns ( bool );
  function symbol (  ) external view returns ( string memory);
  function totalAsset (  ) external view returns ( uint128 elastic, uint128 base );
  function totalBorrow (  ) external view returns ( uint128 elastic, uint128 base );
  function totalCollateralShare (  ) external view returns ( uint256 );
  function totalSupply (  ) external view returns ( uint256 );
  function transfer ( address to, uint256 amount ) external returns ( bool );
  function transferFrom ( address from, address to, uint256 amount ) external returns ( bool );
  function transferOwnership ( address newOwner, bool direct, bool renounce ) external;
  function updateExchangeRate (  ) external returns ( bool updated, uint256 rate );
  function userBorrowPart ( address ) external view returns ( uint256 );
  function userCollateralShare ( address ) external view returns ( uint256 );
  function withdrawFees (  ) external;
}
