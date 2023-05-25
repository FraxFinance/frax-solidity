// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "./interface/IStateRootOracle.sol";

contract DummyStateRootOracle is IStateRootOracle {
   mapping (uint => BlockInfo) public blocks;
   function getBlockInfo(uint blockNumber) external view returns (BlockInfo memory) {
      return blocks[blockNumber];
   }
   function setStateRoot(uint blockNumber,bytes32 stateRoot, uint32 timestamp) external {
      blocks[blockNumber]=BlockInfo(stateRoot,timestamp);
   }
}