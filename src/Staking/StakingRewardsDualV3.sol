// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
pragma experimental ;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================= StakingRewardsDualV3 =======================
// ====================================================================
// Includes veFXS boost logic
// Unlocked deposits are removed to free up space

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
import "../Uniswap/TransferHelper.sol";
import "../ERC20/SafeERC20.sol";
import "../Frax/Frax.sol";
import "../Uniswap/Interfaces/IUniswapV2Pair.sol";
import "../Utils/ReentrancyGuard.sol";

// Inheritance
import "./Owned.sol";
import "./Pausable.sol";

contract StakingRewardsDualV3 is Owned, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private veFXS;
    ERC20 private rewardsToken0;
    ERC20 private rewardsToken1;
    IUniswapV2Pair private stakingToken;

    // Constant for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant VEFXS_MULTIPLIER_PRECISION = 1e18;

    // Admin addresses
    address public owner_address;
    address public timelock_address; // Governance timelock address

    // Time tracking
    uint256 public periodFinish;
    uint256 public lastUpdateTime;

    // Lock time and multiplier settings
    uint256 public lock_max_multiplier = 3000000; // E6. 1x = 1000000
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years
    uint256 public lock_time_min = 86400; // 1 * 86400  (1 day)

    // veFXS related
    uint256 public vefxs_per_frax_for_max_boost = uint256(5e17); // E18. 5e17 means 0.5 veFXS must be held by the staker per 1 FRAX
    uint256 public vefxs_max_multiplier = uint256(25e17); // E18. 1x = 1e18
    mapping(address => uint256) private _vefxsMultiplierStored;

    // Max reward per second
    uint256 public rewardRate0;
    uint256 public rewardRate1;

    // Reward period
    uint256 public rewardsDuration = 604800; // 7 * 86400  (7 days)

    // Reward tracking
    uint256 public rewardPerTokenStored0 = 0;
    uint256 public rewardPerTokenStored1 = 0;
    mapping(address => uint256) public userRewardPerTokenPaid0;
    mapping(address => uint256) public userRewardPerTokenPaid1;
    mapping(address => uint256) public rewards0;
    mapping(address => uint256) public rewards1;

    // Balance tracking
    uint256 private _total_liquidity_locked = 0;
    uint256 private _total_combined_weight = 0;
    mapping(address => uint256) private _locked_liquidity;
    mapping(address => uint256) private _combined_weights;

    // Uniswap related
    bool frax_is_token0;

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
    bool public token1_rewards_on = true;
    bool public migrationsOn = false; // Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public stakesUnlocked = false; // Release locked stakes in case of system migration or emergency
    bool public withdrawalsPaused = false; // For emergencies
    bool public rewardsCollectionPaused = false; // For emergencies

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
        require(
            msg.sender == owner_address || msg.sender == timelock_address,
            "You are not the owner or the governance timelock"
        );
        _;
    }

    modifier onlyByOwnerOrGovernanceOrMigrator() {
        require(
            msg.sender == owner_address || msg.sender == timelock_address || valid_migrators[msg.sender] == true,
            "You are not the owner, governance timelock, or a migrator"
        );
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

    modifier updateRewardAndBalance(address account, bool sync_too) {
        _updateRewardAndBalance(account, sync_too);
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _rewardsToken0,
        address _rewardsToken1,
        address _stakingToken,
        address _frax_address,
        address _timelock_address,
        address _veFXS_address
    ) Owned(_owner) {
        owner_address = _owner;
        rewardsToken0 = ERC20(_rewardsToken0);
        rewardsToken1 = ERC20(_rewardsToken1);
        stakingToken = IUniswapV2Pair(_stakingToken);
        veFXS = IveFXS(_veFXS_address);

        lastUpdateTime = block.timestamp;
        timelock_address = _timelock_address;

        // 10 FXS a day
        rewardRate0 = (uint256(3650e18)).div(365 * 86400);

        // 1 token1 a day
        rewardRate1 = (uint256(365e18)).div(365 * 86400);

        // Uniswap related. Need to know which token frax is (0 or 1)
        address token0 = stakingToken.token0();
        if (token0 == _frax_address) frax_is_token0 = true;
        else frax_is_token0 = false;

        // Other booleans
        migrationsOn = false;
        stakesUnlocked = false;
    }

    /* ========== VIEWS ========== */

    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    function lockMultiplier(uint256 secs) public view returns (uint256) {
        uint256 lock_multiplier =
            uint256(PRICE_PRECISION).add(
                secs.mul(lock_max_multiplier.sub(PRICE_PRECISION)).div(lock_time_for_max_multiplier)
            );
        if (lock_multiplier > lock_max_multiplier) lock_multiplier = lock_max_multiplier;
        return lock_multiplier;
    }

    // Total locked liquidity tokens
    function lockedLiquidityOf(address account) public view returns (uint256) {
        return _locked_liquidity[account];
    }

    // Total 'balance' used for calculating the percent of the pool the account owns
    // Takes into account the locked stake time multiplier and veFXS multiplier
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function fraxPerLPToken() public view returns (uint256) {
        // Get the amount of FRAX 'inside' of the lp tokens
        uint256 frax_per_lp_token;
        {
            uint256 total_frax_reserves;
            (uint256 reserve0, uint256 reserve1, ) = (stakingToken.getReserves());
            if (frax_is_token0) total_frax_reserves = reserve0;
            else total_frax_reserves = reserve1;

            frax_per_lp_token = total_frax_reserves.mul(1e18).div(stakingToken.totalSupply());
        }
        return frax_per_lp_token;
    }

    function userStakedFrax(address account) public view returns (uint256) {
        return (fraxPerLPToken()).mul(_locked_liquidity[account]).div(1e18);
    }

    function minVeFXSForMaxBoost(address account) public view returns (uint256) {
        return (userStakedFrax(account)).mul(vefxs_per_frax_for_max_boost).div(VEFXS_MULTIPLIER_PRECISION);
    }

    function veFXSMultiplier(address account) public view returns (uint256) {
        // The claimer gets a boost depending on amount of veFXS they have relative to the amount of FRAX 'inside'
        // of their locked LP tokens
        uint256 veFXS_needed_for_max_boost = minVeFXSForMaxBoost(account);
        if (veFXS_needed_for_max_boost > 0) {
            uint256 user_vefxs_fraction =
                (veFXS.balanceOf(account)).mul(VEFXS_MULTIPLIER_PRECISION).div(veFXS_needed_for_max_boost);

            uint256 vefxs_multiplier =
                uint256(VEFXS_MULTIPLIER_PRECISION).add(
                    (user_vefxs_fraction).mul(vefxs_max_multiplier.sub(VEFXS_MULTIPLIER_PRECISION)).div(
                        VEFXS_MULTIPLIER_PRECISION
                    )
                );

            // Cap the boost to the vefxs_max_multiplier
            if (vefxs_multiplier > vefxs_max_multiplier) vefxs_multiplier = vefxs_max_multiplier;

            return vefxs_multiplier;
        } else return VEFXS_MULTIPLIER_PRECISION; // This will happen with the first stake, when user_staked_frax is 0
    }

    function calcCurCombinedWeight(address account)
        public
        view
        returns (
            uint256 old_combined_weight,
            uint256 new_vefxs_multiplier,
            uint256 new_combined_weight
        )
    {
        // Get the old combined weight
        old_combined_weight = _combined_weights[account];

        // Get the new veFXS multiplier
        new_vefxs_multiplier = veFXSMultiplier(account);

        // Loop through the locked stakes, first by getting the liquidity * lock_multiplier portion
        uint256 locked_tally = 0;
        for (uint256 i = 0; i < lockedStakes[account].length; i++) {
            uint256 lock_multiplier = lockedStakes[account][i].lock_multiplier;
            uint256 liquidity = lockedStakes[account][i].liquidity;
            uint256 lock_boosted_portion = liquidity.mul(lock_multiplier).div(PRICE_PRECISION);
            locked_tally = locked_tally.add(lock_boosted_portion);
        }

        // Now factor in the veFXS multiplier
        new_combined_weight = locked_tally.mul(new_vefxs_multiplier).div(VEFXS_MULTIPLIER_PRECISION);
    }

    function rewardPerToken() public view returns (uint256, uint256) {
        if (_total_liquidity_locked == 0) {
            return (rewardPerTokenStored0, rewardPerTokenStored1);
        } else {
            return (
                rewardPerTokenStored0.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate0).mul(1e18).div(
                        _total_combined_weight
                    )
                ),
                rewardPerTokenStored1.add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate1).mul(1e18).div(
                        _total_combined_weight
                    )
                )
            );
        }
    }

    function earned(address account) public view returns (uint256, uint256) {
        (uint256 reward0, uint256 reward1) = rewardPerToken();
        return (
            _combined_weights[account].mul(reward0.sub(userRewardPerTokenPaid0[account])).div(1e18).add(
                rewards0[account]
            ),
            _combined_weights[account].mul(reward1.sub(userRewardPerTokenPaid1[account])).div(1e18).add(
                rewards1[account]
            )
        );
    }

    function getRewardForDuration() external view returns (uint256, uint256) {
        return (rewardRate0.mul(rewardsDuration), rewardRate1.mul(rewardsDuration));
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

    function _updateRewardAndBalance(address account, bool sync_too) internal {
        // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
        if (sync_too) {
            sync();
        }

        if (account != address(0)) {
            // To keep the math correct, the user's combined weight must be recomputed to account for their
            // ever-changing veFXS balance.
            (uint256 old_combined_weight, uint256 new_vefxs_multiplier, uint256 new_combined_weight) =
                calcCurCombinedWeight(account);

            // Optionally update the user's stored veFXS multiplier
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

            if (sync_too) {
                // Calculate the earnings
                (uint256 earned0, uint256 earned1) = earned(account);
                rewards0[account] = earned0;
                rewards1[account] = earned1;
                userRewardPerTokenPaid0[account] = rewardPerTokenStored0;
                userRewardPerTokenPaid1[account] = rewardPerTokenStored1;
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
    function stakeLocked(uint256 liquidity, uint256 secs) public {
        _stakeLocked(msg.sender, msg.sender, liquidity, secs);
    }

    // If this were not internal, and source_address had an infinite approve, this could be exploitable
    // (pull funds from source_address and stake for an arbitrary staker_address)
    function _stakeLocked(
        address staker_address,
        address source_address,
        uint256 liquidity,
        uint256 secs
    ) internal nonReentrant updateRewardAndBalance(staker_address, true) {
        require(
            (paused == false && migrationsOn == false) || valid_migrators[msg.sender] == true,
            "Staking is paused, or migration is happening"
        );
        require(liquidity > 0, "Must stake more than zero");
        require(greylist[staker_address] == false, "Address has been greylisted");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier, "You are trying to lock for too long");

        uint256 lock_multiplier = lockMultiplier(secs);
        uint256 combined_weight_to_add =
            liquidity.mul(lock_multiplier).mul(_vefxsMultiplierStored[staker_address]).div(PRICE_PRECISION).div(
                VEFXS_MULTIPLIER_PRECISION
            );
        bytes32 kek_id = keccak256(abi.encodePacked(staker_address, block.timestamp, liquidity));
        lockedStakes[staker_address].push(
            LockedStake(kek_id, block.timestamp, liquidity, block.timestamp.add(secs), lock_multiplier)
        );

        // Pull the tokens from the source_address
        TransferHelper.safeTransferFrom(address(stakingToken), source_address, address(this), liquidity);

        // Staking token liquidity and combined weight
        _total_liquidity_locked = _total_liquidity_locked.add(liquidity);
        _total_combined_weight = _total_combined_weight.add(combined_weight_to_add);

        // Staking token balance, combined weight, and veFXS multiplier
        _locked_liquidity[staker_address] = _locked_liquidity[staker_address].add(liquidity);
        _combined_weights[staker_address] = _combined_weights[staker_address].add(combined_weight_to_add);

        // Need to call again to make sure everything is correct
        _updateRewardAndBalance(staker_address, false);

        emit StakeLocked(staker_address, liquidity, secs, kek_id, source_address);
    }

    // Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kek_id) public {
        _withdrawLocked(msg.sender, msg.sender, kek_id);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper
    // functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    function _withdrawLocked(
        address staker_address,
        address destination_address,
        bytes32 kek_id
    ) internal nonReentrant notWithdrawalsPaused updateRewardAndBalance(staker_address, true) {
        LockedStake memory thisStake;
        thisStake.liquidity = 0;
        uint256 theArrayIndex;
        for (uint256 i = 0; i < lockedStakes[staker_address].length; i++) {
            if (kek_id == lockedStakes[staker_address][i].kek_id) {
                thisStake = lockedStakes[staker_address][i];
                theArrayIndex = i;
                break;
            }
        }
        require(thisStake.kek_id == kek_id, "Stake not found");
        require(
            block.timestamp >= thisStake.ending_timestamp ||
                stakesUnlocked == true ||
                valid_migrators[msg.sender] == true,
            "Stake is still locked!"
        );

        uint256 liquidity = thisStake.liquidity;

        // updateRewardAndBalance() above should make this math correct and not leave a gap
        uint256 combined_weight_to_sub =
            liquidity
                .mul(thisStake.lock_multiplier)
                .mul(_vefxsMultiplierStored[staker_address])
                .div(PRICE_PRECISION)
                .div(VEFXS_MULTIPLIER_PRECISION);

        if (liquidity > 0) {
            // Staking token liquidity and combined weight
            _total_liquidity_locked = _total_liquidity_locked.sub(liquidity);
            _total_combined_weight = _total_combined_weight.sub(combined_weight_to_sub);

            // Staking token balance and combined weight
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address].sub(liquidity);
            _combined_weights[staker_address] = _combined_weights[staker_address].sub(combined_weight_to_sub);

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Need to call again to make sure everything is correct
            _updateRewardAndBalance(staker_address, false);

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            stakingToken.transfer(destination_address, liquidity);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }
    }

    // Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() external returns (uint256, uint256) {
        return _getReward(msg.sender, msg.sender);
    }

    // No withdrawer == msg.sender check needed since this is only internally callable
    // This distinction is important for the migrator
    function _getReward(address rewardee, address destination_address)
        internal
        nonReentrant
        notRewardsCollectionPaused
        updateRewardAndBalance(rewardee, true)
        returns (uint256 reward0, uint256 reward1)
    {
        reward0 = rewards0[rewardee];
        reward1 = rewards1[rewardee];
        if (reward0 > 0) {
            rewards0[rewardee] = 0;
            rewardsToken0.transfer(destination_address, reward0);
            emit RewardPaid(rewardee, reward0, address(rewardsToken0), destination_address);
        }
        // if (token1_rewards_on){
        if (reward1 > 0) {
            rewards1[rewardee] = 0;
            rewardsToken1.transfer(destination_address, reward1);
            emit RewardPaid(rewardee, reward1, address(rewardsToken1), destination_address);
        }
        // }
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
        uint256 balance0 = rewardsToken0.balanceOf(address(this));
        uint256 balance1 = rewardsToken1.balanceOf(address(this));
        require(
            rewardRate0.mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance0,
            "Not enough FXS available for rewards!"
        );

        if (token1_rewards_on) {
            require(
                rewardRate1.mul(rewardsDuration).mul(num_periods_elapsed + 1) <= balance1,
                "Not enough token1 available for rewards!"
            );
        }

        // uint256 old_lastUpdateTime = lastUpdateTime;
        // uint256 new_lastUpdateTime = block.timestamp;

        // lastUpdateTime = periodFinish;
        periodFinish = periodFinish.add((num_periods_elapsed.add(1)).mul(rewardsDuration));

        (uint256 reward0, uint256 reward1) = rewardPerToken();
        rewardPerTokenStored0 = reward0;
        rewardPerTokenStored1 = reward1;
        lastUpdateTime = lastTimeRewardApplicable();

        emit RewardsPeriodRenewed(address(stakingToken));
    }

    function sync() public {
        if (block.timestamp > periodFinish) {
            retroCatchUp();
        } else {
            (uint256 reward0, uint256 reward1) = rewardPerToken();
            rewardPerTokenStored0 = reward0;
            rewardPerTokenStored1 = reward1;
            lastUpdateTime = lastTimeRewardApplicable();
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can).
    function migrator_stakeLocked_for(
        address staker_address,
        uint256 amount,
        uint256 secs
    ) external isMigrating {
        require(
            migratorApprovedForStaker(staker_address, msg.sender),
            "msg.sender is either an invalid migrator or the staker has not approved them"
        );
        _stakeLocked(staker_address, msg.sender, amount, secs);
    }

    // Used for migrations
    function migrator_withdraw_locked(address staker_address, bytes32 kek_id) external isMigrating {
        require(
            migratorApprovedForStaker(staker_address, msg.sender),
            "msg.sender is either an invalid migrator or the staker has not approved them"
        );
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
        for (uint256 i = 0; i < valid_migrators_array.length; i++) {
            if (valid_migrators_array[i] == migrator_address) {
                valid_migrators_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if (!migrationsOn) {
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

    function setMultipliers(
        uint256 _lock_max_multiplier,
        uint256 _vefxs_max_multiplier,
        uint256 _vefxs_per_frax_for_max_boost
    ) external onlyByOwnerOrGovernance {
        require(_lock_max_multiplier >= uint256(1e6), "Multiplier must be greater than or equal to 1e6");
        require(_vefxs_max_multiplier >= uint256(1e18), "Max veFXS multiplier must be greater than or equal to 1e18");
        require(_vefxs_per_frax_for_max_boost > 0, "veFXS per FRAX must be greater than 0");

        lock_max_multiplier = _lock_max_multiplier;
        vefxs_max_multiplier = _vefxs_max_multiplier;
        vefxs_per_frax_for_max_boost = _vefxs_per_frax_for_max_boost;

        emit MaxVeFXSMultiplier(vefxs_max_multiplier);
        emit LockedStakeMaxMultiplierUpdated(lock_max_multiplier);
        emit veFXSPerFraxForMaxBoostUpdated(vefxs_per_frax_for_max_boost);
    }

    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min)
        external
        onlyByOwnerOrGovernance
    {
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

    function toggleWithdrawals() external onlyByOwnerOrGovernance {
        withdrawalsPaused = !withdrawalsPaused;
    }

    function toggleRewardsCollection() external onlyByOwnerOrGovernance {
        rewardsCollectionPaused = !rewardsCollectionPaused;
    }

    function setRewardRates(
        uint256 _new_rate0,
        uint256 _new_rate1,
        bool sync_too
    ) external onlyByOwnerOrGovernance {
        rewardRate0 = _new_rate0;
        rewardRate1 = _new_rate1;

        if (sync_too) {
            sync();
        }
    }

    function toggleToken1Rewards() external onlyByOwnerOrGovernance {
        if (token1_rewards_on) {
            rewardRate1 = 0;
        }
        token1_rewards_on = !token1_rewards_on;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setTimelock(address _new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = _new_timelock;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    event WithdrawLocked(address indexed user, uint256 amount, bytes32 kek_id, address destination_address);
    event RewardPaid(address indexed user, uint256 reward, address token_address, address destination_address);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsPeriodRenewed(address token);
    event DefaultInitialization();
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);
    event LockedStakeTimeForMaxMultiplier(uint256 secs);
    event LockedStakeMinTime(uint256 secs);
    event MaxVeFXSMultiplier(uint256 multiplier);
    event veFXSPerFraxForMaxBoostUpdated(uint256 scale_factor);
}
