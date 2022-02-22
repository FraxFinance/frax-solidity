// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

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
// Migratable Farming contract that accounts for veFXS
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
// Sam Sun: https://github.com/samczsun

// Originally inspired by Synthetix.io, but heavily modified by the Frax team
// (Locked, veFXS, and UniV3 portions are new)
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Curve/IveFXS.sol";
import "../Curve/IFraxGaugeController.sol";
import "../Curve/IFraxGaugeFXSRewardsDistributor.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";
import "../Utils/ReentrancyGuard.sol";
import "./Owned.sol";

contract FraxUnifiedFarmTemplate is Owned, ReentrancyGuard {
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private veFXS = IveFXS(0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0);
    
    // Frax related
    address internal constant frax_address = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    bool internal frax_is_token0;
    uint256 public fraxPerLPStored;

    // Constant for various precisions
    uint256 internal constant MULTIPLIER_PRECISION = 1e18;

    // Time tracking
    uint256 public periodFinish;
    uint256 public lastUpdateTime;

    // Lock time and multiplier settings
    uint256 public lock_max_multiplier = uint256(3e18); // E18. 1x = e18
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public lock_time_min = 86400; // 1 * 86400  (1 day)

    // veFXS related
    uint256 public vefxs_boost_scale_factor = uint256(4e18); // E18. 4x = 4e18; 100 / scale_factor = % vefxs supply needed for max boost
    uint256 public vefxs_max_multiplier = uint256(2e18); // E18. 1x = 1e18
    uint256 public vefxs_per_frax_for_max_boost = uint256(2e18); // E18. 2e18 means 2 veFXS must be held by the staker per 1 FRAX
    mapping(address => uint256) internal _vefxsMultiplierStored;
    mapping(address => bool) internal valid_vefxs_proxies;
    mapping(address => mapping(address => bool)) internal proxy_allowed_stakers;

    // Reward addresses, gauge addresses, reward rates, and reward managers
    mapping(address => address) public rewardManagers; // token addr -> manager addr
    address[] internal rewardTokens;
    address[] internal gaugeControllers;
    address[] internal rewardDistributors;
    uint256[] internal rewardRatesManual;
    mapping(address => uint256) public rewardTokenAddrToIdx; // token addr -> token index
    
    // Reward period
    uint256 public constant rewardsDuration = 604800; // 7 * 86400  (7 days)

    // Reward tracking
    uint256[] private rewardsPerTokenStored;
    mapping(address => mapping(uint256 => uint256)) private userRewardsPerTokenPaid; // staker addr -> token id -> paid amount
    mapping(address => mapping(uint256 => uint256)) private rewards; // staker addr -> token id -> reward amount
    mapping(address => uint256) internal lastRewardClaimTime; // staker addr -> timestamp
    
    // Gauge tracking
    uint256[] private last_gauge_relative_weights;
    uint256[] private last_gauge_time_totals;

    // Balance tracking
    uint256 internal _total_liquidity_locked;
    uint256 internal _total_combined_weight;
    mapping(address => uint256) internal _locked_liquidity;
    mapping(address => uint256) internal _combined_weights;
    mapping(address => uint256) public proxy_lp_balances; // Keeps track of LP balances proxy-wide. Needed to make sure the proxy boost is kept in line

    // List of valid migrators (set by governance)
    mapping(address => bool) internal valid_migrators;

    // Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) internal staker_allowed_migrators;
    mapping(address => address) public staker_designated_proxies; // Keep public so users can see on the frontend if they have a proxy

    // Admin booleans for emergencies, migrations, and overrides
    bool public stakesUnlocked; // Release locked stakes in case of emergency
    bool internal migrationsOn; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool internal withdrawalsPaused; // For emergencies
    bool internal rewardsCollectionPaused; // For emergencies
    bool internal stakingPaused; // For emergencies

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

    modifier isMigrating() {
        require(migrationsOn == true, "Not in migration");
        _;
    }

    modifier updateRewardAndBalance(address account, bool sync_too) {
        _updateRewardAndBalance(account, sync_too);
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
        periodFinish = block.timestamp + rewardsDuration;
    }

    /* ============= VIEWS ============= */

    // ------ REWARD RELATED ------

    // See if the caller_addr is a manager for the reward token 
    function isTokenManagerFor(address caller_addr, address reward_token_addr) public view returns (bool){
        if (caller_addr == owner) return true; // Contract owner
        else if (rewardManagers[reward_token_addr] == caller_addr) return true; // Reward manager
        return false; 
    }

    // All the reward tokens
    function getAllRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

    // Last time the reward was applicable
    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

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

    // Amount of reward tokens an account has earned / accrued
    // Note: In the edge-case of one of the account's stake expiring since the last claim, this will
    // return a slightly inflated number
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

    // Total reward tokens emitted in the given period
    function getRewardForDuration() external view returns (uint256[] memory rewards_per_duration_arr) {
        rewards_per_duration_arr = new uint256[](rewardRatesManual.length);

        for (uint256 i = 0; i < rewardRatesManual.length; i++){ 
            rewards_per_duration_arr[i] = rewardRates(i) * rewardsDuration;
        }
    }


    // ------ LIQUIDITY AND WEIGHTS ------

    // User locked liquidity / LP tokens
    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    // Total locked liquidity / LP tokens
    function lockedLiquidityOf(address account) external view returns (uint256) {
        return _locked_liquidity[account];
    }

    // Total combined weight
    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier and veFXS multiplier
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    // Calculated the combined weight for an account
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

    // Multiplier amount, given the length of the lock
    function lockMultiplier(uint256 secs) public view returns (uint256) {
        return Math.min(
            lock_max_multiplier,
            uint256(MULTIPLIER_PRECISION) + (
                (secs * (lock_max_multiplier - MULTIPLIER_PRECISION)) / lock_time_for_max_multiplier
            )
        ) ;
    }

    // ------ FRAX RELATED ------

    function userStakedFrax(address account) public view returns (uint256) {
        return (fraxPerLPStored * _locked_liquidity[account]) / MULTIPLIER_PRECISION;
    }

    function proxyStakedFrax(address proxy_address) public view returns (uint256) {
        return (fraxPerLPStored * proxy_lp_balances[proxy_address]) / MULTIPLIER_PRECISION;
    }

    // Max LP that can get max veFXS boosted for a given address at its current veFXS balance
    function maxLPForMaxBoost(address account) external view returns (uint256) {
        return (veFXS.balanceOf(account) * MULTIPLIER_PRECISION * MULTIPLIER_PRECISION) / (vefxs_per_frax_for_max_boost * fraxPerLPStored);
    }

    // Meant to be overridden
    function fraxPerLPToken() public virtual view returns (uint256) {
        revert("Need fPLPT logic");
    }

    // ------ veFXS RELATED ------

    function minVeFXSForMaxBoost(address account) public view returns (uint256) {
        return (userStakedFrax(account) * vefxs_per_frax_for_max_boost) / MULTIPLIER_PRECISION;
    }

    function minVeFXSForMaxBoostProxy(address proxy_address) public view returns (uint256) {
        return (proxyStakedFrax(proxy_address) * vefxs_per_frax_for_max_boost) / MULTIPLIER_PRECISION;
    }

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

    // ------ MIGRATIONS ------

    // Staker can allow a migrator 
    function stakerToggleMigrator(address migrator_address) external {
        require(valid_migrators[migrator_address], "Invalid migrator address");
        staker_allowed_migrators[msg.sender][migrator_address] = !staker_allowed_migrators[msg.sender][migrator_address]; 
    }

    // Proxy can allow a staker to use their veFXS balance (the staker will have to reciprocally toggle them too)
    // Must come before stakerSetVeFXSProxy
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

    // Staker can allow a veFXS proxy (the proxy will have to toggle them first)
    function stakerSetVeFXSProxy(address proxy_address) external {
        require(valid_vefxs_proxies[proxy_address], "Invalid proxy");
        require(proxy_allowed_stakers[proxy_address][msg.sender], "Proxy has not allowed you yet");
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
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (sync_too){
            sync();
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

    function _getRewardExtraLogic(address rewardee, address destination_address) internal virtual {
        revert("Need gREL logic");
    }

    // Two different getReward functions are needed because of delegateCall and msg.sender issues
    function getReward(address destination_address) external nonReentrant returns (uint256[] memory) {
        require(rewardsCollectionPaused == false, "Rewards collection paused");
        return _getReward(msg.sender, destination_address);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    function _getReward(address rewardee, address destination_address) internal updateRewardAndBalance(rewardee, true) returns (uint256[] memory rewards_before) {
        // Update the rewards array and distribute rewards
        rewards_before = new uint256[](rewardTokens.length);

        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            rewards_before[i] = rewards[rewardee][i];
            rewards[rewardee][i] = 0;
            if (rewards_before[i] > 0) TransferHelper.safeTransfer(rewardTokens[i], destination_address, rewards_before[i]);
        }

        // Handle additional reward logic
        _getRewardExtraLogic(rewardee, destination_address);

        // Update the last reward claim time
        lastRewardClaimTime[rewardee] = block.timestamp;
    }


    // ------ FARM SYNCING ------

    // If the period expired, renew it
    function retroCatchUp() internal {
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
            require((rewardRates(i) * rewardsDuration * (num_periods_elapsed + 1)) <= ERC20(rewardTokens[i]).balanceOf(address(this)), string(abi.encodePacked("Not enough reward tokens available: ", rewardTokens[i])) );
        }
        
        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish + ((num_periods_elapsed + 1) * rewardsDuration);

        // Update the rewards and time
        _updateStoredRewardsAndTime();

        // Update the fraxPerLPStored
        fraxPerLPStored = fraxPerLPToken();
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

    /* ========== RESTRICTED FUNCTIONS - Curator / migrator callable ========== */
    
    // ------ FARM SYNCING ------
    // In children...

    // ------ PAUSES ------

    function setPauses(
        bool _stakingPaused,
        bool _withdrawalsPaused,
        bool _rewardsCollectionPaused
    ) external onlyByOwnGov {
        stakingPaused = _stakingPaused;
        withdrawalsPaused = _withdrawalsPaused;
        rewardsCollectionPaused = _rewardsCollectionPaused;
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    function unlockStakes() external onlyByOwnGov {
        stakesUnlocked = !stakesUnlocked;
    }

    function toggleMigrations() external onlyByOwnGov {
        migrationsOn = !migrationsOn;
    }

    // Adds supported migrator address
    function toggleMigrator(address migrator_address) external onlyByOwnGov {
        valid_migrators[migrator_address] = !valid_migrators[migrator_address];
    }

    // Adds a valid veFXS proxy address
    function toggleValidVeFXSProxy(address _proxy_addr) external onlyByOwnGov {
        valid_vefxs_proxies[_proxy_addr] = !valid_vefxs_proxies[_proxy_addr];
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyTknMgrs(tokenAddress) {
        // Check if the desired token is a reward token
        bool isRewardToken = false;
        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            if (rewardTokens[i] == tokenAddress) {
                isRewardToken = true;
                break;
            }
        }

        // Only the reward managers can take back their reward tokens
        // Also, other tokens, like the staking token, airdrops, or accidental deposits, can be withdrawn by the owner
        if (
                (isRewardToken && rewardManagers[tokenAddress] == msg.sender)
                || (!isRewardToken && (msg.sender == owner))
            ) {
            TransferHelper.safeTransfer(tokenAddress, msg.sender, tokenAmount);
            return;
        }
        // If none of the above conditions are true
        else {
            revert("No valid tokens to recover");
        }
    }

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
    function setRewardVars(address reward_token_address, uint256 _new_rate, address _gauge_controller_address, address _rewards_distributor_address) external onlyTknMgrs(reward_token_address) {
        rewardRatesManual[rewardTokenAddrToIdx[reward_token_address]] = _new_rate;
        gaugeControllers[rewardTokenAddrToIdx[reward_token_address]] = _gauge_controller_address;
        rewardDistributors[rewardTokenAddrToIdx[reward_token_address]] = _rewards_distributor_address;
    }

    // The owner or the reward token managers can change managers
    function changeTokenManager(address reward_token_address, address new_manager_address) external onlyTknMgrs(reward_token_address) {
        rewardManagers[reward_token_address] = new_manager_address;
    }

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
