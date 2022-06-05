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
// ================== FraxGaugeFXSRewardsDistributor ==================
// ====================================================================
// Looks at the gauge controller contract and pushes out FXS rewards once
// a week to the gauges (farms)

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import "./IFraxGaugeController.sol";
import "./FraxMiddlemanGauge.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";
import "../Utils/ReentrancyGuard.sol";

contract FraxGaugeFXSRewardsDistributor is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    address public reward_token_address;
    IFraxGaugeController public gauge_controller;

    // Admin addresses
    address public timelock_address;
    address public curator_address;

    // Constants
    uint256 private constant MULTIPLIER_PRECISION = 1e18;
    uint256 private constant ONE_WEEK = 604800;

    // Gauge controller related
    mapping(address => bool) public gauge_whitelist;
    mapping(address => bool) public is_middleman; // For cross-chain farms, use a middleman contract to push to a bridge
    mapping(address => uint256) public last_time_gauge_paid;

    // Booleans
    bool public distributionsOn;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnerOrCuratorOrGovernance() {
        require(msg.sender == owner || msg.sender == curator_address || msg.sender == timelock_address, "Not owner, curator, or timelock");
        _;
    }

    modifier isDistributing() {
        require(distributionsOn == true, "Distributions are off");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address,
        address _curator_address,
        address _reward_token_address,
        address _gauge_controller_address
    ) Owned(_owner) {
        curator_address = _curator_address;
        timelock_address = _timelock_address;

        reward_token_address = _reward_token_address;
        gauge_controller = IFraxGaugeController(_gauge_controller_address);

        distributionsOn = true;

    }

    /* ========== VIEWS ========== */

    // Current weekly reward amount
    function currentReward(address gauge_address) public view returns (uint256 reward_amount) {
        uint256 rel_weight = gauge_controller.gauge_relative_weight(gauge_address, block.timestamp);
        uint256 rwd_rate = (gauge_controller.global_emission_rate()).mul(rel_weight).div(1e18);
        reward_amount = rwd_rate.mul(ONE_WEEK);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // Callable by anyone
    function distributeReward(address gauge_address) public isDistributing nonReentrant returns (uint256 weeks_elapsed, uint256 reward_tally) {
        require(gauge_whitelist[gauge_address], "Gauge not whitelisted");
        
        // Calculate the elapsed time in weeks. 
        uint256 last_time_paid = last_time_gauge_paid[gauge_address];

        // Edge case for first reward for this gauge
        if (last_time_paid == 0){
            weeks_elapsed = 1;
        }
        else {
            // Truncation desired
            weeks_elapsed = (block.timestamp).sub(last_time_gauge_paid[gauge_address]) / ONE_WEEK;

            // Return early here for 0 weeks instead of throwing, as it could have bad effects in other contracts
            if (weeks_elapsed == 0) {
                return (0, 0);
            }
        }

        // NOTE: This will always use the current global_emission_rate()
        reward_tally = 0;
        for (uint i = 0; i < (weeks_elapsed); i++){ 
            uint256 rel_weight_at_week;
            if (i == 0) {
                // Mutative, for the current week. Makes sure the weight is checkpointed. Also returns the weight.
                rel_weight_at_week = gauge_controller.gauge_relative_weight_write(gauge_address, block.timestamp);
            }
            else {
                // View
                rel_weight_at_week = gauge_controller.gauge_relative_weight(gauge_address, (block.timestamp).sub(ONE_WEEK * i));
            }
            uint256 rwd_rate_at_week = (gauge_controller.global_emission_rate()).mul(rel_weight_at_week).div(1e18);
            reward_tally = reward_tally.add(rwd_rate_at_week.mul(ONE_WEEK));
        }

        // Update the last time paid
        last_time_gauge_paid[gauge_address] = block.timestamp;

        if (is_middleman[gauge_address]){
            // Cross chain: Pay out the rewards to the middleman contract
            // Approve for the middleman first
            ERC20(reward_token_address).approve(gauge_address, reward_tally);

            // Trigger the middleman
            FraxMiddlemanGauge(gauge_address).pullAndBridge(reward_tally);
        }
        else {
            // Mainnet: Pay out the rewards directly to the gauge
            TransferHelper.safeTransfer(reward_token_address, gauge_address, reward_tally);
        }

        emit RewardDistributed(gauge_address, reward_tally);
    }

    /* ========== RESTRICTED FUNCTIONS - Curator / migrator callable ========== */

    // For emergency situations
    function toggleDistributions() external onlyByOwnerOrCuratorOrGovernance {
        distributionsOn = !distributionsOn;

        emit DistributionsToggled(distributionsOn);
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function setGaugeState(address _gauge_address, bool _is_middleman, bool _is_active) external onlyByOwnGov {
        is_middleman[_gauge_address] = _is_middleman;
        gauge_whitelist[_gauge_address] = _is_active;

        emit GaugeStateChanged(_gauge_address, _is_middleman, _is_active);
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setCurator(address _new_curator_address) external onlyByOwnGov {
        curator_address = _new_curator_address;
    }

    function setGaugeController(address _gauge_controller_address) external onlyByOwnGov {
        gauge_controller = IFraxGaugeController(_gauge_controller_address);
    }

    /* ========== EVENTS ========== */

    event RewardDistributed(address indexed gauge_address, uint256 reward_amount);
    event RecoveredERC20(address token, uint256 amount);
    event GaugeStateChanged(address gauge_address, bool is_middleman, bool is_active);
    event DistributionsToggled(bool distibutions_state);
}
