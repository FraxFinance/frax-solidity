// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "./interface/IBlockhashProvider.sol";
import "./interface/IStateRootOracle.sol";
import {StateProofVerifier as Verifier} from "./library/StateProofVerifier.sol";

contract StateRootOracle is IStateRootOracle {
   mapping (uint => BlockInfo) public blocks;
   uint public minProviders;
   IBlockhashProvider[] public providers;
   address public owner;
   
   event BlockVerified(uint32 blockNumber, uint32 timestamp, bytes32 stateRoot);
   
   constructor(IBlockhashProvider[] memory _providers, uint _minProviders) {
      owner = msg.sender;
      for (uint i=0;i<_providers.length;i++) {
        providers.push(_providers[i]);
      }
      minProviders = _minProviders;
   }
   
   function proofStateRoot(bytes memory _header) external {
      Verifier.BlockHeader memory blockHeader = Verifier.verifyBlockHeader(_header);
      uint count=0;
      for (uint i=0;i<providers.length;i++) {
         if (providers[i].hashStored(blockHeader.hash)) count++;
      }
      if (count<minProviders) revert("Not enough providers");
      blocks[blockHeader.number]=BlockInfo(blockHeader.stateRootHash,uint32(blockHeader.timestamp));
      
      emit BlockVerified(uint32(blockHeader.number), uint32(blockHeader.timestamp), blockHeader.stateRootHash);
   }
   
   function getBlockInfo(uint blockNumber) external view returns (BlockInfo memory) {
      return blocks[blockNumber];
   }
   
   function setMinProviders(uint _minProviders) external {
      if (msg.sender!=owner) revert("Not owner");
      minProviders = _minProviders;
   }
   
   function addProvider(IBlockhashProvider provider) external {
      if (msg.sender!=owner) revert("Not owner");
      providers.push(provider);
   }
   
   function removeProvider(IBlockhashProvider provider) external {
      if (msg.sender!=owner) revert("Not owner");
      for (uint i=0;i<providers.length;i++) {
         if (providers[i]==provider) {
            providers[i] = providers[providers.length - 1];
            providers.pop();
         }
      }
   }   
}