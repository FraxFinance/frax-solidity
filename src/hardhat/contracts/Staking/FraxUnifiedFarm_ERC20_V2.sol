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
// ===================== FraxUnifiedFarm_ERC20_V2 =====================
// ====================================================================
// For ERC20 Tokens
// Uses FraxUnifiedFarmTemplate.sol

/// @dev Testing for Lock Transferring performed in isolated repository: https://github.com/ZrowGz/frax-transfers.git
/// Locked Stake Transfer & Custom Error logic created by ZrowGz with the Pitch Foundation

import "./FraxUnifiedFarmTemplate_V2.sol";
import "./ILockReceiver.sol";

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
    error StakeStillLocked(uint256,uint256); // ending_timestamp, block.timestamp
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
    error BeforeLockTransferFailed();
    error OnLockReceivedFailed();
    error CannotBeZero();
    error AllowanceIsZero();
    error NoStakeIndexProvided();

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

    /// @notice Get the amount of FRAX 'inside' an LP token
    /// @dev Override if needing to do something special
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

    /// @notice Calculates the current lock multiplier for a given account's locked stake
    /// @param account The account to check
    /// @param stake_idx The index of the stake to check
    /// @return midpoint_lock_multiplier The midpoint of the user's stake's lock multiplier
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
        }

        // Sanity check: make sure it never goes above the initial multiplier
        if (midpoint_lock_multiplier > thisStake.lock_multiplier) midpoint_lock_multiplier = thisStake.lock_multiplier;
    }

    // Calculate the combined weight for an account
    /// @notice Calculates the combined weight for an account
    /// @param account The account to check
    /// @return old_combined_weight The account's old combined weight
    /// @return new_vefxs_multiplier The account's new veFXS multiplier
    /// @return new_combined_weight The account's new combined weight
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

    /// @notice Returns the locked stakes for a given account
    /// @param account The address of the account
    /// @return The array of locked stakes for a given account
    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    /// @notice Returns the length of the locked stakes for a given account
    /// @param account The address of the account
    /// @return The length of the locked stakes for a given account
    function lockedStakesOfLength(address account) external view returns (uint256) {
        return lockedStakes[account].length;
    }

    /// @notice Returns the locked stake at a given index
    /// @param staker The address of the staker
    /// @param locked_stake_index The index of the locked stake
    /// @return locked_stake The locked stake struct
    function getLockedStake(address staker, uint256 locked_stake_index) public view returns (LockedStake memory locked_stake) {
        return(lockedStakes[staker][locked_stake_index]);
    }


    /// @notice Returns the liquidity and ending timestamp of a locked stake
    /// @param staker The address of the staker
    /// @param locked_stake_index The index of the locked stake
    /// @return The liquidity of the locked stake
    /// @return The ending timestamp of the locked stake
    function getStakeLiquidityAndEnding(address staker, uint256 locked_stake_index) external view returns (uint256,uint256) {
        return(
            lockedStakes[staker][locked_stake_index].liquidity,
            lockedStakes[staker][locked_stake_index].ending_timestamp
        );
    }

    /* =============== MUTATIVE FUNCTIONS =============== */

    // ------ STAKING ------

    /// @notice Searches for previous used, but currently zeroed out stake positions within the array
    /// @param staker The address of the staker
    /// @return The index of the unused stake position
    /// @return Whether or not an unused stake position was found
    function _findUnusedStakeIndex(address staker) internal view returns (uint256,bool) {
        uint256 i;
        while (i < lockedStakes[staker].length) {
            if (lockedStakes[staker][i].ending_timestamp == 0) {
                return (i,true);
            }
            i++;
        }
        return (i,false);
    }

    /// @notice Updates a stake for a given staker
    /// @param staker The address of the staker
    /// @param index The index of the stake
    /// @param start_timestamp The timestamp of when the stake started
    /// @param liquidity The amount of liquidity to stake
    /// @param ending_timestamp The timestamp of when the stake ends
    /// @param lock_multiplier The multiplier of the stake
    function _updateStake(address staker, uint256 index, uint256 start_timestamp, uint256 liquidity, uint256 ending_timestamp, uint256 lock_multiplier) internal {
        lockedStakes[staker][index] = LockedStake(start_timestamp, liquidity, ending_timestamp, lock_multiplier);
    }

    /// @notice Creates a new stake for a given staker
    /// @param staker The address of the staker
    /// @param start_timestamp The timestamp of when the stake started
    /// @param liquidity The amount of liquidity to stake
    /// @param ending_timestamp The timestamp of when the stake ends
    /// @param lock_multiplier The multiplier of the stake
    /// @return The index of the new stake
    function _createNewStake(address staker, uint256 start_timestamp, uint256 liquidity, uint256 ending_timestamp, uint256 lock_multiplier) internal returns(uint256) {
        lockedStakes[staker].push(LockedStake(start_timestamp, liquidity, ending_timestamp, lock_multiplier));
        return lockedStakes[staker].length - 1;
    }

    /// @notice Update's the global & proxy liquidity amounts, and checkpoint's user's rewards/balances
    /// @param staker_address The address of the staker
    /// @param amt The amount of liquidity to add or remove
    /// @param is_add Whether to add or remove liquidity
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
        _updateRewardAndBalance(staker_address, false, true);
    }

    // // Add additional LPs to an existing locked stake
    // function lockAdditional(uint256 theArrayIndex, uint256 addl_liq) nonReentrant updateRewardAndBalanceMdf(msg.sender, true) external {
    //     // Get the stake by its index
    //     LockedStake memory thisStake = lockedStakes[msg.sender][theArrayIndex];

    //     // Checks
    //     if (addl_liq <= 0) revert MustBePositive();

    //     // Pull the tokens from the sender
    //     TransferHelperV2.safeTransferFrom(address(stakingToken), msg.sender, address(this), addl_liq);

    //     // Update the stake
    //     _updateStake(
    //         msg.sender, 
    //         theArrayIndex, 
    //         thisStake.start_timestamp, 
    //         (thisStake.liquidity + addl_liq), 
    //         thisStake.ending_timestamp, 
    //         thisStake.lock_multiplier
    //     );
    //     // Update liquidities
    //     _updateLiqAmts(msg.sender, addl_liq, true);

    //     emit LockedAdditional(msg.sender, theArrayIndex, addl_liq);
    // }

    // // Extends the lock of an existing stake
    // function lockLonger(uint256 theArrayIndex, uint256 new_ending_ts) nonReentrant updateRewardAndBalanceMdf(msg.sender, true) external {
    //     // Get the stake by its index
    //     LockedStake memory thisStake = lockedStakes[msg.sender][theArrayIndex];

    //     // Check
    //     // require(new_ending_ts > block.timestamp, "Must be in the future");
    //     if (new_ending_ts <= block.timestamp) revert MustBeInTheFuture();

    //     // Calculate some times
    //     //uint256 time_left = (thisStake.ending_timestamp > block.timestamp) ? thisStake.ending_timestamp - block.timestamp : 0;
    //     uint256 new_secs = new_ending_ts - block.timestamp;

    //     // Checks
    //     // require(time_left > 0, "Already expired");
    //     if (new_secs <= (
    //         (thisStake.ending_timestamp > block.timestamp) ? 
    //         thisStake.ending_timestamp - block.timestamp : 0
    //     )) revert CannotShortenLockTime();
    //     if (new_secs < lock_time_min) revert MinimumStakeTimeNotMet();
    //     if (new_secs > lock_time_for_max_multiplier) revert TryingToLockForTooLong();

    //     // Update the stake
    //     _updateStake(
    //         msg.sender, 
    //         theArrayIndex, 
    //         block.timestamp, 
    //         thisStake.liquidity, 
    //         new_ending_ts, 
    //         lockMultiplier(new_secs)
    //     );

    //     // Need to call to update the combined weights
    //     updateRewardAndBalance(msg.sender, false);

    //     emit LockedLonger(msg.sender, theArrayIndex, new_secs, block.timestamp, new_ending_ts);
    // }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for proxies)
    /// @notice Creation, extension, and addition of liquidity to a locked stake.
    /// @notice Combines the functionality of stakeLocked, lockAdditional, and lockLonger into a single function.
    /// @dev Note that `secs` is now only ever the amount of time to add to block.timestamp - secs can be 0 if locking additional only.
    /// @param liquidity The amount of liquidity to stake.
    /// @param secs The number of seconds to lock the liquidity for.
    /// @param useTargetStakeIndex If true, alter certain parameters of an existing stake. If false, create a new stake.
    /// @param targetIndex The index of the stake to alter, if applicable.
    /// @return The index of the stake that was created or altered.
    function manageStake(uint256 liquidity, uint256 secs, bool useTargetStakeIndex, uint256 targetIndex) nonReentrant external returns (uint256) {
        return _manageStake(msg.sender, msg.sender, liquidity, secs, useTargetStakeIndex, targetIndex);//block.timestamp, 
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    /// @notice Creation, extension, and addition of liquidity to a locked stake.
    /// @notice Combines the functionality of stakeLocked, lockAdditional, and lockLonger into a single function.
    /// @dev Note that `secs` is now only ever the amount of time to add to block.timestamp - secs can be 0 if locking additional only.
    /// @param staker_address The address of the staker.
    /// @param source_address The address of the source of the liquidity.
    /// @param liquidity The amount of liquidity to stake.
    /// @param secs The number of seconds to lock the liquidity for.
    /// @param useTargetStakeIndex If true, alter certain parameters of an existing stake. If false, create a new stake.
    /// @param targetIndex The index of the stake to alter, if applicable.
    function _manageStake(
        address staker_address,
        address source_address,
        uint256 liquidity,
        uint256 secs,
        bool useTargetStakeIndex,
        uint256 targetIndex
    ) internal updateRewardAndBalanceMdf(staker_address, true) returns (uint256 stakeIndex) {
        if (stakingPaused) revert StakingPaused();
        if (secs < lock_time_min) revert MinimumStakeTimeNotMet();
        if (secs > lock_time_for_max_multiplier) revert TryingToLockForTooLong();

        // Pull in the required token(s)
        // Varies per farm
        if (liquidity > 0) {
            TransferHelperV2.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);
        }

        // If we are not using a target stake index, we are creating a new stake
        // AND if there's enough stake space, create a new one, otherwise check for zeroed out stakes
        if (!useTargetStakeIndex && lockedStakes[staker_address].length < max_locked_stakes) {
            // Create the locked stake
            stakeIndex = _createNewStake(
                staker_address, 
                block.timestamp, 
                liquidity, 
                block.timestamp + secs, 
                lockMultiplier(secs)
            );

            // check that the number of this address' stakes are not over the limit
        } else if (!useTargetStakeIndex && lockedStakes[staker_address].length == max_locked_stakes) {
            // look for unused stakes that were previously used but zeroed out by withdrawals or transfers
            (uint256 index, bool success) = _findUnusedStakeIndex(staker_address);

            // if no unused stake was found, revert
            if (!success) revert TooManyStakes();
            
            // set the index being used
            stakeIndex = index;
            
            // reuse the zeroed out stake to create this new locked stake
            _updateStake(
                staker_address, 
                index, 
                block.timestamp, 
                liquidity, 
                block.timestamp + secs, 
                lockMultiplier(secs)
            );

        } else {
            // Otherwise, we are either locking additional or extending lock duration
            if (!useTargetStakeIndex) revert NoStakeIndexProvided();
            
            // Get the stake by its index
            LockedStake memory thisStake = lockedStakes[msg.sender][targetIndex];

            // calculate the new ending timestamp (can = block.timestamp if secs = 0)
            uint256 new_ending_ts = secs + block.timestamp;

            // if `secs` is 0, we are "locking additional"
            if (new_ending_ts < thisStake.ending_timestamp) revert CannotShortenLockTime();

            // Update the stake. If `secs` is 0, we are "locking additional" so don't need to change the time values
            _updateStake(
                staker_address, 
                targetIndex, 
                secs == 0 ? thisStake.start_timestamp : block.timestamp, 
                thisStake.liquidity + liquidity, // if locking additional, add to existing liquidity
                secs == 0 ? thisStake.ending_timestamp : new_ending_ts, 
                lockMultiplier(secs)
            );
            
            // set the return value to the index of the stake we altered
            stakeIndex = targetIndex;
        }

        // if altering balances of a stake, update the liquidities
        // liquidity can be 0 if we are only extending the lock duration
        if (liquidity > 0) {
            // Update liquidities if we are creating a new stake or locking additional
            // this also runs `_updateRewardAndBalance` for the staker
            _updateLiqAmts(staker_address, liquidity, true);
        } else {
            // otherwise, only update rewards and balances
            _updateRewardAndBalance(msg.sender, false);
        }
        emit StakeLocked(staker_address, liquidity, secs, lockedStakes[staker_address].length - 1, source_address);

        return stakeIndex;
    }

    // ------ WITHDRAWING ------

    /// @notice Withdraws a locked stake.
    /// @notice This function is only callable by the staker.
    /// @param theArrayIndex The index of the stake in the staker's array of stakes.
    /// @param destination_address The address to send the withdrawn liquidity to.
    /// @param claim_rewards Whether to claim rewards or not
    /// @return The amount of liquidity withdrawn.
    function withdrawLocked(uint256 theArrayIndex, address destination_address, bool claim_rewards) nonReentrant external returns (uint256) {
        if (withdrawalsPaused) revert WithdrawalsPaused();
        return _withdrawLocked(msg.sender, destination_address, theArrayIndex, claim_rewards);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        uint256 theArrayIndex,
        bool claim_rewards
    ) internal returns (uint256) {
        // Collect rewards first and then update the balances
        // collectRewardsOnWithdrawalPaused to be used in an emergency situation if reward is overemitted or not available
        // and the user can forfeit rewards to get their principal back. User can also specify it in withdrawLocked
        if (claim_rewards || !collectRewardsOnWithdrawalPaused) _getReward(staker_address, destination_address, true);
        else {
            // Sync the rewards at least
            _updateRewardAndBalance(staker_address, true, false);
        }

        // Get the stake by its index
        LockedStake memory thisStake = lockedStakes[staker_address][theArrayIndex];

        // note: original check:: require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true, "Stake is still locked!");
        // the stake must still be unlocked to withdraw
        if (block.timestamp < thisStake.ending_timestamp && !stakesUnlocked) {
            revert StakeStillLocked(thisStake.ending_timestamp, block.timestamp);
        }

        uint256 liq = thisStake.liquidity;
        if (liq > 0) {

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            TransferHelperV2.safeTransfer(address(stakingToken), destination_address, liq);

            // disable the stake by setting everything to zero
            _updateStake(staker_address, theArrayIndex, 0, 0, 0, 0);

            // Update liquidities & balances
            _updateLiqAmts(staker_address, thisStake.liquidity, false);

            emit WithdrawLocked(staker_address, thisStake.liquidity, theArrayIndex, destination_address);
        }

        return liq;
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Do nothing
    }

    /* ========== LOCK TRANSFER & AUTHORIZATIONS - Approvals, Functions, Errors, & Events ========== */

    // Approve `spender` to transfer `lockedStake` on behalf of `owner`
    /// @notice Used to increase allowance when it is at zero
    /// @dev separating this from the `increaseAllowance` function to avoid the allowance exploit
    /// @param spender The address of the account that is allowed to transfer the tokens
    /// @param lockedStakeIndex The index of the locked stake
    /// @param amount The amount of tokens to be approved for transfer
    function setAllowance(address spender, uint256 lockedStakeIndex, uint256 amount) external {
        if(spenderAllowance[msg.sender][lockedStakeIndex][spender] > 0) revert CannotBeZero();
        spenderAllowance[msg.sender][lockedStakeIndex][spender] = amount;
        emit Approval(msg.sender, spender, lockedStakeIndex, amount);
    }

    /// @notice Used to increase allowance when it is not at zero
    /// @dev separating this from the `setAllowance` function to avoid the allowance exploit
    /// @param spender The address of the account that is allowed to transfer the tokens
    /// @param lockedStakeIndex The index of the locked stake
    /// @param amount The amount of tokens to be approved for transfer
    function increaseAllowance(address spender, uint256 lockedStakeIndex, uint256 amount) external {
        if (spenderAllowance[msg.sender][lockedStakeIndex][spender] == 0) revert AllowanceIsZero();
        spenderAllowance[msg.sender][lockedStakeIndex][spender] += amount;
        emit Approval(msg.sender, spender, lockedStakeIndex, spenderAllowance[msg.sender][lockedStakeIndex][spender]);
    }

    /// @notice Revoke approval for a single lockedStake
    /// @param spender The address of the account that is allowed to transfer the tokens
    /// @param lockedStakeIndex The index of the locked stake
    function removeAllowance(address spender, uint256 lockedStakeIndex) external {
        spenderAllowance[msg.sender][lockedStakeIndex][spender] = 0;
        emit Approval(msg.sender, spender, lockedStakeIndex, 0);
    }

    // Approve or revoke `spender` to transfer any/all locks on behalf of the owner
    /// @notice Set's `spender` approval for all locks: true=approve, false=remove approval
    /// @param spender The address of the account that is allowed to transfer the tokens
    /// @param approved The approval status
    function setApprovalForAll(address spender, bool approved) external {
        spenderApprovalForAllLocks[msg.sender][spender] = approved; 
        emit ApprovalForAll(msg.sender, spender, approved);
    }

    /// @notice External getter function to check if a spender is approved for `amount` of a lockedStake
    /// @param staker The address of the sender
    /// @param spender The address of the spender
    /// @param lockedStakeIndex The index of the locked stake
    /// @param amount The amount to spend
    function isApproved(address staker, address spender, uint256 lockedStakeIndex, uint256 amount) external view returns (bool) {
        // check if spender is approved for all `staker` locks
        if (spenderApprovalForAllLocks[staker][spender]) {
            return true;
        } else if (spenderAllowance[staker][lockedStakeIndex][spender] >= amount) {
            return true;
        } else {
            // for any other possibility, return false
            return false;
        }
    }

    /// @notice Checks for sufficient allowance & spends it
    /// @param staker The address of the sender
    /// @param lockedStakeIndex The index of the locked stake
    /// @param amount The amount to spend
    function _spendAllowance(address staker, uint256 lockedStakeIndex, uint256 amount) internal {
        // determine if the allowance is sufficient and spend it accordingly, based on the available allowance
        if (spenderAllowance[staker][lockedStakeIndex][msg.sender] == amount) {
            spenderAllowance[staker][lockedStakeIndex][msg.sender] = 0;
        } else if (spenderAllowance[staker][lockedStakeIndex][msg.sender] > amount) {
            spenderAllowance[staker][lockedStakeIndex][msg.sender] -= amount;
        } else {
            // otherwise, if there's not enough allowance, revert
            revert InsufficientAllowance();
        }
    }

    // ------ TRANSFERRING LOCKED STAKES ------

    /// @notice Allows an approved spender to transfer assets in sender's lockedStake to another user
    /// @param sender_address The address of the sender
    /// @param receiver_address The address of the receiver
    /// @param sender_lock_index The index of the sender's lockedStake
    /// @param transfer_amount The amount to transfer
    /// @param use_receiver_lock_index If true, the receiver wants the assets sent to an existing, valid lockedStake they control
    /// @param receiver_lock_index The index of the receiver's lockedStake to add these assets to
    function transferLockedFrom(
        address sender_address,
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) external nonReentrant returns (uint256,uint256) {
        /// if spender is not approved for all, spend allowance, otherwise, carry on
        if(!spenderApprovalForAllLocks[sender_address][msg.sender]) {
            // adjust the allowance down & performs checks
            _spendAllowance(sender_address, sender_lock_index, transfer_amount);
        }

        // do the transfer
        /// @dev the approval check is done in modifier, so to reach here caller is permitted, thus OK 
        //       to supply both staker & receiver here (no msg.sender)
        return(_safeTransferLockedByLockIndex([sender_address, receiver_address], sender_lock_index, transfer_amount, use_receiver_lock_index, receiver_lock_index));
    }

    /// @notice Allows a staker to transfer assets in their lockedStake to another user
    /// @param receiver_address The address of the receiver
    /// @param sender_lock_index The index of the sender's lockedStake (previously used kek_id to look up this value)
    /// @param transfer_amount The amount to transfer
    /// @param use_receiver_lock_index If true, the receiver wants the assets sent to an existing, valid lockedStake they control
    /// @param receiver_lock_index The index of the receiver's lockedStake to add these assets to
    /// @notice @dev Similar to ERC721 `onERC721Received` callbacks, the risk exists for a sender or receiver to grief or censor transactions. 
    /// @notice @dev This griefing/censoring may warrant off-chain monitoring of transactions and preventing the malicious actor from being involved in transfers.
    /// @notice @dev The need for being able to allow senders and receivers that are contracts needing to update user balances necessitates that these two calls remain in place despite these vectors.  
    function transferLocked(
        address receiver_address,
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) external nonReentrant returns (uint256,uint256) {
        // do the transfer
        /// @dev approval/owner check not needed here as msg.sender is the staker
        return(_safeTransferLockedByLockIndex([msg.sender, receiver_address], sender_lock_index, transfer_amount, use_receiver_lock_index, receiver_lock_index));
    }

    /// @notice The transfer logic that executes the transfer, utilizes beforeLockTransfer & onLockReceived to ensure that the receiver is able to prevent asset loss
    function _safeTransferLockedByLockIndex(
        address[2] memory addrs, // [0]: sender_address, [1]: addrs[1]. Reduces stack size
        uint256 sender_lock_index,
        uint256 transfer_amount,
        bool use_receiver_lock_index,
        uint256 receiver_lock_index
    ) internal updateRewardAndBalanceMdf(addrs[0], true) updateRewardAndBalanceMdf(addrs[1], true) returns (uint256,uint256) {

        // on transfer, call addrs[0] to verify sending is ok
        if (addrs[0].code.length > 0) {
            if (
                ILockReceiver(addrs[0]).beforeLockTransfer(addrs[0], addrs[1], sender_lock_index, "") 
                != 
                ILockReceiver.beforeLockTransfer.selector
            ) { revert BeforeLockTransferFailed(); }
        }
        
        // Get the stake and its index
        LockedStake memory senderStake = getLockedStake(addrs[0], sender_lock_index);

        // perform checks
        if (addrs[1] == address(0) || addrs[1] == addrs[0]) {
            revert InvalidReceiver();
        }
        if (block.timestamp >= senderStake.ending_timestamp || stakesUnlocked) {
            revert StakesUnlocked();
        }
        if (transfer_amount > senderStake.liquidity || transfer_amount == 0) {
            revert InvalidAmount();
        }

        // if sent amount was all the liquidity, delete the stake, otherwise decrease the balance
        if (transfer_amount == senderStake.liquidity) {
            // disable the stake
            _updateStake(addrs[0], sender_lock_index, 0, 0, 0, 0);
        } else {
            // otherwise, deduct the transfer amount from the stake
            lockedStakes[addrs[0]][sender_lock_index].liquidity -= transfer_amount;
        }

        // Update the liquidity for sender
        _updateLiqAmts(addrs[0], transfer_amount, false);

        /** if use_receiver_lock_index is true & the incoming stake wouldn't extend the receiver's stake
        *       - update the liquidity by transfer_amount
        *   else: 
        *       - If max stakes is reached:
        *           - look for an unused stake to update with new values
        *           - or if none available, revert
        *       - Otherwise, user has available stake capacity, so create a new lockedStake
        */
        if (
            use_receiver_lock_index
            && 
            senderStake.ending_timestamp <= lockedStakes[addrs[1]][receiver_lock_index].ending_timestamp
        ) {
            // Adjust the locked stake's liquidity by transfer_amount
            lockedStakes[addrs[1]][receiver_lock_index].liquidity += transfer_amount;
        } else {
            // if receiver would have too many stakes to create a new one, look for zeroed out stakes
            if (lockedStakes[addrs[1]].length == max_locked_stakes) {
                // look for unused stakes that were previously used but zeroed out by withdrawals or transfers
                (uint256 index, bool success) = _findUnusedStakeIndex(addrs[1]);
                
                // if no unused stake was found, revert
                if (!success) revert TooManyStakes();
                
                // set the index being used
                receiver_lock_index = index;
                
                // reuse the zeroed out stake to create this new locked stake
                _updateStake(
                    addrs[1], 
                    index, 
                    block.timestamp, 
                    transfer_amount, 
                    senderStake.ending_timestamp, 
                    senderStake.lock_multiplier
                );

            // otherwise, create a new locked stake
            } else {
                // create the new lockedStake
                receiver_lock_index = _createNewStake(
                    addrs[1], 
                    senderStake.start_timestamp, 
                    transfer_amount,
                    senderStake.ending_timestamp, 
                    senderStake.lock_multiplier
                );
            }
        }

        // update liquidity of the receiver
        _updateLiqAmts(addrs[1], transfer_amount, true);

        emit TransferLockedByIndex(
            addrs[0],
            addrs[1],
            transfer_amount,
            sender_lock_index,
            receiver_lock_index
        );

        // call the receiver with the destination lockedStake to verify receiving is ok
        if (addrs[1].code.length > 0) {
            if (
                ILockReceiver(addrs[1]).onLockReceived(addrs[0], addrs[1], receiver_lock_index, "") 
                != 
                ILockReceiver.onLockReceived.selector
            ) { revert OnLockReceivedFailed(); }
        }
        
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