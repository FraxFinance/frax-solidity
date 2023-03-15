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
// ================= FraxUnifiedFarm_KyberSwapElastic =================
// ====================================================================
// For KyberSwap Elastic, which behaves sort of like Uniswap V3 and has ERC-721 NFTs
// Uses FraxUnifiedFarmTemplate.sol

import "./FraxUnifiedFarmTemplate.sol";
import "../Misc_AMOs/kyberswap/position_manager/IAntiSnipAttackPositionManager.sol";
import "../Oracle/ComboOracle_KyberSwapElastic.sol";

contract FraxUnifiedFarm_KyberSwapElastic is FraxUnifiedFarmTemplate {

    /* ========== STATE VARIABLES ========== */

    // -------------------- COMMON -------------------- 
    bool public immutable frax_is_token0;

    // -------------------- VARIES -------------------- 

    // KyberSwap Elastic related
    IAntiSnipAttackPositionManager private stakingTokenNFT;
    
    // Keep "uni" prefixes here for ABI purposes
    int24 public uni_tick_lower;
    int24 public uni_tick_upper;
    uint24 public uni_required_fee;
    address public uni_token0;
    address public uni_token1;

    // Need to seed a starting token to use both as a basis for fraxPerLPToken
    // as well as getting ticks, etc
    uint256 public seed_token_id; 

    // Combo Oracle related
    ComboOracle_KyberSwapElastic private comboOracleKyberSwapElastic;

    // Stake tracking
    mapping(address => LockedNFT[]) public lockedNFTs;


    /* ========== STRUCTS ========== */

    // Struct for the stake
    struct LockedNFT {
        uint256 token_id; // for KyberSwap Elastic LPs
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
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRatesManual,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address[] memory _coreAddresses, // 0: NFT Manager, 1: ComboOracle
        uint256 _seed_token_id
    ) 
    FraxUnifiedFarmTemplate(_owner, _rewardTokens, _rewardManagers, _rewardRatesManual, _gaugeControllers, _rewardDistributors)
    {
        stakingTokenNFT = IAntiSnipAttackPositionManager(_coreAddresses[0]);
        comboOracleKyberSwapElastic = ComboOracle_KyberSwapElastic(_coreAddresses[1]);

        // Use the seed token as a template
        ( 
            IAntiSnipAttackPositionManager.Position memory pos, 
            IAntiSnipAttackPositionManager.PoolInfo memory info
        ) = stakingTokenNFT.positions(_seed_token_id);

        // Set the KyberSwap Elastic addresses
        uni_token0 = info.token0;
        uni_token1 = info.token1;

        // Check where FRAX is
        frax_is_token0 = (uni_token0 == frax_address);

        // Fee, Tick, and Liquidity related
        uni_required_fee = info.fee;
        uni_tick_lower = pos.tickLower;
        uni_tick_upper = pos.tickUpper;
        
        // Set the seed token id
        seed_token_id = _seed_token_id;

        // Infinite approve the two tokens to the Positions NFT Manager 
        // This saves gas
        ERC20(uni_token0).approve(address(stakingTokenNFT), type(uint256).max);
        ERC20(uni_token1).approve(address(stakingTokenNFT), type(uint256).max);
    }

    /* ============= VIEWS ============= */

    // ------ FRAX RELATED ------

    function fraxPerLPToken() public view override returns (uint256) {
        // Used the seeded main NFT token ID as a basis for this
        // Doing this + using fraxPerLPStored should save a lot of gas
        ComboOracle_KyberSwapElastic.NFTBasicInfo memory NFTBasicInfo = comboOracleKyberSwapElastic.getNFTBasicInfo(seed_token_id);
        ComboOracle_KyberSwapElastic.NFTValueInfo memory NFTValueInfo = comboOracleKyberSwapElastic.getNFTValueInfo(seed_token_id);

        if (frax_is_token0) {
            return (NFTValueInfo.token0_value * MULTIPLIER_PRECISION) / NFTBasicInfo.liquidity;
        }
        else {
            return (NFTValueInfo.token1_value * MULTIPLIER_PRECISION) / NFTBasicInfo.liquidity;
        }
    }

    // ------ KyberSwap Elastic RELATED ------

    

    // ------ ERC721 RELATED ------

    // Needed to indicate that this contract is ERC721 compatible
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ------ LIQUIDITY AND WEIGHTS ------
    function calcCurrLockMultiplier(address account, uint256 nft_id) public view returns (uint256 midpoint_lock_multiplier) {
        // Get the stake
        LockedNFT memory thisNFT = lockedNFTs[account][nft_id];

        // Handles corner case where user never claims for a new stake
        // Don't want the multiplier going above the max
        uint256 accrue_start_time;
        if (lastRewardClaimTime[account] < thisNFT.start_timestamp) {
            accrue_start_time = thisNFT.start_timestamp;
        }
        else {
            accrue_start_time = lastRewardClaimTime[account];
        }
        
        // If the lock is expired
        if (thisNFT.ending_timestamp <= block.timestamp) {
            // If the lock expired in the time since the last claim, the weight needs to be proportionately averaged this time
            if (lastRewardClaimTime[account] < thisNFT.ending_timestamp){
                uint256 time_before_expiry = thisNFT.ending_timestamp - accrue_start_time;
                uint256 time_after_expiry = block.timestamp - thisNFT.ending_timestamp;

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
                uint256 time_left_p1 = thisNFT.ending_timestamp - accrue_start_time;
                uint256 time_left_p2 = thisNFT.ending_timestamp - block.timestamp;
                avg_time_left = (time_left_p1 + time_left_p2) / 2;
            }
            midpoint_lock_multiplier = lockMultiplier(avg_time_left);
        }

        // Sanity check: make sure it never goes above the initial multiplier
        if (midpoint_lock_multiplier > thisNFT.lock_multiplier) midpoint_lock_multiplier = thisNFT.lock_multiplier;
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
        for (uint256 i = 0; i < lockedNFTs[account].length; i++) {
            LockedNFT memory thisNFT = lockedNFTs[account][i];

            // Calculate the midpoint lock multiplier
            uint256 midpoint_lock_multiplier = calcCurrLockMultiplier(account, i);

            // Calculate the combined boost
            uint256 liquidity = thisNFT.liquidity;
            uint256 combined_boosted_amount = liquidity + ((liquidity * (midpoint_lock_multiplier + midpoint_vefxs_multiplier)) / MULTIPLIER_PRECISION);
            new_combined_weight += combined_boosted_amount;
        }
    }

    // ------ LOCK RELATED ------

    // Return all of the locked NFT positions
    function lockedNFTsOf(address account) external view returns (LockedNFT[] memory) {
        return lockedNFTs[account];
    }

    // Returns the length of the locked NFTs for a given account
    function lockedNFTsOfLength(address account) external view returns (uint256) {
        return lockedNFTs[account].length;
    }

    /* =============== MUTATIVE FUNCTIONS =============== */

    // ------ STAKING ------

    function _updateLiqAmts(address staker_address, uint256 amt, bool is_add) internal {
        // Get the proxy address
        address the_proxy = getProxyFor(staker_address);

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
        _updateRewardAndBalance(staker_address, true);
    }

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

    // Add additional LPs to an existing locked stake
    // Make sure to do the 2 token approvals to the NFT Position Manager first on the UI
    // NOTE: If use_balof_override is true, make sure your calling transaction is atomic with the token
    // transfers in to prevent front running!
    function lockAdditional(
        uint256 token_id, 
        uint256 token0_amt, 
        uint256 token1_amt,
        uint256 token0_min_in, 
        uint256 token1_min_in,
        bool use_balof_override // Use balanceOf Override
    ) updateRewardAndBalanceMdf(msg.sender, true) public {
        // Get the stake and its index
        (LockedNFT memory thisNFT, uint256 theArrayIndex) = _getStake(msg.sender, token_id);

        // Handle the tokens
        uint256 tk0_amt_to_use;
        uint256 tk1_amt_to_use;
        if (use_balof_override){
            // Get the token balances atomically sent to this farming contract
            tk0_amt_to_use = ERC20(uni_token0).balanceOf(address(this));
            tk1_amt_to_use = ERC20(uni_token1).balanceOf(address(this));
        }
        else {
            // Pull in the two tokens
            tk0_amt_to_use = token0_amt;
            tk1_amt_to_use = token1_amt;
            TransferHelper.safeTransferFrom(uni_token0, msg.sender, address(this), tk0_amt_to_use);
            TransferHelper.safeTransferFrom(uni_token1, msg.sender, address(this), tk1_amt_to_use);
        }

        // Calculate the increaseLiquidity parms
        IAntiSnipAttackPositionManager.IncreaseLiquidityParams memory inc_liq_params = IAntiSnipAttackPositionManager.IncreaseLiquidityParams(
            token_id,
            tk0_amt_to_use,
            tk1_amt_to_use,
            use_balof_override ? 0 : token0_min_in, // Ignore slippage if using balanceOf
            use_balof_override ? 0 : token1_min_in, // Ignore slippage if using balanceOf
            block.timestamp + 604800 // Expiration: 7 days from now
        );

        // Add the liquidity
        ( uint128 addl_liq, , , ) = stakingTokenNFT.addLiquidity(inc_liq_params);

        // Checks
        require(addl_liq >= 0, "Must be nonzero");

        // Update the stake
        lockedNFTs[msg.sender][theArrayIndex] = LockedNFT(
            token_id,
            thisNFT.liquidity + addl_liq,
            thisNFT.start_timestamp,
            thisNFT.ending_timestamp,
            thisNFT.lock_multiplier,
            thisNFT.tick_lower,
            thisNFT.tick_upper
        );

        // Update liquidities
        _updateLiqAmts(msg.sender, addl_liq, true);
    }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for proxies)
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
    ) internal updateRewardAndBalanceMdf(staker_address, true) {
        require(stakingPaused == false, "Staking paused");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier,"Trying to lock for too long");

         // Check the NFT you are trying to stake. Should throw if it doesn't match the seed nft token characteristics (fee, token addrs, ticks)
        (uint256 liquidity, int24 tick_lower, int24 tick_upper) = comboOracleKyberSwapElastic.checkKyberElasticNFT(seed_token_id, token_id);

        // Push in the struct
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
        _updateLiqAmts(staker_address, liquidity, true);

        emit LockNFT(staker_address, liquidity, token_id, secs, source_address);
    }

    // ------ WITHDRAWING ------

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for proxies)
    function withdrawLocked(uint256 token_id, address destination_address, bool claim_rewards) nonReentrant external returns (uint256) {
        require(withdrawalsPaused == false, "Withdrawals paused");
        return _withdrawLocked(msg.sender, destination_address, token_id, claim_rewards);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        uint256 token_id,
        bool claim_rewards
    ) internal returns (uint256) {
        // Collect rewards first and then update the balances
        // Ignore the extra rewards (LP fees) here for KyberSwap Elastic NFTs when withdrawing
        // If it bugs out, the user's NFT could be permanently stuck in this farm
        // They can always just manually get the LP fees on Kyber's UI once their NFT is withdrawn
        // Collect rewards first and then update the balances
        // collectRewardsOnWithdrawalPaused to be used in an emergency situation if reward is overemitted or not available
        // and the user can forfeit rewards to get their principal back. User can also specify it in withdrawLocked
        if (claim_rewards || !collectRewardsOnWithdrawalPaused) _getReward(staker_address, destination_address, true);
        else {
            // Sync the rewards at least
            _updateRewardAndBalance(staker_address, true);
        }

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
        require(block.timestamp >= thisNFT.ending_timestamp || stakesUnlocked == true, "Stake is still locked!");

        uint256 theLiquidity = thisNFT.liquidity;

        if (theLiquidity > 0) {
            // Update liquidities
            _updateLiqAmts(staker_address, theLiquidity, false);

            // Remove the stake from the array
            delete lockedNFTs[staker_address][theArrayIndex];

            // Give the tokens to the destination_address
            stakingTokenNFT.safeTransferFrom(address(this), destination_address, token_id);

            emit WithdrawLocked(staker_address, theLiquidity, token_id, destination_address);
        }

        return theLiquidity;
    }

    function _getRewardExtraLogic(address rewardee, address destination_address) internal override {
        // Collect liquidity fees too
        LockedNFT memory thisNFT;
        for (uint256 i = 0; i < lockedNFTs[rewardee].length; i++) {
            thisNFT = lockedNFTs[rewardee][i];
            
            // Check for null entries
            if (thisNFT.token_id != 0){
                // Collect the fees and send to destination_address
                (bytes[] memory the_payload, uint256 tkn0_owed, uint256 tkn1_owed, bool has_rewards) = comboOracleKyberSwapElastic.getFeeCollectionMulticallPayload(
                    thisNFT.token_id,
                    uni_token0,
                    uni_token1,
                    uni_required_fee,
                    address(this)
                );
                
                if (has_rewards) {
                    // Try to execute the collection
                    try stakingTokenNFT.multicall(the_payload) {
                        // Transfer the ERC20s to the destination address
                        // Atomic, so should be ok
                        TransferHelper.safeTransferFrom(uni_token0, address(this), destination_address, tkn0_owed);
                        TransferHelper.safeTransferFrom(uni_token1, address(this), destination_address, tkn1_owed);
                    
                        // The fee reward collection needs at least 1 wei of liquidity burned, so you need to update the state
                        // here to reflect that. Otherwise it will be off-by-1 when trying to withdraw
                        {
                            // Update the stake
                            lockedNFTs[rewardee][i].liquidity -= 1;

                            // Update liquidities
                            _updateLiqAmts(rewardee, 1, false);
                        }
                    }
                    catch {
                        // Do nothing
                    }


                }
            }
        }
    }
    
    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC721(address tokenAddress, uint256 token_id) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        // IAntiSnipAttackPositionManager inherits IERC721 so the latter does not need to be imported
        IAntiSnipAttackPositionManager(tokenAddress).safeTransferFrom(address(this), owner, token_id);
    }

    /* ========== EVENTS ========== */

    event LockNFT(address indexed user, uint256 liquidity, uint256 token_id, uint256 secs, address source_address);
    event WithdrawLocked(address indexed user, uint256 liquidity, uint256 token_id, address destination_address);
}
