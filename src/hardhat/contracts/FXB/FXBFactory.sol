// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================ FXBFactory ============================
// ====================================================================
// Factory for Frax Bonds (FXB)

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Dennis: https://github.com/denett
// Sam Kazemian: https://github.com/samkazemian

import "@openzeppelin/contracts/utils/Strings.sol";
import "../Math/BokkyPooBahsDateTimeContract.sol";
import "./FXB.sol";
import "../Staking/Owned.sol";

contract FXBFactory is Owned {

    /* ========== STATE VARIABLES ========== */

    // Core
    BokkyPooBahsDateTimeContract private time_contract = BokkyPooBahsDateTimeContract(0x90503D86E120B3B309CEBf00C2CA013aB3624736);

    // Bond tracking
    address[] public allBonds; // Array of bond addresses
    mapping(address => bool) public mints_paused; // Whether minting for the bond is paused
    mapping(address => bool) public redeems_paused; // Whether redeeming for the bond is paused

    // Minter related
    address[] public minters_array;
    mapping(address => bool) public minters; // Mapping is also used for faster verification

    // Misc
    string[13] public month_names; // English names of the 12 months


    /* ========== CONSTRUCTOR ========== */

    /// @notice Constructor
    /// @param _owner The owner of this contract
    constructor(address _owner) Owned(_owner) {

        // Set the month names
        month_names = [
            '',
            'JAN',
            'FEB',
            'MAR',
            'APR',
            'MAY',
            'JUN',
            'JUL',
            'AUG',
            'SEP',
            'OCT',
            'NOV',
            'DEC'
        ];
    }


    /* ========== VIEW FUNCTIONS ========== */

    /// @notice Returns the total number of bonds created
    /// @return uint Number of bonds created
    function allBondsLength() public view returns (uint) {
        return allBonds.length;
    }

    /// @notice Generates the bond name in the format (e.g. FXB4_JAN012023)
    /// @param bond_id The id of the bond
    /// @param maturity_timestamp Date the bond will mature and be redeemable
    function generateBondName(
        uint256 bond_id, 
        uint256 issue_timestamp,
        uint256 maturity_timestamp
    ) public view returns (string memory bond_name) {
        // Issue date
        uint256 issue_month = time_contract.getMonth(issue_timestamp);
        uint256 issue_day = time_contract.getDay(issue_timestamp);
        uint256 issue_year = time_contract.getYear(issue_timestamp);

        // Maturity date
        uint256 maturity_month = time_contract.getMonth(maturity_timestamp);
        uint256 maturity_day = time_contract.getDay(maturity_timestamp);
        uint256 maturity_year = time_contract.getYear(maturity_timestamp);

        string memory issue_day_string;
        if (issue_day > 9) {
            issue_day_string = Strings.toString(issue_day);
        }
        else {
            issue_day_string = string(abi.encodePacked(
                "0", 
                Strings.toString(issue_day)
            ));
        }

        string memory maturity_day_string;
        if (maturity_day > 9) {
            maturity_day_string = Strings.toString(maturity_day);
        }
        else {
            maturity_day_string = string(abi.encodePacked(
                "0", 
                Strings.toString(maturity_day)
            ));
        }

        // Assemble all the strings into one
        // Example: FXB2_JUL012023_JUL012024
        bond_name = string(abi.encodePacked(
            "FXB", 
            Strings.toString(bond_id), 
            "_",
            month_names[issue_month],
            issue_day_string,
            Strings.toString(issue_year),
            "_",
            month_names[maturity_month],
            maturity_day_string,
            Strings.toString(maturity_year)
        ));
    }


    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */

    /// @notice Adds a minter
    /// @param minter_address Address of minter to add
    function addMinter(address minter_address) external onlyOwner() {
        require(minter_address != address(0), "Zero address detected");

        require(minters[minter_address] == false, "Address already exists");
        minters[minter_address] = true; 
        minters_array.push(minter_address);

        emit MinterAdded(minter_address);
    }

    /// @notice Removes a minter
    /// @param minter_address Address of minter to remove
    function removeMinter(address minter_address) external onlyOwner() {
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

    /// @notice Generates a new bond contract
    /// @param issue_timestamp Date the bond can start being minted
    /// @param maturity_timestamp Date the bond will mature and be redeemable
    function createBond(
        uint256 issue_timestamp,
        uint256 maturity_timestamp
    ) public onlyOwner returns (address bond_address, uint256 bond_id) {
        // Set the bond id
        bond_id = allBondsLength();

        // Get the new symbol and name
        string memory bond_symbol = string(abi.encodePacked("FXB", Strings.toString(bond_id)));
        string memory bond_name = generateBondName(bond_id, issue_timestamp, maturity_timestamp);

        // Create the new contract
        FXB fxb = new FXB(
            bond_symbol,
            bond_name,
            issue_timestamp,
            maturity_timestamp
        );

        // Add the new bond address to the array
        allBonds.push(address(fxb));

        emit BondCreated(bond_address, bond_id, bond_symbol, bond_name, issue_timestamp, maturity_timestamp);
    }

    /// @notice Sets whether a bond's minting is paused or not
    /// @param bond_address Address of the bond
    /// @param is_paused Whether a bond's minting is paused
    function setBondMintPaused(address bond_address, bool is_paused) external onlyOwner() {
        mints_paused[bond_address] = is_paused;

        emit BondMintingPaused(bond_address, is_paused);
    }

    /// @notice Sets whether a bond's redemption is paused or not
    /// @param bond_address Address of the bond
    /// @param is_paused Whether a bond's redemption is paused
    function setBondRedemptionPaused(address bond_address, bool is_paused) external onlyOwner() {
        redeems_paused[bond_address] = is_paused;

        emit BondRedemptionPaused(bond_address, is_paused);
    }

    /* ========== EVENTS ========== */

    /// @dev Emits when a new bond is created
    event BondCreated(address new_address, uint256 new_id, string new_symbol, string new_name, uint256 issue_timestamp, uint256 maturity_timestamp);

    /// @dev Emits when a bond's minting is paused
    event BondMintingPaused(address bond_address, bool is_paused);

    /// @dev Emits when a bond's redeeming is paused
    event BondRedemptionPaused(address bond_address, bool is_paused);

    /// @dev Emits when a new minter is added
    event MinterAdded(address pool_address);

    /// @dev Emits when an existing minter is removed
    event MinterRemoved(address pool_address);
}
