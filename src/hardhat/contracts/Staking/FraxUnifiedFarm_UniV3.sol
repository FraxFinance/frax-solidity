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
// ======================= FraxUnifiedFarm_UniV3 ======================
// ====================================================================
// For UniV3
// Uses FraxUnifiedFarmTemplate.sol

import "./FraxUnifiedFarmTemplate.sol";
import "../Oracle/ComboOracle_UniV2_UniV3.sol";

contract FraxUnifiedFarm_UniV3 is FraxUnifiedFarmTemplate {

    /* ========== STATE VARIABLES ========== */

    // Uniswap V3 related
    INonfungiblePositionManager private stakingTokenNFT = INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88); // UniV3 uses an NFT
    IUniswapV3Pool private lp_pool;
    int24 public uni_tick_lower;
    int24 public uni_tick_upper;
    int24 public ideal_tick;
    uint24 public uni_required_fee;
    address public uni_token0;
    address public uni_token1;
    // uint32 public twap_duration = 300; // 5 minutes

    // Single NFT related
    uint256 public main_nft_token_id;

    // Combo Oracle related
    ComboOracle_UniV2_UniV3 private comboOracleUniV2UniV3 = ComboOracle_UniV2_UniV3(0xD13c9a29eF6c5ADc7b43BBd5854B07bB9b099862);

    // Stake tracking
    mapping(address => LockedNFT[]) private lockedNFTs;


    /* ========== STRUCTS ========== */

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
    
    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _stakingToken,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRatesManual,
        address[] memory _gaugeControllers,
        address _lp_pool_address,
        int24[] memory ticks
    ) 
    FraxUnifiedFarmTemplate(_owner, _rewardTokens, _rewardManagers, _rewardRatesManual, _gaugeControllers)
    {
        lp_pool = IUniswapV3Pool(_lp_pool_address); // call getPool(token0, token1, fee) on the Uniswap V3 Factory (0x1F98431c8aD98523631AE4a59f267346ea31F984) to get this otherwise

        // Set the UniV3 addresses
        uni_token0 = lp_pool.token0();
        uni_token1 = lp_pool.token1();

        // Check where FRAX is
        if (uni_token0 == frax_address) frax_is_token0 = true;

        // Fee, Tick, and Liquidity related
        uni_required_fee = lp_pool.fee();
        uni_tick_lower = ticks[0];
        uni_tick_upper = ticks[1];
        
        // Closest tick to 1
        ideal_tick = ticks[2];
    }

    /* ============= VIEWS ============= */

    // ------ FRAX RELATED ------

    function fraxPerLPToken() public view override returns (uint256) {
        ComboOracle_UniV2_UniV3.UniV3NFTBasicInfo memory NFTBasicInfo = comboOracleUniV2UniV3.getUniV3NFTBasicInfo(main_nft_token_id);
        ComboOracle_UniV2_UniV3.UniV3NFTValueInfo memory NFTValueInfo = comboOracleUniV2UniV3.getUniV3NFTValueInfo(main_nft_token_id);

        if (frax_is_token0) {
            return (NFTValueInfo.token0_value * MULTIPLIER_PRECISION) / NFTBasicInfo.liquidity;
        }
        else {
            return (NFTValueInfo.token1_value * MULTIPLIER_PRECISION) / NFTBasicInfo.liquidity;
        }
    }

    // ------ UNI-V3 RELATED ------

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

    // ------ ERC721 RELATED ------

    // Needed to indicate that this contract is ERC721 compatible
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ------ LIQUIDITY AND WEIGHTS ------

    // Calculated the combined weight for an account
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
        for (uint256 i = 0; i < lockedNFTs[account].length; i++) {
            LockedNFT memory thisNFT = lockedNFTs[account][i];
            uint256 lock_multiplier = thisNFT.lock_multiplier;

            // If the lock is expired
            if (thisNFT.ending_timestamp <= block.timestamp) {
                // If the lock expired in the time since the last claim, the weight needs to be proportionately averaged this time
                if (lastRewardClaimTime[account] < thisNFT.ending_timestamp){
                    uint256 time_before_expiry = thisNFT.ending_timestamp - lastRewardClaimTime[account];
                    uint256 time_after_expiry = block.timestamp - thisNFT.ending_timestamp;

                    // Get the weighted-average lock_multiplier
                    uint256 numerator = (lock_multiplier * time_before_expiry) + (MULTIPLIER_PRECISION * time_after_expiry);
                    lock_multiplier = numerator / (time_before_expiry + time_after_expiry);
                }
                // Otherwise, it needs to just be 1x
                else {
                    lock_multiplier = MULTIPLIER_PRECISION;
                }
            }

            uint256 liquidity = thisNFT.liquidity;
            uint256 combined_boosted_amount = (liquidity * (lock_multiplier + midpoint_vefxs_multiplier)) / MULTIPLIER_PRECISION;
            new_combined_weight = new_combined_weight + combined_boosted_amount;
        }
    }

    // ------ LOCK RELATED ------

    // Return all of the locked NFT positions
    function lockedNFTsOf(address account) external view returns (LockedNFT[] memory) {
        return lockedNFTs[account];
    }

    // All the locked stakes for a given account [old-school method]
    function lockedNFTsOfMultiArr(address account) external view returns (
        uint256[] memory token_ids,
        uint256[] memory start_timestamps,
        uint256[] memory liquidities,
        uint256[] memory ending_timestamps,
        uint256[] memory lock_multipliers,
        int24[] memory tick_lowers,
        int24[] memory tick_uppers
    ) {
        for (uint256 i = 0; i < lockedNFTs[account].length; i++){ 
            LockedNFT memory thisNFT = lockedNFTs[account][i];
            token_ids[i] = thisNFT.token_id;
            start_timestamps[i] = thisNFT.start_timestamp;
            liquidities[i] = thisNFT.liquidity;
            ending_timestamps[i] = thisNFT.ending_timestamp;
            lock_multipliers[i] = thisNFT.lock_multiplier;
            tick_lowers[i] = thisNFT.tick_lower;
            tick_uppers[i] = thisNFT.tick_upper;
        }
    }

    // Returns the length of the locked NFTs for a given account
    function lockedNFTsOfLength(address account) external view returns (uint256) {
        return lockedNFTs[account].length;
    }

    /* =============== MUTATIVE FUNCTIONS =============== */

    // ------ STAKING ------

    function _getStake(address staker_address, uint256 token_id) internal view returns (LockedNFT memory locked_nft, uint256 arr_idx) {
        for (uint256 i = 0; i < lockedNFTs[staker_address].length; i++){ 
            if (token_id == lockedNFTs[staker_address][i].token_id){
                locked_nft = lockedNFTs[staker_address][i];
                arr_idx = i;
                break;
            }
        }
        require(locked_nft.token_id == token_id, "Stake not found");
        
    }

    // Extends the lock of an existing stake
    function extendLockTime(uint256 token_id, uint256 new_ending_ts) updateRewardAndBalance(msg.sender, true) public {
        // Get the stake and its index
        (LockedNFT memory thisNFT, uint256 theArrayIndex) = _getStake(msg.sender, token_id);

        // Check 
        require(new_ending_ts > block.timestamp, "Must be in the future");
        require(new_ending_ts > thisNFT.ending_timestamp, "Cannot shorten lock time");

        // Calculate the new seconds
        uint256 new_secs = new_ending_ts - block.timestamp;

        // Checks
        require(new_secs >= lock_time_min, "Minimum stake time not met");
        require(new_secs <= lock_time_for_max_multiplier, "Trying to lock for too long");

        // Update the stake
        lockedNFTs[msg.sender][theArrayIndex] = LockedNFT(
            token_id,
            block.timestamp,
            thisNFT.liquidity,
            new_ending_ts,
            lockMultiplier(new_secs),
            thisNFT.tick_lower,
            thisNFT.tick_upper
        );

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false);
    }

    // Add additional LPs to an existing locked stake
    function lockAdditional(uint256 token_id, uint256 addl_liq) updateRewardAndBalance(msg.sender, true) public {
        // Get the stake and its index
        (LockedNFT memory thisNFT, uint256 theArrayIndex) = _getStake(msg.sender, token_id);

        // Calculate the new amount
        uint256 new_amt = thisNFT.liquidity + addl_liq;

        // Checks
        require(addl_liq >= 0, "Must be nonzero");

        // TODO
        // NEED LOGIC HERE!!!
        // NEED LOGIC HERE!!!
        // NEED LOGIC HERE!!!
        revert("NEED LOGIC");

        // Update the stake
        lockedNFTs[msg.sender][theArrayIndex] = LockedNFT(
            token_id,
            thisNFT.start_timestamp,
            new_amt,
            thisNFT.ending_timestamp,
            thisNFT.lock_multiplier,
            thisNFT.tick_lower,
            thisNFT.tick_upper
        );

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false);
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
                    start_timestamp + secs,
                    lock_multiplier,
                    tick_lower,
                    tick_upper
                )
            );
        }

        // Pull the tokens from the source_address
        stakingTokenNFT.safeTransferFrom(source_address, address(this), token_id);

        // Update liquidities
        _total_liquidity_locked = _total_liquidity_locked + liquidity;
        _locked_liquidity[staker_address] = _locked_liquidity[staker_address] + liquidity;

        // Need to call again to make sure everything is correct
        _updateRewardAndBalance(staker_address, false);

        emit LockNFT(staker_address, liquidity, token_id, secs, source_address);
    }

    // ------ WITHDRAWING ------

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
            _total_liquidity_locked = _total_liquidity_locked + theLiquidity;
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address] + theLiquidity;

            // Remove the stake from the array
            delete lockedNFTs[staker_address][theArrayIndex];

            // Need to call again to make sure everything is correct
            _updateRewardAndBalance(staker_address, false);

            // Give the tokens to the destination_address
            stakingTokenNFT.safeTransferFrom(address(this), destination_address, token_id);

            emit WithdrawLocked(staker_address, theLiquidity, token_id, destination_address);
        }
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Do nothing
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
    
    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC721(address tokenAddress, uint256 token_id) external onlyByOwnGov {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if (!migrationsOn) {
            require(tokenAddress != address(stakingTokenNFT), "Not in migration"); // Only Governance / Timelock can trigger a migration
        }
        
        // Only the owner address can ever receive the recovery withdrawal
        // INonfungiblePositionManager inherits IERC721 so the latter does not need to be imported
        INonfungiblePositionManager(tokenAddress).safeTransferFrom( address(this), owner, token_id);
    }

    /* ========== EVENTS ========== */

    event LockNFT(address indexed user, uint256 liquidity, uint256 token_id, uint256 secs, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, uint256 token_id, address destination_address);
}
