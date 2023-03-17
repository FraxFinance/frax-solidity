// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.17;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================== FraxMiddlemanGauge ========================
// ====================================================================
/**
*   @title FraxFamilialGaugeDistributor
*   @notice Redistributes gauge rewards to multiple gauges (FraxFarms) based on each "child" gauge's `total_combined_weight`.
*   @author Modified version of the FraxMiddlemanGauge - by ZrowGz @ Pitch Foundation
*   @dev To use this:
    *  - Set each Farm's gaugeController to address(0)
    *  - Set each Farm's rewardsDistributor to this contract
    *  - Set this as each Farm's reward token manager for FXS
* Note: The farms will no longer communicate with the Frax gauge controller or the FXS rewards distributor
*       Instead, after each reward period, the first interaction will call this contract during `sync()`
*       This will then update the values from the controller & pull rewards in from distributor,
*         sending the corrected amount to each child farm & writing the reward rate for FXS. 
*/

import "./IFraxGaugeFXSRewardsDistributor.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";
import "../Staking/IFraxFarm.sol";
import "./IFraxGaugeControllerV2.sol";
import "../ERC20/IERC20.sol";

contract FraxFamilialGaugeDistributor is Owned {
    /* ========== STATE VARIABLES ========== */
    /// Note: variables made internal for execution gas savings, available through getters below

    // Informational
    string public name;

    ///// State Address Storage /////
    /// @notice Address of the timelock
    address internal timelock_address;
    /// @notice Address of the gauge controller
    address internal immutable gauge_controller;
    /// @notice Address of the FXS Rewards Distributor
    address internal immutable rewards_distributor;
    /// @notice Address of the rewardToken
    // address internal immutable reward_token;// = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0; // FXS
    address internal constant reward_token = address(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0); // FXS

    ///// Familial Gauge Storage /////
    /// @notice Array of all child gauges
    address[] internal gauges;
    /// @notice Whether a child gauge is active or not
    mapping(address => bool) internal gauge_active;
    /// @notice Global reward emission rate from Controller
    uint256 internal global_emission_rate_stored;
    /// @notice Time of the last vote from Controller
    uint256 internal time_total_stored;

    /// @notice Total vote weight from gauge controller vote
    uint256 internal total_familial_relative_weight;
    /// @notice Redistributed relative gauge weights by gauge combined weight
    mapping(address => uint256) internal gauge_to_last_relative_weight;

    /// @notice Sum of all child gauge `total_combined_weight`
    uint256 internal familial_total_combined_weight;
    /// @notice Each gauge's combined weight for this reward epoch, available at the farm
    mapping(address => uint256) internal gauge_to_total_combined_weight;
    
    // Distributor provided 
    /// @notice The timestamp of the vote period
    uint256 public weeks_elapsed;
    /// @notice The amount of FXS awarded to the family by the vote, from the Distributor
    uint256 public reward_tally;
    /// @notice The redistributed FXS rewards payable to each child gauge
    mapping(address => uint256) internal gauge_to_reward_amount;

    // Reward period & Time tracking
    /// @notice The timestamp of the last reward period
    uint256 internal periodFinish;
    /// @notice The number of seconds in a week
    uint256 internal constant rewardsDuration = 604800; // 7 * 86400  (7 days)

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        string calldata _name,
        address _owner,
        address _timelock_address,
        address _rewards_distributor,
        address _gauge_controller//,
        // address _reward_token
    ) Owned(_owner) {
        timelock_address = _timelock_address;

        rewards_distributor = _rewards_distributor;

        name = _name;

        gauge_controller = _gauge_controller;
        // reward_token = _reward_token;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// This is called by the farm during `retroCatchUp`
    /// If this is registered as a middleman gauge, distributor will call pullAndBridge, which will distribute the reward to the gauge
    /// note it might be easier to NOT set this as a middleman on the distributor
    /// Needs to be reentered to allow all farms to execute in one call, so is only callable by a gauge
        /// This should only have the full recalculation logic ran once per epoch.
    /// The first gauge to call this will trigger the full tvl & weight recalc
    /// As other familial gauges call it, they'll be able to obtain the updated values from storage
    /// The farm must call this through the `sync_gauge_weights` or `sync` functions
    /// @notice Updates the relative weights of all child gauges
    /// @dev Note: unfortunately many of the steps in this process need to be done after completing previous step for all children
    //       - this results in numerous for loops being used

    /// @notice Obtains the rewards, calculates each farm's FXS reward rate, update's the farm reward rate, & sends the FXS to the child
    function distributeReward(address child_gauge) public returns (uint256, uint256) {
        // check that the child gauge is active
        require(gauge_active[child_gauge], "Gauge not active");
        require(child_gauge == msg.sender, "caller!farm");

        // the first call to this within the new rewards period should update everything & call all child farms
        // the call to this is triggered by any interaction with the farm by a user, or by calling `sync`
        if (block.timestamp > time_total_stored) {

            ////////// FIRST - update the time period variables //////////

            // store the most recent time_total for the farms to use & prevent this logic from being executed until epoch
            time_total_stored = IFraxGaugeController(gauge_controller).time_total();//latest_time_total;

            ////////// SECOND - get the reward rates and calculate them for the new period (from controller & distributor) //////////

            // get & set the gauge controller's last global emission rate
            global_emission_rate_stored = IFraxGaugeController(gauge_controller).global_emission_rate();//gauge_to_controller[gauges[i]]).global_emission_rate();

            // get the familial vote weight for this period
            total_familial_relative_weight = 
                IFraxGaugeController(gauge_controller).gauge_relative_weight_write(address(this), timestamp);

            // update all the gauge weights
            for (uint256 i; i < gauges.length; i++) {
                // it shouldn't be zero, unless we don't use `delete` to remove a gauge
                if (gauge_active[gauges[i]]) { 
                    /// update the child gauges' total combined weights
                    gauge_to_total_combined_weight[gauges[i]] = IFraxFarm(gauges[i]).totalCombinedWeight();
                    familial_total_combined_weight += gauge_to_total_combined_weight[gauges[i]];
                }
            }

            // divvy up the relative weights based on each gauges `total combined weight` 
            for (uint256 i; i < gauges.length; i++) {
                if (gauge_active[gauges[i]]) { 
                    gauge_to_last_relative_weight[gauges[i]] = 
                        gauge_to_total_combined_weight[gauges[i]] * total_familial_relative_weight / familial_total_combined_weight;
                }
            }

            // pull in the reward tokens allocated to the fam
            (weeks_elapsed, reward_tally) = IFraxGaugeFXSRewardsDistributor(rewards_distributor).distributeReward(address(this));
            emit FamilialRewardClaimed(address(this), weeks_elapsed, reward_tally);

            // ensure that reward_tally == the amount of FXS held in this contract
            require(reward_tally == IERC20(reward_token).balanceOf(address(this)), "tally!=balance");
            
            // divide the reward_tally amount by the gauge's allocation to get the allocation
            for (uint256 i; i < gauges.length; i++) {
                if (gauge_active[gauges[i]]) { 
                    // gauge reward token allocation = family reward amount * gauge's total combined weight / familial total combined weight
                    // note this is NOT the reward rate to write to the farm, just the redistributed amount
                    gauge_to_reward_amount[gauges[i]] = reward_tally * gauge_to_total_combined_weight[gauges[i]] / familial_total_combined_weight;
                }
            }

            // call `sync_gauge_weights` on the other gauges
            for (uint256 i; i < gauges.length; i++) {
                if (gauges[i] != child_gauge && gauge_active[gauges[i]]) {
                    IFraxFarm(gauges[i]).sync_gauge_weights(true);
                }
            }

            ////////// THIRD - trigger all child gauges to call this contract //////////

            // now that this logic won't be ran on the next call & all gauges are updated, call each farm's `sync`
            // during the first call to this contract, it will call all other child farms, but not itsself again
            for (uint256 i; i < gauges.length; i++) {
                // if the iteration is not the initial calling gauge & the gauge is active, call `sync`
                if (gauges[i] != child_gauge && gauge_active[gauges[i]]) {
                    IFraxFarm(gauges[i]).sync();
                }
            }

            ////////// FINALLY - all other farms are updated, let the calling farm finish execution //////////
            /// @dev: this contract, after execution through each child farm, should not retain any token!
        }

        // preserve the gauge's reward tally for returning to the gauge
        uint256 claimingGaugeRewardAmount = gauge_to_reward_amount[child_gauge];
        
        /// when the reward is distributed, send the amount in gauge_to_reward_amount to the gauge & zero that value out
        TransferHelper.safeTransfer(reward_token, child_gauge, claimingGaugeRewardAmount);
        
        // Update the child farm reward vars: reward token, the reward rate/tally, zero address for gauge controller, this address as distributor
        IFraxFarm(child_gauge).setRewardRates(rewardToken, (claimingGaugeRewardAmount / rewardsDuration), address(0), address(this));
        
        // reset the reward tally to zero for the gauge
        gauge_to_reward_amount[child_gauge] = 0;
        emit ChildGaugeRewardDistributed(child_gauge, claimingGaugeRewardAmount);

        // the farm doesn't actually write this anywhere
        return (weeks_elapsed, claimingGaugeRewardRate);
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
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

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function addChildren(address[] calldata _gauges) external onlyByOwnGov {
        // set the latest period finish for the child gauges
        for (uint256 i; i < _gauges.length; i++) {
            // set gauge to active
            gauge_active[_gauges[i]] = true;
            emit ChildGaugeAdded(_gauges[i], _gauges.length - 1);
        }
    }

    function deactivateChildGauge(uint256 _gaugeIndex) external onlyByOwnGov {
        emit ChildGaugeDeactivated(gauges[_gaugeIndex], _gaugeIndex);
        gauge_active[gauges[_gaugeIndex]] = false;
    }

    // function setRewardsDistributor(address _rewards_distributor) external onlyByOwnGov {
    //     emit RewardsDistributorChanged(rewards_distributor, _rewards_distributor);
    //     rewards_distributor = _rewards_distributor;
    // }

    // function setGaugeController(address _gauge_controller) external onlyByOwnGov {
    //     emit GaugeControllerChanged(gauge_controller, _gauge_controller);
    //     gauge_controller = _gauge_controller;
    // }

    /* ========== GETTERS ========== */

    /// @notice Matches the abi available in the farms 
    /// @return global_emission_rate The global emission rate from the controller
    function global_emission_rate() external view returns (uint256) {
        return global_emission_rate_stored;
    }

    /// @notice Matches the abi available in the farms
    /// @return time_total The end of the vote period from the controller
    function time_total() external view returns (uint256) {
        return time_total_stored;
    }

    
    function getNumberOfGauges() external view returns (uint256) {
        return gauges.length;
    }

    function getChildGauges() external view returns (address[] memory) {
        return gauges;
    }

    function getGaugeState(address _gauge) external view returns (bool) {
        return gauge_active[_gauge];
    }

    function getStateAddresses() external view returns (address, address, address, address) {
        return (timelock_address, gauge_controller, rewards_distributor, reward_token);
    }

    /// @notice Returns the last relative weight and reward tally for a gauge
    /// @return last_relative_weight The redistributed last relative weight of the gauge
    /// @return reward_tally The redistributed reward rate of the gauge
    function getChildGaugeValues(address child_gauge) external view returns (uint256, uint256) {
        return (
            gauge_to_last_relative_weight[child_gauge],
            gauge_to_reward_amount[child_gauge]
        );
    }

    /// @notice Returns the `periodFinish` stored
    /// @return periodFinish The periodFinish timestamp when gauges can call to distribute rewards
    function periodFinish() external view returns (uint256) {
        return periodFinish;
    }

    /* ========== EVENTS ========== */
    event ChildGaugeAdded(address gauge, uint256 gauge_index);
    event ChildGaugeDeactivated(address gauge, uint256 gauge_index);
    event GaugeControllerChanged(address old_controller, address new_controller);
    event RewardsDistributorChanged(address old_distributor, address new_distributor);
    event FamilialRewardClaimed(address familial_gauge, uint256 reward_amount, uint256 weeks_elapsed);
    event RecoveredERC20(address token, uint256 amount);

    event ChildGaugeRewardDistributed(address gauge, uint256 rewardAmount);
}