// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBridgeImplementation {
  function WETH() external view returns (address);
  function attestToken(address tokenAddress, uint32 nonce) external returns (uint64 sequence);
  function bridgeContracts(uint16 chainId_) external view returns (bytes32);
  function chainId() external view returns (uint16);
  function completeTransfer(bytes calldata encodedVm) external;
  function completeTransferAndUnwrapETH(bytes calldata encodedVm) external;
  function createWrapped(bytes calldata encodedVm) external returns (address token);
//   function encodeAssetMeta(tuple meta) external pure returns (bytes encoded);
  // function encodeTransfer(tuple transfer) external pure returns (bytes encoded);
  function governanceActionIsConsumed(bytes32 hash) external view returns (bool);
  function governanceChainId() external view returns (uint16);
  function governanceContract() external view returns (bytes32);
  function implementation() external view returns (address);
  function isInitialized(address impl) external view returns (bool);
  function isTransferCompleted(bytes32 hash) external view returns (bool);
  function isWrappedAsset(address token) external view returns (bool);
  function outstandingBridged(address token) external view returns (uint256);
  // function parseAssetMeta(bytes encoded) external pure returns (tuple meta);
  // function parseRegisterChain(bytes encoded) external pure returns (tuple chain);
  // function parseTransfer(bytes encoded) external pure returns (tuple transfer);
  // function parseUpgrade(bytes encoded) external pure returns (tuple chain);
  // function registerChain(bytes encodedVM) external;
  function tokenImplementation() external view returns (address);
  function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) external returns (uint64 sequence);
  // function updateWrapped(bytes encodedVm) external returns (address token);
  // function upgrade(bytes encodedVM) external;
  function wormhole() external view returns (address);
  function wrapAndTransferETH(uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) external returns (uint64 sequence);
  function wrappedAsset(uint16 tokenChainId, bytes32 tokenAddress) external view returns (address);
}
