//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../interface/IBlockhashProvider.sol";

contract OperatorBlockhashProvider is IBlockhashProvider {
   address immutable public operator;
   mapping(bytes32 => bool) storedHashes;
   
   event BlockhashReceived(bytes32 hash);
   
   constructor(address _operator) {
      operator = _operator;
   }
   
   function receiveBlockHash(bytes32 hash) external {
      if (msg.sender!=operator) revert("Wrong operator");
      storedHashes[hash]=true;
      emit BlockhashReceived(hash);
   }
   
   function hashStored(bytes32 hash) external view returns (bool result) {
      return storedHashes[hash];
   }
}
