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
// ==================== FraxCrossChainFarmV4_ERC20 ====================
// ====================================================================
// No veFXS logic
// Because of lack of cross-chain reading of the gauge controller's emission rate,
// the contract sets its reward based on its token balance(s)
// Rolling 7 day reward period idea credit goes to denett
// rewardRate0 and rewardRate1 will look weird as people claim, but if you track the rewards actually emitted,
// the numbers do check out
// V3: Accepts canonicalFXS directly from Fraxferry and does not swap out
// V4: Adds variable number of rewards by using arrays instead of fixed names

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

// Originally inspired by Synthetix.io, but heavily modified by the Frax team
// https://raw.githubusercontent.com/Synthetixio/synthetix/develop/contracts/StakingRewards.sol

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../Curve/FraxCrossChainRewarder.sol";
import "../ERC20/__CROSSCHAIN/IanyFXS.sol";
import "../ERC20/__CROSSCHAIN/CrossChainCanonicalFXS.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";

// import '../Misc_AMOs/balancer/IBalancerVault.sol'; // Balancer frxETH-bb-a-WETH Gauge
// import '../Misc_AMOs/balancer/IBalancerChildLiquidityGauge.sol'; // Balancer frxETH-bb-a-WETH Gauge
// import '../Misc_AMOs/balancer/IL2BalancerPseudoMinter.sol'; // Balancer frxETH-bb-a-WETH Gauge
// import '../Misc_AMOs/balancer/IStablePool.sol'; // Balancer frxETH-bb-a-WETH Gauge
import "../Oracle/AggregatorV3Interface.sol"; // Balancer frxETH-bb-a-WETH Gauge and Convex frxETH/XXXETH
import '../Misc_AMOs/convex/IConvexCvxLPRewardPoolCombo.sol'; // Convex cvxLP/RewardPool Combo
import '../Misc_AMOs/curve/ICurveChildLiquidityGauge.sol'; // Convex cvxLP/RewardPool Combo
// import '../Misc_AMOs/curve/I2pool.sol'; // Curve 2-token
// import '../Misc_AMOs/curve/I2poolTokenNoLending.sol'; // Curve 2-token (No Lending)
// import '../Misc_AMOs/curve/I3pool.sol'; // Curve 3-token
// import '../Misc_AMOs/curve/I3poolAndToken.sol'; // Curve 3-token with pool
import '../Misc_AMOs/curve/ICurveStableSwapNG.sol'; // Curve 2-token Stable NG
// import '../Misc_AMOs/kyberswap/elastic/IKSElasticLMV2.sol'; // KyberSwap Elastic
// import '../Misc_AMOs/kyberswap/elastic/IKyberSwapFarmingToken.sol'; // KyberSwap Elastic
// import '../Misc_AMOs/kyberswap/elastic/IKSReinvestmentTokenPool.sol'; // KyberSwap Elastic
// import "../Misc_AMOs/kyberswap/factory/IKyberFactory.sol"; // KyberSwap Elastic
// import "../Misc_AMOs/kyberswap/elastic/IKyberSwapFarmingToken.sol"; // KyberSwap Elastic
// import "../Oracle/ComboOracle_KyberSwapElasticV2.sol"; // KyberSwap Elastic
// import '../Misc_AMOs/mstable/IFeederPool.sol'; // mStable
// import '../Misc_AMOs/impossible/IStableXPair.sol'; // Impossible
// import '../Misc_AMOs/mstable/IFeederPool.sol'; // mStable
// import '../Misc_AMOs/saddle/ISaddleLPToken.sol'; // Saddle Arbitrum L2D4
// import '../Misc_AMOs/saddle/ISaddlePermissionlessSwap.sol'; // Saddle Arbitrum L2D4
// import '../Misc_AMOs/sentiment/ILToken.sol'; // Sentiment LFrax
// import '../Misc_AMOs/snowball/ILPToken.sol'; // Snowball S4D - [Part 1]
// import '../Misc_AMOs/snowball/ISwapFlashLoan.sol'; // Snowball S4D - [Part 2]
// import '../Uniswap/Interfaces/IUniswapV2Pair.sol'; // Uniswap V2

import "../Utils/ReentrancyGuard.sol";

// Inheritance
import "./Owned.sol";


