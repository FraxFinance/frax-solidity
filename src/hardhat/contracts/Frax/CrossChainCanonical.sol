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

import "../ERC20/ERC20.sol";
import "../ERC20/ERC20Permit/ERC20Permit.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

contract CrossChainCanonical is ERC20Permit, Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    // Core
    address public timelock_address; // Governance timelock address
    address public custodian_address; 

    // Misc
    uint256 public mint_cap;

    // Acceptable old tokens
    address[] public old_tokens_array;
    mapping(address => bool) public old_tokens;

    // The addresses in this array are able to mint tokens
    address[] public minters_array;
    mapping(address => bool) public minters; // Mapping is also used for faster verification

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;

    // Administrative booleans
    bool public exchangesPaused; // Pause old token exchanges in case of an emergency

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

    /* ========== CONSTRUCTOR ========== */

    constructor (
        string memory _name,
        string memory _symbol,
        address _creator_address,
        uint256 _initial_mint_amt,
        address _custodian_address,
        address[] memory _old_tokens
    ) ERC20(_name, _symbol) ERC20Permit(_name) Owned(_creator_address) {
        custodian_address = _custodian_address;

        // Initialize the starting old tokens
        for (uint256 i = 0; i < _old_tokens.length; i++){ 
            // Mark as accepted
            old_tokens[_old_tokens[i]] = true;

            // Add to the array
            old_tokens_array.push(_old_tokens[i]);
        }

        // Set the mint cap to the initial mint amount
        mint_cap = _initial_mint_amt;

        // Mint some canonical tokens to the creator
        super._mint(_creator_address, _initial_mint_amt);
    }

    /* ========== VIEWS ========== */

    // Helpful for UIs
    function allOldTokens() external view returns (address[] memory) {
        return old_tokens_array;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    // Enforce a minting cap
    function _mint_capped(address account, uint256 amount) internal {
        require(totalSupply() + amount <= mint_cap, "Mint cap");
        super._mint(account, amount);
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Exchange old tokens for these canonical tokens
    function exchangeOldTokens(address old_token_address, uint256 old_token_amount) external {
        require(!exchangesPaused, "Exchanges paused");
        require(old_tokens[old_token_address], "Invalid token");

        // Pull in the old token
        TransferHelper.safeTransferFrom(old_token_address, msg.sender, address(this), old_token_amount);

        // Mint canonical tokens and give it to the sender
        _mint_capped(msg.sender, old_token_amount);
    }

    /* ========== MINTER FUNCTIONS ========== */

    // This function is what other minters will call to mint new tokens 
    function minter_mint(address m_address, uint256 m_amount) external onlyMinters {
        _mint_capped(m_address, m_amount);
        emit TokenMinted(msg.sender, m_address, m_amount);
    }

    // Used by other minters to burn tokens
    function minter_burn_from(address b_address, uint256 b_amount) external onlyMinters {
        super._burnFrom(b_address, b_amount);
        emit TokenBurned(b_address, msg.sender, b_amount);
    }

    /* ========== RESTRICTED FUNCTIONS, BUT CUSTODIAN CAN CALL TOO ========== */

    function toggleExchanges() external onlyByOwnGovCust {
        exchangesPaused = !exchangesPaused;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Collect old tokens so you can manually de-bridge them back on mainnet
    function withdrawOldTokens(address old_token_address, uint256 old_token_amount) external onlyByOwnGov {
        require(old_tokens[old_token_address], "Invalid token");

        TransferHelper.safeTransfer(old_token_address, msg.sender, old_token_amount);
    }

    function addOldToken(address old_token_address) external onlyByOwnGov {
        // Make sure the token is not already present
        for (uint i = 0; i < old_tokens_array.length; i++){ 
            if (old_tokens_array[i] == old_token_address){
                revert("Token already present");
            }
        }

        // Add the old token
        old_tokens[old_token_address] = true;
        old_tokens_array.push(old_token_address);

        emit OldTokenAdded(old_token_address);
    }

    function toggleOldToken(address old_token_address) external onlyByOwnGov {
        old_tokens[old_token_address] = !old_tokens[old_token_address];
        emit OldTokenToggled(old_token_address, !old_tokens[old_token_address]);
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

    // function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
    //     TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    // }

    /* ========== EVENTS ========== */

    event TokenBurned(address indexed from, address indexed to, uint256 amount);
    event TokenMinted(address indexed from, address indexed to, uint256 amount);
    event OldTokenAdded(address indexed old_token_address);
    event OldTokenToggled(address indexed old_token_address, bool state);
    event CollateralRatioRefreshed(uint256 global_collateral_ratio);
    event MinterAdded(address pool_address);
    event MinterRemoved(address pool_address);
    event MintCapSet(uint256 new_mint_cap);
    event TimelockSet(address new_timelock);
    event CustodianSet(address custodian_address);
}
