const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// const Address = artifacts.require("Utils/Address");
// const BlockMiner = artifacts.require("Utils/BlockMiner");
// const MigrationHelper = artifacts.require("Utils/MigrationHelper");
// const StringHelpers = artifacts.require("Utils/StringHelpers");
// const Math = artifacts.require("Math/Math");
// const SafeMath = artifacts.require("Math/SafeMath");
// const Babylonian = artifacts.require("Math/Babylonian");
// const FixedPoint = artifacts.require("Math/FixedPoint");
// const UQ112x112 = artifacts.require("Math/UQ112x112");
// const Owned = artifacts.require("Staking/Owned");
// const ERC20 = artifacts.require("ERC20/ERC20");
// const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
// const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Flashbot related
const MigrationBundleUtils = artifacts.require("Utils/MigrationBundleUtils.sol");

// Uniswap related
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Rewards and fake token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const Comp = artifacts.require("ERC20/Variants/Comp");
const FNX = artifacts.require("ERC20/Variants/FNX");
const OHM = artifacts.require("ERC20/Variants/OHM");
const IQToken = artifacts.require("ERC20/Variants/IQToken");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");
const CRV_DAO_ERC20_Mock = artifacts.require("ERC20/Variants/CRV_DAO_ERC20_Mock");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");

