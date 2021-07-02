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
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC");
const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH");
const StakingRewardsDual_FRAX_FXS_Sushi = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX_FXS_Sushi");
const StakingRewardsDual_FXS_WETH_Sushi = artifacts.require("Staking/Variants/StakingRewardsDual_FXS_WETH_Sushi");
const StakingRewardsDual_FRAX3CRV = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX3CRV");
const StakingRewardsDualV2_FRAX3CRV_V2 = artifacts.require("Staking/Variants/StakingRewardsDualV2_FRAX3CRV_V2");
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const CommunalFarm_SaddleD4 = artifacts.require("Staking/Variants/CommunalFarm_SaddleD4");
const FraxFarm_UniV3_veFXS_FRAX_USDC = artifacts.require("Staking/Variants/FraxFarm_UniV3_veFXS_FRAX_USDC");

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
const CurveFactory = artifacts.require("Curve/Factory");
const MetaImplementationUSD = artifacts.require("Curve/MetaImplementationUSD");
const LiquidityGaugeV2 = artifacts.require("Curve/LiquidityGaugeV2");
const Minter = artifacts.require("Curve/Minter");
const CurveAMO_V4 = artifacts.require("Curve/CurveAMO_V4");

// Misc AMOs
const FXS1559_AMO = artifacts.require("Misc_AMOs/FXS1559_AMO");
const StakeDAO_AMO = artifacts.require("Misc_AMOs/StakeDAO_AMO");
const OHM_AMO = artifacts.require("Misc_AMOs/OHM_AMO");
const Convex_AMO = artifacts.require("Misc_AMOs/Convex_AMO");

