// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== GovernanceAMO ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";
import "../Frax/Frax.sol";
import "../Utils/ReentrancyGuard.sol";
import "../Utils/StringHelpers.sol";
import "./GovernorBravoDelegate.sol";
import "../ERC20/Variants/Comp.sol";

// Inheritance
import "../Staking/Owned.sol";
import "../Staking/Pausable.sol";

contract GovernanceAMO is Owned, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    FRAXStablecoin private FRAX;
    ERC20 public rewardsToken0;
    ERC20 public rewardsToken1;
    ERC20 public stakingToken;
    uint256 public periodFinish;

    // Constant for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant MULTIPLIER_BASE = 1e6;

    address public owner_address;
    address public timelock_address; // Governance timelock address

    address public comp_address;
    address public comp_governor_address;

    Comp private COMP;
    GovernorBravoDelegate private CompGovernor;



    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address
    ) public Owned(_owner){
        owner_address = _owner;
        timelock_address = _timelock_address;
    }

    /* ========== VIEWS ========== */

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setCompAddress(address _comp_address) external onlyByOwnGov {
        comp_address = _comp_address;
        COMP = Comp(comp_address);
    }

    function setCompGovernorAddress(address _comp_governor_address) external onlyByOwnGov {
        comp_governor_address = _comp_governor_address;
        CompGovernor = GovernorBravoDelegate(comp_governor_address);
    }

    struct sig {
        uint proposalId;
        uint8 support;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function voteWithSignatures(sig[] memory signatures) external onlyByOwnGov {
        // for(int i = 0; i < signatures.length; i++){
            // try COMP.signatures[i]
        // }
    }

    /* ========== EVENTS ========== */
}