// Collateral Pools
const FraxPoolLibrary = artifacts.require("Frax/Pools/FraxPoolLibrary");
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const PoolvAMM_USDC = artifacts.require("Frax/Pools/PoolvAMM_USDC");
const FraxPoolMultiCollateral = artifacts.require("Frax/Pools/FraxPoolMultiCollateral");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");
const PIDController = artifacts.require("Oracle/PIDController");
const ReserveTracker = artifacts.require("Oracle/ReserveTracker");
const FRAXOracleWrapper = artifacts.require("Oracle/FRAXOracleWrapper");
const FXSOracleWrapper = artifacts.require("Oracle/FXSOracleWrapper");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkFXSUSDPriceConsumer = artifacts.require("Oracle/ChainlinkFXSUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const TokenVesting = artifacts.require("FXS/TokenVesting");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
// const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH");
// const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC");
// const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS");
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const FraxCrossChainFarm_FRAX_mUSD = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_mUSD");
const CommunalFarm_SaddleD4 = artifacts.require("Staking/Variants/CommunalFarm_SaddleD4");
const FraxUniV3Farm_Stable_FRAX_USDC = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_USDC");
const FraxUniV3Farm_Stable_FRAX_DAI = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_DAI");
const FraxUniV3Farm_Volatile_FRAX_WETH = artifacts.require("Staking/Variants/FraxUniV3Farm_Volatile_FRAX_WETH");
// const StakingRewardsMultiGauge_FRAX_MTA = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_FRAX_MTA");
const FraxMiddlemanGauge_FRAX_mUSD = artifacts.require("Curve/Middleman_Gauges/FraxMiddlemanGauge_FRAX_mUSD");

// Migrator contracts
// const UniLPToSushiLPMigrator = artifacts.require("Staking/UniLPToSushiLPMigrator");

// Bond NFT contracts
// const FraxBond_NFT_Library = artifacts.require("FXB/FraxBond_NFT_Library");
// const FXBA10000M3 = artifacts.require("FXB/Variants/FXBA10000M3");

// Bond contracts
const FraxBond = artifacts.require("FXB/FraxBond");
const FraxBondIssuer = artifacts.require("FXB/FraxBondIssuer");

// Investor and lending contract related
const FraxPoolInvestorForV2 = artifacts.require("Misc_AMOs/FraxPoolInvestorForV2");
const InvestorAMO_V2 = artifacts.require("Misc_AMOs/InvestorAMO_V2");
const FraxLendingAMO = artifacts.require("Misc_AMOs/FraxLendingAMO");
const IyUSDC_V2_Partial = artifacts.require("Misc_AMOs/yearn/IyUSDC_V2_Partial");
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial");
const ICompComptrollerPartial = artifacts.require("Misc_AMOs/compound/ICompComptrollerPartial");

const ICREAM_crFRAX = artifacts.require("Misc_AMOs/cream/ICREAM_crFRAX");
const IFNX_CFNX = artifacts.require("Misc_AMOs/finnexus/IFNX_CFNX");
const IFNX_FPT_FRAX = artifacts.require("Misc_AMOs/finnexus/IFNX_FPT_FRAX");
const IFNX_FPT_B = artifacts.require("Misc_AMOs/finnexus/IFNX_FPT_B");
const IFNX_IntegratedStake = artifacts.require("Misc_AMOs/finnexus/IFNX_IntegratedStake");
const IFNX_MinePool = artifacts.require("Misc_AMOs/finnexus/IFNX_MinePool");
const IFNX_TokenConverter = artifacts.require("Misc_AMOs/finnexus/IFNX_TokenConverter");
const IFNX_ManagerProxy = artifacts.require("Misc_AMOs/finnexus/IFNX_ManagerProxy");

// Curve Metapool and AMO
const CurveAMO_V3 = artifacts.require("Curve/CurveAMO_V3");
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const LiquidityGaugeV2 = artifacts.require("Curve/ILiquidityGaugeV2");
const FraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/FraxGaugeFXSRewardsDistributor");

// Misc AMOs
const FXS1559_AMO = artifacts.require("Misc_AMOs/FXS1559_AMO");
const StakeDAO_AMO = artifacts.require("Misc_AMOs/StakeDAO_AMO");
const OHM_AMO = artifacts.require("Misc_AMOs/OHM_AMO");
const Convex_AMO = artifacts.require("Misc_AMOs/Convex_AMO");
const RariFuseLendingAMO = artifacts.require("Misc_AMOs/RariFuseLendingAMO");

// veFXS
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSYieldDistributorV4 = artifacts.require("Staking/veFXSYieldDistributorV4.sol");
const SmartWalletWhitelist = artifacts.require("Curve/SmartWalletWhitelist");
const MicroVeFXSStaker = artifacts.require("Staking/MicroVeFXSStaker");

// FXSRewards
const FXSRewards = artifacts.require("Staking/FXSRewards.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;
	let timelockInstance;
	let migrationHelperInstance;
	let frax_instance;
	let fxs_instance;
	let tokenVestingInstance;
	let governanceInstance;
    let wethInstance;
    let sushiInstance;
    let ohmInstance;
    let iqInstance;
    // let compInstance;
    let fnxInstance;
    let FRAX3CRV_V2_Instance;
    let mockCRVDAOInstance;
    let mockyUSDInstance;
	let usdc_instance;
	let col_instance_USDT;
	
	let routerInstance;
	let uniswapFactoryInstance;
    let uniswapV3PositionsNFTInstance;
	let swapToPriceInstance;
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_USDT;
	
	let oracle_instance_FRAX_FXS;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC; 
	let oracle_instance_FXS_USDT; 
	
	let oracle_instance_USDC_WETH;
    let oracle_instance_USDT_WETH;
    
	let pid_controller_instance;
    let reserve_tracker_instance;

    let frax_oracle_wrapper_instance;
    let fxs_oracle_wrapper_instance;

	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FRAX_FXS;
    let stakingInstance_FXS_WETH;
    
    let stakingInstanceDual_FRAX_FXS_Sushi;
    let stakingInstanceDual_FXS_WETH_Sushi;
    let stakingInstanceDual_FRAX3CRV;
    let stakingInstanceDualV2_FRAX3CRV_V2;
    let stakingInstanceDualV5_FRAX_OHM;
    let communalFarmInstance_Saddle_D4;
    let fraxUniV3Farm_Stable_FRAX_USDC;
    let fraxUniV3Farm_Stable_FRAX_DAI;
    let fraxUniV3Farm_Volatile_FRAX_WETH;
    let stakingInstanceMultiGauge_FRAX_MTA;
    let fraxCrossChainFarm_FRAX_mUSD;
    let middlemanGauge_FRAX_mUSD;

    let uniLPToSushiLPMigratorInstance;

    // let bondInstance_FXBA10000M3;

    let fxbInstance;
    let bondIssuerInstance;

	let pool_instance_USDC;
    let pool_instance_USDC_vAMM;
    let pool_instance_multicollateral;

    let investor_amo_v2_instance;
    let fraxLendingAMO_instance;
    let ohm_amo_instance;
    let rari_amo_instance;
    let yUSDC_instance;
    let aUSDC_pool_instance;
    let aUSDC_token_instance;
    let cUSDC_instance;
    let compController_instance;
    let crFRAX_instance;
    let CFNX_instance;
    let IFNX_FPT_FRAX_instance;
    let IFNX_FPT_B_instance;
    let IFNX_IntegratedStake_instance;
    let IFNX_MinePool_instance;
    let IFNX_TokenConverter_instance;
    let IFNX_ManagerProxy_instance;

    let curve_factory_instance;
    let FRAX_3CRV_metapool_instance;
    let frax_gauge_controller;
    let gauge_rewards_distributor_instance;
    let liquidity_gauge_v2_instance;
    let curve_amo_v3_instance;

    let veFXS_instance;
    let FXSRewards_instance;
    let veFXSYieldDistributorV4_instance;
    let priceConsumerInstance_FXS;
    let smart_wallet_whitelist_instance;
    let micro_vefxs_staker_instance;



    // For mainnet
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    priceConsumerInstance = await ChainlinkETHUSDPriceConsumer.at(CONTRACT_ADDRESSES.mainnet.pricing.chainlink_eth_usd);
    priceConsumerInstance_FXS = await ChainlinkFXSUSDPriceConsumer.at(CONTRACT_ADDRESSES.mainnet.pricing.chainlink_fxs_usd);   
    timelockInstance = await Timelock.at(CONTRACT_ADDRESSES.mainnet.misc.timelock);
    frax_instance = await FRAXStablecoin.at(CONTRACT_ADDRESSES.mainnet.main.FRAX);
    fxs_instance = await FRAXShares.at(CONTRACT_ADDRESSES.mainnet.main.FXS);
    veFXS_instance = await veFXS.at(CONTRACT_ADDRESSES.mainnet.main.veFXS);
    governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES.mainnet.governance);
    wethInstance = await WETH.at(CONTRACT_ADDRESSES.mainnet.weth);
    sushiInstance = await SushiToken.at(CONTRACT_ADDRESSES.mainnet.reward_tokens.sushi);
    compInstance = await Comp.at(CONTRACT_ADDRESSES.mainnet.reward_tokens.comp);
    fnxInstance = await FNX.at(CONTRACT_ADDRESSES.mainnet.reward_tokens.fnx);
    ohmInstance = await OHM.at(CONTRACT_ADDRESSES.mainnet.reward_tokens.ohm);
    iqInstance = await IQToken.at(CONTRACT_ADDRESSES.mainnet.reward_tokens.iq);
    FRAX3CRV_V2_Instance = await MetaImplementationUSD.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Curve FRAX3CRV-f-2"]);
    mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.at(CONTRACT_ADDRESSES.mainnet.reward_tokens.curve_dao);
    yUSDC_instance = await IyUSDC_V2_Partial.at(CONTRACT_ADDRESSES.mainnet.investments["yearn_yUSDC_V2"]);
    aUSDC_pool_instance = await IAAVELendingPool_Partial.at(CONTRACT_ADDRESSES.mainnet.investments["aave_aUSDC_Pool"]);
    aUSDC_token_instance = await IAAVE_aUSDC_Partial.at(CONTRACT_ADDRESSES.mainnet.investments["aave_aUSDC_Token"]);
    cUSDC_instance = await IcUSDC_Partial.at(CONTRACT_ADDRESSES.mainnet.investments["compound_cUSDC"]);
    compController_instance = await ICompComptrollerPartial.at(CONTRACT_ADDRESSES.mainnet.investments["compound_controller"]);

    crFRAX_instance = await ICREAM_crFRAX.at(CONTRACT_ADDRESSES.mainnet.investments["cream_crFRAX"]);
    CFNX_instance = await IFNX_CFNX.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_CFNX"]);
    IFNX_FPT_FRAX_instance = await IFNX_FPT_FRAX.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_FPT_FRAX"]);
    IFNX_FPT_B_instance = await IFNX_FPT_B.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_FPT_B"]);
    IFNX_IntegratedStake_instance = await IFNX_IntegratedStake.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_IntegratedStake"]);
    IFNX_MinePool_instance = await IFNX_MinePool.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_MinePool"]);
    IFNX_TokenConverter_instance = await IFNX_TokenConverter.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_TokenConverter"]);
    IFNX_ManagerProxy_instance = await IFNX_ManagerProxy.at(CONTRACT_ADDRESSES.mainnet.investments["fnx_ManagerProxy"]);

    routerInstance = await UniswapV2Router02.at(CONTRACT_ADDRESSES.mainnet.uniswap_other.router); 
    uniswapFactoryInstance = await UniswapV2Factory.at(CONTRACT_ADDRESSES.mainnet.uniswap_other.factory); 
    uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.at(CONTRACT_ADDRESSES.mainnet.uniswap_other.v3_positions_NFT); 
    swapToPriceInstance = await UniswapV2Factory.at(CONTRACT_ADDRESSES.mainnet.pricing.swap_to_price); 

    usdc_instance = await FakeCollateral_USDC.at(CONTRACT_ADDRESSES.mainnet.collateral.USDC);

    oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.at(CONTRACT_ADDRESSES.mainnet.oracles.FRAX_WETH);
    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.at(CONTRACT_ADDRESSES.mainnet.oracles.FRAX_USDC); 
    oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.at(CONTRACT_ADDRESSES.mainnet.oracles_other.FRAX_FXS);
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(CONTRACT_ADDRESSES.mainnet.oracles.FXS_WETH);
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.at(CONTRACT_ADDRESSES.mainnet.oracles_other.FXS_USDC);
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(CONTRACT_ADDRESSES.mainnet.oracles.USDC_WETH);

    //reserve_tracker_instance = await ReserveTracker.at(CONTRACT_ADDRESSES.mainnet.pid_related.reserve_tracker);
    //pid_controller_instance = await PIDController.at(CONTRACT_ADDRESSES.mainnet.pid_related.pid_controller);

    // stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.at(CONTRACT_ADDRESSES.mainnet.staking_contracts["Uniswap FRAX/WETH"]);
    // stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.at(CONTRACT_ADDRESSES.mainnet.staking_contracts["Uniswap FRAX/USDC"]);
    // stakingInstance_FRAX_FXS = await StakingRewards_FRAX_FXS.at(CONTRACT_ADDRESSES.mainnet.staking_contracts["Uniswap FRAX/FXS"]);
    
    //stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Sushi FRAX/FXS']);
    //stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Sushi FXS/WETH']);
    //stakingInstanceDualV2_FRAX3CRV_V2 = await StakingRewardsDualV2_FRAX3CRV_V2.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Curve FRAX3CRV-f-2']);
    stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Uniswap FRAX/OHM']);
    communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Saddle alUSD/FEI/FRAX/LUSD']);
    fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Uniswap V3 FRAX/DAI']);
    fraxUniV3Farm_Stable_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Uniswap V3 FRAX/USDC']);
    middlemanGauge_FRAX_mUSD = await FraxMiddlemanGauge_FRAX_mUSD.at(CONTRACT_ADDRESSES.mainnet.middleman_gauges['mStable FRAX/mUSD']);
    // fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Uniswap V3 FRAX/DAI']);

    pool_instance_USDC = await Pool_USDC.at(CONTRACT_ADDRESSES.mainnet.pools.USDC_V2);

    investor_amo_v1_instance = await FraxPoolInvestorForV2.at(CONTRACT_ADDRESSES.mainnet.misc.investor_amo_V1);
    investor_amo_v2_instance = await InvestorAMO_V2.at(CONTRACT_ADDRESSES.mainnet.misc.investor_amo);
    fraxLendingAMO_instance = await FraxLendingAMO.at(CONTRACT_ADDRESSES.mainnet.misc.lending_amo);
    curve_amo_v3_instance = await CurveAMO_V3.at(CONTRACT_ADDRESSES.mainnet.misc.curve_amo);
    fxs_1559_amo_instance = await FXS1559_AMO.at(CONTRACT_ADDRESSES.mainnet.misc.fxs_1559_amo);
    rari_amo_instance = await RariFuseLendingAMO.at(CONTRACT_ADDRESSES.mainnet.misc.rari_amo);

    liquidity_gauge_v2_instance = await LiquidityGaugeV2.at(CONTRACT_ADDRESSES.mainnet.misc.frax_gauge_v2);
    frax_gauge_controller = await FraxGaugeController.at(CONTRACT_ADDRESSES.mainnet.misc.frax_gauge_controller);
    gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.at(CONTRACT_ADDRESSES.mainnet.misc.frax_gauge_rewards_distributor);

    veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV4.at(CONTRACT_ADDRESSES.mainnet.misc.vefxs_yield_distributor_v3);   


    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // console.log(chalk.yellow('========== RariFuseLendingAMO =========='));
    // // RariFuseLendingAMO
    // rari_amo_instance = await RariFuseLendingAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[8],
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     [
    //         "0x814b02C1ebc9164972D888495927fe1697F0Fb4c", // Pool #6: [Unitroller] Tetranode's Locker.
    //         "0xfb558ecd2d24886e8d2956775c619deb22f154ef", // Pool #7: [Unitroller] ChainLinkGod's / Tetranode's Up Only Pool
    //         "0xd4bdcca1ca76ced6fc8bb1ba91c5d7c0ca4fe567", // Pool #9: [Unitroller] Frax & Reflexer Stable Asset Pool
    //         "0x621579dd26774022f33147d3852ef4e00024b763", // Pool #18: [Unitroller] Olympus Pool Party Frax
    //         "0x64858bac30f4cc223ea07adc09a51acdcd225998", // Pool #24: [Unitroller] Harvest FARMstead
    //     ],
    //     [
    //         "0x1531C1a63A169aC75A2dAAe399080745fa51dE44", // Pool #6: [CErc20Delegator] Tetranode's Locker.
    //         "0x6313c160b329db59086df28ed2bf172a82f0d9d1", // Pool #7: [CErc20Delegator] ChainLinkGod's / Tetranode's Up Only Pool
    //         "0x0f43a7e3f7b529015B0517D0D9Aa9b95701fd2Cb", // Pool #9: [CErc20Delegator] Frax & Reflexer Stable Asset Pool
    //         "0x3e5c122ffa75a9fe16ec0c69f7e9149203ea1a5d", // Pool #18: [CErc20Delegator] Olympus Pool Party Frax
    //         "0x0A6eAfaA84188A146749D7864bB20E63bD16ea2A", // Pool #24: [CErc20Delegator] Harvest FARMstead
    //     ]
    // );

    // console.log(chalk.yellow('========== SmartWalletWhitelist =========='));
    // // SmartWalletWhitelist for veFXS 
    // smart_wallet_whitelist_instance = await SmartWalletWhitelist.new(
    //     THE_ACCOUNTS[1]
    // );

    // console.log(chalk.yellow('========== MicroVeFXSStaker =========='));
    // // MicroVeFXSStaker for veFXS 
    // micro_vefxs_staker_instance = await MicroVeFXSStaker.new(
    //     THE_ACCOUNTS[1]
    // );

    // console.log(chalk.yellow('========== FraxGaugeFXSRewardsDistributor =========='));
    // // FraxGaugeFXSRewardsDistributor 
    // gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.new(
    //     THE_ACCOUNTS[1], 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     THE_ACCOUNTS[7], 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS,
    //     frax_gauge_controller.address
    // );

    // console.log("========== FraxMiddlemanGauge_FRAX_mUSD ==========");
    // // FraxMiddlemanGauge_FRAX_mUSD 
    // middlemanGauge_FRAX_mUSD = await FraxMiddlemanGauge_FRAX_mUSD.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     gauge_rewards_distributor_instance.address,
    //     "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
    //     3,
    //     CONTRACT_ADDRESSES.polygon.staking_contracts['mStable FRAX/mUSD'],
    //     "",
    //     "mStable FRAX/mUSD",
    // );

    // console.log(chalk.yellow('========== StakingRewardsDualV5_FRAX_OHM =========='));
    // // StakingRewardsDualV5_FRAX_OHM 
    // stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.new(
    //     THE_ACCOUNTS[6], 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.reward_tokens.iq,
    //     CONTRACT_ADDRESSES.mainnet.pair_tokens['Uniswap FRAX/IQ'],
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     CONTRACT_ADDRESSES.mainnet.main.veFXS,
    // );

    // console.log(chalk.yellow('========== FraxUniV3Farm_Stable_FRAX_DAI =========='));
    // // FraxUniV3Farm_Stable_FRAX_DAI 
    // fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.new(
    //     THE_ACCOUNTS[6],
    //     CONTRACT_ADDRESSES.mainnet.uni_v3_pools['Uniswap V3 FRAX/DAI'],
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     CONTRACT_ADDRESSES.mainnet.misc.frax_gauge_rewards_distributor,
	// 	-50,
	// 	50,
	// 	0
    // );

    console.log(chalk.yellow('========== FraxCrossChainFarm_FRAX_mUSD =========='));
    // FraxCrossChainFarm_FRAX_mUSD 
    fraxCrossChainFarm_FRAX_mUSD = await FraxCrossChainFarm_FRAX_mUSD.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.mainnet.main.FXS, 
        CONTRACT_ADDRESSES.mainnet.reward_tokens.iq,
        "0x4fb30c5a3ac8e85bc32785518633303c4590752d", // Use mUSD/GUSD Feeder Pool here as a dry run
        "0xe2f2a5c287993345a840db3b0845fbc70f5935a5", // use mUSD here as a dry run
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
    );

    console.log("========== FXSRewards ==========");
    // FXSRewards 
    FXSRewards_instance = await FXSRewards.new(
        CONTRACT_ADDRESSES.mainnet.main.FRAX,
        CONTRACT_ADDRESSES.mainnet.main.FXS, 
        CONTRACT_ADDRESSES.mainnet.collateral.USDC, 
        THE_ACCOUNTS[0], // set owner and custodian to accounts[0] for now
        THE_ACCOUNTS[0],
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
        CONTRACT_ADDRESSES.mainnet.pair_tokens['Curve FRAX3CRV-f-2'],
        "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // 3pool contract
        "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // 3CRV erc20
        veFXS_instance.address
    );

    // priceConsumerInstance_FXS = await ChainlinkFXSUSDPriceConsumer.new();
    FXSRewards_instance.setFXSUSDOracle(priceConsumerInstance_FXS.address);
    console.log("FXSRewards address:", FXSRewards_instance.address);

    // console.log("========== veFXSYieldDistributorV4 ==========");
    // // veFXSYieldDistributorV4 
    // veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV4.new(
    //     THE_ACCOUNTS[6], 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     CONTRACT_ADDRESSES.mainnet.main.veFXS
    // );

    console.log(chalk.yellow('========== PIDController & ReserveTracker – using Curve =========='));
    reserve_tracker_instance = await ReserveTracker.new(
        CONTRACT_ADDRESSES.mainnet.main.FRAX,
        CONTRACT_ADDRESSES.mainnet.main.FXS,
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
    );

    pid_controller_instance = await PIDController.new(
        CONTRACT_ADDRESSES.mainnet.main.FRAX,
        CONTRACT_ADDRESSES.mainnet.main.FXS,
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
        reserve_tracker_instance.address
    )
    
    // Initialize ReserveTracker
    await reserve_tracker_instance.setMetapool(FRAX3CRV_V2_Instance.address, { from: THE_ACCOUNTS[1] });
    await reserve_tracker_instance.setFRAXPriceOracle("0x2E45C589A9F301A2061f6567B9F432690368E3C6", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, { from: THE_ACCOUNTS[1] });
    await reserve_tracker_instance.addFXSPair("0xE1573B9D29e2183B1AF0e743Dc2754979A40D237", { from: THE_ACCOUNTS[1] }); // Uni FRAX-FXS
    //await reserve_tracker_instance.addFXSPair("0x74C370990C1181303D20e9f0252437a97518B95B", { from: THE_ACCOUNTS[1] }); // Sushi FXS-WETH
    await reserve_tracker_instance.setChainlinkFXSOracle(priceConsumerInstance_FXS.address, { from: THE_ACCOUNTS[1] });

    // Initialize PIDController
    await pid_controller_instance.setMetapool(FRAX3CRV_V2_Instance.address, { from: THE_ACCOUNTS[1] });

    console.log(chalk.yellow('========== FRAXOracleWrapper =========='));

    frax_oracle_wrapper_instance = await FRAXOracleWrapper.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.mainnet.misc.timelock
    );

    console.log(chalk.yellow('========== FXSOracleWrapper =========='));

    fxs_oracle_wrapper_instance = await FXSOracleWrapper.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.mainnet.misc.timelock
    );

    console.log(chalk.yellow('========== MigrationBundleUtils =========='));
	//let migrationBundleUtils_instance = await MigrationBundleUtils.new(THE_ACCOUNTS[1], "0x1C21Dd0cE3bA89375Fc39F1B134AD15671022660");
    let migrationBundleUtils_instance = await MigrationBundleUtils.at(CONTRACT_ADDRESSES.mainnet.misc.migration_bundle_utils);
	console.log("deployed migrationBundleUtils address:", CONTRACT_ADDRESSES.mainnet.misc.migration_bundle_utils);

    // console.log("========== CommunalFarm_SaddleD4 ==========");
    // // CommunalFarm_SaddleD4 
    // communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.new(
    //     THE_ACCOUNTS[6], 
    //     CONTRACT_ADDRESSES.mainnet.pair_tokens['Saddle alUSD/FEI/FRAX/LUSD'],
    //     [
    //         "FXS",
    //         "TRIBE",
    //         "ALCX",
    //         "LQTY"
    //     ],
    //     [
    //         "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS. E18
    //         "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B", // TRIBE. E18
    //         "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF", // ALCX. E18
    //         "0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D", // LQTY. E18
    //     ], 
    //     [
    //         "0xa448833bEcE66fD8803ac0c390936C79b5FD6eDf", // FXS Deployer
    //         "0x639572471f2f318464dc01066a56867130e45E25", // FEI Timelock
    //         "0x51e029a5Ef288Fb87C5e8Dd46895c353ad9AaAeC", // ALCX Deployer
    //         "0xa850535D3628CD4dFEB528dC85cfA93051Ff2984" // LQTY Deployer
    //     ],
    //     [
    //         11574074074074, // 1 FXS per day
    //         23148148148148, // 2 TRIBE per day
    //         34722222222222, // 3 ALCX per day
    //         46296296296296 // 4 LQTY per day
    //     ],
    // );

    // console.log("========== StakingRewardsMultiGauge_FRAX_MTA ==========");
    // // StakingRewardsMultiGauge_FRAX_MTA 
    // stakingInstanceMultiGauge_FRAX_MTA = await StakingRewardsMultiGauge_FRAX_MTA.new(
    //     THE_ACCOUNTS[6], 
    //     '0x4fB30C5A3aC8e85bC32785518633303C4590752d', // fPmUSD/GUSD since MTA
    //     // CONTRACT_ADDRESSES.mainnet.pair_tokens['mStable FRAX/mUSD'],
    //     CONTRACT_ADDRESSES.mainnet.main.veFXS,
    //     [
    //         "FXS",
    //         "MTA",
    //     ],
    //     [
    //         "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS. E18
    //         "0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2", // MTA. E18
    //     ], 
    //     [
    //         "0x0000000000000000000000000000000000000000", // FXS Gauge Controller. E18
    //         "0x0000000000000000000000000000000000000000", // MTA Gauge Controller. E18
    //     ], 
    //     [
    //         "0xa448833bEcE66fD8803ac0c390936C79b5FD6eDf", // FXS Deployer
    //         "0x19F12C947D25Ff8a3b748829D8001cA09a28D46d", // MTA Deployer
    //     ],
    //     [
    //         11574074074074, // 1 FXS per day
    //         23148148148148, // 2 MTA per day
    //     ],
    // );

    console.log("========== FraxPoolMultiCollateral ==========");
    // FraxPoolMultiCollateral 
    pool_instance_multicollateral = await FraxPoolMultiCollateral.new(
        THE_ACCOUNTS[3], 
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
        CONTRACT_ADDRESSES.mainnet.main.FRAX,
        CONTRACT_ADDRESSES.mainnet.main.FXS,
        [
            "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", // LUSD
            "0x57ab1ec28d129707052df4df418d58a2d46d5f51", // sUSD
            "0x1456688345527bE1f37E9e627DA0837D6f08C925", // USDP
            "0xa47c8bf37f92abed4a126bda807a7b7498661acd", // Wrapped UST
            "0x956F47F50A910163D8BF957Cf5846D573E7f87CA", // FEI
        ],
        [
            "50000000000000000000000", // LUSD
            "50000000000000000000000", // sUSD
            "50000000000000000000000", // USDP
            "50000000000000000000000", // Wrapped UST
            "50000000000000000000000", // FEI
        ], 
        [
            3000, // Minting Fee
            5500, // Redemption Fee
            6000, // Buyback Fee
            6000, // Recollat Fee
        ], 
    );

	MigrationBundleUtils.setAsDeployed(migrationBundleUtils_instance);
    FRAXOracleWrapper.setAsDeployed(frax_oracle_wrapper_instance);
    FXSOracleWrapper.setAsDeployed(fxs_oracle_wrapper_instance);
    ChainlinkETHUSDPriceConsumer.setAsDeployed(priceConsumerInstance);
    ChainlinkFXSUSDPriceConsumer.setAsDeployed(priceConsumerInstance_FXS);
    Timelock.setAsDeployed(timelockInstance);
    FRAXStablecoin.setAsDeployed(frax_instance);
    FRAXShares.setAsDeployed(fxs_instance);
    GovernorAlpha.setAsDeployed(governanceInstance);
    WETH.setAsDeployed(wethInstance);
    SushiToken.setAsDeployed(sushiInstance);
    Comp.setAsDeployed(compInstance);
    FNX.setAsDeployed(fnxInstance);
    OHM.setAsDeployed(ohmInstance);
    IQToken.setAsDeployed(iqInstance);
    // FRAX3CRV_Mock.setAsDeployed(mockFRAX3CRVInstance);
    MetaImplementationUSD.setAsDeployed(FRAX3CRV_V2_Instance);
    CRV_DAO_ERC20_Mock.setAsDeployed(mockCRVDAOInstance);
    IyUSDC_V2_Partial.setAsDeployed(yUSDC_instance);
    IAAVELendingPool_Partial.setAsDeployed(aUSDC_pool_instance);
    IAAVE_aUSDC_Partial.setAsDeployed(aUSDC_token_instance);
    IcUSDC_Partial.setAsDeployed(cUSDC_instance);
    ICompComptrollerPartial.setAsDeployed(compController_instance);
    ICREAM_crFRAX.setAsDeployed(crFRAX_instance);
    IFNX_CFNX.setAsDeployed(CFNX_instance);
    IFNX_FPT_FRAX.setAsDeployed(IFNX_FPT_FRAX_instance);
    IFNX_FPT_B.setAsDeployed(IFNX_FPT_B_instance);
    IFNX_IntegratedStake.setAsDeployed(IFNX_IntegratedStake_instance);
    IFNX_MinePool.setAsDeployed(IFNX_MinePool_instance);
    IFNX_TokenConverter.setAsDeployed(IFNX_TokenConverter_instance);
    IFNX_ManagerProxy.setAsDeployed(IFNX_ManagerProxy_instance);
    UniswapV2Router02.setAsDeployed(routerInstance);
    UniswapV2Factory.setAsDeployed(uniswapFactoryInstance);
    IUniswapV3PositionsNFT.setAsDeployed(uniswapV3PositionsNFTInstance);
    UniswapPairOracle_FRAX_WETH.setAsDeployed(oracle_instance_FRAX_WETH);
    UniswapPairOracle_FRAX_USDC.setAsDeployed(oracle_instance_FRAX_USDC);
    UniswapPairOracle_FRAX_FXS.setAsDeployed(oracle_instance_FRAX_FXS);
    UniswapPairOracle_FXS_WETH.setAsDeployed(oracle_instance_FXS_WETH);
    UniswapPairOracle_FXS_USDC.setAsDeployed(oracle_instance_FXS_USDC);
    UniswapPairOracle_USDC_WETH.setAsDeployed(oracle_instance_USDC_WETH);
    SwapToPrice.setAsDeployed(swapToPriceInstance);
    PIDController.setAsDeployed(pid_controller_instance);
    ReserveTracker.setAsDeployed(reserve_tracker_instance);
    // StakingRewards_FRAX_WETH.setAsDeployed(stakingInstance_FRAX_WETH);
    // StakingRewards_FRAX_USDC.setAsDeployed(stakingInstance_FRAX_USDC);
    // StakingRewards_FRAX_FXS.setAsDeployed(stakingInstance_FRAX_FXS);
    //StakingRewardsDual_FRAX_FXS_Sushi.setAsDeployed(stakingInstanceDual_FRAX_FXS_Sushi);
    //StakingRewardsDual_FXS_WETH_Sushi.setAsDeployed(stakingInstanceDual_FXS_WETH_Sushi);
    //StakingRewardsDualV2_FRAX3CRV_V2.setAsDeployed(stakingInstanceDualV2_FRAX3CRV_V2);
    StakingRewardsDualV5_FRAX_OHM.setAsDeployed(stakingInstanceDualV5_FRAX_OHM);
    FraxCrossChainFarm_FRAX_mUSD.setAsDeployed(fraxCrossChainFarm_FRAX_mUSD);
    CommunalFarm_SaddleD4.setAsDeployed(communalFarmInstance_Saddle_D4);
    // StakingRewardsMultiGauge_FRAX_MTA.setAsDeployed(stakingInstanceMultiGauge_FRAX_MTA);
    FraxUniV3Farm_Stable_FRAX_USDC.setAsDeployed(fraxUniV3Farm_Stable_FRAX_USDC);
    FraxUniV3Farm_Stable_FRAX_DAI.setAsDeployed(fraxUniV3Farm_Stable_FRAX_DAI);
    FraxUniV3Farm_Volatile_FRAX_WETH.setAsDeployed(fraxUniV3Farm_Volatile_FRAX_WETH);
    FraxMiddlemanGauge_FRAX_mUSD.setAsDeployed(middlemanGauge_FRAX_mUSD);
    // FXBA10000M3.setAsDeployed(bondInstance_FXBA10000M3);
    FraxBond.setAsDeployed(fxbInstance);
    FraxBondIssuer.setAsDeployed(bondIssuerInstance);
    // UniLPToSushiLPMigrator.setAsDeployed(uniLPToSushiLPMigratorInstance);
    FraxPoolInvestorForV2.setAsDeployed(investor_amo_v1_instance);
    InvestorAMO_V2.setAsDeployed(investor_amo_v2_instance);
    FXS1559_AMO.setAsDeployed(fxs_1559_amo_instance);
    // StakeDAO_AMO.setAsDeployed(stakedao_amo_instance);
    // OHM_AMO.setAsDeployed(ohm_amo_instance);
    FraxLendingAMO.setAsDeployed(fraxLendingAMO_instance);
    RariFuseLendingAMO.setAsDeployed(rari_amo_instance);
    FakeCollateral_USDC.setAsDeployed(usdc_instance);
    Pool_USDC.setAsDeployed(pool_instance_USDC);
    FraxPoolMultiCollateral.setAsDeployed(pool_instance_multicollateral);
    PoolvAMM_USDC.setAsDeployed(pool_instance_USDC_vAMM);
    LiquidityGaugeV2.setAsDeployed(liquidity_gauge_v2_instance);
    FraxGaugeController.setAsDeployed(frax_gauge_controller);
    FraxGaugeFXSRewardsDistributor.setAsDeployed(gauge_rewards_distributor_instance);
    CurveAMO_V3.setAsDeployed(curve_amo_v3_instance);
    // CurveAMO_V4.setAsDeployed(curve_amo_v4_instance);
    FXSRewards.setAsDeployed(FXSRewards_instance);
    veFXS.setAsDeployed(veFXS_instance);
    veFXSYieldDistributorV4.setAsDeployed(veFXSYieldDistributorV4_instance);
    // SmartWalletWhitelist.setAsDeployed(smart_wallet_whitelist_instance);
    // MicroVeFXSStaker.setAsDeployed(micro_vefxs_staker_instance);
}