const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { expect } = require("chai");

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));


// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// Uniswap related
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// FRAX core
const FRAXShares = artifacts.require("FXS/FRAXShares");

// veFXS and gauge related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSBoost = artifacts.require("Curve/IVotingEscrowDelegation");
const veFXSBoostDelegationProxy = artifacts.require("Curve/IDelegationProxy");
const IFraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const IFraxGaugeControllerV2 = artifacts.require("Curve/IFraxGaugeControllerV2");
const FraxGaugeController = artifacts.require("Curve/FraxGaugeController");
const FraxGaugeControllerV2 = artifacts.require("Curve/FraxGaugeControllerV2");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

const veFXSPointCorrector = (point, locked_balance, vote_weight_multiplier) => {
	// struct Point {
	// 	bias = initial vecrv generated. So if you stake 25 CRV for 4 years, the bias will be 25e18
	// 	slope = decay rate of the vecrv, assuming 1 CRV -> 1 veCRV and decaying to 0 veCRV
	// 	ts = timestamp of this point
	// 	blk = block of this point
	// 	amt (fxs_amt) = locked up CRV
	//  }

	// struct LockedBalance: {
	// 	amount: int128
	// 	end: uint256
	// }

	return {


		ts: point.ts,
		blk: point.blk,
		fxs_amt: point.fxs_amt,
	}
}

