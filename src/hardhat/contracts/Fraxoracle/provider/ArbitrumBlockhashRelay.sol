//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../interface/IInbox.sol";
import "./ArbitrumBlockhashProvider.sol";

contract ArbitrumBlockhashRelay {
   address immutable public l2Target;
   IInbox immutable public inbox;

   event BlockhashRelayed(uint indexed blockNo);

   constructor(address _l2Target, IInbox _inbox) {
      l2Target = _l2Target;
      inbox = _inbox;
   }
    
   function relayHash(uint blockNo, uint256 maxSubmissionCost, uint256 maxGas, uint256 gasPriceBid) external payable returns (uint256 ticketID) {
      bytes32 hash = blockhash(blockNo);
      bytes memory data = abi.encodeWithSelector(ArbitrumBlockhashProvider.receiveBlockHash.selector, hash);
      ticketID = inbox.createRetryableTicket{ value: msg.value }(
         l2Target,
         0,
         maxSubmissionCost,
         msg.sender,
         msg.sender,
         maxGas,
         gasPriceBid,
         data
      );
      emit BlockhashRelayed(blockNo);
    }
}