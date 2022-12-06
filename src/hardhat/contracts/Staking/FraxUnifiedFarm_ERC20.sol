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

import "./FraxUnifiedFarmTemplate.sol";

// -------------------- VARIES --------------------

// Convex wrappers
// import "../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
// import "../Misc_AMOs/convex/IDepositToken.sol";
// import "../Misc_AMOs/curve/I2pool.sol";
// import "../Misc_AMOs/curve/I2poolToken.sol";

// Fraxswap
import '../Fraxswap/core/interfaces/IFraxswapPair.sol';

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

    /* ========== STATE VARIABLES ========== */

    // -------------------- COMMON -------------------- 
    bool internal frax_is_token0;

    // -------------------- VARIES --------------------

    // Convex stkcvxFPIFRAX, stkcvxFRAXBP, etc
    // IConvexStakingWrapperFrax public stakingToken;
    // I2poolToken public curveToken;
    // I2pool public curvePool;

    // Fraxswap
    IFraxswapPair public stakingToken;

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

        // -------------------- VARIES --------------------

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

    // ------ LOCK RELATED ------

    // All the locked stakes for a given account
    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    // Returns the length of the locked stakes for a given account
    function lockedStakesOfLength(address account) external view returns (uint256) {
        return lockedStakes[account].length;
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

    function _getStake(address staker_address, bytes32 kek_id) internal view returns (LockedStake memory locked_stake, uint256 arr_idx) {
        for (uint256 i = 0; i < lockedStakes[staker_address].length; i++){ 
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
        _total_liquidity_locked += addl_liq;
        _locked_liquidity[msg.sender] += addl_liq;
        {
            address the_proxy = getProxyFor(msg.sender);
            if (the_proxy != address(0)) proxy_lp_balances[the_proxy] += addl_liq;
        }

        // Need to call to update the combined weights
        updateRewardAndBalance(msg.sender, false);

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
        _total_liquidity_locked += liquidity;
        _locked_liquidity[staker_address] += liquidity;
        {
            address the_proxy = getProxyFor(staker_address);
            if (the_proxy != address(0)) proxy_lp_balances[the_proxy] += liquidity;
        }
        
        // Need to call again to make sure everything is correct
        updateRewardAndBalance(staker_address, false);

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
        // require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true, "Stake is still locked!");
        // the stake must still be locked to transfer
        if (block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true) {
            revert StakesUnlocked();
        }
        uint256 liquidity = thisStake.liquidity;

        if (liquidity > 0) {

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            TransferHelper.safeTransfer(address(stakingToken), destination_address, liquidity);

            // Update liquidities
            _total_liquidity_locked -= liquidity;
            _locked_liquidity[staker_address] -= liquidity;
            {
                address the_proxy = getProxyFor(staker_address);
                if (the_proxy != address(0)) proxy_lp_balances[the_proxy] -= liquidity;
            }

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Need to call again to make sure everything is correct
            updateRewardAndBalance(staker_address, false);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }

        return liquidity;
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Do nothing
    }

    /* ========== LOCK TRANSFER & AUTHORIZATIONS - Approvals, Functions, Errors, & Events ========== */

    // storage vars for lock transfer approvals
    // staker => kek_id => spender => uint256 (amount of lock that spender is approved for)
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public kekAllowance;
    // staker => spender => bool (true if approved)
    mapping(address => mapping(address => bool)) public spenderApprovalForAllLocks;

    // use custom errors to reduce contract size
    error TransferLockNotAllowed(address spender, bytes32 kek_id);
    error StakesUnlocked();
    error InvalidReceiver();
    error InvalidAmount();
    error InsufficientAllowance();

    // custom errors for other preexisting functions to reduce contract size
    error WithdrawalsPaused();
    error StakingPaused();
    error MinimumStakeTimeNotMet();
    error TryingToLockForTooLong();
    error CannotShortenLockTime();
    error MustBeInTheFuture();
    error MustBePositive();
    error StakerNotFound();

    event TransferLocked(address indexed staker_address, address indexed destination_address, uint256 amount_transferred, bytes32 source_kek_id, bytes32 destination_kek_id);
    event Approval(address indexed staker, address indexed spender, bytes32 indexed kek_id, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed spender, bool approved);

    // Approve `spender` to transfer `kek_id` on behalf of `owner`
    function setAllowance(address spender, bytes32 kek_id, uint256 amount) external {
        kekAllowance[msg.sender][kek_id][spender] = amount;
        emit Approval(msg.sender, spender, kek_id, amount);
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

    function _spendAllowance(address staker, bytes32 kek_id, uint256 amount) internal {//returns (uint256 spendable_amount) {
            if (kekAllowance[staker][kek_id][msg.sender] == amount) {
                kekAllowance[staker][kek_id][msg.sender] = 0;
                //return amount;
            } else if (kekAllowance[staker][kek_id][msg.sender] > amount) {
                kekAllowance[staker][kek_id][msg.sender] -= amount;
                //return amount;
            // } else if (kekAllowance[staker][kek_id][msg.sender] < amount && kekAllowance[staker][kek_id][msg.sender] > 0) {
            //     spendable_amount = kekAllowance[staker][kek_id][msg.sender];
            //     kekAllowance[staker][kek_id][msg.sender] = 0;
            } else {
                revert InsufficientAllowance();
            }
    }

    ///// Transfer Locks
    /// @dev called by the spender to transfer a lock position on behalf of the staker
    /// @notice Transfer's `staker_address`'s lock with `kek_id` to `destination_address` by authorized spender
    function transferLockedFrom(
        address staker_address,
        address receiver_address,
        bytes32 source_kek_id,
        uint256 transfer_amount,
        bytes32 destination_kek_id
    ) external nonReentrant returns (bytes32) {
        // check approvals
        if (!isApproved(staker_address, source_kek_id, transfer_amount)) revert TransferLockNotAllowed(msg.sender, source_kek_id);

        // adjust the allowance down
        _spendAllowance(staker_address, source_kek_id, transfer_amount);

        // do the transfer
        /// @dev the approval check is done in modifier, so to reach here caller is permitted, thus OK 
        //       to supply both staker & receiver here (no msg.sender)
        _safeTransferLocked(staker_address, receiver_address, source_kek_id, transfer_amount, destination_kek_id);
    }

    // called by the staker to transfer a lock position to another address
    /// @notice Transfer's `amount` of `staker_address`'s lock with `kek_id` to `destination_address`
    function transferLocked(
        address receiver_address,
        bytes32 source_kek_id,
        uint256 transfer_amount,
        bytes32 destination_kek_id
    ) external nonReentrant returns (bytes32) {
        // do the transfer
        /// @dev approval/owner check not needed here as msg.sender is the staker
        _safeTransferLocked(msg.sender, receiver_address, source_kek_id, transfer_amount, destination_kek_id);
    }

    // executes the transfer
    function _safeTransferLocked(
        address staker_address,
        address receiver_address,
        bytes32 source_kek_id,
        uint256 transfer_amount,
        bytes32 destination_kek_id
    ) internal updateRewardAndBalanceMdf(staker_address, true) updateRewardAndBalanceMdf(receiver_address, true) returns (bytes32, bytes32) { // TODO should this also update receiver? updateRewardAndBalanceMdf(receiver_address, true)
        // on transfer, call staker_address to verify sending is ok
        if (staker_address.code.length > 0) {
            require(
                ILockTransfers(staker_address).beforeLockTransfer(staker_address, receiver_address, source_kek_id, "") 
                == 
                ILockTransfers(staker_address).beforeLockTransfer.selector // 0x4fb07105
            );
        }

        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(
            staker_address,
            source_kek_id
        );

        // perform checks
        if (receiver_address == address(0) || receiver_address == staker_address) {
            revert InvalidReceiver();
        }
        if (block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true) {
            revert StakesUnlocked();
        }
        if (transfer_amount > thisStake.liquidity || transfer_amount <= 0) {
            revert InvalidAmount();
        }

        // Update the liquidities
        _locked_liquidity[staker_address] -= transfer_amount;
        _locked_liquidity[receiver_address] += transfer_amount;
        {
            address the_proxy = getProxyFor(staker_address);
            if (the_proxy != address(0))
                proxy_lp_balances[the_proxy] -= transfer_amount;
        }
        {
            address the_proxy = getProxyFor(receiver_address);
            if (the_proxy != address(0))
                proxy_lp_balances[the_proxy] += transfer_amount;
        }

        // if sent amount was all the liquidity, delete the stake, otherwise decrease the balance
        if (transfer_amount == thisStake.liquidity) {
            delete lockedStakes[staker_address][theArrayIndex];
        } else {
            lockedStakes[staker_address][theArrayIndex].liquidity -= transfer_amount;
        }

        // if destination kek is 0, create a new kek_id, otherwise update the balances & ending timestamp (longer of the two)
        if (destination_kek_id == bytes32(0)) {
            // create the new kek_id
            destination_kek_id = _createNewKekId(staker_address, thisStake.start_timestamp, transfer_amount, thisStake.ending_timestamp, thisStake.lock_multiplier);
            
        } else {
            // get the target 
            (LockedStake memory thisStake2, uint256 theArrayIndex2) = _getStake(
                receiver_address,
                destination_kek_id
            );

            // verify that this checks that the user has a locked stake here, if not, create a new one anyways
            /// TODO the check for whether a user stake exists is in the _getStake function, so this step might not be necessary?
            if (lockedStakes[receiver_address][theArrayIndex2].liquidity == 0) {
                destination_kek_id = _createNewKekId(staker_address, thisStake.start_timestamp, transfer_amount, thisStake.ending_timestamp, thisStake.lock_multiplier);

            } else {
                // Otherwise, it exists & has liquidity, so we can use that to keep stakes consolidated 
                // Update the existing staker's stake
                lockedStakes[receiver_address][theArrayIndex2].liquidity += transfer_amount;

                // check & update ending timestamp to whichever is farthest out
                if (thisStake2.ending_timestamp < thisStake.ending_timestamp) {
                    lockedStakes[receiver_address][theArrayIndex2].ending_timestamp = thisStake.ending_timestamp;
                }
            }
        }

        // Need to call again to make sure everything is correct
        updateRewardAndBalance(staker_address, true); 
        updateRewardAndBalance(receiver_address, true);

        emit TransferLocked(
            staker_address,
            receiver_address,
            transfer_amount,
            source_kek_id,
            destination_kek_id
        );

        // call the receiver with the destination kek_id to verify receiving is ok
        require(_checkOnLockReceived(staker_address, receiver_address, destination_kek_id, ""));

        return (source_kek_id, destination_kek_id);
    }

    function _createNewKekId(
        address staker_address,
        uint256 start_timestamp,
        uint256 liquidity,
        uint256 ending_timestamp,
        uint256 lock_multiplier
    ) internal returns (bytes32 kek_id) {
        kek_id = keccak256(abi.encodePacked(staker_address, start_timestamp, liquidity, _locked_liquidity[staker_address]));
        
        // Create the locked stake
        lockedStakes[staker_address].push(LockedStake(
            kek_id,
            start_timestamp,
            liquidity,
            ending_timestamp,
            lock_multiplier
        ));
    }

    function _checkOnLockReceived(address from, address to, bytes32 kek_id, bytes memory data)
        internal returns (bool)
    {
        if (to.code.length > 0) {
            try ILockTransfers(to).onLockReceived(msg.sender, from, kek_id, data) returns (bytes4 retval) {
                return retval == ILockTransfers(to).onLockReceived.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert InvalidReceiver();
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    // Inherited...

    /* ========== EVENTS ========== */
    event LockedAdditional(address indexed user, bytes32 kek_id, uint256 amount);
    event LockedLonger(address indexed user, bytes32 kek_id, uint256 new_secs, uint256 new_start_ts, uint256 new_end_ts);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, bytes32 kek_id, address destination_address);
}

interface ILockTransfers {
    function beforeLockTransfer(address operator, address from, bytes32 kek_id, bytes calldata data) external returns (bytes4);
    function onLockReceived(address operator, address from, bytes32 kek_id, bytes memory data) external returns (bytes4);

}