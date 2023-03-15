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
*   @title FraxFamilialPitchGauge
*   @notice Redistributes gauge rewards to multiple gauges (FraxFarms) based on each "child" gauge's `total_combined_weight`.
*   @author Modified version of the FraxMiddlemanGauge - by ZrowGz @ Pitch Foundation
*   @dev To use this:
*       - Add to GaugeController as a gauge
*       - Add to FXS Rewards Distributor as a gauge
*           * BUT do not set as a middleman gauge on the FXS Rewards Distributor
*       - Set as the `gaugeController` & `rewardsDistributor` on all children FraxFarms
*       - Disable rewards for pre-existing gauges on the FXS Rewards Distributor
*/

// import "../Math/Math.sol";
// import "../Math/SafeMath.sol";
// import "../ERC20/ERC20.sol";
// import "../ERC20/SafeERC20.sol";
import "./IFraxGaugeFXSRewardsDistributor.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";
// import "../Utils/ReentrancyGuard.sol";
import "../Staking/IFraxFarm.sol";
import "./IFraxGaugeControllerV2.sol";

/**
*   @title FraxFamilialPitchGauge
*   @notice Redistributes gauge rewards to multiple gauges (FraxFarms) based on each "child" gauge's `total_combined_weight`.
*   @author Modified version of the FraxMiddlemanGauge - by ZrowGz @ Pitch Foundation
*   @dev To use this:
*       - Add to GaugeController as a gauge
*       - Add to FXS Rewards Distributor as a gauge
*           * BUT do not set as a middleman gauge on the FXS Rewards Distributor
*       - Set as the `gaugeController` & `rewardsDistributor` on all children FraxFarms
*       - Disable rewards for pre-existing gauges on the FXS Rewards Distributor
*/

