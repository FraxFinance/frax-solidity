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
// ======================== RariFuseLendingAMO_V2 ========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../../Math/SafeMath.sol";
import "../../Frax/IFrax.sol";
import "../../Frax/IFraxAMOMinter.sol";
import "../../ERC20/ERC20.sol";
import "../../Staking/Owned.sol";
import '../../Uniswap/TransferHelper.sol';
import "./rari/ICErc20Delegator.sol";
import "./rari/IRariComptroller.sol";

contract RariFuseLendingAMO_V2 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFraxAMOMinter private amo_minter;
    address public timelock_address;
    address public custodian_address;

    // Rari
    address[] public fuse_pools_array;
    mapping(address => bool) public fuse_pools; // Mapping is also used for faster verification

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address[] memory _initial_unitrollers,
        address[] memory _initial_fuse_pools,
        address _amo_minter_address
    ) Owned(_owner_address) {
        FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Set the initial pools and enter markets
        fuse_pools_array = _initial_fuse_pools;
        for (uint256 i = 0; i < fuse_pools_array.length; i++){ 
            // Set the pools as valid
            fuse_pools[_initial_fuse_pools[i]] = true;

            // Enter markets
            address[] memory cTokens = new address[](1);
            cTokens[0] = fuse_pools_array[i];
            IRariComptroller(_initial_unitrollers[i]).enterMarkets(cTokens);
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

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[2];
        collat_val_e18 = (frax_val_e18).mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
    }

    // Helpful for UIs
    function allPoolAddresses() external view returns (address[] memory) {
        return fuse_pools_array;
    }

    // Helpful for UIs
    function allPoolsLength() external view returns (uint256) {
        return fuse_pools_array.length;
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
        
    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    // Backwards compatibility
    function accumulatedProfit() public view returns (int256) {
        return int256(showAllocations()[2]) - mintedBalance();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /* ---------------------------------------------------- */
    /* ----------------------- Rari ----------------------- */
    /* ---------------------------------------------------- */

    // IRariComptroller can vary
    function enterMarkets(address comptroller_address, address pool_address) validPool(pool_address) public onlyByOwnGovCust {
        address[] memory cTokens = new address[](1);
        cTokens[0] = pool_address;
        IRariComptroller(comptroller_address).enterMarkets(cTokens);
    }

    // E18
    function lendToPool(address pool_address, uint256 lend_amount) validPool(pool_address) public onlyByOwnGovCust {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        FRAX.approve(pool_address, lend_amount);
        ICErc20Delegator(fuse_pools_array[pool_idx]).mint(lend_amount);
    }

    // E18
    function redeemFromPool(address pool_address, uint256 redeem_amount) validPool(pool_address) public onlyByOwnGovCust {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        ICErc20Delegator(fuse_pools_array[pool_idx]).redeemUnderlying(redeem_amount);
    }
    
    // Auto compounds interest
    function accrueInterest() public onlyByOwnGovCust {
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            // Make sure the pool is enabled first
            address pool_address = fuse_pools_array[i];
            if (fuse_pools[pool_address]){
                ICErc20Delegator(fuse_pools_array[i]).accrueInterest();
            }
        }
    }

    /* ========== Burns and givebacks ========== */

    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */
    // Only owner or timelock can call, to limit risk 

    // Adds fuse pools 
    function addFusePool(address pool_address) public onlyByOwnGov {
        require(pool_address != address(0), "Zero address detected");

        require(fuse_pools[pool_address] == false, "Address already exists");
        fuse_pools[pool_address] = true; 
        fuse_pools_array.push(pool_address);

        emit FusePoolAdded(pool_address);
    }

    // Remove a fuse pool
    function removeFusePool(address pool_address) public onlyByOwnGov {
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

    /* ========== EVENTS ========== */

    event FusePoolAdded(address token);
    event FusePoolRemoved(address token);
    event Recovered(address token, uint256 amount);
}