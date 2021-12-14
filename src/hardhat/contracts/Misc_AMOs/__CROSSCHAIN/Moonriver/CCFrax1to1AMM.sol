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
// ========================== CCFrax1to1AMM ===========================
// ====================================================================
// Crosschain Frax 1-to-1 AMM
// Uses Chainlink oracles and liquidity limits for security
// Swaps whitelisted stablecoins 1-to-1 with FRAX, and vice versa

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

import "../../../ERC20/ERC20.sol";
import "../../../Bridges/CrossChainBridgeBacker.sol";
import '../../../Uniswap/TransferHelper.sol';
import "../../../Staking/Owned.sol";
import "../../../Utils/ReentrancyGuard.sol";
import "../../../Oracle/ComboOracle.sol";

contract CCFrax1to1AMM is Owned, ReentrancyGuard {

    /* ========== STATE VARIABLES ========== */

    // Instances
    ERC20 public canFRAX;
    ComboOracle public combo_oracle; // Standardizes prices ultimately from Chainlink
    CrossChainBridgeBacker public cc_bridge_backer;
    ERC20 public collateral_token;

    // Core
    address public custodian_address; 

    // Swap token info
    address[] public swap_tokens_array;
    mapping(address => bool) public is_swap_token;
    mapping(address => uint256) public swap_tkn_msg_dec_mult;
    mapping(address => uint256) public swap_fee;
    mapping(address => uint256) public swap_token_cap;

    // Misc
    uint256 public price_tolerance = 5000; // E6. 5000 = .995 to 1.005
    mapping(address => bool) public fee_exempt_list; // Smart contract addresses exempt from swap fees

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;

    // Administrative booleans
    bool public exchangesPaused; // Pause swaps in case of an emergency
    mapping(address => bool) public can_swap;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyByOwnerCust() {
        require(msg.sender == owner || msg.sender == custodian_address, "Not owner, or custodian");
        _;
    }

    modifier validSwapToken(address token_address) {
       require(is_swap_token[token_address], "Invalid swap token");
        _;
    } 

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _custodian_address,
        address _frax_address,
        address _combo_oracle_address,
        address _cc_bridge_backer,
        address[] memory _swap_tokens,
        uint256[] memory _starting_caps
    ) Owned(_creator_address) {
        custodian_address = _custodian_address;

        // Set instances
        canFRAX = ERC20(_frax_address);
        combo_oracle = ComboOracle(_combo_oracle_address);
        cc_bridge_backer = CrossChainBridgeBacker(_cc_bridge_backer);
        collateral_token = cc_bridge_backer.collateral_token();

        // Initialize the starting old tokens
        for (uint256 i = 0; i < _swap_tokens.length; i++){ 
            // Get the token address
            address tkn_addr = _swap_tokens[i];

            // Mark as accepted
            is_swap_token[tkn_addr] = true;

            // Add to the array
            swap_tokens_array.push(tkn_addr);

            // Set a small swap fee initially of 0.04%
            swap_fee[tkn_addr] = 400;

            // Set the missing decimals multiplier
            swap_tkn_msg_dec_mult[tkn_addr] = 10 ** (uint256(18) - ERC20(tkn_addr).decimals());

            // Set an initial cap of 0
            // Be wary of decimals here
            swap_token_cap[tkn_addr] = _starting_caps[i];

            // Enable swapping for the token
            can_swap[tkn_addr] = true;

            // Make sure the oracle has the swap token
            (, uint256 e6_price_swap_tkn) = combo_oracle.getTokenPrice(tkn_addr);
            require(e6_price_swap_tkn > 0, "ComboOracle missing swap token");
        }
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[4] memory allocations) {

        // FRAX
        allocations[0] = canFRAX.balanceOf(address(this)); // Free FRAX

        // CC Bridge Backer Collateral
        allocations[1] = collateral_token.balanceOf(address(this)); // Free collat, native precision
        allocations[2] = allocations[1] * (10 ** cc_bridge_backer.missing_decimals()); // Free collat, E18 

        // Total stablecoins
        uint256 ttl_value = allocations[0] + allocations[2];
        for (uint256 i = 0; i < swap_tokens_array.length; i++){ 
            address swp_tkn_addr = swap_tokens_array[i];
            if (swp_tkn_addr != address(collateral_token)){
                ttl_value += ERC20(swp_tkn_addr).balanceOf(address(this)) * (swap_tkn_msg_dec_mult[swp_tkn_addr]);
            }
        }

        // Total USD value
        allocations[3] = ttl_value;
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        uint256[4] memory allocations = showAllocations();

        return (allocations[0], 0, allocations[2], allocations[3]);
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }

    function borrowed_collat() public view returns (uint256) {
        return cc_bridge_backer.collat_lent_balances(address(this));
    }

    // Helpful for UIs
    function allSwapTokens() external view returns (address[] memory) {
        return swap_tokens_array;
    }

    function _isFeeExempt(address the_address) internal view returns (bool) {
        return (fee_exempt_list[the_address]);
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Exchange other stablecoins for FRAX
    function swapTokenForFrax(address swap_token_address, uint256 token_amount) external nonReentrant validSwapToken(swap_token_address) returns (uint256 frax_out) {
        require(!exchangesPaused && can_swap[swap_token_address], "Exchanges paused");

        // Make sure the swap token is within the price tolerance
        (, uint256 e6_price_swap_tkn) = combo_oracle.getTokenPrice(swap_token_address);
        require(e6_price_swap_tkn >= PRICE_PRECISION - price_tolerance, "Swap token price too low");
        require(e6_price_swap_tkn <= PRICE_PRECISION + price_tolerance, "Swap token price too high");

        // Make sure there aren't already (or will be) too many swap tokens
        require((ERC20(swap_token_address).balanceOf(address(this)) + token_amount) <= swap_token_cap[swap_token_address], "Swap token cap reached");

        // Pull in the swap tokens
        TransferHelper.safeTransferFrom(swap_token_address, msg.sender, address(this), token_amount);

        // Handle the missing decimals, if any (native precision to E18)
        frax_out = token_amount * swap_tkn_msg_dec_mult[swap_token_address];

        // Handle the fee, if applicable
        if (!_isFeeExempt(msg.sender)) {
            frax_out -= ((frax_out * swap_fee[swap_token_address]) / PRICE_PRECISION);
        }

        // Give FRAX to the sender
        TransferHelper.safeTransfer(address(canFRAX), msg.sender, frax_out);
    }

    // Exchange FRAX for other stablecoins
    function swapFraxForToken(address swap_token_address, uint256 frax_amount) external nonReentrant validSwapToken(swap_token_address) returns (uint256 swap_tokens_out) {
        require(!exchangesPaused && can_swap[swap_token_address], "Exchanges paused");
        
        // Make sure the swap token is within the price tolerance
        (, uint256 e6_price_swap_tkn) = combo_oracle.getTokenPrice(swap_token_address);
        require(e6_price_swap_tkn >= PRICE_PRECISION - price_tolerance, "Swap token price too low");
        require(e6_price_swap_tkn <= PRICE_PRECISION + price_tolerance, "Swap token price too high");

        // Pull in the FRAX tokens
        TransferHelper.safeTransferFrom(address(canFRAX), msg.sender, address(this), frax_amount);

        // Handle the missing decimals, if any (E18 to native precision)
        swap_tokens_out = frax_amount / swap_tkn_msg_dec_mult[swap_token_address];

        // Handle the fee, if applicable
        if (!_isFeeExempt(msg.sender)) {
            swap_tokens_out -= ((swap_tokens_out * swap_fee[swap_token_address]) / PRICE_PRECISION);
        }

        // Give swap tokens to the sender
        TransferHelper.safeTransfer(swap_token_address, msg.sender, swap_tokens_out);
    }

    /* ========== GOVERNANCE FUNCTIONS ========== */

    // Collect swap tokens so you can de-bridge them back to mainnet or invest them
    function withdrawSwapTokens(address swap_token_address, uint256 swap_token_amount) external onlyByOwner validSwapToken(swap_token_address) {
        // Collateral tokens must go through the cross chain bridge backer. Other swap tokens can be withdrawn
        require(swap_token_address != address(collateral_token), "Col tkm must go via CCBB");

        TransferHelper.safeTransfer(swap_token_address, msg.sender, swap_token_amount);
    }

    /* ========== Burns and givebacks ========== */

    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwner {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(address(canFRAX), frax_amount, do_bridging);
    }

    function giveCollatBack(uint256 collat_amount, bool do_bridging) external onlyByOwner {
        collateral_token.approve(address(cc_bridge_backer), collat_amount);
        cc_bridge_backer.receiveBackViaAMO(address(collateral_token), collat_amount, do_bridging);
    }

    /* ========== RESTRICTED FUNCTIONS, BUT CUSTODIAN CAN CALL TOO ========== */

    function toggleAllSwaps() external onlyByOwnerCust {
        exchangesPaused = !exchangesPaused;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function addSwapToken(address swap_token_address, uint256 fee, uint256 cap) external onlyByOwner {
        // Make sure the token is not already present
        for (uint256 i = 0; i < swap_tokens_array.length; i++){ 
            if (swap_tokens_array[i] == swap_token_address) {
                revert("Token already present");
            }
        }

        // Add the swap token
        is_swap_token[swap_token_address] = true;
        swap_tokens_array.push(swap_token_address);

        // Set the missing decimals multiplier
        swap_tkn_msg_dec_mult[swap_token_address] = 10 ** (uint256(18) - ERC20(swap_token_address).decimals());

        // Set the fee
        swap_fee[swap_token_address] = fee;

        // Set the cap
        swap_token_cap[swap_token_address] = cap;

        // Turn swapping on
        can_swap[swap_token_address] = true;

        emit SwapTokenAdded(swap_token_address);
    }

    function toggleSwapToken(address swap_token_address) external onlyByOwner {
        // Make sure the token is already present in the array
        bool bridge_tkn_found;
        for (uint i = 0; i < swap_tokens_array.length; i++){ 
            if (swap_tokens_array[i] == swap_token_address){
                bridge_tkn_found = true;
                break;
            }
        }
        require(bridge_tkn_found, "Bridge tkn not in array");

        // Toggle the token
        is_swap_token[swap_token_address] = !is_swap_token[swap_token_address];

        // Toggle swapping
        can_swap[swap_token_address] = !can_swap[swap_token_address];

        emit SwapTokenToggled(swap_token_address, !is_swap_token[swap_token_address]);
    }
    

    function setSwapFees(address swap_token_address, uint256 fee) external validSwapToken(swap_token_address) onlyByOwner {
        swap_fee[swap_token_address] = fee;
    }

    function setSwapTokenCap(address swap_token_address, uint256 cap) external validSwapToken(swap_token_address) onlyByOwner {
        swap_token_cap[swap_token_address] = cap;
    }

    function toggleFeesForAddress(address swap_token_address) external validSwapToken(swap_token_address) onlyByOwner {
        fee_exempt_list[swap_token_address] = !fee_exempt_list[swap_token_address];
    }

    // E6
    function setPriceTolerance(uint256 tolerance) external onlyByOwner {
        price_tolerance = tolerance;
    }

    function setCustodian(address _custodian_address) external onlyByOwner {
        require(_custodian_address != address(0), "Zero address detected");
        custodian_address = _custodian_address;

        emit CustodianSet(_custodian_address);
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwner {
        require(!is_swap_token[tokenAddress], "Cannot withdraw swap tokens");

        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }


    /* ========== EVENTS ========== */

    event SwapTokenAdded(address indexed swap_token_address);
    event SwapTokenToggled(address indexed swap_token_address, bool state);
    event CustodianSet(address custodian_address);
}
