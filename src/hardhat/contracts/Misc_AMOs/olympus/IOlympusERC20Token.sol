// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// OHM
interface IOlympusERC20Token {
  function DOMAIN_SEPARATOR() external view returns (bytes32);
  function PERMIT_TYPEHASH() external view returns (bytes32);
  function _burnFrom(address account_, uint256 amount_) external;
  function addTWAPSource(address newTWAPSourceDexPool_) external;
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function burn(uint256 amount) external;
  function burnFrom(address account_, uint256 amount_) external;
  function changeTWAPEpochPeriod(uint256 newTWAPEpochPeriod_) external;
  function changeTWAPOracle(address newTWAPOracle_) external;
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function mint(address account_, uint256 amount_) external;
  function name() external view returns (string memory);
  function nonces(address owner) external view returns (uint256);
  function owner() external view returns (address);
  function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function removeTWAPSource(address twapSourceToRemove_) external;
  function renounceOwnership() external;
  function setVault(address vault_) external returns (bool);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership(address newOwner_) external;
  function twapEpochPeriod() external view returns (uint256);
  function twapOracle() external view returns (address);
  function vault() external view returns (address);
}