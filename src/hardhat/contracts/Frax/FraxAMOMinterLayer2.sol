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
// ======================= FraxAMOMinterLayer2 ========================
// ====================================================================
// Basically the same version on Ethereum, but some unneeded functions are removed
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Amirnader Aghayeghazvini: https://github.com/amirnader-ghazvini
// Drake Evans: https://github.com/DrakeEvans
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

import "../Math/SafeMath.sol";
import "../ERC20/__CROSSCHAIN/ICrossChainCanonical.sol";
import "../Frax/Pools/FraxPoolV3.sol";
import "../Frax/Pools/IFraxPool.sol";
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import '../Misc_AMOs/IAMO.sol';

contract FraxAMOMinterLayer2 is Owned {
    /* ========== STATE VARIABLES ========== */

    // Core
    ICrossChainCanonical public FRAX;
    ICrossChainCanonical public FXS;

    // AMO addresses
    address[] public amos_array;
    mapping(address => bool) public amos; // Mapping is also used for faster verification

    // Max amount of FRAX and FXS this contract can mint
    int256 public frax_mint_cap = int256(10000000e18);
    int256 public fxs_mint_cap = int256(10000000e18);

    // Frax mint balances
    mapping(address => int256) public frax_mint_balances; // Amount of FRAX the contract minted, by AMO
    int256 public frax_mint_sum = 0; // Across all AMOs

    // Fxs mint balances
    mapping(address => int256) public fxs_mint_balances; // Amount of FXS the contract minted, by AMO
    int256 public fxs_mint_sum = 0; // Across all AMOs

    // FRAX balance related
    uint256 public fraxDollarBalanceStored = 0;

    // AMO balance corrections
    mapping(address => int256[2]) public correction_offsets_amos;


    /* ========== DEPRECATED STATE VARIABLES ========== */

    // Collateral borrowed balances
    mapping(address => int256) public collat_borrowed_balances; // Amount of collateral the contract borrowed, by AMO
    int256 public collat_borrowed_sum = 0; // Across all AMOs

    // Collateral balance related
    uint256 public missing_decimals;
    uint256 public collatDollarBalanceStored = 0;

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _frax_address,
        address _fxs_address
    ) Owned(_owner_address) {
        FRAX = ICrossChainCanonical(_frax_address);
        FXS = ICrossChainCanonical(_fxs_address);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwner() {
        require(msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier validAMO(address amo_address) {
        require(amos[amo_address], "Invalid AMO");
        _;
    }


    /* ========== VIEWS ========== */

    function allAMOAddresses() external view returns (address[] memory) {
        return amos_array;
    }

    function allAMOsLength() external view returns (uint256) {
        return amos_array.length;
    }

    function fraxTrackedAMO(address amo_address) external view returns (int256) {
        return frax_mint_balances[amo_address] + correction_offsets_amos[amo_address][0];
    }

    function fxsTrackedAMO(address amo_address) external view returns (int256) {
        return fxs_mint_balances[amo_address] + correction_offsets_amos[amo_address][1];
    }


    /* ========== PUBLIC FUNCTIONS ========== */

    // Callable by anyone willing to pay the gas
    function syncDollarBalances() public {
        uint256 total_frax_value_d18 = 0;
        for (uint i = 0; i < amos_array.length; i++){ 
            // Exclude null addresses
            address amo_address = amos_array[i];
            if (amo_address != address(0)) {
                (uint256 frax_val_e18, ) = IAMO(amo_address).dollarBalances();
                total_frax_value_d18 += uint256(int256(frax_val_e18) + correction_offsets_amos[amo_address][0]);
            }
        }
        fraxDollarBalanceStored = total_frax_value_d18;
    }


    /* ==================== OWNER / GOVERNANCE FUNCTIONS ONLY ==================== */
    // Only owner or timelock can call, to limit risk 

    // ------------------------------------------------------------------
    // ------------------------------ FRAX ------------------------------
    // ------------------------------------------------------------------

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFraxForAMO(address destination_amo, uint256 frax_amount) external onlyByOwner validAMO(destination_amo) {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the minter's mint cap
        require((frax_mint_sum + frax_amt_i256) <= frax_mint_cap, "Mint cap reached");
        frax_mint_balances[destination_amo] += frax_amt_i256;
        frax_mint_sum += frax_amt_i256;

        // Mint the FRAX to the AMO
        FRAX.minter_mint(destination_amo, frax_amount);

        // Sync
        syncDollarBalances();
    }

    function burnFraxFromAMO(uint256 frax_amount) external validAMO(msg.sender) {
        int256 frax_amt_i256 = int256(frax_amount);

        // Burn first
        FRAX.burnFrom(msg.sender, frax_amount);

        // Then update the balances
        frax_mint_balances[msg.sender] -= frax_amt_i256;
        frax_mint_sum -= frax_amt_i256;

        // Sync
        syncDollarBalances();
    }

    // ------------------------------------------------------------------
    // ------------------------------- FXS ------------------------------
    // ------------------------------------------------------------------

    function mintFxsForAMO(address destination_amo, uint256 fxs_amount) external onlyByOwner validAMO(destination_amo) {
        int256 fxs_amt_i256 = int256(fxs_amount);

        // Make sure you aren't minting more than the mint cap
        require((fxs_mint_sum + fxs_amt_i256) <= fxs_mint_cap, "Mint cap reached");
        fxs_mint_balances[destination_amo] += fxs_amt_i256;
        fxs_mint_sum += fxs_amt_i256;

        // Mint the FXS to the AMO
        FXS.minter_mint(destination_amo, fxs_amount);

        // Sync
        syncDollarBalances();
    }

    function burnFxsFromAMO(uint256 fxs_amount) external validAMO(msg.sender) {
        int256 fxs_amt_i256 = int256(fxs_amount);

        // Burn first
        FXS.burnFrom(msg.sender, fxs_amount);

        // Then update the balances
        fxs_mint_balances[msg.sender] -= fxs_amt_i256;
        fxs_mint_sum -= fxs_amt_i256;

        // Sync
        syncDollarBalances();
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    // Adds an AMO 
    function addAMO(address amo_address, bool sync_too) public onlyByOwner {
        require(amo_address != address(0), "Zero address detected");

        (uint256 frax_val_e18, ) = IAMO(amo_address).dollarBalances();
        require(frax_val_e18 >= 0, "Invalid AMO");

        require(amos[amo_address] == false, "Address already exists");
        amos[amo_address] = true; 
        amos_array.push(amo_address);

        // Mint balances
        frax_mint_balances[amo_address] = 0;
        fxs_mint_balances[amo_address] = 0;

        // Offsets
        correction_offsets_amos[amo_address][0] = 0;
        correction_offsets_amos[amo_address][1] = 0;

        if (sync_too) syncDollarBalances();

        emit AMOAdded(amo_address);
    }

    // Removes an AMO
    function removeAMO(address amo_address, bool sync_too) public onlyByOwner {
        require(amo_address != address(0), "Zero address detected");
        require(amos[amo_address] == true, "Address nonexistent");
        
        // Delete from the mapping
        delete amos[amo_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < amos_array.length; i++){ 
            if (amos_array[i] == amo_address) {
                amos_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        if (sync_too) syncDollarBalances();

        emit AMORemoved(amo_address);
    }

    function setFraxMintCap(uint256 _frax_mint_cap) external onlyByOwner {
        frax_mint_cap = int256(_frax_mint_cap);
    }

    function setFxsMintCap(uint256 _fxs_mint_cap) external onlyByOwner {
        fxs_mint_cap = int256(_fxs_mint_cap);
    }

    function setAMOCorrectionOffsets(address amo_address, int256 frax_e18_correction, int256 fxs_e18_correction) external onlyByOwner {
        correction_offsets_amos[amo_address][0] = frax_e18_correction;
        correction_offsets_amos[amo_address][1] = fxs_e18_correction;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwner {
        // Can only be triggered by owner or governance
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        
        emit Recovered(tokenAddress, tokenAmount);
    }

    // Generic proxy
    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyByOwner returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value:_value}(_data);
        return (success, result);
    }

    /* ========== EVENTS ========== */

    event AMOAdded(address amo_address);
    event AMORemoved(address amo_address);
    event Recovered(address token, uint256 amount);
}