// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =============================== FXB ================================
// ====================================================================
// Allows issuing multiple bonds with multiple maturity dates.
// The tokens will be semi-fungible, tradable only with other tokens with matching issue and maturity dates
// Using ERC1155 to allow flexibility for multiple issues and maturities
// After maturity, they can be redeemed for FRAX

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Dennis: https://github.com/denett
// Sam Kazemian: https://github.com/samkazemian

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "../Math/BokkyPooBahsDateTimeContract.sol";
import "./FXBHelper.sol";

/// @custom:security-contact webmaster@frax.finance
contract FXB is ERC1155, Ownable, Pausable, ERC1155Burnable, ERC1155Supply {
    
    // Core
    FXBHelper private fxb_helper;

    // Bond information
    uint256 current_id; // Incremented as new bonds are created
    mapping(uint256 => BondInfo) public bond_info; // bond id -> bond info

    // Minter related
    address[] public minters_array;
    mapping(address => bool) public minters; // Mapping is also used for faster verification
    


    /* ========== STRUCTS ========== */

    struct BondInfo {
        uint256 id;
        string name;
        uint256 issueTimestamp;
        uint256 maturityTimestamp;
        uint256 mintCap;
    }


    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _fxb_helper
    ) ERC1155("PLACEHOLDER_URI") {
        fxb_helper = FXBHelper(_fxb_helper);
    }

    /* ========== MODIFIERS ========== */

    /// @notice Makes sure only minter can call
    modifier onlyMinters() {
       require(minters[msg.sender] == true, "Only minters");
        _;
    } 


    /* ========== MINTER FUNCTIONS ========== */

    /// @notice Mints a specified amount of one token id to an account
    /// @param account The account to receive minted tokens
    /// @param id The id of the token to mint
    /// @param amount The amount of the token to mint
    /// @param data Arbitrary data to include
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyMinters {
        require(block.timestamp >= bond_info[id].issueTimestamp, "Bond not issueable yet");
        require(block.timestamp < bond_info[id].maturityTimestamp, "Bond expired");
        _mint(account, id, amount, data);
    }

    /// @notice Mints a specified amount of tokens for each token id to an account
    /// @param to The account to receive minted tokens
    /// @param ids Ids of the tokens being minted
    /// @param amounts Amounts of the tokens being minted
    /// @param data Arbitrary data to include
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyMinters {
        for (uint i = 0; i < ids.length; i++){ 
            require(block.timestamp >= bond_info[ids[i]].issueTimestamp, 
                string(abi.encodePacked(
                    "Bond not issueable yet: #", 
                    Strings.toString(ids[i])
                ))
            );
            require(block.timestamp < bond_info[ids[i]].maturityTimestamp, 
                string(abi.encodePacked(
                    "Bond expired: #", 
                    Strings.toString(ids[i])
                ))
            );
        }


        _mintBatch(to, ids, amounts, data);
    }


    /* ========== INTERNAL FUNCTIONS ========== */

    /// @notice Hook that is called before any token transfer. Here it is used to track total supply of each id
    /// @param operator The caller of the function
    /// @param from Address of the token sender
    /// @param to Address of the token recipient
    /// @param ids Ids of the tokens being transferred
    /// @param amounts Amounts of the tokens being transferred
    /// @param data Arbitrary data to include
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }


    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */

    /// @notice Creates a new bond id. Will only be fungible with other bonds of the same id
    /// @param issue_timestamp Date the bond can start being minted
    /// @param maturity_timestamp Date the bond will mature and be redeemable
    /// @param mint_cap Max amount of bonds that can be minted. Can be altered later
    function createBondId(uint256 issue_timestamp, uint256 maturity_timestamp, uint256 mint_cap) external onlyOwner {
        // Find the new id
        uint256 bond_id = current_id + 1;

        // Generate the bond name
        string memory bond_name = fxb_helper.generateBondName(bond_id, issue_timestamp, maturity_timestamp);
        
        // Insert the new bond information
        bond_info[bond_id] = BondInfo(
            bond_id,
            bond_name,
            issue_timestamp,
            maturity_timestamp,
            mint_cap
        );

        // Increment current_id
        current_id++;

        emit BondIdCreated(bond_id, bond_name, issue_timestamp, maturity_timestamp, mint_cap);
    }

    /// @notice Adds a minter
    /// @param minter_address Address of minter to add
    function addMinter(address minter_address) external onlyOwner {
        require(minter_address != address(0), "Zero address detected");

        require(minters[minter_address] == false, "Address already exists");
        minters[minter_address] = true; 
        minters_array.push(minter_address);

        emit MinterAdded(minter_address);
    }

    /// @notice Removes a minter
    /// @param minter_address Address of minter to remove
    function removeMinter(address minter_address) external onlyOwner {
        require(minter_address != address(0), "Zero address detected");
        require(minters[minter_address] == true, "Address nonexistent");
        
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

    /// @notice Sets mint cap(s) for token id(s)
    /// @param ids The token ids whose mint caps will change
    /// @param _mint_caps The mint caps
    function setMintCapBatch(uint256[] memory ids, uint256[] memory _mint_caps) external onlyOwner {
        for (uint i = 0; i < ids.length; i++){ 
            bond_info[ids[i]].mintCap = _mint_caps[ids[i]];
            emit MintCapsSet(ids[i], _mint_caps);
        }
    }

    /// @notice Sets the metadata URI
    /// @param newuri The new metadata URI
    /// @dev https://eips.ethereum.org/EIPS/eip-1155#metadata 
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    /// @notice Pauses token transfers
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpauses token transfers
    function unpause() public onlyOwner {
        _unpause();
    }

    /* ========== EVENTS ========== */
    /// @dev Emits when a new bond is added
    event BondIdCreated(uint256 new_id, string bond_name, uint256 issue_timestamp, uint256 maturity_timestamp, uint256 mint_cap);

    /// @dev Emits when a new minter is added
    event MinterAdded(address pool_address);

    /// @dev Emits when mint cap(s) are set for token id(s)
    event MintCapsSet(uint256 id, uint256[] new_mint_caps);

    /// @dev Emits when an existing minter is removed
    event MinterRemoved(address pool_address);
}
