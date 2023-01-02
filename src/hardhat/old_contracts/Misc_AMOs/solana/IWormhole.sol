// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

interface IWormhole {
  function guardian_set_expirity () external view returns (uint32);
  function guardian_set_index () external view returns (uint32);
  function guardian_sets (uint32) external view returns (uint32 expiration_time);
  function isWrappedAsset (address) external view returns (bool);
  function lockAssets (address asset, uint256 amount, bytes32 recipient, uint8 target_chain, uint32 nonce, bool refund_dust) external;
  function lockETH (bytes32 recipient, uint8 target_chain, uint32 nonce) external;
  function wrappedAssetMaster () external view returns (address);
  function wrappedAssets (bytes32) external view returns (address);
}
