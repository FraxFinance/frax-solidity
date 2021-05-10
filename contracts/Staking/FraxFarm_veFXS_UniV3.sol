// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================= FraxFarm =============================
// ====================================================================
// Migratable Farming contract that accounts for veFXS and UniswapV3
// Based on the StakingRewardsDualV2.sol contract
// Only one possible reward token here (usually FXS), to cut gas costs

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Sam Sun: https://github.com/samczsun

// Modified originally from Synthetixio
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import '../Uniswap_V3/IUniswapV3Pool.sol';
import "../Utils/ReentrancyGuard.sol";
import "../Utils/StringHelpers.sol";

// Inheritance
import "./IStakingRewardsDual.sol";
import "./Owned.sol";
import "./Pausable.sol";

contract FraxFarm is Owned, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    IveFXS private veFXS;
    ERC20 public rewardsToken0;
    ERC20 public stakingToken;
    uint256 public periodFinish;

    // Constant for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant MULTIPLIER_BASE = 1e6;

    // Max reward per second
    uint256 public rewardRate0;

    // uint256 public rewardsDuration = 86400 hours;
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored0 = 0;

    address public owner_address;
    address public timelock_address; // Governance timelock address

    uint256 public lock_max_multiplier = 3000000; // 6 decimals of precision. 1x = 1000000
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public lock_time_min = 604800; // 7 * 86400  (7 days)
    string private lock_time_min_str = "604800"; // 7 days on genesis

    uint256 public vefxs_max_multiplier = 2500000; // 6 decimals of precision. 1x = 1000000

    mapping(address => uint256) public userRewardPerTokenPaid0;
    mapping(address => uint256) public rewards0;

    mapping(address => uint256) private _vefxsMultiplierStored;

    uint256 private _total_tokens_staked = 0;
    uint256 private _total_combined_weight = 0;
    mapping(address => uint256) private _unlocked_balances;
    mapping(address => uint256) private _locked_balances;
    mapping(address => uint256) private _combined_weights;

    mapping(address => LockedStake[]) private lockedStakes;

    // List of valid migrators (set by governance)
    mapping(address => bool) public valid_migrators;
    address[] public valid_migrators_array;

    // Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) public staker_allowed_migrators;

    mapping(address => bool) public greylist;

    bool public migrationsOn = false; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public stakesUnlocked = false; // Release locked stakes in case of system migration or emergency
    bool public withdrawalsPaused = false; // For emergencies
    bool public rewardsCollectionPaused = false; // For emergencies

    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 amount;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier onlyByOwnerOrGovernanceOrMigrator() {
        require(msg.sender == owner_address || msg.sender == timelock_address || valid_migrators[msg.sender] == true, "You are not the owner, governance timelock, or a migrator");
        _;
    }

    modifier isMigrating() {
        require(migrationsOn == true, "Contract is not in migration");
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
    
    modifier updateRewardAndBalance(address account) {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        sync();

        if (account != address(0)) {
            // To keep the math correct, the user's combined weight must be recomputed to account for their
            // ever-changing veFXS balance. 
            (
                ,
                uint256 old_combined_weight, 
                uint256 new_vefxs_multiplier,
                uint256 new_combined_weight 
            ) = calcCurCombinedWeight(account);

            // Update the user's stored veFXS multiplier
            _vefxsMultiplierStored[account] = new_vefxs_multiplier;

            // Update the user's and the global combined weights
            if (new_combined_weight >= old_combined_weight){
                uint256 weight_diff = new_combined_weight.sub(old_combined_weight);

                _total_combined_weight = _total_combined_weight.add(weight_diff);
                _combined_weights[account] = old_combined_weight.add(weight_diff);
            }
            else {
                uint256 weight_diff = old_combined_weight.sub(new_combined_weight);
                _total_combined_weight = _total_combined_weight.sub(weight_diff);
                _combined_weights[account] = old_combined_weight.sub(weight_diff);
            }

            // Calculate the earnings
            uint256 earned0 = earned(account);
            rewards0[account] = earned0;
            userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
        }

        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _rewardsToken0,
        address _stakingToken,
        address _frax_address,
        address _timelock_address,
        address _veFXS_address
    ) public Owned(_owner){
        owner_address = _owner;
        rewardsToken0 = ERC20(_rewardsToken0);
        stakingToken = ERC20(_stakingToken);
        veFXS = IveFXS(_veFXS_address);
        lastUpdateTime = block.timestamp;
        timelock_address = _timelock_address;

        // 1 FXS a day
        rewardRate0 = (uint256(365e18)).div(365 * 86400); 

        migrationsOn = false;
        stakesUnlocked = false;
    }

    /* ========== VIEWS ========== */

    function totalTokensStaked() external view returns (uint256) {
        return _total_tokens_staked;
    }

    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    function lockMultiplier(uint256 secs) public view returns (uint256) {
        uint256 lock_multiplier = uint(MULTIPLIER_BASE).add(secs.mul(lock_max_multiplier.sub(MULTIPLIER_BASE)).div(lock_time_for_max_multiplier));
        if (lock_multiplier > lock_max_multiplier) lock_multiplier = lock_max_multiplier;
        return lock_multiplier;
    }

    function veFXSMultiplier(address account) public view returns (uint256) {
        // Applied at reward collection time, otherwise it gets really gassy, really quick
        // Keeping the logic simple here for now.
        // The claimer gets a boost depending on their share of the total veFXS supply at claim time, multiplied by a scalar and
        // capped at the vefxs_max_multiplier
        uint256 user_vefxs_fraction = (veFXS.balanceOf(account)).mul(1e6).div(veFXS.totalSupply());
        uint256 vefxs_multiplier = uint(MULTIPLIER_BASE).add((user_vefxs_fraction).mul(vefxs_max_multiplier.sub(MULTIPLIER_BASE)).div(MULTIPLIER_BASE) );
        
        // Cap the boost to the vefxs_max_multiplier
        if (vefxs_multiplier > vefxs_max_multiplier) vefxs_multiplier = vefxs_max_multiplier;

        return vefxs_multiplier;
    }

    function uniV3WeightFactor(address account, uint256 lp_amt) public view returns (uint256) {
        // TODO
        // Basically checks the liquidity range for validity
        // Anything out of range is ignored for LP rewards
        return PRICE_PRECISION;
    }

    // Total unlocked and locked liquidity tokens
    function balanceOf(address account) external view returns (uint256) {
        return (_unlocked_balances[account]).add(_locked_balances[account]);
    }

    // Total unlocked liquidity tokens
    function unlockedBalanceOf(address account) external view returns (uint256) {
        return _unlocked_balances[account];
    }

    // Total locked liquidity tokens
    function lockedBalanceOf(address account) public view returns (uint256) {
        return _locked_balances[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier
    function boostedBalanceOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    function stakingDecimals() external view returns (uint256) {
        return stakingToken.decimals();
    }

    function calcCurCombinedWeight(address account) public view returns (
        uint256 old_vefxs_multiplier,
        uint256 old_combined_weight, 
        uint256 new_vefxs_multiplier,
        uint256 new_combined_weight 
    ) {
        // Get the old values
        old_vefxs_multiplier = _vefxsMultiplierStored[account];
        old_combined_weight = _combined_weights[account];

        // Get the new veFXS multiplier
        new_vefxs_multiplier = veFXSMultiplier(account);

        // Get the new non-locked component first
        uint256 unlocked_tally = _unlocked_balances[account].mul(new_vefxs_multiplier).div(PRICE_PRECISION);

        // Loop through the locked stakes next, first by getting the amount * lock_multiplier part
        uint256 locked_tally = 0;
        for (uint i = 0; i < lockedStakes[account].length; i++){ 
            uint256 lock_multiplier = lockedStakes[account][i].lock_multiplier;
            uint256 amount = lockedStakes[account][i].amount;
            uint256 lock_boosted_portion = amount.mul(lock_multiplier).div(PRICE_PRECISION);
            locked_tally = locked_tally.add(lock_boosted_portion);
        }

        // Now factor in the veFXS multiplier
        locked_tally = locked_tally.mul(new_vefxs_multiplier).div(PRICE_PRECISION);

        // Get the new combined weight
        new_combined_weight = unlocked_tally.add(locked_tally);
    }

    function rewardsFor(address account) external view returns (uint256) {
        // You may have use earned() instead, because of the order in which the contract executes 
        return rewards0[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (_total_tokens_staked == 0) {
            return rewardPerTokenStored0;
        }
        else {
            return (rewardPerTokenStored0.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate0).mul(1e18).div(_total_combined_weight)
                )
            );
        }
    }

    function earned(address account) public view returns (uint256) {
        (uint256 reward0) = rewardPerToken();
        return (
            _combined_weights[account].mul(reward0.sub(userRewardPerTokenPaid0[account])).div(1e18).add(rewards0[account])
        );
    }

    function getRewardForDuration() external view returns (uint256) {
        return (
            rewardRate0.mul(rewardsDuration)
        );
    }

    function migratorApprovedForStaker(address staker_address, address migrator_address) public view returns (bool) {
        // Migrator is not a valid one
        if (valid_migrators[migrator_address] == false) return false;

        // Staker has to have approved this particular migrator
        if (staker_allowed_migrators[staker_address][migrator_address] == true) return true;

        // Otherwise, return false
        return false;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // Staker can allow a migrator 
    function stakerAllowMigrator(address migrator_address) public {
        require(staker_allowed_migrators[msg.sender][migrator_address] == false, "Address already exists");
        require(valid_migrators[migrator_address], "Invalid migrator address");
        staker_allowed_migrators[msg.sender][migrator_address] = true; 
    }

    // Staker can disallow a previously-allowed migrator  
    function stakerDisallowMigrator(address migrator_address) public {
        require(staker_allowed_migrators[msg.sender][migrator_address] == true, "Address doesn't exist already");
        
        // Redundant
        // require(valid_migrators[migrator_address], "Invalid migrator address");

        // Delete from the mapping
        delete staker_allowed_migrators[msg.sender][migrator_address];
    }
    
    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stake(uint256 amount) public {
        _stake(msg.sender, msg.sender, amount);
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    function _stake(address staker_address, address source_address, uint256 amount) internal nonReentrant updateRewardAndBalance(staker_address) {
        require((paused == false && migrationsOn == false) || valid_migrators[msg.sender] == true, "Staking is paused, or migration is happening");
        require(amount > 0, "Cannot stake 0");
        require(greylist[staker_address] == false, "address has been greylisted");

        // Pull the tokens from the source_address
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), amount);

        // Calculate the combined weight to add
        uint256 combined_weight_to_add = amount.mul(_vefxsMultiplierStored[staker_address]).div(PRICE_PRECISION);

        // Staking token supply and combined weight
        _total_tokens_staked = _total_tokens_staked.add(amount);
        _total_combined_weight = _total_combined_weight.add(combined_weight_to_add);

        // Staking token balance, combined weight, and veFXS multiplier
        _unlocked_balances[staker_address] = _unlocked_balances[staker_address].add(amount);
        _combined_weights[staker_address] = _combined_weights[staker_address].add(combined_weight_to_add);

        emit Staked(staker_address, amount, source_address);
    }

    // Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stakeLocked(uint256 amount, uint256 secs) public {
        _stakeLocked(msg.sender, msg.sender, amount, secs);
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    function _stakeLocked(address staker_address, address source_address, uint256 amount, uint256 secs) internal nonReentrant updateRewardAndBalance(staker_address) {
        require((paused == false && migrationsOn == false) || valid_migrators[msg.sender] == true, "Staking is paused, or migration is happening");
        require(amount > 0, "Cannot stake 0");
        require(secs > 0, "Cannot wait for a negative number");
        require(greylist[staker_address] == false, "address has been greylisted");
        require(secs >= lock_time_min, StringHelpers.strConcat("Minimum stake time not met (", lock_time_min_str, ")") );
        require(secs <= lock_time_for_max_multiplier, "You are trying to stake for too long");

        uint256 lock_multiplier = lockMultiplier(secs);
        uint256 combined_weight_to_add = amount.mul(lock_multiplier).mul(_vefxsMultiplierStored[staker_address]).div(PRICE_PRECISION ** 2);
        lockedStakes[staker_address].push(LockedStake(
            keccak256(abi.encodePacked(staker_address, block.timestamp, amount)),
            block.timestamp,
            amount,
            block.timestamp.add(secs),
            lock_multiplier
        ));

        // Pull the tokens from the source_address
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), amount);

        // Staking token supply and combined weight
        _total_tokens_staked = _total_tokens_staked.add(amount);
        _total_combined_weight = _total_combined_weight.add(combined_weight_to_add);

        // Staking token balance, combined weight, and veFXS multiplier
        _locked_balances[staker_address] = _locked_balances[staker_address].add(amount);
        _combined_weights[staker_address] = _combined_weights[staker_address].add(combined_weight_to_add);

        emit StakeLocked(staker_address, amount, secs, source_address);
    }

    // Two different withdrawer functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdraw(uint256 amount) public {
        _withdraw(msg.sender, msg.sender, amount);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdraw(address staker_address, address destination_address, uint256 amount) internal nonReentrant notWithdrawalsPaused updateRewardAndBalance(staker_address) {
        require(amount > 0, "Cannot withdraw 0");

        // Staking token balance and combined weight
        _unlocked_balances[staker_address] = _unlocked_balances[staker_address].sub(amount);

        // updateRewardAndBalance() above should make this math correct and not leave a gap
        uint256 combined_weight_to_sub = amount.mul(_vefxsMultiplierStored[staker_address]).div(PRICE_PRECISION);
        _combined_weights[staker_address] = _combined_weights[staker_address].sub(combined_weight_to_sub);

        // Staking token supply and combined weight
        _total_tokens_staked = _total_tokens_staked.sub(amount);
        _total_combined_weight = _total_combined_weight.sub(combined_weight_to_sub);

        // Give the tokens to the destination_address
        stakingToken.safeTransfer(destination_address, amount);
        emit Withdrawn(staker_address, amount, destination_address);
    }

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kek_id) public {
        _withdrawLocked(msg.sender, msg.sender, kek_id);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdrawLocked(address staker_address, address destination_address, bytes32 kek_id) internal nonReentrant notWithdrawalsPaused updateRewardAndBalance(staker_address) {
        LockedStake memory thisStake;
        thisStake.amount = 0;
        uint theIndex;
        for (uint i = 0; i < lockedStakes[staker_address].length; i++){ 
            if (kek_id == lockedStakes[staker_address][i].kek_id){
                thisStake = lockedStakes[staker_address][i];
                theIndex = i;
                break;
            }
        }
        require(thisStake.kek_id == kek_id, "Stake not found");
        require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true || valid_migrators[msg.sender] == true, "Stake is still locked!");

        uint256 theAmount = thisStake.amount;

        // updateRewardAndBalance() above should make this math correct and not leave a gap
        uint256 combined_weight_to_sub = theAmount.mul(thisStake.lock_multiplier).mul(_vefxsMultiplierStored[staker_address]).div(PRICE_PRECISION ** 2);

        if (theAmount > 0){
            // Staking token supply and combined weight
            _total_tokens_staked = _total_tokens_staked.sub(theAmount);
            _total_combined_weight = _total_combined_weight.sub(combined_weight_to_sub);

            // Staking token balance and combined weight
            _locked_balances[staker_address] = _locked_balances[staker_address].sub(theAmount);
            _combined_weights[staker_address] = _combined_weights[staker_address].sub(combined_weight_to_sub);

            // Remove the stake from the array
            delete lockedStakes[staker_address][theIndex];

            // Give the tokens to the destination_address
            stakingToken.safeTransfer(destination_address, theAmount);

            emit WithdrawnLocked(staker_address, theAmount, kek_id, destination_address);
        }

    }
    
    // Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() public {
        _getReward(msg.sender, msg.sender);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    // This distinction is important for the migrator
    function _getReward(address rewardee, address destination_address) internal nonReentrant notRewardsCollectionPaused updateRewardAndBalance(rewardee) {
        uint256 reward0 = rewards0[rewardee];
        if (reward0 > 0) {
            rewards0[rewardee] = 0;
            rewardsToken0.transfer(destination_address, reward0);
            emit RewardPaid(rewardee, reward0, address(rewardsToken0), destination_address);
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
        uint balance0 = rewardsToken0.balanceOf(address(this));
        require(rewardRate0.mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance0, "Not enough FXS available for rewards!");
        
        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        (uint256 reward0) = rewardPerToken();
        rewardPerTokenStored0 = reward0;
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingToken));
    }

    function sync() public {
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        }
        else {
            (uint256 reward0) = rewardPerToken();
            rewardPerTokenStored0 = reward0;
            lastUpdateTime = lastTimeRewardApplicable();
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can)
    function migrator_stake_for(address staker_address, uint256 amount) external isMigrating {
        require(migratorApprovedForStaker(staker_address, msg.sender), "msg.sender is either an invalid migrator or the staker has not approved them");
        _stake(staker_address, msg.sender, amount);
    }

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can). 
    function migrator_stakeLocked_for(address staker_address, uint256 amount, uint256 secs) external isMigrating {
        require(migratorApprovedForStaker(staker_address, msg.sender), "msg.sender is either an invalid migrator or the staker has not approved them");
        _stakeLocked(staker_address, msg.sender, amount, secs);
    }

    // Used for migrations
    function migrator_withdraw_unlocked(address staker_address) external isMigrating {
        require(migratorApprovedForStaker(staker_address, msg.sender), "msg.sender is either an invalid migrator or the staker has not approved them");
        _withdraw(staker_address, msg.sender, _unlocked_balances[staker_address]);
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
        for (uint i = 0; i < valid_migrators_array.length; i++){ 
            if (valid_migrators_array[i] == migrator_address) {
                valid_migrators_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if(!migrationsOn){
            require(tokenAddress != address(stakingToken), "Cannot withdraw staking tokens unless migration is on"); // Only Governance / Timelock can trigger a migration
        }
        // Only the owner address can ever receive the recovery withdrawal
        ERC20(tokenAddress).transfer(owner_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyByOwnerOrGovernance {
        require(
            periodFinish == 0 || block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration for the new period"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function setMultipliers(uint256 _lock_max_multiplier, uint256 _vefxs_max_multiplier) external onlyByOwnerOrGovernance {
        require(_lock_max_multiplier >= 1, "Multiplier must be greater than or equal to 1");
        require(_vefxs_max_multiplier >= 1, "Max veFXS multiplier must be greater than or equal to 1");

        lock_max_multiplier = _lock_max_multiplier;
        vefxs_max_multiplier = _vefxs_max_multiplier;
        
        emit MaxVeFXSMultiplier(vefxs_max_multiplier);
        emit LockedStakeMaxMultiplierUpdated(lock_max_multiplier);
    }

    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min) external onlyByOwnerOrGovernance {
        require(_lock_time_for_max_multiplier >= 1, "Multiplier Max Time must be greater than or equal to 1");
        require(_lock_time_min >= 1, "Multiplier Min Time must be greater than or equal to 1");
        
        lock_time_for_max_multiplier = _lock_time_for_max_multiplier;

        lock_time_min = _lock_time_min;
        lock_time_min_str = StringHelpers.uint2str(_lock_time_min);

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

    function toggleWithdrawals() external onlyByOwnerOrGovernance {
        withdrawalsPaused = !withdrawalsPaused;
    }

    function toggleRewardsCollection() external onlyByOwnerOrGovernance {
        rewardsCollectionPaused = !rewardsCollectionPaused;
    }

    function setRewardRate(uint256 _new_rate0, bool sync_too) external onlyByOwnerOrGovernance {
        rewardRate0 = _new_rate0;

        if (sync_too){
            sync();
        }
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setTimelock(address _new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = _new_timelock;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount, address source_address );
    event StakeLocked(address indexed user, uint256 amount, uint256 secs, address source_address);
    event Withdrawn(address indexed user, uint256 amount, address destination_address);
    event WithdrawnLocked(address indexed user, uint256 amount, bytes32 kek_id, address destination_address);
    event RewardPaid(address indexed user, uint256 reward, address token_address, address destination_address);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event DefaultInitialization();
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
    event LockedStakeMinTime(uint256 secs);
    event MaxVeFXSMultiplier(uint256 multiplier);
}
