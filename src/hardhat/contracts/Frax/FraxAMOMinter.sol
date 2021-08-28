// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

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

import "../Math/SafeMath.sol";
import "./IFrax.sol";
import "../FXS/FXS.sol";
import "../Frax/Pools/FraxPoolV3.sol";
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import '../Misc_AMOs/IAMO.sol';

contract FraxAMOMinter is Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    // Core
    IFrax public FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    FRAXShares public FXS = FRAXShares(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    ERC20 public collateral_token;
    FraxPoolV3 public pool;
    address public timelock_address;
    address public custodian_address;

    // Collateral related
    address collateral_address;
    uint256 col_idx;

    // AMO addresses
    address[] public amos_array;
    mapping(address => bool) public amos; // Mapping is also used for faster verification

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max amount of collateral the contract can borrow from the FraxPool
    int256 public collat_borrow_cap = int256(10000000e6);

    // Max amount of FRAX this contract can mint
    int256 public mint_cap = int256(100000000e18);

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 810000;

    // Mint balances
    mapping(address => int256) public mint_balances; // Amount of FRAX the contract minted, by AMO
    int256 public mint_sum = 0; // Across all AMOs

    // Collateral borrowed balances
    mapping(address => int256) public collat_borrowed_balances; // Amount of collateral the contract borrowed, by AMO
    int256 public collat_borrowed_sum = 0; // Across all AMOs
    mapping(address => uint256) public unclaimed_collat;
    uint256 public unclaimed_collat_sum = 0;

    // Frax balance related
    uint256 public fraxDollarBalanceStored = 0;

    // Collateral balance related
    uint256 public missing_decimals;
    uint256 public collatDollarBalanceStored = 0;
    bool public override_collat_balance;
    uint256 public override_collat_balance_amount;

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
        missing_decimals = uint(18).sub(collateral_token.decimals());
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

    // Needed for the Frax contract to function 
    function collatDollarBalance() external view returns (uint256) {
        // Needs to mimic the FraxPool value and return in E18
        // Override is here in case of a brick
        if(override_collat_balance){
            return override_collat_balance_amount;
        }
        else {
            // Saves gas by not having to do the array loop every time
            return collatDollarBalanceStored;
        }
    }

    function allAMOAddresses() external view returns (address[] memory) {
        return amos_array;
    }

    function allAMOsLength() external view returns (uint256) {
        return amos_array.length;
    }

    function unspentProfitGlobal() external view returns (int256) {
        return int256(fraxDollarBalanceStored) - mint_sum - ((collat_borrowed_sum - int256(unclaimed_collat_sum)) * int256(10 ** missing_decimals));
    }

    function amoProfit(address amo_address) external view returns (int256) {
        (uint256 frax_val_e18, ) = IAMO(amo_address).dollarBalances();
        return int256(frax_val_e18) - mint_balances[amo_address] - ((collat_borrowed_balances[amo_address] - int256(unclaimed_collat[amo_address])) * int256(10 ** missing_decimals));
    }
    
    /* ========== PUBLIC FUNCTIONS ========== */

    // Callable by anyone willing to pay the gas
    function syncDollarBalances() public {
        uint256 total_frax_value_d18 = 0;
        uint256 total_collateral_value_d18 = 0; 
        for (uint i = 0; i < amos_array.length; i++){ 
            // Exclude null addresses
            if (amos_array[i] != address(0)){
                (uint256 frax_val_e18, uint256 collat_val_e18) = IAMO(amos_array[i]).dollarBalances();

                total_frax_value_d18 = total_frax_value_d18.add(frax_val_e18);
                total_collateral_value_d18 = total_collateral_value_d18.add(collat_val_e18);
            }
        }
        fraxDollarBalanceStored = total_frax_value_d18;
        collatDollarBalanceStored = total_collateral_value_d18;
    }

    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */
    // Only owner or timelock can call, to limit risk 

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFraxForAMO(address destination_amo, uint256 frax_amount) external onlyByOwnGov validAMO(destination_amo) {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the mint cap
        require((mint_sum + frax_amt_i256) <= mint_cap, "Mint cap reached");
        mint_balances[destination_amo] += frax_amt_i256;
        mint_sum += frax_amt_i256;

        // Make sure the FRAX minting wouldn't push the CR down too much
        // This is also a sanity check for the int256 math
        uint256 current_collateral_E18 = FRAX.globalCollateralValue();
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
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
        mint_balances[msg.sender] -= frax_amt_i256;
        mint_sum -= frax_amt_i256;

        // Sync
        syncDollarBalances();
    }

    function burnFxsFromAMO(uint256 fxs_amount) external validAMO(msg.sender) {
        // Burn
        FXS.pool_burn_from(msg.sender, fxs_amount);
    }

    // This is basically a workaround to transfer USDC from the FraxPool to this investor contract
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called separately later on
    function mintRedeemPart1(
        address destination_amo,
        uint256 frax_amount
    ) external onlyByOwnGov validAMO(destination_amo) {
        //require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(pool.redemption_fee(col_idx)))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(FRAX.global_collateral_ratio()).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(pool.collateral_prices(col_idx));
        int256 expected_collat_amount_i256 = int256(expected_collat_amount);

        require((collat_borrowed_sum + expected_collat_amount_i256) <= collat_borrow_cap, "Borrow cap");
        collat_borrowed_balances[destination_amo] += expected_collat_amount_i256;
        collat_borrowed_sum += expected_collat_amount_i256;
        unclaimed_collat[destination_amo] += expected_collat_amount;
        unclaimed_collat_sum += expected_collat_amount;

        // Mint the FRAX 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFrax(col_idx, frax_amount, 0, 0);

        // Sync
        syncDollarBalances();
    }

    function mintRedeemPart2(address destination_amo) external onlyByOwnGov validAMO(destination_amo) {
        pool.collectRedemption(col_idx);

        // Transfer first
        TransferHelper.safeTransfer(collateral_address, destination_amo, unclaimed_collat[destination_amo]);

        // Then update the balances
        unclaimed_collat_sum -= unclaimed_collat[destination_amo];
        unclaimed_collat[destination_amo] = 0;

        // Sync
        syncDollarBalances();
    }

    function giveBackCollatFromAMO(uint256 usdc_amount) external validAMO(msg.sender) {
        int256 collat_amt_i256 = int256(usdc_amount);

        // Give back first
        TransferHelper.safeTransferFrom(collateral_address, msg.sender, address(pool), usdc_amount);

        // Then update the balances
        collat_borrowed_balances[msg.sender] -= collat_amt_i256;
        collat_borrowed_sum -= collat_amt_i256;

        // Sync
        syncDollarBalances();
    }

    /* ========== Burns and givebacks ========== */

    function burnFXS(uint256 amount) external onlyByOwnGov {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);

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

        mint_balances[amo_address] = 0;
        collat_borrowed_balances[amo_address] = 0;
        unclaimed_collat[amo_address] = 0;

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

    // Only owner or timelock can call
    function setMintCap(uint256 _mint_cap) external onlyByOwnGov {
        mint_cap = int256(_mint_cap);
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnGov {
        min_cr = _min_cr;
    }

    function setOverrideCollatBalance(bool _state, uint256 _balance) external onlyByOwnGov {
        override_collat_balance = _state;
        override_collat_balance_amount = _balance;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event AMOAdded(address amo_address);
    event AMORemoved(address amo_address);
    event Recovered(address token, uint256 amount);
}