// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.12;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== FraxLendAMO ============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Amirnader Aghayeghazvini: https://github.com/amirnader-ghazvini

// Reviewer(s) / Contributor(s)


import "../../Math/SafeMath.sol";
import "../../ERC20/IERC20.sol";
import "../../Staking/Owned.sol";
import "../../Frax/IFraxAMOMinter.sol";
import "../../FXS/IFxs.sol";
import '../../Uniswap/TransferHelper.sol';
import "../../Frax/IFrax.sol";
// import "hardhat/console.sol";

import "./frax-lend/IFraxLendPair_Partial.sol";
import "./frax-lend/IFraxLendPairDeployer_Partial.sol";


contract FraxLendAMO is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0
    
    /* ========== STATE VARIABLES ========== */
    address public timelock_address;
    address public custodian_address;

    // FraxLend pairs list
    address[] public fraxlendpairs_array;
    mapping (address => bool) public fraxlendpairs_check;

    // Constants
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs private FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    address private fraxAddress = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    IFraxAMOMinter private amo_minter;

    // Reward Tokens


    // FraxLend Addresses
    IFraxLendPairDeployer_Partial private FraxLendPairDeployer;
    
    // iOracle address

    
    // Important Addresses Related to Frax Lend
    
    // Settings 
    uint256 private constant PRICE_PRECISION = 1e6;

    /* ========== CONSTRUCTOR ========== */
    
    /// @notice FraxLend AMO Constructor
    /// @param _owner_address owner address
    /// @param _amo_minter_address AMO minter address
    /// @param fraxlendpair_deployer_address address of FraxLendPairDeployer
    constructor (
        address _owner_address,
        address _amo_minter_address,
        address fraxlendpair_deployer_address
    )  Owned(_owner_address){
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        FraxLendPairDeployer = IFraxLendPairDeployer_Partial(fraxlendpair_deployer_address);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "FraxLendAMO: Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "FraxLendAMO: Not owner, tlck, or custd");
        _;
    }

    modifier onlyByMinter() {
        require(msg.sender == address(amo_minter), "FraxLendAMO: Not minter");
        _;
    }

    modifier approvedPair(address _pair) {
        require(fraxlendpairs_check[_pair], "FraxLendAMO: Add FraxLendPair address to AMO");
        _;
    }

    /* ========== VIEWS ========== */

    /// @notice Show allocations of FraxLendAMO in Frax
    /// @return allocations : 
    /// allocations[0] = Unallocated FRAX
    /// allocations[1] = Allocated FRAX
    /// allocations[2] = Total FRAX
    function showAllocations() public view returns (uint256[3] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        // Unallocated FRAX
        allocations[0] = FRAX.balanceOf(address(this)); 
        
        // Allocated FRAX 
        // Frax in Frax Lend Pairs
        for (uint i=0; i < fraxlendpairs_array.length; i++) {
            IFraxLendPair_Partial newFraxLendPair = IFraxLendPair_Partial(fraxlendpairs_array[i]);
            
            uint256 share = newFraxLendPair.balanceOf(address(this));
            allocations[1] = allocations[1] + (fraxlendpairShareToFrax(fraxlendpairs_array[i], share)); 
        }
        // Total FRAX possessed in various forms
        uint256 sum_frax = allocations[0] + allocations[1];
        allocations[2] = sum_frax; 
    }
    
    /// @notice 
    /// @return frax_val_e18 Frax valume 
    /// @return collat_val_e18 Frax collateral valume 
    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[2];
        collat_val_e18 = (frax_val_e18 * FRAX.global_collateral_ratio()) / (PRICE_PRECISION);
    }

    /// @notice For potential Reward incentives in the future
    /// @return reward FXS reward recieved by FraxLendAMO
    function showRewards() external view returns (uint256 reward) {
        reward = FXS.balanceOf(address(this)); // FXS
    }

    /// @notice Backwards compatibility
    /// @return Frax minted balance of the FraxLendAMO
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    /// @notice frax amount converter to fraxlend pair share
    /// @param fraxlendpair_address Address of fraxlendpair
    /// @param frax_amount Amount of Frax
    /// @return share in fraxlendpair
    function fraxToFraxLendPairShare(address fraxlendpair_address, uint256 frax_amount) public approvedPair(fraxlendpair_address) view returns (uint256) {
        IFraxLendPair_Partial newFraxLendPair = IFraxLendPair_Partial(fraxlendpair_address);
        (uint128 total_amount, uint128 total_shares) = newFraxLendPair.totalAsset();
        if (total_amount == 0) {
            return frax_amount;
        } else {
            return (frax_amount * total_shares) / frax_amount;
        }
    }

    /// @notice Fraxlend share to frax amount converter for FraxLendPair
    /// @param fraxlendpair_address Address of fraxlendpair
    /// @param share Share in Fraxlend Pair
    /// @return frax amount
    function fraxlendpairShareToFrax(address fraxlendpair_address, uint256 share) public approvedPair(fraxlendpair_address) view returns (uint256) {
        IFraxLendPair_Partial newFraxLendPair = IFraxLendPair_Partial(fraxlendpair_address);
        (uint128 total_amount, uint128 total_shares) = newFraxLendPair.totalAsset();
        if (total_shares == 0) {
            return share;
        } else {
            return (share * total_amount) / total_shares;
        }
    }

    /* ========== Frax-Lend Pair ========== */


    /// @notice Add new fraxlendpair with Frax as asset address to list 
    /// @param fraxlendpair_address Address of fraxlendpair
    function addPairToList(address fraxlendpair_address) public onlyByOwnGov{
        require(fraxlendpair_address != address(0), "Zero address detected");
        if (fraxlendpairs_check[fraxlendpair_address] == false) {
            IFraxLendPair_Partial newFraxLendPair = IFraxLendPair_Partial(fraxlendpair_address);
            require(address(newFraxLendPair.assetContract()) == fraxAddress, "FraxLendAMO: Fraxlendpair's asset is not frax");
            fraxlendpairs_check[fraxlendpair_address] = true;
            fraxlendpairs_array.push(fraxlendpair_address);
        }
    }

    /// @notice accrue Interest of a FraxLendPair
    /// @param fraxlendpair_address Address of fraxlendpair
    function accrueInterestFraxLendPair(address fraxlendpair_address) public onlyByOwnGov {
        IFraxLendPair_Partial(fraxlendpair_address).addInterest();
    }

    /// @notice  accrue Interest of all whitelisted FraxLendPairs
    function accrueInterestAllFraxLendPair() public onlyByOwnGov {
        for (uint i=0; i < fraxlendpairs_array.length; i++) {
            accrueInterestFraxLendPair(fraxlendpairs_array[i]);
        }
    }

    /// @notice Function to deposit frax to specific FraxLendPair
    /// @param fraxlendpair_address Address of fraxlendpair
    /// @param frax_amount Amount of Frax to be diposited
    function depositToPair(address fraxlendpair_address, uint frax_amount) public approvedPair(fraxlendpair_address) onlyByOwnGov{
        IFraxLendPair_Partial newFraxLendPair = IFraxLendPair_Partial(fraxlendpair_address);
        require(FRAX.balanceOf(address(this)) >= frax_amount , "FraxLendAMO: FraxLendAMO fund is low");
        FRAX.approve(fraxlendpair_address, frax_amount);
        newFraxLendPair.deposit(frax_amount ,address(this));
    }

    /// @notice Function to withdraw frax from specific FraxLendPair
    /// @param fraxlendpair_address Address of fraxlendpair
    /// @param frax_amount Amount of Frax to be withdrawed
    function withdrawFromPair(address fraxlendpair_address, uint frax_amount) public approvedPair(fraxlendpair_address) onlyByOwnGov{
        IFraxLendPair_Partial newFraxLendPair = IFraxLendPair_Partial(fraxlendpair_address);

        uint256 share = fraxToFraxLendPairShare(fraxlendpair_address, frax_amount);
        require(newFraxLendPair.balanceOf(address(this)) >= share , "FraxLendAMO: FraxLendAMO fund is low");
        
        newFraxLendPair.withdraw(frax_amount, address(this), address(this));
    }

    /// @notice Function for creating a new frax lend pair
    /// @param _collateral ERC20 address of collatral 
    /// @param _oracleTop Oracle Address of Asset
    /// @param _oracleDiv Oracle Address of Collateral
    /// @param _oracleNormalization Oracle Normalization
    /// @param _rateContract Interest Rate Contract Address
    /// @param _rateInitCallData calldata
    /// @return New Fraxlend pair Address
    function createNewPair(
        address _collateral,
        address _oracleTop,
        address _oracleDiv,
        uint256 _oracleNormalization,
        address _rateContract,
        bytes calldata _rateInitCallData) public onlyByOwnGov returns (address){
        address cloneAddress = FraxLendPairDeployer.deploy(fraxAddress, _collateral, _oracleTop, _oracleDiv, _oracleNormalization, _rateContract, _rateInitCallData);
        // Input Address to address list
        fraxlendpairs_check[cloneAddress] = true;
        fraxlendpairs_array.push(cloneAddress);
        return cloneAddress;
    }

    /* ========== Burns and givebacks ========== */
   
    /// @notice Burn unneeded or excess FRAX. Goes through the minter
    /// @param frax_amount Amount of Frax to burn
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    /// @notice Change the frax Minter 
    /// @param _amo_minter_address Frax AMO minter
    function setAMOMinter(address _amo_minter_address) external onlyByOwnGov {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Make sure the new addresses are not address(0)
        require(custodian_address != address(0) && timelock_address != address(0), "Invalid custodian or timelock");
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }

    // Generic proxy
    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyByOwnGov returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value:_value}(_data);
        return (success, result);
    }

    
}