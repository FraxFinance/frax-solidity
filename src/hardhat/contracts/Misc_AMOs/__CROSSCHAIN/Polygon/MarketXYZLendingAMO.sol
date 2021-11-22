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
// ======================= MarketXYZLendingAMO ========================
// ====================================================================
// Lends FRAX
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../../../ERC20/ERC20.sol";
import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol";
import "../../../Bridges/Polygon/CrossChainBridgeBacker_POLY_MaticBridge.sol";
import "../../rari/ICErc20Delegator.sol";
import "../../rari/IRariComptroller.sol";
import "../../../Staking/Owned.sol";
import '../../../Uniswap/TransferHelper.sol';

contract MarketXYZLendingAMO is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    CrossChainCanonicalFRAX public canFRAX = CrossChainCanonicalFRAX(0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89);
    CrossChainBridgeBacker_POLY_MaticBridge public cc_bridge_backer;
    address public timelock_address;
    address public custodian_address;

    // Rari
    address[] public fuse_pools_array;
    mapping(address => bool) public fuse_pools; // Mapping is also used for faster verification

    // Price constants
    uint256 public constant PRICE_PRECISION = 1e6;

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

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address[] memory _initial_unitrollers,
        address[] memory _initial_fuse_pools,
        address _cc_bridge_backer_address
    ) Owned(_owner_address) {
        cc_bridge_backer = CrossChainBridgeBacker_POLY_MaticBridge(_cc_bridge_backer_address);

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
        timelock_address = cc_bridge_backer.timelock_address();
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[3] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        allocations[0] = canFRAX.balanceOf(address(this)); // Unallocated FRAX
    
        uint256 sum_fuse_pool_tally = 0;
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            // Make sure the pool is enabled first
            address pool_address = fuse_pools_array[i];
            if (fuse_pools[pool_address]){
                sum_fuse_pool_tally = sum_fuse_pool_tally + fraxInPoolByPoolIdx(i);
            }
        }
        allocations[1] = sum_fuse_pool_tally;

        allocations[2] = allocations[0] + allocations[1]; // Total FRAX value
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {

        uint256[3] memory allocations = showAllocations();

        return (allocations[2], 0, 0, allocations[2]);
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[2];
        collat_val_e18 = frax_val_e18;
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
        return (cToken_bal * delegator.exchangeRateStored()) / 1e18;
    }

    function fraxInPoolByPoolAddr(address pool_address) public view returns (uint256) {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        return fraxInPoolByPoolIdx(pool_idx);
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }
    
    function total_profit() public view returns (int256 profit) {
        uint256[3] memory allocations = showAllocations();

        // Handle FRAX
        profit = int256(allocations[2]) - int256(borrowed_frax());
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /* ---------------------------------------------------- */
    /* ----------------------- Rari ----------------------- */
    /* ---------------------------------------------------- */

    // IRariComptroller can vary
    function enterMarkets(address comptroller_address, address pool_address) validPool(pool_address) public onlyByOwnGov {
        address[] memory cTokens = new address[](1);
        cTokens[0] = pool_address;
        IRariComptroller(comptroller_address).enterMarkets(cTokens);
    }

    // E18
    function lendToPool(address pool_address, uint256 lend_amount) validPool(pool_address) public onlyByOwnGov {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        canFRAX.approve(pool_address, lend_amount);
        ICErc20Delegator(fuse_pools_array[pool_idx]).mint(lend_amount);
    }

    // E18
    function redeemFromPool(address pool_address, uint256 redeem_amount) validPool(pool_address) public onlyByOwnGov {
        uint256 pool_idx = poolAddrToIdx(pool_address);
        ICErc20Delegator(fuse_pools_array[pool_idx]).redeemUnderlying(redeem_amount);
    }

    // Auto compounds interest
    function accrueInterest() public onlyByOwnGov {
        for (uint i = 0; i < fuse_pools_array.length; i++){ 
            // Make sure the pool is enabled first
            address pool_address = fuse_pools_array[i];
            if (fuse_pools[pool_address]){
                ICErc20Delegator(fuse_pools_array[i]).accrueInterest();
            }
        }
    }

    /* ========== Burns and givebacks ========== */

    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwnGov {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(address(canFRAX), frax_amount, do_bridging);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setCCBridgeBacker(address _cc_bridge_backer_address) external onlyByOwnGov {
        cc_bridge_backer = CrossChainBridgeBacker_POLY_MaticBridge(_cc_bridge_backer_address);

        // Get the timelock addresses from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Make sure the new addresse is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

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

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Zero address detected");
        custodian_address = _custodian_address;
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
}