// veFXS
const veFXS = artifacts.require("Curve/veFXS");
const veFXSYieldDistributorV4 = artifacts.require("Staking/veFXSYieldDistributorV4");
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
	let fraxInstance;
	let fxsInstance;
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
	let col_instance_USDC;
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
    let fraxFarmInstance_UniV3_veFXS_FRAX_USDC;

    let uniLPToSushiLPMigratorInstance;

    // let bondInstance_FXBA10000M3;

    let fxbInstance;
    let bondIssuerInstance;

	let pool_instance_USDC;
    let pool_instance_USDC_vAMM;

    let investor_amo_v2_instance;
    let fraxLendingAMO_instance;
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
    let liquidity_gauge_v2_instance;
    let curve_amo_v3_instance;

    let veFXS_instance;
    let FXSRewards_instance;
    let veFXSYieldDistributorV4_instance;
    let priceConsumerInstance_FXS;
    let smart_wallet_whitelist_instance;
    let micro_vefxs_staker_instance;

    // let ohm_amo_instance;

    // For mainnet
    
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    priceConsumerInstance = await ChainlinkETHUSDPriceConsumer.at(CONTRACT_ADDRESSES.mainnet.pricing.chainlink_eth_usd);
    priceConsumerInstance_FXS = await ChainlinkFXSUSDPriceConsumer.at(CONTRACT_ADDRESSES.mainnet.pricing.chainlink_fxs_usd);   
    timelockInstance = await Timelock.at(CONTRACT_ADDRESSES.mainnet.misc.timelock);
    fraxInstance = await FRAXStablecoin.at(CONTRACT_ADDRESSES.mainnet.main.FRAX);
    fxsInstance = await FRAXShares.at(CONTRACT_ADDRESSES.mainnet.main.FXS);
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

    col_instance_USDC = await FakeCollateral_USDC.at(CONTRACT_ADDRESSES.mainnet.collateral.USDC);

    oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.at(CONTRACT_ADDRESSES.mainnet.oracles.FRAX_WETH);
    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.at(CONTRACT_ADDRESSES.mainnet.oracles.FRAX_USDC); 
    oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.at(CONTRACT_ADDRESSES.mainnet.oracles_other.FRAX_FXS);
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(CONTRACT_ADDRESSES.mainnet.oracles.FXS_WETH);
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.at(CONTRACT_ADDRESSES.mainnet.oracles_other.FXS_USDC);
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(CONTRACT_ADDRESSES.mainnet.oracles.USDC_WETH);

    //reserve_tracker_instance = await ReserveTracker.at(CONTRACT_ADDRESSES.mainnet.pid_related.reserve_tracker);
    //pid_controller_instance = await PIDController.at(CONTRACT_ADDRESSES.mainnet.pid_related.pid_controller);

    stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.at(CONTRACT_ADDRESSES.mainnet.staking_contracts["Uniswap FRAX/WETH"]);
    stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.at(CONTRACT_ADDRESSES.mainnet.staking_contracts["Uniswap FRAX/USDC"]);
    stakingInstance_FRAX_FXS = await StakingRewards_FRAX_FXS.at(CONTRACT_ADDRESSES.mainnet.staking_contracts["Uniswap FRAX/FXS"]);
    
    //stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Sushi FRAX/FXS']);
    //stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Sushi FXS/WETH']);
    //stakingInstanceDualV2_FRAX3CRV_V2 = await StakingRewardsDualV2_FRAX3CRV_V2.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Curve FRAX3CRV-f-2']);
    stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Uniswap FRAX/OHM'])
    // fraxFarmInstance_UniV3_veFXS_FRAX_USDC = await FraxFarm_UniV3_veFXS_FRAX_USDC.at(CONTRACT_ADDRESSES.mainnet.staking_contracts['Uniswap V3 FRAX/USDC'])

    pool_instance_USDC = await Pool_USDC.at(CONTRACT_ADDRESSES.mainnet.pools.USDC_V2);

    investor_amo_v1_instance = await FraxPoolInvestorForV2.at(CONTRACT_ADDRESSES.mainnet.misc.investor_amo_V1);
    investor_amo_v2_instance = await InvestorAMO_V2.at(CONTRACT_ADDRESSES.mainnet.misc.investor_amo);
    fraxLendingAMO_instance = await FraxLendingAMO.at(CONTRACT_ADDRESSES.mainnet.misc.lending_amo);
    curve_amo_v3_instance = await CurveAMO_V3.at(CONTRACT_ADDRESSES.mainnet.misc.curve_amo);
    fxs_1559_amo_instance = await FXS1559_AMO.at(CONTRACT_ADDRESSES.mainnet.misc.fxs_1559_amo);

    liquidity_gauge_v2_instance = await LiquidityGaugeV2.at(CONTRACT_ADDRESSES.mainnet.misc.frax_gauge_v2);

    veFXS_instance = await veFXS.at(CONTRACT_ADDRESSES.mainnet.main.veFXS);
    // veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV3.at(CONTRACT_ADDRESSES.mainnet.misc.vefxs_yield_distributor_v2);   


    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // console.log(chalk.yellow('========== Investor AMO V2 =========='));
    // // Investor AMO V2 
    // investor_amo_v2_instance = await InvestorAMO_V2.new(
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
    //     CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
    //     THE_ACCOUNTS[1], 
    //     THE_ACCOUNTS[8], 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    // );

    // console.log(chalk.yellow('========== OHM AMO =========='));
    // // OHM AMO
    // // IGNORE, WILL BE PROXIED
    // ohm_amo_instance = await InvestorAMO_V2.new(
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
    //     CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
    //     THE_ACCOUNTS[1], 
    //     THE_ACCOUNTS[8], 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    // );


    // console.log(chalk.yellow('========== FXS1559 AMO =========='));
    // // FXS-1559 V2
    // fxs_1559_V2_amo_instance = await FXS1559_AMO_V2.new(
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
    //     CONTRACT_ADDRESSES.mainnet.collateral.USDC,
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[8],
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock, 
    //     CONTRACT_ADDRESSES.mainnet.misc.investor_amo
    // );

    // console.log(chalk.yellow('========== Lending AMO =========='));
    // // Lending AMO 
    // fraxLendingAMO_instance = await FraxLendingAMO.new(
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
    //     CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
    //     THE_ACCOUNTS[1], 
    //     THE_ACCOUNTS[8], 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    // );

    // console.log(chalk.yellow('========== FRAXBond (FXB) =========='));
    // // FRAXBond (FXB)
    // fxbInstance = await FraxBond.new(
    //     "Frax Bond",
    //     "FXB",
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     THE_ACCOUNTS[9],
    // );

    // console.log(chalk.yellow('========== BondIssuer =========='));
    // // BondIssuer
    // bondIssuerInstance = await FraxBondIssuer.new(
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX,
    //     fxbInstance.address,
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     THE_ACCOUNTS[9]
    // );

    // await pid_controller_instance.setPriceBands(1020000, 980000, { from: THE_ACCOUNTS[1] });

    // //leave this out when deploying to mainnet
    // await pid_controller_instance.activate(true, { from: THE_ACCOUNTS[1] }); 

    // console.log(chalk.yellow('========== Curve Metapool =========='));

    // Metapool
    // const crv3_pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
    // const crv3_pool_erc20 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
    // metapool_instance = await MetaImplementationUSD.new({ from: THE_ACCOUNTS[1] });
    // await curve_factory_instance.add_base_pool(crv3_pool, metapool_instance.address, { from: THE_ACCOUNTS[1] });

    // console.log(chalk.yellow('========== Metapool Gauge =========='));
    // // Gauge
    // liquidity_gauge_v2_instance = await LiquidityGaugeV2.new(
    //     FRAX3CRV_V2_Instance.address, 
    //     "0xd061D61a4d941c39E5453435B6345Dc261C2fcE0", 
    // );

    // console.log("FRAX3CRV-f-2 gauge address:", liquidity_gauge_v2_instance.address);

    // // do deploy_metapool.call() first to get the return value of the factory-deployed address of the metapool
    // const FRAX_metapool_address = (await curve_factory_instance.deploy_metapool.call(
    //     crv3_pool,
    //     "Frax",
    //     "FRAX",
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX,
    //     85,
    //     4000000,
    //     { from: THE_ACCOUNTS[1] }
    // ));

    // // now actually deploy metapool
    // await curve_factory_instance.deploy_metapool(
    //     crv3_pool,
    //     "Frax",
    //     "FRAX",
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX,
    //     85,
    //     4000000,
    //     { from: THE_ACCOUNTS[1] }
    // );

    // if this changes (i.e. THE_ACCOUNTS[1] number of deploys prior to this changes), need to update it in test/vAMM-Tests.js
    // should write it into deployed consts
    // console.log("FRAX3CRV-f-2 contract address:", FRAX_metapool_address);


    // console.log(chalk.yellow('========== Curve AMO V3 =========='));
    // // CurveAMO_V3
    // curve_amo_v3_instance = await CurveAMO_V3.new(
    //     fraxInstance.address, 
    //     fxsInstance.address, 
    //     col_instance_USDC.address, 
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[8],
    //     timelockInstance.address,
    //     CONTRACT_ADDRESSES.mainnet.pair_tokens['Curve FRAX3CRV-f-2'],
    //     "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
    //     "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2,
    //     '0x72e158d38dbd50a483501c24f792bdaaa3e7d55c',
    // );

    // console.log(chalk.yellow('========== StakeDAO AMO =========='));
    // StakeDAO_AMO
    // IGNORE, WILL BE PROXIED
    // stakedao_amo_instance = await StakeDAO_AMO.new(
    //     fraxInstance.address, 
    //     fxsInstance.address, 
    //     col_instance_USDC.address, 
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[8],
    //     timelockInstance.address,
    //     CONTRACT_ADDRESSES.mainnet.pair_tokens['Curve FRAX3CRV-f-2'],
    //     "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
    //     "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2,
    //     '0x72e158d38dbd50a483501c24f792bdaaa3e7d55c',
    // );

    // console.log(chalk.yellow('========== veFXS =========='));
    // // veFXS 
    // veFXS_instance = await veFXS.new(
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     "Vote-Escrowed FXS",
    //     "veFXS",
    //     "veFXS_1.0.0"
    // );

    console.log(chalk.yellow('========== SmartWalletWhitelist =========='));
    // SmartWalletWhitelist for veFXS 
    smart_wallet_whitelist_instance = await SmartWalletWhitelist.new(
        THE_ACCOUNTS[1]
    );

    console.log(chalk.yellow('========== MicroVeFXSStaker =========='));
    // MicroVeFXSStaker for veFXS 
    micro_vefxs_staker_instance = await MicroVeFXSStaker.new(
        THE_ACCOUNTS[1]
    );

    console.log(chalk.yellow('========== FraxFarm_UniV3_veFXS_FRAX_USDC =========='));
    // FraxFarm_UniV3_veFXS_FRAX_USDC 
    fraxFarmInstance_UniV3_veFXS_FRAX_USDC = await FraxFarm_UniV3_veFXS_FRAX_USDC.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.mainnet.main.FXS, 
        CONTRACT_ADDRESSES.mainnet.uniswap_other.v3_positions_NFT,
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
        CONTRACT_ADDRESSES.mainnet.main.veFXS,
        "0x853d955aCEf822Db058eb8505911ED77F175b99e", 
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 
    );

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

    console.log("========== veFXSYieldDistributorV4 ==========");
    // veFXSYieldDistributorV4 
    veFXSYieldDistributorV4_instance = await veFXSYieldDistributorV4.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.mainnet.main.FXS, 
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
        CONTRACT_ADDRESSES.mainnet.main.veFXS
    );

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


    console.log(chalk.yellow('========== FXSOracleWrapper =========='));

    fxs_oracle_wrapper_instance = await FXSOracleWrapper.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.mainnet.misc.timelock
    );

    await fxs_oracle_wrapper_instance.setChainlinkFXSOracle(priceConsumerInstance_FXS.address, { from: THE_ACCOUNTS[1] });
    await fxs_oracle_wrapper_instance.setChainlinkETHOracle(priceConsumerInstance.address, { from: THE_ACCOUNTS[1] });


    console.log(chalk.yellow('========== MigrationBundleUtils =========='));
	//let migrationBundleUtils_instance = await MigrationBundleUtils.new(THE_ACCOUNTS[1], "0x1C21Dd0cE3bA89375Fc39F1B134AD15671022660");
    let migrationBundleUtils_instance = await MigrationBundleUtils.at(CONTRACT_ADDRESSES.mainnet.misc.migration_bundle_utils);
	console.log("deployed migrationBundleUtils address:", CONTRACT_ADDRESSES.mainnet.misc.migration_bundle_utils);

    // // Curve AMO V4
    // // ==================== PROXY DEPLOYMENT ====================
    // const CurveAMO_V4_factory = await ethers.getContractFactory("CurveAMO_V4");
    // const curveProxy = await upgrades.deployProxy(CurveAMO_V4_factory, [
    //     CONTRACT_ADDRESSES.mainnet.main.FRAX, 
    //     CONTRACT_ADDRESSES.mainnet.main.FXS, 
    //     CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
    //     THE_ACCOUNTS[1], 
    //     THE_ACCOUNTS[8], 
    //     CONTRACT_ADDRESSES.mainnet.misc.timelock,
    //     CONTRACT_ADDRESSES.mainnet.pair_tokens['Curve FRAX3CRV-f-2'],
    //     "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // 3CRV pool
    //     "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // 3CRV token
    //     CONTRACT_ADDRESSES.mainnet.pools.USDC_V2,
    // ]);
    // await curveProxy.deployed();
    // console.log("Curve AMO V4 deployed to:", curveProxy.address);
    // let curve_amo_v4_instance = await CurveAMO_V4.at(curveProxy.address);


    console.log("========== CommunalFarm_SaddleD4 ==========");
    // CommunalFarm_SaddleD4 
    communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.mainnet.pair_tokens['Saddle alUSD/FEI/FRAX/LUSD'],
        [
            "FXS",
            "TRIBE",
            "ALCX",
            "LQTY"
        ],
        [
            "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0", // FXS. E18
            "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B", // TRIBE. E18
            "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF", // ALCX. E18
            "0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D", // LQTY. E18
        ], 
        [
            "0xa448833bEcE66fD8803ac0c390936C79b5FD6eDf", // FXS Deployer
            "0xa448833bEcE66fD8803ac0c390936C79b5FD6eDf", // TRIBE Deployer (using FXS address since TRIBE deployer has no ETH)
            "0x51e029a5Ef288Fb87C5e8Dd46895c353ad9AaAeC", // ALCX Deployer
            "0xa850535D3628CD4dFEB528dC85cfA93051Ff2984" // LQTY Deployer
        ],
        [
            11574074074074, // 1 FXS per day
            23148148148148, // 2 TRIBE per day
            34722222222222, // 3 ALCX per day
            46296296296296 // 4 LQTY per day
        ],
        CONTRACT_ADDRESSES.mainnet.misc.timelock,
    );

	MigrationBundleUtils.setAsDeployed(migrationBundleUtils_instance);
    FXSOracleWrapper.setAsDeployed(fxs_oracle_wrapper_instance);
    ChainlinkETHUSDPriceConsumer.setAsDeployed(priceConsumerInstance);
    ChainlinkFXSUSDPriceConsumer.setAsDeployed(priceConsumerInstance_FXS);
    Timelock.setAsDeployed(timelockInstance);
    FRAXStablecoin.setAsDeployed(fraxInstance);
    FRAXShares.setAsDeployed(fxsInstance);
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
    StakingRewards_FRAX_WETH.setAsDeployed(stakingInstance_FRAX_WETH);
    StakingRewards_FRAX_USDC.setAsDeployed(stakingInstance_FRAX_USDC);
    StakingRewards_FRAX_FXS.setAsDeployed(stakingInstance_FRAX_FXS);
    //StakingRewardsDual_FRAX_FXS_Sushi.setAsDeployed(stakingInstanceDual_FRAX_FXS_Sushi);
    //StakingRewardsDual_FXS_WETH_Sushi.setAsDeployed(stakingInstanceDual_FXS_WETH_Sushi);
    //StakingRewardsDualV2_FRAX3CRV_V2.setAsDeployed(stakingInstanceDualV2_FRAX3CRV_V2);
    StakingRewardsDualV5_FRAX_OHM.setAsDeployed(stakingInstanceDualV5_FRAX_OHM);
    CommunalFarm_SaddleD4.setAsDeployed(communalFarmInstance_Saddle_D4);
    FraxFarm_UniV3_veFXS_FRAX_USDC.setAsDeployed(fraxFarmInstance_UniV3_veFXS_FRAX_USDC);
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
    FakeCollateral_USDC.setAsDeployed(col_instance_USDC);
    Pool_USDC.setAsDeployed(pool_instance_USDC);
    PoolvAMM_USDC.setAsDeployed(pool_instance_USDC_vAMM);
    LiquidityGaugeV2.setAsDeployed(liquidity_gauge_v2_instance);
    CurveAMO_V3.setAsDeployed(curve_amo_v3_instance);
    // CurveAMO_V4.setAsDeployed(curve_amo_v4_instance);
    FXSRewards.setAsDeployed(FXSRewards_instance);
    veFXS.setAsDeployed(veFXS_instance);
    veFXSYieldDistributorV4.setAsDeployed(veFXSYieldDistributorV4_instance);
    SmartWalletWhitelist.setAsDeployed(smart_wallet_whitelist_instance);
    MicroVeFXSStaker.setAsDeployed(micro_vefxs_staker_instance);
}