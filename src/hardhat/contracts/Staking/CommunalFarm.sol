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
// =========================== CommunalFarm ===========================
// ====================================================================
// Multiple tokens with different reward rates can be emitted
// Multiple teams can set the reward rates for their token(s)
// Apes together strong

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan 
// Sam Kazemian: https://github.com/samkazemian
// Saddle Team: https://github.com/saddle-finance
// Fei Team: https://github.com/fei-protocol
// Alchemix Team: https://github.com/alchemix-finance
// Liquity Team: https://github.com/liquity

// Modified from the Synthetix.io original
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Misc_AMOs/saddle/ISaddleD4_LP.sol";
import "../Utils/ReentrancyGuard.sol";

// Inheritance
import "./Owned.sol";

contract CommunalFarm is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    ISaddleD4_LP private stakingToken;
    
    // Constant for various precisions
    uint256 private constant MULTIPLIER_PRECISION = 1e18;

    // Admin addresses
    address public timelock_address; // Governance timelock address

    // Time tracking
    uint256 public periodFinish;
    uint256 public lastUpdateTime;

    // Lock time and multiplier settings
    uint256 public lock_max_multiplier = uint256(3e18); // E18. 1x = e18
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public lock_time_min = 86400; // 1 * 86400  (1 day)

    // Reward addresses, rates, and managers
    mapping(address => address) public rewardManagers; // token addr -> manager addr
    address[] public rewardTokens;
    uint256[] public rewardRates;
    string[] private rewardSymbols;
    mapping(address => uint256) public rewardTokenAddrToIdx; // token addr -> token index
    
    // Reward period
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    // Reward tracking
    uint256[] public rewardsPerTokenStored;
    mapping(address => mapping(uint256 => uint256)) public userRewardsPerTokenPaid; // staker addr -> token id -> paid amount
    mapping(address => mapping(uint256 => uint256)) public rewards; // staker addr -> token id -> reward amount

    // Balance tracking
    uint256 private _total_liquidity_locked = 0;
    uint256 private _total_combined_weight = 0;
    mapping(address => uint256) private _locked_liquidity;
    mapping(address => uint256) private _combined_weights;

    // Stake tracking
    mapping(address => LockedStake[]) private lockedStakes;

    // List of valid migrators (set by governance)
    mapping(address => bool) public valid_migrators;
    address[] public valid_migrators_array;

    // Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) public staker_allowed_migrators;

    // Greylisting of bad addresses
    mapping(address => bool) public greylist;

    // Administrative booleans
    bool public migrationsOn = false; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public stakesUnlocked = false; // Release locked stakes in case of system migration or emergency
    bool public withdrawalsPaused = false; // For emergencies
    bool public rewardsCollectionPaused = false; // For emergencies
    bool public stakingPaused = false; // For emergencies

    /* ========== STRUCTS ========== */
    
    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner || msg.sender == timelock_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier onlyByOwnerOrGovernanceOrMigrator() {
        require(msg.sender == owner || msg.sender == timelock_address || valid_migrators[msg.sender] == true, "You are not the owner, governance timelock, or a migrator");
        _;
    }

    modifier onlyTokenManagers(address reward_token_address) {
        require(msg.sender == owner || msg.sender == timelock_address || isTokenManagerFor(msg.sender, reward_token_address), "You are not the owner, governance timelock, or the correct token manager");
        _;
    }

    modifier isMigrating() {
        require(migrationsOn == true, "Contract is not in migration");
        _;
    }

    modifier notStakingPaused() {
        require(stakingPaused == false, "Staking is paused");
        _;
    }

    modifier notWithdrawalsPaused() {
        require(withdrawalsPaused == false, "Withdrawals are paused");
        _;
    }

    modifier notRewardsCollectionPaused() {
        require(rewardsCollectionPaused == false, "Rewards collection is paused");
        _;
    }

    modifier updateRewardAndBalance(address account, bool sync_too) {
        _updateRewardAndBalance(account, sync_too);
        _;
    }
    
    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _stakingToken,
        string[] memory _rewardSymbols,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address _timelock_address
    ) Owned(_owner){
        stakingToken = ISaddleD4_LP(_stakingToken);

        rewardTokens = _rewardTokens;
        rewardRates = _rewardRates;
        rewardSymbols = _rewardSymbols;

        lastUpdateTime = block.timestamp;
        timelock_address = _timelock_address;

        for (uint256 i = 0; i < _rewardTokens.length; i++){ 
            // For fast token address -> token ID lookups later
            rewardTokenAddrToIdx[_rewardTokens[i]] = i;

            // Initialize the stored rewards
            rewardsPerTokenStored.push(0);

            // Initialize the reward managers
            rewardManagers[_rewardTokens[i]] = _rewardManagers[i];
        }

        // Other booleans
        migrationsOn = false;
        stakesUnlocked = false;
    }

    /* ========== VIEWS ========== */

    // Total locked liquidity tokens
    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    // Locked liquidity for a given account
    function lockedLiquidityOf(address account) public view returns (uint256) {
        return _locked_liquidity[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier
    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    // Combined weight for a specific account
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    // Calculated the combined weight for an account
    function calcCurCombinedWeight(address account) public view
        returns (
            uint256 old_combined_weight,
            uint256 new_combined_weight
        )
    {
        // Get the old combined weight
        old_combined_weight = _combined_weights[account];


        // Loop through the locked stakes, first by getting the liquidity * lock_multiplier portion
        new_combined_weight = 0;
        for (uint256 i = 0; i < lockedStakes[account].length; i++) {
            LockedStake memory thisStake = lockedStakes[account][i];
            uint256 lock_multiplier = thisStake.lock_multiplier;

            // If the lock period is over, drop the lock multiplier down to 1x for the weight calculations
            if (thisStake.ending_timestamp <= block.timestamp){
                lock_multiplier = MULTIPLIER_PRECISION;
            }

            uint256 liquidity = thisStake.liquidity;
            uint256 combined_boosted_amount = liquidity.mul(lock_multiplier).div(MULTIPLIER_PRECISION);
            new_combined_weight = new_combined_weight.add(combined_boosted_amount);
        }
    }

    // All the locked stakes for a given account
    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    // All the locked stakes for a given account
    function getRewardSymbols() external view returns (string[] memory) {
        return rewardSymbols;
    }

    // All the reward tokens
    function getAllRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }
    
    // Multiplier amount, given the length of the lock
    function lockMultiplier(uint256 secs) public view returns (uint256) {
        uint256 lock_multiplier =
            uint256(MULTIPLIER_PRECISION).add(
                secs
                    .mul(lock_max_multiplier.sub(MULTIPLIER_PRECISION))
                    .div(lock_time_for_max_multiplier)
            );
        if (lock_multiplier > lock_max_multiplier) lock_multiplier = lock_max_multiplier;
        return lock_multiplier;
    }

    // Last time the reward was applicable
    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    // Amount of reward tokens per LP token
    function rewardsPerToken() public view returns (uint256[] memory newRewardsPerTokenStored) {
        if (_total_liquidity_locked == 0 || _total_combined_weight == 0) {
            return rewardsPerTokenStored;
        }
        else {
            newRewardsPerTokenStored = new uint256[](rewardTokens.length);
            for (uint256 i = 0; i < rewardsPerTokenStored.length; i++){ 
                newRewardsPerTokenStored[i] = rewardsPerTokenStored[i].add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRates[i]).mul(1e18).div(_total_combined_weight)
                );
            }
            return newRewardsPerTokenStored;
        }
    }

    // Amount of reward tokens an account has earned / accrued
    function earned(address account) public view returns (uint256[] memory new_earned) {
        uint256[] memory reward_arr = rewardsPerToken();
        new_earned = new uint256[](rewardTokens.length);

        if (_combined_weights[account] == 0){
            for (uint256 i = 0; i < rewardTokens.length; i++){ 
                new_earned[i] = 0;
            }
        }
        else {
            for (uint256 i = 0; i < rewardTokens.length; i++){ 
                new_earned[i] = (_combined_weights[account])
                    .mul(reward_arr[i].sub(userRewardsPerTokenPaid[account][i]))
                    .div(1e18)
                    .add(rewards[account][i]);
            }
        }
    }

    // Total reward tokens emitted in the given period
    function getRewardForDuration() external view returns (uint256[] memory rewards_per_duration_arr) {
        rewards_per_duration_arr = new uint256[](rewardRates.length);

        for (uint256 i = 0; i < rewardRates.length; i++){ 
            rewards_per_duration_arr[i] = rewardRates[i].mul(rewardsDuration);
        }
    }

    // See if a staker has approved a given migrator
    function migratorApprovedForStaker(address staker_address, address migrator_address) public view returns (bool) {
        // Migrator is not a valid one
        if (valid_migrators[migrator_address] == false) return false;

        // Staker has to have approved this particular migrator
        if (staker_allowed_migrators[staker_address][migrator_address] == true) return true;

        // Otherwise, return false
        return false;
    }

    // See if the caller_addr is a manager for the reward token 
    function isTokenManagerFor(address caller_addr, address reward_token_addr) public view returns (bool){
        if (caller_addr == owner) return true; // Contract owner
        else if (rewardManagers[reward_token_addr] == caller_addr) return true; // Reward manager
        return false; 
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function _updateRewardAndBalance(address account, bool sync_too) internal {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (sync_too){
            sync();
        }
        
        if (account != address(0)) {
            // To keep the math correct, the user's combined weight must be recomputed
            (   
                uint256 old_combined_weight,
                uint256 new_combined_weight
            ) = calcCurCombinedWeight(account);

            // Calculate the earnings first
            _syncEarned(account);

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

    // Staker can allow a migrator 
    function stakerAllowMigrator(address migrator_address) public {
        require(staker_allowed_migrators[msg.sender][migrator_address] == false, "Address already exists");
        require(valid_migrators[migrator_address], "Invalid migrator address");
        staker_allowed_migrators[msg.sender][migrator_address] = true; 
    }

    // Staker can disallow a previously-allowed migrator  
    function stakerDisallowMigrator(address migrator_address) public {
        require(staker_allowed_migrators[msg.sender][migrator_address] == true, "Address doesn't exist already");

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
        require((!stakingPaused && migrationsOn == false) || valid_migrators[msg.sender] == true, "Staking is paused, or migration is happening");
        require(liquidity > 0, "Must stake more than zero");
        require(greylist[staker_address] == false, "Address has been greylisted");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier,"You are trying to lock for too long");

        uint256 lock_multiplier = lockMultiplier(secs);
        bytes32 kek_id = keccak256(abi.encodePacked(staker_address, start_timestamp, liquidity, _locked_liquidity[staker_address]));
        lockedStakes[staker_address].push(LockedStake(
            kek_id,
            start_timestamp,
            liquidity,
            start_timestamp.add(secs),
            lock_multiplier
        ));

        // Pull the tokens from the source_address
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);

        // Update liquidities
        _total_liquidity_locked = _total_liquidity_locked.add(liquidity);
        _locked_liquidity[staker_address] = _locked_liquidity[staker_address].add(liquidity);

        // Need to call to update the combined weights
        _updateRewardAndBalance(staker_address, false);

        emit StakeLocked(staker_address, liquidity, secs, kek_id, source_address);
    }

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kek_id) nonReentrant notWithdrawalsPaused public {
        _withdrawLocked(msg.sender, msg.sender, kek_id);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdrawLocked(address staker_address, address destination_address, bytes32 kek_id) internal  {
        // Collect rewards first and then update the balances
        _getReward(staker_address, destination_address);

        LockedStake memory thisStake;
        thisStake.liquidity = 0;
        uint theArrayIndex;
        for (uint256 i = 0; i < lockedStakes[staker_address].length; i++){ 
            if (kek_id == lockedStakes[staker_address][i].kek_id){
                thisStake = lockedStakes[staker_address][i];
                theArrayIndex = i;
                break;
            }
        }
        require(thisStake.kek_id == kek_id, "Stake not found");
        require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true || valid_migrators[msg.sender] == true, "Stake is still locked!");

        uint256 liquidity = thisStake.liquidity;

        if (liquidity > 0) {
            // Update liquidities
            _total_liquidity_locked = _total_liquidity_locked.sub(liquidity);
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address].sub(liquidity);

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Need to call to update the combined weights
            _updateRewardAndBalance(staker_address, false);

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            stakingToken.transfer(destination_address, liquidity);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }

    }
    
    // Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() external nonReentrant notRewardsCollectionPaused returns (uint256[] memory) {
        return _getReward(msg.sender, msg.sender);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    // This distinction is important for the migrator
    function _getReward(address rewardee, address destination_address) internal updateRewardAndBalance(rewardee, true) returns (uint256[] memory rewards_before) {
        // Update the rewards array and distribute rewards
        rewards_before = new uint256[](rewardTokens.length);

        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            rewards_before[i] = rewards[rewardee][i];
            rewards[rewardee][i] = 0;
            ERC20(rewardTokens[i]).transfer(destination_address, rewards_before[i]);
            emit RewardPaid(rewardee, rewards_before[i], rewardTokens[i], destination_address);
        }
    }

    function renewIfApplicable() external {
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
    }

    // If the period expired, renew it
    function retroCatchUp() internal {
        // Failsafe check
        require(block.timestamp > periodFinish, "Period has not expired yet!");

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 num_periods_elapsed = uint256(block.timestamp.sub(periodFinish)) / rewardsDuration; // Floor division to the nearest period
        
        // Make sure there are enough tokens to renew the reward period
        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            require(rewardRates[i].mul(rewardsDuration).mul(num_periods_elapsed + 1) <= ERC20(rewardTokens[i]).balanceOf(address(this)), string(abi.encodePacked("Not enough reward tokens available: ", rewardTokens[i])) );
        }
        
        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        _updateStoredRewardsAndTime();

        emit RewardsPeriodRenewed(address(stakingToken));
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

    function sync() public {
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
        else {
            _updateStoredRewardsAndTime();
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can). 
    function migrator_stakeLocked_for(address staker_address, uint256 amount, uint256 secs, uint256 start_timestamp) external isMigrating {
        require(migratorApprovedForStaker(staker_address, msg.sender), "msg.sender is either an invalid migrator or the staker has not approved them");
        _stakeLocked(staker_address, msg.sender, amount, secs, start_timestamp);
    }

    // Used for migrations
    function migrator_withdraw_locked(address staker_address, bytes32 kek_id) external isMigrating {
        require(migratorApprovedForStaker(staker_address, msg.sender), "msg.sender is either an invalid migrator or the staker has not approved them");
        _withdrawLocked(staker_address, msg.sender, kek_id);
    }

    // Adds supported migrator address 
    function addMigrator(address migrator_address) public onlyByOwnerOrGovernance {
        require(valid_migrators[migrator_address] == false, "address already exists");
        valid_migrators[migrator_address] = true; 
        valid_migrators_array.push(migrator_address);
    }

    // Remove a migrator address
    function removeMigrator(address migrator_address) public onlyByOwnerOrGovernance {
        require(valid_migrators[migrator_address] == true, "address doesn't exist already");
        
        // Delete from the mapping
        delete valid_migrators[migrator_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint256 i = 0; i < valid_migrators_array.length; i++){ 
            if (valid_migrators_array[i] == migrator_address) {
                valid_migrators_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyTokenManagers(tokenAddress) {
        // Cannot rug the staking / LP tokens
        require(tokenAddress != address(stakingToken), "Cannot rug staking / LP tokens");

        // Check if the desired token is a reward token
        bool isRewardToken = false;
        for (uint256 i = 0; i < rewardTokens.length; i++){ 
            if (rewardTokens[i] == tokenAddress) {
                isRewardToken = true;
                break;
            }
        }

        // Only the reward managers can take back their reward tokens
        if (msg.sender != owner && isRewardToken && rewardManagers[tokenAddress] == msg.sender){
            ERC20(tokenAddress).transfer(msg.sender, tokenAmount);
            emit Recovered(msg.sender, tokenAddress, tokenAmount);
            return;
        }

        // Other tokens, like airdrops or accidental deposits, can be withdrawn by the owner
        else if (!isRewardToken && msg.sender == owner){
            ERC20(tokenAddress).transfer(owner, tokenAmount);
            emit Recovered(owner, tokenAddress, tokenAmount);
            return;
        }

        // If none of the above conditions are true
        else {
            revert("No valid tokens to recover");
        }
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyByOwnerOrGovernance {
        require(
            periodFinish == 0 || block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration for the new period"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function setMultipliers(uint256 _lock_max_multiplier) external onlyByOwnerOrGovernance {
        require(_lock_max_multiplier >= uint256(1e18), "Multiplier must be greater than or equal to 1e18");
        lock_max_multiplier = _lock_max_multiplier;
        emit LockedStakeMaxMultiplierUpdated(lock_max_multiplier);
    }

    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min) external onlyByOwnerOrGovernance {
        require(_lock_time_for_max_multiplier >= 1, "Multiplier Max Time must be greater than or equal to 1");
        require(_lock_time_min >= 1, "Multiplier Min Time must be greater than or equal to 1");

        lock_time_for_max_multiplier = _lock_time_for_max_multiplier;
        lock_time_min = _lock_time_min;

        emit LockedStakeTimeForMaxMultiplier(lock_time_for_max_multiplier);
        emit LockedStakeMinTime(_lock_time_min);
    }

    function initializeDefault() external onlyByOwnerOrGovernance {
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit DefaultInitialization();
    }

    function greylistAddress(address _address) external onlyByOwnerOrGovernance {
        greylist[_address] = !(greylist[_address]);
    }

    function unlockStakes() external onlyByOwnerOrGovernance {
        stakesUnlocked = !stakesUnlocked;
    }

    function toggleMigrations() external onlyByOwnerOrGovernance {
        migrationsOn = !migrationsOn;
    }

    function toggleStaking() external onlyByOwnerOrGovernance {
        stakingPaused = !stakingPaused;
    }

    function toggleWithdrawals() external onlyByOwnerOrGovernance {
        withdrawalsPaused = !withdrawalsPaused;
    }

    function toggleRewardsCollection() external onlyByOwnerOrGovernance {
        rewardsCollectionPaused = !rewardsCollectionPaused;
    }

    // The owner or the reward token managers can set reward rates 
    function setRewardRate(address reward_token_address, uint256 new_rate, bool sync_too) external onlyTokenManagers(reward_token_address) {
        rewardRates[rewardTokenAddrToIdx[reward_token_address]] = new_rate;
        
        if (sync_too){
            sync();
        }
    }

    // The owner or the reward token managers can change managers
    function changeTokenManager(address reward_token_address, address new_manager_address) external onlyTokenManagers(reward_token_address) {
        rewardManagers[reward_token_address] = new_manager_address;
    }

    function setTimelock(address _new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = _new_timelock;
    }

    /* ========== EVENTS ========== */

    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    event WithdrawLocked(address indexed user, uint256 amount, bytes32 kek_id, address destination_address);
    event RewardPaid(address indexed user, uint256 reward, address token_address, address destination_address);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address destination_address, address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event DefaultInitialization();
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
    event LockedStakeMinTime(uint256 secs);
}
