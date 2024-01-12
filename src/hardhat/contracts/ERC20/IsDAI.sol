// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IsDAI {
  function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
  function PERMIT_TYPEHASH (  ) external view returns ( bytes32 );
  function allowance ( address, address ) external view returns ( uint256 );
  function approve ( address spender, uint256 value ) external returns ( bool );
  function asset (  ) external view returns ( address );
  function balanceOf ( address ) external view returns ( uint256 );
  function convertToAssets ( uint256 shares ) external view returns ( uint256 );
  function convertToShares ( uint256 assets ) external view returns ( uint256 );
  function dai (  ) external view returns ( address );
  function daiJoin (  ) external view returns ( address );
  function decimals (  ) external view returns ( uint8 );
  function decreaseAllowance ( address spender, uint256 subtractedValue ) external returns ( bool );
  function deploymentChainId (  ) external view returns ( uint256 );
  function deposit ( uint256 assets, address receiver ) external returns ( uint256 shares );
  function increaseAllowance ( address spender, uint256 addedValue ) external returns ( bool );
  function maxDeposit ( address ) external pure returns ( uint256 );
  function maxMint ( address ) external pure returns ( uint256 );
  function maxRedeem ( address owner ) external view returns ( uint256 );
  function maxWithdraw ( address owner ) external view returns ( uint256 );
  function mint ( uint256 shares, address receiver ) external returns ( uint256 assets );
  function name (  ) external view returns ( string memory );
  function nonces ( address ) external view returns ( uint256 );
  function permit ( address owner, address spender, uint256 value, uint256 deadline, bytes memory signature ) external;
  function permit ( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
  function pot (  ) external view returns ( address );
  function previewDeposit ( uint256 assets ) external view returns ( uint256 );
  function previewMint ( uint256 shares ) external view returns ( uint256 );
  function previewRedeem ( uint256 shares ) external view returns ( uint256 );
  function previewWithdraw ( uint256 assets ) external view returns ( uint256 );
  function redeem ( uint256 shares, address receiver, address owner ) external returns ( uint256 assets );
  function symbol (  ) external view returns ( string memory );
  function totalAssets (  ) external view returns ( uint256 );
  function totalSupply (  ) external view returns ( uint256 );
  function transfer ( address to, uint256 value ) external returns ( bool );
  function transferFrom ( address from, address to, uint256 value ) external returns ( bool );
  function vat (  ) external view returns ( address );
  function version (  ) external view returns ( string memory );
  function withdraw ( uint256 assets, address receiver, address owner ) external returns ( uint256 shares );
}
