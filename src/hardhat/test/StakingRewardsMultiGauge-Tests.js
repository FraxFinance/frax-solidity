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
const e = require('express');

// Uniswap related
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const IUniswapV2ERC20 = artifacts.require("Uniswap/Interfaces/IUniswapV2ERC20");
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const ERC20 = artifacts.require("ERC20/ERC20");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Saddle related
const ISaddleD4_LP = artifacts.require("Misc_AMOs/saddle/ISaddleD4_LP");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");

const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");

const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");


// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const CommunalFarm_SaddleD4 = artifacts.require("Staking/Variants/CommunalFarm_SaddleD4");
const StakingRewardsMultiGauge_FXS_WETH = artifacts.require("Staking/Variants/StakingRewardsMultiGauge_FXS_WETH");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const IQToken = artifacts.require("ERC20/Variants/IQToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");
const CRV_DAO_ERC20_Mock = artifacts.require("ERC20/Variants/CRV_DAO_ERC20_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS and gauge related
const veFXS = artifacts.require("Curve/IveFXS");
const FraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const COLLATERAL_SEED_DEC6 = new BigNumber(508500e6);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
const THREE_THOUSAND_DEC6 = new BigNumber(3000e6);
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

contract('StakingRewardsMultiGauge-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
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
	const ADDRESS_WITH_SUSHI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_VEFXS = '0x42c160eada4a2f1bebb14d40aed8c54883bc1a22';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;
	let iq_instance;
	let alcx_instance;
	let lqty_instance;
	let mockFRAX3CRVInstance;
	let mockCRVDAOInstance;
	
	// Initialize the Uniswap Router Instance
	let routerInstance; 

	// Initialize the Uniswap Factory Instance
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
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_FXS;
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Initialize the governance contract
	let governanceInstance;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_USDC_vAMM;
	
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
	let pair_instance_FXS_WETH_Sushi;

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

	// Initialize veFXS and gauge-related instances
	let veFXS_instance;
	let frax_gauge_controller;
	let gauge_rewards_distributor_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// Constants
		ORIGINAL_FRAX_DEPLOYER_ADDRESS = process.env.FRAX_DEPLOYER_ADDRESS;
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
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
		wethInstance = await WETH.deployed();
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		iq_instance = await IQToken.deployed();
		sushi_instance = await ERC20.at("0x6b3595068778dd592e39a122f4f5a5cf09c90fe2");

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
		
		// Initialize the Uniswap Factory Instance
		// uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Fill the Uniswap V3 Instances
		// uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		// pair_instance_FRAX_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/WETH"]);
		// pair_instance_FRAX_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/USDC"]);
		// pair_instance_FXS_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/FXS"]);
		// pair_instance_FRAX_IQ = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/IQ"]);
		// pair_instance_Saddle_D4 = await ISaddleD4_LP.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Saddle alUSD/FEI/FRAX/LUSD"]);
		// pair_instance_FXS_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FXS/USDC"]);
		pair_instance_FXS_WETH_Sushi = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FXS/WETH"]);

		// Get the mock CRVDAO Instance
		mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.deployed();

		// Get the mock FRAX3CRV Instance
		// uniswapV3PositionsNFTInstance = await FRAX3CRV_Mock.deployed(); 

		// Fill the staking rewards instances
		// stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
		// stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
		// stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.deployed();
		// communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.deployed();
		// fraxFarmInstance_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deployed();
		stakingInstanceMultiGauge_FXS_WETH = await StakingRewardsMultiGauge_FXS_WETH.deployed();

		// veFXS and gauge related
		veFXS_instance = await veFXS.deployed();
		frax_gauge_controller = await FraxGaugeController.deployed();
		gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Initialization related', async () => {
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

		await frax_instance.transfer(stakingInstanceMultiGauge_FXS_WETH.address, new BigNumber("1e18"), { from: ADDRESS_WITH_FRAX });

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
		await fxs_instance.transfer(stakingInstanceMultiGauge_FXS_WETH.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with SUSHI");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_SUSHI]
		});

		await sushi_instance.transfer(stakingInstanceMultiGauge_FXS_WETH.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_SUSHI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_SUSHI]
		});

		console.log("------------------------------------------------");
		console.log("Give LPs to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await pair_instance_FXS_WETH_Sushi.transfer(accounts[1], new BigNumber("30e16"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance_FXS_WETH_Sushi.transfer(accounts[9], new BigNumber("30e16"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		console.log("------------------------------------------------");
		console.log("Add this farm as a gauge");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ORIGINAL_FRAX_DEPLOYER_ADDRESS]
		});

		await frax_gauge_controller.add_gauge(stakingInstanceMultiGauge_FXS_WETH.address, 0, 2000, { from: ORIGINAL_FRAX_DEPLOYER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ORIGINAL_FRAX_DEPLOYER_ADDRESS]
		});

		console.log("------------------------------------------------");
		console.log("Vote for the farm");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		// Vote for this farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(stakingInstanceMultiGauge_FXS_WETH.address, 10000, { from: ADDRESS_WITH_VEFXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		console.log("------------------------------------------------");
		console.log("Add the gauge info to the rewards distributor");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ORIGINAL_FRAX_ONE_ADDRESS]
		});

		await gauge_rewards_distributor_instance.setGaugeState(stakingInstanceMultiGauge_FXS_WETH.address, 0, 1, { from: ORIGINAL_FRAX_ONE_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ORIGINAL_FRAX_ONE_ADDRESS]
		});

		// Add a migrator address
		await stakingInstanceMultiGauge_FXS_WETH.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		// Move to the end of the gauge controller period
		const current_timestamp_00 = (new BigNumber(await time.latest())).toNumber();
		const time_total = await frax_gauge_controller.time_total.call();

		const increase_time_0 = (time_total - current_timestamp_00);
		console.log("increase_time_0 [to gauge controller period end] (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		// Move to the end of the staking contract's period
		const current_timestamp_0a = (new BigNumber(await time.latest())).toNumber();
		const period_end_0a = await stakingInstanceMultiGauge_FXS_WETH.periodFinish.call();

		const increase_time_0a = (period_end_0a - current_timestamp_0a) + 1;
		console.log("increase_time_0a [to staking contract period end] (days): ", increase_time_0a / 86400);
		await time.increase(increase_time_0a);
		await time.advanceBlock();

		// Checkpoint the gauges
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(stakingInstanceMultiGauge_FXS_WETH.address, current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_0, { from: accounts[9] });
		
		// Sync the contract
		await stakingInstanceMultiGauge_FXS_WETH.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print out the gauge relative weights
		const Sushi_FRAX_FXS_relative_weight = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		console.log("Sushi_FRAX_FXS_relative_weight: ", Sushi_FRAX_FXS_relative_weight);

		// Print the weekly emission
		const weekly_total_emission = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission);

		// Print the reward rate
		let reward_amount = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount per week (FXS): ", reward_amount);

		// NOTE
		console.log(chalk.yellow.bold("DEPENDING ON WHO VOTED, THE REWARD RATE MAY CHANGE SLIGHTLY WEEK AFTER WEEK DUE TO VEFXS DECAY"));
	});

	it('Locked stakes', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TRY TESTS WITH LOCKED STAKES."));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		const staking_reward_symbols = await stakingInstanceMultiGauge_FXS_WETH.getRewardSymbols.call();
		console.log("staking_reward_symbols: ", staking_reward_symbols);

		const ACCOUNT_9_CLAIMS_EARLY = true;
		let ACCOUNT_9_EARLY_EARN = [];
		for (let j = 0; j < staking_reward_symbols.length; j++){
			ACCOUNT_9_EARLY_EARN.push(0);
		}
		
		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, accounts[9]);

		// Get more veFXS (accounts[1])
		const deposit_amount_1 = 0.001;
		const deposit_amount_1_e18 = new BigNumber(deposit_amount_1).multipliedBy("1e18");
		console.log(`Deposit ${deposit_amount_1} FXS (4 years) for veFXS`);

		const veFXS_deposit_days_1 = (4 * 365); // 4 years
		let block_time_current_1 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_1 = block_time_current_1 + ((veFXS_deposit_days_1 * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print FXS balances
		const fxs_bal_week_0 = new BigNumber(await fxs_instance.balanceOf(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		console.log("FXS balance week 0:", fxs_bal_week_0);
		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e15");
		const uni_pool_locked_1_sum = new BigNumber ("10e16");
		const uni_pool_locked_9 = new BigNumber("25e15");
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await frax_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		// Stake Locked
		// account[1]
		await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(uni_pool_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(new BigNumber ("25e15"), 365 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1_0 = await stakingInstanceMultiGauge_FXS_WETH.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9_0 = await stakingInstanceMultiGauge_FXS_WETH.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, accounts[9]);

		const _total_liquidity_locked_0 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		// Print the reward rate
		let reward_amount_check1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check1 per week (FXS): ", reward_amount_check1);

		// Print out the gauge relative weights
		const Sushi_FRAX_FXS_relative_weight_check_0 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		console.log("Sushi_FRAX_FXS_relative_weight_check_0: ", Sushi_FRAX_FXS_relative_weight_check_0);

		// Print the weekly emission
		const weekly_total_emission_check_0 = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission_check_0);

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WAIT UNTIL THE END OF THE 1st PERIOD"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		const period_end_1 = await stakingInstanceMultiGauge_FXS_WETH.periodFinish.call();

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
		await stakingInstanceMultiGauge_FXS_WETH.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: STAKING_OWNER });

		const staking_earned_1_arr = await stakingInstanceMultiGauge_FXS_WETH.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_9_arr = await stakingInstanceMultiGauge_FXS_WETH.earned.call(accounts[9]);
		const duration_reward_1_arr = await stakingInstanceMultiGauge_FXS_WETH.getRewardForDuration.call();

		let reward_week_1 = [];
		for (let j = 0; j < staking_reward_symbols.length; j++){
			const staking_earned_1 = new BigNumber(staking_earned_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 1 week [${staking_reward_symbols[j]}]: `, staking_earned_1.toString());
			const staking_earned_9 = new BigNumber(staking_earned_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 1 week [${staking_reward_symbols[j]}]: `, staking_earned_9.toString());
	
			reward_week_1[j] = (staking_earned_1).plus(staking_earned_9);
			const effective_yearly_reward_at_week_1 = reward_week_1[j].multipliedBy(52.1429);
			console.log(`Effective weekly reward at week 1 [${staking_reward_symbols[j]}]: `, reward_week_1[j].toString());
			console.log(`Effective yearly reward at week 1 [${staking_reward_symbols[j]}]: `, effective_yearly_reward_at_week_1.toString());

			const duration_reward_1 = new BigNumber(duration_reward_1_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${staking_reward_symbols[j]}]: `, duration_reward_1.multipliedBy(52.1429).toString());
		
			const reward_amount_this_week = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.rewardRates.call(j)).multipliedBy(604800).div(BIG18).toNumber();
			console.log(`reward per week from rewardRate (${staking_reward_symbols[j]}): `, reward_amount_this_week);
		}

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		// Account 9 either claims or it does not
		if (ACCOUNT_9_CLAIMS_EARLY){
			console.log(chalk.green.bold("ACCOUNT[9] claims early"));

			// Mutate
			await stakingInstanceMultiGauge_FXS_WETH.getReward({ from: accounts[9] });
		}
		else {
			console.log(chalk.red.bold("ACCOUNT[9] does not claim"));

			// Call
			const early_earned_res_9 = await stakingInstanceMultiGauge_FXS_WETH.earned.call(accounts[9])

			for (let j = 0; j < staking_reward_symbols.length; j++){
				ACCOUNT_9_EARLY_EARN[j] = ACCOUNT_9_EARLY_EARN[0].plus(new BigNumber(early_earned_res_9[j]))
			}
		}

		// Get the FXS balances again
		const fxs_bal_week_1 = new BigNumber(await fxs_instance.balanceOf(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		console.log("FXS balance week 1:", fxs_bal_week_1);
		console.log("FXS balance change week 0 to week 1:", fxs_bal_week_1 - fxs_bal_week_0);

		// Print the reward rate
		let reward_amount_check2 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check2 per week (FXS): ", reward_amount_check2);

		// Print out the gauge relative weights
		const Sushi_FRAX_FXS_relative_weight_check_1 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		console.log("Sushi_FRAX_FXS_relative_weight_check_1: ", Sushi_FRAX_FXS_relative_weight_check_1);

		// Print the weekly emission
		const weekly_total_emission_check_1 = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission_check_1);

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
		await frax_gauge_controller.gauge_relative_weight_write(stakingInstanceMultiGauge_FXS_WETH.address, current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_re_checkpoint, { from: accounts[9] });
				
		// Sync the contract
		await stakingInstanceMultiGauge_FXS_WETH.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_week5_1_arr = await stakingInstanceMultiGauge_FXS_WETH.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_week5_9_arr = await stakingInstanceMultiGauge_FXS_WETH.earned.call(accounts[9]);
		const duration_reward_week5_arr = await stakingInstanceMultiGauge_FXS_WETH.getRewardForDuration.call();

		let reward_week_5 = [];
		for (let j = 0; j < staking_reward_symbols.length; j++){
			const staking_earned_week5_1 = new BigNumber(staking_earned_week5_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 5 weeks [${staking_reward_symbols[j]}]: `, staking_earned_week5_1.toString());
			const staking_earned_week5_9 = new BigNumber(staking_earned_week5_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 5 weeks [${staking_reward_symbols[j]}]: `, staking_earned_week5_9.toString());
	
			reward_week_5[j] = (staking_earned_week5_1).plus(staking_earned_week5_9.minus(ACCOUNT_9_EARLY_EARN[j]));
			const effective_yearly_reward_at_week_5 = reward_week_5[j].multipliedBy(52.1429 / 4.0);
			console.log(`Effective weekly reward after 5 weeks [${staking_reward_symbols[j]}]: `, reward_week_5[j].div(4).toString());
			console.log(`Effective yearly reward after 5 weeks [${staking_reward_symbols[j]}]: `, effective_yearly_reward_at_week_5.toString());

			const duration_reward_week5 = new BigNumber(duration_reward_week5_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${staking_reward_symbols[j]}]: `, duration_reward_week5.multipliedBy(52.1429).toString());
		
			const reward_amount_this_week = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.rewardRates.call(j)).multipliedBy(604800).div(BIG18).toNumber();
			console.log(`reward per week from rewardRate (${staking_reward_symbols[j]}): `, reward_amount_this_week);
		}

		// Account 9 withdraws and claims its locked stake
		await stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await stakingInstanceMultiGauge_FXS_WETH.getReward({ from: accounts[9] });
		await expectRevert.unspecified(stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await stakingInstanceMultiGauge_FXS_WETH.unlockStakes({ from: STAKING_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceMultiGauge_FXS_WETH, accounts[9]);

		const _total_liquidity_locked_2 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());


		console.log(chalk.yellow("===================================================================="));
		console.log("PREPARING LOCK EXPIRY BOUNDARY ISSUE CHECK");

		const uni_pool_lock_boundary_check_amount = new BigNumber("1e16");

		// Get starting FXS balances
		const starting_bal_fxs_1 =  new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const starting_bal_fxs_9 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();
		
		// Approve
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, uni_pool_lock_boundary_check_amount, { from: accounts[9] });
		
		// Stake Locked
		// account[1]
		await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(uni_pool_lock_boundary_check_amount, 10 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(uni_pool_lock_boundary_check_amount, 10 * 86400, { from: accounts[9] });


		console.log(chalk.yellow("===================================================================="));
		console.log("account[1] claims right before expiry");

		// Advance 9 days and 12 hrs
		await time.increase((9.5 * 86400));
		await time.advanceBlock();

		// Sync the contract
		await stakingInstanceMultiGauge_FXS_WETH.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Account 1 claims. Account 9 does not
		await stakingInstanceMultiGauge_FXS_WETH.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.yellow("===================================================================="));
		console.log("Advance 60 days and have both accounts claim");

		// Advance 2 weeks
		await time.increase((60 * 86400));
		await time.advanceBlock();

		// Sync the contract
		await stakingInstanceMultiGauge_FXS_WETH.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Both accounts claim
		await stakingInstanceMultiGauge_FXS_WETH.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.getReward({ from: accounts[9] });

		// Fetch the new balances
		const ending_bal_fxs_1 =  new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const ending_bal_fxs_9 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();

		// Print the balance changes. Should be close to the same
		console.log("account[1] FXS difference: ", ending_bal_fxs_1 - starting_bal_fxs_1);
		console.log("account[9] FXS difference: ", ending_bal_fxs_9 - starting_bal_fxs_9);
	});

	it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Greylist Fail Test========================="));


		console.log("greylistAddress(accounts[9])");
		await stakingInstanceMultiGauge_FXS_WETH.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.stakeLocked(new BigNumber("1e18"), 7 * 86400, { from: accounts[9] }),
			"Address has been greylisted"
		);
	});

	it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Greylist Succeed Test========================="));

		console.log("greylistAddress(accounts[9])");
		await stakingInstanceMultiGauge_FXS_WETH.greylistAddress(accounts[9], { from: STAKING_OWNER });
		// console.log("");
		// console.log("this should succeed");
		// await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(new BigNumber("1e18"), 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// // Wait 2 days
		// for (let j = 0; j < 2; j++){
		// 	await time.increase(86400);
		// 	await time.advanceBlock();
		// }

		// // Claim back the NFT and collect the rewards
		// await stakingInstanceMultiGauge_FXS_WETH.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await stakingInstanceMultiGauge_FXS_WETH.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});

	it("Communal / Token Manager Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("================Communal / Token Manager Tests================"));

		const staking_reward_symbols = await stakingInstanceMultiGauge_FXS_WETH.getRewardSymbols.call();
		const staking_reward_tokens_addresses = await stakingInstanceMultiGauge_FXS_WETH.getAllRewardTokens.call();
		const test_recovery_amount = new BigNumber("1e16");

		// Get FXS and SUSHI balances
		const fxs_bal = new BigNumber(await fxs_instance.balanceOf(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		const sushi_bal = new BigNumber(await sushi_instance.balanceOf(stakingInstanceMultiGauge_FXS_WETH.address)).div(BIG18).toNumber();
		console.log("fxs_bal: ", fxs_bal);
		console.log("sushi_bal: ", sushi_bal);

		console.log("Try recovering a non-reward token as the owner");
		await stakingInstanceMultiGauge_FXS_WETH.recoverERC20(frax_instance.address, test_recovery_amount, { from: STAKING_OWNER });

		console.log("Set a reward rate as the owner");
		await stakingInstanceMultiGauge_FXS_WETH.setRewardRate(staking_reward_tokens_addresses[1], 1000, true, { from: STAKING_OWNER });

		for (let j = 0; j < staking_reward_symbols.length; j++){
			const token_manager_address = await stakingInstanceMultiGauge_FXS_WETH.rewardManagers.call(staking_reward_tokens_addresses[j]);
			console.log(chalk.yellow.bold(`--------------${staking_reward_symbols[j]}--------------`));
			console.log(`[${staking_reward_symbols[j]} Manager]: ${token_manager_address}`);
			console.log(`[${staking_reward_symbols[j]} Address]: ${staking_reward_tokens_addresses[j]}`);

			// Print the balance
			const quick_instance = await ERC20.at(staking_reward_tokens_addresses[j]);
			const current_balance = new BigNumber(await quick_instance.balanceOf(stakingInstanceMultiGauge_FXS_WETH.address));
			console.log("Current balance:", current_balance.div(BIG18).toNumber());
		
			console.log("Try to set the reward rate with the wrong manager [SHOULD FAIL]");
			await expectRevert(
				stakingInstanceMultiGauge_FXS_WETH.setRewardRate(staking_reward_tokens_addresses[j], 0, true, { from: accounts[9] }),
				"You are not the owner or the correct token manager"
			);

			console.log("Try to change the token manager with the wrong account [SHOULD FAIL]");
			await expectRevert(
				stakingInstanceMultiGauge_FXS_WETH.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[9] }),
				"You are not the owner or the correct token manager"
			);

			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [token_manager_address]
			});
	
			console.log("Set the reward rate with the correct manager");
			await stakingInstanceMultiGauge_FXS_WETH.setRewardRate(staking_reward_tokens_addresses[j], 0, true, { from: token_manager_address });

			console.log("Try recovering reward tokens as the reward manager");
			await stakingInstanceMultiGauge_FXS_WETH.recoverERC20(staking_reward_tokens_addresses[j], test_recovery_amount, { from: token_manager_address });

			console.log("Change the token manager");
			await stakingInstanceMultiGauge_FXS_WETH.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: token_manager_address });
	
			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [token_manager_address]
			});
		}
	});

	it("Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e16");
		const locked_stake_structs = await stakingInstanceMultiGauge_FXS_WETH.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log("---------TRY TO ERC20 RECOVER WHILE NOT AN OWNER [SHOULD FAIL]---------");
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.recoverERC20(pair_instance_FXS_WETH_Sushi.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"You are not the owner or the correct token manager"
		);

		console.log("---------TRY TO ERC20 RECOVER A REWARD TOKEN AS THE OWNER [SHOULD FAIL]---------");
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.recoverERC20(sushi_instance.address, test_amount_1, { from: STAKING_OWNER }),
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
		await stakingInstanceMultiGauge_FXS_WETH.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_locked = new BigNumber("5e16");

		// Allow the migrator function to migrate for you
		await stakingInstanceMultiGauge_FXS_WETH.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf Sushi FXS/WETH LP:", (new BigNumber(await pair_instance_FXS_WETH_Sushi.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceMultiGauge_FXS_WETH.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_stake_structs = await stakingInstanceMultiGauge_FXS_WETH.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await stakingInstanceMultiGauge_FXS_WETH.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e16");
		await stakingInstanceMultiGauge_FXS_WETH.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[3].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_FXS_WETH_Sushi.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e16");
		await pair_instance_FXS_WETH_Sushi.approve(stakingInstanceMultiGauge_FXS_WETH.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		let block_time_current_1 = (await time.latest()).toNumber();
		await stakingInstanceMultiGauge_FXS_WETH.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_FXS_WETH_Sushi.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await stakingInstanceMultiGauge_FXS_WETH.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Migration Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Migration Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e16");
		const locked_stake_structs = await stakingInstanceMultiGauge_FXS_WETH.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await stakingInstanceMultiGauge_FXS_WETH.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_2, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await stakingInstanceMultiGauge_FXS_WETH.toggleMigrations({ from: STAKING_OWNER });
	
		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Migrator invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_3 = (await time.latest()).toNumber();
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_3, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Migrator invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await stakingInstanceMultiGauge_FXS_WETH.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Migrator invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await stakingInstanceMultiGauge_FXS_WETH.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await stakingInstanceMultiGauge_FXS_WETH.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			stakingInstanceMultiGauge_FXS_WETH.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Migrator invalid or unapproved"
		);
	});

});