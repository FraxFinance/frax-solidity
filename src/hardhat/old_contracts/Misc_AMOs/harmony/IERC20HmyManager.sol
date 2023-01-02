// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IERC20HmyManager {
  function mappings(address) external view returns(address);
  function usedEvents_(bytes32) external view returns(bool);
  function wallet() external view returns(address);
  function addToken(address tokenManager, address ethTokenAddr, string memory name, string memory symbol, uint8 decimals) external;
  function removeToken(address tokenManager, address ethTokenAddr) external;
  function burnToken(address oneToken, uint256 amount, address recipient) external;
  function mintToken(address oneToken, uint256 amount, address recipient, bytes32 receiptId) external;
}
