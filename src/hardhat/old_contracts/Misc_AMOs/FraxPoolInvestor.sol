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
// ========================= FraxPoolInvestor =========================
// ====================================================================


import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Governance/AccessControl.sol";
import "../Frax/Pools/FraxPoolvAMM.sol";

// contract FraxPoolInvestor is AccessControl {
//     using SafeMath for uint256;

//     /* ========== STATE VARIABLES ========== */

//     ERC20 private collateral_token;
//     FraxPoolvAMM private pool;
//     address public collateral_address;
//     address public pool_address;
//     address public owner_address;
//     address public timelock_address;

//     // AccessControl Roles
//     bytes32 private constant WITHDRAWAL_PAUSER = keccak256("WITHDRAWAL_PAUSER");

//     // AccessControl state variables
//     bool public withdrawalPaused = false;

//     uint256 public immutable missing_decimals;

//     // yearn vaults?

//     /* ========== MODIFIERS ========== */

//     modifier onlyByOwnGov() {
//         require(msg.sender == timelock_address || msg.sender == owner_address, "Not owner or timelock");
//         _;
//     }

//     modifier onlyPool() {
//         require(msg.sender == pool_address, "You are not the FraxPool");
//         _;
//     }
 
//     /* ========== CONSTRUCTOR ========== */
    
//     constructor (
//         address _pool_address,
//         address _collateral_address,
//         address _creator_address,
//         address _timelock_address
//     ) public {
//         pool_address = _pool_address;
//         pool = FraxPoolvAMM(_pool_address);
//         collateral_address = _collateral_address;
//         collateral_token = ERC20(_collateral_address);
//         timelock_address = _timelock_address;
//         owner_address = _creator_address;
//         missing_decimals = uint(18).sub(collateral_token.decimals());

//         _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
//         grantRole(WITHDRAWAL_PAUSER, timelock_address);
//         grantRole(WITHDRAWAL_PAUSER, owner_address);
//     }

//     /* ========== VIEWS ========== */

//     // BuyAndBurnFXS

//     /* ========== PUBLIC FUNCTIONS ========== */
    

//     /* ========== RESTRICTED FUNCTIONS ========== */

//     function toggleWithdrawing() external {
//         require(hasRole(WITHDRAWAL_PAUSER, msg.sender));
//         withdrawalPaused = !withdrawalPaused;
//     }

//     function setTimelock(address new_timelock) external onlyByOwnGov {
//         timelock_address = new_timelock;
//     }

//     function setOwner(address _owner_address) external onlyByOwnGov {
//         owner_address = _owner_address;
//     }

//     function setPool(address _pool_address) external onlyByOwnGov {
//         pool_address = _pool_address;
//         pool = FraxPoolvAMM(_pool_address);
//     }

//     /* ========== EVENTS ========== */

// }