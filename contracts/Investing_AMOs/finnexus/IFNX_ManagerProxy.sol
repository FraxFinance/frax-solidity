// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import '../../ERC20/IERC20.sol';

// Original at https://etherscan.io/address/0xa2904Fd151C9d9D634dFA8ECd856E6B9517F9785
// Some functions were omitted for brevity. See the contract for details
// More info: https://github.com/FinNexus/OptionsContract/blob/master/contracts/ManagerContract.sol
// For Collateral Calculations: https://github.com/FinNexus/FinnexusOptionsV1.0/blob/master/contracts/OptionsManager/CollateralCal.sol
// Addresses: https://github.com/FinNexus/FinNexus-Documentation/blob/master/content/developers/smart-contracts.md

interface IFNX_ManagerProxy {
    /**
     * @dev Get the minimum collateral occupation rate.
     */
    function getCollateralRate(address /*collateral*/)external view returns (uint256) ;

    /**
     * @dev Retrieve user's cost of collateral, priced in USD.
     *  user input retrieved account 
     */
    function getUserPayingUsd(address /*user*/)external view returns (uint256);

    /**
     * @dev Retrieve user's amount of the specified collateral.
     *  user input retrieved account 
     *  collateral input retrieved collateral coin address 
     */
    function userInputCollateral(address /*user*/,address /*collateral*/)external view returns (uint256);

    /**
     * @dev Retrieve user's current total worth, priced in USD.
     *  account input retrieve account
     */
    function getUserTotalWorth(address /*account*/)external view returns (uint256);

    /**
     * @dev Retrieve FPTCoin's net worth, priced in USD.
     */
    function getTokenNetworth() external view returns (uint256);

    /**
     * @dev Deposit collateral in this pool from user.
     *  collateral The collateral coin address which is in whitelist.
     *  amount the amount of collateral to deposit.
     */
    function addCollateral(address /*collateral*/,uint256 /*amount*/) external payable;

    /**
     * @dev redeem collateral from this pool, user can input the prioritized collateral,he will get this coin,
     * if this coin is unsufficient, he will get others collateral which in whitelist.
     *  tokenAmount the amount of FPTCoin want to redeem.
     *  collateral The prioritized collateral coin address.
     */
    function redeemCollateral(uint256 /*tokenAmount*/,address /*collateral*/) external;
    
    /**
     * @dev Retrieve user's collateral worth in all collateral coin. 
     * If user want to redeem all his collateral,and the vacant collateral is sufficient,
     * He can redeem each collateral amount in return list.
     *  account the retrieve user's account;
     */
    function calCollateralWorth(address /*account*/)external view returns(uint256[] memory);

    /**
     * @dev Retrieve the occupied collateral worth, multiplied by minimum collateral rate, priced in USD. 
     */
    function getOccupiedCollateral() external view returns(uint256);

    /**
     * @dev Retrieve the available collateral worth, the worth of collateral which can used for buy options, priced in USD. 
     */
    function getAvailableCollateral() external view returns(uint256);

    /**
     * @dev Retrieve the left collateral worth, the worth of collateral which can used for redeem collateral, priced in USD. 
     */
    function getLeftCollateral() external view returns(uint256);

    /**
     * @dev Retrieve the unlocked collateral worth, the worth of collateral which currently used for options, priced in USD. 
     */
    function getUnlockedCollateral() external view returns(uint256);


    /**
     * @dev Retrieve the total collateral worth, priced in USD. 
     */
    function getTotalCollateral() external view returns(uint256);

    /**
     * @dev Retrieve the balance of collateral, the auxiliary function for the total collateral calculation. 
     */
    function getRealBalance(address /*settlement*/)external view returns(int256);
    function getNetWorthBalance(address /*settlement*/)external view returns(uint256);

    /**
     * @dev collateral occupation rate calculation
     *      collateral occupation rate = sum(collateral Rate * collateral balance) / sum(collateral balance)
     */
    function calculateCollateralRate() external view returns (uint256);

    /**
    * @dev retrieve input price valid range rate, thousandths.
    */ 
    function getPriceRateRange() external view returns(uint256,uint256) ;
    
    function getALLCollateralinfo(address /*user*/)external view 
        returns(uint256[] memory,int256[] memory,uint32[] memory,uint32[] memory);
}
