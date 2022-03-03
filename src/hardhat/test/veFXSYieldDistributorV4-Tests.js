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

// Core
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

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

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSYieldDistributor = artifacts.require("Staking/veFXSYieldDistributorV4");

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

contract('veFXSYieldDistributorV4-Tests', async (accounts) => {
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

	// Initialize veFXS related instances
	let veFXS_instance;
	let veFXSYieldDistributor_instance;

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

		// Initialize veFXS related instances
		veFXS_instance = await veFXS.deployed();
		veFXSYieldDistributor_instance = await veFXSYieldDistributor.deployed();
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

		// Fake move in some FXS
		console.log("Seed some accounts with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// await fxs_instance.transfer(veFXSYieldDistributor_instance.address, new BigNumber("500000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("250000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(accounts[9], new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});


		// Get some veFXS
		const deposit_amount_1 = 200000;
		const deposit_amount_9 = 1250;
		const deposit_amount_1_e18 = new BigNumber(`${deposit_amount_1}e18`);
		const deposit_amount_9_e18 = new BigNumber(`${deposit_amount_9}e18`);
		console.log(`Deposit (accounts[1]) ${deposit_amount_1} FXS (4 years) for veFXS`);
		console.log(`Deposit (accounts[9])  ${deposit_amount_9} FXS (4 years) for veFXS`);

		const veFXS_deposit_days = (4 * 365); // 4 years
		let block_time_current = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp = block_time_current + ((veFXS_deposit_days * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_9_e18, { from: accounts[9] });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_9_e18, veFXS_deposit_end_timestamp, { from: accounts[9] });
		
		// console.log("Initializing Contract");
		// await veFXSYieldDistributor_instance.initializeDefault({ from: STAKING_OWNER });

		console.log("Allow COLLATERAL_FRAX_AND_FXS_OWNER as a reward notifier");
		await veFXSYieldDistributor_instance.toggleRewardNotifier(COLLATERAL_FRAX_AND_FXS_OWNER, { from: STAKING_OWNER });

		console.log("----------Notify first half of 1st week's reward----------");
		const yield_week_1 = 3.5;
		const yield_week_1_e18 = new BigNumber(`${yield_week_1}e18`);
		await fxs_instance.approve(veFXSYieldDistributor_instance.address, yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.notifyRewardAmount(yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("1st week Yield Rate (1st half): ", new BigNumber(await veFXSYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());

		console.log("----------Notify second half of 1st week's reward----------");
		await fxs_instance.approve(veFXSYieldDistributor_instance.address, yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.notifyRewardAmount(yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("1st week Yield Rate (2nd half): ", new BigNumber(await veFXSYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());
	});

	it('Normal yield', async () => {
		console.log("=========================Normal Yields=========================");

		// Note accounts[1]
		const vefxs_at_1st_checkpoint_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_at_1st_checkpoint_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_in_vefxs_at_1st_checkpoint_1 = new BigNumber((await veFXS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_at_1st_checkpoint_1_FXS = new BigNumber(await veFXSYieldDistributor_instance.yields.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		expect(yield_at_1st_checkpoint_1_FXS.toNumber()).to.equal(0);

		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] at first getYield");
		console.log("accounts[1] veFXS balance:", vefxs_at_1st_checkpoint_1.toNumber());
		console.log("accounts[1] FXS balance:", fxs_at_1st_checkpoint_1.toNumber());
		console.log("accounts[1] FXS in veFXS:", fxs_in_vefxs_at_1st_checkpoint_1.toNumber());
		console.log("accounts[1] staking yields() [FXS]:", yield_at_1st_checkpoint_1_FXS.toNumber());
		console.log("accounts[1] userVeFXSCheckpointed:", (new BigNumber(await veFXSYieldDistributor_instance.userVeFXSCheckpointed(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Note accounts[9]
		const vefxs_at_1st_checkpoint_9 = new BigNumber(await veFXS_instance.balanceOf.call(accounts[9])).div(BIG18);
		const fxs_at_1st_checkpoint_9 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const yield_at_1st_checkpoint_9_FXS = new BigNumber(await veFXSYieldDistributor_instance.yields(accounts[9])).div(BIG18);
		expect(yield_at_1st_checkpoint_9_FXS.toNumber()).to.equal(0);

		await veFXSYieldDistributor_instance.getYield({ from: accounts[9] });
		console.log("accounts[9] at first getYield");
		console.log("accounts[9] veFXS balance:", vefxs_at_1st_checkpoint_9.toNumber());
		console.log("accounts[9] FXS balance:", fxs_at_1st_checkpoint_9.toNumber());
		console.log("accounts[9] staking yields() [FXS]:", yield_at_1st_checkpoint_9_FXS.toNumber());
		console.log("accounts[9] userVeFXSCheckpointed:", (new BigNumber(await veFXSYieldDistributor_instance.userVeFXSCheckpointed(accounts[9]))).div(BIG18).toNumber());
		console.log("");

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let distributor_lastUpdateTime = new BigNumber(await veFXSYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toNumber());

		// Note the total periodFinish
		let distributor_periodFinish = new BigNumber(await veFXSYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish:", distributor_periodFinish.toNumber());

		// Note the total lastTimeYieldApplicable
		let distributor_lastTimeYieldApplicable = new BigNumber(await veFXSYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable():", distributor_lastTimeYieldApplicable.toNumber());

		console.log("====================================================================");
		console.log("advance one week (one yieldDuration period)");
		// Advance 7 days so the yield can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await frax_instance.refreshCollateralRatio();
		console.log("");

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("block time after waiting one week (in seconds):", block_time_after);

		// Make sure there is a valid period for the contract
		await veFXSYieldDistributor_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		distributor_lastUpdateTime = new BigNumber(await veFXSYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toNumber());

		// Note the total periodFinish
		distributor_periodFinish = new BigNumber(await veFXSYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish:", distributor_periodFinish.toNumber());

		// Note the total lastTimeYieldApplicable
		distributor_lastTimeYieldApplicable = new BigNumber(await veFXSYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable():", distributor_lastTimeYieldApplicable.toNumber());
		
		// Note the total veFXS supply stored
		const distributor_total_vefxs_supply_Stored = new BigNumber(await veFXSYieldDistributor_instance.totalVeFXSSupplyStored.call()).div(BIG18);
		console.log("Distributor totalVeFXSSupplyStored():", distributor_total_vefxs_supply_Stored.toNumber());

		// Quick checkpoint
		await veFXSYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.checkpoint({ from: accounts[9] });

		console.log("");
		// Show the yields
		const account_1_earned = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_wk1_earned_1_fxs = new BigNumber(account_1_earned).div(BIG18);
		const account_9_earned = await veFXSYieldDistributor_instance.earned.call(accounts[9]);
		const staking_wk1_earned_9_fxs = new BigNumber(account_9_earned).div(BIG18);

		console.log("accounts[1] earnings after 1 week [FXS]:", staking_wk1_earned_1_fxs.toNumber());
		console.log("accounts[9] earnings after 1 week [FXS]:", staking_wk1_earned_9_fxs.toNumber());
		const yield_week_1_fxs = (staking_wk1_earned_1_fxs).plus(staking_wk1_earned_9_fxs);
		const effective_weekly_yield_at_week_1_fxs = yield_week_1_fxs;
		console.log("Effective weekly yield at week 1 [FXS]: ", yield_week_1_fxs.toNumber());

		const duration_yield = await veFXSYieldDistributor_instance.getYieldForDuration.call();
		const fractionParticipating = new BigNumber(await veFXSYieldDistributor_instance.fractionParticipating.call()).div(BIG6).toNumber();
		const pct_participating = fractionParticipating * 100;
		const duration_yield_1_fxs = new BigNumber(duration_yield).div(BIG18);
		console.log("Expected weekly yield [FXS]: ", duration_yield_1_fxs.toNumber());
		const expected_weekly_1 = duration_yield_1_fxs.multipliedBy(fractionParticipating);
		console.log(`Expected weekly yield [FXS], accounting for ${pct_participating}% participation: `, expected_weekly_1.toNumber());

		// Check to make the sure the yields are within expected values
		assert(effective_weekly_yield_at_week_1_fxs.toNumber() >= (expected_weekly_1.toNumber() * .99), 'Effective weekly yield < expected weekly yield [underemission]');
		assert(effective_weekly_yield_at_week_1_fxs.toNumber() <= (expected_weekly_1.toNumber() * 1.01), 'Effective weekly yield > Expected weekly yield [overemission]');

		console.log("accounts[1] claim yield");
		console.log("accounts[9] will not claim");
		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the veFXS and FXS amounts after the yield
		const veFXS_post_yield_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_post_yield_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_post_yield_1.toNumber());
		console.log("accounts[1] FXS balance:", fxs_post_yield_1.toNumber());

		console.log("====================================================================");

		console.log("Notify 2nd week's reward");
		const yield_week_2 = 70;
		const yield_week_2_e18 = new BigNumber(`${yield_week_2}e18`);
		await fxs_instance.approve(veFXSYieldDistributor_instance.address, yield_week_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.notifyRewardAmount(yield_week_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("2nd week Yield Rate: ", new BigNumber(await veFXSYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());

		console.log("====================================================================");

		console.log("wait two weeks to earn more");
		// Advance a few days
		await time.increase(2 * (7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await veFXSYieldDistributor_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_after);

		// Note the total lastUpdateTime
		distributor_lastUpdateTime = new BigNumber(await veFXSYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toNumber());

		// Note the total periodFinish
		distributor_periodFinish = new BigNumber(await veFXSYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish: ", distributor_periodFinish.toNumber());

		// Note the total lastTimeYieldApplicable
		distributor_lastTimeYieldApplicable = new BigNumber(await veFXSYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable: ", distributor_lastTimeYieldApplicable.toNumber());

		// Quick checkpoint
		await veFXSYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.checkpoint({ from: accounts[9] });

		// Show the yield
		const staking_part2_earned_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_part2_earned_1_fxs = new BigNumber(staking_part2_earned_1).div(BIG18);
		
		const staking_part2_earned_9 = await veFXSYieldDistributor_instance.earned.call(accounts[9]);
		const staking_part2_earned_9_fxs = new BigNumber(staking_part2_earned_9).div(BIG18);

		console.log("accounts[1] staking earned() [FXS]:", staking_part2_earned_1_fxs.toNumber());
		console.log("accounts[9] staking earned() (CARRYOVER) [FXS]:", staking_wk1_earned_9_fxs.toNumber());
		console.log("accounts[9] staking earned() (THIS WEEK) [FXS]:", staking_part2_earned_9_fxs.toNumber() - staking_wk1_earned_9_fxs.toNumber());
		console.log("accounts[9] staking earned() (TOTAL) [FXS]:", staking_part2_earned_9_fxs.toNumber());
		console.log("");

		const veFXS_2nd_time_balance_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_2nd_time_balance_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const yield_earned_2nd_time_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_2nd_time_1_fxs = new BigNumber(yield_earned_2nd_time_1).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_2nd_time_balance_1.toNumber());
		console.log("accounts[1] FXS balance:", fxs_2nd_time_balance_1.toNumber());
		console.log("accounts[1] earned() [FXS]:", yield_earned_2nd_time_1_fxs.toNumber());
		console.log("");

		// const sum_yield_week_3_fxs = ((staking_part2_earned_1_fxs).plus(staking_part2_earned_9_fxs)).plus(staking_wk1_earned_1_fxs);
		// const effective_yearly_yield_at_week_3_fxs  = sum_yield_week_3_fxs.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
		// const fractionParticipating_week_3 = new BigNumber(await veFXSYieldDistributor_instance.fractionParticipating.call()).div(BIG6).toNumber();
		// const pct_participating_week_3 = fractionParticipating_week_3 * 100;
		// console.log("Effective weekly yield at week 3 [FXS]: ", sum_yield_week_3_fxs.div(3).toNumber()); // Total over 3 weeks
		
		// const duration_yield_3 = await veFXSYieldDistributor_instance.getYieldForDuration.call();
		// const duration_yield_3_fxs = new BigNumber(duration_yield_3).div(BIG18);
		// console.log("Expected yearly yield: [FXS]", duration_yield_3_fxs.multipliedBy(52.1429).toNumber());
		// const expected_yearly_3 = duration_yield_3_fxs.multipliedBy(52.1429).multipliedBy(fractionParticipating_week_3);
		// console.log(`Expected yearly yield [FXS], accounting for ${pct_participating_week_3}% participation: `, expected_yearly_3.toNumber());

		// // Check to make the sure the yields are within expected values
		// assert(effective_yearly_yield_at_week_3_fxs.toNumber() >= (expected_yearly_3.toNumber() * .99), 'Effective yearly yield < expected yearly yield [underemission]');
		// assert(effective_yearly_yield_at_week_3_fxs.toNumber() <= (expected_yearly_3.toNumber() * 1.01), 'Effective yearly yield > Expected yearly yield [overemission]');

		console.log("accounts[9] getYield()");
		await veFXSYieldDistributor_instance.getYield({ from: accounts[9] });

		await time.advanceBlock();

		const acc_9_FXS_balance_after = (new BigNumber(await fxs_instance.balanceOf(accounts[9]))).div(BIG18);
		console.log("accounts[9] FXS balance change:", acc_9_FXS_balance_after.minus(fxs_at_1st_checkpoint_9).toNumber());
	
		console.log("====================================================================");
		const current_timestamp_3rd = (new BigNumber(await time.latest())).toNumber();
		const veFXS_timeleft = (await veFXS_instance.locked__end.call(COLLATERAL_FRAX_AND_FXS_OWNER)) - (current_timestamp_3rd);

		console.log("Wait just under four years, then collect");
		// Advance a few days
		await time.increase(veFXS_timeleft - (7 * 86400));
		await time.advanceBlock();

		const veFXS_3rd_time_balance_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_3rd_time_balance_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_in_vefxs_3rd_time_balance_1 = new BigNumber((await veFXS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_earned_3rd_time_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_3rd_time_1_fxs = new BigNumber(yield_earned_3rd_time_1).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_3rd_time_balance_1.toNumber());
		console.log("accounts[1] FXS balance:", fxs_3rd_time_balance_1.toNumber());
		console.log("accounts[1] FXS in veFXS balance:", fxs_in_vefxs_3rd_time_balance_1.toNumber());
		console.log("accounts[1] earned() (CARRYOVER) [FXS]:", yield_earned_3rd_time_1_fxs.toNumber());
		console.log("");

		assert(yield_earned_3rd_time_1_fxs.toNumber() == staking_part2_earned_1_fxs.toNumber(), 'Should not have accrued extra FXS');

		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("====================================================================");

		console.log("Notify last week's reward");
		const yield_week_last = 700;
		const yield_week_last_e18 = new BigNumber(`${yield_week_last}e18`);
		await fxs_instance.approve(veFXSYieldDistributor_instance.address, yield_week_last_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.notifyRewardAmount(yield_week_last_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Last week Yield Rate: ", new BigNumber(await veFXSYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());

		console.log("====================================================================");
		console.log("Advance 2 years and try to collect past the veFXS expiration.");

		// Advance two weeks
		await time.increase(2 * (365 * 86400));
		await time.advanceBlock();

		const veFXS_4th_time_balance_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_4th_time_balance_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_in_vefxs_4th_time_balance_1 = new BigNumber((await veFXS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_earned_4th_time_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_4th_time_1_fxs = new BigNumber(yield_earned_4th_time_1).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_4th_time_balance_1.toNumber());
		console.log("accounts[1] FXS balance:", fxs_4th_time_balance_1.toNumber());
		console.log("accounts[1] FXS in veFXS balance:", fxs_in_vefxs_4th_time_balance_1.toNumber());
		console.log("accounts[1] earned() [FXS]:", yield_earned_4th_time_1_fxs.toNumber());
		console.log("");

		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("====================================================================");

		console.log("Wait one month. No yield should accrue because the veFXS has expired back to 1-1");
		// Advance a few days
		await time.increase(1 * (30 * 86400) + 1);
		await time.advanceBlock();

		const veFXS_5th_time_balance_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_5th_time_balance_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_in_vefxs_5th_time_balance_1 = new BigNumber((await veFXS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_earned_5th_time_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_5th_time_1_fxs = new BigNumber(yield_earned_5th_time_1).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_5th_time_balance_1.toNumber());
		console.log("accounts[1] FXS balance:", fxs_5th_time_balance_1.toNumber());
		console.log("accounts[1] FXS in veFXS balance:", fxs_in_vefxs_5th_time_balance_1.toNumber());
		console.log("accounts[1] earned() [FXS]:", yield_earned_5th_time_1_fxs.toNumber());
		console.log("");

		// Make sure no yield was earned
		assert(yield_earned_5th_time_1_fxs.toNumber() == 0, 'Should not have earned yield');

		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	});

	
	it("blocks a greylisted address which tries to get yield; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await veFXSYieldDistributor_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");

		await expectRevert.unspecified(veFXSYieldDistributor_instance.getYield({ from: accounts[9] }));
	});

	it("ungreylists a greylisted address which tries to get yield; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await veFXSYieldDistributor_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should succeed");
		await veFXSYieldDistributor_instance.getYield({ from: accounts[9] });
	});


});