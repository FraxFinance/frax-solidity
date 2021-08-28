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
// Takes FRAX and collateral and bridges it to other chains for the purposes of seeding liquidity pools
// Ultimately accumulates trading fees for the protocol
// An AMO Minter will need to give tokens to this contract first

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/Math.sol";
import "../Frax/Frax.sol";
import "../Frax/FraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import "../Misc_AMOs/harmony/IERC20EthManager.sol";
import "../Misc_AMOs/polygon/IRootChainManager.sol";
import "../Misc_AMOs/solana/IWormhole.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

contract FraxLiquidityBridger is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    FRAXStablecoin private FRAX = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    FraxAMOMinter private amo_minter;
    ERC20 private collateral_token;

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
    address public bridge_address;
    uint256 public bridge_type;
    address public destination_address_override;
    string public non_evm_destination_address;
    uint256 public frax_bridged;
    uint256 public collat_bridged;

    // Collateral balance related
    uint256 public missing_decimals;
    uint256 public collatDollarBalanceStored = 0;
    bool public override_collat_balance;
    uint256 public override_collat_balance_amount;

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
        address _bridge_address,
        uint256 _bridge_type,
        address _destination_address_override,
        string memory _non_evm_destination_address
    ) Owned(_owner) {
        timelock_address = _timelock_address;

        // Bridge related
        bridge_address = _bridge_address;
        bridge_type = _bridge_type;
        destination_address_override = _destination_address_override;
        non_evm_destination_address = _non_evm_destination_address;

        // AMO Minter related
        amo_minter_address = _amo_minter_address;
        amo_minter = FraxAMOMinter(_amo_minter_address);

        // Collateral related
        collateral_address = amo_minter.collateral_address();
        col_idx = amo_minter.col_idx();
        collateral_token = ERC20(collateral_address);
        missing_decimals = amo_minter.missing_decimals();
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[5] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        allocations[0] = FRAX.balanceOf(address(this)); // Unbridged FRAX
        allocations[1] = frax_bridged; // Bridged FRAX
        allocations[2] = collateral_token.balanceOf(address(this)) * (10 ** missing_decimals); // Unbridged Collateral
        allocations[3] = collat_bridged * (10 ** missing_decimals); // Bridged Collateral
    
        // Total value, in E18 FRAX
        allocations[4] = allocations[0] + allocations[1] + allocations[2] + allocations[3]; // Total FRAX value
    }

    // Needed for the Frax contract to function 
    function collatDollarBalance() public view returns (uint256) {
        // Get the allocations
        uint256[5] memory allocations = showAllocations();

        // Get the collateral and FRAX portions
        uint256 collat_portion = allocations[2] + allocations[3];
        uint256 frax_portion = allocations[0] + allocations[1];

        // FRAX portion is Frax * CR
        frax_portion = (frax_portion * FRAX.global_collateral_ratio()) / PRICE_PRECISION;

        return collat_portion + frax_portion;
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        // Get the allocations
        uint256[5] memory allocations = showAllocations();

        frax_val_e18 = allocations[0] + allocations[1];
        collat_val_e18 = collatDollarBalance();
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function bridge(address token_address, uint256 token_amount) external onlyByOwnGov {
        require(token_address == address(FRAX) || token_address == collateral_address, "Invalid token address");
        require(bridge_address != address(0), "Invalid bridge address");

        // Defaults to sending to this contract's address on the other side
        address address_to_send_to = address(this);

        if (destination_address_override != address(0)) address_to_send_to = destination_address_override;

        if (bridge_type == 0) {
            // Avalanche [Anyswap]
            TransferHelper.safeTransfer(token_address, bridge_address, token_amount);
        }
        else if (bridge_type == 1) {
            // BSC
            TransferHelper.safeTransfer(token_address, bridge_address, token_amount);
        }
        else if (bridge_type == 2) {
            // Fantom [Multichain / Anyswap]
            // Bridge is 0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE
            TransferHelper.safeTransfer(token_address, bridge_address, token_amount);
        }
        else if (bridge_type == 3) {
            // Polygon
            // Bridge is 0xA0c68C638235ee32657e8f720a23ceC1bFc77C77
            // Interesting info https://blog.cryption.network/cryption-network-launches-cross-chain-staking-6cf000c25477

            // Approve
            IRootChainManager rootChainMgr = IRootChainManager(bridge_address);
            bytes32 tokenType = rootChainMgr.tokenToType(token_address);
            address predicate = rootChainMgr.typeToPredicate(tokenType);
            ERC20(token_address).approve(predicate, token_amount);
            
            // DepositFor
            bytes memory depositData = abi.encode(token_amount);
            rootChainMgr.depositFor(address_to_send_to, token_address, depositData);
        }
        else if (bridge_type == 4) {
            // Solana
            // Wormhole Bridge is 0xf92cD566Ea4864356C5491c177A430C222d7e678

            revert("Not supported yet");

            // // Approve
            // ERC20(token_address).approve(bridge_address, token_amount);

            // // lockAssets
            // require(non_evm_destination_address != 0, "Invalid destination");
            // // non_evm_destination_address = base58 -> hex
            // // https://www.appdevtools.com/base58-encoder-decoder
            // IWormhole(bridge_address).lockAssets(
            //     token_address,
            //     token_amount,
            //     non_evm_destination_address,
            //     1,
            //     fake_nonce,
            //     false
            // );
        }
        else if (bridge_type == 5) {
            // Harmony
            // Bridge is at 0x2dccdb493827e15a5dc8f8b72147e6c4a5620857

            // Approve
            ERC20(token_address).approve(bridge_address, token_amount);

            // lockToken
            IERC20EthManager(bridge_address).lockToken(token_address, token_amount, address_to_send_to);
        }

        // Account for the bridged balances
        if (token_address == address(FRAX)){
            frax_bridged += token_amount;
        }
        else {
            collat_bridged += token_amount;
        }

    }

    /* ========== Burns and givebacks ========== */

    // Give collat profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGov {
        collateral_token.approve(amo_minter_address, collat_amount);
        amo_minter.giveBackCollatFromAMO(collat_amount);

        // Update the balance after the transfer goes through
        collat_bridged -= collat_amount;
    }
   
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.approve(amo_minter_address, frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);

        // Update the balance after the transfer goes through
        frax_bridged -= frax_amount;
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setBridgeInfo(address _bridge_address, uint256 _bridge_type, address _destination_address_override, string memory _non_evm_destination_address) external onlyByOwnGov {
        _bridge_address = bridge_address;
        
        // 0: Avalanche
        // 1: BSC
        // 2: Fantom
        // 3: Polygon
        // 4: Solana
        // 5: Harmony
        bridge_type = _bridge_type;

        // Overridden cross-chain destination address
        destination_address_override = _destination_address_override;

        // Set bytes32 / non-EVM address on the other chain, if applicable
        non_evm_destination_address = _non_evm_destination_address;
        
        emit BridgeInfoChanged(_bridge_address, _bridge_type, _destination_address_override, _non_evm_destination_address);
    }

    /* ========== EVENTS ========== */

    event RecoveredERC20(address token, uint256 amount);
    event BridgeInfoChanged(address bridge_address, uint256 bridge_type, address destination_address_override, string non_evm_destination_address);
}
