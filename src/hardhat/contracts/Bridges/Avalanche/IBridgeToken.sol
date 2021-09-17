// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBridgeToken {
  function addSupportedChainId(uint256 chainId) external;
  function addSwapToken(address contractAddress, uint256 supplyIncrement) external;
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function burn(uint256 amount) external;
  function burnFrom(address account, uint256 amount) external;
  function chainIds(uint256) external view returns (bool);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function migrateBridgeRole(address newBridgeRoleAddress) external;
  function mint(address to, uint256 amount, address feeAddress, uint256 feeAmount, bytes32 originTxId) external;
  function name() external view returns (string memory);
  function removeSwapToken(address contractAddress, uint256 supplyDecrement) external;
  function swap(address token, uint256 amount) external;
  function swapSupply(address token) external view returns (uint256);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function unwrap(uint256 amount, uint256 chainId) external;
}
