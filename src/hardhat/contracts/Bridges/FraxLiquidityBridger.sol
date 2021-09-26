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
// ======================= FraxLiquidityBridger =======================
// ====================================================================
// Takes FRAX, FXS, and collateral and bridges it to other chains for the purposes of seeding liquidity pools
// and other possible AMOs
// An AMO Minter will need to give tokens to this contract first

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/Math.sol";
import "../Frax/IFrax.sol";
import "../FXS/IFxs.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

contract FraxLiquidityBridger is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    IFrax public FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs public FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    ERC20 public collateral_token;
    IFraxAMOMinter public amo_minter;
    
    // Informational
    string public name;

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // AMO Minter related
    address private amo_minter_address;

    // Collateral related
    address public collateral_address;
    uint256 public col_idx;

    // Admin addresses
    address public timelock_address;

    // Bridge related
    address[3] public bridge_addresses;
    address public destination_address_override;
    string public non_evm_destination_address;

    // Balance tracking
    uint256 public frax_bridged;
    uint256 public fxs_bridged;
    uint256 public collat_bridged;

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
        address _timelock_address,
        address _amo_minter_address,
        address[3] memory _bridge_addresses,
        address _destination_address_override,
        string memory _non_evm_destination_address,
        string memory _name
    ) Owned(_owner) {
        // Core
        timelock_address = _timelock_address;

        // Bridge related
        bridge_addresses = _bridge_addresses;
        destination_address_override = _destination_address_override;
        non_evm_destination_address = _non_evm_destination_address;

        // Informational
        name = _name;

        // AMO Minter related
        amo_minter_address = _amo_minter_address;
        amo_minter = IFraxAMOMinter(_amo_minter_address);

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
        allocations[0] = tkn_bals[0]; // Unbridged FRAX
        allocations[1] = frax_bridged; // Bridged FRAX
        allocations[2] = allocations[0] + allocations[1]; // Total FRAX

        // FXS
        allocations[3] = tkn_bals[1]; // Unbridged FXS
        allocations[4] = fxs_bridged; // Bridged FXS
        allocations[5] = allocations[3] + allocations[4]; // Total FXS

        // Collateral
        allocations[6] = tkn_bals[2] * (10 ** missing_decimals); // Unbridged Collateral, in E18
        allocations[7] = collat_bridged * (10 ** missing_decimals); // Bridged Collateral, in E18
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
        // Get the allocations
        uint256[10] memory allocations = showAllocations();

        // FRAX portion is Frax * CR
        uint256 frax_portion_with_cr = (allocations[2] * FRAX.global_collateral_ratio()) / PRICE_PRECISION;

        // Collateral portion
        uint256 collat_portion = allocations[8];

        // Total value, not including CR, ignoring FXS
        frax_val_e18 = allocations[2] + allocations[8];

        // Collat value, accounting for CR on the FRAX portion
        collat_val_e18 = collat_portion + frax_portion_with_cr;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function bridge(address token_address, uint256 token_amount) external onlyByOwnGov {
        // Get the token type
        uint256 token_type = getTokenType(token_address); 

        // Defaults to sending to this contract's address on the other side
        address address_to_send_to = address(this);

        if (destination_address_override != address(0)) address_to_send_to = destination_address_override;

        // Can be overridden
        _bridgingLogic(token_type, address_to_send_to, token_amount);
        
        // Account for the bridged balances
        if (token_type == 0){
            frax_bridged += token_amount;
        }
        else if (token_type == 1){
            fxs_bridged += token_amount;
        }
        else {
            collat_bridged += token_amount;
        }
    }

    // Meant to be overriden
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal virtual {
        revert("Need bridging logic");
    }

    /* ========== Burns and givebacks ========== */
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.approve(amo_minter_address, frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);

        // Update the balance after the transfer goes through
        if (frax_amount >= frax_bridged) frax_bridged = 0;
        else {
            frax_bridged -= frax_amount;
        }
    }

    // Burn unneeded or excess FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGov {
        FXS.approve(amo_minter_address, fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);

        // Update the balance after the transfer goes through
        if (fxs_amount >= fxs_bridged) fxs_bridged = 0;
        else {
            fxs_bridged -= fxs_amount;
        }
    }

    // Give collat profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGov {
        collateral_token.approve(amo_minter_address, collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);

        // Update the balance after the transfer goes through
        if (collat_amount >= collat_bridged) collat_bridged = 0;
        else {
            collat_bridged -= collat_amount;
        }
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
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
