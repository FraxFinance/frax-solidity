//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./library/MerkleTreeProver.sol";
import "hardhat/console.sol";
import "./Fraxoracle.sol";
import "./interface/IStateRootOracle.sol";

contract MerkleProofPriceSource {
   Fraxoracle immutable public fraxoracle;
   IStateRootOracle immutable public stateRootOracle;
   address immutable public L1_ADDRESS;
   
   constructor(Fraxoracle _fraxoracle, IStateRootOracle _stateRootOracle, address _L1_ADDRESS) {
      fraxoracle=_fraxoracle;
      stateRootOracle=_stateRootOracle;
      L1_ADDRESS = _L1_ADDRESS;
   }
   
   function addRoundData(uint blockNumber, bytes[] memory _proofAccount,bytes[][] memory _proofValue) external {
      IStateRootOracle.BlockInfo memory blockInfo = stateRootOracle.getBlockInfo(blockNumber);
      Verifier.Account memory accountPool = MerkleTreeProver.proofStorageRoot(blockInfo.stateRoot, L1_ADDRESS, _proofAccount);
      for (uint i=0;i<_proofValue.length;i+=3) {
         bytes32 slot1 = bytes32(uint(keccak256(abi.encodePacked(uint(0))))+i);
         uint priceLow = uint(MerkleTreeProver.proofStorageSlotValue(accountPool.storageRoot, slot1, _proofValue[i]).value);
         bytes32 slot2 = bytes32(uint(keccak256(abi.encodePacked(uint(0))))+i+1);
         uint priceHigh = uint(MerkleTreeProver.proofStorageSlotValue(accountPool.storageRoot, slot2, _proofValue[i+1]).value);
         bytes32 slot3 = bytes32(uint(keccak256(abi.encodePacked(uint(0))))+i+2);
         uint value3 = uint(MerkleTreeProver.proofStorageSlotValue(accountPool.storageRoot, slot3, _proofValue[i+2]).value);
         bool isBadData = uint8(value3>>32)==1;
         uint32 timestamp = uint32(value3);
         fraxoracle.addRoundData(isBadData, priceLow, priceHigh, timestamp);
      }
   }
}

