//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../interface/IBlockhashProvider.sol";

contract TelepathyBlockhashProvider is IBlockhashProvider {
   address public l1Source;
   address deployer;
   address immutable public telepathyRouter;
   mapping(bytes32 => bool) storedHashes;
   
   event BlockhashReceived(bytes32 hash);
   
   constructor(address _telepathyRouter) {
      telepathyRouter = _telepathyRouter;
      deployer = msg.sender;
   }
   
   function init(address _l1Source) external {
      require (msg.sender==deployer);
      require(l1Source==address(0));
      l1Source = _l1Source;
   }
   
   function handleTelepathy(uint32 _sourceChainId, address _senderAddress, bytes calldata _data) external returns (bytes4) {
      require(msg.sender == telepathyRouter);
      require(_senderAddress == l1Source);
      require(_sourceChainId == 1);
      require(_data.length == 32);
      bytes32 hash = bytes32(_data[:32]);
      storedHashes[hash]=true;
      emit BlockhashReceived(hash);
      return TelepathyBlockhashProvider.handleTelepathy.selector;
   }
   
   function hashStored(bytes32 hash) external view returns (bool result) {
      return storedHashes[hash];
   }
}
