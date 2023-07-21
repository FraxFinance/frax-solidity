// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IfrxETH {
  function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
  function acceptOwnership (  ) external;
  function addMinter ( address minter_address ) external;
  function allowance ( address owner, address spender ) external view returns ( uint256 );
  function approve ( address spender, uint256 amount ) external returns ( bool );
  function balanceOf ( address account ) external view returns ( uint256 );
  function burn ( uint256 amount ) external;
  function burnFrom ( address account, uint256 amount ) external;
  function decimals (  ) external view returns ( uint8 );
  function decreaseAllowance ( address spender, uint256 subtractedValue ) external returns ( bool );
  function increaseAllowance ( address spender, uint256 addedValue ) external returns ( bool );
  function minter_burn_from ( address b_address, uint256 b_amount ) external;
  function minter_mint ( address m_address, uint256 m_amount ) external;
  function minters ( address ) external view returns ( bool );
  function minters_array ( uint256 ) external view returns ( address );
  function name (  ) external view returns ( string memory );
  function nominateNewOwner ( address _owner ) external;
  function nominatedOwner (  ) external view returns ( address );
  function nonces ( address owner ) external view returns ( uint256 );
  function owner (  ) external view returns ( address );
  function permit ( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
  function removeMinter ( address minter_address ) external;
  function setTimelock ( address _timelock_address ) external;
  function symbol (  ) external view returns ( string memory );
  function timelock_address (  ) external view returns ( address );
  function totalSupply (  ) external view returns ( uint256 );
  function transfer ( address to, uint256 amount ) external returns ( bool );
  function transferFrom ( address from, address to, uint256 amount ) external returns ( bool );
}
