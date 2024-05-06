// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IwfrxETH {
  function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
  function allowance ( address, address ) external view returns ( uint256 );
  function approve ( address guy, uint256 wad ) external returns ( bool );
  function balanceOf ( address ) external view returns ( uint256 );
  function decimals (  ) external view returns ( uint8 );
  function deposit (  ) external;
  function eip712Domain (  ) external view returns ( bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions );
  function name (  ) external view returns ( string memory );
  function nonces ( address owner ) external view returns ( uint256 );
  function permit ( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
  function symbol (  ) external view returns ( string memory );
  function totalSupply (  ) external view returns ( uint256 );
  function transfer ( address dst, uint256 wad ) external returns ( bool );
  function transferFrom ( address src, address dst, uint256 wad ) external returns ( bool );
  function withdraw ( uint256 wad ) external;
}
