// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import '../../ERC20/IERC20.sol';

// Original at https://etherscan.io/address/0x955282b82440F8F69E901380BeF2b603Fba96F3b
// Some functions were omitted for brevity. See the contract for details

interface IFNX_TokenConverter {
    struct lockedReward {
        uint256 startTime; //this tx startTime for locking
        uint256 total;     //record input amount in each lock tx    
        // Have to comment this out to get compiling working here
        // mapping (uint256 => uint256) alloc;//the allocation table
    }
    
    struct lockedIdx {
        uint256 beginIdx;//the first index for user converting input claimable tx index 
        uint256 totalIdx;//the total number for converting tx
    }

    function cfnxAddress() external returns (address); //cfnx token address
    function fnxAddress() external returns (address);  //fnx token address
    function timeSpan() external returns (uint256); //time interval span time ,default one month
    function dispatchTimes() external returns (uint256);    //allocation times,default 6 times
    function txNum() external returns (uint256); //100 times transfer tx 
    function lockPeriod() external returns (uint256);
    function lockedBalances(address) external returns (uint256); //locked balance for each user
    function lockedAllRewards(address, uint256) external returns (lockedReward memory); //converting tx record for each user
    function lockedIndexs(address) external returns (lockedIdx memory); //the converting tx index info
    function getbackLeftFnx(address /*reciever*/) external;
    function setParameter(address /*_cfnxAddress*/,address /*_fnxAddress*/,uint256 /*_timeSpan*/,uint256 /*_dispatchTimes*/,uint256 /*_txNum*/) external;
    function lockedBalanceOf(address /*account*/) external view returns (uint256);
    function inputCfnxForInstallmentPay(uint256 /*amount*/) external;
    function claimFnxExpiredReward() external;
    function getClaimAbleBalance(address) external view returns (uint256);
}

