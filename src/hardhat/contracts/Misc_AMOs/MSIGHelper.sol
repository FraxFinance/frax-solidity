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
// ============================ MSIGHelper ============================
// ====================================================================
// Accepts tokens from the AMO Minter and then lends them to an MSIG
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Jason Huan: https://github.com/jasonhuan

import "../Math/Math.sol";
import "../Frax/IFrax.sol";
import "../FXS/IFxs.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

contract MSIGHelper is Owned {
    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    IFrax public FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs public FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    ERC20 public collateral_token;
    IFraxAMOMinter public amo_minter;
    
    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // AMO Minter related
    address public amo_minter_address;

    // Collateral related
    address public collateral_address;
    uint256 public col_idx;

    // Admin addresses
    address public timelock_address;

    // Bridge related
    address public msig_address;

    // Balance tracking
    uint256 public frax_lent;
    uint256 public fxs_lent;
    uint256 public collat_lent;

    // Collateral balance related
    uint256 public missing_decimals;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _amo_minter_address,
        address _msig_address
    ) Owned(_owner) {
        // AMO Minter related
        amo_minter_address = _amo_minter_address;
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        timelock_address = amo_minter.timelock_address();

        // MSIG related
        msig_address = _msig_address;

        // Collateral related
        collateral_address = amo_minter.collateral_address();
        col_idx = amo_minter.col_idx();
        collateral_token = ERC20(collateral_address);
        missing_decimals = amo_minter.missing_decimals();
    }

    /* ========== VIEWS ========== */

    function getTokenType(address token_address) public view returns (uint256) {
        // 0 = FRAX, 1 = FXS, 2 = Collateral
        if (token_address == address(FRAX)) return 0;
        else if (token_address == address(FXS)) return 1;
        else if (token_address == address(collateral_token)) return 2;

        // Revert on invalid tokens
        revert("getTokenType: Invalid token");
    }

    function showTokenBalances() public view returns (uint256[3] memory tkn_bals) {
        tkn_bals[0] = FRAX.balanceOf(address(this)); // FRAX
        tkn_bals[1] = FXS.balanceOf(address(this)); // FXS
        tkn_bals[2] = collateral_token.balanceOf(address(this)); // Collateral
    }

    function showAllocations() public view returns (uint256[10] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated

        // Get some token balances
        uint256[3] memory tkn_bals = showTokenBalances();

        // FRAX
        allocations[0] = tkn_bals[0]; // Free FRAX
        allocations[1] = frax_lent; // Lent FRAX
        allocations[2] = allocations[0] + allocations[1]; // Total FRAX

        // FXS
        allocations[3] = tkn_bals[1]; // Free FXS
        allocations[4] = fxs_lent; // Lent FXS
        allocations[5] = allocations[3] + allocations[4]; // Total FXS

        // Collateral
        allocations[6] = tkn_bals[2] * (10 ** missing_decimals); // Free Collateral, in E18
        allocations[7] = collat_lent * (10 ** missing_decimals); // Lent Collateral, in E18
        allocations[8] = allocations[6] + allocations[7]; // Total Collateral, in E18
    
        // Total USD value, in E18
        // Ignores FXS
        allocations[9] = allocations[2] + allocations[8];
    }

    // Needed for the Frax contract to function 
    function collatDollarBalance() public view returns (uint256) {
        (, uint256 col_bal) = dollarBalances();
        return col_bal;
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        // NOTE: The token tracker will track the actual FRAX, FXS, and Collat on the msig
        // Were it to be included here too, it would be a double count

        // Get the allocations
        uint256[10] memory allocations = showAllocations();

        // FRAX portion is Frax * CR
        uint256 frax_portion_with_cr = (allocations[0] * FRAX.global_collateral_ratio()) / PRICE_PRECISION;

        // Collateral portion
        uint256 collat_portion = allocations[6];

        // Total value, not including CR, ignoring FXS
        frax_val_e18 = allocations[0] + allocations[6];

        // Collat value, accounting for CR on the FRAX portion
        collat_val_e18 = collat_portion + frax_portion_with_cr;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function lend(address token_address, uint256 token_amount) external onlyByOwnGov {
        // Get the token type
        uint256 token_type = getTokenType(token_address); 

        // Can be overridden
        if (token_type == 0){
            TransferHelper.safeTransfer(address(FRAX), msig_address, token_amount);
            frax_lent += token_amount;
        }
        else if (token_type == 1) {
            TransferHelper.safeTransfer(address(FXS), msig_address, token_amount);
            fxs_lent += token_amount;
        }
        else {
            TransferHelper.safeTransfer(collateral_address, msig_address, token_amount);
            collat_lent += token_amount;
        }
    }

    /* ========== Burns and givebacks ========== */
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.approve(amo_minter_address, frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);

        // Update the balance after the transfer goes through
        if (frax_amount >= frax_lent) frax_lent = 0;
        else {
            frax_lent -= frax_amount;
        }
    }

    // Burn unneeded or excess FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGov {
        FXS.approve(amo_minter_address, fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);

        // Update the balance after the transfer goes through
        if (fxs_amount >= fxs_lent) fxs_lent = 0;
        else {
            fxs_lent -= fxs_amount;
        }
    }

    // Give collat profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGov {
        collateral_token.approve(amo_minter_address, collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);

        // Update the balance after the transfer goes through
        if (collat_amount >= collat_lent) collat_lent = 0;
        else {
            collat_lent -= collat_amount;
        }
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setMsigAddress(address _msig_address) external onlyByOwnGov {
        require(_msig_address != address(0), "Invalid msig address");
        msig_address = _msig_address;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
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

    event RecoveredERC20(address token, uint256 amount);
    event BridgeInfoChanged(address frax_bridge_address, address fxs_bridge_address, address collateral_bridge_address, address destination_address_override, string non_evm_destination_address);
}