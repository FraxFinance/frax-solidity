//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../interface/IInbox.sol";
import "../interface/ITelepathyRouter.sol";

contract TelepathyBlockhashRelay {
   ITelepathyRouter constant public telepathyRouter = ITelepathyRouter(0x41EA857C32c8Cb42EEFa00AF67862eCFf4eB795a);
   address immutable public l2Target;
   uint32 immutable public destinationChainId;

   event BlockhashRelayed(uint indexed blockNo);

   constructor(address _l2Target,uint32 _destinationChainId) {
      l2Target = _l2Target;
      destinationChainId = _destinationChainId;
   }
    
   function relayHash(uint blockNo) external payable returns (uint256 ticketID) {
      bytes32 hash = blockhash(blockNo);
      ticketID = uint(telepathyRouter.send(destinationChainId,l2Target,abi.encodePacked(hash)));
      emit BlockhashRelayed(blockNo);
   }
}