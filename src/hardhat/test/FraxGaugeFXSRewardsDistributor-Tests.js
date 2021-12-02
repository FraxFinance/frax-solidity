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

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");
const e = require('express');

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

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
const FraxUniV3Farm_Stable_FRAX_DAI = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_DAI");
const FraxUniV3Farm_Stable_FRAX_USDC = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_USDC");
const FraxMiddlemanGauge_FRAX_mUSD = artifacts.require("Curve/Middleman_Gauges/FraxMiddlemanGauge_FRAX_mUSD");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS / gauge related
const veFXS = artifacts.require("Curve/IveFXS");
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

contract('FraxGaugeFXSRewardsDistributor-Tests', async (accounts) => {
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
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_VEFXS = '0xb55794c3bef4651b6cBc78b64a2Ef6c5c67837C3';
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_FRAX3CRV_V2 = '0x36a87d1e3200225f881488e4aeedf25303febcae';
	
	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;
	let mockFRAX3CRVInstance;
	let mockFRAX3CRV_V2Instance;

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

	// Initialize Sushi pair contracts
	let pair_instance_FRAX_FXS_Sushi;
	let pair_instance_FXS_WETH_Sushi;

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
	let stakingInstanceDualV2_FRAX3CRV_V2;
	let fraxFarmInstance_FRAX_DAI;
	let fraxFarmInstance_FRAX_USDC;
	let middlemanGauge_FRAX_mUSD;

	// Initialize veFXS related instances
	let veFXS_instance;
	let frax_gauge_controller;
	let gauge_rewards_distributor_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// Constants
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
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
	
		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed();

		// Fill the staking rewards instances
		fraxFarmInstance_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.deployed();
		fraxFarmInstance_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deployed();
		middlemanGauge_FRAX_mUSD = await FraxMiddlemanGauge_FRAX_mUSD.deployed();

		// Initialize veFXS related instances
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

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {

		// Refresh FXS / WETH oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

	});


	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");

		// Move to the end of the gauge controller period
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		const time_total = await frax_gauge_controller.time_total.call();

		const increase_time_0 = (time_total - current_timestamp_0);
		console.log("increase_time_0 (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		// Fake move in some FXS
		console.log("Seed the distributor with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(gauge_rewards_distributor_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(gauge_rewards_distributor_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

	});

	it('Test FXS reward amounts', async () => {
		console.log("=========================Day 0=========================");
		// Note balances beforehand
		const fxs_bal_distributor_before_reward_0 = new BigNumber(await fxs_instance.balanceOf.call(gauge_rewards_distributor_instance.address)).div(BIG18).toNumber();

		// Checkpoint the gauges
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(fraxFarmInstance_FRAX_DAI.address, current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write(fraxFarmInstance_FRAX_USDC.address, current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write(middlemanGauge_FRAX_mUSD.address, current_timestamp_0, { from: accounts[9] });

		// Get estimated rewards
		const estimated_rewards_0_frax_dai = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(fraxFarmInstance_FRAX_DAI.address)).div(BIG18).toNumber();
		const estimated_rewards_0_frax_usdc = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber();
		const estimated_rewards_0_musd_frax = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(middlemanGauge_FRAX_mUSD.address)).div(BIG18).toNumber();
		console.log("estimated_rewards_0_frax_dai: ", estimated_rewards_0_frax_dai);
		console.log("estimated_rewards_0_frax_usdc: ", estimated_rewards_0_frax_usdc);
		console.log("estimated_rewards_0_musd_frax: ", estimated_rewards_0_musd_frax);

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		console.log("Distribute rewards");

		// Distribute the rewards
		await gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_DAI.address, { from: accounts[9] });
		await gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_USDC.address, { from: accounts[9] });
		await gauge_rewards_distributor_instance.distributeReward(middlemanGauge_FRAX_mUSD.address, { from: accounts[9] });

		// Note balances afterwards. Should have FRAX and USDC LP fees too
		const fxs_bal_distributor_after_reward_0 = new BigNumber(await fxs_instance.balanceOf.call(gauge_rewards_distributor_instance.address)).div(BIG18).toNumber();
		
		// Print the changes
		console.log(`FXS change from reward: ${fxs_bal_distributor_after_reward_0 - fxs_bal_distributor_before_reward_0} FXS`);
		assert(fxs_bal_distributor_after_reward_0 < fxs_bal_distributor_before_reward_0, 'Should have emitted something');

		console.log("=========================Day 3=========================");
		// Advance 3 days
		await time.increase((3 * 86400) + 1);
		await time.advanceBlock();

		// Note balances beforehand
		const fxs_bal_distributor_before_reward_1 = new BigNumber(await fxs_instance.balanceOf.call(gauge_rewards_distributor_instance.address)).div(BIG18).toNumber();

		// Checkpoint the gauges
		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(fraxFarmInstance_FRAX_DAI.address, current_timestamp_1, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write(fraxFarmInstance_FRAX_USDC.address, current_timestamp_1, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write(middlemanGauge_FRAX_mUSD.address, current_timestamp_1, { from: accounts[9] });

		// Get estimated rewards
		const estimated_rewards_1_frax_dai = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(fraxFarmInstance_FRAX_DAI.address)).div(BIG18).toNumber();
		const estimated_rewards_1_frax_usdc = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber();
		const estimated_rewards_1_musd_frax = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(middlemanGauge_FRAX_mUSD.address)).div(BIG18).toNumber();
		console.log("estimated_rewards_1_frax_dai: ", estimated_rewards_1_frax_dai);
		console.log("estimated_rewards_1_frax_usdc: ", estimated_rewards_1_frax_usdc);
		console.log("estimated_rewards_1_musd_frax: ", estimated_rewards_1_musd_frax);

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		console.log("Distribute rewards. Should distribute nothing");

		// Distribute the rewards
		await gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_DAI.address, { from: accounts[9] });
		await gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_USDC.address, { from: accounts[9] });
		await gauge_rewards_distributor_instance.distributeReward(middlemanGauge_FRAX_mUSD.address, { from: accounts[9] });

		// Note balances afterwards. Should have FRAX and USDC LP fees too
		const fxs_bal_distributor_after_reward_1 = new BigNumber(await fxs_instance.balanceOf.call(gauge_rewards_distributor_instance.address)).div(BIG18).toNumber();
		
		// Print the changes
		console.log(`FXS change from reward: ${fxs_bal_distributor_after_reward_1 - fxs_bal_distributor_before_reward_1} FXS`);
		assert(fxs_bal_distributor_after_reward_1 == fxs_bal_distributor_before_reward_1, 'Should not have emitted anything');

		console.log("=========================Day 8=========================");
		// Advance 5 days, so you are now into the 2nd week
		await time.increase((5 * 86400) + 1);
		await time.advanceBlock();

		// Note balances beforehand
		const fxs_bal_distributor_before_reward_2 = new BigNumber(await fxs_instance.balanceOf.call(gauge_rewards_distributor_instance.address)).div(BIG18).toNumber();

		// Checkpoint the gauges
		const current_timestamp_2 = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(fraxFarmInstance_FRAX_DAI.address, current_timestamp_2, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write(fraxFarmInstance_FRAX_USDC.address, current_timestamp_2, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write(middlemanGauge_FRAX_mUSD.address, current_timestamp_2, { from: accounts[9] });

		// Get estimated rewards
		const estimated_rewards_2_frax_dai = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(fraxFarmInstance_FRAX_DAI.address)).div(BIG18).toNumber();
		const estimated_rewards_2_frax_usdc = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber();
		const estimated_rewards_2_musd_frax = new BigNumber(await gauge_rewards_distributor_instance.currentReward.call(middlemanGauge_FRAX_mUSD.address)).div(BIG18).toNumber();
		console.log("estimated_rewards_2_frax_dai: ", estimated_rewards_2_frax_dai);
		console.log("estimated_rewards_2_frax_usdc: ", estimated_rewards_2_frax_usdc);
		console.log("estimated_rewards_2_musd_frax: ", estimated_rewards_2_musd_frax);

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		console.log("Distribute rewards.");

		// NOTE, USE of newer contract here (0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0) with the newer farm soon
		await gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_DAI.address, { from: accounts[9] });
		await gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_USDC.address, { from: accounts[9] });
		await gauge_rewards_distributor_instance.distributeReward(middlemanGauge_FRAX_mUSD.address, { from: accounts[9] });

		// Note balances afterwards. Should have FRAX and USDC LP fees too
		const fxs_bal_distributor_after_reward_2 = new BigNumber(await fxs_instance.balanceOf.call(gauge_rewards_distributor_instance.address)).div(BIG18).toNumber();
		
		// Print the changes
		console.log(`FXS change from reward: ${fxs_bal_distributor_after_reward_2 - fxs_bal_distributor_before_reward_2} FXS`);
		assert(fxs_bal_distributor_after_reward_2 < fxs_bal_distributor_before_reward_2, 'Should have emitted something');

		console.log("=========================Day 15 [Fail Test]=========================");
		// Advance 7 days, so you are now into the 3nd week
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// Toggle distributions off
		await gauge_rewards_distributor_instance.toggleDistributions({ from: process.env.FRAX_ONE_ADDRESS });

		await expectRevert(
			gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_DAI.address, { from: accounts[9] }),
			"Distributions are off"
		);

		await expectRevert(
			gauge_rewards_distributor_instance.distributeReward(fraxFarmInstance_FRAX_USDC.address, { from: accounts[9] }),
			"Distributions are off"
		);

		await expectRevert(
			gauge_rewards_distributor_instance.distributeReward(middlemanGauge_FRAX_mUSD.address, { from: accounts[9] }),
			"Distributions are off"
		);

		// Toggle distributions back on
		await gauge_rewards_distributor_instance.toggleDistributions({ from: process.env.FRAX_ONE_ADDRESS });


		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	});



});