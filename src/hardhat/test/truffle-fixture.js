const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Rewards and fake token related
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Collateral Pools
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const CPITrackerOracle = artifacts.require("Oracle/CPITrackerOracle");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// FPI Core
const FPI = artifacts.require("FPI/FPI");
const FPIS = artifacts.require("FPI/FPIS");

// Governance related
const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE");
const FraxMiddlemanGauge_ARBI_Curve_VSTFRAX = artifacts.require("Curve/Middleman_Gauges/FraxMiddlemanGauge_ARBI_Curve_VSTFRAX");

// Investor and lending contract related


// Curve Metapool and AMO
const LiquidityGaugeV2 = artifacts.require("Curve/ILiquidityGaugeV2");
const IFraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const IFraxGaugeControllerV2 = artifacts.require("Curve/IFraxGaugeControllerV2");
const FraxGaugeController = artifacts.require("Curve/FraxGaugeController");
const FraxGaugeControllerV2 = artifacts.require("Curve/FraxGaugeControllerV2");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

// Misc AMOs
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");
const FraxLiquidityBridger_AUR_Rainbow = artifacts.require("Bridges/Aurora/FraxLiquidityBridger_AUR_Rainbow");

// veFXS
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSYieldDistributorV4 = artifacts.require("Staking/veFXSYieldDistributorV4.sol");
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

    let fpi_instance;
	let fpis_instance;

	let routerInstance;
	let uniswapFactoryInstance;
    let uniswapV3PositionsNFTInstance;

    let cpi_tracker_oracle_instance;

    let fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance;
    let middlemanGauge_ARBI_Curve_VSTFRAX;

    let pool_instance_v3;

    let frax_amo_minter_instance;
    let frax_gauge_controller;
    let frax_gauge_controller_v2;
    let gauge_rewards_distributor_instance;
    let liquidity_gauge_v2_instance;

    let veFXS_instance;
    let FXSRewards_instance;
    let veFXSYieldDistributorV4_instance;
    let vefxs_boost_instance;
    let vefxs_boost_deleg_proxy_instance;

    let frax_liquidity_bridger_aur_rainbow_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    const ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
    const COMPTROLLER_ADDRESS = CONTRACT_ADDRESSES.ethereum.multisigs["Comptrollers"];
 
    timelockInstance = await Timelock.at(CONTRACT_ADDRESSES.ethereum.misc.timelock);
    frax_instance = await FRAXStablecoin.at(CONTRACT_ADDRESSES.ethereum.main.FRAX);
    fxs_instance = await FRAXShares.at(CONTRACT_ADDRESSES.ethereum.main.FXS);
    veFXS_instance = await veFXS.at(CONTRACT_ADDRESSES.ethereum.main.veFXS);
    usdc_instance = await ERC20.at(CONTRACT_ADDRESSES.ethereum.collaterals.USDC);

    pool_instance_v3 = await FraxPoolV3.at(CONTRACT_ADDRESSES.ethereum.pools.V3);

    routerInstance = await IUniswapV2Router02.at(CONTRACT_ADDRESSES.ethereum.uniswap_other.router); 
    uniswapFactoryInstance = await IUniswapV2Factory.at(CONTRACT_ADDRESSES.ethereum.uniswap_other.factory); 
    uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager); 

    middlemanGauge_ARBI_Curve_VSTFRAX = await FraxMiddlemanGauge_ARBI_Curve_VSTFRAX.at(CONTRACT_ADDRESSES.ethereum.middleman_gauges['Curve VSTFRAX-f']);
    fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance = await FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.at(CONTRACT_ADDRESSES.ethereum.staking_contracts['Temple FRAX/TEMPLE']);

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

    console.log(chalk.yellow('========== FPI =========='));
    // FPI
    fpi_instance = await FPI.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock
    );

    console.log(chalk.yellow('========== FPIS =========='));
    // FPIS
    fpis_instance = await FPIS.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        fpi_instance.address
    );

    console.log(chalk.yellow('========== CPITrackerOracle =========='));
    // CPITrackerOracle
    cpi_tracker_oracle_instance = await CPITrackerOracle.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock
    );
    
    // console.log(chalk.yellow('========== FraxLiquidityBridger_AUR_Rainbow =========='));
    // // FraxLiquidityBridger_AUR_Rainbow
    // frax_liquidity_bridger_aur_rainbow_instance = await FraxLiquidityBridger_AUR_Rainbow.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     frax_amo_minter_instance.address,
    //     [
    //         CONTRACT_ADDRESSES.ethereum.bridges.frax.aurora,
    //         CONTRACT_ADDRESSES.ethereum.bridges.fxs.aurora,
    //         CONTRACT_ADDRESSES.ethereum.bridges.collateral.aurora
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Aurora goes to same address on other side
    //     "",
    //     "FRAX Aurora Rainbow Liquidity Bridger",
    // );
    // const account_id = (`aurora:${frax_liquidity_bridger_aur_rainbow_instance.address.replace("0x", "")}`).toLowerCase();
    // console.log("account_id: ", account_id);
    // await frax_liquidity_bridger_aur_rainbow_instance.setAccountID(account_id, false, { from: THE_ACCOUNTS[1] });


    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [COMPTROLLER_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR MINTER  =========='));
    // await frax_amo_minter_instance.addAMO(convex_amo_instance.address, 0, { from: COMPTROLLER_ADDRESS });


    console.log("Add the liquidity bridgers to the AMO Minter");
    // await frax_amo_minter_instance.addAMO(frax_liquidity_bridger_aur_rainbow_instance.address, 0, { from: COMPTROLLER_ADDRESS });

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
    LiquidityGaugeV2.setAsDeployed(liquidity_gauge_v2_instance);

    console.log(chalk.yellow("--------DEPLOYING CORE CONTRACTS--------"));
    FraxAMOMinter.setAsDeployed(frax_amo_minter_instance);
    FraxPoolV3.setAsDeployed(pool_instance_v3);
    FraxGaugeController.setAsDeployed(frax_gauge_controller);
    FraxGaugeControllerV2.setAsDeployed(frax_gauge_controller_v2);
    FraxGaugeFXSRewardsDistributor.setAsDeployed(gauge_rewards_distributor_instance);
    FRAXStablecoin.setAsDeployed(frax_instance);
    FRAXShares.setAsDeployed(fxs_instance);
    FXSRewards.setAsDeployed(FXSRewards_instance);
    Timelock.setAsDeployed(timelockInstance);
    veFXS.setAsDeployed(veFXS_instance);
    veFXSYieldDistributorV4.setAsDeployed(veFXSYieldDistributorV4_instance);
    veFXSBoost.setAsDeployed(vefxs_boost_instance);
    veFXSBoostDelegationProxy.setAsDeployed(vefxs_boost_deleg_proxy_instance);

    console.log(chalk.yellow("--------DEPLOYING FPI CONTRACTS--------"));
    FPI.setAsDeployed(fpi_instance);
    FPIS.setAsDeployed(fpis_instance);

    console.log(chalk.yellow("--------DEPLOY ORACLE CONTRACTS--------"));
    CPITrackerOracle.setAsDeployed(cpi_tracker_oracle_instance);

    console.log(chalk.yellow("--------DEPLOY AMO CONTRACTS--------"));
    
    console.log(chalk.yellow("--------DEPLOY STAKING CONTRACTS--------"));
    FraxMiddlemanGauge_ARBI_Curve_VSTFRAX.setAsDeployed(middlemanGauge_ARBI_Curve_VSTFRAX);
    FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.setAsDeployed(fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance);
    
    console.log(chalk.yellow("--------DEPLOY LIQUIDITY BRIDGER CONTRACTS--------"));
    // FraxLiquidityBridger_AUR_Rainbow.setAsDeployed(frax_liquidity_bridger_aur_rainbow_instance);
    // FraxLiquidityBridger_MNBM_Nomad.setAsDeployed(frax_liquidity_bridger_mnbm_nomad_instance);
    // FraxLiquidityBridger_OPTI_Celer.setAsDeployed(frax_liquidity_bridger_opti_celer_instance);
}