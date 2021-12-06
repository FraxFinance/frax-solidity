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
// ======================== CrossChainCanonical =======================
// ====================================================================
// Cross-chain / non mainnet canonical token contract.
// Can accept any number of old non-canonical tokens. These will be 
// withdrawable by the owner so they can de-bridge it and get back mainnet 'real' tokens
// Does not include any spurious mainnet logic

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

import "../ERC20.sol";
import "../ERC20Permit/ERC20Permit.sol";
import '../../Uniswap/TransferHelper.sol';
import "../../Staking/Owned.sol";
import "../../Utils/ReentrancyGuard.sol";

contract CrossChainCanonical is ERC20Permit, Owned, ReentrancyGuard {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    // Core
    address public timelock_address; // Governance timelock address
    address public custodian_address; 

    // Misc
    uint256 public mint_cap;
    mapping(address => uint256[2]) public swap_fees;
    mapping(address => bool) public fee_exempt_list;

    // Acceptable old tokens
    address[] public bridge_tokens_array;
    mapping(address => bool) public bridge_tokens;

    // The addresses in this array are able to mint tokens
    address[] public minters_array;
    mapping(address => bool) public minters; // Mapping is also used for faster verification

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;

    // Administrative booleans
    bool public exchangesPaused; // Pause old token exchanges in case of an emergency
    mapping(address => bool) public canSwap;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    modifier onlyMinters() {
       require(minters[msg.sender], "Not a minter");
        _;
    } 

    modifier onlyMintersOwnGov() {
       require(_isMinterOwnGov(msg.sender), "Not minter, owner, or tlck");
        _;
    } 

    modifier validBridgeToken(address token_address) {
       require(bridge_tokens[token_address], "Invalid old token");
        _;
    } 

    /* ========== CONSTRUCTOR ========== */

    constructor (
        string memory _name,
        string memory _symbol,
        address _creator_address,
        uint256 _initial_mint_amt,
        address _custodian_address,
        address[] memory _bridge_tokens
    ) ERC20(_name, _symbol) ERC20Permit(_name) Owned(_creator_address) {
        custodian_address = _custodian_address;

        // Initialize the starting old tokens
        for (uint256 i = 0; i < _bridge_tokens.length; i++){ 
            // Mark as accepted
            bridge_tokens[_bridge_tokens[i]] = true;

            // Add to the array
            bridge_tokens_array.push(_bridge_tokens[i]);

            // Set a small swap fee initially of 0.04%
            swap_fees[_bridge_tokens[i]] = [400, 400];

            // Make sure swapping is on
            canSwap[_bridge_tokens[i]] = true;
        }

        // Set the mint cap to the initial mint amount
        mint_cap = _initial_mint_amt;

        // Mint some canonical tokens to the creator
        super._mint(_creator_address, _initial_mint_amt);


    }

    /* ========== VIEWS ========== */

    // Helpful for UIs
    function allBridgeTokens() external view returns (address[] memory) {
        return bridge_tokens_array;
    }

    function _isMinterOwnGov(address the_address) internal view returns (bool) {
        return (the_address == timelock_address || the_address == owner || minters[the_address]);
    }

    function _isFeeExempt(address the_address) internal view returns (bool) {
        return (_isMinterOwnGov(the_address) || fee_exempt_list[the_address]);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    // Enforce a minting cap
    function _mint_capped(address account, uint256 amount) internal {
        require(totalSupply() + amount <= mint_cap, "Mint cap");
        super._mint(account, amount);
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Exchange old or bridge tokens for these canonical tokens
    function exchangeOldForCanonical(address bridge_token_address, uint256 token_amount) external nonReentrant validBridgeToken(bridge_token_address) returns (uint256 canonical_tokens_out) {
        require(!exchangesPaused && canSwap[bridge_token_address], "Exchanges paused");

        // Pull in the old / bridge tokens
        TransferHelper.safeTransferFrom(bridge_token_address, msg.sender, address(this), token_amount);

        // Handle the fee, if applicable
        canonical_tokens_out = token_amount;
        if (!_isFeeExempt(msg.sender)) {
            canonical_tokens_out -= ((canonical_tokens_out * swap_fees[bridge_token_address][0]) / PRICE_PRECISION);
        }

        // Mint canonical tokens and give it to the sender
        _mint_capped(msg.sender, canonical_tokens_out);
    }

    // Exchange canonical tokens for old or bridge tokens
    function exchangeCanonicalForOld(address bridge_token_address, uint256 token_amount) external nonReentrant validBridgeToken(bridge_token_address) returns (uint256 bridge_tokens_out) {
        require(!exchangesPaused && canSwap[bridge_token_address], "Exchanges paused");
        
        // Burn the canonical tokens
        super._burn(msg.sender, token_amount);

        // Handle the fee, if applicable
        bridge_tokens_out = token_amount;
        if (!_isFeeExempt(msg.sender)) {
            bridge_tokens_out -= ((bridge_tokens_out * swap_fees[bridge_token_address][1]) / PRICE_PRECISION);
        }

        // Give old / bridge tokens to the sender
        TransferHelper.safeTransfer(bridge_token_address, msg.sender, bridge_tokens_out);
    }

    /* ========== MINTERS OR GOVERNANCE FUNCTIONS ========== */

    // Collect old / bridge tokens so you can de-bridge them back on mainnet
    function withdrawBridgeTokens(address bridge_token_address, uint256 bridge_token_amount) external onlyMintersOwnGov validBridgeToken(bridge_token_address) {
        TransferHelper.safeTransfer(bridge_token_address, msg.sender, bridge_token_amount);
    }

    /* ========== MINTERS ONLY ========== */

    // This function is what other minters will call to mint new tokens 
    function minter_mint(address m_address, uint256 m_amount) external onlyMinters {
        _mint_capped(m_address, m_amount);
        emit TokenMinted(msg.sender, m_address, m_amount);
    }

    // This function is what other minters will call to burn tokens
    function minter_burn(uint256 amount) external onlyMinters {
        super._burn(msg.sender, amount);
        emit TokenBurned(msg.sender, amount);
    }

    /* ========== RESTRICTED FUNCTIONS, BUT CUSTODIAN CAN CALL TOO ========== */

    function toggleExchanges() external onlyByOwnGovCust {
        exchangesPaused = !exchangesPaused;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function addBridgeToken(address bridge_token_address, uint256 _brdg_to_can_fee, uint256 _can_to_brdg_fee) external onlyByOwnGov {
        // Make sure the token is not already present
        for (uint i = 0; i < bridge_tokens_array.length; i++){ 
            if (bridge_tokens_array[i] == bridge_token_address){
                revert("Token already present");
            }
        }

        // Add the old token
        bridge_tokens[bridge_token_address] = true;
        bridge_tokens_array.push(bridge_token_address);

        // Turn swapping on
        canSwap[bridge_token_address] = true;

        // Set the fees
        swap_fees[bridge_token_address][0] = _brdg_to_can_fee;
        swap_fees[bridge_token_address][1] = _can_to_brdg_fee;

        emit BridgeTokenAdded(bridge_token_address);
    }

    function toggleBridgeToken(address bridge_token_address) external onlyByOwnGov {
        // Make sure the token is already present in the array
        bool bridge_tkn_found;
        for (uint i = 0; i < bridge_tokens_array.length; i++){ 
            if (bridge_tokens_array[i] == bridge_token_address){
                bridge_tkn_found = true;
                break;
            }
        }
        require(bridge_tkn_found, "Bridge tkn not in array");

        // Toggle the token
        bridge_tokens[bridge_token_address] = !bridge_tokens[bridge_token_address];

        // Toggle swapping
        canSwap[bridge_token_address] = !canSwap[bridge_token_address];

        emit BridgeTokenToggled(bridge_token_address, !bridge_tokens[bridge_token_address]);
    }

    // Adds a minter address
    function addMinter(address minter_address) external onlyByOwnGov {
        require(minter_address != address(0), "Zero address detected");

        require(minters[minter_address] == false, "Address already exists");
        minters[minter_address] = true; 
        minters_array.push(minter_address);

        emit MinterAdded(minter_address);
    }

    // Remove a minter 
    function removeMinter(address minter_address) external onlyByOwnGov {
        require(minter_address != address(0), "Zero address detected");
        require(minters[minter_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete minters[minter_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < minters_array.length; i++){ 
            if (minters_array[i] == minter_address) {
                minters_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        emit MinterRemoved(minter_address);
    }

    function setMintCap(uint256 _mint_cap) external onlyByOwnGov {
        mint_cap = _mint_cap;

        emit MintCapSet(_mint_cap);
    }

    function setSwapFees(address bridge_token_address, uint256 _bridge_to_canonical, uint256 _canonical_to_old) external onlyByOwnGov {
        swap_fees[bridge_token_address] = [_bridge_to_canonical, _canonical_to_old];
    }

    function toggleFeesForAddress(address the_address) external onlyByOwnGov {
        fee_exempt_list[the_address] = !fee_exempt_list[the_address];
    }

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Zero address detected");
        timelock_address = new_timelock;

        emit TimelockSet(new_timelock);
    }

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Zero address detected");
        custodian_address = _custodian_address;

        emit CustodianSet(_custodian_address);
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        require(!bridge_tokens[tokenAddress], "Cannot withdraw bridge tokens");
        require(tokenAddress != address(this), "Cannot withdraw these tokens");

        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }

    // // Generic proxy
    // function execute(
    //     address _to,
    //     uint256 _value,
    //     bytes calldata _data
    // ) external onlyByOwnGov returns (bool, bytes memory) {
    //     (bool success, bytes memory result) = _to.call{value:_value}(_data);
    //     return (success, result);
    // }

    /* ========== EVENTS ========== */

    event TokenBurned(address indexed from, uint256 amount);
    event TokenMinted(address indexed from, address indexed to, uint256 amount);
    event BridgeTokenAdded(address indexed bridge_token_address);
    event BridgeTokenToggled(address indexed bridge_token_address, bool state);
    event MinterAdded(address pool_address);
    event MinterRemoved(address pool_address);
    event MintCapSet(uint256 new_mint_cap);
    event TimelockSet(address new_timelock);
    event CustodianSet(address custodian_address);
}
