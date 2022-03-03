const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Flashbot related
const MigrationBundleUtils = artifacts.require("Utils/MigrationBundleUtils.sol");

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");
const TickMath = artifacts.require("Uniswap_V3/libraries/TickMath");
const LiquidityAmounts = artifacts.require("Uniswap_V3/libraries/LiquidityAmounts");
const Testing = artifacts.require("Uniswap_V3/libraries/Testing");

// Rewards and fake token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const OHM = artifacts.require("ERC20/Variants/OHM");
const IQToken = artifacts.require("ERC20/Variants/IQToken");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracleExtra_SDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracleExtra_SDT_WETH");
const ComboOracle = artifacts.require("Oracle/ComboOracle");
const ComboOracle_UniV2_UniV3 = artifacts.require("Oracle/ComboOracle_UniV2_UniV3");
const PIDController = artifacts.require("Oracle/PIDController");
const ReserveTracker = artifacts.require("Oracle/ReserveTracker");
const FRAXOracleWrapper = artifacts.require("Oracle/FRAXOracleWrapper");
const FXSOracleWrapper = artifacts.require("Oracle/FXSOracleWrapper");
const CPITrackerOracle = artifacts.require("Oracle/CPITrackerOracle");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkFXSUSDPriceConsumer = artifacts.require("Oracle/ChainlinkFXSUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

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
const StakingRewardsMultiGauge_FXS_WETH = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_FXS_WETH");
const StakingRewardsMultiGauge_FRAX_SUSHI = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_FRAX_SUSHI");
const FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI");
const FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE");
const FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX");
const FraxUnifiedFarm_UniV3_FRAX_RAI = artifacts.require("Staking/Variants/FraxUnifiedFarm_UniV3_FRAX_RAI");
const FraxMiddlemanGauge_ARBI_Curve_VSTFRAX = artifacts.require("Curve/Middleman_Gauges/FraxMiddlemanGauge_ARBI_Curve_VSTFRAX");
const FraxMiddlemanGauge_FRAX_mUSD = artifacts.require("Curve/Middleman_Gauges/FraxMiddlemanGauge_FRAX_mUSD");


// Migrator contracts
// const UniLPToSushiLPMigrator = artifacts.require("Staking/UniLPToSushiLPMigrator");

// Bond NFT contracts
// const FraxBond_NFT_Library = artifacts.require("FXB/FraxBond_NFT_Library");
// const FXBA10000M3 = artifacts.require("FXB/Variants/FXBA10000M3");

// // Bond contracts
// const FraxBond = artifacts.require("FXB/FraxBond");
// const FraxBondIssuer = artifacts.require("FXB/FraxBondIssuer");

// Investor and lending contract related
// const FraxPoolInvestorForV2 = artifacts.require("Misc_AMOs/FraxPoolInvestorForV2");
// const InvestorAMO_V3 = artifacts.require("Misc_AMOs/InvestorAMO_V3");
// const FraxLendingAMO_V2 = artifacts.require("Misc_AMOs/FraxLendingAMO_V2");
const IyUSDC_V2_Partial = artifacts.require("Misc_AMOs/yearn/IyUSDC_V2_Partial");
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial");
const IAAVE_aFRAX = artifacts.require("Misc_AMOs/aave/IAAVE_aFRAX");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial");
const IComptroller = artifacts.require("Misc_AMOs/compound/IComptroller");

// const ICREAM_crFRAX = artifacts.require("Misc_AMOs/cream/ICREAM_crFRAX");

// Curve Metapool and AMO
const CurveAMO_V4 = artifacts.require("Curve/CurveAMO_V4");
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const MIM3CRV_Metapool = artifacts.require("Curve/IMetaImplementationUSD");
const LiquidityGaugeV2 = artifacts.require("Curve/ILiquidityGaugeV2");
const IFraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const IFraxGaugeControllerV2 = artifacts.require("Curve/IFraxGaugeControllerV2");
const FraxGaugeController = artifacts.require("Curve/FraxGaugeController");
const FraxGaugeControllerV2 = artifacts.require("Curve/FraxGaugeControllerV2");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

// Misc AMOs
const FXS1559_AMO_V3 = artifacts.require("Misc_AMOs/FXS1559_AMO_V3");
const StakeDAO_AMO_V2 = artifacts.require("Misc_AMOs/StakeDAO_AMO_V2");
const Convex_AMO_V2 = artifacts.require("Misc_AMOs/Convex_AMO_V2");
const MIM_Convex_AMO = artifacts.require("Misc_AMOs/MIM_Convex_AMO");
const CurveMetapoolLockerAMO = artifacts.require("Misc_AMOs/CurveMetapoolLockerAMO");
const RariFuseLendingAMO_V2 = artifacts.require("Misc_AMOs/RariFuseLendingAMO_V2");
const UniV3LiquidityAMO_V2 = artifacts.require("Misc_AMOs/UniV3LiquidityAMO_V2");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");
const FraxLiquidityBridger_AUR_Rainbow = artifacts.require("Bridges/Aurora/FraxLiquidityBridger_AUR_Rainbow");
const FraxLiquidityBridger_MNBM_Nomad = artifacts.require("Bridges/Moonbeam/FraxLiquidityBridger_MNBM_Nomad");
const FraxLiquidityBridger_OPTI_Celer = artifacts.require("Bridges/Optimism/FraxLiquidityBridger_OPTI_Celer");
const AaveAMO = artifacts.require("Misc_AMOs/AaveAMO");
const TokenTrackerV2 = artifacts.require("Misc_AMOs/TokenTrackerV2");
const MSIGHelper = artifacts.require("Misc_AMOs/MSIGHelper");

// veFXS
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSYieldDistributorV4 = artifacts.require("Staking/veFXSYieldDistributorV4.sol");
const SmartWalletWhitelist = artifacts.require("Curve/SmartWalletWhitelist");
const MicroVeFXSStaker = artifacts.require("Staking/MicroVeFXSStaker");
const veFXSBoost = artifacts.require("Curve/IVotingEscrowDelegation");
const veFXSBoostDelegationProxy = artifacts.require("Curve/IDelegationProxy");

// FXSRewards
const FXSRewards = artifacts.require("Staking/FXSRewards.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;
	let timelockInstance;
	let frax_instance;
	let fxs_instance;

	let governanceInstance;
    let FRAX3CRV_V2_Instance;

    const ADDRESS_WITH_USDC = '0x68A99f89E475a078645f4BAC491360aFe255Dff1';

	let routerInstance;
	let uniswapFactoryInstance;
    let uniswapV3PositionsNFTInstance;

	let oracle_instance_FRAX_USDC;
    let tickMath_instance;
    let liquidityAmounts_instance;
    let testing_instance;
	
	let oracle_instance_FRAX_FXS;
	let oracle_instance_FXS_WETH;
	let oracle_instance_USDC_WETH;
    let oracle_extra_instance_SDT_WETH;
    let combo_oracle_instance;
    let combo_oracle_instance_univ2_univ3;
    
	let pid_controller_instance;
    let reserve_tracker_instance;

    let frax_oracle_wrapper_instance;
    let fxs_oracle_wrapper_instance;
    let cpi_tracker_oracle_instance;

    let stakingInstanceDualV5_FRAX_OHM;
    let communalFarmInstance_Saddle_D4;
    let fraxUniV3Farm_Stable_FRAX_USDC;
    let fraxUniV3Farm_Stable_FRAX_DAI;
    let stakingInstanceMultiGauge_FXS_WETH;
    let fraxUnifiedFarm_Gelato_FRAX_DAI_instance;
    let fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance;
    let fraxUnifiedFarm_Vesper_FRAX_instance;
    let fraxUnifiedFarm_UniV3_FRAX_RAI_instance;
    let fraxCrossChainFarm_FRAX_mUSD;
    let middlemanGauge_ARBI_Curve_VSTFRAX;
    let middlemanGauge_FRAX_mUSD;

	let pool_instance_USDC;
    let pool_instance_v3;

    let investor_amo_v1_instance;
    let investor_amo_v3_instance;
    // let fraxLendingAMO_V2_instance;
    let ohm_amo_instance;
    let rari_amo_instance;
    let frax_amo_minter_instance;
    let yUSDC_instance;
    let aUSDC_pool_instance;
    let aUSDC_token_instance;
    let aFRAX_token_instance;
    let cUSDC_instance;
    let compController_instance;
    let crFRAX_instance;
    let aaveAMO_instance;

    let curve_factory_instance;
    let FRAX_3CRV_metapool_instance;
    let frax_gauge_controller;
    let frax_gauge_controller_v2;
    let gauge_rewards_distributor_instance;
    let liquidity_gauge_v2_instance;
    let curve_amo_v3_instance;
    let curve_metapool_locker_instance;
    let convex_amo_instance;
    let frax_liquidity_bridger_arbi_anyswap_instance;
    let frax_cc_liq_tracker_instance;
    let univ3_liquidity_amo_instance;
    let univ3_liquidity_amo_v2_instance;
    let token_tracker_v2_instance;
    let msig_helper_instance;

    let veFXS_instance;
    let FXSRewards_instance;
    let veFXSYieldDistributorV4_instance;
    let priceConsumerInstance_FXS;
    let smart_wallet_whitelist_instance;
    let micro_vefxs_staker_instance;
    let vefxs_boost_instance;
    let vefxs_boost_deleg_proxy_instance;

    let frax_liquidity_bridger_aur_rainbow_instance;
    let frax_liquidity_bridger_mnbm_nomad_instance;
    let frax_liquidity_bridger_opti_celer_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    const ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
    const COMPTROLLER_ADDRESS = CONTRACT_ADDRESSES.ethereum.multisigs["Comptrollers"];

    priceConsumerInstance = await ChainlinkETHUSDPriceConsumer.at(CONTRACT_ADDRESSES.ethereum.pricing.chainlink_eth_usd);
    priceConsumerInstance_FXS = await ChainlinkFXSUSDPriceConsumer.at(CONTRACT_ADDRESSES.ethereum.pricing.chainlink_fxs_usd);   
    timelockInstance = await Timelock.at(CONTRACT_ADDRESSES.ethereum.misc.timelock);
    frax_instance = await FRAXStablecoin.at(CONTRACT_ADDRESSES.ethereum.main.FRAX);
    fxs_instance = await FRAXShares.at(CONTRACT_ADDRESSES.ethereum.main.FXS);
    veFXS_instance = await veFXS.at(CONTRACT_ADDRESSES.ethereum.main.veFXS);
    vefxs_boost_instance = await veFXSBoost.at(CONTRACT_ADDRESSES.ethereum.main.veFXS_boost);
    vefxs_boost_deleg_proxy_instance = await veFXSBoostDelegationProxy.at(CONTRACT_ADDRESSES.ethereum.main.veFXS_boost_delegation_proxy);
    governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES.ethereum.governance);
    usdc_instance = await ERC20.at(CONTRACT_ADDRESSES.ethereum.collaterals.USDC);
    FRAX3CRV_V2_Instance = await MetaImplementationUSD.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Curve FRAX3CRV-f-2"]);
    MIM3CRV_instance = await MIM3CRV_Metapool.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Curve MIM3CRV"])
    yUSDC_instance = await IyUSDC_V2_Partial.at(CONTRACT_ADDRESSES.ethereum.investments["yearn_yUSDC_V2"]);
    aUSDC_pool_instance = await IAAVELendingPool_Partial.at(CONTRACT_ADDRESSES.ethereum.investments["aave_aUSDC_Pool"]);
    aUSDC_token_instance = await IAAVE_aUSDC_Partial.at(CONTRACT_ADDRESSES.ethereum.investments["aave_aUSDC_Token"]);
    aFRAX_token_instance = await IAAVE_aFRAX.at(CONTRACT_ADDRESSES.ethereum.investments["aave_aFRAX_Token"]);
    cUSDC_instance = await IcUSDC_Partial.at(CONTRACT_ADDRESSES.ethereum.investments["compound_cUSDC"]);
    compController_instance = await IComptroller.at(CONTRACT_ADDRESSES.ethereum.investments["compound_controller"]);

    // crFRAX_instance = await ICREAM_crFRAX.at(CONTRACT_ADDRESSES.ethereum.investments["cream_crFRAX"]);

    routerInstance = await IUniswapV2Router02.at(CONTRACT_ADDRESSES.ethereum.uniswap_other.router); 
    uniswapFactoryInstance = await IUniswapV2Factory.at(CONTRACT_ADDRESSES.ethereum.uniswap_other.factory); 
    uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager); 

    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.at(CONTRACT_ADDRESSES.ethereum.retired_oracles.FRAX_USDC); 
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(CONTRACT_ADDRESSES.ethereum.retired_oracles.FXS_WETH);
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(CONTRACT_ADDRESSES.ethereum.retired_oracles.USDC_WETH);
    // oracle_extra_instance_SDT_WETH = await UniswapPairOracleExtra_SDT_WETH.at(CONTRACT_ADDRESSES.ethereum.oracles.SDT_WETH);
    combo_oracle_instance = await ComboOracle.at(CONTRACT_ADDRESSES.ethereum.oracles_other.combo_oracle);
    combo_oracle_instance_univ2_univ3 = await ComboOracle_UniV2_UniV3.at(CONTRACT_ADDRESSES.ethereum.oracles_other.combo_oracle_univ2_univ3);

    frax_oracle_wrapper_instance = await FRAXOracleWrapper.at(CONTRACT_ADDRESSES.ethereum.pricing.frax_oracle_wrapper);
    fxs_oracle_wrapper_instance = await FXSOracleWrapper.at(CONTRACT_ADDRESSES.ethereum.pricing.fxs_oracle_wrapper);

    reserve_tracker_instance = await ReserveTracker.at(CONTRACT_ADDRESSES.ethereum.pid_related.reserve_tracker);
    pid_controller_instance = await PIDController.at(CONTRACT_ADDRESSES.ethereum.pid_related.pid_controller);

    stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap FRAX/OHM']);
    communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Saddle alUSD/FEI/FRAX/LUSD']);
    fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap V3 FRAX/DAI']);
    fraxUniV3Farm_Stable_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap V3 FRAX/USDC']);
    middlemanGauge_ARBI_Curve_VSTFRAX = await FraxMiddlemanGauge_ARBI_Curve_VSTFRAX.at(CONTRACT_ADDRESSES.ethereum.middleman_gauges['Curve VSTFRAX-f']);
    middlemanGauge_FRAX_mUSD = await FraxMiddlemanGauge_FRAX_mUSD.at(CONTRACT_ADDRESSES.ethereum.middleman_gauges['mStable FRAX/mUSD']);
    
    // fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap V3 FRAX/DAI']);
    stakingInstanceMultiGauge_FRAX_SUSHI = await StakingRewardsMultiGauge_FRAX_SUSHI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Sushi FRAX/SUSHI']);
    fraxUnifiedFarm_Gelato_FRAX_DAI_instance = await FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Gelato Uniswap FRAX/DAI']);
    fraxUnifiedFarm_Vesper_FRAX_instance = await FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Vesper Orbit FRAX']);
    fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance = await FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Temple FRAX/TEMPLE']);

    pool_instance_USDC = await Pool_USDC.at(CONTRACT_ADDRESSES.ethereum.pools.USDC_V2);
    pool_instance_v3 = await FraxPoolV3.at(CONTRACT_ADDRESSES.ethereum.pools.V3);
    
    // investor_amo_v1_instance = await FraxPoolInvestorForV2.at(CONTRACT_ADDRESSES.ethereum.misc.investor_amo_V1);
    // investor_amo_v3_instance = await InvestorAMO_V3.at(CONTRACT_ADDRESSES.ethereum.misc.investor_amo);
    // fraxLendingAMO_V2_instance = await FraxLendingAMO_V2.at(CONTRACT_ADDRESSES.ethereum.misc.lending_amo);
    curve_amo_v3_instance = await CurveAMO_V4.at(CONTRACT_ADDRESSES.ethereum.misc.curve_amo);
    // curve_metapool_locker_instance = await CurveMetapoolLockerAMO.at(CONTRACT_ADDRESSES.ethereum.misc.curve_metapool_locker_amo);
    fxs_1559_amo_instance = await FXS1559_AMO_V3.at(CONTRACT_ADDRESSES.ethereum.misc.fxs_1559_amo);
    rari_amo_instance = await RariFuseLendingAMO_V2.at(CONTRACT_ADDRESSES.ethereum.misc.rari_amo);
    aaveAMO_instance = await AaveAMO.at(CONTRACT_ADDRESSES.ethereum.misc.aave_amo);
    stakedao_amo_instance = await StakeDAO_AMO_V2.at(CONTRACT_ADDRESSES.ethereum.misc.stakedao_amo);
    token_tracker_v2_instance = await TokenTrackerV2.at(CONTRACT_ADDRESSES.ethereum.misc.token_tracker_v2);
    MIM_Convex_AMO_instance = await MIM_Convex_AMO.at(CONTRACT_ADDRESSES.ethereum.misc.mim_convex_amo);
    univ3_liquidity_amo_v2_instance = await UniV3LiquidityAMO_V2.at(CONTRACT_ADDRESSES.ethereum.misc.uniV3_liquidity_amo);
    msig_helper_instance = await MSIGHelper.at(CONTRACT_ADDRESSES.ethereum.misc.msig_helper);

    liquidity_gauge_v2_instance = await LiquidityGaugeV2.at(CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_v2);
    frax_gauge_controller = await FraxGaugeController.at(CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_controller);
    frax_gauge_controller_v2 = await FraxGaugeControllerV2.at(CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_controller_v2);
    gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.at(CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_rewards_distributor);

    frax_amo_minter_instance = await FraxAMOMinter.at(CONTRACT_ADDRESSES.ethereum.misc.amo_minter);

    veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV4.at(CONTRACT_ADDRESSES.ethereum.misc.vefxs_yield_distributor_v4);   

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // // Overrides live deploy, for testing purposes
    // console.log(chalk.yellow('========== FraxGaugeController =========='));
    // // FraxGaugeController
    // frax_gauge_controller = await FraxGaugeController.new(
    //     fxs_instance.address,
    //     veFXS_instance.address
    // );
    // // Add in a gauge type
    // await frax_gauge_controller.add_type("Ethereum Mainnet", "1000000000000000000", { from: THE_ACCOUNTS[0] });

    // console.log(chalk.yellow('========== FraxGaugeControllerV2 =========='));
    // // FraxGaugeControllerV2
    // frax_gauge_controller_v2 = await FraxGaugeControllerV2.new(
    //     fxs_instance.address,
    //     veFXS_instance.address
    // );

    // // Add in a gauge type
    // await frax_gauge_controller_v2.add_type("Ethereum Mainnet", "1000000000000000000", { from: THE_ACCOUNTS[0] });

    // console.log(chalk.yellow("========== FraxMiddlemanGauge_ARBI_Curve_VSTFRAX =========="));
    // middlemanGauge_ARBI_Curve_VSTFRAX = await FraxMiddlemanGauge_ARBI_Curve_VSTFRAX.new(
    //     THE_ACCOUNTS[1], 
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_rewards_distributor, 
    //     CONTRACT_ADDRESSES.ethereum.bridges.fxs.arbitrum,
    //     6,
	// 	CONTRACT_ADDRESSES.arbitrum.staking_contracts['Curve VSTFRAX-f'],
    //     "",
    //     "Arbitrum Curve VSTFRAX-f Middleman Gauge",
    // );


    // console.log(chalk.yellow("========== FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE =========="));
    // // // FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE 
    // fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance = await FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.new(
    //     THE_ACCOUNTS[6], 
    //     [
    //         "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS
    //         "0x470EBf5f030Ed85Fc1ed4C2d36B9DD02e77CF1b7" // TEMPLE
    //     ], 
    //     [
    //         "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27", // Frax Msig
    //         "0x4D6175d58C5AceEf30F546C0d5A557efFa53A950" // Temple DAO Msig
    //     ],
    //     [
    //         11574074074074, 
    //         0
    //     ],
    //     [
    //         "0x0000000000000000000000000000000000000000", // Deploy the gauge controller address empty
    //         "0x0000000000000000000000000000000000000000"
    //     ],
    //     [
    //         "0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34", // FXS reward distributor
    //         "0x0000000000000000000000000000000000000000"
    //     ],
    //     CONTRACT_ADDRESSES.ethereum.pair_tokens['Temple FRAX/TEMPLE'],
    // );


    // console.log(chalk.yellow("========== FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX =========="));
    // FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX 
    // fraxUnifiedFarm_Vesper_FRAX_instance = await FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX.new(
    //     THE_ACCOUNTS[6], 
    //     [
    //         "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS
    //         "0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421" // VSP
    //     ], 
    //     [
    //         "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27", // Frax Msig
    //         "0x9520b477Aa81180E6DdC006Fc09Fb6d3eb4e807A" // Vesper Msig
    //     ],
    //     [
    //         11574074074074, 
    //         0
    //     ],
    //     [
    //         "0x0000000000000000000000000000000000000000", // Deploy the gauge controller address empty
    //         "0x0000000000000000000000000000000000000000"
    //     ],
    //     [
    //         "0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34", // FXS reward distributor
    //         "0x0000000000000000000000000000000000000000"
    //     ],
    //     CONTRACT_ADDRESSES.ethereum.pair_tokens['Vesper Orbit FRAX'],
    // );

    console.log(chalk.yellow("========== FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI =========="));
    // FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI 
    fraxUnifiedFarm_Gelato_FRAX_DAI_instance = await FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI.new(
        THE_ACCOUNTS[6], 
        [
            "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS
            "0x15b7c0c907e4C6b9AdaAaabC300C08991D6CEA05" // GEL
        ], 
        [
            "0x234D953a9404Bf9DbC3b526271d440cD2870bCd2", // Frax[1]
            "0xeD5cF41b0fD6A3C564c17eE34d9D26Eafc30619b" // Gelato Msig
        ],
        [
            11574074074074, 
            0
        ],
        [
            "0x0000000000000000000000000000000000000000", // Deploy the gauge controller address empty
            "0x0000000000000000000000000000000000000000"
        ],
        [
            "0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34", // FXS reward distributor
            "0x0000000000000000000000000000000000000000"
        ],
        CONTRACT_ADDRESSES.ethereum.pair_tokens['Gelato Uniswap FRAX/DAI'],
    );

    console.log(chalk.yellow("========== FraxUnifiedFarm_UniV3_FRAX_RAI =========="));
    // FraxUnifiedFarm_UniV3_FRAX_RAI 
    fraxUnifiedFarm_UniV3_FRAX_RAI_instance = await FraxUnifiedFarm_UniV3_FRAX_RAI.new(
        THE_ACCOUNTS[6], 
        [
            "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS
            "0x6243d8CEA23066d098a15582d81a598b4e8391F4" // FLX: Reflexer Ungovernance Token
        ], 
        [
            "0x234D953a9404Bf9DbC3b526271d440cD2870bCd2", // Frax[1]
            "0xbE74e7AA108436324D5dd3db4979Db3Ba2cAEbcB" // Rai Msig
        ],
        [
            11574074074074, // 1 FXS per day
            11574074074074 // 1 FLX per day
        ],
        [
            "0x0000000000000000000000000000000000000000", // Deploy the gauge controller address empty
            "0x0000000000000000000000000000000000000000"
        ],
        [
            "0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34", // FXS reward distributor
            "0x0000000000000000000000000000000000000000"
        ],
        165457
    );

    // console.log(chalk.yellow('========== Convex_AMO_V2 =========='));
    // // Convex_AMO_V2
    // convex_amo_instance = await Convex_AMO_V2.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow('========== MIM_Convex_AMO =========='));
    // // MIM_Convex_AMO
    // MIM_Convex_AMO_instance = await MIM_Convex_AMO.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );    

    // console.log(chalk.yellow('========== CurveAMO_V4 =========='));
    // // CurveAMO_V4
    // curve_amo_v4_instance = await CurveAMO_V4.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow('========== CurveMetapoolLockerAMO =========='));
    // // CurveMetapoolLockerAMO
    // curve_metapool_locker_instance = await CurveMetapoolLockerAMO.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );


    // console.log(chalk.yellow('========== FraxPoolInvestorForV2 =========='));
    // // FraxPoolInvestorForV2
    // investor_amo_v1_instance = await FraxPoolInvestorForV2.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );


    // console.log(chalk.yellow('========== FXS1559_AMO_V3 =========='));
    // // FXS1559_AMO_V3
    // fxs_1559_amo_instance = await FXS1559_AMO_V3.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.vefxs_yield_distributor_v4,
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow('========== UniswapPairOracleExtra_SDT_WETH =========='));
    // // UniswapPairOracleExtra_SDT_WETH
    // oracle_extra_instance_SDT_WETH = await UniswapPairOracleExtra_SDT_WETH.new(
    //     "0xc465C0a16228Ef6fE1bF29C04Fdb04bb797fd537",
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     "SDT/ETH", 
    //     ADDRS_ETH.reward_tokens.sdt
    // );

    // console.log(chalk.yellow('========== ComboOracle =========='));
    // // ComboOracle
    // combo_oracle_instance = await ComboOracle.new(
    //     THE_ACCOUNTS[1],
    //     "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH / USD
    //     ADDRS_ETH.reward_tokens.weth, // WETH
    //     "ETH",
    //     "WETH"
    // );

    // console.log(chalk.yellow('========== ComboOracle_UniV2_UniV3 =========='));
    // // ComboOracle_UniV2_UniV3
    // combo_oracle_instance_univ2_univ3 = await ComboOracle_UniV2_UniV3.new(
    //     THE_ACCOUNTS[1],
    //     [
	// 		CONTRACT_ADDRESSES.ethereum.canonicals.FRAX,
	// 		CONTRACT_ADDRESSES.ethereum.canonicals.FXS,
	// 		combo_oracle_instance.address, // CONTRACT_ADDRESSES.ethereum.oracles_other.combo_oracle,
	// 		CONTRACT_ADDRESSES.ethereum.uniswap_other.router, // IUniswapV2Router02
	// 		CONTRACT_ADDRESSES.ethereum.uniswap_v3.UniswapV3Factory, // IUniswapV3Factory
	// 		CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager, // INonfungiblePositionManager
	// 		CONTRACT_ADDRESSES.ethereum.uniswap_v3.SwapRouter // ISwapRouter
	// 	]
    // );
    
    // console.log(chalk.yellow('========== TokenTrackerV2 =========='));
    // // TokenTrackerV2
    // token_tracker_v2_instance = await TokenTrackerV2.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address,
    //     combo_oracle_instance.address,
    //     [
    //         CONTRACT_ADDRESSES.ethereum.multisigs["Comptrollers"], // Comptroller multisig
    //         CONTRACT_ADDRESSES.ethereum.investor_custodian, // Investor custodian
    //         "0x66A3bF55E5Aa23b1ea0078Cc9C0CFD5e52D5F82e", // OHM-Only Test wallet
    //     ]
    // );


    console.log(chalk.yellow('========== CPITrackerOracle =========='));
    // CPITrackerOracle
    cpi_tracker_oracle_instance = await CPITrackerOracle.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock
    );
    
    // console.log(chalk.yellow('========== RariFuseLendingAMO_V2 =========='));
    // // RariFuseLendingAMO_V2
    // rari_amo_instance = await RariFuseLendingAMO_V2.new(
    //     THE_ACCOUNTS[1],
    //     [
    //         "0x814b02C1ebc9164972D888495927fe1697F0Fb4c", // Pool #6: [Unitroller] Tetranode's Locker.
    //         "0xfb558ecd2d24886e8d2956775c619deb22f154ef", // Pool #7: [Unitroller] ChainLinkGod's / Tetranode's Up Only Pool
    //         "0xd4bdcca1ca76ced6fc8bb1ba91c5d7c0ca4fe567", // Pool #9: [Unitroller] Frax & Reflexer Stable Asset Pool
    //         "0x621579dd26774022f33147d3852ef4e00024b763", // Pool #18: [Unitroller] Olympus Pool Party Frax
    //         "0x64858bac30f4cc223ea07adc09a51acdcd225998", // Pool #24: [Unitroller] Harvest FARMstead
    //         "0xC202Be8EbaF758A7dc8f227e6De88bE5D28c69dd", // Pool #26: [Unitroller] Token Mass Injection Pool
    //         "0x35De88F04aD31a396aedb33f19aebe7787C02560", // Pool #27: [Unitroller] Stake DAO Pool
    //     ],
    //     [
    //         "0x1531C1a63A169aC75A2dAAe399080745fa51dE44", // Pool #6: [CErc20Delegator] Tetranode's Locker.
    //         "0x6313c160b329db59086df28ed2bf172a82f0d9d1", // Pool #7: [CErc20Delegator] ChainLinkGod's / Tetranode's Up Only Pool
    //         "0x0f43a7e3f7b529015B0517D0D9Aa9b95701fd2Cb", // Pool #9: [CErc20Delegator] Frax & Reflexer Stable Asset Pool
    //         "0x3e5c122ffa75a9fe16ec0c69f7e9149203ea1a5d", // Pool #18: [CErc20Delegator] Olympus Pool Party Frax
    //         "0x0A6eAfaA84188A146749D7864bB20E63bD16ea2A", // Pool #24: [CErc20Delegator] Harvest FARMstead
    //         "0x2e818c80844D35C8E1667cECA03f31074Ef6bB46", // Pool #26: [CErc20Delegator] Token Mass Injection Pool
    //         "0x9de558FCE4F289b305E38ABe2169b75C626c114e", // Pool #27: [CErc20Delegator] Stake DAO Pool
    //     ],
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow('========== StakeDAO_AMO_V2 =========='));
    // // StakeDAO_AMO_V2
    // stakedao_amo_instance = await StakeDAO_AMO_V2.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );

    console.log(chalk.yellow('========== FraxLiquidityBridger_AUR_Rainbow =========='));
    // FraxLiquidityBridger_AUR_Rainbow
    frax_liquidity_bridger_aur_rainbow_instance = await FraxLiquidityBridger_AUR_Rainbow.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        frax_amo_minter_instance.address,
        [
            CONTRACT_ADDRESSES.ethereum.bridges.frax.aurora,
            CONTRACT_ADDRESSES.ethereum.bridges.fxs.aurora,
            CONTRACT_ADDRESSES.ethereum.bridges.collateral.aurora
        ],
        "0x0000000000000000000000000000000000000000", // Aurora goes to same address on other side
        "",
        "FRAX Aurora Rainbow Liquidity Bridger",
    );
    const account_id = (`aurora:${frax_liquidity_bridger_aur_rainbow_instance.address.replace("0x", "")}`).toLowerCase();
    console.log("account_id: ", account_id);
    await frax_liquidity_bridger_aur_rainbow_instance.setAccountID(account_id, false, { from: THE_ACCOUNTS[1] });

    // console.log(chalk.yellow('========== FraxLiquidityBridger_OPTI_Celer =========='));
    // // FraxLiquidityBridger_OPTI_Celer
    // frax_liquidity_bridger_opti_celer_instance = await FraxLiquidityBridger_OPTI_Celer.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     frax_amo_minter_instance.address,
    //     [
    //         CONTRACT_ADDRESSES.ethereum.bridges.frax.optimism,
    //         CONTRACT_ADDRESSES.ethereum.bridges.fxs.optimism,
    //         CONTRACT_ADDRESSES.ethereum.bridges.collateral.optimism
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Optimism goes to same address on other side
    //     "",
    //     "FRAX Optimism Celer Liquidity Bridger",
    // );
    // let recipient = (`${frax_liquidity_bridger_opti_celer_instance.address.replace("0x", "0x000000000000000000000000")}`).toLowerCase();
    // console.log("recipient: ", recipient);

    // console.log(chalk.yellow('========== FraxLiquidityBridger_MNBM_Nomad =========='));
    // // FraxLiquidityBridger_MNBM_Nomad
    // frax_liquidity_bridger_mnbm_nomad_instance = await FraxLiquidityBridger_MNBM_Nomad.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     frax_amo_minter_instance.address,
    //     [
    //         CONTRACT_ADDRESSES.ethereum.bridges.frax.moonbeam,
    //         CONTRACT_ADDRESSES.ethereum.bridges.fxs.moonbeam,
    //         CONTRACT_ADDRESSES.ethereum.bridges.collateral.moonbeam
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Moonbeam goes to same address on other side
    //     "",
    //     "FRAX Moonbeam Nomad Liquidity Bridger",
    // );
    // let recipient = (`${frax_liquidity_bridger_mnbm_nomad_instance.address.replace("0x", "0x000000000000000000000000")}`).toLowerCase();
    // console.log("recipient: ", recipient);
    // await frax_liquidity_bridger_mnbm_nomad_instance.setRecipient(recipient, { from: THE_ACCOUNTS[1] });

    // // MigrationBundleUtils.setAsDeployed(migrationBundleUtils_instance);
    // console.log(chalk.yellow("========== UniV3LiquidityAMO_V2 =========="));
    // univ3_liquidity_amo_v2_instance = await UniV3LiquidityAMO_V2.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.collaterals.USDC,
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow("========== MSIGHelper =========="));
    // // MSIGHelper 
    // msig_helper_instance = await MSIGHelper.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address, 
    //     CONTRACT_ADDRESSES.ethereum.multisigs["Comptrollers"]
    // );

    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [COMPTROLLER_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR MINTER  =========='));
    // await frax_amo_minter_instance.addAMO(convex_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(curve_amo_v4_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(stakedao_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(rari_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(fxs_1559_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(univ3_liquidity_amo_v2_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(frax_cc_liq_tracker_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(curve_metapool_locker_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(aaveAMO_instance.address, true, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(token_tracker_v2_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(msig_helper_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(MIM_Convex_AMO_instance.address, 0, { from: COMPTROLLER_ADDRESS });

    console.log("Add the liquidity bridgers to the AMO Minter");
    await frax_amo_minter_instance.addAMO(frax_liquidity_bridger_aur_rainbow_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(frax_liquidity_bridger_mnbm_nomad_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(frax_liquidity_bridger_opti_celer_instance.address, 0, { from: COMPTROLLER_ADDRESS });

    // console.log("Add the AMO Minter to the FraxPoolV3");
    // await pool_instance_v3.addAMOMinter(frax_amo_minter_instance.address, { from: COMPTROLLER_ADDRESS });

    // console.log("Unpause the V2 FraxPool redeems");
    // await pool_instance_USDC.toggleRedeeming({ from: COMPTROLLER_ADDRESS });
    
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [COMPTROLLER_ADDRESS]
    });

    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [process.env.STAKING_OWNER_ADDRESS]
    // });    

    // console.log("Add the FXS1559 AMO as a notifier to the yield distributor");
    // await veFXSYieldDistributorV4_instance.toggleRewardNotifier(fxs_1559_amo_instance.address, { from: process.env.STAKING_OWNER_ADDRESS });

    // await hre.network.provider.request({
    //     method: "hardhat_stopImpersonatingAccount",
    //     params: [process.env.STAKING_OWNER_ADDRESS]
    // });

    // ----------------------------------------------
    console.log(chalk.yellow('========== syncDollarBalances  =========='));
    console.log(chalk.red("SKIPPING FOR NOW TO SAVE TIME!!!"));
    console.log(chalk.red("SKIPPING FOR NOW TO SAVE TIME!!!"));
    console.log(chalk.red("SKIPPING FOR NOW TO SAVE TIME!!!"));
    
    // Sync the AMO Minter
    // await frax_amo_minter_instance.syncDollarBalances({ from: THE_ACCOUNTS[3] });

    // ----------------------------------------------
    console.log(chalk.yellow('========== DEPLOY CONTRACTS =========='));

    console.log(chalk.yellow("--------DEPLOYING MISC CONTRACTS--------"));
    IUniswapV2Router02.setAsDeployed(routerInstance);
    IUniswapV2Factory.setAsDeployed(uniswapFactoryInstance);
    IUniswapV3PositionsNFT.setAsDeployed(uniswapV3PositionsNFTInstance);
    liquidityAmounts_instance = await LiquidityAmounts.new();
    LiquidityGaugeV2.setAsDeployed(liquidity_gauge_v2_instance);
    testing_instance = await Testing.new();
    tickMath_instance = await TickMath.new();

    console.log(chalk.yellow("--------DEPLOYING CORE CONTRACTS--------"));
    FraxAMOMinter.setAsDeployed(frax_amo_minter_instance);
    FraxPoolV3.setAsDeployed(pool_instance_v3);
    FraxGaugeController.setAsDeployed(frax_gauge_controller);
    FraxGaugeControllerV2.setAsDeployed(frax_gauge_controller_v2);
    FraxGaugeFXSRewardsDistributor.setAsDeployed(gauge_rewards_distributor_instance);
    FRAXStablecoin.setAsDeployed(frax_instance);
    FRAXShares.setAsDeployed(fxs_instance);
    FXSRewards.setAsDeployed(FXSRewards_instance);
    GovernorAlpha.setAsDeployed(governanceInstance);
    MetaImplementationUSD.setAsDeployed(FRAX3CRV_V2_Instance);
    MIM3CRV_Metapool.setAsDeployed(MIM3CRV_instance);
    PIDController.setAsDeployed(pid_controller_instance);
    Pool_USDC.setAsDeployed(pool_instance_USDC);
    ReserveTracker.setAsDeployed(reserve_tracker_instance);
    Timelock.setAsDeployed(timelockInstance);
    veFXS.setAsDeployed(veFXS_instance);
    veFXSYieldDistributorV4.setAsDeployed(veFXSYieldDistributorV4_instance);
    veFXSBoost.setAsDeployed(vefxs_boost_instance);
    veFXSBoostDelegationProxy.setAsDeployed(vefxs_boost_deleg_proxy_instance);

    console.log(chalk.yellow("--------DEPLOY ORACLE CONTRACTS--------"));
    ChainlinkETHUSDPriceConsumer.setAsDeployed(priceConsumerInstance);
    ChainlinkFXSUSDPriceConsumer.setAsDeployed(priceConsumerInstance_FXS);
    ComboOracle.setAsDeployed(combo_oracle_instance);
    ComboOracle_UniV2_UniV3.setAsDeployed(combo_oracle_instance_univ2_univ3);
    FRAXOracleWrapper.setAsDeployed(frax_oracle_wrapper_instance);
    FXSOracleWrapper.setAsDeployed(fxs_oracle_wrapper_instance);
    CPITrackerOracle.setAsDeployed(cpi_tracker_oracle_instance);
    UniswapPairOracle_FRAX_USDC.setAsDeployed(oracle_instance_FRAX_USDC);
    UniswapPairOracle_FXS_WETH.setAsDeployed(oracle_instance_FXS_WETH);
    UniswapPairOracle_USDC_WETH.setAsDeployed(oracle_instance_USDC_WETH);
    // UniswapPairOracleExtra_SDT_WETH.setAsDeployed(oracle_extra_instance_SDT_WETH);

    console.log(chalk.yellow("--------DEPLOY AMO CONTRACTS--------"));
    AaveAMO.setAsDeployed(aaveAMO_instance);
    Convex_AMO_V2.setAsDeployed(convex_amo_instance);
    MIM_Convex_AMO.setAsDeployed(MIM_Convex_AMO_instance);
    // CurveAMO_V4.setAsDeployed(curve_amo_v4_instance);
    CurveMetapoolLockerAMO.setAsDeployed(curve_metapool_locker_instance);
    // FraxLendingAMO_V2.setAsDeployed(fraxLendingAMO_V2_instance);
    FXS1559_AMO_V3.setAsDeployed(fxs_1559_amo_instance);
    IyUSDC_V2_Partial.setAsDeployed(yUSDC_instance);
    IAAVELendingPool_Partial.setAsDeployed(aUSDC_pool_instance);
    IAAVE_aUSDC_Partial.setAsDeployed(aUSDC_token_instance);
    IAAVE_aFRAX.setAsDeployed(aFRAX_token_instance);
    IcUSDC_Partial.setAsDeployed(cUSDC_instance);
    IComptroller.setAsDeployed(compController_instance);
    MSIGHelper.setAsDeployed(msig_helper_instance);
    RariFuseLendingAMO_V2.setAsDeployed(rari_amo_instance);
    StakeDAO_AMO_V2.setAsDeployed(stakedao_amo_instance);
    TokenTrackerV2.setAsDeployed(token_tracker_v2_instance);
    UniV3LiquidityAMO_V2.setAsDeployed(univ3_liquidity_amo_v2_instance);
    
    console.log(chalk.yellow("--------DEPLOY STAKING CONTRACTS--------"));
    CommunalFarm_SaddleD4.setAsDeployed(communalFarmInstance_Saddle_D4);
    FraxCrossChainFarm_FRAX_mUSD.setAsDeployed(fraxCrossChainFarm_FRAX_mUSD);
    FraxMiddlemanGauge_ARBI_Curve_VSTFRAX.setAsDeployed(middlemanGauge_ARBI_Curve_VSTFRAX);
    FraxMiddlemanGauge_FRAX_mUSD.setAsDeployed(middlemanGauge_FRAX_mUSD);
    FraxUniV3Farm_Stable_FRAX_USDC.setAsDeployed(fraxUniV3Farm_Stable_FRAX_USDC);
    FraxUniV3Farm_Stable_FRAX_DAI.setAsDeployed(fraxUniV3Farm_Stable_FRAX_DAI);
    StakingRewardsDualV5_FRAX_OHM.setAsDeployed(stakingInstanceDualV5_FRAX_OHM);
    StakingRewardsMultiGauge_FRAX_SUSHI.setAsDeployed(stakingInstanceMultiGauge_FRAX_SUSHI);
    FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI.setAsDeployed(fraxUnifiedFarm_Gelato_FRAX_DAI_instance);
    FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.setAsDeployed(fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance);
    FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX.setAsDeployed(fraxUnifiedFarm_Vesper_FRAX_instance);
    FraxUnifiedFarm_UniV3_FRAX_RAI.setAsDeployed(fraxUnifiedFarm_UniV3_FRAX_RAI_instance);
    
    console.log(chalk.yellow("--------DEPLOY LIQUIDITY BRIDGER CONTRACTS--------"));
    FraxLiquidityBridger_AUR_Rainbow.setAsDeployed(frax_liquidity_bridger_aur_rainbow_instance);
    // FraxLiquidityBridger_MNBM_Nomad.setAsDeployed(frax_liquidity_bridger_mnbm_nomad_instance);
    // FraxLiquidityBridger_OPTI_Celer.setAsDeployed(frax_liquidity_bridger_opti_celer_instance);
}