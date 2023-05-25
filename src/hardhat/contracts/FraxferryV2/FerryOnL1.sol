//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

contract FerryOnL1 {
   mapping(address => TransactionIn[]) public transactionsIn;
   mapping(bytes32 => address) public transactionsOut;
   
   mapping(address => CaptainInfo) public captains;
   IERC20 immutable public token;
   uint constant public REDUCED_DECIMALS=1e10;
   
   struct TransactionIn {
      address recipient;
      uint64 amount;
      uint32 timestamp;
   }
   struct CaptainInfo {
      uint256 balance;
      uint256 cummulativeAmount;
      uint32 minFee;
      uint32 maxFee;
      uint32 feeRate;
      uint32 newFeeActiveTimestamp;
      uint32 newMinFee;
      uint32 newMaxFee;
      uint32 newFeeRate;
   }
   mapping(address => mapping(address => bool)) fee_exempt_addrs;
   
   event Embark(address indexed sender, uint index, uint amount, uint amountAfterFee, uint timestamp, address indexed captain);
   event Disembark(address indexed captain, uint32 indexed index, address indexed recipient, uint amount);
   
   constructor(address _token) {
      token = IERC20(_token);
   }
   
   // ************* L1 => L2
   function embarkWithRecipient(uint amount, address recipient, address _captain, uint maxCummulativeAmount) public {
      CaptainInfo memory captain = captains[_captain];
      if (captain.cummulativeAmount>maxCummulativeAmount) revert("maxCummulativeAmount");
      if (captain.newFeeActiveTimestamp==0) revert("Captain not active");
      amount = (amount/REDUCED_DECIMALS)*REDUCED_DECIMALS; // Round amount to fit in data structure
      uint fee;
      if (fee_exempt_addrs[_captain][msg.sender]) fee = 0;
      else {
         if (block.timestamp>captain.newFeeActiveTimestamp) fee = Math.min(Math.max(captain.newMinFee,amount*captain.newFeeRate/10000),captain.newMaxFee);
         else fee = Math.min(Math.max(captain.minFee,amount*captain.feeRate/10000),captain.maxFee);
      }
      require (amount>fee,"Amount too low");
      require (amount/REDUCED_DECIMALS<=type(uint64).max,"Amount too high");
      TransferHelper.safeTransferFrom(address(token),msg.sender,address(this),amount); 
      uint64 amountAfterFee = uint64((amount-fee)/REDUCED_DECIMALS);
      emit Embark(recipient,transactionsIn[_captain].length,amount,amountAfterFee*REDUCED_DECIMALS,block.timestamp,_captain);
      transactionsIn[_captain].push(TransactionIn(recipient,amountAfterFee,uint32(block.timestamp)));   
      captains[_captain].cummulativeAmount+=amountAfterFee;
      captains[_captain].balance+=amount;
      
   }
   
   function initCaptain(uint32 _newMinFee, uint32 _newMaxFee, uint32 _newFeeRate) external {
      CaptainInfo storage captain = captains[msg.sender];
      if (captain.newFeeActiveTimestamp>0 && block.timestamp>captain.newFeeActiveTimestamp) {
         captain.minFee=captain.newMinFee;
         captain.maxFee=captain.newMaxFee;
         captain.feeRate=captain.newFeeRate;
      }
      captain.newMinFee = _newMinFee;
      captain.newMaxFee = _newMaxFee;
      captain.newFeeRate = _newFeeRate;
      captain.newFeeActiveTimestamp = uint32(block.timestamp+(captain.newFeeActiveTimestamp==0?0:60*60)); // Updated fee starts in 1 hour, to avoid frontrunning.
   }
   
   function withdraw() external {
      CaptainInfo storage captain = captains[msg.sender];
      uint withdrawAmount=captain.balance;
      captain.balance=0;
      TransferHelper.safeTransfer(address(token),msg.sender,withdrawAmount); 
   }
   
   // ************* L2 => L1
   function disembark(uint amount, address recipient,uint32 index, address captain, uint32 deadline) public {
      if (block.timestamp>=deadline) revert("Deadline");
      bytes32 hash = keccak256(abi.encodePacked(amount,recipient,index));
      if (transactionsOut[hash]!=address(0)) revert("Already disembarked");
      TransferHelper.safeTransferFrom(address(token),msg.sender,recipient,amount); 
      emit Disembark(captain,index,recipient,amount);
      transactionsOut[hash]=captain;
   }
}

