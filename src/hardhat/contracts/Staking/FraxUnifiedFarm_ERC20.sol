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
// ======================= FraxUnifiedFarm_ERC20 ======================
// ====================================================================
// For ERC20 Tokens
// Uses FraxUnifiedFarmTemplate.sol

import "./FraxUnifiedFarmTemplate.sol";

// -------------------- VARIES --------------------

// G-UNI
// import "../Misc_AMOs/gelato/IGUniPool.sol";

// mStable
// import '../Misc_AMOs/mstable/IFeederPool.sol';

// StakeDAO sdETH-FraxPut
// import '../Misc_AMOs/stakedao/IOpynPerpVault.sol';

// StakeDAO Vault
// import '../Misc_AMOs/stakedao/IStakeDaoVault.sol';

// Uniswap V2
import '../Uniswap/Interfaces/IUniswapV2Pair.sol';

// Vesper
// import '../Misc_AMOs/vesper/IVPool.sol';

// ------------------------------------------------

contract FraxUnifiedFarm_ERC20 is FraxUnifiedFarmTemplate {

    /* ========== STATE VARIABLES ========== */

    // -------------------- VARIES --------------------

    // G-UNI
    // IGUniPool public stakingToken;
    
    // mStable
    // IFeederPool public stakingToken;

    // sdETH-FraxPut Vault
    // IOpynPerpVault public stakingToken;

    // StakeDAO Vault
    // IStakeDaoVault public stakingToken;

    // Uniswap V2
    IUniswapV2Pair public stakingToken;

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
        // G-UNI
        // stakingToken = IGUniPool(_stakingToken);
        // address token0 = address(stakingToken.token0());
        // frax_is_token0 = token0 == frax_address;

        // mStable
        // stakingToken = IFeederPool(_stakingToken);

        // StakeDAO sdETH-FraxPut Vault
        // stakingToken = IOpynPerpVault(_stakingToken);

        // StakeDAO Vault
        // stakingToken = IStakeDaoVault(_stakingToken);

        // Uniswap V2
        stakingToken = IUniswapV2Pair(_stakingToken);
        address token0 = stakingToken.token0();
        if (token0 == frax_address) frax_is_token0 = true;
        else frax_is_token0 = false;

        // Vesper
        // stakingToken = IVPool(_stakingToken);
    }

    /* ============= VIEWS ============= */

    // ------ FRAX RELATED ------

    function fraxPerLPToken() public view override returns (uint256) {
        // Get the amount of FRAX 'inside' of the lp tokens
        uint256 frax_per_lp_token;

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
        {
            uint256 total_frax_reserves;
            (uint256 reserve0, uint256 reserve1, ) = (stakingToken.getReserves());
            if (frax_is_token0) total_frax_reserves = reserve0;
            else total_frax_reserves = reserve1;

            frax_per_lp_token = (total_frax_reserves * 1e18) / stakingToken.totalSupply();
        }

        // Vesper
        // ============================================
        // frax_per_lp_token = stakingToken.pricePerShare();

        return frax_per_lp_token;
    }

    // ------ LIQUIDITY AND WEIGHTS ------

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
        if (_locked_liquidity[account] == 0 && _combined_weights[account] == 0) {
            // This is only called for the first stake to make sure the veFXS multiplier is not cut in half
            midpoint_vefxs_multiplier = new_vefxs_multiplier;
        }
        else {
            midpoint_vefxs_multiplier = (new_vefxs_multiplier + _vefxsMultiplierStored[account]) / 2;
        }

        // Loop through the locked stakes, first by getting the liquidity * lock_multiplier portion
        new_combined_weight = 0;
        for (uint256 i = 0; i < lockedStakes[account].length; i++) {
            LockedStake memory thisStake = lockedStakes[account][i];
            uint256 lock_multiplier = thisStake.lock_multiplier;

            // If the lock is expired
            if (thisStake.ending_timestamp <= block.timestamp) {
                // If the lock expired in the time since the last claim, the weight needs to be proportionately averaged this time
                if (lastRewardClaimTime[account] < thisStake.ending_timestamp){
                    uint256 time_before_expiry = thisStake.ending_timestamp - lastRewardClaimTime[account];
                    uint256 time_after_expiry = block.timestamp - thisStake.ending_timestamp;

                    // Get the weighted-average lock_multiplier
                    uint256 numerator = (lock_multiplier * time_before_expiry) + (MULTIPLIER_PRECISION * time_after_expiry);
                    lock_multiplier = numerator / (time_before_expiry + time_after_expiry);
                }
                // Otherwise, it needs to just be 1x
                else {
                    lock_multiplier = MULTIPLIER_PRECISION;
                }
            }

            uint256 liquidity = thisStake.liquidity;
            uint256 combined_boosted_amount = (liquidity * (lock_multiplier + midpoint_vefxs_multiplier)) / MULTIPLIER_PRECISION;
            new_combined_weight = new_combined_weight + combined_boosted_amount;
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
        require(locked_stake.kek_id == kek_id, "Stake not found");
        
    }

    // Add additional LPs to an existing locked stake
    function lockAdditional(bytes32 kek_id, uint256 addl_liq) updateRewardAndBalance(msg.sender, true) public {
        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(msg.sender, kek_id);

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
        {
            address the_proxy = getProxyFor(msg.sender);
            if (the_proxy != address(0)) proxy_lp_balances[the_proxy] += addl_liq;
        }

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false);
    }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stakeLocked(uint256 liquidity, uint256 secs) nonReentrant external {
        _stakeLocked(msg.sender, msg.sender, liquidity, secs, block.timestamp);
    }

    function _stakeLockedInternalLogic(
        address source_address,
        uint256 liquidity
    ) internal virtual {
        revert("Need _stakeLockedInternalLogic logic");
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
        require(stakingPaused == false || valid_migrators[msg.sender] == true, "Staking paused or in migration");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier,"Trying to lock for too long");

        // Pull in the required token(s)
        // Varies per farm
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);

        // Get the lock multiplier and kek_id
        uint256 lock_multiplier = lockMultiplier(secs);
        bytes32 kek_id = keccak256(abi.encodePacked(staker_address, start_timestamp, liquidity, _locked_liquidity[staker_address]));
        
        // Create the locked stake
        lockedStakes[staker_address].push(LockedStake(
            kek_id,
            start_timestamp,
            liquidity,
            start_timestamp + secs,
            lock_multiplier
        ));

        // Update liquidities
        _total_liquidity_locked += liquidity;
        _locked_liquidity[staker_address] += liquidity;
        {
            address the_proxy = getProxyFor(staker_address);
            if (the_proxy != address(0)) proxy_lp_balances[the_proxy] += liquidity;
        }
        
        // Need to call again to make sure everything is correct
        _updateRewardAndBalance(staker_address, false);

        emit StakeLocked(staker_address, liquidity, secs, kek_id, source_address);
    }

    // ------ WITHDRAWING ------

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kek_id, address destination_address) nonReentrant external {
        require(withdrawalsPaused == false, "Withdrawals paused");
        _withdrawLocked(msg.sender, destination_address, kek_id);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like migrator_withdraw_locked() and withdrawLocked()
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        bytes32 kek_id
    ) internal {
        // Collect rewards first and then update the balances
        _getReward(staker_address, destination_address);

        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(staker_address, kek_id);
        require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true || valid_migrators[msg.sender] == true, "Stake is still locked!");
        uint256 liquidity = thisStake.liquidity;

        if (liquidity > 0) {
            // Update liquidities
            _total_liquidity_locked = _total_liquidity_locked - liquidity;
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address] - liquidity;
            {
                address the_proxy = getProxyFor(staker_address);
                if (the_proxy != address(0)) proxy_lp_balances[the_proxy] -= liquidity;
            }

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            stakingToken.transfer(destination_address, liquidity);

            // Need to call again to make sure everything is correct
            _updateRewardAndBalance(staker_address, false);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }
    }


    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Do nothing
    }

     /* ========== RESTRICTED FUNCTIONS - Curator / migrator callable ========== */

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can). 
    function migrator_stakeLocked_for(address staker_address, uint256 amount, uint256 secs, uint256 start_timestamp) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _stakeLocked(staker_address, msg.sender, amount, secs, start_timestamp);
    }

    // Used for migrations
    function migrator_withdraw_locked(address staker_address, bytes32 kek_id) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _withdrawLocked(staker_address, msg.sender, kek_id);
    }
    
    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    // Inherited...

    /* ========== EVENTS ========== */

    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, bytes32 kek_id, address destination_address);
}
