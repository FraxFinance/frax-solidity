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

// FRAX core
const FPIS = artifacts.require("FPI/FPIS");

// veFPIS related
const veFPIS = artifacts.require("Curve/veFPIS");
const veFPISYieldDistributorV5 = artifacts.require("Staking/veFPISYieldDistributorV5");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

contract('veFPISYieldDistributorV5-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADMIN;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	let MIGRATOR_ADDRESS;
	const ADDRESS_WITH_FPIS = '0x1e84614543Ab707089CebB022122503462AC51b3';

	// Initialize core contract instances
	let fpis_instance;

	// Initialize veFPIS related instances
	let veFPIS_instance;
	let veFPISYieldDistributor_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// Constants
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADMIN = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		MIGRATOR_ADDRESS = accounts[10];

		// Fill core contract instances
		fpis_instance = await FPIS.deployed();

		// Initialize veFPIS related instances
		veFPIS_instance = await veFPIS.deployed();
		veFPISYieldDistributor_instance = await veFPISYieldDistributorV5.deployed();
	}); 
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");

		// Fake move in some FPIS
		console.log("Seed some accounts with FPIS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FPIS]
		});

		// await fpis_instance.transfer(veFPISYieldDistributor_instance.address, new BigNumber("500000e18"), { from: ADDRESS_WITH_FPIS });
		await fpis_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("250000e18"), { from: ADDRESS_WITH_FPIS });
		await fpis_instance.transfer(accounts[9], new BigNumber("10000e18"), { from: ADDRESS_WITH_FPIS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FPIS]
		});


		// Get some veFPIS
		const deposit_amount_1 = 200000;
		const deposit_amount_9 = 1250;
		const deposit_amount_1_e18 = new BigNumber(`${deposit_amount_1}e18`);
		const deposit_amount_9_e18 = new BigNumber(`${deposit_amount_9}e18`);
		console.log(`Deposit (accounts[1]) ${deposit_amount_1} FPIS (4 years) for veFPIS`);
		console.log(`Deposit (accounts[9])  ${deposit_amount_9} FPIS (4 years) for veFPIS`);

		const veFPIS_deposit_days = (4 * 365); // 4 years
		let block_time_current = (await time.latest()).toNumber();
		const veFPIS_deposit_end_timestamp = block_time_current + ((veFPIS_deposit_days * 86400) + 1);
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_9_e18, { from: accounts[9] });
		await veFPIS_instance.create_lock(deposit_amount_1_e18, veFPIS_deposit_end_timestamp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_9_e18, veFPIS_deposit_end_timestamp, { from: accounts[9] });
		
		// console.log("Initializing Contract");
		// await veFPISYieldDistributor_instance.initializeDefault({ from: STAKING_OWNER });

		console.log("Allow COLLATERAL_FRAX_AND_FXS_OWNER as a reward notifier");
		await veFPISYieldDistributor_instance.toggleRewardNotifier(COLLATERAL_FRAX_AND_FXS_OWNER, { from: STAKING_OWNER });

		console.log("----------Notify first half of 1st week's reward----------");
		const yield_week_1 = 3.5;
		const yield_week_1_e18 = new BigNumber(`${yield_week_1}e18`);
		await fpis_instance.approve(veFPISYieldDistributor_instance.address, yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.notifyRewardAmount(yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("1st week Yield Rate (1st half): ", new BigNumber(await veFPISYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());

		console.log("----------Notify second half of 1st week's reward----------");
		await fpis_instance.approve(veFPISYieldDistributor_instance.address, yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.notifyRewardAmount(yield_week_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("1st week Yield Rate (2nd half): ", new BigNumber(await veFPISYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());
	});

	it('Normal yield', async () => {
		console.log("=========================Normal Yields=========================");
		console.log("Day 0");
		// Note accounts[1]
		const vefpis_at_1st_checkpoint_1 = new BigNumber(await veFPIS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_at_1st_checkpoint_1 = new BigNumber(await fpis_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_in_vefpis_at_1st_checkpoint_1 = new BigNumber((await veFPIS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_at_1st_checkpoint_1_FPIS = new BigNumber(await veFPISYieldDistributor_instance.yields.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		expect(yield_at_1st_checkpoint_1_FPIS.toNumber()).to.equal(0);

		await veFPISYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] at first getYield");
		console.log("accounts[1] veFPIS balance:", vefpis_at_1st_checkpoint_1.toNumber());
		console.log("accounts[1] FPIS balance:", fpis_at_1st_checkpoint_1.toNumber());
		console.log("accounts[1] FPIS in veFPIS:", fpis_in_vefpis_at_1st_checkpoint_1.toNumber());
		console.log("accounts[1] staking yields() [FPIS]:", yield_at_1st_checkpoint_1_FPIS.toNumber());
		console.log("accounts[1] userVeFPISCheckpointed:", (new BigNumber(await veFPISYieldDistributor_instance.userVeFPISCheckpointed(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Note accounts[9]
		const vefpis_at_1st_checkpoint_9 = new BigNumber(await veFPIS_instance.balanceOf.call(accounts[9])).div(BIG18);
		const fpis_at_1st_checkpoint_9 = new BigNumber(await fpis_instance.balanceOf.call(accounts[9])).div(BIG18);
		const yield_at_1st_checkpoint_9_FPIS = new BigNumber(await veFPISYieldDistributor_instance.yields(accounts[9])).div(BIG18);
		expect(yield_at_1st_checkpoint_9_FPIS.toNumber()).to.equal(0);

		await veFPISYieldDistributor_instance.getYield({ from: accounts[9] });
		console.log("accounts[9] at first getYield");
		console.log("accounts[9] veFPIS balance:", vefpis_at_1st_checkpoint_9.toNumber());
		console.log("accounts[9] FPIS balance:", fpis_at_1st_checkpoint_9.toNumber());
		console.log("accounts[9] staking yields() [FPIS]:", yield_at_1st_checkpoint_9_FPIS.toNumber());
		console.log("accounts[9] userVeFPISCheckpointed:", (new BigNumber(await veFPISYieldDistributor_instance.userVeFPISCheckpointed(accounts[9]))).div(BIG18).toNumber());
		console.log("");

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let distributor_lastUpdateTime = new BigNumber(await veFPISYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toNumber());

		// Note the total periodFinish
		let distributor_periodFinish = new BigNumber(await veFPISYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish:", distributor_periodFinish.toNumber());

		// Note the total lastTimeYieldApplicable
		let distributor_lastTimeYieldApplicable = new BigNumber(await veFPISYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable():", distributor_lastTimeYieldApplicable.toNumber());

		console.log("====================================================================");
		console.log("Advance one week (one yieldDuration period)");
		// Advance 7 days so the yield can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await frax_instance.refreshCollateralRatio();
		console.log("");

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("block time after waiting one week (in seconds):", block_time_after);

		// Make sure there is a valid period for the contract
		await veFPISYieldDistributor_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		distributor_lastUpdateTime = new BigNumber(await veFPISYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toNumber());

		// Note the total periodFinish
		distributor_periodFinish = new BigNumber(await veFPISYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish:", distributor_periodFinish.toNumber());

		// Note the total lastTimeYieldApplicable
		distributor_lastTimeYieldApplicable = new BigNumber(await veFPISYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable():", distributor_lastTimeYieldApplicable.toNumber());
		
		// Note the total veFPIS supply stored
		const distributor_total_vefpis_supply_Stored = new BigNumber(await veFPISYieldDistributor_instance.totalVeFPISSupplyStored.call()).div(BIG18);
		console.log("Distributor totalVeFPISSupplyStored():", distributor_total_vefpis_supply_Stored.toNumber());

		// Quick checkpoint
		await veFPISYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.checkpoint({ from: accounts[9] });

		console.log("");
		// Show the yields
		const account_1_earned = await veFPISYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_wk1_earned_1_fpis = new BigNumber(account_1_earned).div(BIG18);
		const account_9_earned = await veFPISYieldDistributor_instance.earned.call(accounts[9]);
		const staking_wk1_earned_9_fpis = new BigNumber(account_9_earned).div(BIG18);

		console.log("accounts[1] earnings after 1 week [FPIS]:", staking_wk1_earned_1_fpis.toNumber());
		console.log("accounts[9] earnings after 1 week [FPIS]:", staking_wk1_earned_9_fpis.toNumber());
		const yield_week_1_fpis = (staking_wk1_earned_1_fpis).plus(staking_wk1_earned_9_fpis);
		const effective_weekly_yield_at_week_1_fpis = yield_week_1_fpis;
		console.log("Effective weekly yield at week 1 [FPIS]: ", yield_week_1_fpis.toNumber());

		const duration_yield = await veFPISYieldDistributor_instance.getYieldForDuration.call();
		const fractionParticipating = new BigNumber(await veFPISYieldDistributor_instance.fractionParticipating.call()).div(BIG6).toNumber();
		const pct_participating = fractionParticipating * 100;
		const duration_yield_1_fpis = new BigNumber(duration_yield).div(BIG18);
		console.log("Expected weekly yield [FPIS]: ", duration_yield_1_fpis.toNumber());
		const expected_weekly_1 = duration_yield_1_fpis.multipliedBy(fractionParticipating);
		console.log(`Expected weekly yield [FPIS], accounting for ${pct_participating}% participation: `, expected_weekly_1.toNumber());

		// Check to make the sure the yields are within expected values
		assert(effective_weekly_yield_at_week_1_fpis.toNumber() >= (expected_weekly_1.toNumber() * .99), 'Effective weekly yield < expected weekly yield [underemission]');
		assert(effective_weekly_yield_at_week_1_fpis.toNumber() <= (expected_weekly_1.toNumber() * 1.01), 'Effective weekly yield > Expected weekly yield [overemission]');

		console.log("accounts[1] claim yield");
		console.log("accounts[9] will not claim");
		await veFPISYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the veFPIS and FPIS amounts after the yield
		const veFPIS_post_yield_1 = new BigNumber(await veFPIS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_post_yield_1 = new BigNumber(await fpis_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[1] veFPIS balance:", veFPIS_post_yield_1.toNumber());
		console.log("accounts[1] FPIS balance:", fpis_post_yield_1.toNumber());

		console.log("====================================================================");

		console.log("Notify 2nd week's reward");
		const yield_week_2 = 70;
		const yield_week_2_e18 = new BigNumber(`${yield_week_2}e18`);
		await fpis_instance.approve(veFPISYieldDistributor_instance.address, yield_week_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.notifyRewardAmount(yield_week_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("2nd week Yield Rate: ", new BigNumber(await veFPISYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());

		console.log("====================================================================");

		console.log("wait two weeks to earn more");
		// Advance a few days
		await time.increase(2 * (7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await veFPISYieldDistributor_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_after);

		// Note the total lastUpdateTime
		distributor_lastUpdateTime = new BigNumber(await veFPISYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toNumber());

		// Note the total periodFinish
		distributor_periodFinish = new BigNumber(await veFPISYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish: ", distributor_periodFinish.toNumber());

		// Note the total lastTimeYieldApplicable
		distributor_lastTimeYieldApplicable = new BigNumber(await veFPISYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable: ", distributor_lastTimeYieldApplicable.toNumber());

		// Quick checkpoint
		await veFPISYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.checkpoint({ from: accounts[9] });

		// Show the yield
		const staking_part2_earned_1 = await veFPISYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_part2_earned_1_fpis = new BigNumber(staking_part2_earned_1).div(BIG18);
		
		const staking_part2_earned_9 = await veFPISYieldDistributor_instance.earned.call(accounts[9]);
		const staking_part2_earned_9_fpis = new BigNumber(staking_part2_earned_9).div(BIG18);

		console.log("accounts[1] staking earned() [FPIS]:", staking_part2_earned_1_fpis.toNumber());
		console.log("accounts[9] staking earned() (CARRYOVER) [FPIS]:", staking_wk1_earned_9_fpis.toNumber());
		console.log("accounts[9] staking earned() (THIS WEEK) [FPIS]:", staking_part2_earned_9_fpis.toNumber() - staking_wk1_earned_9_fpis.toNumber());
		console.log("accounts[9] staking earned() (TOTAL) [FPIS]:", staking_part2_earned_9_fpis.toNumber());
		console.log("");

		const veFPIS_2nd_time_balance_1 = new BigNumber(await veFPIS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_2nd_time_balance_1 = new BigNumber(await fpis_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const yield_earned_2nd_time_1 = await veFPISYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_2nd_time_1_fpis = new BigNumber(yield_earned_2nd_time_1).div(BIG18);
		console.log("accounts[1] veFPIS balance:", veFPIS_2nd_time_balance_1.toNumber());
		console.log("accounts[1] FPIS balance:", fpis_2nd_time_balance_1.toNumber());
		console.log("accounts[1] earned() [FPIS]:", yield_earned_2nd_time_1_fpis.toNumber());
		console.log("");

		// const sum_yield_week_3_fpis = ((staking_part2_earned_1_fpis).plus(staking_part2_earned_9_fpis)).plus(staking_wk1_earned_1_fpis);
		// const effective_yearly_yield_at_week_3_fpis  = sum_yield_week_3_fpis.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
		// const fractionParticipating_week_3 = new BigNumber(await veFPISYieldDistributor_instance.fractionParticipating.call()).div(BIG6).toNumber();
		// const pct_participating_week_3 = fractionParticipating_week_3 * 100;
		// console.log("Effective weekly yield at week 3 [FPIS]: ", sum_yield_week_3_fpis.div(3).toNumber()); // Total over 3 weeks
		
		// const duration_yield_3 = await veFPISYieldDistributor_instance.getYieldForDuration.call();
		// const duration_yield_3_fpis = new BigNumber(duration_yield_3).div(BIG18);
		// console.log("Expected yearly yield: [FPIS]", duration_yield_3_fpis.multipliedBy(52.1429).toNumber());
		// const expected_yearly_3 = duration_yield_3_fpis.multipliedBy(52.1429).multipliedBy(fractionParticipating_week_3);
		// console.log(`Expected yearly yield [FPIS], accounting for ${pct_participating_week_3}% participation: `, expected_yearly_3.toNumber());

		// // Check to make the sure the yields are within expected values
		// assert(effective_yearly_yield_at_week_3_fpis.toNumber() >= (expected_yearly_3.toNumber() * .99), 'Effective yearly yield < expected yearly yield [underemission]');
		// assert(effective_yearly_yield_at_week_3_fpis.toNumber() <= (expected_yearly_3.toNumber() * 1.01), 'Effective yearly yield > Expected yearly yield [overemission]');

		console.log("accounts[9] getYield()");
		await veFPISYieldDistributor_instance.getYield({ from: accounts[9] });

		await time.advanceBlock();

		const acc_9_FPIS_balance_after = (new BigNumber(await fpis_instance.balanceOf(accounts[9]))).div(BIG18);
		console.log("accounts[9] FPIS balance change:", acc_9_FPIS_balance_after.minus(fpis_at_1st_checkpoint_9).toNumber());
	
		console.log("====================================================================");
		const current_timestamp_3rd = (new BigNumber(await time.latest())).toNumber();
		const veFPIS_timeleft = (await veFPIS_instance.locked__end.call(COLLATERAL_FRAX_AND_FXS_OWNER)) - (current_timestamp_3rd);

		console.log("Wait just under four years, then collect");
		// Advance a few days
		await time.increase(veFPIS_timeleft - (7 * 86400));
		await time.advanceBlock();

		const veFPIS_3rd_time_balance_1 = new BigNumber(await veFPIS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_3rd_time_balance_1 = new BigNumber(await fpis_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_in_vefpis_3rd_time_balance_1 = new BigNumber((await veFPIS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_earned_3rd_time_1 = await veFPISYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_3rd_time_1_fpis = new BigNumber(yield_earned_3rd_time_1).div(BIG18);
		console.log("accounts[1] veFPIS balance:", veFPIS_3rd_time_balance_1.toNumber());
		console.log("accounts[1] FPIS balance:", fpis_3rd_time_balance_1.toNumber());
		console.log("accounts[1] FPIS in veFPIS balance:", fpis_in_vefpis_3rd_time_balance_1.toNumber());
		console.log("accounts[1] earned() (CARRYOVER) [FPIS]:", yield_earned_3rd_time_1_fpis.toNumber());
		console.log("");

		const staking_part3_earned_9 = await veFPISYieldDistributor_instance.earned.call(accounts[9]);
		const staking_part3_earned_9_fpis = new BigNumber(staking_part3_earned_9).div(BIG18);
		console.log("accounts[9] staking earned() (TOTAL) [FPIS]:", staking_part3_earned_9_fpis.toNumber());
		console.log("");

		assert(yield_earned_3rd_time_1_fpis.toNumber() == staking_part2_earned_1_fpis.toNumber(), 'Should not have accrued extra FPIS');

		await veFPISYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.getYield({ from: accounts[9] });

		console.log("====================================================================");

		console.log("Notify final week's reward");
		const yield_week_final = 700;
		const yield_week_final_e18 = new BigNumber(`${yield_week_final}e18`);
		await fpis_instance.approve(veFPISYieldDistributor_instance.address, yield_week_final_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPISYieldDistributor_instance.notifyRewardAmount(yield_week_final_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Final week yield rate: ", new BigNumber(await veFPISYieldDistributor_instance.getYieldForDuration.call()).div(BIG18).toNumber());

		console.log("====================================================================");
		console.log("Advance 2 years and try to collect past the veFPIS expiration.");

		// Advance two years
		// await time.increase(2 * (365 * 86400));
		// await time.advanceBlock();

		// Advance two years
		await time.increase(7.05 * 86400);
		await time.advanceBlock();

		const veFPIS_4th_time_balance_1 = new BigNumber(await veFPIS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_4th_time_balance_1 = new BigNumber(await fpis_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_in_vefpis_4th_time_balance_1 = new BigNumber((await veFPIS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_earned_4th_time_1 = await veFPISYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_4th_time_1_fpis = new BigNumber(yield_earned_4th_time_1).div(BIG18);
		console.log("accounts[1] veFPIS balance:", veFPIS_4th_time_balance_1.toNumber());
		console.log("accounts[1] FPIS balance:", fpis_4th_time_balance_1.toNumber());
		console.log("accounts[1] FPIS in veFPIS balance:", fpis_in_vefpis_4th_time_balance_1.toNumber());
		console.log("accounts[1] earned() [FPIS]:", yield_earned_4th_time_1_fpis.toNumber());
		console.log("");

		const staking_part4_earned_9 = await veFPISYieldDistributor_instance.earned.call(accounts[9]);
		const staking_part4_earned_9_fpis = new BigNumber(staking_part4_earned_9).div(BIG18);
		console.log("accounts[9] staking earned() (TOTAL) [FPIS]:", staking_part4_earned_9_fpis.toNumber());
		console.log("");

		await veFPISYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("====================================================================");

		console.log("Wait one month. No yield should accrue because the veFPIS has expired back to 1-1");
		// Advance a few days
		await time.increase(4 * (30 * 86400) + 1);
		await time.advanceBlock();

		const veFPIS_5th_time_balance_1 = new BigNumber(await veFPIS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_5th_time_balance_1 = new BigNumber(await fpis_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fpis_in_vefpis_5th_time_balance_1 = new BigNumber((await veFPIS_instance.locked.call(COLLATERAL_FRAX_AND_FXS_OWNER)).amount).div(BIG18);
		const yield_earned_5th_time_1 = await veFPISYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_5th_time_1_fpis = new BigNumber(yield_earned_5th_time_1).div(BIG18);
		console.log("accounts[1] veFPIS balance:", veFPIS_5th_time_balance_1.toNumber());
		console.log("accounts[1] FPIS balance:", fpis_5th_time_balance_1.toNumber());
		console.log("accounts[1] FPIS in veFPIS balance:", fpis_in_vefpis_5th_time_balance_1.toNumber());
		console.log("accounts[1] earned() [FPIS]:", yield_earned_5th_time_1_fpis.toNumber());
		console.log("");

		// Make sure no yield was earned
		assert(yield_earned_5th_time_1_fpis.toNumber() == 0, 'Should not have earned yield');

		await veFPISYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	});

	
	it("blocks a greylisted address which tries to get yield; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await veFPISYieldDistributor_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");

		await expectRevert.unspecified(veFPISYieldDistributor_instance.getYield({ from: accounts[9] }));
	});

	it("ungreylists a greylisted address which tries to get yield; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await veFPISYieldDistributor_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should succeed");
		await veFPISYieldDistributor_instance.getYield({ from: accounts[9] });
	});


});