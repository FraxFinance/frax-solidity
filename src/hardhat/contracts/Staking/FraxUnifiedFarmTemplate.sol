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
// ====================== FraxUnifiedFarmTemplate =====================
// ====================================================================
// Farming contract that accounts for veFXS
// Overrideable for UniV3, ERC20s, etc
// New for V2
//      - Multiple reward tokens possible
//      - Can add to existing locked stakes
//      - Contract is aware of proxied veFXS
//      - veFXS multiplier formula changed
// Apes together strong

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

// Originally inspired by Synthetix.io, but heavily modified by the Frax team
// (Locked, veFXS, and UniV3 portions are new)
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Curve/IveFXS.sol";
import "../Curve/IFraxGaugeController.sol";
import "../Curve/IFraxGaugeFXSRewardsDistributor.sol";
import "../ERC20/IERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Utils/ReentrancyGuard.sol";
import "./Owned.sol";

// Extra rewards
import "../Misc_AMOs/convex/IConvexBaseRewardPool.sol";

contract FraxUnifiedFarmTemplate is Owned, ReentrancyGuard {

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private constant veFXS = IveFXS(0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0);
    
    // Frax related
    address internal constant frax_address = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    /// @notice fraxPerLPToken is a public view function, although doesn't show the stored value
    uint256 public fraxPerLPStored;

    // Constant for various precisions
    uint256 internal constant MULTIPLIER_PRECISION = 1e18;

    // Time tracking
    /// @notice Ending timestamp for the current period
    uint256 public periodFinish;
    /// @notice Timestamp of the last update - when this period started
    uint256 public lastUpdateTime;

    // Lock time and multiplier settings
    uint256 public lock_max_multiplier = uint256(2e18); // E18. 1x = e18
    uint256 public lock_time_for_max_multiplier = 1 * 1095 * 86400; // 3 years
    // uint256 public lock_time_for_max_multiplier = 2 * 86400; // 2 days
    uint256 public lock_time_min = 594000; // 6.875 * 86400 (~7 day)

    // veFXS related
    uint256 public vefxs_boost_scale_factor = uint256(4e18); // E18. 4x = 4e18; 100 / scale_factor = % vefxs supply needed for max boost
    uint256 public vefxs_max_multiplier = uint256(2e18); // E18. 1x = 1e18
    uint256 public vefxs_per_frax_for_max_boost = uint256(4e18); // E18. 2e18 means 2 veFXS must be held by the staker per 1 FRAX
    mapping(address => uint256) internal _vefxsMultiplierStored;
    mapping(address => bool) internal valid_vefxs_proxies;
    mapping(address => mapping(address => bool)) internal proxy_allowed_stakers;

    // Reward addresses, gauge addresses, reward rates, and reward managers
    /// @notice token addr -> manager addr
    mapping(address => address) public rewardManagers; 
    address[] internal rewardTokens;
    address[] internal gaugeControllers;
    address[] internal rewardDistributors;
    uint256[] internal rewardRatesManual;
    mapping(address => bool) internal isRewardToken;
    /// @notice token addr -> token index
    mapping(address => uint256) public rewardTokenAddrToIdx;
    
    // Reward period
    uint256 public constant rewardsDuration = 604800; // 7 * 86400  (7 days)

    // Reward tracking
    uint256[] private rewardsPerTokenStored;
    mapping(address => mapping(uint256 => uint256)) private userRewardsPerTokenPaid; // staker addr -> token id -> paid amount
    mapping(address => mapping(uint256 => uint256)) private rewards; // staker addr -> token id -> reward amount
    mapping(address => uint256) public lastRewardClaimTime; // staker addr -> timestamp
    
    // Gauge tracking
    uint256[] private last_gauge_relative_weights;
    uint256[] private last_gauge_time_totals;

    // Balance tracking
    uint256 internal _total_liquidity_locked;
    uint256 internal _total_combined_weight;
    mapping(address => uint256) internal _locked_liquidity;
    mapping(address => uint256) internal _combined_weights;
    /// @notice Keeps track of LP balances proxy-wide. Needed to make sure the proxy boost is kept in line
    mapping(address => uint256) public proxy_lp_balances; 


    /// @notice Stakers set which proxy(s) they want to use
    /// @dev Keep public so users can see on the frontend if they have a proxy
    mapping(address => address) public staker_designated_proxies;

    // Admin booleans for emergencies and overrides
    bool public stakesUnlocked; // Release locked stakes in case of emergency
    bool internal withdrawalsPaused; // For emergencies
    bool internal rewardsCollectionPaused; // For emergencies
    bool internal stakingPaused; // For emergencies
    bool internal collectRewardsOnWithdrawalPaused; // For emergencies if a token is overemitted

    /* ========== STRUCTS ========== */
    // In children...


    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == 0x8412ebf45bAC1B340BbE8F318b928C466c4E39CA, "Not owner or timelock");
        _;
    }

    modifier onlyTknMgrs(address reward_token_address) {
        require(msg.sender == owner || isTokenManagerFor(msg.sender, reward_token_address), "Not owner or tkn mgr");
        _;
    }

    modifier updateRewardAndBalanceMdf(address account, bool sync_too) {
        _updateRewardAndBalance(account, sync_too, false);
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRatesManual,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors
    ) Owned(_owner) {

        // Address arrays
        rewardTokens = _rewardTokens;
        gaugeControllers = _gaugeControllers;
        rewardDistributors = _rewardDistributors;
        rewardRatesManual = _rewardRatesManual;

        for (uint256 i = 0; i < _rewardTokens.length; i++){ 
            // For fast token address -> token ID lookups later
            rewardTokenAddrToIdx[_rewardTokens[i]] = i;

            // Add to the mapping
            isRewardToken[_rewardTokens[i]] = true;

            // Initialize the stored rewards
            rewardsPerTokenStored.push(0);

            // Initialize the reward managers
            rewardManagers[_rewardTokens[i]] = _rewardManagers[i];

            // Push in empty relative weights to initialize the array
            last_gauge_relative_weights.push(0);

            // Push in empty time totals to initialize the array
            last_gauge_time_totals.push(0);
        }

        // Other booleans
        stakesUnlocked = false;

        // Initialization
        lastUpdateTime = block.timestamp;

        // Sync the first period finish here with the gauge's 
        // periodFinish = IFraxGaugeController(gaugeControllers[0]).time_total();
        periodFinish = IFraxGaugeController(0x3669C421b77340B2979d1A00a792CC2ee0FcE737).time_total();
        
    }

    /* ============= VIEWS ============= */

    // ------ REWARD RELATED ------

    /// @notice Checks if the caller is a manager for the reward token
    /// @param caller_addr The address of the caller
    /// @param reward_token_addr The address of the reward token
    /// @return bool True if the caller is a manager for the reward token
    function isTokenManagerFor(address caller_addr, address reward_token_addr) public view returns (bool){
        if (!isRewardToken[reward_token_addr]) return false;
        else if (caller_addr == address(0) || reward_token_addr == address(0)) return false;
        else if (caller_addr == owner) return true; // Contract owner
        else if (rewardManagers[reward_token_addr] == caller_addr) return true; // Reward manager
        return false; 
    }

    /// @notice Gets all the reward tokens this contract handles
    /// @return rewardTokens_ The reward tokens array
    function getAllRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

    // Last time the reward was applicable
    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    /// @notice The amount of reward tokens being paid out per second this period
    /// @param token_idx The index of the reward token
    /// @return rwd_rate The reward rate
    function rewardRates(uint256 token_idx) public view returns (uint256 rwd_rate) {
        address gauge_controller_address = gaugeControllers[token_idx];
        if (gauge_controller_address != address(0)) {
            rwd_rate = (IFraxGaugeController(gauge_controller_address).global_emission_rate() * last_gauge_relative_weights[token_idx]) / 1e18;
        }
        else {
            rwd_rate = rewardRatesManual[token_idx];
        }
    }

    // Amount of reward tokens per LP token / liquidity unit
    function rewardsPerToken() public view returns (uint256[] memory newRewardsPerTokenStored) {
        if (_total_liquidity_locked == 0 || _total_combined_weight == 0) {
            return rewardsPerTokenStored;
        }
        else {
            newRewardsPerTokenStored = new uint256[](rewardTokens.length);
            for (uint256 i = 0; i < rewardsPerTokenStored.length; i++){ 
                newRewardsPerTokenStored[i] = rewardsPerTokenStored[i] + (
                    ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRates(i) * 1e18) / _total_combined_weight
                );
            }
            return newRewardsPerTokenStored;
        }
    }

    /// @notice The amount of reward tokens an account has earned / accrued
    /// @dev In the edge-case of one of the account's stake expiring since the last claim, this will
    /// @param account The account to check
    /// @return new_earned Array of reward token amounts earned by the account
    function earned(address account) public view returns (uint256[] memory new_earned) {
        uint256[] memory reward_arr = rewardsPerToken();
        new_earned = new uint256[](rewardTokens.length);

        if (_combined_weights[account] > 0){
            for (uint256 i = 0; i < rewardTokens.length; i++){ 
                new_earned[i] = ((_combined_weights[account] * (reward_arr[i] - userRewardsPerTokenPaid[account][i])) / 1e18)
                                + rewards[account][i];
            }
        }
    }

    /// @notice The total reward tokens emitted in the given period
    /// @return rewards_per_duration_arr Array of reward token amounts emitted in the current period
    function getRewardForDuration() external view returns (uint256[] memory rewards_per_duration_arr) {
        rewards_per_duration_arr = new uint256[](rewardRatesManual.length);

        for (uint256 i = 0; i < rewardRatesManual.length; i++){ 
            rewards_per_duration_arr[i] = rewardRates(i) * rewardsDuration;
        }
    }


    // ------ LIQUIDITY AND WEIGHTS ------

    /// @notice The farm's total locked liquidity / LP tokens
    /// @return The total locked liquidity
    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    /// @notice A user's locked liquidity / LP tokens
    /// @param account The address of the account
    /// @return The locked liquidity
    function lockedLiquidityOf(address account) external view returns (uint256) {
        return _locked_liquidity[account];
    }

    /// @notice The farm's total combined weight of all users
    /// @return The total combined weight
    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    /// @notice Total 'balance' used for calculating the percent of the pool the account owns
    /// @notice Takes into account the locked stake time multiplier and veFXS multiplier
    /// @param account The address of the account
    /// @return The combined weight
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    /// @notice Calculates the combined weight for an account
    /// @notice Must be overriden by the child contract
    /// @dev account The address of the account
    function calcCurCombinedWeight(address account) public virtual view 
        returns (
            uint256 old_combined_weight,
            uint256 new_vefxs_multiplier,
            uint256 new_combined_weight
        )
    {
        revert("Need cCCW logic");
    }

    // ------ LOCK RELATED ------

    /// @notice Reads the lock boost multiplier for a given duration
    /// @param secs The duration of the lock in seconds
    /// @return The multiplier amount
    function lockMultiplier(uint256 secs) public view returns (uint256) {
        return Math.min(
            lock_max_multiplier,
            (secs * lock_max_multiplier) / lock_time_for_max_multiplier
        ) ;
    }

    // ------ FRAX RELATED ------

    /// @notice The amount of FRAX denominated value being boosted that an address has staked
    /// @param account The address to check
    /// @return The amount of FRAX value boosted
    function userStakedFrax(address account) public view returns (uint256) {
        return (fraxPerLPStored * _locked_liquidity[account]) / MULTIPLIER_PRECISION;
    }

    /// @notice The amount of FRAX denominated value being boosted that a proxy address has staked
    /// @param proxy_address The address to check
    /// @return The amount of FRAX value boosted
    function proxyStakedFrax(address proxy_address) public view returns (uint256) {
        return (fraxPerLPStored * proxy_lp_balances[proxy_address]) / MULTIPLIER_PRECISION;
    }

    /// @notice The maximum LP that can get max veFXS boosted for a given address at its current veFXS balance
    /// @param account The address to check
    /// @return The maximum LP that can get max veFXS boosted for a given address at its current veFXS balance
    function maxLPForMaxBoost(address account) external view returns (uint256) {
        return (veFXS.balanceOf(account) * MULTIPLIER_PRECISION * MULTIPLIER_PRECISION) / (vefxs_per_frax_for_max_boost * fraxPerLPStored);
    }

    /// @notice Must be overriden to return the current FRAX per LP token
    /// @return The current number of FRAX per LP token
    function fraxPerLPToken() public virtual view returns (uint256) {
        revert("Need fPLPT logic");
    }

    // ------ veFXS RELATED ------

    /// @notice The minimum veFXS required to get max boost for a given address
    /// @param account The address to check
    /// @return The minimum veFXS required to get max boost
    function minVeFXSForMaxBoost(address account) public view returns (uint256) {
        return (userStakedFrax(account) * vefxs_per_frax_for_max_boost) / MULTIPLIER_PRECISION;
    }

    /// @notice The minimum veFXS required to get max boost for a given proxy
    /// @param proxy_address The proxy address
    /// @return The minimum veFXS required to get max boost
    function minVeFXSForMaxBoostProxy(address proxy_address) public view returns (uint256) {
        return (proxyStakedFrax(proxy_address) * vefxs_per_frax_for_max_boost) / MULTIPLIER_PRECISION;
    }

    /// @notice Looks up a staker's proxy
    /// @param addr The address to check
    /// @return the_proxy The proxy address, or address(0)
    function getProxyFor(address addr) public view returns (address){
        if (valid_vefxs_proxies[addr]) {
            // If addr itself is a proxy, return that.
            // If it farms itself directly, it should use the shared LP tally in proxyStakedFrax
            return addr;
        }
        else {
            // Otherwise, return the proxy, or address(0)
            return staker_designated_proxies[addr];
        }
    }

    /// @notice The multiplier for a given account, based on veFXS
    /// @param account The account to check
    /// @return vefxs_multiplier The multiplier boost for the account
    function veFXSMultiplier(address account) public view returns (uint256 vefxs_multiplier) {
        // Use either the user's or their proxy's veFXS balance
        uint256 vefxs_bal_to_use = 0;
        address the_proxy = getProxyFor(account);
        vefxs_bal_to_use = (the_proxy == address(0)) ? veFXS.balanceOf(account) : veFXS.balanceOf(the_proxy);

        // First option based on fraction of total veFXS supply, with an added scale factor
        uint256 mult_optn_1 = (vefxs_bal_to_use * vefxs_max_multiplier * vefxs_boost_scale_factor) 
                            / (veFXS.totalSupply() * MULTIPLIER_PRECISION);
        
        // Second based on old method, where the amount of FRAX staked comes into play
        uint256 mult_optn_2;
        {
            uint256 veFXS_needed_for_max_boost;

            // Need to use proxy-wide FRAX balance if applicable, to prevent exploiting
            veFXS_needed_for_max_boost = (the_proxy == address(0)) ? minVeFXSForMaxBoost(account) : minVeFXSForMaxBoostProxy(the_proxy);

            if (veFXS_needed_for_max_boost > 0){ 
                uint256 user_vefxs_fraction = (vefxs_bal_to_use * MULTIPLIER_PRECISION) / veFXS_needed_for_max_boost;
                
                mult_optn_2 = (user_vefxs_fraction * vefxs_max_multiplier) / MULTIPLIER_PRECISION;
            }
            else mult_optn_2 = 0; // This will happen with the first stake, when user_staked_frax is 0
        }

        // Select the higher of the two
        vefxs_multiplier = (mult_optn_1 > mult_optn_2 ? mult_optn_1 : mult_optn_2);

        // Cap the boost to the vefxs_max_multiplier
        if (vefxs_multiplier > vefxs_max_multiplier) vefxs_multiplier = vefxs_max_multiplier;
    }

    /* =============== MUTATIVE FUNCTIONS =============== */

    /// @notice Toggle whether a staker can use the proxy's veFXS balance to boost yields
    /// @notice Proxy must call this first, then the staker must call stakerSetVeFXSProxy
    function proxyToggleStaker(address staker_address) external {
        require(valid_vefxs_proxies[msg.sender], "Invalid proxy");
        proxy_allowed_stakers[msg.sender][staker_address] = !proxy_allowed_stakers[msg.sender][staker_address]; 

        // Disable the staker's set proxy if it was the toggler and is currently on
        if (staker_designated_proxies[staker_address] == msg.sender){
            staker_designated_proxies[staker_address] = address(0); 

            // Remove the LP as well
            proxy_lp_balances[msg.sender] -= _locked_liquidity[staker_address];
        }
    }

    /// @notice After proxy toggles staker to true, staker must call and confirm this
    /// @param proxy_address The address of the veFXS proxy
    function stakerSetVeFXSProxy(address proxy_address) external {
        require(valid_vefxs_proxies[proxy_address], "Invalid proxy");
        require(proxy_allowed_stakers[proxy_address][msg.sender], "Proxy has not allowed you yet");
        
        // Corner case sanity check to make sure LP isn't double counted
        address old_proxy_addr = staker_designated_proxies[msg.sender];
        if (old_proxy_addr != address(0)) {
            // Remove the LP count from the old proxy
            proxy_lp_balances[old_proxy_addr] -= _locked_liquidity[msg.sender];
        }

        // Set the new proxy
        staker_designated_proxies[msg.sender] = proxy_address; 

        // Add the the LP as well
        proxy_lp_balances[proxy_address] += _locked_liquidity[msg.sender];
    }

    // ------ STAKING ------
    // In children...


    // ------ WITHDRAWING ------
    // In children...


    // ------ REWARDS SYNCING ------

    function _updateRewardAndBalance(address account, bool sync_too) internal {
        _updateRewardAndBalance(account, sync_too, false);
    }

    function _updateRewardAndBalance(address account, bool sync_too, bool pre_sync_vemxstored) internal {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (sync_too){
            sync();
        }

        // Used to make sure the veFXS multiplier is correct if a stake is increased, before calcCurCombinedWeight
        if (pre_sync_vemxstored){
            _vefxsMultiplierStored[account] = veFXSMultiplier(account);
        }
        
        if (account != address(0)) {
            // To keep the math correct, the user's combined weight must be recomputed to account for their
            // ever-changing veFXS balance.
            (   
                uint256 old_combined_weight,
                uint256 new_vefxs_multiplier,
                uint256 new_combined_weight
            ) = calcCurCombinedWeight(account);

            // Calculate the earnings first
            _syncEarned(account);

            // Update the user's stored veFXS multipliers
            _vefxsMultiplierStored[account] = new_vefxs_multiplier;

            // Update the user's and the global combined weights
            if (new_combined_weight >= old_combined_weight) {
                uint256 weight_diff = new_combined_weight - old_combined_weight;
                _total_combined_weight = _total_combined_weight + weight_diff;
                _combined_weights[account] = old_combined_weight + weight_diff;
            } else {
                uint256 weight_diff = old_combined_weight - new_combined_weight;
                _total_combined_weight = _total_combined_weight - weight_diff;
                _combined_weights[account] = old_combined_weight - weight_diff;
            }

        }
    }

    function _syncEarned(address account) internal {
        if (account != address(0)) {
            // Calculate the earnings
            uint256[] memory earned_arr = earned(account);

            // Update the rewards array
            for (uint256 i = 0; i < earned_arr.length; i++){ 
                rewards[account][i] = earned_arr[i];
            }

            // Update the rewards paid array
            for (uint256 i = 0; i < earned_arr.length; i++){ 
                userRewardsPerTokenPaid[account][i] = rewardsPerTokenStored[i];
            }
        }
    }


    // ------ REWARDS CLAIMING ------

    /// @notice A function that can be overridden to add extra logic to the getReward function
    /// @param destination_address The address to send the rewards to
    function getRewardExtraLogic(address destination_address) public nonReentrant {
        require(rewardsCollectionPaused == false, "Rewards collection paused");
        return _getRewardExtraLogic(msg.sender, destination_address);
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal virtual {
        revert("Need gREL logic");
    }

    // Two different getReward functions are needed because of delegateCall and msg.sender issues
    // For backwards-compatibility
    /// @notice Claims rewards to destination address
    /// @param destination_address The address to send the rewards to
    /// @return rewards_before The rewards available before the claim
    function getReward(address destination_address) external nonReentrant returns (uint256[] memory) {
        return _getReward(msg.sender, destination_address, true);
    }

    /// @notice Claims rewards to destination address & wether to do extra logic
    /// @param destination_address The address to send the rewards to
    /// @param claim_extra_too Whether to do extra logic
    /// @return rewards_before The rewards available before the claim
    function getReward2(address destination_address, bool claim_extra_too) external nonReentrant returns (uint256[] memory) {
        return _getReward(msg.sender, destination_address, claim_extra_too);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    function _getReward(address rewardee, address destination_address, bool do_extra_logic) internal updateRewardAndBalanceMdf(rewardee, true) returns (uint256[] memory rewards_before) {
        // Update the last reward claim time first, as an extra reentrancy safeguard
        lastRewardClaimTime[rewardee] = block.timestamp;
        
        // Make sure rewards collection isn't paused
        require(rewardsCollectionPaused == false, "Rewards collection paused");
        
        // Update the rewards array and distribute rewards
        rewards_before = new uint256[](rewardTokens.length);

        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            rewards_before[i] = rewards[rewardee][i];
            rewards[rewardee][i] = 0;
            if (rewards_before[i] > 0) {
                TransferHelper.safeTransfer(rewardTokens[i], destination_address, rewards_before[i]);

                emit RewardPaid(rewardee, rewards_before[i], rewardTokens[i], destination_address);
            }
        }

        // Handle additional reward logic
        if (do_extra_logic) {
            _getRewardExtraLogic(rewardee, destination_address);
        }
    }


    // ------ FARM SYNCING ------

    // If the period expired, renew it
    function retroCatchUp() internal {
        // Catch up the old rewards first
        _updateStoredRewardsAndTime();

        // Pull in rewards from the rewards distributor, if applicable
        for (uint256 i = 0; i < rewardDistributors.length; i++){ 
            address reward_distributor_address = rewardDistributors[i];
            if (reward_distributor_address != address(0)) {
                IFraxGaugeFXSRewardsDistributor(reward_distributor_address).distributeReward(address(this));
            }
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed = uint256(block.timestamp - periodFinish) / rewardsDuration; // Floor division to the nearest period
        
        // Make sure there are enough tokens to renew the reward period
        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            require((rewardRates(i) * rewardsDuration * (num_periods_elapsed + 1)) <= IERC20(rewardTokens[i]).balanceOf(address(this)), string(abi.encodePacked("Not enough reward tokens available: ", rewardTokens[i])) );
        }
        
        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish + ((num_periods_elapsed + 1) * rewardsDuration);

        // Pull in rewards and set the reward rate for one week, based off of that
        // If the rewards get messed up for some reason, set this to 0 and it will skip
        // if (rewardRatesManual[1] != 0 && rewardRatesManual[2] != 0) {
        //     // CRV & CVX
        //     // ====================================
        //     uint256 crv_before = ERC20(rewardTokens[1]).balanceOf(address(this));
        //     uint256 cvx_before = ERC20(rewardTokens[2]).balanceOf(address(this));
        //     IConvexBaseRewardPool(0x329cb014b562d5d42927cfF0dEdF4c13ab0442EF).getReward(
        //         address(this),
        //         true
        //     );
        //     uint256 crv_after = ERC20(rewardTokens[1]).balanceOf(address(this));
        //     uint256 cvx_after = ERC20(rewardTokens[2]).balanceOf(address(this));

        //     // Set the new reward rate
        //     rewardRatesManual[1] = (crv_after - crv_before) / rewardsDuration;
        //     rewardRatesManual[2] = (cvx_after - cvx_before) / rewardsDuration;
        // }

    }

    function _updateStoredRewardsAndTime() internal {
        // Get the rewards
        uint256[] memory rewards_per_token = rewardsPerToken();

        // Update the rewardsPerTokenStored
        for (uint256 i = 0; i < rewardsPerTokenStored.length; i++){ 
            rewardsPerTokenStored[i] = rewards_per_token[i];
        }

        // Update the last stored time
        lastUpdateTime = lastTimeRewardApplicable();
    }

    /// @notice Updates the gauge weights, if applicable
    /// @param force_update If true, will update the weights even if the time hasn't elapsed
    function sync_gauge_weights(bool force_update) public {
        // Loop through the gauge controllers
        for (uint256 i = 0; i < gaugeControllers.length; i++){ 
            address gauge_controller_address = gaugeControllers[i];
            if (gauge_controller_address != address(0)) {
                if (force_update || (block.timestamp > last_gauge_time_totals[i])){
                    // Update the gauge_relative_weight
                    last_gauge_relative_weights[i] = IFraxGaugeController(gauge_controller_address).gauge_relative_weight_write(address(this), block.timestamp);
                    last_gauge_time_totals[i] = IFraxGaugeController(gauge_controller_address).time_total();
                }
            }
        }
    }

    /// @notice Updates gauge weights, fraxPerLP, pulls in new rewards or updates rewards
    function sync() public {
        // Sync the gauge weight, if applicable
        sync_gauge_weights(false);

        // Update the fraxPerLPStored
        fraxPerLPStored = fraxPerLPToken();

        if (block.timestamp >= periodFinish) {
            retroCatchUp();
        }
        else {
            _updateStoredRewardsAndTime();
        }
    }

    /* ========== RESTRICTED FUNCTIONS - Curator callable ========== */
    
    // ------ FARM SYNCING ------
    // In children...

    // ------ PAUSES ------

    /// @notice Owner or governance can pause/unpause staking, withdrawals, rewards collection, and collectRewardsOnWithdrawal
    /// @param _stakingPaused Whether staking is paused
    /// @param _withdrawalsPaused Whether withdrawals are paused
    /// @param _rewardsCollectionPaused Whether rewards collection is paused
    /// @param _collectRewardsOnWithdrawalPaused Whether collectRewardsOnWithdrawal is paused
    function setPauses(
        bool _stakingPaused,
        bool _withdrawalsPaused,
        bool _rewardsCollectionPaused,
        bool _collectRewardsOnWithdrawalPaused
    ) external onlyByOwnGov {
        stakingPaused = _stakingPaused;
        withdrawalsPaused = _withdrawalsPaused;
        rewardsCollectionPaused = _rewardsCollectionPaused;
        collectRewardsOnWithdrawalPaused = _collectRewardsOnWithdrawalPaused;
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    /// @notice Owner or governance can unlock stakes - irreversible!
    function unlockStakes() external onlyByOwnGov {
        stakesUnlocked = !stakesUnlocked;
    }

    /// @notice Owner or governance sets whether an address is a valid veFXS proxy
    /// @param _proxy_addr The address to set
    function toggleValidVeFXSProxy(address _proxy_addr) external onlyByOwnGov {
        valid_vefxs_proxies[_proxy_addr] = !valid_vefxs_proxies[_proxy_addr];
    }

    /// @notice Allows owner to recover any ERC20 or token manager to recover their reward token.
    /// @param tokenAddress The address of the token to recover
    /// @param tokenAmount The amount of the token to recover
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyTknMgrs(tokenAddress) {
        // Check if the desired token is a reward token
        bool isRewTkn = isRewardToken[tokenAddress];

        // Only the reward managers can take back their reward tokens
        // Also, other tokens, like the staking token, airdrops, or accidental deposits, can be withdrawn by the owner
        if (
                (isRewTkn && rewardManagers[tokenAddress] == msg.sender)
                || (!isRewTkn && (msg.sender == owner))
            ) {
            TransferHelper.safeTransfer(tokenAddress, msg.sender, tokenAmount);
            return;
        }
        // If none of the above conditions are true
        else {
            revert("No valid tokens to recover");
        }
    }

    /// @notice Sets multiple variables at once
    /// @param _misc_vars The variables to set:
    /// [0]: uint256 _lock_max_multiplier,
    /// [1] uint256 _vefxs_max_multiplier,
    /// [2] uint256 _vefxs_per_frax_for_max_boost,
    /// [3] uint256 _vefxs_boost_scale_factor,
    /// [4] uint256 _lock_time_for_max_multiplier,
    /// [5] uint256 _lock_time_min
    /// [6] uint256 _max_stake_limit (must be at greater or equal to old value)
    function setMiscVariables(
        uint256[6] memory _misc_vars
        // [0]: uint256 _lock_max_multiplier, 
        // [1] uint256 _vefxs_max_multiplier, 
        // [2] uint256 _vefxs_per_frax_for_max_boost,
        // [3] uint256 _vefxs_boost_scale_factor,
        // [4] uint256 _lock_time_for_max_multiplier,
        // [5] uint256 _lock_time_min
    ) external onlyByOwnGov {
        require(_misc_vars[0] >= MULTIPLIER_PRECISION, "Must be >= MUL PREC");
        require((_misc_vars[1] >= 0) && (_misc_vars[2] >= 0) && (_misc_vars[3] >= 0), "Must be >= 0");
        require((_misc_vars[4] >= 1) && (_misc_vars[5] >= 1), "Must be >= 1");

        lock_max_multiplier = _misc_vars[0];
        vefxs_max_multiplier = _misc_vars[1];
        vefxs_per_frax_for_max_boost = _misc_vars[2];
        vefxs_boost_scale_factor = _misc_vars[3];
        lock_time_for_max_multiplier = _misc_vars[4];
        lock_time_min = _misc_vars[5];
    }

    // The owner or the reward token managers can set reward rates 
        /// @notice Allows owner or reward token managers to set the reward rate for a given reward token
    /// @param reward_token_address The address of the reward token
    /// @param _new_rate The new reward rate (token amount divided by reward period duration)
    /// @param _gauge_controller_address The address of the gauge controller for this reward token
    /// @param _rewards_distributor_address The address of the rewards distributor for this reward token
    function setRewardVars(address reward_token_address, uint256 _new_rate, address _gauge_controller_address, address _rewards_distributor_address) external onlyTknMgrs(reward_token_address) {
        rewardRatesManual[rewardTokenAddrToIdx[reward_token_address]] = _new_rate;
        gaugeControllers[rewardTokenAddrToIdx[reward_token_address]] = _gauge_controller_address;
        rewardDistributors[rewardTokenAddrToIdx[reward_token_address]] = _rewards_distributor_address;
    }

    // The owner or the reward token managers can change managers
    /// @notice Allows owner or reward token managers to change the reward manager for a given reward token
    /// @param reward_token_address The address of the reward token
    /// @param new_manager_address The new reward manager address
    function changeTokenManager(address reward_token_address, address new_manager_address) external onlyTknMgrs(reward_token_address) {
        rewardManagers[reward_token_address] = new_manager_address;
    }

    /* ========== EVENTS ========== */
    event RewardPaid(address indexed user, uint256 amount, address token_address, address destination_address);

    /* ========== A CHICKEN ========== */
    //
    //         ,~.
    //      ,-'__ `-,
    //     {,-'  `. }              ,')
    //    ,( a )   `-.__         ,',')~,
    //   <=.) (         `-.__,==' ' ' '}
    //     (   )                      /)
    //      `-'\   ,                    )
    //          |  \        `~.        /
    //          \   `._        \      /
    //           \     `._____,'    ,'
    //            `-.             ,'
    //               `-._     _,-'
    //                   77jj'
    //                  //_||
    //               __//--'/`
    //             ,--'/`  '
    //
    // [hjw] https://textart.io/art/vw6Sa3iwqIRGkZsN1BC2vweF/chicken
}