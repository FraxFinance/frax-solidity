// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================= TruefiAMO ==============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Amirnader Aghayeghazvini: https://github.com/amirnader-ghazvini

// Reviewer(s) / Contributor(s)

import "../../Math/SafeMath.sol";
import "../../FXS/IFxs.sol";
import "../../Frax/IFrax.sol";
import "../../Frax/IFraxAMOMinter.sol";
import "../../ERC20/ERC20.sol";
import "../../Staking/Owned.sol";
import '../../Uniswap/TransferHelper.sol';

import "./truefi/IManagedPortfolio.sol";
import "./truefi/IManagedPortfolioFactory.sol";
import "./truefi/IPoolFactory.sol";
import "./truefi/ITrueFiPool2.sol";
import "./truefi/IStkTruToken.sol";
import "./truefi/ITrueMultiFarm.sol";

contract TruefiAMO is Owned {
    /* ========== STATE VARIABLES ========== */

    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs private FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    ERC20 private USDC = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    IFraxAMOMinter private amo_minter;
    
    address public timelock_address;
    address public custodian_address;

    uint256 private constant PRICE_PRECISION = 1e6;

    // TrueFiPools and ManagedPortfolios 
    
    // address public frax_truefi_pool;
    // address public usdc_truefi_pool;

    ITrueFiPool2 private truefiFRAX_Pool = ITrueFiPool2(0x0000000000000000000000000000000000000000);
    ITrueFiPool2 private truefiUSDC_Pool = ITrueFiPool2(0xA991356d261fbaF194463aF6DF8f0464F8f1c742);
    
    address[] public frax_based_truefi_managedportfolio_array;
    mapping(address => bool) public frax_based_truefi_managedportfolios;

    address[] public usdc_based_truefi_managedportfolio_array;
    mapping(address => bool) public usdc_based_truefi_managedportfolios;

    // Reward Tokens
    ITrueMultiFarm private TruefiFarm = ITrueMultiFarm(0xec6c3FD795D6e6f202825Ddb56E01b3c128b0b10);
    ERC20 private TRU = ERC20(0x4C19596f5aAfF459fA38B0f7eD92F11AE6543784);
    IStkTruToken private stkTRU = IStkTruToken(0x23696914Ca9737466D8553a2d619948f548Ee424);


    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address,
        address[] memory _frax_based_truefi_managedportfolio_array,
        address[] memory _usdc_based_truefi_managedportfolio_array
    ) Owned(_owner_address) {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Set the initial FRAX managed portfolio pools
        frax_based_truefi_managedportfolio_array = _frax_based_truefi_managedportfolio_array;
        for (uint256 i = 0; i < frax_based_truefi_managedportfolio_array.length; i++){ 
            // Set the pools as valid
            frax_based_truefi_managedportfolios[_frax_based_truefi_managedportfolio_array[i]] = true;
        }

        // Set the initial USDC managed portfolio pools
        usdc_based_truefi_managedportfolio_array = _usdc_based_truefi_managedportfolio_array;
        for (uint256 i = 0; i < usdc_based_truefi_managedportfolio_array.length; i++){ 
            // Set the pools as valid
            usdc_based_truefi_managedportfolios[_usdc_based_truefi_managedportfolio_array[i]] = true;
        }

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

    modifier validUSDCManagedPortfolio(address pool_address) {
        require(usdc_based_truefi_managedportfolios[pool_address], "Invalid usdc managedportfolio");
        _;
    }

    modifier validFRAXManagedPortfolio(address pool_address) {
        require(frax_based_truefi_managedportfolios[pool_address], "Invalid frax managedportfolio");
        _;
    }

    /* ========== VIEWS ========== */ 
    // TODO: Add all views related to potfolios

    function balanceInManagedPortfolio(address pool_address) public view returns (uint256) {
        IManagedPortfolio portfolio = IManagedPortfolio(pool_address);
        uint256 lp_token_bal = portfolio.balanceOf(address(this));
        uint256 _totalSupply = portfolio.totalSupply();
        if (_totalSupply == 0) {
            return lp_token_bal;
        } else {
            return lp_token_bal * (portfolio.value()) / _totalSupply;
        }
    }

    function showAllocations() public view returns (uint256[8] memory allocations) {
        // FRAX
        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        
        // Allocated FRAX in core pool
        if (address(truefiFRAX_Pool) == 0x0000000000000000000000000000000000000000) {
            allocations[1] = 0;
        } else {
            uint256 _totalSupply = truefiFRAX_Pool.totalSupply();
            if (_totalSupply == 0) {
                allocations[1] = truefiFRAX_Pool.balanceOf(address(this));
            } else {
                allocations[1] = truefiFRAX_Pool.balanceOf(address(this))*truefiFRAX_Pool.poolValue()/_totalSupply; // Allocated FRAX in core pool
            }     
        }
        // Allocated FRAX in managed portfolios
        uint256 sum_frax_in_managed_portfolio = 0;
        for (uint i = 0; i < frax_based_truefi_managedportfolio_array.length; i++){ 
            address pool_address = frax_based_truefi_managedportfolio_array[i];
            if (frax_based_truefi_managedportfolios[pool_address]){
                sum_frax_in_managed_portfolio = sum_frax_in_managed_portfolio + (balanceInManagedPortfolio(pool_address));
            }
        }
        allocations[2] = sum_frax_in_managed_portfolio; // Allocated FRAX in managed portfolios
        uint256 sum_frax = allocations[0] + allocations[1] + allocations[2];
        allocations[3] = sum_frax; // Total FRAX possessed in various forms
        
        // USDC
        allocations[4] = USDC.balanceOf(address(this)); // Unallocated USDC
        
        // Allocated USDC in core pool
        uint256 _totalSupply_usdcpool = truefiUSDC_Pool.totalSupply();
        if (_totalSupply_usdcpool == 0) {
            allocations[5] = truefiUSDC_Pool.balanceOf(address(this));
        } else {
            allocations[5] = truefiUSDC_Pool.balanceOf(address(this))*truefiUSDC_Pool.poolValue()/_totalSupply_usdcpool; // Allocated USDC in core pool
        }
        // Allocated USDC in managed portfolios
        uint256 sum_usdc_in_managed_portfolio = 0;
        for (uint i = 0; i < usdc_based_truefi_managedportfolio_array.length; i++){ 
            address pool_address = usdc_based_truefi_managedportfolio_array[i];
            if (usdc_based_truefi_managedportfolios[pool_address]){
                sum_usdc_in_managed_portfolio = sum_usdc_in_managed_portfolio + (balanceInManagedPortfolio(pool_address));
            }
        }
        allocations[6] = sum_usdc_in_managed_portfolio; // Allocated USDC in managed portfolios
        uint256 sum_usdc = allocations[4] + allocations[5] + allocations[6];
        allocations[7] = sum_usdc; // Total USDC possessed in various forms

    }

    function dollarBalances() public view returns (uint256 usd_val_e18, uint256 collat_val_e18) {
        usd_val_e18 = showAllocations()[3] + (showAllocations()[7]*(1e12));
        collat_val_e18 = ((showAllocations()[3])*(FRAX.global_collateral_ratio())/(PRICE_PRECISION)) + (showAllocations()[7]*(1e12));
    }

    // For potential Truefi incentives in the future
    function showRewards() external view returns (uint256[2] memory rewards) {
        rewards[0] = stkTRU.balanceOf(address(this)); // stkTRU
        rewards[1] = TRU.balanceOf(address(this)); // TRU
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    // #TODO Backward Compatibality for total Borrowed USDC

    /* ========== Truefi FRAX Pool ========== */

    function setFRAXPool(address pool_address) public onlyByOwnGovCust {
        require(ITrueFiPool2(pool_address).token() == address(FRAX), "Invalid frax pool");
        truefiFRAX_Pool = ITrueFiPool2(pool_address);
    }

    // E18
    function truefiDepositFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(truefiFRAX_Pool), frax_amount);
        truefiFRAX_Pool.join(frax_amount);
    }

    // E18
    function truefiWithdrawFRAX(uint256 trfrax_amount) public onlyByOwnGovCust {
        truefiFRAX_Pool.liquidExit(trfrax_amount);
    }

    /* ========== Truefi USDC Pool ========== */

    function setUSDCPool(address pool_address) public onlyByOwnGovCust {
        require(ITrueFiPool2(pool_address).token() == address(USDC), "Invalid usdc pool");
        truefiUSDC_Pool = ITrueFiPool2(pool_address);
    }

    // E6
    function truefiDepositUSDC(uint256 usdc_amount) public onlyByOwnGovCust {
        USDC.approve(address(truefiUSDC_Pool), usdc_amount);
        truefiUSDC_Pool.join(usdc_amount);
    }

    // E6
    function truefiWithdrawUSDC(uint256 trusdc_amount) public onlyByOwnGovCust {
        truefiUSDC_Pool.liquidExit(trusdc_amount);
    }

    /* ========== Truefi FRAX Managed Portfolio ========== */

    function addFRAXManagedPortfolio(address pool_address) public onlyByOwnGovCust {
        require(pool_address != address(0), "Zero address detected");
        require(frax_based_truefi_managedportfolios[pool_address] == false, "Address already exists");
        require(IManagedPortfolio(pool_address).underlyingToken() == address(FRAX), "Invalid frax portfolio");
        frax_based_truefi_managedportfolio_array.push(pool_address);
        frax_based_truefi_managedportfolios[pool_address] = true;
    }

    function removeFRAXManagedPortfolio(address pool_address) public onlyByOwnGovCust {
        require(frax_based_truefi_managedportfolios[pool_address], "portfolio is already removed");
        frax_based_truefi_managedportfolios[pool_address] = false;
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < frax_based_truefi_managedportfolio_array.length; i++){ 
            if (frax_based_truefi_managedportfolio_array[i] == pool_address) {
                frax_based_truefi_managedportfolio_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // E18
    function truefiDepositManagedPortfolioFRAX(uint256 frax_amount, address pool_address) public onlyByOwnGovCust validFRAXManagedPortfolio(pool_address) {
        FRAX.approve(pool_address, frax_amount);
        uint8 v = 0;
        bytes32 r = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes32 s = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes memory _data = abi.encode(v,r,s);
        IManagedPortfolio(pool_address).deposit(frax_amount, _data);
    }

    // E18
    function truefiWithdrawManagedPortfolioFRAX(uint256 share, address pool_address) public onlyByOwnGovCust validFRAXManagedPortfolio(pool_address){
        uint8 v = 0;
        bytes32 r = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes32 s = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes memory _data = abi.encode(v,r,s);
        IManagedPortfolio(pool_address).withdraw(share, _data);
    }

    /* ========== Truefi USDC Managed Portfolio ========== */

    function addUSDCManagedPortfolio(address pool_address) public onlyByOwnGovCust {
        require(pool_address != address(0), "Zero address detected");
        require(usdc_based_truefi_managedportfolios[pool_address] == false, "Address already exists");
        require(IManagedPortfolio(pool_address).underlyingToken() == address(USDC), "Invalid usdc portfolio");
        
        usdc_based_truefi_managedportfolio_array.push(pool_address);
        usdc_based_truefi_managedportfolios[pool_address] = true;
    }

    function removeUSDCManagedPortfolio(address pool_address) public onlyByOwnGovCust {
        require(usdc_based_truefi_managedportfolios[pool_address], "portfolio is already removed");
        usdc_based_truefi_managedportfolios[pool_address] = false;
        
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < usdc_based_truefi_managedportfolio_array.length; i++){ 
            if (usdc_based_truefi_managedportfolio_array[i] == pool_address) {
                usdc_based_truefi_managedportfolio_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }
    
    // E6
    function truefiDepositManagedPortfolioUSDC(uint256 usdc_amount, address pool_address) public onlyByOwnGovCust validUSDCManagedPortfolio(pool_address) {
        USDC.approve(pool_address, usdc_amount);
        uint8 v = 0;
        bytes32 r = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes32 s = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes memory _data = abi.encode(v,r,s);
        IManagedPortfolio(pool_address).deposit(usdc_amount, _data);
    }

    // E6
    function truefiWithdrawManagedPortfolioUSDC(uint256 share, address pool_address) public onlyByOwnGovCust validUSDCManagedPortfolio(pool_address){
        uint8 v = 0;
        bytes32 r = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes32 s = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bytes memory _data = abi.encode(v,r,s);
        IManagedPortfolio(pool_address).withdraw(share, _data);
    }

    

    /* ========== Burns and givebacks ========== */
   
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    // Burn unneeded FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGovCust {
        FXS.approve(address(amo_minter), fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);
    }

    /* ========== Rewards ========== */

    // TODO All the functions related to rewards
    // Stake LP tokens
    
    // Unstake LP tokens

    // Collect TRU
    function truefiCollect_TRU(bool withdraw_too) public onlyByOwnGovCust {
        address[] memory the_assets = new address[](1);
        the_assets[0] = address(truefiUSDC_Pool);
        // uint256 reward_balance = TruefiFarm.claimable(address(truefiUSDC_Pool), address(this));
        TruefiFarm.claim(the_assets);
        if (withdraw_too){
            withdrawRewards();
        }
    }

    function withdrawRewards() public onlyByOwnGovCust {
        TRU.transfer(msg.sender, TRU.balanceOf(address(this)));
        stkTRU.transfer(msg.sender, stkTRU.balanceOf(address(this)));
    }

    /* ========== Emergency Functions ========== */
    // #TODO Redeem all the liquid funds
   
    
    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

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