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
// ================== FraxCrossChainLiquidityTracker ==================
// ====================================================================
// Tracks FRAX that is minted on other chains so that the collatDollarBalance is correct

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

import "../Math/Math.sol";
import "../Frax/IFrax.sol";
import "../Frax/FraxAMOMinter.sol";
import "../FXS/IFxs.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

contract FraxCrossChainLiquidityTracker is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs private FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    FraxAMOMinter private amo_minter;
    address private collateral_address;
    ERC20 public collateral_token;
    uint256 public missing_decimals;

    // Chain info
    uint256[] public chain_ids_array;
    string[] public chain_names_array;
    mapping(uint256 => bool) public valid_chains; // chain id -> chain name
    mapping(uint256 => string) public chainIDtoName; // chain id -> chain name
    mapping(string => uint256) public chainNameToID; // chain name -> chain id

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // AMO Minter related
    address private amo_minter_address;

    // Admin addresses
    address public timelock_address;

    // Balance tracking
    mapping(uint256 => uint256) public frax_minted; // chain id -> frax minted amount
    mapping(uint256 => uint256) public fxs_minted; // chain id -> fxs minted amount
    mapping(uint256 => uint256) public collat_bridged; // chain id -> collat bridged amount

    struct ChainBalance {
        uint256 chain_id;
        string chain_name;
        uint256 frax_balance;
        uint256 fxs_balance;
        uint256 collat_balance;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier validChain(uint256 chain_id) {
        require(valid_chains[chain_id], "Invalid chain");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address,
        address _amo_minter_address,
        address _collateral_address
    ) Owned(_owner) {
        timelock_address = _timelock_address;

        // AMO Minter related
        amo_minter_address = _amo_minter_address;
        amo_minter = FraxAMOMinter(_amo_minter_address);

        // Collateral related
        collateral_address = _collateral_address;
        collateral_token = ERC20(_collateral_address);
        missing_decimals = uint(18) - collateral_token.decimals();
    }

    /* ========== VIEWS ========== */

    // Helpful for UIs
    function allChainIDs() external view returns (uint256[] memory) {
        return chain_ids_array;
    }

    // Helpful for UIs
    function allChainNames() external view returns (string[] memory){
        return chain_names_array;
    }

    function totalsAcrossChains() public view returns (uint256 frax_tally, uint256 fxs_tally, uint256 collat_tally) {
        for (uint256 i = 0; i < chain_ids_array.length; i++){
            uint256 chain_id = chain_ids_array[i];
            frax_tally += frax_minted[chain_id];
            fxs_tally += fxs_minted[chain_id];
            collat_tally += collat_bridged[chain_id];
        }
    }

    // Helpful for UIs
    function totalMintedBreakdown() external view returns (ChainBalance[] memory chain_allocations) {
        chain_allocations = new ChainBalance[](chain_ids_array.length);
        for (uint256 i = 0; i < chain_ids_array.length; i++){
            uint256 chain_id = chain_ids_array[i];
            chain_allocations[i] = ChainBalance(
                chain_id,
                chainIDtoName[chain_id],
                frax_minted[chain_id],
                fxs_minted[chain_id],
                collat_bridged[chain_id]
            );
        }
    }

    // Returns dollar value of collateral held in this Frax pool, in E18
    function collatDollarBalance() external view returns (uint256 balance_tally) {
        (, uint256 col_bal) = dollarBalances();
        balance_tally = col_bal;
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        (uint256 frax_tally, , uint256 collat_tally) = totalsAcrossChains();

        frax_val_e18 = frax_tally + (collat_tally * (10 ** missing_decimals));
        collat_val_e18 = (frax_val_e18 * FRAX.global_collateral_ratio()) / PRICE_PRECISION;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // --------------------- FRAX ---------------------
    function noteFraxMint(uint256 chain_id, uint256 frax_amount) external validChain(chain_id) onlyByOwnGov {
        frax_minted[chain_id] += frax_amount;
    }

    // TODO: ACTUALLY MINT FRAX AND FXS AND JUST HOLD IT???

    function noteFraxRetirement(uint256 chain_id, uint256 frax_amount) external validChain(chain_id) onlyByOwnGov {
        if (frax_amount >= frax_minted[chain_id]) frax_minted[chain_id] = 0;
        else {
            frax_minted[chain_id] -= frax_amount;
        }
    }

    // --------------------- FXS ---------------------
    function noteFxsMint(uint256 chain_id, uint256 fxs_amount) external validChain(chain_id) onlyByOwnGov {
        fxs_minted[chain_id] += fxs_amount;
    }

    function noteFxsRetirement(uint256 chain_id, uint256 fxs_amount) external validChain(chain_id) onlyByOwnGov {
        if (fxs_amount >= fxs_minted[chain_id]) fxs_minted[chain_id] = 0;
        else {
            fxs_minted[chain_id] -= fxs_amount;
        }
    }

    // --------------------- Collat ---------------------
    // NEED TO BORROW / GIVE BACK COLLAT HERE


    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    // Adds a chain. 
    // Removals are not allowed as this could corrupt balance tracking
    // https://chainlist.org/
    function addChain(uint256 chain_id, string memory chain_name) public onlyByOwnGov {
        // Make sure this contract has been added as an AMO first
        require(amo_minter.amos(address(this)), "Contract not an AMO");

        // Check for 0 or preexisting chains
        require(chain_id != 0, "Zero chain_id detected");
        require((valid_chains[chain_id] == false) && (chainNameToID[chain_name] == 0), "Chain already exists");

        // Update the chain information
        valid_chains[chain_id] = true;
        chain_ids_array.push(chain_id);
        chain_names_array.push(chain_name);
        chainIDtoName[chain_id] = chain_name;
        chainNameToID[chain_name] = chain_id; 

        // Initialize the minted balance for the chain
        frax_minted[chain_id] = 0;

        emit ChainAdded(chain_id, chain_name);
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
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
    event ChainAdded(uint256 chain_id, string chain_name);
}
