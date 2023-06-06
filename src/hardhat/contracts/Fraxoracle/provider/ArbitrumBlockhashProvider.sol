//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../interface/IBlockhashProvider.sol";
import "@arbitrum/nitro-contracts/src/libraries/AddressAliasHelper.sol";

contract ArbitrumBlockhashProvider is IBlockhashProvider {
   address immutable public l1Source;
   mapping(bytes32 => bool) storedHashes;
   
   event BlockhashReceived(bytes32 hash);
   
   constructor(address _l1Source) {
      l1Source = _l1Source;
   }
   
   function receiveBlockHash(bytes32 hash) external {
      if (msg.sender!=AddressAliasHelper.applyL1ToL2Alias(l1Source)) revert("Wrong source");
      storedHashes[hash]=true;
      emit BlockhashReceived(hash);
   }
   
   function hashStored(bytes32 hash) external view returns (bool result) {
      return storedHashes[hash];
   }
}
