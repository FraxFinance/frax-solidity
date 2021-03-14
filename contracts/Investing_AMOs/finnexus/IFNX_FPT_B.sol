// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import '../../ERC20/IERC20.sol';

// FPT-FRAX: Original at https://etherscan.io/address/0x39ad661bA8a7C9D3A7E4808fb9f9D5223E22F763
// FPT-B (FNX): Original at https://etherscan.io/address/0x7E605Fb638983A448096D82fFD2958ba012F30Cd
// Some functions were omitted for brevity. See the contract for details

interface IFNX_FPT_B is IERC20 {
    /**
     * @dev Retrieve user's start time for burning. 
     *  user user's account.
     */ 
    function getUserBurnTimeLimite(address /*user*/) external view returns (uint256);

    /**
     * @dev Retrieve total locked worth. 
     */ 
    function getTotalLockedWorth() external view returns (uint256);

    /**
     * @dev Retrieve user's locked balance. 
     *  account user's account.
     */ 
    function lockedBalanceOf(address /*account*/) external view returns (uint256);

    /**
     * @dev Retrieve user's locked net worth. 
     *  account user's account.
     */ 
    function lockedWorthOf(address /*account*/) external view returns (uint256);

    /**
     * @dev Retrieve user's locked balance and locked net worth. 
     *  account user's account.
     */ 
    function getLockedBalance(address /*account*/) external view returns (uint256,uint256);

    /**
     * @dev Interface to manager FNX mine pool contract, add miner balance when user has bought some options. 
     *  account user's account.
     *  amount user's pay for buying options, priced in USD.
     */ 
    function addMinerBalance(address /*account*/,uint256 /*amount*/) external;

    /**
     * @dev Move user's FPT to locked balance, when user redeem collateral. 
     *  account user's account.
     *  amount amount of locked FPT.
     *  lockedWorth net worth of locked FPT.
     */ 
    function addlockBalance(address /*account*/, uint256 /*amount*/,uint256 /*lockedWorth*/) external;

    /**
     * @dev burn user's FPT when user redeem FPTCoin. 
     *  account user's account.
     *  amount amount of FPT.
     */ 
    function burn(address /*account*/, uint256 /*amount*/) external;

    /**
     * @dev mint user's FPT when user add collateral. 
     *  account user's account.
     *  amount amount of FPT.
     */ 
    function mint(address /*account*/, uint256 /*amount*/) external;

    /**
     * @dev An interface of redeem locked FPT, when user redeem collateral, only manager contract can invoke. 
     *  account user's account.
     *  tokenAmount amount of FPT.
     *  leftCollateral left available collateral in collateral pool, priced in USD.
     */ 
    function redeemLockedCollateral(address /*account*/,uint256 /*tokenAmount*/,uint256 /*leftCollateral*/) external returns (uint256,uint256);

    // Get the mining pool address
    function getFNXMinePoolAddress() external view returns(address);

    /**
     * @dev FPT has burn time limit. When user's balance is moved in som coins, he will wait `timeLimited` to burn FPT. 
     * latestTransferIn is user's latest time when his balance is moved in.
     */
    function getTimeLimitation() external view returns (uint256);
}
