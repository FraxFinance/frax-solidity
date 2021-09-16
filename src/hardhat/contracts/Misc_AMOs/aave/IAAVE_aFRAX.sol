// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
import '../../ERC20/IERC20.sol';

// Address [0xd4937682df3c8aef4fe912a96a74121c0829e664] used is a proxy
// Some functions were omitted for brevity. See the contract for details

interface IAAVE_aFRAX is IERC20  {
  function ATOKEN_REVISION() external view returns (uint256);
  function DOMAIN_SEPARATOR() external view returns (bytes32);
  function EIP712_REVISION() external view returns (bytes memory);
  function PERMIT_TYPEHASH() external view returns (bytes32);
  function POOL() external view returns (address);
  function RESERVE_TREASURY_ADDRESS() external view returns (address);
  function UINT_MAX_VALUE() external view returns (uint256);
  function UNDERLYING_ASSET_ADDRESS() external view returns (address);
  function _nonces(address) external view returns (uint256);
  function burn(address user, address receiverOfUnderlying, uint256 amount, uint256 index) external;
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function getScaledUserBalanceAndSupply(address user) external view returns (uint256, uint256);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function mint(address user, uint256 amount, uint256 index) external returns (bool);
  function mintToTreasury(uint256 amount, uint256 index) external;
  function name() external view returns (string memory);
  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function scaledBalanceOf(address user) external view returns (uint256);
  function scaledTotalSupply() external view returns (uint256);
  function symbol() external view returns (string memory);
  function transferOnLiquidation(address from, address to, uint256 value) external;
  function transferUnderlyingTo(address target, uint256 amount) external returns (uint256);
}
