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
// ====================== NoopRewardsDistributor ======================
// ====================================================================
// Used for retired gauges. Does nothing, but has the necessary ABI

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";
import "../Utils/ReentrancyGuard.sol";

contract NoopRewardsDistributor is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    address public reward_token_address;

    // Admin addresses
    address public timelock_address;

    // Constants
    uint256 private constant MULTIPLIER_PRECISION = 1e18;
    uint256 private constant ONE_WEEK = 604800;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address
    ) Owned(_owner) {
        timelock_address = _timelock_address;
    }


    /* ========== MUTATIVE FUNCTIONS ========== */

    // No-op
    function distributeReward(address gauge_address) public nonReentrant returns (uint256 weeks_elapsed, uint256 reward_tally) {
        // Do nothing

        emit RewardDistributed(gauge_address, 0);
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


    /* ========== EVENTS ========== */

    event RewardDistributed(address indexed gauge_address, uint256 reward_amount);
    event RecoveredERC20(address token, uint256 amount);
}
