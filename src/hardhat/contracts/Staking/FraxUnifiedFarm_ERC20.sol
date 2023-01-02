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
// ======================= FraxUnifiedFarm_ERC20 ======================
// ====================================================================
// For ERC20 Tokens
// Uses FraxUnifiedFarmTemplate.sol

/// @dev Testing for Lock Transferring performed in isolated repository: https://github.com/ZrowGz/frax-transfers.git

import "./FraxUnifiedFarmTemplate.sol";
import "./ILockReceiver.sol";

// -------------------- VARIES --------------------

// Convex wrappers
// import "../Curve/ICurvefrxETHETHPool.sol";
import "../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../Misc_AMOs/convex/IDepositToken.sol";
import "../Misc_AMOs/curve/I2pool.sol";
import "../Misc_AMOs/curve/I2poolToken.sol";

// Fraxlend
// import '../Fraxlend/IFraxlendPair.sol';

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

contract FraxUnifiedFarm_ERC20 is FraxUnifiedFarmTemplate {

    // use custom errors to reduce contract size
    error TransferLockNotAllowed(address spender, bytes32 kek_id);
    error StakesStillLocked();
    error InvalidReceiver();
    error InvalidAmount();
    error InsufficientAllowance();
    error WithdrawalsPaused();
    error StakingPaused();
    error MinimumStakeTimeNotMet();
    error TryingToLockForTooLong();
    error CannotShortenLockTime();
    error MustBeInTheFuture();
    error MustBePositive();
    error StakerNotFound();
    error CannotBeZero();
    error AllowanceIsZero();
    error InvalidChainlinkPrice();

    /* ========== STATE VARIABLES ========== */

    // -------------------- COMMON -------------------- 
    bool internal frax_is_token0;

    // -------------------- VARIES --------------------

    // Convex stkcvxFPIFRAX, stkcvxFRAXBP, etc
    IConvexStakingWrapperFrax public stakingToken;
    I2poolToken public curveToken;
    I2pool public curvePool;
    // ICurvefrxETHETHPool public curvePool;

    // Fraxswap
    // IFraxswapPair public stakingToken;

    // Fraxlend
    // IFraxlendPair public stakingToken;

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
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }


    /* ========== APPROVALS & ALLOWANCE FOR LOCK TRANSFERS ========== */
    // staker => kek_id => spender => uint256 (amount of lock that spender is approved for)
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public kekAllowance;
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
    FraxUnifiedFarmTemplate(_owner, _rewardTokens, _rewardManagers, _rewardRatesManual, _gaugeControllers, _rewardDistributors)
    {

        // -------------------- VARIES (USE CHILD FOR LOGIC) --------------------

        // Convex stkcvxFPIFRAX, stkcvxFRAXBP, etc
        // USE CHILD

        // Fraxlend
        // USE CHILD

        // Fraxswap
        // USE CHILD

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
        // USE CHILD

        // Convex Stable/FRAXBP
        // ============================================
        // USE CHILD

        // Convex Volatile/FRAXBP
        // ============================================
        // USE CHILD

        // Fraxlend
        // ============================================
        // USE CHILD

        // Fraxswap
        // ============================================
        // USE CHILD

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
        new_combined_weight = 0;
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

    function getStake(address account, bytes32 kek_id) external view returns (uint256 arr_idx) {
        (,arr_idx) = _getStake(account, kek_id);
    }

    // // All the locked stakes for a given account [old-school method]
    // function lockedStakesOfMultiArr(address account) external view returns (
    //     bytes32[] memory kek_ids,
    //     uint256[] memory start_timestamps,
    //     uint256[] memory liquidities,
    //     uint256[] memory ending_timestamps,
    //     uint256[] memory lock_multipliers
    // ) {
    //     for (uint256 i = 0; i < lockedStakes[account].length; i++){ 
    //         LockedStake memory thisStake = lockedStakes[account][i];
    //         kek_ids[i] = thisStake.kek_id;
    //         start_timestamps[i] = thisStake.start_timestamp;
    //         liquidities[i] = thisStake.liquidity;
    //         ending_timestamps[i] = thisStake.ending_timestamp;
    //         lock_multipliers[i] = thisStake.lock_multiplier;
    //     }
    // }

    /* =============== MUTATIVE FUNCTIONS =============== */

    // ------ STAKING ------

    function _updateLiqAmts(address staker_address, uint256 amt, bool is_add) internal {
        // Get the proxy address
        address the_proxy = staker_designated_proxies[staker_address];

        if (is_add) {
            // Update total liquidities
            _total_liquidity_locked += amt;
            _locked_liquidity[staker_address] += amt;

            // Update the proxy
            if (the_proxy != address(0)) proxy_lp_balances[the_proxy] += amt;
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

    function _getStake(address staker_address, bytes32 kek_id) internal view returns (LockedStake memory locked_stake, uint256 arr_idx) {
        for (uint256 i; i < lockedStakes[staker_address].length; i++){ 
            if (kek_id == lockedStakes[staker_address][i].kek_id){
                locked_stake = lockedStakes[staker_address][i];
                arr_idx = i;
                break;
            }
        }
        if (locked_stake.kek_id != kek_id) revert StakerNotFound();
    }

    // Add additional LPs to an existing locked stake
    function lockAdditional(bytes32 kek_id, uint256 addl_liq) nonReentrant updateRewardAndBalanceMdf(msg.sender, true) public {
        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(msg.sender, kek_id);

        // Calculate the new amount
        uint256 new_amt = thisStake.liquidity + addl_liq;

        // Checks
        if (addl_liq <= 0) revert MustBePositive();

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
        _updateLiqAmts(msg.sender, addl_liq, true);

        emit LockedAdditional(msg.sender, kek_id, addl_liq);
    }

    // Extends the lock of an existing stake
    function lockLonger(bytes32 kek_id, uint256 new_ending_ts) nonReentrant updateRewardAndBalanceMdf(msg.sender, true) public {
        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(msg.sender, kek_id);

        // Check
        // require(new_ending_ts > block.timestamp, "Must be in the future");
        if (new_ending_ts <= block.timestamp) revert MustBeInTheFuture();

        // Calculate some times
        uint256 time_left = (thisStake.ending_timestamp > block.timestamp) ? thisStake.ending_timestamp - block.timestamp : 0;
        uint256 new_secs = new_ending_ts - block.timestamp;

        // Checks
        // require(time_left > 0, "Already expired");
        if (new_secs <= time_left) revert CannotShortenLockTime();
        if (new_secs < lock_time_min) revert MinimumStakeTimeNotMet();
        if (new_secs > lock_time_for_max_multiplier) revert TryingToLockForTooLong();

        // Update the stake
        lockedStakes[msg.sender][theArrayIndex] = LockedStake(
            kek_id,
            block.timestamp,
            thisStake.liquidity,
            new_ending_ts,
            lockMultiplier(new_secs)
        );

        // Need to call to update the combined weights
        updateRewardAndBalance(msg.sender, false);

        emit LockedLonger(msg.sender, kek_id, new_secs, block.timestamp, new_ending_ts);
    }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for proxies)
    function stakeLocked(uint256 liquidity, uint256 secs) nonReentrant external returns (bytes32) {
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
    ) internal updateRewardAndBalanceMdf(staker_address, true) returns (bytes32) {
        if (stakingPaused) revert StakingPaused();
        if (secs < lock_time_min) revert MinimumStakeTimeNotMet();
        if (secs > lock_time_for_max_multiplier) revert TryingToLockForTooLong();

        // Pull in the required token(s)
        // Varies per farm
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);

        // Get the lock multiplier and kek_id
        uint256 lock_multiplier = lockMultiplier(secs);

        bytes32 kek_id = _createNewKekId(staker_address, start_timestamp, liquidity, (start_timestamp + secs), lock_multiplier);

        // Update liquidities
        _updateLiqAmts(staker_address, liquidity, true);

        emit StakeLocked(staker_address, liquidity, secs, kek_id, source_address);

        return kek_id;
    }

    // ------ WITHDRAWING ------

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for proxies)
    function withdrawLocked(bytes32 kek_id, address destination_address) nonReentrant external returns (uint256) {
        if (withdrawalsPaused == true) revert WithdrawalsPaused();
        return _withdrawLocked(msg.sender, destination_address, kek_id);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        bytes32 kek_id
    ) internal returns (uint256) {
        // Collect rewards first and then update the balances
        _getReward(staker_address, destination_address, true);

        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(staker_address, kek_id);
        if (!(thisStake.ending_timestamp >= block.timestamp || stakesUnlocked == true)) revert StakesStillLocked();
        uint256 liquidity = thisStake.liquidity;

        if (liquidity > 0) {

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            TransferHelper.safeTransfer(address(stakingToken), destination_address, liquidity);

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Update liquidities
            _updateLiqAmts(staker_address, liquidity, false);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }

        return liquidity;
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Do nothing
    }

    /* ========== LOCK TRANSFER & AUTHORIZATIONS - Approvals, Functions, Errors, & Events ========== */

    // Approve `spender` to transfer `kek_id` on behalf of `owner`
    function setAllowance(address spender, bytes32 kek_id, uint256 amount) external {
        if (kekAllowance[msg.sender][kek_id][spender] >= 0) revert CannotBeZero();
        kekAllowance[msg.sender][kek_id][spender] = amount;
        emit Approval(msg.sender, spender, kek_id, amount);
    }

    function increaseAllowance(address spender, bytes32 kek_id, uint256 amount) external {
        if (kekAllowance[msg.sender][kek_id][spender] <= 0) revert AllowanceIsZero();
        kekAllowance[msg.sender][kek_id][spender] += amount;
        emit Approval(msg.sender, spender, kek_id, kekAllowance[msg.sender][kek_id][spender]);
    }

    // Revoke approval for a single kek_id
    function removeAllowance(address spender, bytes32 kek_id) external {
        kekAllowance[msg.sender][kek_id][spender] = 0;
        emit Approval(msg.sender, spender, kek_id, 0);
    }

    // Approve or revoke `spender` to transfer any/all locks on behalf of the owner
    function setApprovalForAll(address spender, bool approved) external {
        spenderApprovalForAllLocks[msg.sender][spender] = approved; 
        emit ApprovalForAll(msg.sender, spender, approved);
    }

    // internal approval check and allowance manager
    function isApproved(address staker, bytes32 kek_id, uint256 amount) public view returns (bool) {
        // check if spender is approved for all `staker` locks
        if (spenderApprovalForAllLocks[staker][msg.sender]) {
            return true;
        } else if (kekAllowance[staker][kek_id][msg.sender] >= amount) {
            return true;
        } else {
            // for any other possibility, return false
            return false;
        }
    }

    function _spendAllowance(address staker, bytes32 kek_id, uint256 amount) internal {
            if (kekAllowance[staker][kek_id][msg.sender] == amount) {
                kekAllowance[staker][kek_id][msg.sender] = 0;
            } else if (kekAllowance[staker][kek_id][msg.sender] > amount) {
                kekAllowance[staker][kek_id][msg.sender] -= amount;
            } else {
                revert InsufficientAllowance();
            }
    }

    ///// Transfer Locks
    /// @dev called by the spender to transfer a lock position on behalf of the staker
    /// @notice Transfer's `sender_address`'s lock with `kek_id` to `destination_address` by authorized spender
    function transferLockedFrom(
        address sender_address,
        address receiver_address,
        bytes32 source_kek_id,
        uint256 transfer_amount,
        bytes32 destination_kek_id
    ) external nonReentrant returns (bytes32, bytes32) {
        // check approvals
        if (!isApproved(sender_address, source_kek_id, transfer_amount)) revert TransferLockNotAllowed(msg.sender, source_kek_id);

        // adjust the allowance down
        _spendAllowance(sender_address, source_kek_id, transfer_amount);

        // do the transfer
        /// @dev the approval check is done in modifier, so to reach here caller is permitted, thus OK 
        //       to supply both staker & receiver here (no msg.sender)
        return(_safeTransferLocked(sender_address, receiver_address, source_kek_id, transfer_amount, destination_kek_id));
    }

    // called by the staker to transfer a lock position to another address
    /// @notice Transfer's `amount` of `sender_address`'s lock with `kek_id` to `destination_address`
    function transferLocked(
        address receiver_address,
        bytes32 source_kek_id,
        uint256 transfer_amount,
        bytes32 destination_kek_id
    ) external nonReentrant returns (bytes32, bytes32) {
        // do the transfer
        /// @dev approval/owner check not needed here as msg.sender is the staker
        return(_safeTransferLocked(msg.sender, receiver_address, source_kek_id, transfer_amount, destination_kek_id));
    }

    // executes the transfer
    function _safeTransferLocked(
        address sender_address,
        address receiver_address,
        bytes32 source_kek_id,
        uint256 transfer_amount,
        bytes32 destination_kek_id
    ) internal updateRewardAndBalanceMdf(sender_address, true) updateRewardAndBalanceMdf(receiver_address, true) returns (bytes32, bytes32) { // TODO should this also update receiver? updateRewardAndBalanceMdf(receiver_address, true)
        // on transfer, call sender_address to verify sending is ok
        if (sender_address.code.length > 0) {
            require(
                ILockReceiver(sender_address).beforeLockTransfer(sender_address, receiver_address, source_kek_id, "") 
                == 
                ILockReceiver.beforeLockTransfer.selector // 00x4fb07105 <--> bytes4(keccak256("beforeLockTransfer(address,address,bytes32,bytes)"))
            );
        }

        // Get the stake and its index
        (LockedStake memory senderStake, uint256 senderArrayIndex) = _getStake(
            sender_address,
            source_kek_id
        );

        // perform checks
        if (receiver_address == address(0) || receiver_address == sender_address) {
            revert InvalidReceiver();
        }
        if (!(senderStake.ending_timestamp >= block.timestamp || stakesUnlocked == true)) revert StakesStillLocked();
        if (transfer_amount > senderStake.liquidity || transfer_amount <= 0) {
            revert InvalidAmount();
        }

        // Update the liquidities
        _locked_liquidity[sender_address] -= transfer_amount;
        _locked_liquidity[receiver_address] += transfer_amount;
        
            //address the_proxy = getProxyFor(sender_address);
        if (getProxyFor(sender_address) != address(0)) {
                proxy_lp_balances[getProxyFor(sender_address)] -= transfer_amount;
        }
        
            //address the_proxy = getProxyFor(receiver_address);
        if (getProxyFor(receiver_address) != address(0)) {
                proxy_lp_balances[getProxyFor(receiver_address)] += transfer_amount;
        }

        // if sent amount was all the liquidity, delete the stake, otherwise decrease the balance
        if (transfer_amount == senderStake.liquidity) {
            delete lockedStakes[sender_address][senderArrayIndex];
        } else {
            lockedStakes[sender_address][senderArrayIndex].liquidity -= transfer_amount;
        }

        // if destination kek is 0, create a new kek_id, otherwise update the balances & ending timestamp (longer of the two)
        if (destination_kek_id == bytes32(0)) {
            // create the new kek_id
            destination_kek_id = _createNewKekId(receiver_address, senderStake.start_timestamp, transfer_amount, senderStake.ending_timestamp, senderStake.lock_multiplier);          
        } else {
            /// Update the existing lock

            // get the target (checks that it actually exists for the receiver)
            (LockedStake memory receiverStake, uint256 receiverArrayIndex) = _getStake(
                receiver_address,
                destination_kek_id
            );

            // Update the existing staker's stake
            lockedStakes[receiver_address][receiverArrayIndex].liquidity += transfer_amount;

            // check & update ending timestamp to whichever is farthest out
            if (receiverStake.ending_timestamp < senderStake.ending_timestamp) {
                // update the lock expiration to the later timestamp
                lockedStakes[receiver_address][receiverArrayIndex].ending_timestamp = senderStake.ending_timestamp;
                // update the lock multiplier since we are effectively extending the lock
                lockedStakes[receiver_address][receiverArrayIndex].lock_multiplier = lockMultiplier(senderStake.ending_timestamp - block.timestamp);
            }
        }

        // Need to call again to make sure everything is correct
        updateRewardAndBalance(sender_address, true); 
        updateRewardAndBalance(receiver_address, true);

        emit TransferLocked(
            sender_address,
            receiver_address,
            transfer_amount,
            source_kek_id,
            destination_kek_id
        );

        // call the receiver with the destination kek_id to verify receiving is ok
        if (ILockReceiver(receiver_address).onLockReceived(
            sender_address, 
            receiver_address, 
            destination_kek_id, 
            ""
        ) != ILockReceiver.onLockReceived.selector) revert InvalidReceiver(); //0xc42d8b95) revert InvalidReceiver();

        return (source_kek_id, destination_kek_id);
    }

    function _createNewKekId(
        address staker_address,
        uint256 start_timestamp,
        uint256 liquidity,
        uint256 ending_timestamp,
        uint256 lock_multiplier
    ) internal returns (bytes32 kek_id) {
        kek_id = keccak256(abi.encodePacked(
            staker_address, 
            start_timestamp, 
            liquidity, 
            _locked_liquidity[staker_address]
        ));
        
        // Create the locked stake
        lockedStakes[staker_address].push(LockedStake(
            kek_id,
            start_timestamp,
            liquidity,
            ending_timestamp,
            lock_multiplier
        ));
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    // Inherited...

    /* ========== EVENTS ========== */
    event LockedAdditional(address indexed user, bytes32 kek_id, uint256 amount);
    event LockedLonger(address indexed user, bytes32 kek_id, uint256 new_secs, uint256 new_start_ts, uint256 new_end_ts);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, bytes32 kek_id, address destination_address);
    event TransferLocked(address indexed sender_address, address indexed destination_address, uint256 amount_transferred, bytes32 source_kek_id, bytes32 destination_kek_id);
    event Approval(address indexed staker, address indexed spender, bytes32 indexed kek_id, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed spender, bool approved);
}

