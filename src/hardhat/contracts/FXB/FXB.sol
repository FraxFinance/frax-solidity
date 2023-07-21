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
// Frax Bonds. After maturity, they can be redeemed for FRAX

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Dennis: https://github.com/denett
// Sam Kazemian: https://github.com/samkazemian

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "./FXBFactory.sol";


contract FXB is ERC20, ERC20Burnable, ERC20Permit {

    /* ========== STATE VARIABLES ========== */

    // Core
    FXBFactory public factory;

    // Bond information
    uint256 public issue_timestamp;
    uint256 public maturity_timestamp;
    uint256 public mint_cap;


    /* ========== STRUCTS ========== */


    struct BondInfo {
        string symbol;
        string name;
        uint256 issueTimestamp;
        uint256 maturityTimestamp;
        uint256 mintCap;
    }


    /* ========== CONSTRUCTOR ========== */

    /// @notice Called by the factory
    /// @param __symbol The symbol of the bond. Will be like FXB1_JUL012023_JAN012024
    /// @param __name Date the bond can start being minted
    /// @param _issue_timestamp Date the bond can start being minted
    /// @param _maturity_timestamp Date the bond will mature and be redeemable
    constructor(
        string memory __symbol,
        string memory __name,
        uint256 _issue_timestamp,
        uint256 _maturity_timestamp
    ) 
        ERC20(__symbol, __name) 
        ERC20Permit(__symbol) 
    {
        // Set the factory
        factory = FXBFactory(msg.sender);

        // Set the bond info
        issue_timestamp = _issue_timestamp;
        maturity_timestamp = _maturity_timestamp;
    }


    /* ========== MODIFIERS ========== */

    /// @notice Makes sure only the factory owner can call
    modifier onlyFactoryOwner() {
       require(msg.sender == factory.owner(), "Only factory owner");
        _;
    } 

    /// @notice Makes sure only minters specified by the factory can call
    modifier onlyFactoryMinters() {
       require(factory.minters(msg.sender) == true, "Only factory minters");
        _;
    } 


    /* ========== VIEW FUNCTIONS ========== */

    /// @notice Returns summary information about the bond
    /// @return BondInfo Summary of the bond
    function bondInfo() external view returns (BondInfo memory) {
        return BondInfo(
            symbol(),
            name(),
            issue_timestamp,
            maturity_timestamp,
            mint_cap
        );
    }


    /* ========== MINTER FUNCTIONS ========== */

    /// @notice Mints a specified amount of tokens to the account.
    /// @param to The account to receive minted tokens
    /// @param amount The amount of the token to mint
    function mint(address to, uint256 amount) public onlyFactoryMinters {
        require(block.timestamp >= issue_timestamp, "Bond not issueable yet");
        require(block.timestamp < maturity_timestamp, "Bond expired");
        require(!factory.mints_paused(address(this)), "Bond minting paused");
        require((totalSupply() + amount) <= mint_cap, "Mint cap");
        _mint(to, amount);
    }


    /* ========== INTERNAL FUNCTIONS ========== */



    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */

    /// @notice Sets the bond's mint cap
    /// @param _mint_cap The mint cap
    function setMintCap(uint256 _mint_cap) external onlyFactoryOwner {
        mint_cap = _mint_cap;
        emit MintCapSet(_mint_cap);
    }

    /* ========== EVENTS ========== */

    /// @dev Emits when mint cap is set
    event MintCapSet(uint256 new_mint_cap);

}