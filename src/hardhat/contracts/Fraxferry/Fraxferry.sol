pragma solidity ^0.8.4;
/*
** Ferry that can be uses to ship tokens to another chain and receive from an other chain
** 
** Modus operandi:
** - User sends tokens to the contract. This transaction is stored in the contract.
** - Captain queries the source chain for transactions to ship.
** - Captain sends batch (start, end, hash) to start the trip
** - Crewmembers check the batch and can dispute it if it is invalid.
** - Non disputed batches can be executed by the first officer by providing the transactions as calldata. 
** - Hash of the transactions must be equal to the hash in the batch.
** - In case there was a fraudulent transaction (a hacker for example), the owner can cancel a single transaction, such that it will not be executed.
** - The owner can manually manage the tokens in the contract and must make sure it has enough funds.
**
** What must happen for a false batch to be executed:
** - Captain is tricked into proposing a batch with a false hash
** - All crewmembers bots are offline/censured/compromised and no one disputes the proposal
**
** Other risks:
** - Reorgs on the source chain. Avoided, by only returning the transactions on the source chain that are at least one hour old.
** - Rollbacks of optimistic rollups. Avoided by running a node.
** - Operators do not have enough time to pause the chain after a fake proposal. Avoided by requiring a minimal amount of time between sending the proposal and executing it.
*/
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract Fraxferry {
   IERC20 immutable public token;
   IERC20 immutable public targetToken;
   uint immutable public chainid;
   uint immutable public targetChain;   
   
   address public owner;
   address public captain;
   address public firstOfficer;
   mapping(address => bool) public crewmembers;

   bool public paused;
   
   uint public MIN_WAIT_PERIOD_ADD=3600; // Minimal 1 hour waiting
   uint public MIN_WAIT_PERIOD_EXECUTE=3600; // Minimal 1 hour waiting
   uint public FEE=1*1e18; // 1 token
   uint immutable public REDUCED_DECIMALS=1e10;
   
   Transaction[] public transactions;
   mapping(uint => bool) public cancelled;
   uint public executeIndex;
   Batch[] public batches;
   
   struct Transaction {
      address user;
      uint64 amount;
      uint32 timestamp;
   }
   
   struct Batch {
      uint64 start;
      uint64 end;
      uint64 departureTime;
      uint64 status;
      bytes32 hash;
   }
   
   struct BatchData {
      uint startTransactionNo;
      Transaction[] transactions;
   }

   constructor(IERC20 _token, uint _chainid, IERC20 _targetToken, uint _targetChain) {
      //require (block.chainid==_chainid,"Wrong chain");
      chainid=_chainid;
      token = _token;
      targetToken = _targetToken;
      owner = msg.sender;
      targetChain = _targetChain;
   }
   
   
   // ############## Events ##############
   
   event Embark(address sender, uint index, uint amount, uint amountAfterFee, uint timestamp);
   event Disembark(uint start, uint end, bytes32 hash); 
   event Depart(uint batchNo,uint start,uint end,bytes32 hash); 
   event RemoveBatch(uint batchNo);
   event DisputeBatch(uint batchNo, bytes32 hash);
   event Cancelled(uint index, bool cancel);
   event Pause(bool paused);
   event SetOwner(address newOwner);
   event SetCaptain(address newCaptain);   
   event SetFirstOfficer(address newFirstOfficer);
   event SetCrewmember(address crewmember,bool set); 
   event SetFee(uint fee);
   event SetMinWaitPeriods(uint minWaitAdd,uint minWaitExecute); 
   
   // ############## Modifiers ##############
   
   modifier isOwner() {
      require (msg.sender==owner,"Not owner");
      _;
   }
   
   modifier isCaptain() {
      require (msg.sender==captain,"Not captain");
      _;
   }
   
   modifier isFirstOfficer() {
      require (msg.sender==firstOfficer,"Not first officer");
      _;
   }   
    
   modifier isCrewmember() {
      require (crewmembers[msg.sender] || msg.sender==owner || msg.sender==captain || msg.sender==firstOfficer,"Not crewmember");
      _;
   }
   
   modifier notPaused() {
      require (!paused,"Paused");
      _;
   } 
   
   // ############## Ferry actions ##############
   
   function embark(uint amount) public notPaused {
      require (amount>FEE,"Amount too low");
      require (amount/REDUCED_DECIMALS<=type(uint64).max,"Amount too high");
      TransferHelper.safeTransferFrom(address(token),msg.sender,address(this),amount);
      uint amountAfterFee = amount-FEE;
      emit Embark(msg.sender,transactions.length,amount,amountAfterFee,block.timestamp);
      transactions.push(Transaction(msg.sender,uint64(amountAfterFee/REDUCED_DECIMALS),uint32(block.timestamp)));   
   }
   
   function depart(uint start, uint end, bytes32 hash) external notPaused isCaptain {
      require ((batches.length==0 && start==0) || (batches.length>0 && start==batches[batches.length-1].end+1),"Wrong start");
      require (end>=start,"Wrong end");
      batches.push(Batch(uint64(start),uint64(end),uint64(block.timestamp),0,hash));
      emit Depart(batches.length-1,start,end,hash);
   }
   
   function disembark(BatchData calldata batchData) external notPaused isFirstOfficer {
      Batch memory batch = batches[executeIndex++];
      require (batch.status==0,"Batch disputed");
      require (batch.start==batchData.startTransactionNo,"Wrong start");
      require (batch.start+batchData.transactions.length-1==batch.end,"Wrong size");
      require (block.timestamp-batch.departureTime>=MIN_WAIT_PERIOD_EXECUTE,"Too soon");
      
      bytes32 hash = keccak256(abi.encodePacked(targetChain, targetToken, chainid, token, batch.start));
      for (uint i=0;i<batchData.transactions.length;++i) {
         if (!cancelled[batch.start+i]) {
            TransferHelper.safeTransfer(address(token),batchData.transactions[i].user,batchData.transactions[i].amount*REDUCED_DECIMALS);
         }
         hash = keccak256(abi.encodePacked(hash, batchData.transactions[i].user,batchData.transactions[i].amount));
      }
      require (batch.hash==hash,"Wrong hash");
      emit Disembark(batch.start,batch.end,hash);
   }
   
   function removeBatches(uint batchNo) external isOwner {
      require (executeIndex<=batchNo,"Batch already executed");
      while (batches.length>batchNo) batches.pop();
      emit RemoveBatch(batchNo);
   }
   
   function disputeBatch(uint batchNo, bytes32 hash) external isCrewmember {
      require (batches[batchNo].hash==hash,"Wrong hash");
      require (executeIndex<=batchNo,"Batch already executed");
      require (batches[batchNo].status==0,"Batch already disputed");
      batches[batchNo].status=1; // Set status on disputed
      _pause(true);
      emit DisputeBatch(batchNo,hash);
   }
   
   function pause() external isCrewmember {
      _pause(true);
   }
   
   function unPause() external isOwner {
      _pause(false);
   }   
   
   function _pause(bool _paused) internal {
      paused=_paused;
      emit Pause(_paused);
   } 
   
   function jettison(uint index, bool cancel) external isOwner {
      require (index>=executeIndex,"Transaction already executed");
      cancelled[index]=cancel;
      emit Cancelled(index,cancel);
   }   
   
   // ############## Parameters management ##############
   
   function setFee(uint _FEE) external isOwner {
      FEE=_FEE;
      emit SetFee(_FEE);
   }
   
   function setMinWaitPeriods(uint _MIN_WAIT_PERIOD_ADD, uint _MIN_WAIT_PERIOD_EXECUTE) external isOwner {
      MIN_WAIT_PERIOD_ADD=_MIN_WAIT_PERIOD_ADD;
      MIN_WAIT_PERIOD_EXECUTE=_MIN_WAIT_PERIOD_EXECUTE;
      emit SetMinWaitPeriods(_MIN_WAIT_PERIOD_ADD, _MIN_WAIT_PERIOD_EXECUTE);
   }
   
   // ############## Roles management ##############
   
   function setOwner(address newOwner) external isOwner {
      require (newOwner!=address(0),"Zero address not allowed");
      owner=newOwner;
      emit SetOwner(newOwner);
   }
   
   function setCaptain(address newCaptain) external isOwner {
      captain=newCaptain;
      emit SetCaptain(newCaptain);
   }
   
   function setFirstOfficer(address newFirstOfficer) external isOwner {
      firstOfficer=newFirstOfficer;
      emit SetFirstOfficer(newFirstOfficer);
   }    
   
   function setCrewmember(address crewmember, bool set) external isOwner {
      crewmembers[crewmember]=set;
      emit SetCrewmember(crewmember,set);
   }   
  
   
   // ############## Token management ##############   
   
   function sendTokens(address receiver, uint amount) external isOwner {
      require (receiver!=address(0),"Zero address not allowed");
      TransferHelper.safeTransfer(address(token),receiver,amount);
   }   
   
   // Generic proxy
   function execute(address _to, uint256 _value, bytes calldata _data) external isOwner returns (bool, bytes memory) {
      (bool success, bytes memory result) = _to.call{value:_value}(_data);
      return (success, result);
   }   
   
   // ############## Views ##############
   function getNextBatch(uint _start, uint max) public view returns (uint start, uint end, bytes32 hash) {
      uint cutoffTime = block.timestamp-MIN_WAIT_PERIOD_ADD;
      if (_start<transactions.length && transactions[_start].timestamp<cutoffTime) {
         start=_start;
         end=start+max-1;
         if (end>=transactions.length) end=transactions.length-1;
         while(transactions[end].timestamp>=cutoffTime) end--;
         hash = getTransactionsHash(start,end);
      }
   }
   
   function getBatchData(uint start, uint end) public view returns (BatchData memory data) {
      data.startTransactionNo = start;
      data.transactions = new Transaction[](end-start+1);
      for (uint i=start;i<=end;++i) {
         data.transactions[i-start]=transactions[i];
      }
   }
   
   function getBatchAmount(uint start, uint end) public view returns (uint totalAmount) {
      for (uint i=start;i<=end;++i) {
         totalAmount+=transactions[i].amount;
      }
      totalAmount*=REDUCED_DECIMALS;
   }
   
   function getTransactionsHash(uint start, uint end) public view returns (bytes32) {
      bytes32 result = keccak256(abi.encodePacked(chainid, token, targetChain, targetToken, uint64(start)));
      for (uint i=start;i<=end;++i) {
         result = keccak256(abi.encodePacked(result, transactions[i].user,transactions[i].amount));
      }
      return result;
   }   
   
   function noTransactions() public view returns (uint) {
      return transactions.length;
   }
   
   function noBatches() public view returns (uint) {
      return batches.length;
   }
}