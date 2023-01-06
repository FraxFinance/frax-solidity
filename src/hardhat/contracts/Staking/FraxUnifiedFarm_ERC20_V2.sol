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
// ======================= FraxUnifiedFarm_ERC20 ======================
// ====================================================================
// For ERC20 Tokens
// Uses FraxUnifiedFarmTemplate.sol

/// @dev Testing for Lock Transferring performed in isolated repository: https://github.com/ZrowGz/frax-transfers.git

import "./FraxUnifiedFarmTemplate_V2.sol";
import "./ILockReceiverV2.sol";

// -------------------- VARIES --------------------

// Convex wrappers
import "../Curve/ICurvefrxETHETHPool.sol";
import "../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../Misc_AMOs/convex/IDepositToken.sol";
import "../Misc_AMOs/curve/I2pool.sol";
import "../Misc_AMOs/curve/I2poolToken.sol";

// Fraxswap
// import '../Fraxswap/core/interfaces/IFraxswapPair.sol';

// G-UNI
// import "../Misc_AMOs/gelato/IGUniPool.sol";

// mStable
// import '../Misc_AMOs/mstable/IFeederPool.sol';

// StakeDAO sdETH-FraxPut
// import '../Misc_AMOs/stakedao/IOpynPerpVault.sol';

// StakeDAO Vault
// import '../Misc_AMOs/stakedao/IStakeDaoVault.sol';

// Uniswap V2
// import '../Uniswap/Interfaces/IUniswapV2Pair.sol';

// Vesper
// import '../Misc_AMOs/vesper/IVPool.sol';

// ------------------------------------------------

