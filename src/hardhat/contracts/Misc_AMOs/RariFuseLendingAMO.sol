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
// ======================== RariFuseLendingAMO ========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import "./rari/ICErc20Delegator.sol";
import "./rari/IComptroller.sol";

contract RariFuseLendingAMO is Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    // Core
    FRAXStablecoin private FRAX;
    address public timelock_address;
    address public custodian_address;

    // Rari
    address[] public fuse_pools_array;
    mapping(address => bool) public fuse_pools; // Mapping is also used for faster verification

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max amount of FRAX this contract mint
    int256 public mint_cap = int256(1000000e18);

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 820000;

    // Amount the contract borrowed
    int256 public minted_sum_historical = 0;
    int256 public burned_sum_historical = 0;

    // Collateral balance related
    bool public override_collat_balance;
    uint256 public override_collat_balance_amount;

    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _creator_address,
        address _custodian_address,
        address _frax_contract_address,
        address _timelock_address,
        address[] memory _initial_unitrollers,
        address[] memory _initial_fuse_pools
    ) Owned(_creator_address) {
        FRAX = FRAXStablecoin(_frax_contract_address);
        timelock_address = _timelock_address;
        custodian_address = _custodian_address;

        // Set the initial pools and enter markets
        fuse_pools_array = _initial_fuse_pools;
        for (uint256 i = 0; i < fuse_pools_array.length; i++){ 
            // Set the pools as valid
            fuse_pools[_initial_fuse_pools[i]] = true;

            // Enter markets
            address[] memory cTokens = new address[](1);
            cTokens[0] = fuse_pools_array[i];
            IComptroller(_initial_unitrollers[i]).enterMarkets(cTokens);
        }
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnerOrGovernanceOrCustodian() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, timelock, or custodian");
        _;
    }

    modifier validPool(address pool_address) {
        require(fuse_pools[pool_address], "Invalid pool");
        _;
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[3] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
    
        uint256 sum_fuse_pool_tally = 0;
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            // Make sure the pool is enabled first
            address pool_address = fuse_pools_array[i];
            if (fuse_pools[pool_address]){
                sum_fuse_pool_tally = sum_fuse_pool_tally.add(fraxInPoolByPoolIdx(i));
            }
        }
        allocations[1] = sum_fuse_pool_tally;

        allocations[2] = allocations[0].add(allocations[1]); // Total FRAX value
    }

    // Needed for the Frax contract to function 
    function collatDollarBalance() external view returns (uint256) {
        // Needs to mimic the FraxPool value and return in E18
        // Override is here in case of a brick on Rari's side
        if(override_collat_balance){
            return override_collat_balance_amount;
        }
        else {
            return (showAllocations()[2]).mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
        }
    }

    // Helpful for UIs
    function allPoolAddresses() external view returns (address[] memory){
        return fuse_pools_array;
    }

    function poolAddrToIdx(address pool_address) public view returns (uint256) {
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            if (fuse_pools_array[i] == pool_address){
                return i;
            }
        }
        revert("Pool not found");
    }

    function fraxInPoolByPoolIdx(uint256 pool_idx) public view returns (uint256) {
        ICErc20Delegator delegator = ICErc20Delegator(fuse_pools_array[pool_idx]);
        uint256 cToken_bal = delegator.balanceOf(address(this));
        return cToken_bal.mul(delegator.exchangeRateStored()).div(1e18);
    }

    function fraxInPoolByPoolAddr(address pool_address) public view returns (uint256) {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        return fraxInPoolByPoolIdx(pool_idx);
    }
    
    // In FRAX, can be negative
    function mintedBalance() public view returns (int256) {
        return minted_sum_historical - burned_sum_historical;
    }

    // In FRAX, can be negative
    function accumulatedProfit() public view returns (int256) {
        return int256(showAllocations()[2]) - mintedBalance();
    }
    
    /* ========== PUBLIC FUNCTIONS ========== */

    // N/A

    /* ========== RESTRICTED FUNCTIONS, BUT CUSTODIAN CAN CALL ========== */

    // Burn unneeded or excess FRAX
    function burnFRAX(int256 frax_amount) public onlyByOwnerOrGovernanceOrCustodian {
        require(frax_amount > 0, "frax_amount must be positive");
        FRAX.burn(uint256(frax_amount));
        burned_sum_historical = burned_sum_historical + frax_amount;
    }

    /* ---------------------------------------------------- */
    /* ----------------------- Rari ----------------------- */
    /* ---------------------------------------------------- */

    // IComptroller_address can vary
    function enterMarkets(address comptroller_address, address pool_address) validPool(pool_address) public onlyByOwnerOrGovernanceOrCustodian {
        address[] memory cTokens = new address[](1);
        cTokens[0] = pool_address;
        IComptroller(comptroller_address).enterMarkets(cTokens);
    }

    // E18
    function lendToPool(address pool_address, uint256 mint_amount) validPool(pool_address) public onlyByOwnerOrGovernanceOrCustodian {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        FRAX.approve(pool_address, mint_amount);
        ICErc20Delegator(fuse_pools_array[pool_idx]).mint(mint_amount);
    }

    // E18
    function redeemFromPool(address pool_address, uint256 redeem_amount) validPool(pool_address) public onlyByOwnerOrGovernanceOrCustodian {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        ICErc20Delegator(fuse_pools_array[pool_idx]).redeemUnderlying(redeem_amount);
    }

    // Auto compounds interest
    function accrueInterest() public onlyByOwnerOrGovernanceOrCustodian {
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            // Make sure the pool is enabled first
            address pool_address = fuse_pools_array[i];
            if (fuse_pools[pool_address]){
                ICErc20Delegator(fuse_pools_array[i]).accrueInterest();
            }
        }
    }

    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */
    // Only owner or timelock can call, to limit risk 

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFRAXForInvestments(uint256 frax_amount) public onlyByOwnerOrGovernance {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the mint cap
        require((mintedBalance() + frax_amt_i256) <= mint_cap, "Mint cap reached");
        minted_sum_historical = minted_sum_historical + frax_amt_i256;

        // Make sure the current CR isn't already too low
        require (FRAX.global_collateral_ratio() > min_cr, "Collateral ratio is already too low");

        // Make sure the FRAX minting wouldn't push the CR down too much
        // This is also a sanity check for the int256 math
        uint256 current_collateral_E18 = FRAX.globalCollateralValue();
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
        require (new_cr > min_cr, "Minting would cause collateral ratio to be too low");

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);
    }

    // Adds fuse pools 
    function addFusePool(address pool_address) public onlyByOwnerOrGovernance {
        require(pool_address != address(0), "Zero address detected");

        require(fuse_pools[pool_address] == false, "Address already exists");
        fuse_pools[pool_address] = true; 
        fuse_pools_array.push(pool_address);

        emit FusePoolAdded(pool_address);
    }

    // Remove a fuse pool
    function removeFusePool(address pool_address) public onlyByOwnerOrGovernance {
        require(pool_address != address(0), "Zero address detected");
        require(fuse_pools[pool_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete fuse_pools[pool_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            if (fuse_pools_array[i] == pool_address) {
                fuse_pools_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        emit FusePoolRemoved(pool_address);
    }

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setCustodian(address _custodian_address) external onlyByOwnerOrGovernance {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    // Only owner or timelock can call
    function setMintCap(uint256 _mint_cap) external onlyByOwnerOrGovernance {
        mint_cap = int256(_mint_cap);
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnerOrGovernance {
        min_cr = _min_cr;
    }

    function setOverrideCollatBalance(bool _state, uint256 _balance) external onlyByOwnerOrGovernance {
        override_collat_balance = _state;
        override_collat_balance_amount = _balance;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
        TransferHelper.safeTransfer(tokenAddress, custodian_address, tokenAmount);
        
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event FusePoolAdded(address token);
    event FusePoolRemoved(address token);
    event Recovered(address token, uint256 amount);
}