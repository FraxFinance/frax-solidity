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
// ================= FraxCrossChainFarmV3_ERC20_Pos_Rebase ==================
// ====================================================================
// No veFXS logic
// Because of lack of cross-chain reading of the gauge controller's emission rate,
// the contract sets its reward based on its token balance(s)
// Rolling 7 day reward period idea credit goes to denett
// rewardRate0 and rewardRate1 will look weird as people claim, but if you track the rewards actually emitted,
// the numbers do check out
// V3: Accepts canonicalFXS directly from Fraxferry and does not swap out

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

// Originally inspired by Synthetix.io, but heavily modified by the Frax team
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../Curve/FraxCrossChainRewarder.sol";
import "../ERC20/__CROSSCHAIN/IanyFXS.sol";
import "../ERC20/__CROSSCHAIN/CrossChainCanonicalFXS.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";
import "../Utils/ReentrancyGuard.sol";

// Inheritance
import "./Owned.sol";

// -------------------- VARIES --------------------

// Aave V2
import '../Misc_AMOs/Lending_AMOs/aave/IAToken.sol';
import '../Misc_AMOs/Lending_AMOs/aave/ILendingPool.sol';

// ------------------------------------------------


contract FraxCrossChainFarmV3_ERC20_Pos_Rebase is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS public veFXS;
    CrossChainCanonicalFXS public rewardsToken0; // Assumed to be canFXS
    ERC20 public rewardsToken1;
    
    // -------------------- VARIES --------------------

    // Aave V2
    IAToken public immutable stakingToken;

    // Need to store this when the user stakes. If they lockAdditional, the base value needs to accrue and the
    // Stored liquidity index needs to be updated
    // https://docs.aave.com/developers/v/2.0/the-core-protocol/atokens#scaledbalanceof
    mapping(bytes32 => uint256) public storedStkLiqIdx; // kek_id -> liquidity index. 

    // ------------------------------------------------

    FraxCrossChainRewarder public rewarder;

    // FRAX
    address public frax_address;
    
    // Constant for various precisions
    uint256 private constant MULTIPLIER_PRECISION = 1e18;

    // Admin addresses
    address public timelock_address; // Governance timelock address
    address public controller_address; // Gauge controller

    // Time tracking
    uint256 public periodFinish;
    uint256 public lastUpdateTime;

    // Lock time and multiplier settings
    uint256 public lock_max_multiplier = uint256(3e18); // E18. 1x = e18
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public lock_time_min = 86400; // 1 * 86400  (1 day)

    // veFXS related
    uint256 public vefxs_per_frax_for_max_boost = uint256(4e18); // E18. 4e18 means 4 veFXS must be held by the staker per 1 FRAX
    uint256 public vefxs_max_multiplier = uint256(2e18); // E18. 1x = 1e18
    mapping(address => uint256) private _vefxsMultiplierStored;

    // Max reward per second
    uint256 public rewardRate0;
    uint256 public rewardRate1;

    // Reward period
    uint256 public rewardsDuration = 604800; // 7 * 86400 (7 days). 

    // Reward tracking
    uint256 public ttlRew0Owed;
    uint256 public ttlRew1Owed;
    uint256 public ttlRew0Paid;
    uint256 public ttlRew1Paid;
    uint256 private rewardPerTokenStored0;
    uint256 private rewardPerTokenStored1;
    mapping(address => uint256) public userRewardPerTokenPaid0;
    mapping(address => uint256) public userRewardPerTokenPaid1;
    mapping(address => uint256) public rewards0;
    mapping(address => uint256) public rewards1;
    uint256 public lastRewardPull;
    mapping(address => uint256) internal lastRewardClaimTime; // staker addr -> timestamp

    // Balance tracking
    uint256 private _total_liquidity_locked;
    uint256 private _total_combined_weight;
    mapping(address => uint256) private _locked_liquidity;
    mapping(address => uint256) private _combined_weights;

    // Uniswap V2 / Impossible ONLY
    bool frax_is_token0;

    // Stake tracking
    mapping(address => LockedStake[]) public lockedStakes;

    // List of valid migrators (set by governance)
    mapping(address => bool) public valid_migrators;

    // Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) public staker_allowed_migrators;

    // Administrative booleans
    bool public migrationsOn; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public stakesUnlocked; // Release locked stakes in case of system migration or emergency
    bool public withdrawalsPaused; // For emergencies
    bool public rewardsCollectionPaused; // For emergencies
    bool public stakingPaused; // For emergencies
    bool public collectRewardsOnWithdrawalPaused; // For emergencies if a token is overemitted
    bool public isInitialized;

    /* ========== STRUCTS ========== */
    
    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCtrlr() {
        require(msg.sender == owner || msg.sender == timelock_address || msg.sender == controller_address, "Not own, tlk, or ctrlr");
        _;
    }

    modifier isMigrating() {
        require(migrationsOn == true, "Not in migration");
        _;
    }

    modifier notStakingPaused() {
        require(stakingPaused == false, "Staking paused");
        _;
    }

    modifier updateRewardAndBalance(address account, bool sync_too) {
        _updateRewardAndBalance(account, sync_too, false);
        _;
    }
    
    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _frax_address,
        address _timelock_address,
        address _rewarder_address
    ) Owned(_owner){
        frax_address = _frax_address;
        rewardsToken0 = CrossChainCanonicalFXS(_rewardsToken0);
        rewardsToken1 = ERC20(_rewardsToken1);
        
        stakingToken = IAToken(_stakingToken);


        timelock_address = _timelock_address;
        rewarder = FraxCrossChainRewarder(_rewarder_address);

        // Uniswap V2 / Impossible ONLY
        // Need to know which token FRAX is (0 or 1)
        // address token0 = stakingToken.token0();
        // if (token0 == frax_address) frax_is_token0 = true;
        // else frax_is_token0 = false;
        
        // Other booleans
        migrationsOn = false;
        stakesUnlocked = false;

        // For initialization
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
    }

    /* ========== VIEWS ========== */

    // Total locked liquidity tokens
    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    // Locked liquidity for a given account
    function lockedLiquidityOf(address account) external view returns (uint256) {
        return _locked_liquidity[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier and veFXS multiplier
    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    // Combined weight for a specific account
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    // All the locked stakes for a given account
    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    function lockMultiplier(uint256 secs) public view returns (uint256) {
        // return Math.min(
        //     lock_max_multiplier,
        //     uint256(MULTIPLIER_PRECISION) + (
        //         (secs * (lock_max_multiplier - MULTIPLIER_PRECISION)) / lock_time_for_max_multiplier
        //     )
        // ) ;
        return Math.min(
            lock_max_multiplier,
            (secs * lock_max_multiplier) / lock_time_for_max_multiplier
        ) ;
    }

    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    // ------ REBASE RELATED ------

    // Aave V2
    // ============================================
    // Get currentLiquidityIndex from AAVE
    function currLiqIdx() public view returns (uint256) {
        return ILendingPool(stakingToken.POOL()).getReserveNormalizedIncome(frax_address);
    }

    function fraxPerLPToken() public view returns (uint256) {
        // Get the amount of FRAX 'inside' of the lp tokens
        uint256 frax_per_lp_token;


        // Aave V2
        // ============================================
        {
            // Always 1-to-1, for simplicity. Autocompounding is handled by _accrueInterest
            // Users can accrue up their principal by calling lockAdditional with 0 amount.
            // Also will accrue at withdrawal time
            frax_per_lp_token = 1e18;
        }

        return frax_per_lp_token;
    }

    function userStakedFrax(address account) public view returns (uint256) {
        return (fraxPerLPToken()).mul(_locked_liquidity[account]).div(1e18);
    }

    function minVeFXSForMaxBoost(address account) public view returns (uint256) {
        return (userStakedFrax(account)).mul(vefxs_per_frax_for_max_boost).div(MULTIPLIER_PRECISION);
    }

    function veFXSMultiplier(address account) public view returns (uint256) {
        if (address(veFXS) != address(0)){
            // The claimer gets a boost depending on amount of veFXS they have relative to the amount of FRAX 'inside'
            // of their locked LP tokens
            uint256 veFXS_needed_for_max_boost = minVeFXSForMaxBoost(account);
            if (veFXS_needed_for_max_boost > 0){ 
                uint256 user_vefxs_fraction = (veFXS.balanceOf(account)).mul(MULTIPLIER_PRECISION).div(veFXS_needed_for_max_boost);
                
                uint256 vefxs_multiplier = ((user_vefxs_fraction).mul(vefxs_max_multiplier)).div(MULTIPLIER_PRECISION);

                // Cap the boost to the vefxs_max_multiplier
                if (vefxs_multiplier > vefxs_max_multiplier) vefxs_multiplier = vefxs_max_multiplier;

                return vefxs_multiplier;        
            }
            else return 0; // This will happen with the first stake, when user_staked_frax is 0
        }
        else return 0;
    }

    function calcCurrLockMultiplier(address account, uint256 stake_idx) public view returns (uint256 midpoint_lock_multiplier) {
        // Get the stake
        LockedStake memory thisStake = lockedStakes[account][stake_idx];

        // Handles corner case where user never claims for a new stake
        // Don't want the multiplier going above the max
        uint256 accrue_start_time;
        if (lastRewardClaimTime[account] < thisStake.start_timestamp) {
            accrue_start_time = thisStake.start_timestamp;
        }
        else {
            accrue_start_time = lastRewardClaimTime[account];
        }
        
        // If the lock is expired
        if (thisStake.ending_timestamp <= block.timestamp) {
            // If the lock expired in the time since the last claim, the weight needs to be proportionately averaged this time
            if (lastRewardClaimTime[account] < thisStake.ending_timestamp){
                uint256 time_before_expiry = thisStake.ending_timestamp - accrue_start_time;
                uint256 time_after_expiry = block.timestamp - thisStake.ending_timestamp;

                // Average the pre-expiry lock multiplier
                uint256 pre_expiry_avg_multiplier = lockMultiplier(time_before_expiry / 2);

                // Get the weighted-average lock_multiplier
                // uint256 numerator = (pre_expiry_avg_multiplier * time_before_expiry) + (MULTIPLIER_PRECISION * time_after_expiry);
                uint256 numerator = (pre_expiry_avg_multiplier * time_before_expiry) + (0 * time_after_expiry);
                midpoint_lock_multiplier = numerator / (time_before_expiry + time_after_expiry);
            }
            else {
                // Otherwise, it needs to just be 1x
                // midpoint_lock_multiplier = MULTIPLIER_PRECISION;

                // Otherwise, it needs to just be 0x
                midpoint_lock_multiplier = 0;
            }
        }
        // If the lock is not expired
        else {
            // Decay the lock multiplier based on the time left
            uint256 avg_time_left;
            {
                uint256 time_left_p1 = thisStake.ending_timestamp - accrue_start_time;
                uint256 time_left_p2 = thisStake.ending_timestamp - block.timestamp;
                avg_time_left = (time_left_p1 + time_left_p2) / 2;
            }
            midpoint_lock_multiplier = lockMultiplier(avg_time_left);
        }

        // Sanity check: make sure it never goes above the initial multiplier
        if (midpoint_lock_multiplier > thisStake.lock_multiplier) midpoint_lock_multiplier = thisStake.lock_multiplier;
    }

    // Calculate the combined weight for an account
    function calcCurCombinedWeight(address account) public view
        returns (
            uint256 old_combined_weight,
            uint256 new_vefxs_multiplier,
            uint256 new_combined_weight
        )
    {
        // Get the old combined weight
        old_combined_weight = _combined_weights[account];

        // Get the veFXS multipliers
        // For the calculations, use the midpoint (analogous to midpoint Riemann sum)
        new_vefxs_multiplier = veFXSMultiplier(account);

        uint256 midpoint_vefxs_multiplier;
        if (
            (_locked_liquidity[account] == 0 && _combined_weights[account] == 0) || 
            (new_vefxs_multiplier >= _vefxsMultiplierStored[account])
        ) {
            // This is only called for the first stake to make sure the veFXS multiplier is not cut in half
            // Also used if the user increased or maintained their position
            midpoint_vefxs_multiplier = new_vefxs_multiplier;
        }
        else {
            // Handles natural decay with a non-increased veFXS position
            midpoint_vefxs_multiplier = (new_vefxs_multiplier + _vefxsMultiplierStored[account]) / 2;
        }

        // Loop through the locked stakes, first by getting the liquidity * lock_multiplier portion
        new_combined_weight = 0;
        for (uint256 i = 0; i < lockedStakes[account].length; i++) {
            LockedStake memory thisStake = lockedStakes[account][i];

            // Calculate the midpoint lock multiplier
            uint256 midpoint_lock_multiplier = calcCurrLockMultiplier(account, i);

            // Calculate the combined boost
            uint256 liquidity = thisStake.liquidity;
            uint256 combined_boosted_amount = liquidity + ((liquidity * (midpoint_lock_multiplier + midpoint_vefxs_multiplier)) / MULTIPLIER_PRECISION);
            new_combined_weight += combined_boosted_amount;
        }
    }

    function rewardPerToken() public view returns (uint256, uint256) {
        if (_total_liquidity_locked == 0 || _total_combined_weight == 0) {
            return (rewardPerTokenStored0, rewardPerTokenStored1);
        }
        else {
            return (
                rewardPerTokenStored0.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate0).mul(1e18).div(_total_combined_weight)
                ),
                rewardPerTokenStored1.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate1).mul(1e18).div(_total_combined_weight)
                )
            );
        }
    }

    function earned(address account) public view returns (uint256, uint256) {
        (uint256 rew_per_token0, uint256 rew_per_token1) = rewardPerToken();
        if (_combined_weights[account] == 0){
            return (0, 0);
        }
        return (
            (_combined_weights[account].mul(rew_per_token0.sub(userRewardPerTokenPaid0[account]))).div(1e18).add(rewards0[account]),
            (_combined_weights[account].mul(rew_per_token1.sub(userRewardPerTokenPaid1[account]))).div(1e18).add(rewards1[account])
        );
    }

    function getRewardForDuration() external view returns (uint256, uint256) {
        return (
            rewardRate0.mul(rewardsDuration),
            rewardRate1.mul(rewardsDuration)
        );
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function _getStake(address staker_address, bytes32 kek_id) internal view returns (LockedStake memory locked_stake, uint256 arr_idx) {
        for (uint256 i = 0; i < lockedStakes[staker_address].length; i++){ 
            if (kek_id == lockedStakes[staker_address][i].kek_id){
                locked_stake = lockedStakes[staker_address][i];
                arr_idx = i;
                break;
            }
        }
        require(locked_stake.kek_id == kek_id, "Stake not found");
        
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
                uint256 weight_diff = new_combined_weight.sub(old_combined_weight);
                _total_combined_weight = _total_combined_weight.add(weight_diff);
                _combined_weights[account] = old_combined_weight.add(weight_diff);
            } else {
                uint256 weight_diff = old_combined_weight.sub(new_combined_weight);
                _total_combined_weight = _total_combined_weight.sub(weight_diff);
                _combined_weights[account] = old_combined_weight.sub(weight_diff);
            }

        }
    }

    // Add additional LPs to an existing locked stake
    // REBASE: If you simply want to accrue interest, call this with addl_liq = 0
    function lockAdditional(bytes32 kek_id, uint256 addl_liq) updateRewardAndBalance(msg.sender, true) public {
        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(msg.sender, kek_id);

        // Accrue the interest and get the updated stake
        (thisStake, ) = _accrueInterest(msg.sender, thisStake, theArrayIndex);

        // Return early if only accruing, to save gas
        if (addl_liq == 0) return;

        // Calculate the new amount
        uint256 new_amt = thisStake.liquidity + addl_liq;

        // Checks
        require(addl_liq >= 0, "Must be nonzero");

        // Pull the tokens from the sender
        TransferHelper.safeTransferFrom(address(stakingToken), msg.sender, address(this), addl_liq);

        // Update the stake
        lockedStakes[msg.sender][theArrayIndex] = LockedStake(
            kek_id,
            thisStake.start_timestamp,
            new_amt,
            thisStake.ending_timestamp,
            thisStake.lock_multiplier
        );

        // Update liquidities
        _total_liquidity_locked += addl_liq;
        _locked_liquidity[msg.sender] += addl_liq;

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false, true);

        emit LockedAdditional(msg.sender, kek_id, addl_liq);
    }

    // Extends the lock of an existing stake
    function lockLonger(bytes32 kek_id, uint256 new_ending_ts) nonReentrant updateRewardAndBalance(msg.sender, true) public {
        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(msg.sender, kek_id);

        // Check
        require(new_ending_ts > block.timestamp, "Must be in the future");

        // Calculate some times
        uint256 time_left = (thisStake.ending_timestamp > block.timestamp) ? thisStake.ending_timestamp - block.timestamp : 0;
        uint256 new_secs = new_ending_ts - block.timestamp;

        // Checks
        // require(time_left > 0, "Already expired");
        require(new_secs > time_left, "Cannot shorten lock time");
        require(new_secs >= lock_time_min, "Minimum stake time not met");
        require(new_secs <= lock_time_for_max_multiplier, "Trying to lock for too long");

        // Update the stake
        lockedStakes[msg.sender][theArrayIndex] = LockedStake(
            kek_id,
            block.timestamp,
            thisStake.liquidity,
            new_ending_ts,
            lockMultiplier(new_secs)
        );

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false, true);

        emit LockedLonger(msg.sender, kek_id, new_secs, block.timestamp, new_ending_ts);
    }

    function _syncEarned(address account) internal {
        if (account != address(0)) {
            // Calculate the earnings
            (uint256 earned0, uint256 earned1) = earned(account);
            rewards0[account] = earned0;
            rewards1[account] = earned1;
            userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
            userRewardPerTokenPaid1[account] = rewardPerTokenStored1;
        }
    }

    // Staker can allow a migrator 
    function stakerAllowMigrator(address migrator_address) external {
        require(valid_migrators[migrator_address], "Invalid migrator address");
        staker_allowed_migrators[msg.sender][migrator_address] = true; 
    }

    // Staker can disallow a previously-allowed migrator  
    function stakerDisallowMigrator(address migrator_address) external {
        // Delete from the mapping
        delete staker_allowed_migrators[msg.sender][migrator_address];
    }
    
    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stakeLocked(uint256 liquidity, uint256 secs) nonReentrant public {
        _stakeLocked(msg.sender, msg.sender, liquidity, secs, block.timestamp);
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    function _stakeLocked(
        address staker_address, 
        address source_address, 
        uint256 liquidity, 
        uint256 secs,
        uint256 start_timestamp
    ) internal updateRewardAndBalance(staker_address, true) {
        require(!stakingPaused || valid_migrators[msg.sender] == true, "Staking paused or in migration");
        require(liquidity > 0, "Must stake more than zero");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier,"Trying to lock for too long");

        uint256 lock_multiplier = lockMultiplier(secs);
        bytes32 kek_id = keccak256(abi.encodePacked(staker_address, start_timestamp, liquidity, _locked_liquidity[staker_address]));
        lockedStakes[staker_address].push(LockedStake(
            kek_id,
            start_timestamp,
            liquidity,
            start_timestamp.add(secs),
            lock_multiplier
        ));

        // Store the liquidity index. Used later to give back principal + accrued interest
        storedStkLiqIdx[kek_id] = currLiqIdx();

        // Pull the tokens from the source_address
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);

        // Update liquidities
        _total_liquidity_locked = _total_liquidity_locked.add(liquidity);
        _locked_liquidity[staker_address] = _locked_liquidity[staker_address].add(liquidity);

        // Need to call to update the combined weights
        _updateRewardAndBalance(staker_address, false, true);

        emit StakeLocked(staker_address, liquidity, secs, kek_id, source_address);
    }

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kek_id, bool claim_rewards) nonReentrant public {
        require(withdrawalsPaused == false, "Withdrawals paused");
        _withdrawLocked(msg.sender, msg.sender, kek_id, claim_rewards);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdrawLocked(address staker_address, address destination_address, bytes32 kek_id, bool claim_rewards) internal  {
        // Collect rewards first and then update the balances
        // collectRewardsOnWithdrawalPaused to be used in an emergency situation if reward is overemitted or not available
        // and the user can forfeit rewards to get their principal back. User can also specify it in withdrawLocked
        if (claim_rewards || !collectRewardsOnWithdrawalPaused) _getReward(staker_address, destination_address);
        else {
            // Sync the rewards at least
            _updateRewardAndBalance(staker_address, true, false);
        }

        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(staker_address, kek_id);
        require(thisStake.kek_id == kek_id, "Stake not found");
        require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true || valid_migrators[msg.sender] == true, "Stake is still locked!");

        // Accrue the interest and get the updated stake
        (thisStake, ) = _accrueInterest(staker_address, thisStake, theArrayIndex);

        uint256 liquidity = thisStake.liquidity;

        if (liquidity > 0) {
            // Update liquidities
            _total_liquidity_locked = _total_liquidity_locked.sub(liquidity);
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address].sub(liquidity);

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Need to call to update the combined weights
            _updateRewardAndBalance(staker_address, true, false);

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            stakingToken.transfer(destination_address, liquidity);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }

    }
    
    // Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() external nonReentrant returns (uint256, uint256) {
        require(rewardsCollectionPaused == false,"Rewards collection paused");
        return _getReward(msg.sender, msg.sender);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    // This distinction is important for the migrator
    function _getReward(address rewardee, address destination_address) internal updateRewardAndBalance(rewardee, true) returns (uint256 reward0, uint256 reward1) {
        reward0 = rewards0[rewardee];
        reward1 = rewards1[rewardee];

        if (reward0 > 0) {
            rewards0[rewardee] = 0;
            rewardsToken0.transfer(destination_address, reward0);
            ttlRew0Paid += reward0;
            emit RewardPaid(rewardee, reward0, address(rewardsToken0), destination_address);
        }

        if (reward1 > 0) {
            rewards1[rewardee] = 0;
            rewardsToken1.transfer(destination_address, reward1);
            ttlRew1Paid += reward1;
            emit RewardPaid(rewardee, reward1, address(rewardsToken1), destination_address);
        }

        // Update the last reward claim time
        lastRewardClaimTime[rewardee] = block.timestamp;
    }

    // REBASE SPECIFIC
    // Catches-up the user's accrued interest and sets it as the new principal (liquidity)
    function _accrueInterest(
        address staker_address, 
        LockedStake memory thisStake, 
        uint256 theArrayIndex
    ) internal returns (LockedStake memory, uint256) {
        // Calculate the new liquidity as well as the diff
        // new pricipal = (old principal ∗ currentLiquidityIndex) / (old liquidity index)
        uint256 new_liq = (thisStake.liquidity * currLiqIdx()) / storedStkLiqIdx[thisStake.kek_id];
        uint256 liq_diff = new_liq - thisStake.liquidity;

        // Update the new principal
        lockedStakes[staker_address][theArrayIndex].liquidity = new_liq;

        // Update the liquidity totals
        _total_liquidity_locked += liq_diff;
        _locked_liquidity[staker_address] += liq_diff;

        // Store the new liquidity index. Used later to give back principal + accrued interest
        storedStkLiqIdx[thisStake.kek_id] = currLiqIdx();
    
        return (lockedStakes[staker_address][theArrayIndex], theArrayIndex);
    }

    // Quasi-notifyRewardAmount() logic
    function syncRewards() internal {
        // Bring in rewards, if applicable
        if ((address(rewarder) != address(0)) && ((block.timestamp).sub(lastRewardPull) >= rewardsDuration)){
            rewarder.distributeReward();
            lastRewardPull = block.timestamp;
        }

        // Get the current reward token balances
        uint256 curr_bal_0 = rewardsToken0.balanceOf(address(this));
        uint256 curr_bal_1 = rewardsToken1.balanceOf(address(this));

        // Update the owed amounts based off the old reward rates
        // Anything over a week is zeroed
        {
            uint256 eligible_elapsed_time = Math.min((block.timestamp).sub(lastUpdateTime), rewardsDuration);
            ttlRew0Owed += rewardRate0.mul(eligible_elapsed_time);
            ttlRew1Owed += rewardRate1.mul(eligible_elapsed_time);
        }

        // Update the stored amounts too
        {
            (uint256 reward0, uint256 reward1) = rewardPerToken();
            rewardPerTokenStored0 = reward0;
            rewardPerTokenStored1 = reward1;
        }

        // Set the reward rates based on the free amount of tokens
        {
            // Don't count unpaid rewards as free
            uint256 unpaid0 = ttlRew0Owed.sub(ttlRew0Paid);
            uint256 unpaid1 = ttlRew1Owed.sub(ttlRew1Paid);

            // Handle reward token0
            if (curr_bal_0 <= unpaid0){
                // token0 is depleted, so stop emitting
                rewardRate0 = 0;
            }
            else {
                uint256 free0 = curr_bal_0.sub(unpaid0);
                rewardRate0 = (free0).div(rewardsDuration);
            }

            // Handle reward token1
            if (curr_bal_1 <= unpaid1){
                // token1 is depleted, so stop emitting
                rewardRate1 = 0;
            }
            else {
                uint256 free1 = curr_bal_1.sub(unpaid1);
                rewardRate1 = (free1).div(rewardsDuration);
            }
        }
    }

    function sync() public {
        require(isInitialized, "Contract not initialized");

        // Swap bridge tokens
        // Make sure the rewardRates are synced to the current FXS balance
        syncRewards();

        // Rolling 7 days rewards period
        lastUpdateTime = block.timestamp;
        periodFinish = (block.timestamp).add(rewardsDuration);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Needed when first deploying the farm
    // Make sure rewards are present
    function initializeDefault() external onlyByOwnGovCtrlr {
        require(!isInitialized, "Already initialized");
        isInitialized = true;

        // Bring in rewards, if applicable
        if (address(rewarder) != address(0)){
            rewarder.distributeReward();
            lastRewardPull = block.timestamp;
        }

        emit DefaultInitialization();
    }

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can). 
    function migrator_stakeLocked_for(address staker_address, uint256 amount, uint256 secs, uint256 start_timestamp) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _stakeLocked(staker_address, msg.sender, amount, secs, start_timestamp);
    }

    // Used for migrations
    function migrator_withdraw_locked(address staker_address, bytes32 kek_id) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _withdrawLocked(staker_address, msg.sender, kek_id, true);
    }

    // Adds supported migrator address 
    function addMigrator(address migrator_address) external onlyByOwnGov {
        valid_migrators[migrator_address] = true;
    }

    // Remove a migrator address
    function removeMigrator(address migrator_address) external onlyByOwnGov {
        require(valid_migrators[migrator_address] == true, "Address nonexistent");
        
        // Delete from the mapping
        delete valid_migrators[migrator_address];
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if(!migrationsOn){
            require(tokenAddress != address(stakingToken), "Not in migration"); // Only Governance / Timelock can trigger a migration
        }
        // Only the owner address can ever receive the recovery withdrawal
        ERC20(tokenAddress).transfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setMultipliers(uint256 _lock_max_multiplier, uint256 _vefxs_max_multiplier, uint256 _vefxs_per_frax_for_max_boost) external onlyByOwnGov {
        require(_lock_max_multiplier >= MULTIPLIER_PRECISION, "Mult must be >= MULTIPLIER_PRECISION");
        require(_vefxs_max_multiplier >= 0, "veFXS mul must be >= 0");
        require(_vefxs_per_frax_for_max_boost > 0, "veFXS pct max must be >= 0");

        lock_max_multiplier = _lock_max_multiplier;
        vefxs_max_multiplier = _vefxs_max_multiplier;
        vefxs_per_frax_for_max_boost = _vefxs_per_frax_for_max_boost;

        emit MaxVeFXSMultiplier(vefxs_max_multiplier);
        emit LockedStakeMaxMultiplierUpdated(lock_max_multiplier);
        emit veFXSPerFraxForMaxBoostUpdated(vefxs_per_frax_for_max_boost);
    }

    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min) external onlyByOwnGov {
        require(_lock_time_for_max_multiplier >= 1, "Mul max time must be >= 1");
        require(_lock_time_min >= 1, "Mul min time must be >= 1");

        lock_time_for_max_multiplier = _lock_time_for_max_multiplier;
        lock_time_min = _lock_time_min;

        emit LockedStakeTimeForMaxMultiplier(lock_time_for_max_multiplier);
        emit LockedStakeMinTime(_lock_time_min);
    }

    function unlockStakes() external onlyByOwnGov {
        stakesUnlocked = !stakesUnlocked;
    }

    function toggleMigrations() external onlyByOwnGov {
        migrationsOn = !migrationsOn;
    }

    function toggleCollectRewardsOnWithdrawal() external onlyByOwnGov {
        collectRewardsOnWithdrawalPaused = !collectRewardsOnWithdrawalPaused;
    }

    function toggleStaking() external onlyByOwnGov {
        stakingPaused = !stakingPaused;
    }

    function toggleWithdrawals() external onlyByOwnGov {
        withdrawalsPaused = !withdrawalsPaused;
    }

    function toggleRewardsCollection() external onlyByOwnGov {
        rewardsCollectionPaused = !rewardsCollectionPaused;
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setController(address _controller_address) external onlyByOwnGov {
        controller_address = _controller_address;
    }

    function setVeFXS(address _vefxs_address) external onlyByOwnGov {
        veFXS = IveFXS(_vefxs_address);
    }

    /* ========== EVENTS ========== */

    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    event WithdrawLocked(address indexed user, uint256 amount, bytes32 kek_id, address destination_address);
    event RewardPaid(address indexed user, uint256 reward, address token_address, address destination_address);
    event DefaultInitialization();
    event Recovered(address token, uint256 amount);
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
    event LockedStakeMinTime(uint256 secs);
    event LockedAdditional(address indexed user, bytes32 kek_id, uint256 amount);
    event LockedLonger(address indexed user, bytes32 kek_id, uint256 new_secs, uint256 new_start_ts, uint256 new_end_ts);
    event MaxVeFXSMultiplier(uint256 multiplier);
    event veFXSPerFraxForMaxBoostUpdated(uint256 scale_factor);
}
