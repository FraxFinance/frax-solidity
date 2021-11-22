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
// ====================== CrossChainBridgeBacker ======================
// ====================================================================
// Takes FRAX, FXS, and collateral and bridges it back to the Ethereum Mainnet
// Allows withdrawals to designated AMOs
// Tokens will need to be bridged to the contract first

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/Math.sol";
import "../ERC20/__CROSSCHAIN/IAnyswapV4ERC20.sol";
import "../ERC20/__CROSSCHAIN/CrossChainCanonical.sol";
import "../Frax/FraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";
import '../Oracle/ICrossChainOracle.sol';
import '../Misc_AMOs/ICrossChainAMO.sol';

contract CrossChainBridgeBacker is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Core
    IAnyswapV4ERC20 public anyFRAX;
    CrossChainCanonical public canFRAX;
    IAnyswapV4ERC20 public anyFXS;
    CrossChainCanonical public canFXS;
    ERC20 public collateral_token;
    ICrossChainOracle public cross_chain_oracle;

    // Admin addresses
    address public timelock_address;

    // AMO addresses
    address[] public amos_array;
    mapping(address => bool) public eoa_amos; // These need to be tracked so allBalances() skips them
    mapping(address => bool) public amos; // Mapping is also used for faster verification
    
    // Informational
    string public name;

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // Bridge related
    address[3] public bridge_addresses;
    address public destination_address_override;
    string public non_evm_destination_address;

    // Frax lent balances
    mapping(address => uint256) public frax_lent_balances; // Amount of FRAX the contract lent, by AMO
    uint256 public frax_lent_sum = 0; // Across all AMOs
    uint256 public frax_bridged_back_sum = 0; // Across all AMOs

    // Fxs lent balances
    mapping(address => uint256) public fxs_lent_balances; // Amount of FXS the contract lent, by AMO
    uint256 public fxs_lent_sum = 0; // Across all AMOs
    uint256 public fxs_bridged_back_sum = 0; // Across all AMOs

    // Collateral lent balances
    mapping(address => uint256) public collat_lent_balances; // Amount of collateral the contract lent, by AMO
    uint256 public collat_lent_sum = 0; // Across all AMOs
    uint256 public collat_bridged_back_sum = 0; // Across all AMOs

    // Collateral balance related
    uint256 public missing_decimals;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier validAMO(address amo_address) {
        require(amos[amo_address], "Invalid AMO");
        _;
    }

    modifier validCanonicalToken(address token_address) {
        require (
                token_address == address(canFRAX) || 
                token_address == address(canFXS) ||
                token_address == address(collateral_token), "Invalid canonical token"
            );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address,
        address _cross_chain_oracle_address,
        address[5] memory _token_addresses,
        address[3] memory _bridge_addresses,
        address _destination_address_override,
        string memory _non_evm_destination_address,
        string memory _name
    ) Owned(_owner) {
        // Core
        timelock_address = _timelock_address;
        cross_chain_oracle = ICrossChainOracle(_cross_chain_oracle_address);
        anyFRAX = IAnyswapV4ERC20(_token_addresses[0]);
        canFRAX = CrossChainCanonical(_token_addresses[1]);
        anyFXS = IAnyswapV4ERC20(_token_addresses[2]);
        canFXS = CrossChainCanonical(_token_addresses[3]);
        collateral_token = ERC20(_token_addresses[4]);
        missing_decimals = uint(18) - collateral_token.decimals();

        // Bridge related
        bridge_addresses = _bridge_addresses;
        destination_address_override = _destination_address_override;
        non_evm_destination_address = _non_evm_destination_address;

        // Informational
        name = _name;

        // Add this bridger as an AMO. Cannot used the addAMO function
        amos[address(this)] = true; 
        amos_array.push(address(this));
        frax_lent_balances[address(this)] = 0;
        fxs_lent_balances[address(this)] = 0;
        collat_lent_balances[address(this)] = 0;
    }


    /* ========== VIEWS ========== */

    function allAMOAddresses() external view returns (address[] memory) {
        return amos_array;
    }

    function allAMOsLength() external view returns (uint256) {
        return amos_array.length;
    }

    function getTokenType(address token_address) public view returns (uint256) {
        // 0 = FRAX, 1 = FXS, 2 = Collateral
        if (token_address == address(anyFRAX) || token_address == address(canFRAX)) return 0;
        else if (token_address == address(anyFXS) || token_address == address(canFXS)) return 1;
        else if (token_address == address(collateral_token)) return 2;

        // Revert on invalid tokens
        revert("getTokenType: Invalid token");
    }

    function showTokenBalances() public view returns (uint256[5] memory tkn_bals) {
        tkn_bals[0] = anyFRAX.balanceOf(address(this)); // anyFRAX
        tkn_bals[1] = canFRAX.balanceOf(address(this)); // canFRAX
        tkn_bals[2] = anyFXS.balanceOf(address(this)); // anyFXS
        tkn_bals[3] = canFXS.balanceOf(address(this)); // canFXS
        tkn_bals[4] = collateral_token.balanceOf(address(this)); // anyFRAX
    }

    function showAllocations() public view returns (uint256[12] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated

        // Get some token balances
        uint256[5] memory tkn_bals = showTokenBalances();

        // FRAX
        allocations[0] = tkn_bals[0] + tkn_bals[1]; // Free FRAX
        allocations[1] = frax_lent_sum; // Lent FRAX
        allocations[2] = allocations[0] + allocations[1]; // Total FRAX

        // FXS
        allocations[3] = tkn_bals[2] + tkn_bals[3]; // Free FXS
        allocations[4] = fxs_lent_sum; // Lent FXS
        allocations[5] = allocations[3] + allocations[4]; // Total FXS
        allocations[6] = (allocations[5] * (cross_chain_oracle.getPrice(address(canFXS)))) / PRICE_PRECISION; // Total FXS value in USD

        // Collateral
        allocations[7] = tkn_bals[4]; // Free Collateral
        allocations[8] = collat_lent_sum; // Lent Collateral
        allocations[9] = allocations[7] + allocations[8]; // Total Collateral, in native decimals()
        allocations[10] = allocations[9] * (10 ** missing_decimals); // Total Collateral, in E18
    
        // Total USD value of everything, in E18
        allocations[11] = allocations[2] + allocations[6] + allocations[10];
    }

    function allBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        // Handle this contract first (amos_array[0])
        uint256[12] memory allocations = showAllocations();
        frax_ttl = allocations[2];
        fxs_ttl = allocations[5];
        col_ttl = allocations[9];
        ttl_val_usd_e18 = allocations[11];

        // [0] will always be this address, so skip it to avoid an infinite loop 
        for (uint i = 1; i < amos_array.length; i++){ 
            // Exclude null addresses and EOAs
            if (amos_array[i] != address(0) && !eoa_amos[amos_array[i]]){
                (
                    uint256 frax_bal, 
                    uint256 fxs_bal, 
                    uint256 collat_bal,
                    uint256 total_val_e18
                ) = ICrossChainAMO(amos_array[i]).allDollarBalances();

                frax_ttl += frax_bal;
                fxs_ttl += fxs_bal;
                col_ttl += collat_bal;
                ttl_val_usd_e18 += total_val_e18;
            }
        }
    }


    /* ========== BRIDGING / AMO FUNCTIONS ========== */

    // Used for crumbs and drop-ins sitting in this contract
    // Can also manually bridge back anyFRAX
    // If do_swap is true, it will swap out canTokens in this contract for anyTokens in the canToken contracts
    function selfBridge(uint256 token_type, uint256 token_amount, bool do_swap) external onlyByOwnGov {
        require(token_type == 0 || token_type == 1 || token_type == 2, 'Invalid token type');

        _receiveBack(address(this), token_type, token_amount, true, do_swap);
    }

    // AMOs should only be giving back canonical tokens
    function receiveBackViaAMO(address canonical_token_address, uint256 token_amount, bool do_bridging) external validCanonicalToken(canonical_token_address) validAMO(msg.sender) {
        // Pull in the tokens from the AMO
        TransferHelper.safeTransferFrom(canonical_token_address, msg.sender, address(this), token_amount);

        // Get the token type
        uint256 token_type = getTokenType(canonical_token_address); 

        _receiveBack(msg.sender, token_type, token_amount, do_bridging, true);
    }

    // Optionally bridge
    function _receiveBack(address from_address, uint256 token_type, uint256 token_amount, bool do_bridging, bool do_swap) internal {


        if (do_bridging) {
            // Swap canTokens for bridgeable anyTokens, if necessary
            if (token_type == 0) {
                // FRAX
                // Swap the canonical tokens out for bridgeable anyTokens
                if (do_swap) _swapCanonicalForAny(0, token_amount);
            }
            else if (token_type == 1){
                // FXS
                // Swap the canonical tokens out for bridgeable anyTokens
                if (do_swap) _swapCanonicalForAny(1, token_amount);
            }

            // Defaults to sending to this contract's address on the other side
            address address_to_send_to = address(this);

            // See if there is an overriden destination
            if (destination_address_override != address(0)) address_to_send_to = destination_address_override;

            // Can be overridden
            _bridgingLogic(token_type, address_to_send_to, token_amount);
        }

        // Account for the lent balances
        if (token_type == 0){
            if (token_amount >= frax_lent_balances[from_address]) frax_lent_balances[from_address] = 0;
            else frax_lent_balances[from_address] -= token_amount;

            if (token_amount >= frax_lent_sum) frax_lent_sum = 0;
            else frax_lent_sum -= token_amount;

            if (do_bridging) frax_bridged_back_sum += token_amount;
        }
        else if (token_type == 1){
            if (token_amount >= fxs_lent_balances[from_address]) fxs_lent_balances[from_address] = 0;
            else fxs_lent_balances[from_address] -= token_amount;

            if (token_amount >= fxs_lent_sum) fxs_lent_sum = 0;
            else fxs_lent_sum -= token_amount;

            if (do_bridging) fxs_bridged_back_sum += token_amount;
        }
        else {
            if (token_amount >= collat_lent_balances[from_address]) collat_lent_balances[from_address] = 0;
            else collat_lent_balances[from_address] -= token_amount;

            if (token_amount >= collat_lent_sum) collat_lent_sum = 0;
            else collat_lent_sum -= token_amount;

            if (do_bridging) collat_bridged_back_sum += token_amount;
        }
    }

    // Meant to be overriden
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal virtual {
        revert("Need bridging logic");
    }

    /* ========== LENDING FUNCTIONS ========== */

    // Lend out canonical FRAX
    function lendFraxToAMO(address destination_amo, uint256 frax_amount) external onlyByOwnGov validAMO(destination_amo) {
        // Track the balances
        frax_lent_balances[destination_amo] += frax_amount;
        frax_lent_sum += frax_amount;

        // Transfer
        TransferHelper.safeTransfer(address(canFRAX), destination_amo, frax_amount);
    }

    // Lend out canonical FXS
    function lendFxsToAMO(address destination_amo, uint256 fxs_amount) external onlyByOwnGov validAMO(destination_amo) {
        // Track the balances
        fxs_lent_balances[destination_amo] += fxs_amount;
        fxs_lent_sum += fxs_amount;

        // Transfer
        TransferHelper.safeTransfer(address(canFXS), destination_amo, fxs_amount);
    }

    // Lend out collateral
    function lendCollatToAMO(address destination_amo, uint256 collat_amount) external onlyByOwnGov validAMO(destination_amo) {
        // Track the balances
        collat_lent_balances[destination_amo] += collat_amount;
        collat_lent_sum += collat_amount;

        // Transfer
        TransferHelper.safeTransfer(address(collateral_token), destination_amo, collat_amount);
    }


    /* ========== SWAPPING, GIVING, MINTING, AND BURNING ========== */
    
    // ----------------- SWAPPING -----------------

    // Swap anyToken for canToken [GOVERNANCE CALLABLE]
    function swapAnyForCanonical(uint256 token_type, uint256 token_amount) external onlyByOwnGov {
        _swapAnyForCanonical(token_type, token_amount);
    }

    // Swap anyToken for canToken [INTERNAL]
    function _swapAnyForCanonical(uint256 token_type, uint256 token_amount) internal {
        if (token_type == 0) {
            // FRAX
            // Approve and swap
            anyFRAX.approve(address(canFRAX), token_amount);
            canFRAX.exchangeOldForCanonical(address(anyFRAX), token_amount);
        }
        else {
            // FXS
            // Approve and swap
            anyFXS.approve(address(canFXS), token_amount);
            canFXS.exchangeOldForCanonical(address(anyFXS), token_amount);
        }
    }

    // Swap canToken for anyToken [GOVERNANCE CALLABLE]
    function swapCanonicalForAny(uint256 token_type, uint256 token_amount) external onlyByOwnGov {
        _swapCanonicalForAny(token_type, token_amount);
    }

    // Swap canToken for anyToken [INTERNAL]
    function _swapCanonicalForAny(uint256 token_type, uint256 token_amount) internal {
        if (token_type == 0) {
            // FRAX
            // Approve and swap
            canFRAX.approve(address(canFRAX), token_amount);
            canFRAX.exchangeCanonicalForOld(address(anyFRAX), token_amount);
        }
        else {
            // FXS
            // Approve and swap
            canFXS.approve(address(canFXS), token_amount);
            canFXS.exchangeCanonicalForOld(address(anyFXS), token_amount);
        }
    }

    // ----------------- GIVING -----------------

    // Give anyToken to the canToken contract
    function giveAnyToCan(uint256 token_type, uint256 token_amount) external onlyByOwnGov {
        if (token_type == 0) {
            // FRAX
            // Transfer
            TransferHelper.safeTransfer(address(anyFRAX), address(canFRAX), token_amount);
        }
        else {
            // FXS
            // Transfer
            TransferHelper.safeTransfer(address(anyFXS), address(canFXS), token_amount);
        }
    }

    // ----------------- FRAX -----------------

    function mintCanonicalFrax(uint256 frax_amount) external onlyByOwnGov {
        canFRAX.minter_mint(address(this), frax_amount);
    }

    function burnCanonicalFrax(uint256 frax_amount) external onlyByOwnGov {
        canFRAX.minter_burn(frax_amount);
    }

    // ----------------- FXS -----------------

    function mintCanonicalFxs(uint256 fxs_amount) external onlyByOwnGov {
        canFXS.minter_mint(address(this), fxs_amount);
    }

    function burnCanonicalFxs(uint256 fxs_amount) external onlyByOwnGov {
        canFXS.minter_burn(fxs_amount);
    }


    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    function collectBridgeTokens(uint256 token_type, address bridge_token_address, uint256 token_amount) external onlyByOwnGov {
        if (token_type == 0) {
            canFRAX.withdrawBridgeTokens(bridge_token_address, token_amount);
        }
        else if (token_type == 1) {
            canFXS.withdrawBridgeTokens(bridge_token_address, token_amount);
        }
        else {
            revert("Invalid token_type");
        }
    }
    
    // Adds an AMO 
    function addAMO(address amo_address, bool is_eoa) external onlyByOwnGov {
        require(amo_address != address(0), "Zero address detected");

        if (is_eoa) {
            eoa_amos[amo_address] = true;
        }
        else {
            (uint256 frax_val_e18, uint256 fxs_val_e18, uint256 collat_val_e18, uint256 total_val_e18) = ICrossChainAMO(amo_address).allDollarBalances();
            require(frax_val_e18 >= 0 && fxs_val_e18 >= 0 && collat_val_e18 >= 0 && total_val_e18 >= 0, "Invalid AMO");
        }

        require(amos[amo_address] == false, "Address already exists");
        amos[amo_address] = true; 
        amos_array.push(amo_address);

        frax_lent_balances[amo_address] = 0;
        fxs_lent_balances[amo_address] = 0;
        collat_lent_balances[amo_address] = 0;

        emit AMOAdded(amo_address);
    }

    // Removes an AMO
    function removeAMO(address amo_address) external onlyByOwnGov {
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

        emit AMORemoved(amo_address);
    }
    
    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function setOracleAddress(address _new_cc_oracle_address) external onlyByOwnGov {
        cross_chain_oracle = ICrossChainOracle(_new_cc_oracle_address);
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setBridgeInfo(
        address _frax_bridge_address, 
        address _fxs_bridge_address, 
        address _collateral_bridge_address, 
        address _destination_address_override, 
        string memory _non_evm_destination_address
    ) external onlyByOwnGov {
        // Make sure there are valid bridges
        require(
            _frax_bridge_address != address(0) && 
            _fxs_bridge_address != address(0) &&
            _collateral_bridge_address != address(0)
        , "Invalid bridge address");

        // Set bridge addresses
        bridge_addresses = [_frax_bridge_address, _fxs_bridge_address, _collateral_bridge_address];
        
        // Overridden cross-chain destination address
        destination_address_override = _destination_address_override;

        // Set bytes32 / non-EVM address on the other chain, if applicable
        non_evm_destination_address = _non_evm_destination_address;
        
        emit BridgeInfoChanged(_frax_bridge_address, _fxs_bridge_address, _collateral_bridge_address, _destination_address_override, _non_evm_destination_address);
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
    event RecoveredERC20(address token, uint256 amount);
    event BridgeInfoChanged(address frax_bridge_address, address fxs_bridge_address, address collateral_bridge_address, address destination_address_override, string non_evm_destination_address);
}
