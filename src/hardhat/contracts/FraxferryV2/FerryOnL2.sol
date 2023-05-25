//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

/*
- A captain makes a FRAX deposit on L2
- The captain can withdraw the FRAX, but only after a time delay of 48 hours
- User sends FRAX to the contract on L1 and can specify the max cummulative FRAX. This way they can be sure there is enough FRAX on L2
- User provides proofs of the L1 payment on L2 and gets the FRAX.
*/

import {RLPReader} from "./RLPReader.sol";
import {StateProofVerifier as Verifier} from "./StateProofVerifier.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./interface/IStateRootOracle.sol";
import "hardhat/console.sol";

contract FerryOnL2 {
   using RLPReader for bytes;
   using RLPReader for RLPReader.RLPItem;
   
   IERC20 immutable public token;
   address immutable public L1_ADDRESS;
   IStateRootOracle immutable public stateRootOracle;
   uint constant public EXIT_WAIT_TIME=60*60*24*2; // 48 hours
   mapping(address => CaptainData) public captainData;
   mapping(address => uint32) public captainDisembarked;
   
   uint constant public REDUCED_DECIMALS=1e10;
   
   Transaction[] public transactions;
   struct Transaction {
      address recipient;
      uint amount;
      uint tip;
      uint32 deadline;
      bool done;
   }
   
   struct CaptainData {
      uint balance;
      uint cummAmount;
      uint withdrawAmount;
      uint withdrawTime;
      uint32 index;
   }
   
   event Embark(address indexed sender, uint32 indexed index, uint amount, uint tip, uint timestamp);
   event IncreaseTip(uint32 indexed index,uint tip);
   event Disembark(address indexed captain, uint32 index, address indexed recipient, uint amount);
   
   constructor(address _token, address _L1_ADDRESS, IStateRootOracle _stateRootOracle) {
      token = IERC20(_token);
      L1_ADDRESS = _L1_ADDRESS;
      stateRootOracle = _stateRootOracle;
   }
   
   // ************* L1 => L2
   
   function captainDeposit(uint amount) external {
      CaptainData storage data = captainData[msg.sender];
      TransferHelper.safeTransferFrom(address(token),msg.sender,address(this),amount); 
      data.balance+=amount;
   }
   
   function captainInitiateWithdraw(uint amount) external {
      CaptainData storage data = captainData[msg.sender];
      data.withdrawAmount=amount;
      data.withdrawTime=block.timestamp+EXIT_WAIT_TIME;
   }
   
   function captainWithdraw() external {
      CaptainData storage data = captainData[msg.sender];
      if (block.timestamp<data.withdrawTime) revert("Too soon");
      uint toWithdraw=data.withdrawAmount>data.balance?data.balance:data.withdrawAmount;
      data.balance-=toWithdraw;
      data.withdrawAmount=0;
      TransferHelper.safeTransfer(address(token),msg.sender,toWithdraw);
   }
   
   function disembark(address captain, uint32 index, uint blockNumber, bytes[] memory _proofAccount,bytes[][] memory _proofValue) external {
      IStateRootOracle.BlockInfo memory blockInfo = stateRootOracle.getBlockInfo(blockNumber);
      Verifier.Account memory accountPool = proofStorageRoot(blockInfo.stateRoot, L1_ADDRESS, _proofAccount);
      CaptainData storage data = captainData[captain];
      if (data.index!=index) revert("Wrong index");
      data.index+=uint32(_proofValue.length); 
      for (uint i=0;i<_proofValue.length;i++) {
         bytes32 slot = bytes32(uint(keccak256(abi.encodePacked(keccak256(abi.encodePacked(abi.encode(captain),bytes32(0))))))+index+i);
         uint value = uint(proofStorageSlotValue(accountPool.storageRoot, slot, _proofValue[i]).value);
         if (value==0) revert("Empty slot");
         uint amount = uint64(value>>160)*REDUCED_DECIMALS;
         address recipient = address(uint160(value));
         data.balance-=amount;
         data.cummAmount+=amount;
         emit Disembark(captain,index,recipient,amount);
         TransferHelper.safeTransfer(address(token),recipient,amount);
      }
   }
   
   
   // ************* L2 => L1
   
   function embarkWithRecipient(uint amount, uint tip, address recipient, uint32 deadline) public {
      TransferHelper.safeTransferFrom(address(token),msg.sender,address(this),amount+tip); 
      emit Embark(recipient,uint32(transactions.length),amount,tip,block.timestamp);
      transactions.push(Transaction(recipient,amount,tip,deadline,false));   
   }
   
   function increaseTip(uint32 index, uint tip) external {
      TransferHelper.safeTransferFrom(address(token),msg.sender,address(this),tip); 
      emit IncreaseTip(index,tip);
      transactions[index].tip+=tip;
   }   
   
   function collect(uint32 index, uint blockNumber, bytes[] memory _proofAccount,bytes[] memory _proofValue) external {
      Transaction storage transaction = transactions[index];
      if (transaction.done) revert("Already collected");
      transaction.done=true;
      IStateRootOracle.BlockInfo memory blockInfo = stateRootOracle.getBlockInfo(blockNumber);
      Verifier.Account memory accountPool = proofStorageRoot(blockInfo.stateRoot, L1_ADDRESS, _proofAccount);
      bytes32 hash = keccak256(abi.encodePacked(transaction.amount,transaction.recipient,index));
      bytes32 slot = keccak256(abi.encodePacked(hash,bytes32(uint(1))));
      uint256 value = proofStorageSlotValue(accountPool.storageRoot, slot, _proofValue).value;
      if (value==0) { // Not disembarked, return the funds
         if (blockInfo.timestamp<transaction.deadline) revert("Too soon");
         TransferHelper.safeTransfer(address(token),transaction.recipient,transaction.amount+transaction.tip);
      } else {
         address captain = address(uint160(value));  
         TransferHelper.safeTransfer(address(token),captain,transaction.amount+transaction.tip);
      }
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