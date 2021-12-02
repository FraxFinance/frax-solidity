// SPDX-License-Identifier: GPL-2.0-or-later
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
// =========================== FraxUniV3Farm_Stable ==========================
// ====================================================================
// Migratable Farming contract that accounts for veFXS and UniswapV3 NFTs
// Only one possible reward token here (usually FXS), to cut gas costs
// Also, because of the nonfungible nature, and to reduce gas, unlocked staking was removed
// You can lock for as short as 1 day now, which is de-facto an unlocked stake

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
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../Curve/IFraxGaugeController.sol";
import "../Curve/IFraxGaugeFXSRewardsDistributor.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";
import "../Uniswap_V3/libraries/TickMath.sol";
import "../Uniswap_V3/libraries/LiquidityAmounts.sol";
import "../Uniswap_V3/IUniswapV3PositionsNFT.sol";
import "../Uniswap_V3/IUniswapV3Pool.sol";
import "../Utils/ReentrancyGuard.sol";
import "./Owned.sol";

contract FraxUniV3Farm_Stable is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private veFXS = IveFXS(0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0);
    ERC20 private rewardsToken0 = ERC20(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    IFraxGaugeController public gauge_controller;
    IFraxGaugeFXSRewardsDistributor public rewards_distributor;
    IUniswapV3PositionsNFT private stakingTokenNFT = IUniswapV3PositionsNFT(0xC36442b4a4522E871399CD717aBDD847Ab11FE88); // UniV3 uses an NFT
    IUniswapV3Pool private lp_pool;

    // Admin addresses
    address public timelock_address;
    address public curator_address;

    // Constant for various precisions
    uint256 private constant MULTIPLIER_PRECISION = 1e18;
    int256 private constant EMISSION_FACTOR_PRECISION = 1e18;

    // Reward and period related
    uint256 private periodFinish;
    uint256 private lastUpdateTime;
    uint256 private reward_rate_manual;
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    // Lock time and multiplier settings
    uint256 public lock_max_multiplier = uint256(3e18); // E18. 1x = 1e18
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public lock_time_min = 86400; // 1 * 86400  (1 day)

    // veFXS related
    uint256 public vefxs_per_frax_for_max_boost = uint256(4e18); // E18. 4e18 means 4 veFXS must be held by the staker per 1 FRAX
    uint256 public vefxs_max_multiplier = uint256(2e18); // E18. 1x = 1e18
    mapping(address => uint256) private _vefxsMultiplierStored;

    // Uniswap V3 related
    int24 public uni_tick_lower;
    int24 public uni_tick_upper;
    int24 public ideal_tick;
    uint24 public uni_required_fee;
    address public uni_token0;
    address public uni_token1;
    uint32 public twap_duration = 300; // 5 minutes
    bool public frax_is_token0 = false;

    // Rewards tracking
    uint256 private rewardPerTokenStored0;
    mapping(address => uint256) private userRewardPerTokenPaid0;
    mapping(address => uint256) private rewards0;
    uint256 private last_gauge_relative_weight;
    uint256 private last_gauge_time_total;

    // Balance, stake, and weight tracking
    uint256 private _total_liquidity_locked;
    uint256 private _total_combined_weight;
    mapping(address => uint256) private _locked_liquidity;
    mapping(address => uint256) private _combined_weights;
    mapping(address => LockedNFT[]) private lockedNFTs;

    // List of valid migrators (set by governance)
    mapping(address => bool) private valid_migrators;
    address[] private valid_migrators_array;

    // Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) private staker_allowed_migrators;

    // Greylists
    mapping(address => bool) private greylist;

    // Admin booleans for emergencies, migrations, and overrides
    bool public bypassEmissionFactor;
    bool public migrationsOn; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public stakesUnlocked; // Release locked stakes in case of system migration or emergency
    bool public stakingPaused;
    bool public withdrawalsPaused;
    bool public rewardsCollectionPaused;

    // Struct for the stake
    struct LockedNFT {
        uint256 token_id; // for Uniswap V3 LPs
        uint256 liquidity;
        uint256 start_timestamp;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
        int24 tick_lower;
        int24 tick_upper;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnerOrCuratorOrGovernance() {
        require(msg.sender == owner || msg.sender == curator_address || msg.sender == timelock_address, "Not owner, curator, or timelock");
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
        address _lp_pool_address,
        address _timelock_address,
        address _rewards_distributor_address,
        int24 _uni_tick_lower,
        int24 _uni_tick_upper,
        int24 _uni_ideal_tick
    ) Owned(_owner) {
        rewards_distributor = IFraxGaugeFXSRewardsDistributor(_rewards_distributor_address);
        lp_pool = IUniswapV3Pool(_lp_pool_address); // call getPool(token0, token1, fee) on the Uniswap V3 Factory (0x1F98431c8aD98523631AE4a59f267346ea31F984) to get this otherwise
        timelock_address = _timelock_address;

        // Set the UniV3 addresses
        uni_token0 = lp_pool.token0();
        uni_token1 = lp_pool.token1();

        // Check where FRAX is
        if (uni_token0 == 0x853d955aCEf822Db058eb8505911ED77F175b99e) frax_is_token0 = true;

        // Fee, Tick, and Liquidity related
        uni_required_fee = lp_pool.fee();
        uni_tick_lower = _uni_tick_lower;
        uni_tick_upper = _uni_tick_upper;
        
        // Closest tick to 1
        ideal_tick = _uni_ideal_tick;

        // Manual reward rate
        reward_rate_manual = 0; // (uint256(365e17)).div(365 * 86400); // 0.1 FXS per day (1157407407407e0)

        // Initialize
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
    }

    /* ========== VIEWS ========== */

    // User locked liquidity tokens
    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    // Total locked liquidity tokens
    function lockedLiquidityOf(address account) external view returns (uint256) {
        return _locked_liquidity[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier and veFXS multiplier
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    // Total combined weight
    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    function lockMultiplier(uint256 secs) public view returns (uint256) {
        uint256 lock_multiplier =
            uint256(MULTIPLIER_PRECISION).add(
                secs.mul(lock_max_multiplier.sub(MULTIPLIER_PRECISION)).div(
                    lock_time_for_max_multiplier
                )
            );
        if (lock_multiplier > lock_max_multiplier) lock_multiplier = lock_max_multiplier;
        return lock_multiplier;
    }

    function userStakedFrax(address account) public view returns (uint256) {
        uint256 frax_tally = 0;
        LockedNFT memory thisNFT;
        for (uint256 i = 0; i < lockedNFTs[account].length; i++) {
            thisNFT = lockedNFTs[account][i];
            uint256 this_liq = thisNFT.liquidity;
            if (this_liq > 0){
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(thisNFT.tick_lower);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(thisNFT.tick_upper);
                if (frax_is_token0){
                    frax_tally = frax_tally.add(LiquidityAmounts.getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, uint128(thisNFT.liquidity)));
                }
                else {
                    frax_tally = frax_tally.add(LiquidityAmounts.getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, uint128(thisNFT.liquidity)));
                }
            }
        }

        // In order to avoid excessive gas calculations and the input tokens ratios. 50% FRAX is assumed
        // If this were Uni V2, it would be akin to reserve0 & reserve1 math
        // There may be a more accurate way to calculate the above...
        return frax_tally.div(2); 
    }

    // Will return MULTIPLIER_PRECISION if the pool is balanced, a smaller fraction if between the ticks,
    // and zero outside of the ticks
    function emissionFactor() public view returns (uint256 emission_factor){
        // If the bypass is turned on, return 1x
        if (bypassEmissionFactor) return MULTIPLIER_PRECISION;

        // From https://github.com/charmfinance/alpha-vaults-contracts/blob/main/contracts/AlphaStrategy.sol
        uint32[] memory secondsAgo = new uint32[](2);
        secondsAgo[0] = uint32(twap_duration);
        secondsAgo[1] = 0;

        // Make sure observationCardinalityNext has enough points on the lp_pool first
        // Otherwise, any observation greater then 0 will return 0 values
        (int56[] memory tickCumulatives, ) = lp_pool.observe(secondsAgo);
        int24 avg_tick = int24((tickCumulatives[1] - tickCumulatives[0]) / int32(twap_duration));

        // Return 0 if out of bounds (de-pegged)
        if (avg_tick <= uni_tick_lower) return 0;
        if (avg_tick >= uni_tick_upper) return 0;

        // Price = (1e18 / 1e6) * 1.0001^(tick)
        // Tick = Math.Floor(Log[base 1.0001] of (price / (10 ** decimal difference)))
        // Unsafe math, but there is a safety check later
        int256 em_factor_int256;
        if (avg_tick <= ideal_tick){
            em_factor_int256 = (EMISSION_FACTOR_PRECISION * (avg_tick - uni_tick_lower)) / (ideal_tick - uni_tick_lower);
        }
        else {
            em_factor_int256 = (EMISSION_FACTOR_PRECISION * (uni_tick_upper - avg_tick)) / (uni_tick_upper - ideal_tick);
        }

        // Check for negatives
        if (em_factor_int256 < 0) emission_factor = uint256(-1 * em_factor_int256);
        else emission_factor = uint256(em_factor_int256);

        // Sanity checks
        require(emission_factor <= MULTIPLIER_PRECISION, "Emission factor too high");
        require(emission_factor >= 0, "Emission factor too low");
    }

    function minVeFXSForMaxBoost(address account) public view returns (uint256) {
        return (userStakedFrax(account)).mul(vefxs_per_frax_for_max_boost).div(MULTIPLIER_PRECISION);
    }

    function veFXSMultiplier(address account) public view returns (uint256) {
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

    function checkUniV3NFT(uint256 token_id, bool fail_if_false) internal view returns (bool is_valid, uint256 liquidity, int24 tick_lower, int24 tick_upper) {
        (
            ,
            ,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint256 _liquidity,
            ,
            ,
            ,

        ) = stakingTokenNFT.positions(token_id);

        // Set initially
        is_valid = false;
        liquidity = _liquidity;

        // Do the checks
        if (
            (token0 == uni_token0) && 
            (token1 == uni_token1) && 
            (fee == uni_required_fee) && 
            (tickLower == uni_tick_lower) && 
            (tickUpper == uni_tick_upper)
        ) {
            is_valid = true;
        }
        else {
            // More detailed messages removed here to save space
            if (fail_if_false) {
                revert("Wrong token characteristics");
            }
        }
        return (is_valid, liquidity, tickLower, tickUpper);
    }

    // Return all of the locked NFT positions
    function lockedNFTsOf(address account) external view returns (LockedNFT[] memory) {
        return lockedNFTs[account];
    }

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
        if (_locked_liquidity[account] == 0 && _combined_weights[account] == 0) {
            // This is only called for the first stake to make sure the veFXS multiplier is not cut in half
            midpoint_vefxs_multiplier = new_vefxs_multiplier;
        }
        else {
            midpoint_vefxs_multiplier = ((new_vefxs_multiplier).add(_vefxsMultiplierStored[account])).div(2);
        }

        // Loop through the locked stakes, first by getting the liquidity * lock_multiplier portion
        new_combined_weight = 0;
        for (uint256 i = 0; i < lockedNFTs[account].length; i++) {
            LockedNFT memory thisNFT = lockedNFTs[account][i];
            uint256 lock_multiplier = thisNFT.lock_multiplier;

            // If the lock period is over, drop the lock multiplier down to 1x for the weight calculations
            if (thisNFT.ending_timestamp <= block.timestamp){
                lock_multiplier = MULTIPLIER_PRECISION;
            }

            uint256 liquidity = thisNFT.liquidity;
            uint256 combined_boosted_amount = liquidity.mul(lock_multiplier.add(midpoint_vefxs_multiplier)).div(MULTIPLIER_PRECISION);
            new_combined_weight = new_combined_weight.add(combined_boosted_amount);
        }
    }

    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() internal view returns (uint256) {
        if (_total_liquidity_locked == 0 || _total_combined_weight == 0) {
            return rewardPerTokenStored0;
        } else {
            return (
                rewardPerTokenStored0.add(
                    lastTimeRewardApplicable()
                        .sub(lastUpdateTime)
                        .mul(rewardRate0())
                        .mul(emissionFactor()) // has 1e18 already
                        .div(_total_combined_weight)
                )
            );
        }
    }

    function earned(address account) public view returns (uint256) {
        uint256 earned_reward_0 = rewardPerToken();
        return (
            _combined_weights[account]
                .mul(earned_reward_0.sub(userRewardPerTokenPaid0[account]))
                .div(1e18)
                .add(rewards0[account])
        );
    }

    function rewardRate0() public view returns (uint256 rwd_rate) {
        if (address(gauge_controller) != address(0)) {
            rwd_rate = (gauge_controller.global_emission_rate()).mul(last_gauge_relative_weight).div(1e18);
        }
        else {
            rwd_rate = reward_rate_manual;
        }
    }

    function getRewardForDuration() external view returns (uint256) {
        return rewardRate0().mul(rewardsDuration);
    }

    // Needed to indicate that this contract is ERC721 compatible
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

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

    function _syncEarned(address account) internal {
        if (account != address(0)) {
            // Calculate the earnings
            uint256 earned0 = earned(account);
            rewards0[account] = earned0;
            userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
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
    function stakeLocked(uint256 token_id, uint256 secs) nonReentrant external {
        _stakeLocked(msg.sender, msg.sender, token_id, secs, block.timestamp);
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    function _stakeLocked(
        address staker_address,
        address source_address,
        uint256 token_id,
        uint256 secs,
        uint256 start_timestamp
    ) internal updateRewardAndBalance(staker_address, true) {
        require(stakingPaused == false || valid_migrators[msg.sender] == true, "Staking paused or in migration");
        require(greylist[staker_address] == false, "Address has been greylisted");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier,"Trying to lock for too long");
        (, uint256 liquidity, int24 tick_lower, int24 tick_upper) = checkUniV3NFT(token_id, true); // Should throw if false

        {
            uint256 lock_multiplier = lockMultiplier(secs);
            lockedNFTs[staker_address].push(
                LockedNFT(
                    token_id,
                    liquidity,
                    start_timestamp,
                    start_timestamp.add(secs),
                    lock_multiplier,
                    tick_lower,
                    tick_upper
                )
            );
        }

        // Pull the tokens from the source_address
        stakingTokenNFT.safeTransferFrom(source_address, address(this), token_id);

        // Update liquidities
        _total_liquidity_locked = _total_liquidity_locked.add(liquidity);
        _locked_liquidity[staker_address] = _locked_liquidity[staker_address].add(liquidity);

        // Need to call again to make sure everything is correct
        _updateRewardAndBalance(staker_address, false);

        emit LockNFT(staker_address, liquidity, token_id, secs, source_address);
    }

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(uint256 token_id) nonReentrant external {
        require(withdrawalsPaused == false, "Withdrawals paused");
        _withdrawLocked(msg.sender, msg.sender, token_id);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like migrator_withdraw_locked() and withdrawLocked()
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        uint256 token_id
    ) internal {
        // Collect rewards first and then update the balances
        _getReward(staker_address, destination_address);

        LockedNFT memory thisNFT;
        thisNFT.liquidity = 0;
        uint256 theArrayIndex;
        for (uint256 i = 0; i < lockedNFTs[staker_address].length; i++) {
            if (token_id == lockedNFTs[staker_address][i].token_id) {
                thisNFT = lockedNFTs[staker_address][i];
                theArrayIndex = i;
                break;
            }
        }
        require(thisNFT.token_id == token_id, "Token ID not found");
        require(block.timestamp >= thisNFT.ending_timestamp || stakesUnlocked == true || valid_migrators[msg.sender] == true, "Stake is still locked!");

        uint256 theLiquidity = thisNFT.liquidity;

        if (theLiquidity > 0) {
            // Update liquidities
            _total_liquidity_locked = _total_liquidity_locked.sub(theLiquidity);
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address].sub(theLiquidity);

            // Remove the stake from the array
            delete lockedNFTs[staker_address][theArrayIndex];

            // Need to call again to make sure everything is correct
            _updateRewardAndBalance(staker_address, false);

            // Give the tokens to the destination_address
            stakingTokenNFT.safeTransferFrom(address(this), destination_address, token_id);

            emit WithdrawLocked(staker_address, theLiquidity, token_id, destination_address);
        }
    }

    // Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() external nonReentrant returns (uint256) {
        require(rewardsCollectionPaused == false,"Rewards collection paused");
        return _getReward(msg.sender, msg.sender);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    // This distinction is important for the migrator
    // Also collects the LP fees
    function _getReward(address rewardee, address destination_address) internal updateRewardAndBalance(rewardee, true) returns (uint256 reward_0) {
        reward_0 = rewards0[rewardee];
        if (reward_0 > 0) {
            rewards0[rewardee] = 0;
            TransferHelper.safeTransfer(address(rewardsToken0), destination_address, reward_0);

            // Collect liquidity fees too
            uint256 accumulated_token0 = 0;
            uint256 accumulated_token1 = 0;
            LockedNFT memory thisNFT;
            for (uint256 i = 0; i < lockedNFTs[rewardee].length; i++) {
                thisNFT = lockedNFTs[rewardee][i];
                
                // Check for null entries
                if (thisNFT.token_id != 0){
                    IUniswapV3PositionsNFT.CollectParams memory collect_params = IUniswapV3PositionsNFT.CollectParams(
                        thisNFT.token_id,
                        destination_address,
                        type(uint128).max,
                        type(uint128).max
                    );
                    (uint256 tok0_amt, uint256 tok1_amt) = stakingTokenNFT.collect(collect_params);
                    accumulated_token0 = accumulated_token0.add(tok0_amt);
                    accumulated_token1 = accumulated_token1.add(tok1_amt);
                }
            }

            emit RewardPaid(rewardee, reward_0, accumulated_token0, accumulated_token1, address(rewardsToken0), destination_address);
        }

    }

    // If the period expired, renew it
    function retroCatchUp() internal {
        // Failsafe check
        require(block.timestamp > periodFinish, "Period has not expired yet!");

        // Pull in rewards from the rewards distributor
        rewards_distributor.distributeReward(address(this));

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed = uint256(block.timestamp.sub(periodFinish)) / rewardsDuration; // Floor division to the nearest period
        uint256 balance0 = rewardsToken0.balanceOf(address(this));
        require(rewardRate0().mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance0, "Not enough FXS available");

        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        uint256 reward_per_token_0 = rewardPerToken();
        rewardPerTokenStored0 = reward_per_token_0;
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingTokenNFT));
    }

    function sync_gauge_weight(bool force_update) public {
        if (address(gauge_controller) != address(0) && (force_update || (block.timestamp > last_gauge_time_total))){
            // Update the gauge_relative_weight
            last_gauge_relative_weight = gauge_controller.gauge_relative_weight_write(address(this), block.timestamp);
            last_gauge_time_total = gauge_controller.time_total();
        }
    }

    function sync() public {
        // Sync the gauge weight, if applicable
        sync_gauge_weight(false);

        if (block.timestamp > periodFinish) {
            retroCatchUp();
        } else {
            uint256 reward_per_token_0 = rewardPerToken();
            rewardPerTokenStored0 = reward_per_token_0;
            lastUpdateTime = lastTimeRewardApplicable();
        }
    }

    /* ========== RESTRICTED FUNCTIONS - Curator / migrator callable ========== */
    
    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can).
    function migrator_stakeLocked_for(address staker_address, uint256 token_id, uint256 secs, uint256 start_timestamp) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _stakeLocked(staker_address, msg.sender, token_id, secs, start_timestamp);
    }

    // Used for migrations
    function migrator_withdraw_locked(address staker_address, uint256 token_id) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _withdrawLocked(staker_address, msg.sender, token_id);
    }

    function setPauses(
        bool _stakingPaused,
        bool _withdrawalsPaused,
        bool _rewardsCollectionPaused
    ) external onlyByOwnerOrCuratorOrGovernance {
        stakingPaused = _stakingPaused;
        withdrawalsPaused = _withdrawalsPaused;
        rewardsCollectionPaused = _rewardsCollectionPaused;
    }

    function greylistAddress(address _address) external onlyByOwnerOrCuratorOrGovernance {
        greylist[_address] = !(greylist[_address]);
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    // Adds supported migrator address
    function addMigrator(address migrator_address) external onlyByOwnGov {
        valid_migrators[migrator_address] = true;
    }

    // Remove a migrator address
    function removeMigrator(address migrator_address) external onlyByOwnGov {
        // Delete from the mapping
        delete valid_migrators[migrator_address];
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC721(address tokenAddress, uint256 token_id) external onlyByOwnGov {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if (!migrationsOn) {
            require(tokenAddress != address(stakingTokenNFT), "Not in migration"); // Only Governance / Timelock can trigger a migration
        }
        
        // Only the owner address can ever receive the recovery withdrawal
        // IUniswapV3PositionsNFT inherits IERC721 so the latter does not need to be imported
        IUniswapV3PositionsNFT(tokenAddress).safeTransferFrom( address(this), owner, token_id);
        emit RecoveredERC721(tokenAddress, token_id);
    }

    function setMultipliers(uint256 _lock_max_multiplier, uint256 _vefxs_max_multiplier, uint256 _vefxs_per_frax_for_max_boost) external onlyByOwnGov {
        require(_lock_max_multiplier >= MULTIPLIER_PRECISION, "Mult must be >= MULTIPLIER_PRECISION");
        require(_vefxs_max_multiplier >= 0, "veFXS mul must be >= 0");
        require(_vefxs_per_frax_for_max_boost > 0, "veFXS pct max must be >= 0");

        lock_max_multiplier = _lock_max_multiplier;
        vefxs_max_multiplier = _vefxs_max_multiplier;
        vefxs_per_frax_for_max_boost = _vefxs_per_frax_for_max_boost;

        emit MaxVeFXSMultiplier(vefxs_max_multiplier);
        emit LockedNFTMaxMultiplierUpdated(lock_max_multiplier);
        emit veFXSPctForMaxBoostUpdated(vefxs_per_frax_for_max_boost);
    }

    function setLockedNFTTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min) external onlyByOwnGov {
        require(_lock_time_for_max_multiplier >= 1, "Mul max time must be >= 1");
        require(_lock_time_min >= 1, "Mul min time must be >= 1");

        lock_time_for_max_multiplier = _lock_time_for_max_multiplier;
        lock_time_min = _lock_time_min;

        emit LockedNFTTimeForMaxMultiplier(lock_time_for_max_multiplier);
        emit LockedNFTMinTime(_lock_time_min);
    }

    function unlockStakes() external onlyByOwnGov {
        stakesUnlocked = !stakesUnlocked;
    }

    function toggleMigrations() external onlyByOwnGov {
        migrationsOn = !migrationsOn;
    }

    function setManualRewardRate(uint256 _reward_rate_manual, bool sync_too) external onlyByOwnGov {
        reward_rate_manual = _reward_rate_manual;

        if (sync_too) {
            sync();
        }
    }

    function setTWAP(uint32 _new_twap_duration) external onlyByOwnGov {
        require(_new_twap_duration <= 3600, "TWAP too long"); // One hour for now. Depends on how many increaseObservationCardinalityNext / observation slots you have
        twap_duration = _new_twap_duration;
    }

    function toggleEmissionFactorBypass() external onlyByOwnGov {
        bypassEmissionFactor = !bypassEmissionFactor;
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setCurator(address _new_curator) external onlyByOwnGov {
        curator_address = _new_curator;
    }

    // Set gauge_controller to address(0) to fall back to the reward_rate_manual
    function setGaugeRelatedAddrs(address _gauge_controller_address, address _rewards_distributor_address) external onlyByOwnGov {
        gauge_controller = IFraxGaugeController(_gauge_controller_address);
        rewards_distributor = IFraxGaugeFXSRewardsDistributor(_rewards_distributor_address);
    }

    /* ========== EVENTS ========== */

    event LockNFT(address indexed user, uint256 liquidity, uint256 token_id, uint256 secs, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, uint256 token_id, address destination_address);
    event RewardPaid(address indexed user, uint256 farm_reward, uint256 liq_tok0_reward, uint256 liq_tok1_reward, address token_address, address destination_address);
    event RecoveredERC20(address token, uint256 amount);
    event RecoveredERC721(address token, uint256 token_id);
    event RewardsPeriodRenewed(address token);
    event LockedNFTMaxMultiplierUpdated(uint256 multiplier);
    event LockedNFTTimeForMaxMultiplier(uint256 secs);
    event LockedNFTMinTime(uint256 secs);
    event MaxVeFXSMultiplier(uint256 multiplier);
    event veFXSPctForMaxBoostUpdated(uint256 scale_factor);

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
