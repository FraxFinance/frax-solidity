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
// ========================== FRAXBond (FXB) ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Common/Context.sol";
import "../ERC20/IERC20.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";
import "../Governance/AccessControl.sol";

contract FraxBond is ERC20Custom, AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    string public symbol;
    string public name;
    uint8 public constant decimals = 18;
    address public owner_address;
    address public timelock_address; // Governance timelock address
    address public controller_address; // Controller contract to dynamically adjust system parameters automatically

    uint256 public constant genesis_supply = 100e18; // 2M FRAX (only for testing, genesis supply will be 5k on Mainnet). This is to help with establishing the Uniswap pools, as they need liquidity

    // The addresses in this array are added by the oracle and these contracts are able to mint frax
    address[] public bond_issuers_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public bond_issuers; 

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    
    // Other variables
    address public DEFAULT_ADMIN_ADDRESS;

    /* ========== MODIFIERS ========== */

    modifier onlyIssuers() {
       require(bond_issuers[msg.sender] == true, "Only bond issuers can call this function");
        _;
    } 
    
    modifier onlyByOwnerControllerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address || msg.sender == controller_address, "Not the owner, controller, or the governance timelock");
        _;
    }

    modifier onlyByOwnerOrTimelock() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        string memory _name,
        string memory _symbol,
        address _owner_address,
        address _timelock_address,
        address _controller_address
    ) {
        name = _name;
        symbol = _symbol;
        owner_address = _owner_address;
        timelock_address = _timelock_address;
        controller_address = _controller_address;
        
        _setupRole(DEFAULT_ADMIN_ROLE, _owner_address);
        DEFAULT_ADMIN_ADDRESS = _owner_address;
    }

    /* ========== VIEWS ========== */

    /* ========== PUBLIC FUNCTIONS ========== */

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Used by issuers when user mints
    function issuer_mint(address m_address, uint256 m_amount) external onlyIssuers {
        super._mint(m_address, m_amount);
        emit FXBMinted(msg.sender, m_address, m_amount);
    }

    // Used by issuers when user redeems
    function issuer_burn_from(address b_address, uint256 b_amount) external onlyIssuers {
        super._burnFrom(b_address, b_amount);
        emit FXBBurned(b_address, msg.sender, b_amount);
    }

    // Adds an issuer
    function addIssuer(address issuer_address) external onlyByOwnerControllerOrGovernance {
        require(bond_issuers[issuer_address] == false, "Address already exists");
        bond_issuers[issuer_address] = true; 
        bond_issuers_array.push(issuer_address);
    }

    // Removes an issuer 
    function removeIssuer(address issuer_address) external onlyByOwnerControllerOrGovernance {
        require(bond_issuers[issuer_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete bond_issuers[issuer_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < bond_issuers_array.length; i++){ 
            if (bond_issuers_array[i] == issuer_address) {
                bond_issuers_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    /* ========== HIGHLY RESTRICTED EXTERNAL FUNCTIONS [Owner and Timelock only]  ========== */

    function setOwner(address _owner_address) external onlyByOwnerOrTimelock {
        owner_address = _owner_address;
    }

    function setTimelock(address new_timelock) external onlyByOwnerOrTimelock {
        timelock_address = new_timelock;
    }

    function setController(address _controller_address) external onlyByOwnerOrTimelock {
        controller_address = _controller_address;
    }

    /* ========== EVENTS ========== */

    // Track FXB burned
    event FXBBurned(address indexed from, address indexed to, uint256 amount);

    // Track FXB minted
    event FXBMinted(address indexed from, address indexed to, uint256 amount);
}
