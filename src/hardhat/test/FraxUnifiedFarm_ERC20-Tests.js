const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require("chai");

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");
const IGUniPool = artifacts.require("Misc_AMOs/gelato/IGUniPool");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Saddle related
const ISaddleD4_LP = artifacts.require("Misc_AMOs/saddle/ISaddleD4_LP");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const CommunalFarm_SaddleD4 = artifacts.require("Staking/Variants/CommunalFarm_SaddleD4");
// const StakingRewardsMultiGauge_FXS_WETH = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_FXS_WETH");
const StakingRewardsMultiGauge_FRAX_SUSHI = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_FRAX_SUSHI");
const StakingRewardsMultiGauge_Gelato_FRAX_DAI = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_Gelato_FRAX_DAI");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS and gauge related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSBoost = artifacts.require("Curve/IVotingEscrowDelegation");
const veFXSBoostDelegationProxy = artifacts.require("Curve/IDelegationProxy");
const FraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FraxFarmERC20_V2-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let COMPTROLLER_ADDRESS;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	let MIGRATOR_ADDRESS;

	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_GEL = '0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27';
	const ADDRESS_WITH_VEFXS = '0xfF5B4BCbf765FE363269114e1c765229a29eDeFD';
	const ADDRESS_VEFXS_WHALE = '0xb55794c3bef4651b6cBc78b64a2Ef6c5c67837C3';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let gel_instance;
	let iq_instance;
	let alcx_instance;
	let lqty_instance;
	let mockFRAX3CRVInstance;
	
	// Initialize the Uniswap Router instance
	let routerInstance; 

	// Initialize the Uniswap Factory instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;

	// Initialize the Uniswap V3 Positions NFT
	let uniswapV3PositionsNFTInstance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	// Initialize oracle instances
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Initialize pool instances
	let pool_instance_USDC;
	
	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FXS_WETH;

	// Initialize Uniswap pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FXS_WETH;
	let pair_instance_FRAX_IQ;

	// Initialize Sushi pair contracts
	let pair_instance_FRAX_FXS_Sushi;
	// let pair_instance_FXS_WETH_Sushi;
	let pair_instance_FRAX_SUSHI_Sushi;
	let pair_instance;

	// Initialize Saddle pair contracts
	let pair_instance_Saddle_D4;

	// Initialize pair orders
	let isToken0Frax_FRAX_WETH;
	let isToken0Frax_FRAX_USDC;
	let isToken0Fxs_FXS_WETH;

	// Initialize staking instances
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FXS_WETH;

    // let stakingInstanceDual_FRAX_FXS_Sushi;
	// let stakingInstanceDual_FXS_WETH_Sushi;
	// let stakingInstanceDual_FRAX3CRV;
	// let stakingInstanceDualV2_FRAX3CRV_V2;
	// let stakingInstanceDualV5_FRAX_OHM;
	// let communalFarmInstance_Saddle_D4; 
	// let fraxFarmInstance_FRAX_USDC;
	let stakingInstanceMultiGauge_FXS_WETH;
	let stakingInstanceMultiGauge_FRAX_SUSHI;
	let stakingInstanceMultiGauge_Gelato_FRAX_DAI;
	let staking_instance;

	// Initialize veFXS and gauge-related instances
	let veFXS_instance;
	let frax_gauge_controller;
	let gauge_rewards_distributor_instance;
	let vefxs_boost_instance
    let vefxs_boost_deleg_proxy_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// Constants
		ORIGINAL_FRAX_DEPLOYER_ADDRESS = process.env.FRAX_DEPLOYER_ADDRESS;
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
		COMPTROLLER_ADDRESS = "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27";
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADDRESS = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		MIGRATOR_ADDRESS = accounts[10];

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		gel_instance = await ERC20.at("0x15b7c0c907e4c6b9adaaaabc300c08991d6cea05");

		// Fill the Uniswap Router Instance
		// routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		// timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		
		// Initialize ETH-USD Chainlink Oracle too
		// oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();

		// Initialize the governance contract
		// governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		// uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Fill the Uniswap V3 Instances
		// uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		// pair_instance_FRAX_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/WETH"]);
		// pair_instance_FRAX_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/USDC"]);
		// pair_instance_FXS_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/FXS"]);
		// pair_instance_FRAX_IQ = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/IQ"]);
		// pair_instance_Saddle_D4 = await ISaddleD4_LP.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Saddle alUSD/FEI/FRAX/LUSD"]);
		// pair_instance_FXS_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/USDC"]);
		// pair_instance_FXS_WETH_Sushi = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Sushi FXS/WETH"]);
		// pair_instance_FRAX_SUSHI_Sushi = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Sushi FRAX/SUSHI"]);
		pair_instance_Gelato_FRAX_DAI = await IGUniPool.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Gelato Uniswap FRAX/DAI"]);

		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// uniswapV3PositionsNFTInstance = await FRAX3CRV_Mock.deployed(); 

		// Fill the staking rewards instances
		// stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
		// stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
		// stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.deployed();
		// communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.deployed();
		// fraxFarmInstance_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deployed();
		// stakingInstanceMultiGauge_FXS_WETH = await StakingRewardsMultiGauge_FXS_WETH.deployed();
		stakingInstanceMultiGauge_FRAX_SUSHI = await StakingRewardsMultiGauge_FRAX_SUSHI.deployed();
		stakingInstanceMultiGauge_Gelato_FRAX_DAI = await StakingRewardsMultiGauge_Gelato_FRAX_DAI.deployed();

		// veFXS and gauge related
		veFXS_instance = await veFXS.deployed();
		vefxs_boost_instance = await veFXSBoost.deployed();
		vefxs_boost_deleg_proxy_instance = await veFXSBoostDelegationProxy.deployed();
		frax_gauge_controller = await FraxGaugeController.deployed();
		gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.deployed();

		// Set which pairs to test
		console.log(chalk.hex("#ff8b3d").bold("CHOOSING THE PAIR"))
		// staking_instance = stakingInstanceMultiGauge_FXS_WETH;
		staking_instance = stakingInstanceMultiGauge_Gelato_FRAX_DAI;

		// Set which pairs to test
		console.log(chalk.hex("#ff8b3d").bold("CHOOSING THE STAKING CONTRACT"))
		// pair_instance = pair_instance_FXS_WETH_Sushi;
		pair_instance = pair_instance_Gelato_FRAX_DAI;
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// it("Tests veFXSBoosts", async () => {
	// 	console.log(chalk.hex("#ff8b3d").bold("=========================veFXSBoost Tests========================="));

	// 	console.log("---------- CREATE BOOST ----------");
	// 	// Note adjusted veFXS balances before
	// 	let veFXSBoost_before_1 = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(COLLATERAL_FRAX_AND_FXS_OWNER);
	// 	let veFXSBoost_before_whale = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(ADDRESS_WITH_VEFXS);
	// 	console.log("veFXSBoost_before_1:", new BigNumber(veFXSBoost_before_1).div(BIG18).toNumber());
	// 	console.log("veFXSBoost_before_whale:", new BigNumber(veFXSBoost_before_whale).div(BIG18).toNumber());
		
	// 	await hre.network.provider.request({
	// 		method: "hardhat_impersonateAccount",
	// 		params: [ADDRESS_WITH_VEFXS]
	// 	});

	// 	// Whale creates a boost for [1]
	// 	let curr_ts = (new BigNumber(await time.latest())).toNumber();
	// 	await vefxs_boost_instance.create_boost(
	// 		ADDRESS_WITH_VEFXS, 
	// 		COLLATERAL_FRAX_AND_FXS_OWNER, 
	// 		1000, 
	// 		0, 
	// 		curr_ts + (365 * 86400), 
	// 		0,
	// 		{ from: ADDRESS_WITH_VEFXS }
	// 	);

	// 	await hre.network.provider.request({
	// 		method: "hardhat_stopImpersonatingAccount",
	// 		params: [ADDRESS_WITH_VEFXS]
	// 	});

	// 	// Note adjusted veFXS balances after
	// 	let veFXSBoost_after_1 = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(COLLATERAL_FRAX_AND_FXS_OWNER);
	// 	let veFXSBoost_after_whale = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(ADDRESS_WITH_VEFXS);
	// 	console.log("veFXSBoost_after_1:", new BigNumber(veFXSBoost_after_1).div(BIG18).toNumber());
	// 	console.log("veFXSBoost_after_whale:", new BigNumber(veFXSBoost_after_whale).div(BIG18).toNumber());


	// 	console.log("---------- EXTEND BOOST ----------");
	// 	// Note adjusted veFXS balances before
	// 	veFXSBoost_before_1 = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(COLLATERAL_FRAX_AND_FXS_OWNER);
	// 	veFXSBoost_before_whale = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(ADDRESS_WITH_VEFXS);
	// 	console.log("veFXSBoost_before_1:", new BigNumber(veFXSBoost_before_1).div(BIG18).toNumber());
	// 	console.log("veFXSBoost_before_whale:", new BigNumber(veFXSBoost_before_whale).div(BIG18).toNumber());

	// 	// Get the token ID
	// 	const token_id = await vefxs_boost_instance.get_token_id.call(ADDRESS_WITH_VEFXS, 0);
	// 	console.log("token_id: ", new BigNumber(token_id).toString());
		
	// 	await hre.network.provider.request({
	// 		method: "hardhat_impersonateAccount",
	// 		params: [ADDRESS_WITH_VEFXS]
	// 	});

	// 	// Extend the boost
	// 	curr_ts = (new BigNumber(await time.latest())).toNumber();
	// 	await vefxs_boost_instance.extend_boost(
	// 		token_id,
	// 		1000,
	// 		curr_ts + (500 * 86400),
	// 		0,
	// 		{ from: ADDRESS_WITH_VEFXS }
	// 	);

	// 	await hre.network.provider.request({
	// 		method: "hardhat_stopImpersonatingAccount",
	// 		params: [ADDRESS_WITH_VEFXS]
	// 	});

	// 	// Note adjusted veFXS balances after
	// 	veFXSBoost_after_1 = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(COLLATERAL_FRAX_AND_FXS_OWNER);
	// 	veFXSBoost_after_whale = await vefxs_boost_deleg_proxy_instance.adjusted_balance_of.call(ADDRESS_WITH_VEFXS);
	// 	console.log("veFXSBoost_after_1:", new BigNumber(veFXSBoost_after_1).div(BIG18).toNumber());
	// 	console.log("veFXSBoost_after_whale:", new BigNumber(veFXSBoost_after_whale).div(BIG18).toNumber());
	// });


	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("------------------------------------------------");
		console.log("Give the staking contract some FRAX, to be recovered later");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		await frax_instance.transfer(staking_instance.address, new BigNumber("1e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract and address[1] with FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(staking_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with GEL");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_GEL]
		});

		await gel_instance.transfer(staking_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_GEL });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_GEL]
		});

		console.log("------------------------------------------------");
		console.log("Give LPs to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await pair_instance.transfer(accounts[1], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance.transfer(accounts[9], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		console.log("------------------------------------------------");
		console.log("Add this farm as a gauge");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await frax_gauge_controller.add_gauge(staking_instance.address, 0, 2000, { from: COMPTROLLER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		console.log("------------------------------------------------");
		console.log("Vote for the farm");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		// Vote for this farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(staking_instance.address, 10000, { from: ADDRESS_WITH_VEFXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		console.log("------------------------------------------------");
		console.log("Add the gauge info to the rewards distributor");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await gauge_rewards_distributor_instance.setGaugeState(staking_instance.address, 0, 1, { from: COMPTROLLER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		// Add a migrator address
		await staking_instance.toggleMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		// Move to the end of the gauge controller period
		const current_timestamp_00 = (new BigNumber(await time.latest())).toNumber();
		const time_total = await frax_gauge_controller.time_total.call();

		const increase_time_0 = (time_total - current_timestamp_00);
		console.log("increase_time_0 [to gauge controller period end] (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		// Move to the end of the staking contract's period
		const current_timestamp_0a = (new BigNumber(await time.latest())).toNumber();
		const period_end_0a = await staking_instance.periodFinish.call();

		const increase_time_0a = (period_end_0a - current_timestamp_0a) + 1;
		console.log("increase_time_0a [to staking contract period end] (days): ", increase_time_0a / 86400);
		await time.increase(increase_time_0a);
		await time.advanceBlock();

		// Checkpoint the gauges
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_0, { from: accounts[9] });
		
		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print out the gauge relative weights
		const gauge_rel_wgt = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(staking_instance.address)).div(BIG18).toNumber();
		console.log("gauge_rel_wgt: ", gauge_rel_wgt);

		// Print the weekly emission
		const weekly_total_emission = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission);

		// Print the reward rate
		let reward_amount = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount per week (FXS): ", reward_amount);

		// NOTE
		console.log(chalk.yellow.bold("DEPENDING ON WHO VOTED, THE REWARD RATE MAY CHANGE SLIGHTLY WEEK AFTER WEEK DUE TO VEFXS DECAY"));
	});

	it('Locked stakes', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TRY TESTS WITH LOCKED STAKES."));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		const all_reward_tokens = await staking_instance.getAllRewardTokens.call();
		console.log("all_reward_tokens: ", all_reward_tokens);

		const ACCOUNT_9_CLAIMS_EARLY = true;
		let ACCOUNT_9_EARLY_EARN = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			ACCOUNT_9_EARLY_EARN.push(0);
		}
		
		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Get more veFXS (accounts[1])
		const deposit_amount_1 = 1;
		const deposit_amount_1_e18 = new BigNumber(deposit_amount_1).multipliedBy("1e18");
		console.log(`Deposit ${deposit_amount_1} FXS (4 years) for veFXS`);

		const veFXS_deposit_days_1 = (4 * 365); // 4 years
		let block_time_current_1 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_1 = block_time_current_1 + ((veFXS_deposit_days_1 * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print FXS balances
		const fxs_bal_week_0 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		console.log("FXS balance week 0:", fxs_bal_week_0);
		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance.approve(staking_instance.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance.approve(staking_instance.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await frax_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(uni_pool_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await staking_instance.stakeLocked(new BigNumber ("25e17"), 365 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await staking_instance.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		let locked_stake_structs_1_0 = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		let locked_stake_structs_9_0 = await staking_instance.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN WITHDRAWALS (SHOULD FAIL)");
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		const _total_liquidity_locked_0 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		// Print the reward rate
		let reward_amount_check1 = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check1 per week (FXS): ", reward_amount_check1);

		// Print out the gauge relative weights
		const gauge_rel_wgt_check_0 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(staking_instance.address)).div(BIG18).toNumber();
		console.log("gauge_rel_wgt_check_0: ", gauge_rel_wgt_check_0);

		// Print the weekly emission
		const weekly_total_emission_check_0 = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission_check_0);

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WAIT UNTIL THE END OF THE 1st PERIOD"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		const period_end_1 = await staking_instance.periodFinish.call();

		const increase_time_1 = (period_end_1 - current_timestamp_1) + 10;
		console.log("increase_time_1 (days): ", increase_time_1 / 86400);
		await time.increase(increase_time_1);
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: STAKING_OWNER });

		const staking_earned_1_arr = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		// Call here, not send. Just want to see return values
		const staking_getRewardCall_1_arr = await staking_instance.getReward.call({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_9_arr = await staking_instance.earned.call(accounts[9]);
		const duration_reward_1_arr = await staking_instance.getRewardForDuration.call();

		let reward_week_1 = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			const staking_earned_1 = new BigNumber(staking_earned_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 1 week [${all_reward_tokens[j]}]: `, staking_earned_1.toString());
			const staking_getReward_1 = new BigNumber(staking_getRewardCall_1_arr[j]).div(BIG18);
			console.log(`accounts[1] getReward call after 1 week [${all_reward_tokens[j]}]: `, staking_getReward_1.toString());

			// Make sure getReward() and earned() match
			assert(staking_earned_1.isEqualTo(staking_getReward_1), `${all_reward_tokens[j]} getReward() and earned() mismatch`);

			const staking_earned_9 = new BigNumber(staking_earned_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 1 week [${all_reward_tokens[j]}]: `, staking_earned_9.toString());
	
			reward_week_1[j] = (staking_earned_1).plus(staking_earned_9);
			const effective_yearly_reward_at_week_1 = reward_week_1[j].multipliedBy(52.1429);
			console.log(`Effective weekly reward at week 1 [${all_reward_tokens[j]}]: `, reward_week_1[j].toString());
			console.log(`Effective yearly reward at week 1 [${all_reward_tokens[j]}]: `, effective_yearly_reward_at_week_1.toString());

			const duration_reward_1 = new BigNumber(duration_reward_1_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${all_reward_tokens[j]}]: `, duration_reward_1.multipliedBy(52.1429).toString());
		
			const reward_amount_this_week = new BigNumber(await staking_instance.rewardRates.call(j)).multipliedBy(604800).div(BIG18).toNumber();
			console.log(`reward per week from rewardRate (${all_reward_tokens[j]}): `, reward_amount_this_week);
		}

		// Note the FXS balance before the reward claims
		const fxs_bal_before_claim_wk_1 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		// Account 9 either claims or it does not
		if (ACCOUNT_9_CLAIMS_EARLY){
			console.log(chalk.green.bold("ACCOUNT[9] claims early"));

			// Mutate
			await staking_instance.getReward({ from: accounts[9] });

			ACCOUNT_9_EARLY_EARN[0] = new BigNumber(0);
		}
		else {
			console.log(chalk.red.bold("ACCOUNT[9] does not claim"));

			// Call
			const early_earned_res_9 = await staking_instance.earned.call(accounts[9])

			for (let j = 0; j < all_reward_tokens.length; j++){
				ACCOUNT_9_EARLY_EARN[j] = new BigNumber(early_earned_res_9[j]);
			}
		}

		// Note the FXS balance after the reward claims
		const fxs_bal_after_claim_wk_1 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		// Make sure the proper amount of FXS was actually emitted
		const fxs_actually_emitted_wk_1 = fxs_bal_before_claim_wk_1 - fxs_bal_after_claim_wk_1;
		const early_earn = ACCOUNT_9_EARLY_EARN[0].div(BIG18).toNumber()
		console.log("reward_week_1 [FXS]:", reward_week_1[0].toNumber());
		console.log("fxs_actually_emitted_wk_1:", fxs_actually_emitted_wk_1);
		console.log("ACCOUNT_9_EARLY_EARN[0]:", early_earn);
		assert(fxs_actually_emitted_wk_1 + early_earn >= (reward_week_1[0].toNumber() * .99), 'FXS actually emitted mismatches FXS earned() [underemission]');
		assert(fxs_actually_emitted_wk_1 + early_earn <= (reward_week_1[0].toNumber() * 1.01), 'FXS actually emitted mismatches FXS earned() [overemission]');

		// Print the reward rate
		let reward_amount_check2 = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check2 per week (FXS): ", reward_amount_check2);

		// Print out the gauge relative weights
		const gauge_rel_wgt_check_1 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(staking_instance.address)).div(BIG18).toNumber();
		console.log("gauge_rel_wgt_check_1: ", gauge_rel_wgt_check_1);

		// Print the weekly emission
		const weekly_total_emission_check_1 = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission_check_1);

		console.log(chalk.yellow("===================================================================="));
		console.log("CUT THE VOTE FOR THE FARM by 90%");

		console.log("------------------------------------------------");
		console.log("Vote for the farm");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		// Vote for this farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(staking_instance.address, 1000, { from: ADDRESS_WITH_VEFXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		console.log("VOTE CUT");

		console.log(chalk.yellow("===================================================================="));
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400));
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Checkpoint the gauges again
		const current_timestamp_re_checkpoint = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_re_checkpoint, { from: accounts[9] });
				
		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_week5_1_arr = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_week5_9_arr = await staking_instance.earned.call(accounts[9]);
		const duration_reward_week5_arr = await staking_instance.getRewardForDuration.call();

		let reward_week_5 = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			const staking_earned_week5_1 = new BigNumber(staking_earned_week5_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 5 weeks [${all_reward_tokens[j]}]: `, staking_earned_week5_1.toString());
			const staking_earned_week5_9 = new BigNumber(staking_earned_week5_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 5 weeks [${all_reward_tokens[j]}]: `, staking_earned_week5_9.toString());
	
			reward_week_5[j] = (staking_earned_week5_1).plus(staking_earned_week5_9.minus(ACCOUNT_9_EARLY_EARN[j]));
			const effective_yearly_reward_at_week_5 = reward_week_5[j].multipliedBy(52.1429 / 4.0);
			console.log(`Effective weekly reward after 5 weeks [${all_reward_tokens[j]}]: `, reward_week_5[j].div(4).toString());
			console.log(`Effective yearly reward after 5 weeks [${all_reward_tokens[j]}]: `, effective_yearly_reward_at_week_5.toString());

			const duration_reward_week5 = new BigNumber(duration_reward_week5_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${all_reward_tokens[j]}]: `, duration_reward_week5.multipliedBy(52.1429).toString());
		
			const reward_amount_this_week = new BigNumber(await staking_instance.rewardRates.call(j)).multipliedBy(604800).div(BIG18).toNumber();
			console.log(`reward per week from rewardRate (${all_reward_tokens[j]}): `, reward_amount_this_week);
		}

		// Note the FXS balance before the reward claims
		const fxs_bal_before_claim_wk_5 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		// Account 9 withdraws and claims its locked stake
		await staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await staking_instance.getReward({ from: accounts[9] });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await staking_instance.unlockStakes({ from: STAKING_OWNER });
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		const _total_liquidity_locked_2 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());

		// Note the FXS balance after the reward claims
		const fxs_bal_after_claim_wk_5 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		// Make sure the proper amount of FXS was actually emitted
		const fxs_actually_emitted_wk_5 = fxs_bal_before_claim_wk_5 - fxs_bal_after_claim_wk_5;
		console.log("reward_week_5 [FXS]:", reward_week_5[0].toNumber());
		console.log("fxs_actually_emitted_wk_5:", fxs_actually_emitted_wk_5);
		assert(fxs_actually_emitted_wk_5 >= (reward_week_5[0].toNumber() * .99), 'FXS actually emitted mismatches FXS earned() [underemission]');
		assert(fxs_actually_emitted_wk_5 <= (reward_week_5[0].toNumber() * 1.01), 'FXS actually emitted mismatches FXS earned() [overemission]');

		console.log(chalk.yellow("===================================================================="));
		console.log("PREPARING LOCK EXPIRY BOUNDARY ISSUE CHECK");

		const uni_pool_lock_boundary_check_amount = new BigNumber("1e18");

		// Get starting FXS balances
		const starting_bal_fxs_1 =  new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const starting_bal_fxs_9 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();
		
		// Approve
		await pair_instance.approve(staking_instance.address, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance.approve(staking_instance.address, uni_pool_lock_boundary_check_amount, { from: accounts[9] });
		
		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(uni_pool_lock_boundary_check_amount, 10 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await staking_instance.stakeLocked(uni_pool_lock_boundary_check_amount, 10 * 86400, { from: accounts[9] });


		console.log(chalk.yellow("===================================================================="));
		console.log("account[1] claims right before expiry");

		// Advance 9 days and 12 hrs
		await time.increase((9.5 * 86400));
		await time.advanceBlock();

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Account 1 claims. Account 9 does not
		await staking_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.yellow("===================================================================="));
		console.log("Advance 60 days and have both accounts claim");

		// Advance 2 weeks
		await time.increase((60 * 86400));
		await time.advanceBlock();

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Both accounts claim
		await staking_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.getReward({ from: accounts[9] });

		// Fetch the new balances
		const ending_bal_fxs_1 =  new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const ending_bal_fxs_9 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();

		// Print the balance changes. Should be close to the same
		console.log("account[1] FXS difference: ", ending_bal_fxs_1 - starting_bal_fxs_1);
		console.log("account[9] FXS difference: ", ending_bal_fxs_9 - starting_bal_fxs_9);


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Proxy test"));

		const vefxs_multiplier_9_pre_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		console.log("veFXS multiplier [9]: ", vefxs_multiplier_9_pre_proxy.toString());

		console.log(chalk.yellow("Add the veFXS whale as a valid proxy"));
		await staking_instance.toggleValidVeFXSProxy(ADDRESS_VEFXS_WHALE, { from: STAKING_OWNER });

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		console.log(chalk.yellow("veFXS whale allows accounts[9] as a proxy-ee"));
		await staking_instance.proxyToggleStaker(accounts[9], { from: ADDRESS_VEFXS_WHALE });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		console.log(chalk.yellow("Staker uses veFXS whale as proxy"));
		await staking_instance.stakerSetVeFXSProxy(ADDRESS_VEFXS_WHALE, { from: accounts[9] });

		const vefxs_multiplier_9_post_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		console.log("veFXS multiplier [9]: ", vefxs_multiplier_9_post_proxy.toString());

		// Make sure the weight is higher now
		assert(vefxs_multiplier_9_post_proxy.isGreaterThan(vefxs_multiplier_9_pre_proxy), `Proxing should have boosted the weight`);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		console.log(chalk.yellow("veFXS whale disallows accounts[9] as a proxy-ee"));
		await staking_instance.proxyToggleStaker(accounts[9], { from: ADDRESS_VEFXS_WHALE });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		const vefxs_multiplier_9_post_proxy_disallow = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		console.log("veFXS multiplier [9]: ", vefxs_multiplier_9_post_proxy_disallow.toString());

		// Make sure the weight went back to what it was before
		assert(vefxs_multiplier_9_post_proxy_disallow.isEqualTo(vefxs_multiplier_9_pre_proxy), `Weight should be back to normal`);


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Extend a lock"));

		// Show the stake structs
		let stake_2_info = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		console.log("stake_2_info: ", utilities.cleanLockedStake(stake_2_info));

		// Extend the lock (trying an invalid one first)
		const existing_ending_timestamp = parseInt(stake_2_info.ending_timestamp);
		console.log("existing_ending_timestamp: ", existing_ending_timestamp);
		await expectRevert(
			staking_instance.extendLockTime(stake_2_info.kek_id, existing_ending_timestamp + 1000, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Must be in the future"
		);

		await staking_instance.extendLockTime(stake_2_info.kek_id, existing_ending_timestamp + (365 * 86400), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the info for the stake
		stake_2_info = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		console.log("stake_2_info: ", utilities.cleanLockedStake(stake_2_info));


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Add more to a lock"));

		// Add 1 more LP token to the lock
		await pair_instance.approve(staking_instance.address, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.lockAdditional(stake_2_info.kek_id, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the info for the stake
		stake_2_info = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		console.log("stake_2_info: ", utilities.cleanLockedStake(stake_2_info));
	});

	it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Greylist Fail Test========================="));


		console.log("greylistAddress(accounts[9])");
		await staking_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance.approve(staking_instance.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert(
			staking_instance.stakeLocked(new BigNumber("1e18"), 7 * 86400, { from: accounts[9] }),
			"Address has been greylisted"
		);
	});

	it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Greylist Succeed Test========================="));

		console.log("greylistAddress(accounts[9])");
		await staking_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		// console.log("");
		// console.log("this should succeed");
		// await pair_instance.approve(staking_instance.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await staking_instance.stakeLocked(new BigNumber("1e18"), 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// // Wait 2 days
		// for (let j = 0; j < 2; j++){
		// 	await time.increase(86400);
		// 	await time.advanceBlock();
		// }

		// // Claim back the NFT and collect the rewards
		// await staking_instance.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await staking_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});

	it("Communal / Token Manager Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("================Communal / Token Manager Tests================"));

		const staking_reward_tokens_addresses = await staking_instance.getAllRewardTokens.call();
		const test_recovery_amount = new BigNumber("1e18");

		// Get FXS and SUSHI balances
		const fxs_bal = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		const gel_bal = new BigNumber(await gel_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		console.log("fxs_bal: ", fxs_bal);
		console.log("gel_bal: ", gel_bal);

		console.log("Try recovering a non-reward token as the owner");
		await staking_instance.recoverERC20(frax_instance.address, test_recovery_amount, { from: STAKING_OWNER });

		console.log("Set a reward rate as the owner");
		await staking_instance.setRewardRate(staking_reward_tokens_addresses[1], 1000, { from: STAKING_OWNER });

		for (let j = 0; j < staking_reward_tokens_addresses.length; j++){
			const token_manager_address = await staking_instance.rewardManagers.call(staking_reward_tokens_addresses[j]);
			console.log(chalk.yellow.bold(`--------------${staking_reward_tokens_addresses[j]}--------------`));
			console.log(`[${staking_reward_tokens_addresses[j]} Manager]: ${token_manager_address}`);
			console.log(`[${staking_reward_tokens_addresses[j]} Address]: ${staking_reward_tokens_addresses[j]}`);

			// Print the balance
			const quick_instance = await ERC20.at(staking_reward_tokens_addresses[j]);
			const current_balance = new BigNumber(await quick_instance.balanceOf(staking_instance.address));
			console.log("Current balance:", current_balance.div(BIG18).toNumber());
		
			console.log("Try to set the reward rate with the wrong manager [SHOULD FAIL]");
			await expectRevert(
				staking_instance.setRewardRate(staking_reward_tokens_addresses[j], 0, { from: accounts[9] }),
				"Not owner or tkn mgr"
			);

			console.log("Try to change the token manager with the wrong account [SHOULD FAIL]");
			await expectRevert(
				staking_instance.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[9] }),
				"Not owner or tkn mgr"
			);

			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [token_manager_address]
			});
	
			console.log("Set the reward rate with the correct manager");
			await staking_instance.setRewardRate(staking_reward_tokens_addresses[j], 0, { from: token_manager_address });

			console.log("Try recovering reward tokens as the reward manager");
			await staking_instance.recoverERC20(staking_reward_tokens_addresses[j], test_recovery_amount, { from: token_manager_address });

			console.log("Change the token manager");
			await staking_instance.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: token_manager_address });
	
			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [token_manager_address]
			});
		}
	});

	it("Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log("---------TRY TO ERC20 RECOVER WHILE NOT AN OWNER [SHOULD FAIL]---------");
		await expectRevert(
			staking_instance.recoverERC20(pair_instance.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Not owner or tkn mgr"
		);

		console.log("---------TRY TO ERC20 RECOVER A REWARD TOKEN AS THE OWNER [SHOULD FAIL]---------");
		await expectRevert(
			staking_instance.recoverERC20(gel_instance.address, test_amount_1, { from: STAKING_OWNER }),
			"No valid tokens to recover"
		);
	});

	it("Migration Staking / Withdrawal Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Migration Staking / Withdrawal Tests=============="));

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Untoggle the stake unlocking
		await staking_instance.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await staking_instance.stakerToggleMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf LP:", (new BigNumber(await pair_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await pair_instance.approve(staking_instance.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_stake_structs = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[3].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await pair_instance.approve(staking_instance.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		let block_time_current_1 = (await time.latest()).toNumber();
		await staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Migration Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Migration Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_2, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			staking_instance.stakerToggleMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });
	
		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_3 = (await time.latest()).toNumber();
		await expectRevert(
			staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_3, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await staking_instance.stakerToggleMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await staking_instance.stakerToggleMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await staking_instance.toggleMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);
	});

	it("Proxy Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Proxy Tests=============="));

		console.log(chalk.blue("=============TEST WITH NO PROXIES [SHOULD FAIL]============="));

		console.log("--------- TRY ADD A PROXY NOT AS GOVERNANCE ---------");
		await expectRevert(
			staking_instance.toggleValidVeFXSProxy(ADDRESS_VEFXS_WHALE, { from: accounts[9] }),
			"Not owner or timelock"
		);

		console.log("--------- TRY ALLOWING A STAKER FOR AN INVALID PROXY ---------");
		await expectRevert(
			staking_instance.proxyToggleStaker(accounts[9], { from: MIGRATOR_ADDRESS }),
			"Invalid proxy"
		);

		console.log("--------- TRY ALLOWING A INVALID PROXY FOR A STAKER ---------");
		await expectRevert(
			staking_instance.stakerSetVeFXSProxy(MIGRATOR_ADDRESS, { from: accounts[9] }),
			"Invalid proxy"
		);


		console.log(chalk.blue("=============TEST WITH PROXIES [SHOULD FAIL]============="));

		// Set a real proxy now
		staking_instance.toggleValidVeFXSProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: STAKING_OWNER }),


		console.log("--------- TRY ALLOWING A VALID PROXY FOR A STAKER BEFORE THE PROXY TOGGLED THEM FIRST ---------");
		await expectRevert(
			staking_instance.stakerSetVeFXSProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: accounts[9] }),
			"Proxy has not allowed you yet"
		);
	});

});