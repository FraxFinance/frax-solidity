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
// ====================== OolongSwapLiquidityAMO ======================
// ====================================================================
// Provides Uniswap V2-style liquidity
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian

import "../../../ERC20/ERC20.sol";
import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol";
import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFXS.sol";
import "../../../Bridges/Boba/CrossChainBridgeBacker_BOBA_BobaGateway.sol";
import "../../../Misc_AMOs/oolongswap/IOolongSwapPair.sol";
import "../../../Misc_AMOs/oolongswap/IOolongSwapRouter02.sol";
import "../../../Staking/Owned.sol";
import '../../../Uniswap/TransferHelper.sol';

contract OolongSwapLiquidityAMO is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    CrossChainCanonicalFRAX private canFRAX;
    CrossChainCanonicalFXS private canFXS;
    CrossChainBridgeBacker_BOBA_BobaGateway public cc_bridge_backer;
    ERC20 private collateral_token;
    address public canonical_frax_address;
    address public canonical_fxs_address;
    address public collateral_token_address;

    // Important addresses
    address public timelock_address;
    address public custodian_address;

    // Router
    IOolongSwapRouter02 public router = IOolongSwapRouter02(0x17C83E2B96ACfb5190d63F5E46d93c107eC0b514);

    // Positions
    address[] public frax_fxs_pair_addresses_array;
    mapping(address => bool) public frax_fxs_pair_addresses_allowed;

    // Slippages
    uint256 public add_rem_liq_slippage = 20000; // 2.0%

    // Constants
    uint256 public missing_decimals;
    uint256 private PRICE_PRECISION = 1e6;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _custodian_address,
        address _canonical_frax_address,
        address _canonical_fxs_address,
        address _collateral_token_address,
        address _cc_bridge_backer_address,
        address[] memory _initial_pairs
    ) Owned(_owner_address) {
        // Core addresses
        canonical_frax_address = _canonical_frax_address;
        canonical_fxs_address = _canonical_fxs_address;
        collateral_token_address = _collateral_token_address;

        // Core instances
        canFRAX = CrossChainCanonicalFRAX(_canonical_frax_address);
        canFXS = CrossChainCanonicalFXS(_canonical_fxs_address);
        collateral_token = ERC20(_collateral_token_address);
        cc_bridge_backer = CrossChainBridgeBacker_BOBA_BobaGateway(_cc_bridge_backer_address);

        // Set the custodian
        custodian_address = _custodian_address;

        // Get the timelock address from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Get the missing decimals for the collateral
        missing_decimals = uint(18) - collateral_token.decimals();

        // Set the initial pairs
        for (uint256 i = 0; i < _initial_pairs.length; i++){ 
            _addTrackedLP(_initial_pairs[i]);
        }
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[17] memory allocations) {
        // Get the FXS price
        uint256 fxs_price = cc_bridge_backer.cross_chain_oracle().getPrice(canonical_fxs_address);
        
        // Loop through the lp tokens
        uint256[] memory lp_tallies = new uint256[](4); // 0 = FRAX, 1 = FXS, 2 = Collateral, 3 = USD value
        for (uint i = 0; i < frax_fxs_pair_addresses_array.length; i++){ 
            address pair_address = frax_fxs_pair_addresses_array[i];
            if (frax_fxs_pair_addresses_allowed[pair_address]) {
                // Instantiate the pair
                IOolongSwapPair the_pair = IOolongSwapPair(pair_address);

                // Get the pair info
                uint256[4] memory lp_info_pack = lpTokenInfo(pair_address);
                
                // Get the lp token balance
                uint256 lp_token_balance = the_pair.balanceOf(address(this));

                // Get the FRAX and FXS balances
                uint256 frax_amt = (lp_info_pack[0] * lp_token_balance) / 1e18;
                uint256 fxs_amt = (lp_info_pack[1] * lp_token_balance) / 1e18;
                uint256 collat_amt = (lp_info_pack[2] * lp_token_balance) / 1e18;

                // Add to the tallies
                lp_tallies[0] += frax_amt;
                lp_tallies[1] += fxs_amt;
                lp_tallies[2] += collat_amt;

                // Get the USD value
                if (lp_info_pack[3] == 0 || lp_info_pack[3] == 2){
                    // If FRAX is in the pair, just double the FRAX balance since it is 50/50
                    lp_tallies[3] += (frax_amt * 2);
                }
                else {
                    // Otherwise, double the value of the FXS component
                    lp_tallies[3] += ((fxs_amt * fxs_price) / PRICE_PRECISION) * 2;
                }

            }
        }

        // FRAX
        allocations[0] = canFRAX.balanceOf(address(this)); // Free FRAX
        allocations[1] = lp_tallies[0]; // FRAX in LP
        allocations[2] = allocations[0] + allocations[1]; // Total FRAX

        // FXS
        allocations[3] = canFXS.balanceOf(address(this)); // Free FXS, native E18
        allocations[4] = (allocations[3] * fxs_price) / PRICE_PRECISION; // Free FXS USD value
        allocations[5] = lp_tallies[1]; // FXS in LP, native E18
        allocations[6] = (allocations[5] * fxs_price) / PRICE_PRECISION; // FXS in LP USD value
        allocations[7] = allocations[3] + allocations[5]; // Total FXS, native E18
        allocations[8] = allocations[4] + allocations[6]; // Total FXS USD Value

        // Collateral
        allocations[9] = collateral_token.balanceOf(address(this)); // Free Collateral, native precision
        allocations[10] = (allocations[9] * (10 ** missing_decimals)); // Free Collateral USD value
        allocations[11] = lp_tallies[2]; // Collateral in LP, native precision
        allocations[12] = (allocations[11] * (10 ** missing_decimals)); // Collateral in LP USD value
        allocations[13] = allocations[9] + allocations[11]; // Total Collateral, native precision
        allocations[14] = allocations[10] + allocations[12]; // Total Collateral USD Value

        // LP
        allocations[15] = lp_tallies[3]; // Total USD value in all LPs

        // Totals
        allocations[16] = allocations[2] + allocations[8] + allocations[14]; // Total USD value in entire AMO, including FXS
    }

    function showTokenBalances() public view returns (uint256[3] memory tkn_bals) {
        tkn_bals[0] = canFRAX.balanceOf(address(this)); // canFRAX
        tkn_bals[1] = canFXS.balanceOf(address(this)); // canFXS
        tkn_bals[2] = collateral_token.balanceOf(address(this)); // collateral_token
    }
    
    // [0] = FRAX per LP token
    // [1] = FXS per LP token
    // [2] = Collateral per LP token
    // [3] = pair_type
    function lpTokenInfo(address pair_address) public view returns (uint256[4] memory return_info) {
        // Instantiate the pair
        IOolongSwapPair the_pair = IOolongSwapPair(pair_address);

        // Get the reserves
        uint256[] memory reserve_pack = new uint256[](3); // [0] = FRAX, [1] = FXS, [2] = Collateral
        (uint256 reserve0, uint256 reserve1, ) = (the_pair.getReserves());
        {
            // Get the underlying tokens in the LP
            address token0 = the_pair.token0();
            address token1 = the_pair.token1();

            // Test token0
            if (token0 == canonical_frax_address) reserve_pack[0] = reserve0;
            else if (token0 == canonical_fxs_address) reserve_pack[1] = reserve0;
            else if (token0 == collateral_token_address) reserve_pack[2] = reserve0;

            // Test token1
            if (token1 == canonical_frax_address) reserve_pack[0] = reserve1;
            else if (token1 == canonical_fxs_address) reserve_pack[1] = reserve1;
            else if (token1 == collateral_token_address) reserve_pack[2] = reserve1;
        }

        // Get the token rates
        return_info[0] = (reserve_pack[0] * 1e18) / (the_pair.totalSupply());
        return_info[1] = (reserve_pack[1] * 1e18) / (the_pair.totalSupply());
        return_info[2] = (reserve_pack[2] * 1e18) / (the_pair.totalSupply());

        // Set the pair type (used later)
        if (return_info[0] > 0 && return_info[1] == 0) return_info[3] = 0; // FRAX/XYZ
        else if (return_info[0] == 0 && return_info[1] > 0) return_info[3] = 1; // FXS/XYZ
        else if (return_info[0] > 0 && return_info[1] > 0) return_info[3] = 2; // FRAX/FXS
        else revert("Invalid pair");
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        uint256[17] memory allocations = showAllocations();

        return (allocations[2], allocations[7], allocations[13], allocations[16]);
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }
    
    function borrowed_fxs() public view returns (uint256) {
        return cc_bridge_backer.fxs_lent_balances(address(this));
    }

    function borrowed_collat() public view returns (uint256) {
        return cc_bridge_backer.collat_lent_balances(address(this));
    }

    function total_profit() public view returns (int256 profit) {
        // Get the FXS price
        uint256 fxs_price = cc_bridge_backer.cross_chain_oracle().getPrice(canonical_fxs_address);

        uint256[17] memory allocations = showAllocations();

        // Handle FRAX
        profit = int256(allocations[2]) - int256(borrowed_frax());

        // Handle FXS
        profit +=  ((int256(allocations[7]) - int256(borrowed_fxs())) * int256(fxs_price)) / int256(PRICE_PRECISION);

        // Handle Collat
        profit += (int256(allocations[13]) - int256(borrowed_collat())) * int256(10 ** missing_decimals);
    }

    // token_there_is_one_of means you want the return amount to be (X other token) per 1 token;
    function pair_reserve_ratio_E18(address pair_address, address token_there_is_one_of) public view returns (uint256) {
        // Instantiate the pair
        IOolongSwapPair the_pair = IOolongSwapPair(pair_address);

        // Get the token addresses
        address token0 = the_pair.token0();
        address token1 = the_pair.token1();
        uint256 decimals0 = ERC20(token0).decimals();
        uint256 decimals1 = ERC20(token1).decimals();

        (uint256 reserve0, uint256 reserve1, ) = (the_pair.getReserves());

        uint256 miss_dec = (decimals0 >= decimals1) ? (decimals0 - decimals1) : (decimals1 - decimals0);

        // Put everything into E18. Since one of the pair tokens will always be FRAX or FXS, this is ok to assume.
        if (decimals0 >= decimals1){
            reserve1 *= (10 ** miss_dec);
        }
        else {
            reserve0 *= (10 ** miss_dec);
        }

        // Return the ratio
        if (token0 == token_there_is_one_of){
            return (uint256(1e18) * reserve0) / reserve1;
        }
        else if (token1 == token_there_is_one_of){
            return (uint256(1e18) * reserve1) / reserve0;
        }
        else revert("Token not in pair");
    }
   
    /* ========== Swap ========== */

    // Swap tokens directly
    function swapTokens(
        address from_token_address, 
        uint256 from_in, 
        address to_token_address,
        uint256 to_token_out_min
    ) public onlyByOwnGov returns (uint256[] memory amounts) {
        // Approval
        ERC20(from_token_address).approve(address(router), from_in);

        // Create the path object (compiler doesn't like feeding it in directly)
        address[] memory the_path = new address[](2);
        the_path[0] = from_token_address;
        the_path[1] = to_token_address;

        // Swap
        amounts = router.swapExactTokensForTokens(
            from_in, 
            to_token_out_min, 
            the_path, 
            address(this), 
            block.timestamp + 604800 // Expiration: 7 days from now
        );
    }

    // If you need a specific path
    function swapTokensWithCustomPath(
        address from_token_address, 
        uint256 from_in,
        uint256 end_token_out_min,
        address[] memory path
    ) public onlyByOwnGov returns (uint256[] memory amounts) {
        // Approval
        ERC20(from_token_address).approve(address(router), from_in);

        // Swap
        amounts = router.swapExactTokensForTokens(
            from_in, 
            end_token_out_min, 
            path, 
            address(this), 
            block.timestamp + 604800 // Expiration: 7 days from now
        );
    }

    /* ========== Add / Remove Liquidity ========== */

    function addLiquidity(
        address lp_token_address, 
        address tokenA_address, 
        uint256 tokenA_amt, 
        address tokenB_address, 
        uint256 tokenB_amt
    ) public onlyByOwnGov returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(frax_fxs_pair_addresses_allowed[lp_token_address], "LP address not allowed");

        // Approvals
        ERC20(tokenA_address).approve(address(router), tokenA_amt);
        ERC20(tokenB_address).approve(address(router), tokenB_amt);

        // Add liquidity
        (amountA, amountB, liquidity) = router.addLiquidity(
            tokenA_address, 
            tokenB_address, 
            tokenA_amt, 
            tokenB_amt, 
            tokenA_amt - ((tokenA_amt * add_rem_liq_slippage) / PRICE_PRECISION), 
            tokenB_amt - ((tokenB_amt * add_rem_liq_slippage) / PRICE_PRECISION), 
            address(this), 
            block.timestamp + 604800 // Expiration: 7 days from now
        );
    }

    function removeLiquidity(
        address lp_token_address, 
        uint256 lp_token_in
    ) public onlyByOwnGov returns (uint256 amountA, uint256 amountB) {
        require(frax_fxs_pair_addresses_allowed[lp_token_address], "LP address not allowed");

        // Approvals
        ERC20(lp_token_address).approve(address(router), lp_token_in);

        // Get the token addresses
        address tokenA = IOolongSwapPair(lp_token_address).token0();
        address tokenB = IOolongSwapPair(lp_token_address).token1();

        // Remove liquidity
        (amountA, amountB) = router.removeLiquidity(
            tokenA, 
            tokenB, 
            lp_token_in, 
            0, 
            0, 
            address(this), 
            block.timestamp + 604800 // Expiration: 7 days from now
        );
    }

    /* ========== Burns and givebacks ========== */

    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwnGov {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(canonical_frax_address, frax_amount, do_bridging);
    }

    function giveFXSBack(uint256 fxs_amount, bool do_bridging) external onlyByOwnGov {
        canFXS.approve(address(cc_bridge_backer), fxs_amount);
        cc_bridge_backer.receiveBackViaAMO(canonical_fxs_address, fxs_amount, do_bridging);
    }

    function giveCollatBack(uint256 collat_amount, bool do_bridging) external onlyByOwnGov {
        collateral_token.approve(address(cc_bridge_backer), collat_amount);
        cc_bridge_backer.receiveBackViaAMO(collateral_token_address, collat_amount, do_bridging);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Any pairs with FRAX and/or FXS must be whitelisted first before adding liquidity
    function _addTrackedLP(address pair_address) internal {
        // Instantiate the pair
        IOolongSwapPair the_pair = IOolongSwapPair(pair_address);

        // Make sure either FRAX or FXS is present
        bool frax_present = (the_pair.token0() == canonical_frax_address || the_pair.token1() == canonical_frax_address);
        bool fxs_present = (the_pair.token0() == canonical_fxs_address || the_pair.token1() == canonical_fxs_address);
        require(frax_present || fxs_present, "FRAX or FXS not in pair");

        // Adjust the state variables
        require(frax_fxs_pair_addresses_allowed[pair_address] == false, "LP already exists");
        frax_fxs_pair_addresses_allowed[pair_address] = true; 
        frax_fxs_pair_addresses_array.push(pair_address);
    }

    function addTrackedLP(address pair_address) public onlyByOwnGov {
        _addTrackedLP(pair_address);
    }

    // Remove FRAX and FXS related pairs
    function removeTrackedLP(address pair_address) public onlyByOwnGov {
        // Adjust the state variables
        require(frax_fxs_pair_addresses_allowed[pair_address] == true, "LP not already present");
        frax_fxs_pair_addresses_allowed[pair_address] = false; 
        
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < frax_fxs_pair_addresses_array.length; i++){ 
            if (frax_fxs_pair_addresses_array[i] == pair_address) {
                frax_fxs_pair_addresses_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    function setCCBridgeBacker(address _cc_bridge_backer_address) external onlyByOwnGov {
        cc_bridge_backer = CrossChainBridgeBacker_BOBA_BobaGateway(_cc_bridge_backer_address);

        // Get the timelock addresses from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Make sure the new addresse is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

    function setSlippages(uint256 _add_rem_liq_slippage) external onlyByOwnGov {
        add_rem_liq_slippage = _add_rem_liq_slippage;
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
}