contract FraxFamilialPitchGauge is Owned {//, ReentrancyGuard {
    // using SafeMath for uint256;
    // using SafeERC20 for ERC20;

    // error LatestPeriodNotFinished(uint256,uint256);

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
    address internal immutable reward_token;// = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0; // FXS

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
    mapping(address => uint256) internal gauge_to_reward_tally;

    // Reward period & Time tracking
    /// @notice The timestamp of the last reward period
    uint256 internal periodFinish;
    /// @notice The number of seconds in a week
    uint256 internal constant rewardsDuration = 604800; // 7 * 86400  (7 days)
    /// @notice For the first time children are added, pull in the reward period finish for each.
    bool internal isFirstTimeAddingGauges;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        string memory _name,
        address _owner,
        address _timelock_address,
        address _rewards_distributor,
        address _gauge_controller,
        address _reward_token
    ) Owned(_owner) {
        timelock_address = _timelock_address;

        rewards_distributor = _rewards_distributor;

        name = _name;

        gauge_controller = _gauge_controller;
        reward_token = _reward_token;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// This should only have the full recalculation logic ran once per epoch.
    /// The first gauge to call this will trigger the full tvl & weight recalc
    /// As other familial gauges call it, they'll be able to obtain the updated values from storage
    /// The farm must call this through the `sync_gauge_weights` or `sync` functions
    /// @notice Updates the relative weights of all child gauges
    /// @dev Note: unfortunately many of the steps in this process need to be done after completing previous step for all children
    //       - this results in numerous for loops being used
    function gauge_relative_weight_write(address child_gauge, uint256 timestamp) external returns (uint256) {
        // check that the child gauge is active
        require(gauge_active[child_gauge], "Gauge not active");

        // If now is after the last time everything was updated, obtain all values for all gauges & recalculate new rebalanced weights
        if (block.timestamp > time_total_stored) {
            //// First, update all the state variables applicable to all child gauges
            // store the most recent time_total for the farms to use & prevent this logic from being executed until epoch
            time_total_stored = IFraxGaugeController(gauge_controller).time_total();//latest_time_total;

            // get & set the gauge controller's last global emission rate
            // note this should be the same for all gauges, but if there were to be multiple controllers,
            // we would need to have the emission rate for each of them.
            global_emission_rate_stored = IFraxGaugeController(gauge_controller).global_emission_rate();//gauge_to_controller[gauges[i]]).global_emission_rate();

            // to prevent re-calling the first gauge
            address _gauge_calling;
            for (uint256 i; i < gauges.length; i++) {
                if (child_gauge == gauges[i]) {
                    _gauge_calling = gauges[i];
                }
            }

            /// NOTE requiring caller to be `msg.sender` ensures all gauges are distributed to.
            ///      To access this function, must call `sync_gauge_weights` on the gauge, which will call this
            // require it to be one of the child gauges to ensure correctly updating all children
            require(_gauge_calling == child_gauge && child_gauge == msg.sender, "Not a child gauge");

            // zero out the stored familial combined weight
            familial_total_combined_weight = 0;

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

            // divide the reward_tally amount by the gauge's allocation
            // note this will be used when the farm calls `distributeReward`
            for (uint256 i; i < gauges.length; i++) {
                if (gauge_active[gauges[i]]) { 
                    gauge_to_reward_tally[gauges[i]] = reward_tally * gauge_to_total_combined_weight[gauges[i]] / familial_total_combined_weight;
                }
            }

            // call `sync_gauge_weights` on the other gauges
            for (uint256 i; i < gauges.length; i++) {
                if (gauges[i] != _gauge_calling && gauge_active[gauges[i]]) {
                    IFraxFarm(gauges[i]).sync_gauge_weights(true);
                }
            }
            /// Now all farms should have their relative weights updated. Let the calling farm finish execution
        }

        // finally, return the gauge's (msg.sender) rebalanced relative weight
        return gauge_to_last_relative_weight[child_gauge];
    }

    /// This is called by the farm during `retroCatchUp`
    /// If this is registered as a middleman gauge, distributor will call pullAndBridge, which will distribute the reward to the gauge
    /// note it might be easier to NOT set this as a middleman on the distributor
    /// Needs to be reentered to allow all farms to execute in one call, so is only callable by a gauge
    function distributeReward(address child_gauge) public returns (uint256, uint256) {
        // check that the child gauge is active
        require(gauge_active[child_gauge], "Gauge not active");

        if (block.timestamp >= periodFinish) {
            // Ensure the provided reward amount is not more than the balance in the contract.
            // This keeps the reward rate in the right range, preventing overflows due to
            // very high values of rewardRate in the earned and rewardsPerToken functions;
            // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
            uint256 num_periods_elapsed = uint256(block.timestamp - periodFinish) / rewardsDuration; // Floor division to the nearest period

            // lastUpdateTime = periodFinish;
            // update period finish here so that the next call to `distributeReward` will bypapss this logic
            periodFinish = periodFinish + ((num_periods_elapsed + 1) * rewardsDuration);

            // to prevent re-calling the first gauge during the farm `sync` calls
            address _gauge_calling;
            for (uint256 i; i < gauges.length; i++) {
                if (child_gauge == gauges[i]) {
                    _gauge_calling = gauges[i];
                }
            }

            /// NOTE requiring caller to be `msg.sender` ensures all gauges are distributed to.
            ///      To access this function, must call `sync` on the gauge, which will call this
            // require it to be one of the child gauges to ensure correctly updating all children
            require(_gauge_calling == child_gauge && child_gauge == msg.sender, "Not a child gauge");

            // now that this logic won't be ran on the next call & all gauges are within periodFinish, call each farm's `sync`
            for (uint256 i; i < gauges.length; i++) {
                if (gauges[i] != _gauge_calling && gauge_active[gauges[i]]) {
                    IFraxFarm(gauges[i]).sync();
                }
            }
            /// Now all gauges should have their rewards distributed. Let the calling gauge finish execution.
        }

        // preserve the gauge's reward tally for returning to the gauge
        uint256 claimingGaugeRewardTally = gauge_to_reward_tally[child_gauge];
        
        /// when the reward is distributed, send the amount in gauge_to_reward_tally to the gauge & zero that value out
        TransferHelper.safeTransfer(reward_token, child_gauge, claimingGaugeRewardTally);
        
        // reset the reward tally to zero for the gauge
        gauge_to_reward_tally[child_gauge] = 0;
        emit ChildGaugeRewardDistributed(child_gauge, gauge_to_reward_tally[child_gauge]);
        
        return (weeks_elapsed, claimingGaugeRewardTally);
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

    function addChildGauge(address[] calldata _gauges) external onlyByOwnGov {
        gauges = _gauges;
        // set the latest period finish for the child gauges
        for (uint256 i; i < gauges.length; i++) {
            // set gauge to active
            gauge_active[_gauges[i]] = true;

            emit ChildGaugeAdded(_gauges[i], gauges.length - 1);

            if (isFirstTimeAddingGauges) {
                uint256 childGaugePeriodFinish = IFraxFarm(gauges[i]).periodFinish();
                if (childGaugePeriodFinish > periodFinish) {
                    periodFinish = childGaugePeriodFinish;
                }
            }
        }
        // don't need to re-run that lookup to sync in the future
        if (isFirstTimeAddingGauges) {
            isFirstTimeAddingGauges = false;
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
    /// @return reward_tally The redistributed reward tally of the gauge
    function getChildGaugeValues(address child_gauge) external view returns (uint256, uint256) {
        return (
            gauge_to_last_relative_weight[child_gauge],
            gauge_to_reward_tally[child_gauge]
        );
    }

    /// @notice Returns the `periodFinish` stored
    /// @return periodFinish The periodFinish timestamp when gauges can call to distribute rewards
    function getPeriodFinish() external view returns (uint256) {
        return periodFinish;
    }

    /* ========== EVENTS ========== */
    event ChildGaugeAdded(address gauge, uint256 gauge_index);
    event ChildGaugeDeactivated(address gauge, uint256 gauge_index);
    event GaugeControllerChanged(address old_controller, address new_controller);
    event RewardsDistributorChanged(address old_distributor, address new_distributor);
    event FamilialRewardClaimed(address familial_gauge, uint256 reward_amount, uint256 weeks_elapsed);
    event ChildGaugeRewardDistributed(address gauge, uint256 reward_amount);
    event RecoveredERC20(address token, uint256 amount);
}