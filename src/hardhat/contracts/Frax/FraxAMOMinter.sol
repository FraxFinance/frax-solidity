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
// =========================== FraxAMOMinter ==========================
// ====================================================================
// globalCollateralValue() in Frax.sol is gassy because of the loop and all of the AMOs attached to it. 
// This minter would be single mint point for all of the AMOs, and would track the collatDollarBalance with a
// state variable after any mint occurs, or manually with a sync() call
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett
// Hameed

import "../Math/SafeMath.sol";
import "./IFrax.sol";
import "../FXS/IFxs.sol";
import "../Frax/Pools/FraxPoolV3.sol";
import "../Frax/Pools/IFraxPool.sol";
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import '../Misc_AMOs/IAMO.sol';

contract FraxAMOMinter is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    IFrax public FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs public FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    ERC20 public collateral_token;
    FraxPoolV3 public pool = FraxPoolV3(0x2fE065e6FFEf9ac95ab39E5042744d695F560729);
    IFraxPool public old_pool = IFraxPool(0x1864Ca3d47AaB98Ee78D11fc9DCC5E7bADdA1c0d);
    address public timelock_address;
    address public custodian_address;

    // Collateral related
    address public collateral_address;
    uint256 public col_idx;

    // AMO addresses
    address[] public amos_array;
    mapping(address => bool) public amos; // Mapping is also used for faster verification

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max amount of collateral the contract can borrow from the FraxPool
    int256 public collat_borrow_cap = int256(10000000e6);

    // Max amount of FRAX and FXS this contract can mint
    int256 public frax_mint_cap = int256(100000000e18);
    int256 public fxs_mint_cap = int256(100000000e18);

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 810000;

    // Frax mint balances
    mapping(address => int256) public frax_mint_balances; // Amount of FRAX the contract minted, by AMO
    int256 public frax_mint_sum = 0; // Across all AMOs

    // Fxs mint balances
    mapping(address => int256) public fxs_mint_balances; // Amount of FXS the contract minted, by AMO
    int256 public fxs_mint_sum = 0; // Across all AMOs

    // Collateral borrowed balances
    mapping(address => int256) public collat_borrowed_balances; // Amount of collateral the contract borrowed, by AMO
    int256 public collat_borrowed_sum = 0; // Across all AMOs

    // FRAX balance related
    uint256 public fraxDollarBalanceStored = 0;

    // Collateral balance related
    uint256 public missing_decimals;
    uint256 public collatDollarBalanceStored = 0;

    // AMO balance corrections
    mapping(address => int256[2]) public correction_offsets_amos;
    // [amo_address][0] = AMO's frax_val_e18
    // [amo_address][1] = AMO's collat_val_e18

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _custodian_address,
        address _timelock_address,
        address _collateral_address,
        address _pool_address
    ) Owned(_owner_address) {
        custodian_address = _custodian_address;
        timelock_address = _timelock_address;

        // Pool related
        pool = FraxPoolV3(_pool_address);

        // Collateral related
        collateral_address = _collateral_address;
        col_idx = pool.collateralAddrToIdx(_collateral_address);
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        missing_decimals = uint(18) - collateral_token.decimals();
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier validAMO(address amo_address) {
        require(amos[amo_address], "Invalid AMO");
        _;
    }

    /* ========== VIEWS ========== */

    function collatDollarBalance() external view returns (uint256) {
        (, uint256 collat_val_e18) = dollarBalances();
        return collat_val_e18;
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = fraxDollarBalanceStored;
        collat_val_e18 = collatDollarBalanceStored;
    }

    function allAMOAddresses() external view returns (address[] memory) {
        return amos_array;
    }

    function allAMOsLength() external view returns (uint256) {
        return amos_array.length;
    }

    function fraxTrackedGlobal() external view returns (int256) {
        return int256(fraxDollarBalanceStored) - frax_mint_sum - (collat_borrowed_sum * int256(10 ** missing_decimals));
    }

    function fraxTrackedAMO(address amo_address) external view returns (int256) {
        (uint256 frax_val_e18, ) = IAMO(amo_address).dollarBalances();
        int256 frax_val_e18_corrected = int256(frax_val_e18) + correction_offsets_amos[amo_address][0];
        return frax_val_e18_corrected - frax_mint_balances[amo_address] - ((collat_borrowed_balances[amo_address]) * int256(10 ** missing_decimals));
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Callable by anyone willing to pay the gas
    function syncDollarBalances() public {
        uint256 total_frax_value_d18 = 0;
        uint256 total_collateral_value_d18 = 0; 
        for (uint i = 0; i < amos_array.length; i++){ 
            // Exclude null addresses
            address amo_address = amos_array[i];
            if (amo_address != address(0)){
                (uint256 frax_val_e18, uint256 collat_val_e18) = IAMO(amo_address).dollarBalances();
                total_frax_value_d18 += uint256(int256(frax_val_e18) + correction_offsets_amos[amo_address][0]);
                total_collateral_value_d18 += uint256(int256(collat_val_e18) + correction_offsets_amos[amo_address][1]);
            }
        }
        fraxDollarBalanceStored = total_frax_value_d18;
        collatDollarBalanceStored = total_collateral_value_d18;
    }

    /* ========== OLD POOL / BACKWARDS COMPATIBILITY ========== */

    function oldPoolRedeem(uint256 frax_amount) external onlyByOwnGov {
        uint256 redemption_fee = old_pool.redemption_fee();
        uint256 col_price_usd = old_pool.getCollateralPrice();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 redeem_amount_E6 = ((frax_amount * (uint256(1e6) - redemption_fee)) / 1e6) / (10 ** missing_decimals);
        uint256 expected_collat_amount = (redeem_amount_E6 * global_collateral_ratio) / 1e6;
        expected_collat_amount = (expected_collat_amount * 1e6) / col_price_usd;

        require((collat_borrowed_sum + int256(expected_collat_amount)) <= collat_borrow_cap, "Borrow cap");
        collat_borrowed_sum += int256(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(old_pool), frax_amount);
        old_pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function oldPoolCollectAndGive(address destination_amo) external onlyByOwnGov validAMO(destination_amo) {
        // Get the amount to be collected
        uint256 collat_amount = old_pool.redeemCollateralBalances(address(this));
        
        // Collect the redemption
        old_pool.collectRedemption();

        // Mark the destination amo's borrowed amount
        collat_borrowed_balances[destination_amo] += int256(collat_amount);

        // Give the collateral to the AMO
        TransferHelper.safeTransfer(collateral_address, destination_amo, collat_amount);

        // Sync
        syncDollarBalances();
    }

    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */
    // Only owner or timelock can call, to limit risk 

    // ------------------------------------------------------------------
    // ------------------------------ FRAX ------------------------------
    // ------------------------------------------------------------------

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFraxForAMO(address destination_amo, uint256 frax_amount) external onlyByOwnGov validAMO(destination_amo) {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the mint cap
        require((frax_mint_sum + frax_amt_i256) <= frax_mint_cap, "Mint cap reached");
        frax_mint_balances[destination_amo] += frax_amt_i256;
        frax_mint_sum += frax_amt_i256;

        // Make sure the FRAX minting wouldn't push the CR down too much
        // This is also a sanity check for the int256 math
        uint256 current_collateral_E18 = FRAX.globalCollateralValue();
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply + frax_amount;
        uint256 new_cr = (current_collateral_E18 * PRICE_PRECISION) / new_frax_supply;
        require(new_cr >= min_cr, "CR would be too low");

        // Mint the FRAX to the AMO
        FRAX.pool_mint(destination_amo, frax_amount);

        // Sync
        syncDollarBalances();
    }

    function burnFraxFromAMO(uint256 frax_amount) external validAMO(msg.sender) {
        int256 frax_amt_i256 = int256(frax_amount);

        // Burn first
        FRAX.pool_burn_from(msg.sender, frax_amount);

        // Then update the balances
        frax_mint_balances[msg.sender] -= frax_amt_i256;
        frax_mint_sum -= frax_amt_i256;

        // Sync
        syncDollarBalances();
    }

    // ------------------------------------------------------------------
    // ------------------------------- FXS ------------------------------
    // ------------------------------------------------------------------

    function mintFxsForAMO(address destination_amo, uint256 fxs_amount) external onlyByOwnGov validAMO(destination_amo) {
        int256 fxs_amt_i256 = int256(fxs_amount);

        // Make sure you aren't minting more than the mint cap
        require((fxs_mint_sum + fxs_amt_i256) <= fxs_mint_cap, "Mint cap reached");
        fxs_mint_balances[destination_amo] += fxs_amt_i256;
        fxs_mint_sum += fxs_amt_i256;

        // Mint the FXS to the AMO
        FXS.pool_mint(destination_amo, fxs_amount);

        // Sync
        syncDollarBalances();
    }

    function burnFxsFromAMO(uint256 fxs_amount) external validAMO(msg.sender) {
        int256 fxs_amt_i256 = int256(fxs_amount);

        // Burn first
        FXS.pool_burn_from(msg.sender, fxs_amount);

        // Then update the balances
        fxs_mint_balances[msg.sender] -= fxs_amt_i256;
        fxs_mint_sum -= fxs_amt_i256;

        // Sync
        syncDollarBalances();
    }

    // ------------------------------------------------------------------
    // --------------------------- Collateral ---------------------------
    // ------------------------------------------------------------------

    function giveCollatToAMO(
        address destination_amo,
        uint256 collat_amount
    ) external onlyByOwnGov validAMO(destination_amo) {
        int256 collat_amount_i256 = int256(collat_amount);

        require((collat_borrowed_sum + collat_amount_i256) <= collat_borrow_cap, "Borrow cap");
        collat_borrowed_balances[destination_amo] += collat_amount_i256;
        collat_borrowed_sum += collat_amount_i256;

        // Borrow the collateral
        pool.amoMinterBorrow(collat_amount);

        // Give the collateral to the AMO
        TransferHelper.safeTransfer(collateral_address, destination_amo, collat_amount);

        // Sync
        syncDollarBalances();
    }

    function receiveCollatFromAMO(uint256 usdc_amount) external validAMO(msg.sender) {
        int256 collat_amt_i256 = int256(usdc_amount);

        // Give back first
        TransferHelper.safeTransferFrom(collateral_address, msg.sender, address(pool), usdc_amount);

        // Then update the balances
        collat_borrowed_balances[msg.sender] -= collat_amt_i256;
        collat_borrowed_sum -= collat_amt_i256;

        // Sync
        syncDollarBalances();
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    // Adds an AMO 
    function addAMO(address amo_address, bool sync_too) public onlyByOwnGov {
        require(amo_address != address(0), "Zero address detected");

        (uint256 frax_val_e18, uint256 collat_val_e18) = IAMO(amo_address).dollarBalances();
        require(frax_val_e18 >= 0 && collat_val_e18 >= 0, "Invalid AMO");

        require(amos[amo_address] == false, "Address already exists");
        amos[amo_address] = true; 
        amos_array.push(amo_address);

        // Mint balances
        frax_mint_balances[amo_address] = 0;
        fxs_mint_balances[amo_address] = 0;
        collat_borrowed_balances[amo_address] = 0;

        // Offsets
        correction_offsets_amos[amo_address][0] = 0;
        correction_offsets_amos[amo_address][1] = 0;

        if (sync_too) syncDollarBalances();

        emit AMOAdded(amo_address);
    }

    // Removes an AMO
    function removeAMO(address amo_address, bool sync_too) public onlyByOwnGov {
        require(amo_address != address(0), "Zero address detected");
        require(amos[amo_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete amos[amo_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < amos_array.length; i++){ 
            if (amos_array[i] == amo_address) {
                amos_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        if (sync_too) syncDollarBalances();

        emit AMORemoved(amo_address);
    }

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setFraxMintCap(uint256 _frax_mint_cap) external onlyByOwnGov {
        frax_mint_cap = int256(_frax_mint_cap);
    }

    function setFxsMintCap(uint256 _fxs_mint_cap) external onlyByOwnGov {
        fxs_mint_cap = int256(_fxs_mint_cap);
    }

    function setCollatBorrowCap(uint256 _collat_borrow_cap) external onlyByOwnGov {
        collat_borrow_cap = int256(_collat_borrow_cap);
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnGov {
        min_cr = _min_cr;
    }

    function setAMOCorrectionOffsets(address amo_address, int256 frax_e18_correction, int256 collat_e18_correction) external onlyByOwnGov {
        correction_offsets_amos[amo_address][0] = frax_e18_correction;
        correction_offsets_amos[amo_address][1] = collat_e18_correction;

        syncDollarBalances();
    }

    function setFraxPool(address _pool_address) external onlyByOwnGov {
        pool = FraxPoolV3(_pool_address);

        // Make sure the collaterals match, or balances could get corrupted
        require(pool.collateralAddrToIdx(collateral_address) == col_idx, "col_idx mismatch");
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        
        emit Recovered(tokenAddress, tokenAmount);
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

    /* ========== EVENTS ========== */

    event AMOAdded(address amo_address);
    event AMORemoved(address amo_address);
    event Recovered(address token, uint256 amount);
}