contract('FraxGaugeController-Tests', async (accounts) => {
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

	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';

	// Initialize core contract instances
	let fxs_instance;

	// Initialize veFXS and gauge-related instances
	let veFXS_instance;
	let frax_gauge_controller;
	let frax_gauge_controller_V2;

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
		fxs_instance = await FRAXShares.deployed();

		// veFXS and gauge related
		veFXS_instance = await veFXS.deployed();
		frax_gauge_controller = await IFraxGaugeController.at((await FraxGaugeController.deployed()).address);
		frax_gauge_controller_V2 = await IFraxGaugeControllerV2.at((await FraxGaugeControllerV2.deployed()).address);
		gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.deployed();

	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// ---------------------------------------------------------------
		console.log("Give three clean addresses FXS, for later use");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(ORACLE_ADDRESS, new BigNumber("100000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(POOL_CREATOR, new BigNumber("100000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(TIMELOCK_ADMIN, new BigNumber("100000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});


		console.log(chalk.hex("#ff8b3d").bold("========== Set up the V1 gauge controller with 2 fake farms =========="));
		const FAKE_FARM_1_ADDR = "0x11118368f4D220392174319E57946428ff51793d";
		const FAKE_FARM_2_ADDR = "0x222202961A30e9B9d5B0fF723811823921aD0931";

		// Add the fake farms to the V1 gauge
		await frax_gauge_controller.add_gauge(FAKE_FARM_1_ADDR, 0, 1000, { from: DEPLOYER_ADDRESS });
		console.log(`FARM ${FAKE_FARM_1_ADDR} added`);
		await frax_gauge_controller.add_gauge(FAKE_FARM_2_ADDR, 0, 1000, { from: DEPLOYER_ADDRESS });
		console.log(`FARM ${FAKE_FARM_2_ADDR} added`);


		console.log(chalk.hex("#ff8b3d").bold("========== Set up the V2 gauge controller with 2 fake farms =========="));
		// Add the fake farms to the V2 gauge
		await frax_gauge_controller_V2.add_gauge(FAKE_FARM_1_ADDR, 0, 1000, { from: DEPLOYER_ADDRESS });
		console.log(`FARM ${FAKE_FARM_1_ADDR} added`);
		await frax_gauge_controller_V2.add_gauge(FAKE_FARM_2_ADDR, 0, 1000, { from: DEPLOYER_ADDRESS });
		console.log(`FARM ${FAKE_FARM_2_ADDR} added`);


		console.log(chalk.hex("#ff8b3d").bold("\n========== Move right before the end of the gauge controller period =========="));
		const current_timestamp_00 = (new BigNumber(await time.latest())).toNumber();
		const time_total_0 = await frax_gauge_controller.time_total.call();

		const increase_time_0 = (time_total_0 - current_timestamp_00) - 300;
		console.log("increase_time_0 [to right before gauge controller period end] (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		// Print veFXS stats
		const vefxs_bal_2_0 = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_bal_3_0 = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		console.log("veFXS balance [2]: ", vefxs_bal_2_0);
		console.log("veFXS balance [3]: ", vefxs_bal_3_0);


		console.log(chalk.hex("#ff8b3d").bold("========== Two accounts get equal veFXS in different ways =========="));
		// Print the veFXS epoch
		await veFXS_instance.checkpoint({ from: accounts[9] });
		const vefxs_epoch_0 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		console.log("vefxs_epoch_0: ", vefxs_epoch_0);

		// Print before for [2]
		const vefxs_bal_2_bef = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_epoch_2_bef = new BigNumber(await veFXS_instance.user_point_epoch(ORACLE_ADDRESS)).toNumber();
		const vefxs_point_2_bef = await veFXS_instance.user_point_history(ORACLE_ADDRESS, vefxs_epoch_2_bef);
		const vefxs_slope_2_bef = new BigNumber(vefxs_point_2_bef.slope).toString();
		const vefxs_corr_info_2_bef = await frax_gauge_controller_V2.get_corrected_info(ORACLE_ADDRESS);
		const vefxs_slope_corr_2_bef = new BigNumber(vefxs_corr_info_2_bef.slope).toString();
		const vefxs_bias_2_bef = new BigNumber(vefxs_point_2_bef.bias).toString();
		console.log("veFXS balance before [2]: ", vefxs_bal_2_bef);
		console.log("veFXS slope before [2]: ", vefxs_slope_2_bef);
		console.log("veFXS slope corrected before [2]: ", vefxs_slope_corr_2_bef);
		console.log("veFXS bias before [2]: ", vefxs_bias_2_bef);

		// Print before for [3]
		const vefxs_bal_3_bef = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		const vefxs_epoch_3_bef = new BigNumber(await veFXS_instance.user_point_epoch(POOL_CREATOR)).toNumber();
		const vefxs_point_3_bef = await veFXS_instance.user_point_history(POOL_CREATOR, vefxs_epoch_3_bef);
		const vefxs_slope_3_bef = new BigNumber(vefxs_point_3_bef.slope).toString();
		const vefxs_corr_info_3_bef = await frax_gauge_controller_V2.get_corrected_info(POOL_CREATOR);
		const vefxs_slope_corr_3_bef = new BigNumber(vefxs_corr_info_3_bef.slope).toString();
		const vefxs_bias_3_bef = new BigNumber(vefxs_point_3_bef.bias).toString();
		console.log("veFXS balance before [3]: ", vefxs_bal_3_bef);
		console.log("veFXS slope before [3]: ", vefxs_slope_3_bef);
		console.log("veFXS slope corrected before [3]: ", vefxs_slope_corr_3_bef);
		console.log("veFXS bias before [3]: ", vefxs_bias_3_bef);

		// Lock for [2]: 25045 FXS for 4 years (add 45 to correct for WEEK truncating?)
		const vefxs_fxs_amt_2 = new BigNumber("25045e18");
		const veFXS_deposit_days_2 = (4 * 365); // 4 years
		let block_time_current_2 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_2 = Math.ceil(block_time_current_2 + ((veFXS_deposit_days_2 * 86400) + 1));
		await fxs_instance.approve(veFXS_instance.address, vefxs_fxs_amt_2, { from: ORACLE_ADDRESS });
		await veFXS_instance.create_lock(vefxs_fxs_amt_2, veFXS_deposit_end_timestamp_2, { from: ORACLE_ADDRESS });

		// Lock for [3]: 84210.5263158 FXS for .25 years
		const vefxs_fxs_amt_3 = new BigNumber("84210526315789473684210");
		const veFXS_deposit_days_3 = 91.25; // 91.25 days (.25 years)
		let block_time_current_3 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_3 = Math.ceil(block_time_current_3 + ((veFXS_deposit_days_3 * 86400) + 1));
		await fxs_instance.approve(veFXS_instance.address, vefxs_fxs_amt_3, { from: POOL_CREATOR });
		await veFXS_instance.create_lock(vefxs_fxs_amt_3, veFXS_deposit_end_timestamp_3, { from: POOL_CREATOR });
				
		// Print after for [2]
		const vefxs_bal_2_aft = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_epoch_2_aft = new BigNumber(await veFXS_instance.user_point_epoch(ORACLE_ADDRESS)).toNumber();
		const vefxs_point_2_aft = await veFXS_instance.user_point_history(ORACLE_ADDRESS, vefxs_epoch_2_aft);
		const vefxs_slope_2_aft = new BigNumber(vefxs_point_2_aft.slope).toString();
		const vefxs_corr_info_2_aft = await frax_gauge_controller_V2.get_corrected_info(ORACLE_ADDRESS);
		const vefxs_slope_corr_2_aft = new BigNumber(vefxs_corr_info_2_aft.slope).toString();
		const vefxs_bias_2_aft = new BigNumber(vefxs_point_2_aft.bias).toString();
		console.log("veFXS balance after [2]: ", vefxs_bal_2_aft);
		console.log("veFXS slope after [2]: ", vefxs_slope_2_aft);
		console.log("veFXS slope corrected after [2]: ", vefxs_slope_corr_2_aft);
		console.log("veFXS bias after [2]: ", vefxs_bias_2_aft);

		// Print after for [3]
		const vefxs_bal_3_aft = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		const vefxs_epoch_3_aft = new BigNumber(await veFXS_instance.user_point_epoch(POOL_CREATOR)).toNumber();
		const vefxs_point_3_aft = await veFXS_instance.user_point_history(POOL_CREATOR, vefxs_epoch_3_aft);
		const vefxs_slope_3_aft = new BigNumber(vefxs_point_3_aft.slope).toString();
		const vefxs_corr_info_3_aft = await frax_gauge_controller_V2.get_corrected_info(POOL_CREATOR);
		const vefxs_slope_corr_3_aft = new BigNumber(vefxs_corr_info_3_aft.slope).toString();
		const vefxs_bias_3_aft = new BigNumber(vefxs_point_3_aft.bias).toString();
		console.log("veFXS balance after [3]: ", vefxs_bal_3_aft);
		console.log("veFXS slope after [3]: ", vefxs_slope_3_aft);
		console.log("veFXS slope corrected after [3]: ", vefxs_slope_corr_3_aft);
		console.log("veFXS bias after [3]: ", vefxs_bias_3_aft);

		// Check to make sure they are near 100
		console.log(chalk.hex("#f3f3f3").bold("------ Quick check ------"));
		assert(vefxs_bal_2_aft >= 99000, `veFXS [2] error [too low]: ${vefxs_bal_2_aft}`);
		assert(vefxs_bal_3_aft >= 99000, `veFXS [3] error [too low]: ${vefxs_bal_3_aft}`);
		assert(vefxs_bal_2_aft <= 101000, `veFXS [2] error [too high]: ${vefxs_bal_2_aft}`);
		assert(vefxs_bal_3_aft <= 101000, `veFXS [3] error [too high]: ${vefxs_bal_3_aft}`);
		console.log("Looks ok");


		console.log(chalk.hex("#ff8b3d").bold("========== Vote for farms =========="));
		console.log(chalk.hex("#f3f3f3").bold(`------ [2] Votes all for Farm 1 only [${FAKE_FARM_1_ADDR.slice(0, 8)}] ------`));
		await frax_gauge_controller.vote_for_gauge_weights(FAKE_FARM_1_ADDR, 10000, { from: ORACLE_ADDRESS });
		await frax_gauge_controller_V2.vote_for_gauge_weights(FAKE_FARM_1_ADDR, 10000, { from: ORACLE_ADDRESS });

		console.log(chalk.hex("#f3f3f3").bold(`------ [3] Votes all for Farm 2 only [${FAKE_FARM_2_ADDR.slice(0, 8)}] ------`));
		await frax_gauge_controller.vote_for_gauge_weights(FAKE_FARM_2_ADDR, 10000, { from: POOL_CREATOR });
		await frax_gauge_controller_V2.vote_for_gauge_weights(FAKE_FARM_2_ADDR, 10000, { from: POOL_CREATOR });

		console.log(chalk.hex("#f3f3f3").bold("------------ Quick fail tests ------------"));
		console.log(chalk.blue("----- Try voting too soon [2] -----"));
		await expectRevert(
			frax_gauge_controller.vote_for_gauge_weights(FAKE_FARM_1_ADDR, 10000, { from: ORACLE_ADDRESS }),
			"Cannot vote so often"
		);
		console.log(chalk.blue("----- Try voting too soon [3] -----"));
		await expectRevert(
			frax_gauge_controller.vote_for_gauge_weights(FAKE_FARM_2_ADDR, 10000, { from: POOL_CREATOR }),
			"Cannot vote so often"
		);


		console.log(chalk.hex("#ff8b3d").bold("\n========== Move to the end of the gauge controller period =========="));
		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		const time_total_1 = await frax_gauge_controller.time_total.call();

		const increase_time_1 = (time_total_1 - current_timestamp_1);
		console.log("increase_time_1 [to gauge controller period end] (days): ", increase_time_1 / 86400);
		await time.increase(increase_time_1);
		await time.advanceBlock();

		// Print the veFXS epoch
		await veFXS_instance.checkpoint({ from: accounts[9] });
		const vefxs_epoch_1 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		console.log("vefxs_epoch_1: ", vefxs_epoch_1);

		// Print veFXS stats
		const vefxs_bal_2_1 = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_bal_3_1 = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		console.log("veFXS balance [2]: ", vefxs_bal_2_1);
		console.log("veFXS balance [3]: ", vefxs_bal_3_1);


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V1 gauges =================="));
		const current_timestamp_for_gauges = (new BigNumber(await frax_gauge_controller.time_total.call())).toNumber();
		console.log("current_timestamp_for_gauges: ", current_timestamp_for_gauges);

		const n_gauges_v1 = await frax_gauge_controller.n_gauges.call();
		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V2 gauges =================="));
		const n_gauges_v2 = await frax_gauge_controller_V2.n_gauges.call();
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller_V2.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V1 weights =================="));
		// Must be done after checkpoint the gauges
		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V2 weights =================="));
		// Must be done after checkpoint the gauges
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller_V2.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;

			// Check to make sure they are near 50%
			console.log(chalk.hex("#f3f3f3").bold("------ Quick check (should be near 50%) ------"));
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);
			assert(gauge_rel_wgt >= 49.75, `Error [too low]: ${gauge_rel_wgt}`);
			assert(gauge_rel_wgt <= 50.25, `Error [too high]: ${gauge_rel_wgt}`);
			console.log("Looks ok");
		}


		console.log(chalk.hex("#ff8b3d").bold("\n================== Advance halfway into [3]'s period =================="));
		const current_timestamp_2 = (new BigNumber(await time.latest())).toNumber();
		const user_3_end = await veFXS_instance.locked__end.call(POOL_CREATOR);

		const increase_time_2 = (user_3_end - current_timestamp_2) / 2;
		console.log("increase_time_2 [to user 3 lock end] (days): ", increase_time_2 / 86400);
		await time.increase(increase_time_2);
		await time.advanceBlock();

		// Print the veFXS epoch
		await veFXS_instance.checkpoint({ from: accounts[9] });
		const vefxs_epoch_2 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		console.log("vefxs_epoch_2: ", vefxs_epoch_2);

		// Print veFXS stats
		const vefxs_bal_2_2 = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_bal_3_2 = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		console.log("veFXS balance [2]: ", vefxs_bal_2_2);
		console.log("veFXS balance [3]: ", vefxs_bal_3_2);


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V1 gauges again =================="));
		const current_timestamp_for_gauges_2 = (new BigNumber(await frax_gauge_controller.time_total.call())).toNumber();
		console.log("current_timestamp_for_gauges_2: ", current_timestamp_for_gauges_2);

		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges_2, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V2 gauges again =================="));
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller_V2.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges_2, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V1 weights again =================="));
		// Must be done after checkpoint the gauges
		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V2 weights again =================="));
		// Must be done after checkpoint the gauges
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller_V2.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);
		}

		console.log(chalk.hex("#ff8b3d").bold("\n================== Advance 1 week and 300 sec before [3] expires =================="));
		const current_timestamp_2a = (new BigNumber(await time.latest())).toNumber();
		const user_3_end_a = await veFXS_instance.locked__end.call(POOL_CREATOR);

		const increase_time_2a = (user_3_end_a - current_timestamp_2a) - 604800 - 300;
		console.log("increase_time_2a [to user 3 lock end] (days): ", increase_time_2a / 86400);
		await time.increase(increase_time_2a);
		await time.advanceBlock();

		// Print the veFXS epoch
		await veFXS_instance.checkpoint({ from: accounts[9] });
		const vefxs_epoch_2a = new BigNumber(await veFXS_instance.epoch()).toNumber();
		console.log("vefxs_epoch_2a: ", vefxs_epoch_2a);

		// Print veFXS stats
		const vefxs_bal_2_2a = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_bal_3_2a = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		console.log("veFXS balance [2]: ", vefxs_bal_2_2a);
		console.log("veFXS balance [3]: ", vefxs_bal_3_2a);


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V1 gauges again =================="));
		const current_timestamp_for_gauges_2a = (new BigNumber(await frax_gauge_controller.time_total.call())).toNumber();
		console.log("current_timestamp_for_gauges_2a: ", current_timestamp_for_gauges_2a);

		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges_2a, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V2 gauges again =================="));
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller_V2.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges_2a, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V1 weights again =================="));
		// Must be done after checkpoint the gauges
		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V2 weights again =================="));
		// Must be done after checkpoint the gauges
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller_V2.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);
		}


		console.log(chalk.hex("#ff8b3d").bold("\n================== Advance to the end of the gauge period further into the next period =================="));
		const current_timestamp_3 = (new BigNumber(await time.latest())).toNumber();
		const time_total_3 = await frax_gauge_controller.time_total.call();

		const increase_time_3 = (time_total_3 - current_timestamp_3) + 604800 + 86400;
		console.log("increase_time_3 [to gauge period end] (days): ", increase_time_3 / 86400);
		await time.increase(increase_time_3);
		await time.advanceBlock();

		// Print the veFXS epoch
		await veFXS_instance.checkpoint({ from: accounts[9] });
		const vefxs_epoch_3 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		console.log("vefxs_epoch_3: ", vefxs_epoch_3);

		// Print veFXS stats
		const vefxs_bal_2_3 = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_bal_3_3 = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		console.log("veFXS balance [2]: ", vefxs_bal_2_3);
		console.log("veFXS balance [3]: ", vefxs_bal_3_3);


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V1 gauges a third time =================="));
		const current_timestamp_for_gauges_3 = (new BigNumber(await frax_gauge_controller.time_total.call())).toNumber();
		console.log("current_timestamp_for_gauges_3: ", current_timestamp_for_gauges_3);

		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges_3, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Checkpoint the V2 gauges a third time =================="));
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Sync the weights
			await frax_gauge_controller_V2.gauge_relative_weight_write(gauge_addr, current_timestamp_for_gauges_3, { from: accounts[9] });
			console.log(`${gauge_name} [${gauge_addr}] checkpointed`);
		}

		
		console.log(chalk.hex("#ff8b3d").bold("================== Print the V1 weights a third time =================="));
		// Must be done after checkpoint the gauges
		let v1_weights_3 = {};
		for (let j = 0; j < n_gauges_v1; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);

			// Safe the weights
			v1_weights_3[gauge_addr] = gauge_rel_wgt;
		}


		console.log(chalk.hex("#ff8b3d").bold("================== Print the V2 weights a third time =================="));
		// Must be done after checkpoint the gauges
		let v2_weights_3 = {};
		for (let j = 0; j < n_gauges_v2; j++){
			// Get the address and name
			const gauge_addr = await frax_gauge_controller_V2.gauges(j);
			const gauge_name = utilities.stakingNameFromAddress(gauge_addr);

			// Print out the gauge relative weight
			let gauge_rel_wgt = new BigNumber(await frax_gauge_controller_V2.gauge_relative_weight(gauge_addr)).div(BIG18).toNumber();
			gauge_rel_wgt *= 100;
			console.log(`${gauge_name} [${gauge_addr}]: ${gauge_rel_wgt}%`);

			// Safe the weights
			v2_weights_3[gauge_addr] = gauge_rel_wgt;
		}

		// Check final weights for V1
		console.log(chalk.hex("#f3f3f3").bold("------ Check final weights (V1) ------"));
		assert(v1_weights_3[FAKE_FARM_1_ADDR] == 100, `Farm [${FAKE_FARM_1_ADDR}] should be 100%`);
		assert(v1_weights_3[FAKE_FARM_2_ADDR] == 0, `Farm [${FAKE_FARM_2_ADDR}] should be 0%`);
		console.log("Looks ok");

		// Check final weights for V2
		console.log(chalk.hex("#f3f3f3").bold("------ Check final weights (V2) ------"));
		assert(v2_weights_3[FAKE_FARM_1_ADDR] == 100, `Farm [${FAKE_FARM_1_ADDR}] should be 100%`);
		assert(v2_weights_3[FAKE_FARM_2_ADDR] == 0, `Farm [${FAKE_FARM_2_ADDR}] should be 0%`);
		console.log("Looks ok");


		console.log(chalk.hex("#ff8b3d").bold("\n================== Check slopes and other things =================="));

		// Print before for [2]
		const vefxs_bal_2_001 = new BigNumber(await veFXS_instance.balanceOf(ORACLE_ADDRESS)).div(BIG18).toNumber();
		const vefxs_epoch_2_001 = new BigNumber(await veFXS_instance.user_point_epoch(ORACLE_ADDRESS)).toNumber();
		const vefxs_point_2_001 = await veFXS_instance.user_point_history(ORACLE_ADDRESS, vefxs_epoch_2_001);
		const vefxs_slope_2_001 = new BigNumber(vefxs_point_2_001.slope).toString();
		const vefxs_corr_info_2_001 = await frax_gauge_controller_V2.get_corrected_info(ORACLE_ADDRESS);
		const vefxs_slope_corr_2_001 = new BigNumber(vefxs_corr_info_2_001.slope).toString();
		const vefxs_bias_2_001 = new BigNumber(vefxs_point_2_001.bias).toString();
		console.log("veFXS balance [2]: ", vefxs_bal_2_001);
		console.log("veFXS slope [2]: ", vefxs_slope_2_001);
		console.log("veFXS slope corrected [2]: ", vefxs_slope_corr_2_001);
		console.log("veFXS bias [2]: ", vefxs_bias_2_001);

		// Print before for [3]
		const vefxs_bal_3_001 = new BigNumber(await veFXS_instance.balanceOf(POOL_CREATOR)).div(BIG18).toNumber();
		const vefxs_epoch_3_001 = new BigNumber(await veFXS_instance.user_point_epoch(POOL_CREATOR)).toNumber();
		const vefxs_point_3_001 = await veFXS_instance.user_point_history(POOL_CREATOR, vefxs_epoch_3_001);
		const vefxs_slope_3_001 = new BigNumber(vefxs_point_3_001.slope).toString();
		const vefxs_corr_info_3_001 = await frax_gauge_controller_V2.get_corrected_info(POOL_CREATOR);
		const vefxs_slope_corr_3_001 = new BigNumber(vefxs_corr_info_3_001.slope).toString();
		const vefxs_bias_3_001 = new BigNumber(vefxs_point_3_001.bias).toString();
		console.log("veFXS balance [3]: ", vefxs_bal_3_001);
		console.log("veFXS slope [3]: ", vefxs_slope_3_001);
		console.log("veFXS slope corrected [3]: ", vefxs_slope_corr_3_001);
		console.log("veFXS bias [3]: ", vefxs_bias_3_001);


		console.log(chalk.hex("#ff8b3d").bold("\n================== FAIL TESTS =================="));

		console.log(chalk.blue("----- Try voting with expired veFXS -----"));
		await expectRevert(
			frax_gauge_controller.vote_for_gauge_weights(FAKE_FARM_1_ADDR, 10000, { from: POOL_CREATOR }),
			"Your token lock expires too soon"
		);

		return;
	});
});