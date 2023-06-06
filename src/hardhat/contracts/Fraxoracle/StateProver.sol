//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import {RLPReader} from "./library/RLPReader.sol";
import {StateProofVerifier as Verifier} from "./library/StateProofVerifier.sol";
import "hardhat/console.sol";

contract StateProver {
   using RLPReader for bytes;
   using RLPReader for RLPReader.RLPItem;
   
   function logHash(bytes memory _proofRlpBytes) public {
      console.logBytes(_proofRlpBytes);
      RLPReader.RLPItem memory item = _proofRlpBytes.toRlpItem();
      console.logBytes32(item.rlpBytesKeccak256());
   }   
   
   function proofStorageRoot(bytes32 stateRootHash, address proofAddress, bytes[] memory _proofBytesArray) public view returns (Verifier.Account memory accountPool) {
      RLPReader.RLPItem[] memory proof = new RLPReader.RLPItem[](_proofBytesArray.length);
      for (uint i=0;i<_proofBytesArray.length;i++) proof[i] = _proofBytesArray[i].toRlpItem();
      accountPool = Verifier.extractAccountFromProof(keccak256(abi.encodePacked(proofAddress)), stateRootHash, proof);
   }
   
   function proofStorageSlotValue(bytes32 storageRoot, bytes32 slot, bytes[] memory _proofBytesArray) public view returns (Verifier.SlotValue memory slotValue) {
      RLPReader.RLPItem[] memory proof = new RLPReader.RLPItem[](_proofBytesArray.length);
      for (uint i=0;i<_proofBytesArray.length;i++) proof[i] = _proofBytesArray[i].toRlpItem();
      slotValue = Verifier.extractSlotValueFromProof(keccak256(abi.encodePacked(slot)),storageRoot,proof);
   }
}