/// @title FraxCrossChainFarmV4_ERC20
/// @notice Used as a farm, usually fed by rewards dropped in from various sources
contract FraxCrossChainFarmV4_ERC20 is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    /// @notice Future address of veFXS, if applicable
    IveFXS public veFXS;

    /// @notice Array of all the reward tokens
    address[] public rewardTokens;
    
    // // KyberSwap Elastic
    // // Manually set during deploy
    // // ===================================================================
    // // <>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>
    // IKyberSwapFarmingToken public stakingToken; // KyberSwap Elastic
    // ComboOracle_KyberSwapElasticV2 public KSE_ComboOracleV2 = ComboOracle_KyberSwapElasticV2(0xfBCB0F967817c924f83e26e04F0FB28ED4d6276F);  // KyberSwap Elastic
    // IKyberFactory public immutable kyber_factory = IKyberFactory(0xC7a590291e07B9fe9E64b86c58fD8fC764308C4A);  // KyberSwap Elastic
    // // Need to seed a starting token to use both as a basis for fraxPerLPToken
    // // as well as getting ticks, etc
    // uint256 public seed_token_id = 7366; 
    
    // function setSeedTokenID(uint256 _seed_token_id) public onlyByOwnGov {
    //     seed_token_id = _seed_token_id;
    // }

    // function setKyberSwapElasticComboOracle(address _kse_combo_oracle_address) public onlyByOwnGov {
    //     KSE_ComboOracleV2 = ComboOracle_KyberSwapElasticV2(_kse_combo_oracle_address);
    // }
    // // <>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>KYBERSWAP<>


    // Balancer frxETH-bb-a-WETH Gauge or Convex frxETH/XXXETH
    // IBalancerChildLiquidityGauge public stakingToken; // Balancer frxETH-bb-a-WETH Gauge
    // AggregatorV3Interface internal priceFeedETHUSD = AggregatorV3Interface(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612); // For Balancer frxETH-bb-a-WETH Gauge
    // function setETHUSDOracle(address _eth_usd_oracle_address) public onlyByOwnGov {
    //     require(_eth_usd_oracle_address != address(0), "Zero address detected");

    //     priceFeedETHUSD = AggregatorV3Interface(_eth_usd_oracle_address);
    // }
    // function getLatestETHPriceE8() public view returns (int) {
    //     // Returns in E8
    //     (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedETHUSD.latestRoundData();
    //     require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        
    //     return price;
    // }
    
    /// @notice The token being staked
    // I2pool public stakingToken; // Curve 2-token
    // I3pool public stakingToken; // Curve 3-token
    // I3poolAndToken public stakingToken; // Curve 3-token with pool
    IConvexCvxLPRewardPoolCombo public stakingToken; // Convex cvxLP/RewardPool combo
    // IStableXPair public stakingToken; // Impossible
    // IFeederPool public stakingToken; // mStable
    // ISaddleLPToken public stakingToken; // Saddle L2D4
    // ILToken public stakingToken; // Sentiment LFrax
    // ILPToken public stakingToken; // Snowball S4D
    // IUniswapV2Pair public stakingToken; // Uniswap V2

    /// @notice An address where rewards are pulled from, if applicable
    FraxCrossChainRewarder public rewarder;

    /// @notice The address of FRAX
    address public fraxAddress;
    
    /// @notice Constant for various precisions
    uint256 private constant MULTIPLIER_PRECISION = 1e18;

    /// @notice Governance timelock address
    address public timelockAddress;

    /// @notice Gauge controller, if present
    address public controllerAddress;

    /// @notice The time the rewards period should finish
    uint256 public periodFinish;

    /// @notice The last time this contract was updated
    uint256 public lastUpdateTime;

    /// @notice The max weight multiplier you can get for locking your position
    uint256 public lock_max_multiplier = uint256(3e18); // E18. 1x = e18

    /// @notice The lock time needed to get the max weight multiplier
    uint256 public lock_time_for_max_multiplier = 3 * 365 * 86400; // 3 years

    /// @notice The minimum lock time required
    uint256 public lock_time_min = 1; // 1 second

    /// @notice How much veFXS you must have, per Frax in the LP, in order to get the veFXS boost, if applicable
    uint256 public vefxs_per_frax_for_max_boost = uint256(4e18); // E18. 4e18 means 4 veFXS must be held by the staker per 1 FRAX
    
    /// @notice The max weight multiplier you can get for having veFXS
    uint256 public vefxs_max_multiplier = uint256(2e18); // E18. 1x = 1e18

    /// @notice Tracks the veFXS multiplier of a user
    mapping(address => uint256) private _vefxsMultiplierStored;

    /// @notice The reward tokens per second
    uint256[] public rewardRates;

    /// @notice Helper to see if a token is a reward token on this farm
    mapping(address => bool) internal isRewardToken;

    /// @notice Helper to get the reward token index, given the address of the token
    mapping(address => uint256) public rewardTokenAddrToIdx;

    /// @notice The duration of each rewards period
    uint256 public rewardsDuration = 604800; // 7 * 86400 (7 days). 

    /// @notice The total amount of reward tokens owed to all farmers. Always increments
    /// @dev Technically ttlRewsOwed - ttlRewsPaid is what is actually uncollected, but both have to always be increasing
    /// for the tracking to work
    uint256[] public ttlRewsOwed;

    /// @notice The total amount of reward tokens paid out to all farmers
    uint256[] public ttlRewsPaid;

    /// @notice Accumulator for rewardsPerToken
    // https://www.paradigm.xyz/2021/05/liquidity-mining-on-uniswap-v3
    uint256[] private rewardsPerTokenStored;

    /// @notice Accumulator for userRewardsPerTokenPaid
    mapping(address => mapping(uint256 => uint256)) private userRewardsPerTokenPaid; // staker addr -> token id -> paid amount
    
    /// @notice Used for tracking current rewards
    mapping(address => mapping(uint256 => uint256)) private rewards; // staker addr -> token id -> reward amount
    
    /// @notice The last time rewards were pulled in
    uint256 public lastRewardPull;

    /// @notice The last time a farmer claimed their rewards
    mapping(address => uint256) internal lastRewardClaimTime; // staker addr -> timestamp

    /// @notice Total amount of LP in the farm
    uint256 private _total_liquidity_locked;

    /// @notice Total weight of farmers, which takes LP amount, veFXS balances, and time locked
    uint256 private _total_combined_weight;

    /// @notice A particular farmer's locked LP balance
    mapping(address => uint256) private _locked_liquidity;

    /// @notice A particular farmer's weight
    mapping(address => uint256) private _combined_weights;

    // Uniswap V2 / Impossible ONLY
    /// @notice If FRAX is token0
    bool frax_is_token0;

    /// @notice Locked stake positions for a farmer
    mapping(address => LockedStake[]) public lockedStakes;

    /// @notice List of valid migrators (set by governance)
    mapping(address => bool) public valid_migrators;

    /// @notice Stakers set which migrator(s) they want to use
    mapping(address => mapping(address => bool)) public staker_allowed_migrators;

    /// @notice Used for migrations. Prevents new stakes, but allows LP and reward withdrawals
    bool public migrationsOn;

    /// @notice Release locked stakes in case of system migration or emergency
    bool public stakesUnlocked;
    
    /// @notice If withdrawals are paused
    bool public withdrawalsPaused; 
    
    /// @notice If reward collections are paused
    bool public rewardsCollectionPaused; // For emergencies
    
    /// @notice If staking is paused
    bool public stakingPaused; // For emergencies
    
    // For emergencies if a token is overemitted or something else. Only callable once.
    // Bypasses certain logic, which will cause reward calculations to be off
    // But the goal is for the users to recover LP, and they couldn't claim the erroneous rewards anyways.
    // Reward reimbursement claims would be handled with pre-issue earned() snapshots and a claim contract, or similar.
    bool public withdrawalOnlyShutdown; 
    
    /// @notice If this contract has been initialized
    bool public isInitialized;

    /// @notice Version
    string public version = "0.0.9";

    /* ========== STRUCTS ========== */
    
    /// @notice Information about a particular locked stake
    /// @param kek_id A unique ID for the stake
    /// @param start_timestamp When the stake was locked
    /// @param liquidity How much LP the stake has
    /// @param ending_timestamp When the stake should be unlocked
    /// @param lock_multiplier Initial weight multiplier from the lock time component. 
    struct LockedStake {
        bytes32 kek_id;
        uint256 start_timestamp;
        uint256 liquidity;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
    }

    /* ========== MODIFIERS ========== */

    /// @notice Only governance should be able to call
    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelockAddress, "Not owner or timelock");
        _;
    }

    /// @notice Only governance or the controller should be able to call
    modifier onlyByOwnGovCtrlr() {
        require(msg.sender == owner || msg.sender == timelockAddress || msg.sender == controllerAddress, "Not own, tlk, or ctrlr");
        _;
    }

    /// @notice Should be in migration
    modifier isMigrating() {
        require(migrationsOn == true, "Not in migration");
        _;
    }

    /// @notice Staking should not be paused
    modifier notStakingPaused() {
        require(!stakingPaused, "Staking paused");
        _;
    }

    /// @notice Update rewards and balances
    modifier updateRewardAndBalance(address account, bool sync_too) {
        _updateRewardAndBalance(account, sync_too, false);
        _;
    }
    
    /* ========== CONSTRUCTOR ========== */

    /// @notice Constructor
    /// @param _owner The owner of the farm
    /// @param _rewardTokens Array of reward tokens
    /// @param _stakingToken The LP token being staked
    /// @param _fraxAddress Address of FRAX
    /// @param _timelockAddress Address of the timelock
    /// @param _rewarder_address Address of the rewarder contract, if applicable
    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address _stakingToken,
        address _fraxAddress,
        address _timelockAddress,
        address _rewarder_address
    ) Owned(_owner){
        // Set state variables
        fraxAddress = _fraxAddress;
        rewardTokens = _rewardTokens;
        
        // Loop thought the reward tokens
        for (uint256 i = 0; i < _rewardTokens.length; i++) { 
            // For fast token address -> token ID lookups later
            rewardTokenAddrToIdx[_rewardTokens[i]] = i;

            // Add to the mapping
            isRewardToken[_rewardTokens[i]] = true;

            // Initialize the stored rewards
            rewardsPerTokenStored.push(0);

            // Initialize the rewards owed and paid
            ttlRewsOwed.push(0);
            ttlRewsPaid.push(0);

            // Initialize the reward rates
            rewardRates.push(0);
        }

        // stakingToken = IBalancerChildLiquidityGauge(_stakingToken); // Balancer frxETH-bb-a-WETH Gauge
        stakingToken = IConvexCvxLPRewardPoolCombo(_stakingToken);
        // stakingToken = I2pool(_stakingToken);
        // stakingToken = I3pool(_stakingToken);
        // stakingToken = I3poolAndToken(_stakingToken);
        // stakingToken = IStableXPair(_stakingToken);
        // stakingToken = IFeederPool(_stakingToken);
        // stakingToken = ISaddleLPToken(_stakingToken);
        // stakingToken = ILToken(_stakingToken);
        // stakingToken = ILPToken(_stakingToken);
        // stakingToken = IUniswapV2Pair(_stakingToken);
        // stakingToken = IKyberSwapFarmingToken(_stakingToken); // KyberSwap Elastic

        timelockAddress = _timelockAddress;
        rewarder = FraxCrossChainRewarder(_rewarder_address);

        // Uniswap V2 / Impossible ONLY
        // Need to know which token FRAX is (0 or 1)
        // address token0 = stakingToken.token0();
        // if (token0 == fraxAddress) frax_is_token0 = true;
        // else frax_is_token0 = false;
        
        // Other booleans
        migrationsOn = false;
        stakesUnlocked = false;

        // For initialization
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
    }

    /* ========== VIEWS ========== */

    /// @notice Total locked liquidity tokens
    /// @return uint256 Total amount of LP tokens in the farm
    function totalLiquidityLocked() external view returns (uint256) {
        return _total_liquidity_locked;
    }

    /// @notice Locked liquidity for a given account
    /// @return uint256 Total amount of LP tokens in the farm for a specific user
    function lockedLiquidityOf(address account) external view returns (uint256) {
        return _locked_liquidity[account];
    }

    /// @notice Total 'balance' used for calculating the percent of the pool the account owns
    /// @return uint256 The combined weight. Takes into account the locked stake time multiplier and veFXS multiplier
    function totalCombinedWeight() external view returns (uint256) {
        return _total_combined_weight;
    }

    /// @notice Combined weight for a specific account
    /// @return uint256 The combined weight.
    function combinedWeightOf(address account) external view returns (uint256) {
        return _combined_weights[account];
    }

    /// @notice All the locked stakes for a given account
    /// @return LockedStake Array of LockedStakes
    function lockedStakesOf(address account) external view returns (LockedStake[] memory) {
        return lockedStakes[account];
    }

    /// @notice The lock multiplier for a given amount of seconds
    /// @param secs Number of seconds you are locking
    /// @return uint256 The lock multiplier
    function lockMultiplier(uint256 secs) public view returns (uint256) {
        return Math.min(
            lock_max_multiplier,
            (secs * lock_max_multiplier) / lock_time_for_max_multiplier
        ) ;
    }

    /// @notice The last time rewards were applicable. Should be the lesser of the current timestamp, or the end of the last period
    /// @return uint256 The last timestamp where rewards were applicable
    function lastTimeRewardApplicable() internal view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    /// @notice How much Frax per 1 LP token
    /// @return uint256 Amount of Frax
    function fraxPerLPToken() public view returns (uint256) {
        // Get the amount of FRAX 'inside' of the lp tokens
        uint256 frax_per_lp_token;

        // Balancer frxETH-bb-a-WETH Gauge
        // ============================================
        // {
        //     IBalancerVault vault = IBalancerVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
        //     /**
        //     * `cash` is the number of tokens the Vault currently holds for the Pool. `managed` is the number of tokens
        //     * withdrawn and held outside the Vault by the Pool's token Asset Manager. The Pool's total balance for `token`
        //     * equals the sum of `cash` and `managed`.
        //     */
        
        //     (uint256 cash, uint256 managed, , ) = vault.getPoolTokenInfo(0xd00f9ca46ce0e4a63067c4657986f0167b0de1e5000000000000000000000b42, 0xEe327F889d5947c1dc1934Bb208a1E792F953E96);
        //     uint256 frxETH_usd_val_per_lp_e8 = ((cash + managed) * uint256(getLatestETHPriceE8())) / stakingToken.totalSupply();
        //     frax_per_lp_token = frxETH_usd_val_per_lp_e8 * (1e10); // We use USD as "Frax" here. Scale up to E18
        // }

        // Convex cvxLP/RewardPool Combo
        // ============================================
        // {
        //     // Half of the LP is FRAXBP. Half of that should be FRAX.
        //     // Using 0.25 * virtual price for gas savings
        //     ICurveChildLiquidityGauge gauge = ICurveChildLiquidityGauge(stakingToken.curveGauge());
        //     I3pool pool = I3pool(gauge.lp_token());
        //     frax_per_lp_token = pool.get_virtual_price() / 4; 
        // }

        // Convex cvxfrxETH/XXXETH
        // ============================================
        // {
        //     // Get the pool
        //     ICurveChildLiquidityGauge gauge = ICurveChildLiquidityGauge(stakingToken.curveGauge());
        //     I2poolTokenNoLending pool = I2poolTokenNoLending(gauge.lp_token());

        //     // Assume frxETH = ETH for pricing purposes
        //     // Get the USD value of the frxETH per LP token
        //     uint256 frxETH_in_pool = IERC20(0x178412e79c25968a32e89b11f63B33F733770c2A).balanceOf(address(pool));
        //     uint256 frxETH_usd_val_per_lp_e8 = (frxETH_in_pool * uint256(getLatestETHPriceE8())) / pool.totalSupply();
        //     frax_per_lp_token = frxETH_usd_val_per_lp_e8 * (1e10); // We use USD as "Frax" here
        // }

        // Convex FRAX/FXB
        // ============================================
        {
            // Count both FRAX and FXB as both are beneficial
            ICurveChildLiquidityGauge gauge = ICurveChildLiquidityGauge(stakingToken.curveGauge());
            ICurveStableSwapNG curvePool = ICurveStableSwapNG(gauge.lp_token());
            frax_per_lp_token = curvePool.get_virtual_price(); 
        }

        // Curve 2-token (No Lending)
        // ============================================
        // {
        //     // Get the pool
        //     ICurveChildLiquidityGauge gauge = ICurveChildLiquidityGauge(stakingToken.curveGauge());
        //     I2poolTokenNoLending pool = I2poolTokenNoLending(gauge.lp_token());
        //     address coin0 = pool.coins(0);
        //     uint256 total_frax_reserves;
        //     uint256[2] memory _balanceResults = pool.get_balances();
        //     if (coin0 == fraxAddress) {
        //         total_frax_reserves = _balanceResults[0];
        //     }
        //     else {
        //         total_frax_reserves = _balanceResults[1];
        //     }
        //     frax_per_lp_token = total_frax_reserves.mul(1e18).div(pool.totalSupply());
        // }

    
        // Curve 3-token
        // ============================================
        // {
        //     address coin0 = stakingToken.coins(0);
        //     address coin1 = stakingToken.coins(1);
        //     uint256 total_frax_reserves;
        //     if (coin0 == fraxAddress) {
        //         total_frax_reserves = stakingToken.balances(0);
        //     }
        //     else if (coin1 == fraxAddress) {
        //         total_frax_reserves = stakingToken.balances(1);
        //     }
        //     else {
        //         total_frax_reserves = stakingToken.balances(2);
        //     }
        //     frax_per_lp_token = total_frax_reserves.mul(1e18).div(stakingToken.totalSupply());
        // }

        // Curve 3pool metapool (FRAXBP/Stable)
        // ============================================
        // {
        //     // Half of the LP is FRAXBP. Half of that should be FRAX.
        //     // Using 0.25 * virtual price for gas savings
        //     frax_per_lp_token = stakingToken.get_virtual_price() / 4; 
        // }

        // KyberSwap Elastic
        // ============================================
        // {
        //     // Fetch total pool TVL using the seed token id
        //     ComboOracle_KyberSwapElasticV2.NFTValueInfo memory nft_value_info = KSE_ComboOracleV2.getNFTValueInfo(seed_token_id);

        //     // Assume half of the liquidity is FRAX or FRAX-related, even if it is not.
        //     frax_per_lp_token = (nft_value_info.pool_tvl_usd * MULTIPLIER_PRECISION) / (stakingToken.totalSupply() * 2);
        // }

        // mStable
        // ============================================
        // {
        //     uint256 total_frax_reserves;
        //     (, IFeederPool.BassetData memory vaultData) = (stakingToken.getBasset(fraxAddress));
        //     total_frax_reserves = uint256(vaultData.vaultBalance);
        //     frax_per_lp_token = total_frax_reserves.mul(1e18).div(stakingToken.totalSupply());
        // }

        // Saddle L2D4
        // ============================================
        // {
        //     ISaddlePermissionlessSwap ISPS = ISaddlePermissionlessSwap(0xF2839E0b30B5e96083085F498b14bbc12530b734);
        //     uint256 total_frax = ISPS.getTokenBalance(ISPS.getTokenIndex(fraxAddress));
        //     frax_per_lp_token = total_frax.mul(1e18).div(stakingToken.totalSupply());
        // }

        // Most Saddles / Snowball S4D
        // ============================================
        // {
        //     ISwapFlashLoan ISFL = ISwapFlashLoan(0xfeEa4D1BacB0519E8f952460A70719944fe56Ee0);
        //     uint256 total_frax = ISFL.getTokenBalance(ISFL.getTokenIndex(fraxAddress));
        //     frax_per_lp_token = total_frax.mul(1e18).div(stakingToken.totalSupply());
        // }

        // Sentiment LFrax
        // ============================================
        // {
        //     frax_per_lp_token = stakingToken.convertToAssets(1e18);
        // }

        // Uniswap V2 & Impossible
        // ============================================
        // {
        //     uint256 total_frax_reserves;
        //     (uint256 reserve0, uint256 reserve1, ) = (stakingToken.getReserves());
        //     if (frax_is_token0) total_frax_reserves = reserve0;
        //     else total_frax_reserves = reserve1;

        //     frax_per_lp_token = total_frax_reserves.mul(1e18).div(stakingToken.totalSupply());
        // }



        return frax_per_lp_token;
    }

    /// @notice Amount of Frax in the user's locked LP
    /// @param account Address of the user
    /// @return uint256 Amount of Frax
    function userStakedFrax(address account) public view returns (uint256) {
        return (fraxPerLPToken()).mul(_locked_liquidity[account]).div(1e18);
    }

    /// @notice Minimum amount of veFXS a user needs to have to get the max veFXS boost, given their current position
    /// @param account Address of the user
    /// @return uint256 Amount of veFXS needed
    function minVeFXSForMaxBoost(address account) public view returns (uint256) {
        return (userStakedFrax(account)).mul(vefxs_per_frax_for_max_boost).div(MULTIPLIER_PRECISION);
    }

    /// @notice The weight boost multiplier from veFXS
    /// @param account Address of the user
    /// @return uint256 The multiplier
    function veFXSMultiplier(address account) public view returns (uint256) {
        if (address(veFXS) != address(0)){
            // The claimer gets a boost depending on amount of veFXS they have relative to the amount of FRAX 'inside'
            // of their locked LP tokens
            uint256 veFXS_needed_for_max_boost = minVeFXSForMaxBoost(account);
            if (veFXS_needed_for_max_boost > 0){ 
                uint256 user_vefxs_fraction = (veFXS.balanceOf(account)).mul(MULTIPLIER_PRECISION).div(veFXS_needed_for_max_boost);
                
                uint256 vefxs_multiplier = ((user_vefxs_fraction).mul(vefxs_max_multiplier)).div(MULTIPLIER_PRECISION);

                // Cap the boost to the vefxs_max_multiplier
                if (vefxs_multiplier > vefxs_max_multiplier) vefxs_multiplier = vefxs_max_multiplier;

                return vefxs_multiplier;        
            }
            else return 0; // This will happen with the first stake, when user_staked_frax is 0
        }
        else return 0;
    }

    /// @notice The current lock multiplier, due to time, for a given stake. Decays with time
    /// @param account Address of the user
    /// @param stake_idx Index of the stake
    /// @return midpoint_lock_multiplier The current lock multiplier
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

    /// @notice Calculate the combined weight for an account
    /// @param account Address of the user
    /// @return old_combined_weight The old combined weight for the user
    /// @return new_vefxs_multiplier The new veFXS multiplier
    /// @return new_combined_weight The new combined weight for the user
    function calcCurCombinedWeight(address account) public view
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

    /// @notice The calculated rewardPerTokenStored accumulator
    /// @return _rtnRewardsPerTokenStored Array of rewardsPerTokenStored
    function rewardPerToken() public view returns (uint256[] memory _rtnRewardsPerTokenStored) {
        _rtnRewardsPerTokenStored = new uint256[](rewardTokens.length);
        if (_total_liquidity_locked == 0 || _total_combined_weight == 0) {
            _rtnRewardsPerTokenStored = rewardsPerTokenStored;
        }
        else {
            // Loop through the reward tokens
            for (uint256 i = 0; i < rewardTokens.length; i++) { 
                _rtnRewardsPerTokenStored[i] = rewardsPerTokenStored[i].add(
                    lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRates[i]).mul(1e18).div(_total_combined_weight)
                );
            }
        }

    }

    /// @notice The currently earned rewards for a user
    /// @param account The staker's address
    /// @return _rtnEarned Array of the amounts of reward tokens the staker can currently collect
    function earned(address account) public view returns (uint256[] memory _rtnEarned) {
        _rtnEarned = new uint256[](rewardTokens.length);
        if (_combined_weights[account] == 0){
            for (uint256 i = 0; i < rewardTokens.length; i++) { 
                _rtnEarned[i] = 0;
            }
        }
        else {
            uint256[] memory _rtnRewardsPerToken = rewardPerToken();

            // Loop through the reward tokens
            for (uint256 i = 0; i < rewardTokens.length; i++) { 
                _rtnEarned[i] = (_combined_weights[account].mul(_rtnRewardsPerToken[i].sub(userRewardsPerTokenPaid[account][i]))).div(1e18).add(rewards[account][i]);
            }
        }

    }

    /// @notice The duration (usually weekly) reward amounts for each token
    /// @return _rtnRewardForDuration Array of the amounts of the reward tokens
    function getRewardForDuration() external view returns (uint256[] memory _rtnRewardForDuration) {
        _rtnRewardForDuration = new uint256[](rewardTokens.length);
        for (uint256 i = 0; i < rewardTokens.length; i++) { 
            _rtnRewardForDuration[i] = rewardRates[i].mul(rewardsDuration);
        }
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// @notice Fetch a stake for a user
    /// @param staker_address The address of the user
    /// @param kek_id The kek_id of the stake
    /// @return locked_stake The stake information, as a LockedStake
    /// @return arr_idx The array index of the stake
    function _getStake(address staker_address, bytes32 kek_id) internal view returns (LockedStake memory locked_stake, uint256 arr_idx) {
        if (kek_id != 0) {
            for (uint256 i = 0; i < lockedStakes[staker_address].length; i++) { 
                if (kek_id == lockedStakes[staker_address][i].kek_id){
                    locked_stake = lockedStakes[staker_address][i];
                    arr_idx = i;
                    break;
                }
            }
        }
        require(kek_id != 0 && locked_stake.kek_id == kek_id, "Stake not found");
        
    }

    /// @notice Update the reward and balance state for a staker
    /// @param account The address of the user
    /// @param sync_too If the non-user state should be synced too
    /// @param pre_sync_vemxstored The pre-sync veFXS multiplier
    function _updateRewardAndBalance(address account, bool sync_too, bool pre_sync_vemxstored) internal {
        // Skip certain functions if we are in an emergency shutdown
        if (!withdrawalOnlyShutdown) {
            // Need to retro-adjust some things if the period hasn't been renewed, then start a new one
            if (sync_too){
                sync();
            }
        }
        
        // Used to make sure the veFXS multiplier is correct if a stake is increased, before calcCurCombinedWeight
        if (pre_sync_vemxstored){
            _vefxsMultiplierStored[account] = veFXSMultiplier(account);
        }

        if (account != address(0)) {
            // To keep the math correct, the user's combined weight must be recomputed to account for their
            // ever-changing veFXS balance.
            (   
                uint256 old_combined_weight,
                uint256 new_vefxs_multiplier,
                uint256 new_combined_weight
            ) = calcCurCombinedWeight(account);

            // Calculate the earnings first
            // Skip if we are in emergency shutdown
            if (!withdrawalOnlyShutdown) _syncEarned(account);

            // Update the user's stored veFXS multipliers
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

        }
    }

    /// @notice Add additional LPs to an existing locked stake. Also claims rewards at the old balance first
    /// @param kek_id The kek_id of the stake
    /// @param addl_liq The amount of additional liquidity to add
    function lockAdditional(bytes32 kek_id, uint256 addl_liq) nonReentrant public {
        // Make sure staking isn't paused
        require(!stakingPaused, "Staking paused");

        // Make sure you are not in shutdown
        require(!withdrawalOnlyShutdown, "Only withdrawals allowed");

        // Claim rewards at the old balance first
        _getReward(msg.sender, msg.sender);
        
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

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false, true);

        emit LockedAdditional(msg.sender, kek_id, addl_liq);
    }

    /// @notice Extends the lock of an existing stake. Also claims rewards at the old balance first
    /// @param kek_id The kek_id of the stake
    /// @param new_ending_ts The new ending timestamp you want to extend to
    function lockLonger(bytes32 kek_id, uint256 new_ending_ts) nonReentrant public {
        // Make sure staking isn't paused
        require(!stakingPaused, "Staking paused");

        // Make sure you are not in shutdown
        require(!withdrawalOnlyShutdown, "Only withdrawals allowed");

        // Claim rewards at the old balance first
        _getReward(msg.sender, msg.sender);
        
        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(msg.sender, kek_id);

        // Check
        require(new_ending_ts > block.timestamp, "Must be in the future");

        // Calculate some times
        uint256 time_left = (thisStake.ending_timestamp > block.timestamp) ? thisStake.ending_timestamp - block.timestamp : 0;
        uint256 new_secs = new_ending_ts - block.timestamp;

        // Checks
        // require(time_left > 0, "Already expired");
        require(new_secs > time_left, "Cannot shorten lock time");
        require(new_secs >= lock_time_min, "Minimum stake time not met");
        require(new_secs <= lock_time_for_max_multiplier, "Trying to lock for too long");

        // Update the stake
        lockedStakes[msg.sender][theArrayIndex] = LockedStake(
            kek_id,
            block.timestamp,
            thisStake.liquidity,
            new_ending_ts,
            lockMultiplier(new_secs)
        );

        // Need to call to update the combined weights
        _updateRewardAndBalance(msg.sender, false, true);

        emit LockedLonger(msg.sender, kek_id, new_secs, block.timestamp, new_ending_ts);
    }

    /// @notice Sync earnings for a specific staker
    /// @param account The account to sync
    function _syncEarned(address account) internal {
        if (account != address(0)) {
            // Calculate the earnings

            uint256[] memory _earneds = earned(account);
            for (uint256 i = 0; i < rewardTokens.length; i++) { 
                rewards[account][i] = _earneds[i];
                userRewardsPerTokenPaid[account][i] = rewardsPerTokenStored[i];
            }
        }
    }

    /// @notice Staker can allow a migrator 
    /// @param migrator_address The address you want to add as a migrator. The contract owner would need to have approved this address first
    function stakerAllowMigrator(address migrator_address) external {
        require(valid_migrators[migrator_address], "Invalid migrator address");
        staker_allowed_migrators[msg.sender][migrator_address] = true; 
    }

    /// @notice Staker can disallow a migrator that they previously allowed
    /// @param migrator_address The migrator address you want to disable
    function stakerDisallowMigrator(address migrator_address) external {
        // Delete from the mapping
        delete staker_allowed_migrators[msg.sender][migrator_address];
    }
    
    /// @notice Lock LP tokens
    /// @param liquidity The amount of LP tokens you want to stake
    /// @param secs The length of time you want to lock
    /// @dev Two different stake functions are needed because of delegateCall and msg.sender issues (important for migration)
    function stakeLocked(uint256 liquidity, uint256 secs) nonReentrant public {
        _stakeLocked(msg.sender, msg.sender, liquidity, secs, block.timestamp);
    }

    /// @notice If this were not internal, and source_address had an infinite approve, this could be exploitable (pull funds from source_address and stake for an arbitrary staker_address)
    /// @param staker_address The address of the farmer
    /// @param source_address The source of the LP tokens. Most of the time is the farmer, but could be the migrator
    /// @param liquidity The amount of LP tokens you want to stake
    /// @param secs The length of time you want to lock
    /// @param start_timestamp The starting timestamp of the stake. Used by the migrator, otherwise it stays the same
    function _stakeLocked(
        address staker_address, 
        address source_address, 
        uint256 liquidity, 
        uint256 secs,
        uint256 start_timestamp
    ) internal updateRewardAndBalance(staker_address, true) {
        require(!stakingPaused || valid_migrators[msg.sender] == true, "Staking paused or in migration");
        require(!withdrawalOnlyShutdown, "Only withdrawals allowed");
        require(liquidity > 0, "Must stake more than zero");
        require(secs >= lock_time_min, "Minimum stake time not met");
        require(secs <= lock_time_for_max_multiplier,"Trying to lock for too long");

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
        _updateRewardAndBalance(staker_address, false, true);

        emit StakeLocked(staker_address, liquidity, secs, kek_id, source_address);
    }

    /// @notice Withdraw a stake. 
    /// @param kek_id The id for the stake
    /// @param claim_rewards_deprecated DEPRECATED, has no effect (always claims rewards regardless)
    /// @dev Two different withdrawLocked functions are needed because of delegateCall and msg.sender issues (important for migration)
    function withdrawLocked(bytes32 kek_id, bool claim_rewards_deprecated) nonReentrant public {
        require(withdrawalsPaused == false, "Withdrawals paused");
        _withdrawLocked(msg.sender, msg.sender, kek_id, claim_rewards_deprecated);
    }

    /// @notice No withdrawer == msg.sender check needed since this is only internally callable and the checks are done in the wrapper functions like withdraw(), migrator_withdraw_unlocked() and migrator_withdraw_locked()
    /// @param staker_address The address of the staker
    /// @param destination_address Destination address for the withdrawn LP
    /// @param kek_id The id for the stake
    /// @param claim_rewards_deprecated DEPRECATED, has no effect (always claims rewards regardless)
    function _withdrawLocked(address staker_address, address destination_address, bytes32 kek_id, bool claim_rewards_deprecated) internal  {
        // Collect rewards first and then update the balances
        // withdrawalOnlyShutdown to be used in an emergency situation if reward is overemitted or not available
        // and the user can forfeit rewards to get their principal back. 
        if (withdrawalOnlyShutdown) {
            // Do nothing.
        }
        else {
            // Get the rewards
            _getReward(staker_address, destination_address);
        }
        
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(staker_address, kek_id);
        require(block.timestamp >= thisStake.ending_timestamp || stakesUnlocked == true || valid_migrators[msg.sender] == true, "Stake is still locked!");

        uint256 liquidity = thisStake.liquidity;

        if (liquidity > 0) {
            // Update liquidities
            _total_liquidity_locked = _total_liquidity_locked.sub(liquidity);
            _locked_liquidity[staker_address] = _locked_liquidity[staker_address].sub(liquidity);

            // Remove the stake from the array
            delete lockedStakes[staker_address][theArrayIndex];

            // Need to call to update the combined weights
            _updateRewardAndBalance(staker_address, true, true);

            // Give the tokens to the destination_address
            // Should throw if insufficient balance
            stakingToken.transfer(destination_address, liquidity);

            emit WithdrawLocked(staker_address, liquidity, kek_id, destination_address);
        }

    }
    
    /// @notice Collect rewards
    /// @return uint256 The amounts of collected reward tokens
    /// @dev Two different getReward functions are needed because of delegateCall and msg.sender issues (important for migration)
    function getReward() external nonReentrant returns (uint256[] memory) {
        require(rewardsCollectionPaused == false,"Rewards collection paused");
        return _getReward(msg.sender, msg.sender);
    }

    /// @notice Collect rewards (internal)
    /// @param rewardee The address of the staker
    /// @param destination_address Destination address for the withdrawn LP
    /// @return _rtnRewards The amounts of collected reward tokens
    /// @dev No withdrawer == msg.sender check needed since this is only internally callable. This distinction is important for the migrator
    function _getReward(address rewardee, address destination_address) internal updateRewardAndBalance(rewardee, true) returns (uint256[] memory _rtnRewards) {
        // Make sure you are not in shutdown
        require(!withdrawalOnlyShutdown, "Only withdrawals allowed");
        
        _rtnRewards = new uint256[](rewardTokens.length);
        for (uint256 i = 0; i < rewardTokens.length; i++) { 
            _rtnRewards[i] = rewards[rewardee][i];

            if (_rtnRewards[i] > 0) {
                rewards[rewardee][i] = 0;
                ERC20(rewardTokens[i]).transfer(destination_address, _rtnRewards[i]);
                ttlRewsPaid[i] += _rtnRewards[i];
                emit RewardPaid(rewardee, _rtnRewards[i], rewardTokens[i], destination_address);
            }
        }
        

        // Update the last reward claim time
        lastRewardClaimTime[rewardee] = block.timestamp;
    }

    /// @notice Quasi-notifyRewardAmount() logic
    function syncRewards() internal {
        // Bring in rewards, if applicable
        if ((block.timestamp).sub(lastRewardPull) >= rewardsDuration) {
            if (address(rewarder) != address(0)) {
                rewarder.distributeReward();
            }

            // Pull in any 3rd party reward tokens, if applicable, using their specific ABI(s)
            // FXS is always assumed to be at [0]
            // for (uint256 i = 1; i < rewardTokens.length; i++) { 
            //     if (rewardTokens[i] != address(0)) {

            //     }
            // }

            {
                // Balancer
                // =========================
                // IL2BalancerPseudoMinter(0x47B489bf5836f83ABD928C316F8e39bC0587B020).mint(address(stakingToken));

                // Convex cvxLP/RewardPool Combo
                // =========================
                stakingToken.getReward(address(this));
            }


            lastRewardPull = block.timestamp;
        }

        // Loop through all the tokens
        uint256 _eligibleElapsedTime = Math.min((block.timestamp).sub(lastUpdateTime), rewardsDuration); // Cut off at the end of the week
        uint256[] memory _reward = rewardPerToken();
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            // Get the current reward token balances
            uint256 _currBal = ERC20(rewardTokens[i]).balanceOf(address(this));

            // Update the owed amounts based off the old reward rates
            // Anything over a week is zeroed (see above)
            ttlRewsOwed[i] += rewardRates[i].mul(_eligibleElapsedTime);

            // Update the stored amounts too
            rewardsPerTokenStored[i] = _reward[i];

            // Set the reward rates based on the free amount of tokens
            {
                // Don't count unpaid rewards as free
                uint256 _unpaid = ttlRewsOwed[i].sub(ttlRewsPaid[i]);

                // Handle reward token0
                if (_currBal <= _unpaid){
                    // token is depleted, so stop emitting
                    rewardRates[i] = 0;
                }
                else {
                    uint256 _free = _currBal.sub(_unpaid);
                    rewardRates[i] = (_free).div(rewardsDuration);
                }

            }
        }
    }

    /// @notice Sync the contract
    function sync() public {
        require(isInitialized, "Contract not initialized");

        // Make sure you are not in shutdown
        require(!withdrawalOnlyShutdown, "Only withdrawals allowed");

        // Make sure the rewardRates are synced to the current reward token balances
        syncRewards();

        // Rolling 7 days rewards period
        lastUpdateTime = block.timestamp;
        periodFinish = (block.timestamp).add(rewardsDuration);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice Needed when first deploying the farm, Make sure rewards are present
    function initializeDefault() external onlyByOwnGovCtrlr {
        require(!isInitialized, "Already initialized");
        isInitialized = true;

        // Sync the contract
        sync();

        emit DefaultInitialization();
    }

    /// @notice Migrator can stake for someone else (they won't be able to withdraw it back though, only staker_address can). 
    /// @param staker_address The address of the staker
    /// @param amount Amount of LP to stake
    /// @param secs Seconds for the lock
    /// @param start_timestamp Starting timestamp for the lock
    function migrator_stakeLocked_for(address staker_address, uint256 amount, uint256 secs, uint256 start_timestamp) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _stakeLocked(staker_address, msg.sender, amount, secs, start_timestamp);
    }

    /// @notice Migrator can withdraw for someone else
    /// @param staker_address The address of the staker
    /// @param kek_id The id of the stake
    function migrator_withdraw_locked(address staker_address, bytes32 kek_id) external isMigrating {
        require(staker_allowed_migrators[staker_address][msg.sender] && valid_migrators[msg.sender], "Mig. invalid or unapproved");
        _withdrawLocked(staker_address, msg.sender, kek_id, true);
    }

    /// @notice Adds a supported migrator address 
    /// @param migrator_address The address of the migrator
    function addMigrator(address migrator_address) external onlyByOwnGov {
        valid_migrators[migrator_address] = true;
    }

    /// @notice Removes a migrator address
    /// @param migrator_address The address of the migrator
    function removeMigrator(address migrator_address) external onlyByOwnGov {
        require(valid_migrators[migrator_address] == true, "Address nonexistent");
        
        // Delete from the mapping
        delete valid_migrators[migrator_address];
    }

    /// @notice Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    /// @param tokenAddress The address of the token
    /// @param tokenAmount The amount of the token
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Admin cannot withdraw the staking token from the contract unless currently migrating
        if(!migrationsOn){
            require(tokenAddress != address(stakingToken), "Not in migration"); // Only Governance / Timelock can trigger a migration
        }
        // Only the owner address can ever receive the recovery withdrawal
        ERC20(tokenAddress).transfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }


    /// @notice Set various multipliers
    /// @param _lock_max_multiplier The max weight multiplier you can get for locking your position
    /// @param _vefxs_max_multiplier The max weight multiplier you can get for having veFXS
    /// @param _vefxs_per_frax_for_max_boost How much veFXS you must have, per Frax in the LP, in order to get the veFXS boost, if applicable
    function setMultipliers(uint256 _lock_max_multiplier, uint256 _vefxs_max_multiplier, uint256 _vefxs_per_frax_for_max_boost) external onlyByOwnGov {
        require(_lock_max_multiplier >= MULTIPLIER_PRECISION, "Mult must be >= MULTIPLIER_PRECISION");
        require(_vefxs_max_multiplier >= 0, "veFXS mul must be >= 0");
        require(_vefxs_per_frax_for_max_boost > 0, "veFXS pct max must be >= 0");

        lock_max_multiplier = _lock_max_multiplier;
        vefxs_max_multiplier = _vefxs_max_multiplier;
        vefxs_per_frax_for_max_boost = _vefxs_per_frax_for_max_boost;

        emit MaxVeFXSMultiplier(vefxs_max_multiplier);
        emit LockedStakeMaxMultiplierUpdated(lock_max_multiplier);
        emit veFXSPerFraxForMaxBoostUpdated(vefxs_per_frax_for_max_boost);
    }

    /// @notice Set various time variables
    /// @param _lock_time_for_max_multiplier The lock time needed to get the max weight multiplier
    /// @param _lock_time_min The minimum lock time required
    function setLockedStakeTimeForMinAndMaxMultiplier(uint256 _lock_time_for_max_multiplier, uint256 _lock_time_min) external onlyByOwnGov {
        require(_lock_time_for_max_multiplier >= 1, "Mul max time must be >= 1");
        require(_lock_time_min >= 1, "Mul min time must be >= 1");

        lock_time_for_max_multiplier = _lock_time_for_max_multiplier;
        lock_time_min = _lock_time_min;

        emit LockedStakeTimeForMaxMultiplier(lock_time_for_max_multiplier);
        emit LockedStakeMinTime(_lock_time_min);
    }

    /// @notice Unlock all stakes, in the case of an emergency
    function unlockStakes() external onlyByOwnGov {
        stakesUnlocked = !stakesUnlocked;
    }

    /// @notice Toggle migrations on or off
    function toggleMigrations() external onlyByOwnGov {
        migrationsOn = !migrationsOn;
    }

    /// @notice Only settable to true
    function initiateWithdrawalOnlyShutdown() external onlyByOwnGov {
        withdrawalOnlyShutdown = true;
    }

    /// @notice Toggle the ability to stake
    function toggleStaking() external onlyByOwnGov {
        stakingPaused = !stakingPaused;
    }

    /// @notice Toggle the ability to withdraw
    function toggleWithdrawals() external onlyByOwnGov {
        withdrawalsPaused = !withdrawalsPaused;
    }

    /// @notice Toggle the ability to collect rewards
    function toggleRewardsCollection() external onlyByOwnGov {
        rewardsCollectionPaused = !rewardsCollectionPaused;
    }

    /// @notice Set the address of the timelock
    /// @param _new_timelock The new address of the timelock
    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelockAddress = _new_timelock;
    }

    /// @notice Set the address of the controller
    /// @param _controllerAddress The new address of the controller
    function setController(address _controllerAddress) external onlyByOwnGov {
        controllerAddress = _controllerAddress;
    }

    /// @notice Set the veFXS address
    /// @param _vefxs_address The new address for veFXS
    function setVeFXS(address _vefxs_address) external onlyByOwnGov {
        veFXS = IveFXS(_vefxs_address);
    }

    /* ========== EVENTS ========== */

    /// @notice When LP tokens are locked
    /// @param user The staker
    /// @param amount Amount of LP staked
    /// @param secs Number of seconds the stake was locked
    /// @param kek_id The id of the stake
    /// @param source_address The origin address of the LP tokens. Usually the same as the user unless there is a migration in progress
    event StakeLocked(address indexed user, uint256 amount, uint256 secs, bytes32 kek_id, address source_address);
    
    /// @notice When LP tokens are withdrawn
    /// @param user The staker
    /// @param amount Amount of LP withdrawn
    /// @param kek_id The id of the stake
    /// @param destination_address Destination address of the withdrawn LP tokens
    event WithdrawLocked(address indexed user, uint256 amount, bytes32 kek_id, address destination_address);

    /// @notice When a staker collects rewards
    /// @param user The staker
    /// @param reward Amount of reward tokens
    /// @param token_address Address of the reward token
    /// @param destination_address Destination address of the reward tokens
    event RewardPaid(address indexed user, uint256 reward, address token_address, address destination_address);

    /// @notice When the farm has been initialized
    event DefaultInitialization();

    /// @notice When tokens are recovered, in the case of an emergency
    /// @param token Address of the token
    /// @param amount Amount of the recovered tokens
    event Recovered(address token, uint256 amount);

    /// @notice When the max weight multiplier you can get for locking your position is set
    /// @param multiplier The max weight multiplier
    event LockedStakeMaxMultiplierUpdated(uint256 multiplier);

    /// @notice When the lock time needed to get the max weight multiplier is set
    /// @param secs The lock time needed for the max multiplier, in seconds
    event LockedStakeTimeForMaxMultiplier(uint256 secs);

    /// @notice The minimum lock time required for a stake
    /// @param secs Min lock time, in seconds
    event LockedStakeMinTime(uint256 secs);

    /// @notice When someone adds additional LP to an existing stake
    /// @param user The staker's address
    /// @param kek_id The id of the stake
    /// @param amount The amount of extra LP being added to the stake
    event LockedAdditional(address indexed user, bytes32 kek_id, uint256 amount);

    /// @notice When someone locks for additional time
    /// @param user The staker's address
    /// @param kek_id The id of the stake
    /// @param new_secs The additional amount of seconds the lock is being extended
    /// @param new_start_ts The new start time of the stake. Should be block.timestamp
    /// @param new_end_ts The new ending time of the stake
    event LockedLonger(address indexed user, bytes32 kek_id, uint256 new_secs, uint256 new_start_ts, uint256 new_end_ts);
    
    /// @notice When the max weight multiplier you can get for having veFXS is updated
    /// @param multiplier The new max multiplier
    event MaxVeFXSMultiplier(uint256 multiplier);

    /// @notice When the amount of veFXS you must have, per Frax in the LP, in order to get the veFXS boost, if applicable
    /// @param scale_factor The new amount of veFXS
    event veFXSPerFraxForMaxBoostUpdated(uint256 scale_factor);
}