contract FraxUnifiedFarm_ERC20_V2 is FraxUnifiedFarmTemplate_V2 {

    // use custom errors to reduce contract size
    error TransferLockNotAllowed(address,uint256); // spender, locked_stake_index
    error StakesUnlocked();
    error InvalidReceiver();
    error InvalidAmount();
    error InsufficientAllowance();
    error InvalidChainlinkPrice();
    error WithdrawalsPaused();
    error StakingPaused();
    error MinimumStakeTimeNotMet();
    error TryingToLockForTooLong();
    error CannotShortenLockTime();
    error MustBeInTheFuture();
    error MustBePositive();
    // error StakerNotFound();
    error CannotBeZero();
    error AllowanceIsZero();

    /* ========== STATE VARIABLES ========== */

    // -------------------- COMMON -------------------- 
    bool internal frax_is_token0;

    // -------------------- VARIES --------------------

    // Convex stkcvxFPIFRAX, stkcvxFRAXBP, etc
    IConvexStakingWrapperFrax public stakingToken;
    I2poolToken public curveToken;
    // I2pool public curvePool;
    /// @dev uncomment this one for convex frxEth, use the I2pool version for others
    ICurvefrxETHETHPool public curvePool;

    // Fraxswap
    // IFraxswapPair public stakingToken;

    // G-UNI
    // IGUniPool public stakingToken;
    
    // mStable
    // IFeederPool public stakingToken;

    // sdETH-FraxPut Vault
    // IOpynPerpVault public stakingToken;

    // StakeDAO Vault
    // IStakeDaoVault public stakingToken;

    // Uniswap V2
    // IUniswapV2Pair public stakingToken;

    // Vesper
    // IVPool public stakingToken;

    // ------------------------------------------------

    // Stake tracking
    mapping(address => LockedStake[]) public lockedStakes;
    /* ========== STRUCTS ========== */

    // Struct for the stake
    struct LockedStake {
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }


    /* ========== APPROVALS & ALLOWANCE FOR LOCK TRANSFERS ========== */
    // staker => locked_stake_index => spender => uint256 (amount of lock that spender is approved for)
    mapping(address => mapping(uint256 => mapping(address => uint256))) public spenderAllowance;
    // staker => spender => bool (true if approved)
    mapping(address => mapping(address => bool)) public spenderApprovalForAllLocks;

    
    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRatesManual,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address _stakingToken
    ) 
    FraxUnifiedFarmTemplate_V2(_owner, _rewardTokens, _rewardManagers, _rewardRatesManual, _gaugeControllers, _rewardDistributors)
    {

        // -------------------- VARIES (USE CHILD FOR LOGIC) --------------------

        // Fraxswap
        // stakingToken = IFraxswapPair(_stakingToken);
        // address token0 = stakingToken.token0();
        // frax_is_token0 = (token0 == frax_address);

        // G-UNI
        // stakingToken = IGUniPool(_stakingToken);
        // address token0 = address(stakingToken.token0());
        // frax_is_token0 = (token0 == frax_address);

        // mStable
        // stakingToken = IFeederPool(_stakingToken);

        // StakeDAO sdETH-FraxPut Vault
        // stakingToken = IOpynPerpVault(_stakingToken);

        // StakeDAO Vault
        // stakingToken = IStakeDaoVault(_stakingToken);

        // Uniswap V2
        // stakingToken = IUniswapV2Pair(_stakingToken);
        // address token0 = stakingToken.token0();
        // if (token0 == frax_address) frax_is_token0 = true;
        // else frax_is_token0 = false;

        // Vesper
        // stakingToken = IVPool(_stakingToken);
    }

    /* ============= VIEWS ============= */

    // ------ FRAX RELATED ------

    function fraxPerLPToken() public virtual view override returns (uint256) {
        // Get the amount of FRAX 'inside' of the lp tokens
        uint256 frax_per_lp_token;

        // Convex stkcvxFPIFRAX and stkcvxFRAXBP only
        // ============================================
        // {
        //     // Half of the LP is FRAXBP
        //     // Using 0.5 * virtual price for gas savings
        //     frax_per_lp_token = curvePool.get_virtual_price() / 2; 
        // }

        // Convex Stable/FRAXBP
        // ============================================
        // {
        //     // Half of the LP is FRAXBP. Half of that should be FRAX.
        //     // Using 0.25 * virtual price for gas savings
        //     frax_per_lp_token = curvePool.get_virtual_price() / 4; 
        // }

        // Convex Volatile/FRAXBP
        // ============================================
        // {
        //     // Half of the LP is FRAXBP. Half of that should be FRAX.
        //     // Using 0.25 * lp price for gas savings
        //     frax_per_lp_token = curvePool.lp_price() / 4; 
        // }

        // Fraxswap
        // ============================================
        // {
        //     uint256 total_frax_reserves;
        //     (uint256 _reserve0, uint256 _reserve1, , ,) = (stakingToken.getReserveAfterTwamm(block.timestamp));
        //     if (frax_is_token0) total_frax_reserves = _reserve0;
        //     else total_frax_reserves = _reserve1;

        //     frax_per_lp_token = (total_frax_reserves * 1e18) / stakingToken.totalSupply();
        // }

        // G-UNI
        // ============================================
        // {
        //     (uint256 reserve0, uint256 reserve1) = stakingToken.getUnderlyingBalances();
        //     uint256 total_frax_reserves = frax_is_token0 ? reserve0 : reserve1;

        //     frax_per_lp_token = (total_frax_reserves * 1e18) / stakingToken.totalSupply();
        // }

        // mStable
        // ============================================
        // {
        //     uint256 total_frax_reserves;
        //     (, IFeederPool.BassetData memory vaultData) = (stakingToken.getBasset(frax_address));
        //     total_frax_reserves = uint256(vaultData.vaultBalance);
        //     frax_per_lp_token = (total_frax_reserves * 1e18) / stakingToken.totalSupply();
        // }

        // StakeDAO sdETH-FraxPut Vault
        // ============================================
        // {
        //    uint256 frax3crv_held = stakingToken.totalUnderlyingControlled();
        
        //    // Optimistically assume 50/50 FRAX/3CRV ratio in the metapool to save gas
        //    frax_per_lp_token = ((frax3crv_held * 1e18) / stakingToken.totalSupply()) / 2;
        // }

        // StakeDAO Vault
        // ============================================
        // {
        //    uint256 frax3crv_held = stakingToken.balance();
        
        //    // Optimistically assume 50/50 FRAX/3CRV ratio in the metapool to save gas
        //    frax_per_lp_token = ((frax3crv_held * 1e18) / stakingToken.totalSupply()) / 2;
        // }

        // Uniswap V2
        // ============================================
        // {
        //     uint256 total_frax_reserves;
        //     (uint256 reserve0, uint256 reserve1, ) = (stakingToken.getReserves());
        //     if (frax_is_token0) total_frax_reserves = reserve0;
        //     else total_frax_reserves = reserve1;

        //     frax_per_lp_token = (total_frax_reserves * 1e18) / stakingToken.totalSupply();
        // }

        // Vesper
        // ============================================
        // frax_per_lp_token = stakingToken.pricePerShare();

        return frax_per_lp_token;
    }

    // ------ LIQUIDITY AND WEIGHTS ------

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
                // midpoint_lock_multiplier = (
                //     (
                //         (lockMultiplier(time_before_expiry / 2) * time_before_expiry) + 
                //         (0 * time_after_expiry)
                //     ) / (time_before_expiry + time_after_expiry)
                // );
            }
            /// already initialized to zero
            // else {
            //     // Otherwise, it needs to just be 1x
            //     // midpoint_lock_multiplier = MULTIPLIER_PRECISION;

            //     // Otherwise, it needs to just be 0x
            //     midpoint_lock_multiplier = 0;
            // }
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
  
            // midpoint_lock_multiplier = lockMultiplier(
            //     (
            //         (thisStake.ending_timestamp - accrue_start_time) + 
            //         (thisStake.ending_timestamp - block.timestamp)
            //     ) / 2
            // );
        }

        // Sanity check: make sure it never goes above the initial multiplier
        if (midpoint_lock_multiplier > thisStake.lock_multiplier) midpoint_lock_multiplier = thisStake.lock_multiplier;
    }

    // // Calculate the combined weight for an account
    // function calcCurCombinedWeight(address account) public override view
    //     returns (
    //         uint256 old_combined_weight,
    //         uint256 new_vefxs_multiplier,
    //         uint256 new_combined_weight
    //     )
    // {
    //     // Get the old combined weight
    //     old_combined_weight = _combined_weights[account];

    //     // Get the veFXS multipliers
    //     // For the calculations, use the midpoint (analogous to midpoint Riemann sum)
    //     new_vefxs_multiplier = veFXSMultiplier(account);

    //     uint256 midpoint_vefxs_multiplier;
    //     if (
    //         (_locked_liquidity[account] == 0 && _combined_weights[account] == 0) || 
    //         (new_vefxs_multiplier >= _vefxsMultiplierStored[account])
    //     ) {
    //         // This is only called for the first stake to make sure the veFXS multiplier is not cut in half
    //         // Also used if the user increased or maintained their position
    //         midpoint_vefxs_multiplier = new_vefxs_multiplier;
    //     }
    //     else {
    //         // Handles natural decay with a non-increased veFXS position
    //         midpoint_vefxs_multiplier = (new_vefxs_multiplier + _vefxsMultiplierStored[account]) / 2;
    //     }

    //     // Loop through the locked stakes, first by getting the liquidity * lock_multiplier portion
    //     new_combined_weight = 0;
    //     for (uint256 i; i < lockedStakes[account].length; i++) {
    //         LockedStake memory thisStake = lockedStakes[account][i];

    //         // Calculate the midpoint lock multiplier
    //         // uint256 midpoint_lock_multiplier = calcCurrLockMultiplier(account, i);

    //         // Calculate the combined boost
    //         // uint256 liquidity = thisStake.liquidity;
    //         // uint256 combined_boosted_amount = thisStake.liquidity + ((thisStake.liquidity * (midpoint_lock_multiplier + midpoint_vefxs_multiplier)) / MULTIPLIER_PRECISION);
    //         new_combined_weight += (
    //             thisStake.liquidity + (
    //                 (
    //                     thisStake.liquidity * (calcCurrLockMultiplier(account, i) + midpoint_vefxs_multiplier)
    //                 ) / MULTIPLIER_PRECISION
    //             )
    //         );
    //     }
    // }
    // Calculate the combined weight for an account
    function calcCurCombinedWeight(address account) public override view
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
        // new_combined_weight = 0;
        for (uint256 i; i < lockedStakes[account].length; i++) {
            LockedStake memory thisStake = lockedStakes[account][i];

            // Calculate the midpoint lock multiplier
            uint256 midpoint_lock_multiplier = calcCurrLockMultiplier(account, i);

            // Calculate the combined boost
            uint256 liquidity = thisStake.liquidity;
            uint256 combined_boosted_amount = liquidity + ((liquidity * (midpoint_lock_multiplier + midpoint_vefxs_multiplier)) / MULTIPLIER_PRECISION);
            new_combined_weight += combined_boosted_amount;
        }
    }

    // ------ LOCK RELATED ------

    // All the locked stakes for a given account
    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    // Returns the length of the locked stakes for a given account
    function lockedStakesOfLength(address account) external view returns (uint256) {
        return lockedStakes[account].length;
    }

    function getLockedStake(address staker, uint256 locked_stake_index) public view returns (LockedStake memory locked_stake) {
        return(lockedStakes[staker][locked_stake_index]);
    }

    function getLockedStakeLiquidity(address staker, uint256 locked_stake_index) public view returns (uint256) {
        return(lockedStakes[staker][locked_stake_index].liquidity);
    }

    /* =============== MUTATIVE FUNCTIONS =============== */

    // ------ STAKING ------

    function _updateStake(address staker, uint256 index, uint256 start_timestamp, uint256 liquidity, uint256 ending_timestamp, uint256 lock_multiplier) internal {
        lockedStakes[staker][index] = LockedStake(start_timestamp, liquidity, ending_timestamp, lock_multiplier);
    }

    function _createNewStake(address staker, uint256 start_timestamp, uint256 liquidity, uint256 ending_timestamp, uint256 lock_multiplier) internal {
        lockedStakes[staker].push(LockedStake(start_timestamp, liquidity, ending_timestamp, lock_multiplier));
    }

    function _updateLiqAmts(address staker_address, uint256 amt, bool is_add) internal {
        // Get the proxy address
        address the_proxy = staker_designated_proxies[staker_address];

        if (is_add) {
            // Update total liquidities
            _total_liquidity_locked += amt;
            _locked_liquidity[staker_address] += amt;

            // Update the proxy
            if (staker_designated_proxies[staker_address] != address(0)) {
                proxy_lp_balances[the_proxy] += amt;
            }
        }
        else {
            // Update total liquidities
            _total_liquidity_locked -= amt;
            _locked_liquidity[staker_address] -= amt;

            // Update the proxy
            if (the_proxy != address(0)) proxy_lp_balances[the_proxy] -= amt;
        }

        // Need to call to update the combined weights
        updateRewardAndBalance(staker_address, false);
    }

    // Add additional LPs to an existing locked stake
    function lockAdditional(uint256 theArrayIndex, uint256 addl_liq) nonReentrant updateRewardAndBalanceMdf(msg.sender, true) public {
        // Get the stake by its index
        LockedStake memory thisStake = lockedStakes[msg.sender][theArrayIndex];

        // Calculate the new amount
        // uint256 new_amt = thisStake.liquidity + addl_liq;

        // Checks
        if (addl_liq <= 0) revert MustBePositive();

        // Pull the tokens from the sender
        TransferHelperV2.safeTransferFrom(address(stakingToken), msg.sender, address(this), addl_liq);

        // Update the stake
        // lockedStakes[msg.sender][theArrayIndex] = LockedStake(
        //     thisStake.start_timestamp,
        //     (thisStake.liquidity + addl_liq),
        //     thisStake.ending_timestamp,
        //     thisStake.lock_multiplier
        // );
        _updateStake(
            msg.sender, 
            theArrayIndex, 
            thisStake.start_timestamp, 
            (thisStake.liquidity + addl_liq), 
            thisStake.ending_timestamp, 
            thisStake.lock_multiplier
        );
        // Update liquidities
        _updateLiqAmts(msg.sender, addl_liq, true);

        emit LockedAdditional(msg.sender, theArrayIndex, addl_liq);
    }

    // Extends the lock of an existing stake
    function lockLonger(uint256 theArrayIndex, uint256 new_ending_ts) nonReentrant updateRewardAndBalanceMdf(msg.sender, true) public {
        // Get the stake by its index
        LockedStake memory thisStake = lockedStakes[msg.sender][theArrayIndex];

        // Check
        // require(new_ending_ts > block.timestamp, "Must be in the future");
        if (new_ending_ts <= block.timestamp) revert MustBeInTheFuture();

        // Calculate some times
        //uint256 time_left = (thisStake.ending_timestamp > block.timestamp) ? thisStake.ending_timestamp - block.timestamp : 0;
        uint256 new_secs = new_ending_ts - block.timestamp;

        // Checks
        // require(time_left > 0, "Already expired");
        if (new_secs <= (
            (thisStake.ending_timestamp > block.timestamp) ? 
            thisStake.ending_timestamp - block.timestamp : 0
        )) revert CannotShortenLockTime();
        if (new_secs < lock_time_min) revert MinimumStakeTimeNotMet();
        if (new_secs > lock_time_for_max_multiplier) revert TryingToLockForTooLong();

        // Update the stake
        // lockedStakes[msg.sender][theArrayIndex] = LockedStake(
        //     block.timestamp,
        //     thisStake.liquidity,
        //     new_ending_ts,
        //     lockMultiplier(new_secs)
        // );
        _updateStake(
            msg.sender, 
            theArrayIndex, 
            block.timestamp, 
            thisStake.liquidity, 
            new_ending_ts, 
            lockMultiplier(new_secs)
        );

        // Need to call to update the combined weights
        updateRewardAndBalance(msg.sender, false);

        emit LockedLonger(msg.sender, theArrayIndex, new_secs, block.timestamp, new_ending_ts);
    }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for proxies)
    function stakeLocked(uint256 liquidity, uint256 secs) nonReentrant external returns (uint256) {
        return _stakeLocked(msg.sender, msg.sender, liquidity, secs, block.timestamp);
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    function _stakeLocked(
        address staker_address,
        address source_address,
        uint256 liquidity,
        uint256 secs,
        uint256 start_timestamp
    ) internal updateRewardAndBalanceMdf(staker_address, true) returns (uint256) {
        if (stakingPaused) revert StakingPaused();
        if (secs < lock_time_min) revert MinimumStakeTimeNotMet();
        if (secs > lock_time_for_max_multiplier) revert TryingToLockForTooLong();

        // Pull in the required token(s)
        // Varies per farm
        TransferHelperV2.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);

        // Get the lock multiplier and create the new lockedStake
        // uint256 lock_multiplier = lockMultiplier(secs);

        // Create the locked stake
        // lockedStakes[staker_address].push(LockedStake(
        //     start_timestamp,
        //     liquidity,
        //     block.timestamp + secs,
        //     lockMultiplier(secs)
        // ));
        _createNewStake(
            staker_address, 
            start_timestamp, 
            liquidity, 
            block.timestamp + secs, 
            lockMultiplier(secs)
        );

        // Update liquidities
        _updateLiqAmts(staker_address, liquidity, true);

        emit StakeLocked(staker_address, liquidity, secs, lockedStakes[staker_address].length, source_address);

        return lockedStakes[staker_address].length;
    }

    // ------ WITHDRAWING ------

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for proxies)
    function withdrawLocked(uint256 theArrayIndex, address destination_address) nonReentrant external returns (uint256) {
        if (withdrawalsPaused == true) revert WithdrawalsPaused();
        return _withdrawLocked(msg.sender, destination_address, theArrayIndex);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        uint256 theArrayIndex
    ) internal returns (uint256) {
        // Collect rewards first and then update the balances
        _getReward(staker_address, destination_address, true);

        // Get the stake and its index
        // (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(staker_address, lockedStake);
        LockedStake memory thisStake = lockedStakes[staker_address][theArrayIndex];

        // require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true, "Stake is still locked!");
        // the stake must still be locked to transfer
        if (block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true) {
            revert StakesUnlocked();
        }
        // uint256 liquidity = thisStake.liquidity;

        if (thisStake.liquidity > 0) {

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            TransferHelperV2.safeTransfer(address(stakingToken), destination_address, thisStake.liquidity);

            // // Update liquidities
            // _total_liquidity_locked -= thisStake.liquidity;
            // _locked_liquidity[staker_address] -= thisStake.liquidity;
            // {
            //     address the_proxy = getProxyFor(staker_address);
            //     if (the_proxy != address(0)) proxy_lp_balances[the_proxy] -= thisStake.liquidity;
            // }

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // // Need to call again to make sure everything is correct
            // updateRewardAndBalance(staker_address, false);

            // Update liquidities
            _updateLiqAmts(staker_address, thisStake.liquidity, false);

            emit WithdrawLocked(staker_address, thisStake.liquidity, theArrayIndex, destination_address);
        }

        return thisStake.liquidity;
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Do nothing
    }

    /* ========== LOCK TRANSFER & AUTHORIZATIONS - Approvals, Functions, Errors, & Events ========== */

    // Approve `spender` to transfer `lockedStake` on behalf of `owner`
    function setAllowance(address spender, uint256 lockedStakeIndex, uint256 amount) external {
        if(spenderAllowance[msg.sender][lockedStakeIndex][spender] >= 0) revert CannotBeZero();
        spenderAllowance[msg.sender][lockedStakeIndex][spender] = amount;
        emit Approval(msg.sender, spender, lockedStakeIndex, amount);
    }

    function increaseAllowance(address spender, uint256 lockedStakeIndex, uint256 amount) external {
        if (spenderAllowance[msg.sender][lockedStakeIndex][spender] == 0) revert AllowanceIsZero();
        spenderAllowance[msg.sender][lockedStakeIndex][spender] += amount;
        emit Approval(msg.sender, spender, lockedStakeIndex, spenderAllowance[msg.sender][lockedStakeIndex][spender]);
    }

    // Revoke approval for a single lockedStake
    function removeAllowance(address spender, uint256 lockedStakeIndex) external {
        spenderAllowance[msg.sender][lockedStakeIndex][spender] = 0;
        emit Approval(msg.sender, spender, lockedStakeIndex, 0);
    }

    // Approve or revoke `spender` to transfer any/all locks on behalf of the owner
    function setApprovalForAll(address spender, bool approved) external {
        spenderApprovalForAllLocks[msg.sender][spender] = approved; 
        emit ApprovalForAll(msg.sender, spender, approved);
    }

    // internal approval check and allowance manager
    function isApproved(address staker, uint256 lockedStakeIndex, uint256 amount) public view returns (bool) {
        // check if spender is approved for all `staker` locks
        if (spenderApprovalForAllLocks[staker][msg.sender]) {
            return true;
        } else if (spenderAllowance[staker][lockedStakeIndex][msg.sender] >= amount) {
            return true;
        } else {
            // for any other possibility, return false
            return false;
        }
    }

    function _spendAllowance(address staker, uint256 lockedStakeIndex, uint256 amount) internal {
            if (spenderAllowance[staker][lockedStakeIndex][msg.sender] == amount) {
                spenderAllowance[staker][lockedStakeIndex][msg.sender] = 0;
            } else if (spenderAllowance[staker][lockedStakeIndex][msg.sender] > amount) {
                spenderAllowance[staker][lockedStakeIndex][msg.sender] -= amount;
            } else {
                revert InsufficientAllowance();
            }
    }

    // ------ TRANSFERRING LOCKED STAKES ------

    function transferLockedFrom(
        address sender_address,
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) external nonReentrant returns (uint256,uint256) {
        // check approvals
        if (!isApproved(sender_address, sender_lock_index, transfer_amount)) revert TransferLockNotAllowed(msg.sender, sender_lock_index);

        // adjust the allowance down
        _spendAllowance(sender_address, sender_lock_index, transfer_amount);

        // do the transfer
        /// @dev the approval check is done in modifier, so to reach here caller is permitted, thus OK 
        //       to supply both staker & receiver here (no msg.sender)
        return(_safeTransferLockedByLockIndex(sender_address, receiver_address, sender_lock_index, transfer_amount, use_receiver_lock_index, receiver_lock_index));
    }

    function transferLocked(
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) external nonReentrant returns (uint256,uint256) {
        // do the transfer
        /// @dev approval/owner check not needed here as msg.sender is the staker
        return(_safeTransferLockedByLockIndex(msg.sender, receiver_address, sender_lock_index, transfer_amount, use_receiver_lock_index, receiver_lock_index));
    }

    function _safeTransferLockedByLockIndex(
        address sender_address,
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) internal updateRewardAndBalanceMdf(sender_address, true) updateRewardAndBalanceMdf(receiver_address, true) returns (uint256,uint256) {

        // on transfer, call sender_address to verify sending is ok
        if (sender_address.code.length > 0) {
            require(
                ILockReceiverV2(sender_address).beforeLockTransfer(sender_address, receiver_address, sender_lock_index, "") 
                == 
                ILockReceiverV2.beforeLockTransfer.selector // 00x4fb07105 <--> bytes4(keccak256("beforeLockTransfer(address,address,bytes32,bytes)"))
            );
        }
        
        // Get the stake and its index
        LockedStake memory senderStake = getLockedStake(sender_address, sender_lock_index);

        // perform checks
        if (receiver_address == address(0) || receiver_address == sender_address) {
            revert InvalidReceiver();
        }
        if (block.timestamp >= senderStake.ending_timestamp || stakesUnlocked == true) {
            revert StakesUnlocked();
        }
        if (transfer_amount > senderStake.liquidity || transfer_amount <= 0) {
            revert InvalidAmount();
        }

        // Update the liquidities
        _locked_liquidity[sender_address] -= transfer_amount;
        _locked_liquidity[receiver_address] += transfer_amount;
        
        if (getProxyFor(sender_address) != address(0)) {
                proxy_lp_balances[getProxyFor(sender_address)] -= transfer_amount;
        }
        
        if (getProxyFor(receiver_address) != address(0)) {
                proxy_lp_balances[getProxyFor(receiver_address)] += transfer_amount;
        }

        // if sent amount was all the liquidity, delete the stake, otherwise decrease the balance
        if (transfer_amount == senderStake.liquidity) {
            delete lockedStakes[sender_address][sender_lock_index];
        } else {
            lockedStakes[sender_address][sender_lock_index].liquidity -= transfer_amount;
        }

        // Get the stake and its index
        LockedStake memory receiverStake = getLockedStake(receiver_address, receiver_lock_index);

        /** if use_receiver_lock_index is true &
        *       & the index is valid 
        *       & has liquidity 
        *       & is still locked, update the stake & ending timestamp (longer of the two)
        *   else, create a new lockedStake
        * note using nested if checks to reduce gas costs slightly
        */
        if (use_receiver_lock_index == true) {
            if (receiver_lock_index < lockedStakes[receiver_address].length ) {
                if (receiverStake.liquidity > 0) {
                    if (receiverStake.ending_timestamp > block.timestamp) {
                        // Update the existing staker's stake liquidity
                        lockedStakes[receiver_address][receiver_lock_index].liquidity += transfer_amount;
                        // check & update ending timestamp to whichever is farthest out
                        if (receiverStake.ending_timestamp < senderStake.ending_timestamp) {
                            // update the lock expiration to the later timestamp
                            lockedStakes[receiver_address][receiver_lock_index].ending_timestamp = senderStake.ending_timestamp;
                            // update the lock multiplier since we are effectively extending the lock
                            lockedStakes[receiver_address][receiver_lock_index].lock_multiplier = lockMultiplier(
                                senderStake.ending_timestamp - block.timestamp
                            );
                        }
                    }
                }
            }
        } else {
            // create the new lockedStake
            // lockedStakes[receiver_address].push(LockedStake(
            //     senderStake.start_timestamp,
            //     transfer_amount,
            //     senderStake.ending_timestamp,
            //     senderStake.lock_multiplier
            // ));
            _createNewStake(
                receiver_address, 
                senderStake.start_timestamp, 
                transfer_amount,
                senderStake.ending_timestamp, 
                senderStake.lock_multiplier
            );
            
            // update the return value of the locked index 
            /// todo could also just use the length of the array in all 3 situations below - which is more gas efficient?
            receiver_lock_index = lockedStakes[receiver_address].length;
        }

        // Need to call again to make sure everything is correct
        updateRewardAndBalance(sender_address, true); 
        updateRewardAndBalance(receiver_address, true);

        emit TransferLockedByIndex(
            sender_address,
            receiver_address,
            transfer_amount,
            sender_lock_index,
            receiver_lock_index
        );

        // call the receiver with the destination lockedStake to verify receiving is ok
        if (ILockReceiverV2(receiver_address).onLockReceived(
            sender_address, 
            receiver_address, 
            receiver_lock_index, 
            ""
        ) != ILockReceiverV2.onLockReceived.selector) revert InvalidReceiver(); //0xc42d8b95) revert InvalidReceiver();

        return (sender_lock_index, receiver_lock_index);

    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    // Inherited...

    /* ========== EVENTS ========== */
    event LockedAdditional(address indexed user, uint256 locked_stake_index, uint256 amount);
    event LockedLonger(address indexed user, uint256 locked_stake_index, uint256 new_secs, uint256 new_start_ts, uint256 new_end_ts);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs, uint256 locked_stake_index, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, uint256 locked_stake_index, address destination_address);
    
    event Approval(address indexed owner, address indexed spender, uint256 locked_stake_index, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed spender, bool approved);
    
    event TransferLockedByIndex(address indexed sender_address, address indexed destination_address, uint256 amount_transferred, uint256 source_stake_index, uint256 destination_stake_index);
}