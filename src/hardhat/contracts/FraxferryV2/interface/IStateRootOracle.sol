// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IStateRootOracle {
   struct BlockInfo {
      bytes32 stateRoot;
      uint32 timestamp;
   }
   function getBlockInfo(uint blockNumber) external view returns (BlockInfo memory);
}