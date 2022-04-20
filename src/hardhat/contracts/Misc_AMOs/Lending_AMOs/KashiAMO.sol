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
// ============================= KashiAMO ==============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Amirnader Aghayeghazvini: https://github.com/amirnader-ghazvini

// Reviewer(s) / Contributor(s)


import "../../Math/SafeMath.sol";
import "../../ERC20/IERC20.sol";
import "../../Staking/Owned.sol";
import "../../Frax/IFraxAMOMinter.sol";
import '../../Uniswap/TransferHelper.sol';
import "../../Frax/IFrax.sol";
// import "hardhat/console.sol";

import "./kashi/IOracle.sol";
import "./kashi/IBentoBoxV1.sol";
import "./kashi/IKashiPairMediumRiskV1.sol";


contract KashiAMO is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0
    
    /* ========== STATE VARIABLES ========== */
    address public timelock_address;
    address public custodian_address;

    // Kashipairs list
    address[] public kashipairs_array;
    mapping (address => bool) public kashipairs_check;

    // Constants
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    address private fraxAddress = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    IFraxAMOMinter private amo_minter;
    IBentoBoxV1 private SUSHIBentoBox = IBentoBoxV1(0xF5BCE5077908a1b7370B9ae04AdC565EBd643966);

    // Reward Tokens
    IERC20 private SUSHI = IERC20(0x6B3595068778DD592e39A122f4f5a5cF09C90fE2);

    // Key Kashi Pairs
    IKashiPairMediumRiskV1 private wEthFraxKashiPair = IKashiPairMediumRiskV1(0x9f357F839d8bB4EcC179A20eb10bB77B888686ff);
    
    // iOracle address
    address private iOracleChainlinkAddress = address(wEthFraxKashiPair.oracle());
    
    // Important Addresses Related to Kashi
    address private kashiPairMasterContract = 0x2cBA6Ab6574646Badc84F0544d05059e57a5dc42;
    address private fraxEthChailinkOracleAddress = 0x14d04Fff8D21bd62987a5cE9ce543d2F1edF5D3E;
    
    // Settings for the Medium Risk KashiPair
    uint256 private constant UTILIZATION_PRECISION = 1e18;
    uint256 private constant PRICE_PRECISION = 1e6;

    /* ========== CONSTRUCTOR ========== */
    
    /// @notice Kashi AMO Constructor
    /// @param _owner_address owner address
    /// @param _amo_minter_address AMO minter address
    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address){
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        
        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    modifier onlyByMinter() {
        require(msg.sender == address(amo_minter), "Not minter");
        _;
    }


    /* ========== VIEWS ========== */

    /// @notice Show allocations of KashiAMO in Frax
    /// @return allocations : 
    /// allocations[0] = Unallocated FRAX
    /// allocations[1] = Allocated FRAX
    /// allocations[2] = Total FRAX
    /// TODO: allocations[3] = Total borrowed FRAX
    /// TODO: allocations[4] = Total frax value of collatral for borrowed FRAX
    function showAllocations() public view returns (uint256[3] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        // Unallocated FRAX
        allocations[0] = FRAX.balanceOf(address(this)); 
        
        // Allocated FRAX
        
        // Frax in Bentobox
        // Convert to amount
        allocations[1] = SUSHIBentoBox.toAmount(fraxAddress, SUSHIBentoBox.balanceOf(fraxAddress, address(this)), false); 
        // allocations[3] = 0;
        // Frax in Kashi pairs
        for (uint i=0; i < kashipairs_array.length; i++) {
            IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipairs_array[i]);
            
            uint256 fraction = newKashipair.balanceOf(address(this));
            allocations[1] = allocations[1] + (kashipairFractionToFrax(kashipairs_array[i], fraction)); 

            // TODO: total borrowed FRAX as an extra item in Allocation list
            // (uint256 _totalAsset_elastic, uint256 _totalAsset_base) = newKashipair.totalAsset();
            // (uint128 _totalBorrow_elastic, uint128 _totalBorrow_base) = newKashipair.totalBorrow();
            // uint256 fullAssetAmount = SUSHIBentoBox.toAmount(fraxAddress, _totalAsset_elastic, false) + (_totalBorrow_elastic);
            // uint256 utilization = (uint256(_totalBorrow_elastic) * (UTILIZATION_PRECISION)) / fullAssetAmount;
            // allocations[3] = allocations[3] + ((utilization * kashipairFractionToFrax(kashipairs_array[i], fraction)) / UTILIZATION_PRECISION );

            // TODO: Total frax value of collatral for borrowed FRAX

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
    /// @return reward SUSHI reward recieved by KashiAMO
    function showRewards() external view returns (uint256 reward) {
        reward = SUSHI.balanceOf(address(this)); // SUSHI
    }

    /// @notice Backwards compatibility
    /// @return Frax minted balance of the KashiAMO
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    /// @notice frax amount converter to kashipar fraction
    /// @param kashipair_address Address of kashipair
    /// @param frax_amount Amount of Frax
    /// @return fraction in kashipair
    function fraxToKashipairFraction(address kashipair_address, uint frax_amount) public view returns (uint256) {
        require(kashipairs_check[kashipair_address], "KashiAMO: Add Kashipair address to AMO");
        IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
        uint256 share = SUSHIBentoBox.toShare(fraxAddress, frax_amount, false);
        (uint256 kashipair_totalAsset_elastic, uint256 kashipair_totalAsset_base) = newKashipair.totalAsset();
        if (kashipair_totalAsset_elastic == 0) {
            return share;
        } else {
            return (share * kashipair_totalAsset_base) / kashipair_totalAsset_elastic;
        }
        
    }

    /// @notice Log out all the general informations about a Kashipair
    /// @param kashipair_address Address of kashipair
    /// @param fraction Fraction in kasipair
    /// @return frax amount
    function kashipairFractionToFrax(address kashipair_address, uint fraction) public view returns (uint256) {
        require(kashipairs_check[kashipair_address], "KashiAMO: Add Kashipair address to AMO");
        IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
        (uint256 kashipair_totalAsset_elastic, uint256 kashipair_totalAsset_base) = newKashipair.totalAsset();
        if (kashipair_totalAsset_base == 0) {
            return SUSHIBentoBox.toAmount(fraxAddress, fraction, false);
        } else {
            uint256 share = (fraction * kashipair_totalAsset_elastic) / kashipair_totalAsset_base;
            return SUSHIBentoBox.toAmount(fraxAddress, share, false);
        }
         
    }

    /// @notice getPairGeneralInfo of kashipair
    /// @param kashipair_address Address of kashipair
    /// @return kashipair_important_addresses Important addresses related to KashiAMO
    /// kashipair_important_addresses[0] = Pair Asset Address
    /// kashipair_important_addresses[1] =  Pair Collateral Address
    /// kashipair_important_addresses[2] =  Pair Oracle Address
    /// kashipair_important_addresses[3] =  Bentobox Address
    /// kashipair_important_addresses[4] =  Kashipair Master contract Address
    function getPairGeneralInfo(address kashipair_address) public view returns (address[5] memory kashipair_important_addresses){
        require(kashipairs_check[kashipair_address], "KashiAMO: Add Kashipair address to AMO");
        IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
        kashipair_important_addresses[0] = address(newKashipair.asset()); // Pair Asset Address
        kashipair_important_addresses[1] =  address(newKashipair.collateral()); // Pair Collateral Address
        kashipair_important_addresses[2] =  address(newKashipair.oracle()); // Pair Oracle Address
        kashipair_important_addresses[3] =  address(newKashipair.bentoBox()); // Bentobox Address
        kashipair_important_addresses[4] =  address(wEthFraxKashiPair.masterContract()); // Kashipair Master contract Address
    }


    /// @notice Log out all the financial informations about a Kashipair
    /// @param kashipair_address Address of kashipair
    /// kashipair_financial_info[0] = Interest Per Second
    /// kashipair_financial_info[1] = Fees Earned Fraction
    /// kashipair_financial_info[2] = Total Asset (Bentobox shares hold by the Kashipair)
    /// kashipair_financial_info[3] = Total Asset (Total fractions hold by asset suppliers)
    /// kashipair_financial_info[4] = Total Asset (Total token amount)
    /// kashipair_financial_info[5] = Total token amount to be repaid bt borrowers
    /// kashipair_financial_info[6] = Utilization ratio
    function getPairFinancialInfo(address kashipair_address) public view returns (uint256[7] memory kashipair_financial_info){
        require(kashipairs_check[kashipair_address], "KashiAMO: Add Kashipair address to AMO");
        IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
        (uint64 interestPerSecond,, uint128 feesEarnedFraction)= newKashipair.accrueInfo();
        // Accure info:
        kashipair_financial_info[0] = uint256(interestPerSecond); // Interest Per Second
        kashipair_financial_info[1] = uint256(feesEarnedFraction); // Fees Earned Fraction
        (uint256 _totalAsset_elastic, uint256 _totalAsset_base) = newKashipair.totalAsset();
        kashipair_financial_info[2] = _totalAsset_elastic; // Total Asset (Bentobox shares hold by the Kashipair)
        kashipair_financial_info[3] = _totalAsset_base; // Total Asset (Total fractions hold by asset suppliers)
        kashipair_financial_info[4] = SUSHIBentoBox.toAmount(fraxAddress, _totalAsset_elastic, false); // Total Asset (Total token amount)
        (uint128 _totalBorrow_elastic,) = newKashipair.totalBorrow();
        kashipair_financial_info[5] = uint256(_totalBorrow_elastic); // Total token amount to be repaid bt borrowers
        uint256 fullAssetAmount = SUSHIBentoBox.toAmount(fraxAddress, _totalAsset_elastic, false) + (_totalBorrow_elastic);
        uint256 utilization = (uint256(_totalBorrow_elastic) * (UTILIZATION_PRECISION)) / fullAssetAmount;
        kashipair_financial_info[6] = utilization; // Utilization ratio
    }

    /* ========== KashiPairMediumRiskV1 + BentoBoxV1 ========== */


    /// @notice Add new kashipair with Frax as asset address to list 
    /// @param kashipair_address Address of kashipair
    function addPairToList(address kashipair_address) public onlyByOwnGov{
        require(kashipair_address != address(0), "Zero address detected");
        if (kashipairs_check[kashipair_address] == false) {
            IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
            require(address(newKashipair.asset()) == fraxAddress, "KashiAMO: Kashipair's asset is not frax");
            kashipairs_check[kashipair_address] = true;
            kashipairs_array.push(kashipair_address);
        }
    }

    /// @notice accrue Interest of a Kashipair
    /// @param kashipair_address Address of kashipair
    function accrueInterestKashipair(address kashipair_address) public onlyByOwnGov {
        IKashiPairMediumRiskV1(kashipair_address).accrue();
    }

    /// @notice  accrue Interest of all whitelisted Kashipairs
    function accrueInterestAllKashipair() public onlyByOwnGov {
        for (uint i=0; i < kashipairs_array.length; i++) {
            accrueInterestKashipair(kashipairs_array[i]);
        }
    }

    /// @notice Function to deposit frax to specific kashi pair
    /// @param kashipair_address Address of kashipair
    /// @param frax_amount Amount of Frax to be diposited
    function depositToPair(address kashipair_address, uint frax_amount) public onlyByOwnGov{
        require(kashipairs_check[kashipair_address], "KashiAMO: Add Kashipair address to AMO");
        IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
        uint256 _share = 0;
        require(FRAX.balanceOf(address(this)) >= frax_amount , "KashiAMO: KashiAMO fund is low");
        // Check if we have approve it or not
        if (!SUSHIBentoBox.masterContractApproved(address(newKashipair.masterContract()),address(this))) {
            uint8 v = 0;
            bytes32 r = 0x0000000000000000000000000000000000000000000000000000000000000000;
            bytes32 s = 0x0000000000000000000000000000000000000000000000000000000000000000;
            SUSHIBentoBox.setMasterContractApproval(address(this), address(newKashipair.masterContract()),true,v,r,s);
        }
        FRAX.approve(address(SUSHIBentoBox), frax_amount);
        (, uint256 shareOut) = SUSHIBentoBox.deposit(fraxAddress, address(this), address(this), frax_amount, _share);
        newKashipair.addAsset(address(this),false,shareOut);
    }

    /// @notice Function to withdraw frax from specific kashi pair
    /// @param kashipair_address Address of kashipair
    /// @param frax_amount Amount of Frax to be withdrawed
    function withdrawFromPair(address kashipair_address, uint frax_amount) public onlyByOwnGov{
        require(kashipairs_check[kashipair_address], "KashiAMO: Add Kashipair address to AMO");
        IKashiPairMediumRiskV1 newKashipair = IKashiPairMediumRiskV1(kashipair_address);
        uint256 fraction = fraxToKashipairFraction(kashipair_address, frax_amount);
        require(newKashipair.balanceOf(address(this)) >= fraction , "KashiAMO: KashiAMO fund is low");
        (uint256 share) = newKashipair.removeAsset(address(this), fraction);
        SUSHIBentoBox.withdraw(fraxAddress, address(this), address(this), frax_amount, share);
    }

    /// @notice Function to withdraw frax from BentoBox
    /// @param frax_amount Amount of Frax to be withdrawed
    function withdrawFromBentobox(uint frax_amount) public onlyByOwnGov{
        require(SUSHIBentoBox.toAmount(fraxAddress, SUSHIBentoBox.balanceOf(fraxAddress, address(this)), false) >= frax_amount , "KashiAMO: KashiAMO fund in Bentobox is low");
        uint256 _share = SUSHIBentoBox.toShare(fraxAddress, frax_amount, false);
        SUSHIBentoBox.withdraw(fraxAddress, address(this), address(this), frax_amount, _share);
    }

    /// @notice Function for creating a new kashi pair
    /// @param collateralAddress ERC20 address of collatral coin
    /// @param collatralOracleAddress Chainlink oracle address of collatral/ETH 
    /// @param _decimals Decimals of oracle
    function createNewPair(address collateralAddress, address collatralOracleAddress, uint256 _decimals) public onlyByOwnGov returns (address){
        bytes memory _oracleData = abi.encode(fraxEthChailinkOracleAddress, collatralOracleAddress, _decimals);
        bytes memory _data = abi.encode(collateralAddress, fraxAddress, iOracleChainlinkAddress, _oracleData);
        address cloneAddress = SUSHIBentoBox.deploy(kashiPairMasterContract, _data, true);
        // Input Address to address list
        kashipairs_check[cloneAddress] = true;
        kashipairs_array.push(cloneAddress);
        getPairGeneralInfo(cloneAddress);
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