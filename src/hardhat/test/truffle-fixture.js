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
const StakingRewardsMultiGauge_Gelato_FRAX_DAI = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_Gelato_FRAX_DAI");
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
const InvestorAMO_V3 = artifacts.require("Misc_AMOs/InvestorAMO_V3");
const FraxLendingAMO_V2 = artifacts.require("Misc_AMOs/FraxLendingAMO_V2");
const IyUSDC_V2_Partial = artifacts.require("Misc_AMOs/yearn/IyUSDC_V2_Partial");
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial");
const IAAVE_aFRAX = artifacts.require("Misc_AMOs/aave/IAAVE_aFRAX");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial");
const IComptroller = artifacts.require("Misc_AMOs/compound/IComptroller");

const ICREAM_crFRAX = artifacts.require("Misc_AMOs/cream/ICREAM_crFRAX");

// Curve Metapool and AMO
const CurveAMO_V4 = artifacts.require("Curve/CurveAMO_V4");
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const MIM3CRV_Metapool = artifacts.require("Curve/IMetaImplementationUSD");
const LiquidityGaugeV2 = artifacts.require("Curve/ILiquidityGaugeV2");
const FraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

// Misc AMOs
const FXS1559_AMO_V3 = artifacts.require("Misc_AMOs/FXS1559_AMO_V3");
const StakeDAO_AMO_V2 = artifacts.require("Misc_AMOs/StakeDAO_AMO_V2");
const OHM_AMO_V3 = artifacts.require("Misc_AMOs/OHM_AMO_V3");
const Convex_AMO_V2 = artifacts.require("Misc_AMOs/Convex_AMO_V2");
const MIM_Convex_AMO = artifacts.require("Misc_AMOs/MIM_Convex_AMO");
const CurveMetapoolLockerAMO = artifacts.require("Misc_AMOs/CurveMetapoolLockerAMO");
const RariFuseLendingAMO_V2 = artifacts.require("Misc_AMOs/RariFuseLendingAMO_V2");
const UniV3LiquidityAMO = artifacts.require("Misc_AMOs/UniV3LiquidityAMO");
const UniV3LiquidityAMO_V2 = artifacts.require("Misc_AMOs/UniV3LiquidityAMO_V2");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");
const FraxLiquidityBridger_ARBI_AnySwap = artifacts.require("Bridges/Avalanche/FraxLiquidityBridger_ARBI_AnySwap");
const FraxLiquidityBridger_HARM_Horizon = artifacts.require("Bridges/Harmony/FraxLiquidityBridger_HARM_Horizon");
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

    let stakingInstanceDualV5_FRAX_OHM;
    let communalFarmInstance_Saddle_D4;
    let fraxUniV3Farm_Stable_FRAX_USDC;
    let fraxUniV3Farm_Stable_FRAX_DAI;
    let stakingInstanceMultiGauge_FXS_WETH;
    let stakingInstanceMultiGauge_Gelato_FRAX_DAI;
    let fraxCrossChainFarm_FRAX_mUSD;
    let middlemanGauge_FRAX_mUSD;

	let pool_instance_USDC;
    let pool_instance_v3;

    let investor_amo_v1_instance;
    let investor_amo_v3_instance;
    let fraxLendingAMO_V2_instance;
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
    let vefxs_boost_deleg_proxy_instance;;

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

    crFRAX_instance = await ICREAM_crFRAX.at(CONTRACT_ADDRESSES.ethereum.investments["cream_crFRAX"]);

    routerInstance = await IUniswapV2Router02.at(CONTRACT_ADDRESSES.ethereum.uniswap_other.router); 
    uniswapFactoryInstance = await IUniswapV2Factory.at(CONTRACT_ADDRESSES.ethereum.uniswap_other.factory); 
    uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager); 

    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.at(CONTRACT_ADDRESSES.ethereum.retired_oracles.FRAX_USDC); 
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(CONTRACT_ADDRESSES.ethereum.retired_oracles.FXS_WETH);
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(CONTRACT_ADDRESSES.ethereum.retired_oracles.USDC_WETH);
    // oracle_extra_instance_SDT_WETH = await UniswapPairOracleExtra_SDT_WETH.at(CONTRACT_ADDRESSES.ethereum.oracles.SDT_WETH);
    combo_oracle_instance = await ComboOracle.at(CONTRACT_ADDRESSES.ethereum.oracles_other.combo_oracle);

    frax_oracle_wrapper_instance = await FRAXOracleWrapper.at(CONTRACT_ADDRESSES.ethereum.pricing.frax_oracle_wrapper);
    fxs_oracle_wrapper_instance = await FXSOracleWrapper.at(CONTRACT_ADDRESSES.ethereum.pricing.fxs_oracle_wrapper);

    reserve_tracker_instance = await ReserveTracker.at(CONTRACT_ADDRESSES.ethereum.pid_related.reserve_tracker);
    pid_controller_instance = await PIDController.at(CONTRACT_ADDRESSES.ethereum.pid_related.pid_controller);

    stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap FRAX/OHM']);
    communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Saddle alUSD/FEI/FRAX/LUSD']);
    fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap V3 FRAX/DAI']);
    fraxUniV3Farm_Stable_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap V3 FRAX/USDC']);
    middlemanGauge_FRAX_mUSD = await FraxMiddlemanGauge_FRAX_mUSD.at(CONTRACT_ADDRESSES.ethereum.middleman_gauges['mStable FRAX/mUSD']);
    // fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Uniswap V3 FRAX/DAI']);
    stakingInstanceMultiGauge_FRAX_SUSHI = await StakingRewardsMultiGauge_FRAX_SUSHI.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Sushi FRAX/SUSHI']);

    pool_instance_USDC = await Pool_USDC.at(CONTRACT_ADDRESSES.ethereum.pools.USDC_V2);
    pool_instance_v3 = await FraxPoolV3.at(CONTRACT_ADDRESSES.ethereum.pools.V3);
    
    // investor_amo_v1_instance = await FraxPoolInvestorForV2.at(CONTRACT_ADDRESSES.ethereum.misc.investor_amo_V1);
    investor_amo_v3_instance = await InvestorAMO_V3.at(CONTRACT_ADDRESSES.ethereum.misc.investor_amo);
    fraxLendingAMO_V2_instance = await FraxLendingAMO_V2.at(CONTRACT_ADDRESSES.ethereum.misc.lending_amo);
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
    gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.at(CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_rewards_distributor);

    frax_amo_minter_instance = await FraxAMOMinter.at(CONTRACT_ADDRESSES.ethereum.misc.amo_minter);

    veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV4.at(CONTRACT_ADDRESSES.ethereum.misc.vefxs_yield_distributor_v4);   

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // console.log(chalk.yellow('========== FraxGaugeFXSRewardsDistributor =========='));
    // // FraxGaugeFXSRewardsDistributor 
    // gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.new(
    //     THE_ACCOUNTS[1], 
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     THE_ACCOUNTS[7], 
    //     CONTRACT_ADDRESSES.ethereum.main.FXS,
    //     frax_gauge_controller.address
    // );

    // console.log("========== FraxMiddlemanGauge_FRAX_mUSD ==========");
    // // FraxMiddlemanGauge_FRAX_mUSD 
    // middlemanGauge_FRAX_mUSD = await FraxMiddlemanGauge_FRAX_mUSD.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
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
    //     CONTRACT_ADDRESSES.ethereum.main.FXS, 
    //     CONTRACT_ADDRESSES.ethereum.reward_tokens.iq,
    //     CONTRACT_ADDRESSES.ethereum.pair_tokens['Uniswap FRAX/IQ'],
    //     CONTRACT_ADDRESSES.ethereum.main.FRAX, 
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     CONTRACT_ADDRESSES.ethereum.main.veFXS,
    // );

    // console.log(chalk.yellow('========== FraxUniV3Farm_Stable_FRAX_DAI =========='));
    // // FraxUniV3Farm_Stable_FRAX_DAI 
    // fraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.new(
    //     THE_ACCOUNTS[6],
    //     CONTRACT_ADDRESSES.ethereum.uni_v3_pools['Uniswap V3 FRAX/DAI'],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_rewards_distributor,
	// 	-50,
	// 	50,
	// 	0
    // );

    // console.log(chalk.yellow('========== FraxCrossChainFarm_FRAX_mUSD =========='));
    // // FraxCrossChainFarm_FRAX_mUSD 
    // fraxCrossChainFarm_FRAX_mUSD = await FraxCrossChainFarm_FRAX_mUSD.new(
    //     THE_ACCOUNTS[6], 
    //     CONTRACT_ADDRESSES.ethereum.main.FXS, 
    //     CONTRACT_ADDRESSES.ethereum.reward_tokens.iq,
    //     "0x4fb30c5a3ac8e85bc32785518633303c4590752d", // Use mUSD/GUSD Feeder Pool here as a dry run
    //     "0xe2f2a5c287993345a840db3b0845fbc70f5935a5", // use mUSD here as a dry run
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    // );

    // console.log(chalk.yellow("========== veFXSYieldDistributorV4 =========="));
    // // veFXSYieldDistributorV4 
    // veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV4.new(
    //     THE_ACCOUNTS[6], 
    //     CONTRACT_ADDRESSES.ethereum.main.FXS, 
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     CONTRACT_ADDRESSES.ethereum.main.veFXS
    // );

    // console.log(chalk.yellow('========== PIDController & ReserveTracker – using Curve =========='));
    // reserve_tracker_instance = await ReserveTracker.new(
    //     CONTRACT_ADDRESSES.ethereum.main.FRAX,
    //     CONTRACT_ADDRESSES.ethereum.main.FXS,
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    // );

    // pid_controller_instance = await PIDController.new(
    //     CONTRACT_ADDRESSES.ethereum.main.FRAX,
    //     CONTRACT_ADDRESSES.ethereum.main.FXS,
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     reserve_tracker_instance.address
    // )
    
    // // Initialize ReserveTracker
    // await reserve_tracker_instance.setMetapool(FRAX3CRV_V2_Instance.address, { from: THE_ACCOUNTS[1] });
    // await reserve_tracker_instance.setFRAXPriceOracle("0x2E45C589A9F301A2061f6567B9F432690368E3C6", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, { from: THE_ACCOUNTS[1] });
    // await reserve_tracker_instance.addFXSPair("0xE1573B9D29e2183B1AF0e743Dc2754979A40D237", { from: THE_ACCOUNTS[1] }); // Uni FRAX-FXS
    // //await reserve_tracker_instance.addFXSPair("0x74C370990C1181303D20e9f0252437a97518B95B", { from: THE_ACCOUNTS[1] }); // Sushi FXS-WETH
    // await reserve_tracker_instance.setChainlinkFXSOracle(priceConsumerInstance_FXS.address, { from: THE_ACCOUNTS[1] });

    // // Initialize PIDController
    // await pid_controller_instance.setMetapool(FRAX3CRV_V2_Instance.address, { from: THE_ACCOUNTS[1] });


    console.log(chalk.yellow("========== StakingRewardsMultiGauge_Gelato_FRAX_DAI =========="));
    // StakingRewardsMultiGauge_Gelato_FRAX_DAI 
    stakingInstanceMultiGauge_Gelato_FRAX_DAI = await StakingRewardsMultiGauge_Gelato_FRAX_DAI.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.ethereum.pair_tokens['Gelato Uniswap FRAX/DAI'],
        [
            "FXS",
            "GEL"
        ],
        [
            "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0",
            "0x15b7c0c907e4C6b9AdaAaabC300C08991D6CEA05"
        ], 
        [
            "0x234D953a9404Bf9DbC3b526271d440cD2870bCd2", 
            "0xeD5cF41b0fD6A3C564c17eE34d9D26Eafc30619b"
        ],
        [
            11574074074074, 
            0
        ],
        [
            "0x0000000000000000000000000000000000000000", // Deploy the gauge controller address empty
            "0x0000000000000000000000000000000000000000"
        ],
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

    // console.log(chalk.yellow('========== FraxLendingAMO_V2 =========='));
    // // FraxLendingAMO_V2
    // fraxLendingAMO_V2_instance = await FraxLendingAMO_V2.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow('========== FraxPoolInvestorForV2 =========='));
    // // FraxPoolInvestorForV2
    // investor_amo_v1_instance = await FraxPoolInvestorForV2.new(
    //     THE_ACCOUNTS[1],
    //     frax_amo_minter_instance.address
    // );

    // console.log(chalk.yellow('========== InvestorAMO_V3 =========='));
    // // InvestorAMO_V3
    // investor_amo_v3_instance = await InvestorAMO_V3.new(
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

    // console.log(chalk.yellow('========== OHM_AMO_V3 =========='));
    // // OHM_AMO_V3
    // ohm_amo_instance = await OHM_AMO_V3.new(
    //     THE_ACCOUNTS[1],
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
    // );

    console.log(chalk.yellow('========== ComboOracle_UniV2_UniV3 =========='));
    // ComboOracle_UniV2_UniV3
    combo_oracle_instance_univ2_univ3 = await ComboOracle_UniV2_UniV3.new(
        THE_ACCOUNTS[1],
        [
			CONTRACT_ADDRESSES.ethereum.canonicals.FRAX,
			CONTRACT_ADDRESSES.ethereum.canonicals.FXS,
			CONTRACT_ADDRESSES.ethereum.oracles_other.combo_oracle,
			CONTRACT_ADDRESSES.ethereum.uniswap_other.router, // IUniswapV2Router02
			CONTRACT_ADDRESSES.ethereum.uniswap_v3.UniswapV3Factory, // IUniswapV3Factory
			CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager, // INonfungiblePositionManager
			CONTRACT_ADDRESSES.ethereum.uniswap_v3.SwapRouter // ISwapRouter
		]
    );
    
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

    // console.log(chalk.yellow('========== FraxLiquidityBridger_ARBI_AnySwap =========='));
    // // FraxLiquidityBridger_ARBI_AnySwap
    // // Will start with Avalanche
    // frax_liquidity_bridger_arbi_anyswap_instance = await FraxLiquidityBridger_ARBI_AnySwap.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     frax_amo_minter_instance.address,
    //     [
    //         CONTRACT_ADDRESSES.ethereum.bridges.frax.arbitrum,
    //         CONTRACT_ADDRESSES.ethereum.bridges.fxs.arbitrum,
    //         CONTRACT_ADDRESSES.ethereum.bridges.collateral.arbitrum
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Arbitrum goes to same address on other side
    //     "",
    //     "FRAX Arbitrum AnySwap Liquidity Bridger",
    // );

    console.log(chalk.yellow('========== FraxLiquidityBridger_HARM_Horizon =========='));
    // FraxLiquidityBridger_HARM_Horizon
    // Will start with Harmony
    frax_liquidity_bridger_harm_horizon_instance = await FraxLiquidityBridger_HARM_Horizon.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        frax_amo_minter_instance.address,
        [
            CONTRACT_ADDRESSES.ethereum.bridges.frax.harmony,
            CONTRACT_ADDRESSES.ethereum.bridges.fxs.harmony,
            CONTRACT_ADDRESSES.ethereum.bridges.collateral.harmony
        ],
        "0x0000000000000000000000000000000000000000", // Harmony goes to same address on other side
        "",
        "FRAX Harmony Horizon Liquidity Bridger",
    );

    // console.log(chalk.yellow("========== UniV3LiquidityAMO =========="));
    // univ3_liquidity_amo_instance = await UniV3LiquidityAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[8],
    //     CONTRACT_ADDRESSES.ethereum.main.FRAX,
    //     CONTRACT_ADDRESSES.ethereum.main.FXS,
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     CONTRACT_ADDRESSES.ethereum.pools.USDC_V2,
    //     CONTRACT_ADDRESSES.ethereum.collaterals.USDC,
    //     CONTRACT_ADDRESSES.ethereum.uniswap_v3.UniswapV3Factory,
    //     CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager,
    //     CONTRACT_ADDRESSES.ethereum.uniswap_v3.SwapRouter
    // );

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
    // await frax_amo_minter_instance.addAMO(fraxLendingAMO_V2_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(rari_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // // await frax_amo_minter_instance.addAMO(investor_amo_v1_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(investor_amo_v3_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(fxs_1559_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(ohm_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(frax_liquidity_bridger_harm_horizon_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(univ3_liquidity_amo_v2_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(frax_cc_liq_tracker_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(curve_metapool_locker_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(aaveAMO_instance.address, true, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(token_tracker_v2_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(msig_helper_instance.address, 0, { from: COMPTROLLER_ADDRESS });
    // await frax_amo_minter_instance.addAMO(MIM_Convex_AMO_instance.address, 0, { from: COMPTROLLER_ADDRESS });

    // console.log("Add the AMO Minter to the FraxPoolV3");
    // await pool_instance_v3.addAMOMinter(frax_amo_minter_instance.address, { from: COMPTROLLER_ADDRESS });

    console.log("Unpause the V2 FraxPool redeems");
    await pool_instance_USDC.toggleRedeeming({ from: COMPTROLLER_ADDRESS });
    
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
    FraxLendingAMO_V2.setAsDeployed(fraxLendingAMO_V2_instance);
    FXS1559_AMO_V3.setAsDeployed(fxs_1559_amo_instance);
    IyUSDC_V2_Partial.setAsDeployed(yUSDC_instance);
    IAAVELendingPool_Partial.setAsDeployed(aUSDC_pool_instance);
    IAAVE_aUSDC_Partial.setAsDeployed(aUSDC_token_instance);
    IAAVE_aFRAX.setAsDeployed(aFRAX_token_instance);
    IcUSDC_Partial.setAsDeployed(cUSDC_instance);
    IComptroller.setAsDeployed(compController_instance);
    ICREAM_crFRAX.setAsDeployed(crFRAX_instance);
    InvestorAMO_V3.setAsDeployed(investor_amo_v3_instance);
    MSIGHelper.setAsDeployed(msig_helper_instance);
    OHM_AMO_V3.setAsDeployed(ohm_amo_instance);
    RariFuseLendingAMO_V2.setAsDeployed(rari_amo_instance);
    StakeDAO_AMO_V2.setAsDeployed(stakedao_amo_instance);
    TokenTrackerV2.setAsDeployed(token_tracker_v2_instance);
    UniV3LiquidityAMO.setAsDeployed(univ3_liquidity_amo_instance);
    UniV3LiquidityAMO_V2.setAsDeployed(univ3_liquidity_amo_v2_instance);
    
    console.log(chalk.yellow("--------DEPLOY STAKING CONTRACTS--------"));
    CommunalFarm_SaddleD4.setAsDeployed(communalFarmInstance_Saddle_D4);
    FraxCrossChainFarm_FRAX_mUSD.setAsDeployed(fraxCrossChainFarm_FRAX_mUSD);
    FraxMiddlemanGauge_FRAX_mUSD.setAsDeployed(middlemanGauge_FRAX_mUSD);
    FraxUniV3Farm_Stable_FRAX_USDC.setAsDeployed(fraxUniV3Farm_Stable_FRAX_USDC);
    FraxUniV3Farm_Stable_FRAX_DAI.setAsDeployed(fraxUniV3Farm_Stable_FRAX_DAI);
    StakingRewardsDualV5_FRAX_OHM.setAsDeployed(stakingInstanceDualV5_FRAX_OHM);
    StakingRewardsMultiGauge_FRAX_SUSHI.setAsDeployed(stakingInstanceMultiGauge_FRAX_SUSHI);
    StakingRewardsMultiGauge_Gelato_FRAX_DAI.setAsDeployed(stakingInstanceMultiGauge_Gelato_FRAX_DAI);
    
    console.log(chalk.yellow("--------DEPLOY CROSSCHAIN CONTRACTS--------"));
    FraxLiquidityBridger_ARBI_AnySwap.setAsDeployed(frax_liquidity_bridger_arbi_anyswap_instance);
    FraxLiquidityBridger_HARM_Horizon.setAsDeployed(frax_liquidity_bridger_harm_horizon_instance);
}