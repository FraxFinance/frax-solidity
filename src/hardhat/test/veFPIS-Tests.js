const path = require('path');
const Table = require('cli-table');
const envPath = path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// FPIS core
const FPIS = artifacts.require("FPI/FPIS");

// veFPIS
const veFPIS = artifacts.require("Curve/veFPIS");

const BIG6 = new BigNumber("1e6");
const BIG12 = new BigNumber("1e12");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";
const METAPOOL_ADDRESS = "0xC7E0ABfe4e0278af66F69C93CD3fD6810198b15B"; // hard-coded from deployment, can break

contract('veFPIS Tests', async (accounts) => {
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
	const ADDRESS_WITH_FPIS = '0x88e863d4572d2dae27db81e98837a9dbeb0e7a12';

	// Initialize core contract instances
	let fpis_instance;

	// Initialize veFPIS
	let veFPIS_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);

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

		// Fill core contract instances
		fpis_instance = await FPIS.deployed();

		// If truffle-fixture is used
		veFPIS_instance = await veFPIS.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);
	})

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FPIS]}
		);

		// Give some addresses some FPIS
		await fpis_instance.transfer(STAKING_OWNER, new BigNumber("100000e18"), { from: ADDRESS_WITH_FPIS });
		await fpis_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("100000e18"), { from: ADDRESS_WITH_FPIS });
		await fpis_instance.transfer(INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("100000e18"), { from: ADDRESS_WITH_FPIS });
		await fpis_instance.transfer(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("1000e18"), { from: ADDRESS_WITH_FPIS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FPIS]}
		);

		console.log("Move to the end of the veFPIS period");
		const current_timestamp_00 = (new BigNumber(await time.latest())).toNumber();
		const next_ts_end = (new BigNumber(await veFPIS_instance.next_period_start())).toNumber();

		const increase_time_0 = (next_ts_end - current_timestamp_00);
		console.log("increase_time_0 [to veFPIS end] (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		console.log("Checkpoint");
		await veFPIS_instance.checkpoint();
	});

	it("Tests veFPIS", async () => {

		console.log(chalk.hex("#ff8b3d").bold("=====================QUICK 4 YEAR TEST [NO INCREASES]====================="));

		// Create a new veFPIS table
		const veFPIS_table_4_years = new Table({
			head: ['Per.', 'User FPIS', 'User veFPIS', 'User Slope', 'User Bias', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 15, 17, 17, 17, 17, 15, 17, 17, 17]
		});

		const deposit_amount_quick_e18_4_yr = new BigNumber(`100e18`);
		const deposit_amount_increment_e18_4_yr = new BigNumber(`10e18`);

		const deposit_quick_days_4_yr = 4 * 365 ; // 4 years
		const LOOP_MAX_4_YR = 48 + 2;
		const INTERVAL_AMOUNT_4_YR = 30 * 86400

		let block_time_current_4_yr = (await time.latest()).toNumber();
		const deposit_quick_timestamp_4_yr = block_time_current_4_yr + ((deposit_quick_days_4_yr * 86400) + 1);
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_quick_e18_4_yr, { from: STAKING_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_quick_e18_4_yr, deposit_quick_timestamp_4_yr, { from: STAKING_OWNER });

		// await veFPIS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_4_YR} blocks and ${deposit_quick_days_4_yr} days, checkpointing each time`);
		
		for (let j = 0; j <= (LOOP_MAX_4_YR + 2); j++){
			// console.log("Loop #: ", j);

			// Withdraw at the end
			if (j == (LOOP_MAX_4_YR + 1)) {
				// Withdraw
				await veFPIS_instance.withdraw({ from: STAKING_OWNER });
				await veFPIS_instance.checkpoint();
				veFPIS_table_4_years.push(["-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL"]);
			}

			const FPIS_supply_mid_usr = new BigNumber(await veFPIS_instance.locked__amount(STAKING_OWNER)).div(BIG18).toNumber();
			const veFPIS_balance_mid_usr = parseFloat(new BigNumber(await veFPIS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber().toFixed(4));
			const last_point_usr = await veFPIS_instance.get_last_user_point(STAKING_OWNER);
			const slope_mid_usr = parseFloat(new BigNumber(last_point_usr.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_usr = parseFloat(new BigNumber(last_point_usr.bias).div(BIG18).toNumber().toFixed(4));
			const total_fpis = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
			const total_supply = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
			const last_point_ttl = await veFPIS_instance.get_last_point();
			const slope_mid_ttl = parseFloat(new BigNumber(last_point_ttl.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_ttl = parseFloat(new BigNumber(last_point_ttl.bias).div(BIG18).toNumber().toFixed(4));
			const fpis_amt_mid_ttl = parseFloat(new BigNumber(last_point_ttl.fpis_amt).div(BIG18).toNumber().toFixed(4));
			veFPIS_table_4_years.push([j, FPIS_supply_mid_usr, veFPIS_balance_mid_usr, slope_mid_usr, bias_mid_usr, total_fpis, total_supply, slope_mid_ttl, bias_mid_ttl, fpis_amt_mid_ttl]);

			await time.increase(INTERVAL_AMOUNT_4_YR);
			await time.advanceBlock();
			await veFPIS_instance.checkpoint();

			// await fpis_instance.approve(veFPIS_instance.address, deposit_amount_increment_e18_4_yr, { from: STAKING_OWNER });
			// await veFPIS_instance.increase_amount(deposit_amount_increment_e18_4_yr, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 FPIS"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_4_yr} days / 4 years`));
		console.log(veFPIS_table_4_years.toString());


		console.log(chalk.hex("#ff8b3d").bold("=====================QUICK 4 YEAR TEST [HAS PROXY LOANS]====================="));
		// Allow the proxy
		await veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: DEPLOYER_ADDRESS });
		await veFPIS_instance.stakerSetProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: STAKING_OWNER });

		// Create a new veFPIS table
		const veFPIS_table_4_years_PXY_TX_TO = new Table({
			head: ['Per.', 'User FPIS', 'User veFPIS', 'User Slope', 'User Bias', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 15, 17, 17, 17, 17, 15, 17, 17, 17]
		});

		const deposit_amount_quick_e18_4_yr_PXY_TX_TO = new BigNumber(`100e18`);
		const deposit_amount_withdraw_increment_e18_4_yr_PXY_TX_TO = new BigNumber(`10e18`);

		const deposit_quick_days_4_yr_PXY_TX_TO = 4 * 365 ; // 4 years
		const LOOP_MAX_4_YR_PXY_TX_TO = 54; // Should end after 48.67 Loops
		const INTERVAL_AMOUNT_4_YR_PXY_TX_TO = 30 * 86400 // 30 day increments

		let block_time_current_4_yr_PXY_TX_TO = (await time.latest()).toNumber();
		const deposit_quick_timestamp_4_yr_PXY_TX_TO = block_time_current_4_yr_PXY_TX_TO + ((deposit_quick_days_4_yr_PXY_TX_TO * 86400) + 1);
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_quick_e18_4_yr_PXY_TX_TO, { from: STAKING_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_quick_e18_4_yr_PXY_TX_TO, deposit_quick_timestamp_4_yr_PXY_TX_TO, { from: STAKING_OWNER });

		// await veFPIS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_4_YR_PXY_TX_TO} blocks and ${deposit_quick_days_4_yr_PXY_TX_TO} days, checkpointing each time`);
		
		for (let j = 0; j <= (LOOP_MAX_4_YR_PXY_TX_TO); j++){
			// console.log("Loop #: ", j);

			// Proxy transfer every 10 instances, skipping the first
			if ((((j + 1) % 10) == 0) && (j < (LOOP_MAX_4_YR_PXY_TX_TO - 10))) {
				console.log(`In loop #${j}`);
				// Transfer
				console.log(chalk.yellow("STAKER TRANSFERS TO PROXY"));
				await veFPIS_instance.transfer_to_proxy(STAKING_OWNER, deposit_amount_withdraw_increment_e18_4_yr_PXY_TX_TO, { from: GOVERNOR_GUARDIAN_ADDRESS })
				veFPIS_table_4_years_PXY_TX_TO.push(["-", "PXY TX", "-", "PXY TX", "-", "PXY TX", "-", "PXY TX", "-", "PXY TX"]);
				await veFPIS_instance.checkpoint();
			}

			// Payback first half before the end (50% of original amt borrowed)
			if (j == (45)) {
				// Get the amount of FPIS borrowed
				const user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER)).multipliedBy(0.5);

				// Pay Back too
				console.log(chalk.yellow("PROXY PAYS BACK HALF"));
				await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, user_fpis_in_proxy_bn, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS })

				veFPIS_table_4_years_PXY_TX_TO.push(["-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK"]);
			}

			if (j == (49)) {
				veFPIS_table_4_years_PXY_TX_TO.push(["-", "EXPIRY", "-", "EXPIRY", "-", "EXPIRY", "-", "EXPIRY", "-", "EXPIRY"]);
			}

			// Payback half of the remaining, after expiry (25% of original amt borrowed)
			if (j == (50)) {
				// Get the half of the remaining amount of FPIS borrowed
				const user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER)).multipliedBy(0.5);

				// Pay Back too
				console.log(chalk.yellow("PROXY PAYS BACK HALF OF LEFTOVER (25% OF ORIG BORROW AMOUNT)"));
				await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, user_fpis_in_proxy_bn, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS })

				veFPIS_table_4_years_PXY_TX_TO.push(["-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK"]);
			}

			// Payback all the remaining, after expiry (25% of original amt borrowed)
			if (j == (51)) {
				// Get the amount of FPIS borrowed
				const user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER));

				// Pay Back too
				console.log(chalk.yellow("PROXY PAYS BACK REMAINDER (25% OF ORIG BORROW AMOUNT)"));
				await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, user_fpis_in_proxy_bn, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS })

				veFPIS_table_4_years_PXY_TX_TO.push(["-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK", "-", "PXY PYBCK"]);
			}

			// Withdraw at the end
			if (j == (LOOP_MAX_4_YR_PXY_TX_TO - 1)) {

				// Withdraw
				await veFPIS_instance.withdraw({ from: STAKING_OWNER });
				await veFPIS_instance.checkpoint();
				veFPIS_table_4_years_PXY_TX_TO.push(["-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL"]);
			}

			const FPIS_supply_mid_usr = new BigNumber(await veFPIS_instance.locked__amount(STAKING_OWNER)).div(BIG18).toNumber();
			const veFPIS_balance_mid_usr = parseFloat(new BigNumber(await veFPIS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber().toFixed(4));
			const last_point_usr = await veFPIS_instance.get_last_user_point(STAKING_OWNER);
			const slope_mid_usr = parseFloat(new BigNumber(last_point_usr.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_usr = parseFloat(new BigNumber(last_point_usr.bias).div(BIG18).toNumber().toFixed(4));
			const total_fpis = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
			const total_supply = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
			const last_point_ttl = await veFPIS_instance.get_last_point();
			const slope_mid_ttl = parseFloat(new BigNumber(last_point_ttl.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_ttl = parseFloat(new BigNumber(last_point_ttl.bias).div(BIG18).toNumber().toFixed(4));
			const fpis_amt_mid_ttl = parseFloat(new BigNumber(last_point_ttl.fpis_amt).div(BIG18).toNumber().toFixed(4));
			veFPIS_table_4_years_PXY_TX_TO.push([j, FPIS_supply_mid_usr, veFPIS_balance_mid_usr, slope_mid_usr, bias_mid_usr, total_fpis, total_supply, slope_mid_ttl, bias_mid_ttl, fpis_amt_mid_ttl]);

			await time.increase(INTERVAL_AMOUNT_4_YR_PXY_TX_TO);
			await time.advanceBlock();
			await veFPIS_instance.checkpoint();

			// await fpis_instance.approve(veFPIS_instance.address, deposit_amount_increment_e18_4_yr_PXY_TX_TO, { from: STAKING_OWNER });
			// await veFPIS_instance.increase_amount(deposit_amount_increment_e18_4_yr_PXY_TX_TO, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 FPIS, WHITELISTED WITHDRAW MIDWAY THROUGH"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_4_yr_PXY_TX_TO} days / 4 years`));
		console.log(veFPIS_table_4_years_PXY_TX_TO.toString());

		// Disallow the proxy
		await veFPIS_instance.stakerSetProxy(ZERO_ADDRESS, { from: STAKING_OWNER });
		await veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: DEPLOYER_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("=====================QUICK 4 YEAR TEST [HAS PROXY LOANS + LIQUIDATIONS]====================="));
		// Allow the proxy
		await veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: DEPLOYER_ADDRESS });
		await veFPIS_instance.stakerSetProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: STAKING_OWNER });

		// Create a new veFPIS table
		const veFPIS_table_4_years_PXY_TX_AND_LIQ = new Table({
			head: ['Per.', 'User FPIS', 'User veFPIS', 'User Slope', 'User Bias', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 15, 17, 17, 17, 17, 15, 17, 17, 17]
		});

		const deposit_amount_quick_e18_4_yr_PXY_TX_AND_LIQ = new BigNumber(`1000e18`);
		const deposit_amount_withdraw_increment_e18_4_yr_PXY_TX_AND_LIQ = new BigNumber(`100e18`);
		const deposit_amount_liq_e18_4_yr_PXY_TX_AND_LIQ = new BigNumber(`100e18`);

		const deposit_quick_days_4_yr_PXY_TX_AND_LIQ = 4 * 365 ; // 4 years
		const LOOP_MAX_4_YR_PXY_TX_AND_LIQ = 54; // Should end after 48.67 Loops
		const INTERVAL_AMOUNT_4_YR_PXY_TX_AND_LIQ = 30 * 86400 // 30 day increments

		let block_time_current_4_yr_PXY_TX_AND_LIQ = (await time.latest()).toNumber();
		const deposit_quick_timestamp_4_yr_PXY_TX_AND_LIQ = block_time_current_4_yr_PXY_TX_AND_LIQ + ((deposit_quick_days_4_yr_PXY_TX_AND_LIQ * 86400) + 1);
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_quick_e18_4_yr_PXY_TX_AND_LIQ, { from: STAKING_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_quick_e18_4_yr_PXY_TX_AND_LIQ, deposit_quick_timestamp_4_yr_PXY_TX_AND_LIQ, { from: STAKING_OWNER });

		// await veFPIS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_4_YR_PXY_TX_AND_LIQ} blocks and ${deposit_quick_days_4_yr_PXY_TX_AND_LIQ} days, checkpointing each time`);
		
		for (let j = 0; j <= (LOOP_MAX_4_YR_PXY_TX_AND_LIQ); j++){
			// console.log("Loop #: ", j);

			// Proxy transfer once, at week 6
			if (j == 6) {
				console.log(`In loop #${j}`);
				// Transfer
				await veFPIS_instance.transfer_to_proxy(STAKING_OWNER, deposit_amount_withdraw_increment_e18_4_yr_PXY_TX_AND_LIQ, { from: GOVERNOR_GUARDIAN_ADDRESS })
				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "PXY TX", "-", "PXY TX", "-", "PXY TX", "-", "PXY TX", "-", "PXY TX"]);
				await veFPIS_instance.checkpoint();
			}

			// Liquidate every 10 instances, skipping the first
			// 10% fee
			if ((((j + 1) % 10) == 0) && (j < (LOOP_MAX_4_YR_PXY_TX_AND_LIQ - 10))) {
				console.log(`In loop #${j}`);
				// Liquidate
				const liq_fee = new BigNumber(0); // deposit_amount_liq_e18_4_yr_PXY_TX_AND_LIQ.multipliedBy(0.1);
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, deposit_amount_liq_e18_4_yr_PXY_TX_AND_LIQ, liq_fee, false, { from: GOVERNOR_GUARDIAN_ADDRESS })
				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "PXY LIQ", "-", "PXY LIQ", "-", "PXY LIQ", "-", "PXY LIQ", "-", "PXY LIQ"]);
				await veFPIS_instance.checkpoint();
			}

			// Payback first half before the end (50% of borrow)
			if (j == 45) {
				// Get the amount of FPIS borrowed
				let user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER));
				user_fpis_in_proxy_bn = user_fpis_in_proxy_bn.multipliedBy(0.5);

				// Pay Back
				console.log(chalk.yellow("PROXY PAYS BACK HALF [NOT LIQUIDATION]"));
				await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, user_fpis_in_proxy_bn, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS })

				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "PXY PYBK 1/2", "-", "PXY PYBK 1/2", "-", "PXY PYBK 1/2", "-", "PXY PYBK 1/2", "-", "PXY PYBK 1/2"]);
			}

			if (j == (49)) {
				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "EXPIRY", "-", "EXPIRY", "-", "EXPIRY", "-", "EXPIRY", "-", "EXPIRY"]);
			}

			// Liquidate half after the end (25% of borrow)
			if (j == (50)) {
				// Get the amount of FPIS borrowed
				let user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER));
				user_fpis_in_proxy_bn = user_fpis_in_proxy_bn.multipliedBy(0.5);
				const liq_fee = user_fpis_in_proxy_bn.multipliedBy(0.1);

				// Liquidate
				console.log(chalk.yellow("PROXY LIQUIDATES HALF OF REMAINING"));
				await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, user_fpis_in_proxy_bn, liq_fee, true, { from: GOVERNOR_GUARDIAN_ADDRESS })
				
				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "PXY LIQ 1/4", "-", "PXY LIQ 1/4", "-", "PXY LIQ 1/4", "-", "PXY LIQ 1/4", "-", "PXY LIQ 1/4"]);
			}

			// Liquidate leftovers after the end (25% of borrow)
			if (j == (51)) {
				// Get the amount of FPIS borrowed
				let user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER));
				user_fpis_in_proxy_bn = user_fpis_in_proxy_bn;
				const liq_fee = user_fpis_in_proxy_bn.multipliedBy(0.1);

				// Liquidate
				console.log(chalk.yellow("PROXY LIQUIDATES LEFTOVERS"));
				await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
				await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, user_fpis_in_proxy_bn, liq_fee, true, { from: GOVERNOR_GUARDIAN_ADDRESS })

				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "PXY LIQ RMNDR", "-", "PXY LIQ RMNDR", "-", "PXY LIQ RMNDR", "-", "PXY LIQ RMNDR", "-", "PXY LIQ RMNDR"]);
			}

			// Withdraw at the end
			if (j == (LOOP_MAX_4_YR_PXY_TX_AND_LIQ)) {

				// Withdraw
				await veFPIS_instance.withdraw({ from: STAKING_OWNER });
				await veFPIS_instance.checkpoint();
				veFPIS_table_4_years_PXY_TX_AND_LIQ.push(["-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL"]);
			}

			const FPIS_supply_mid_usr = new BigNumber(await veFPIS_instance.locked__amount(STAKING_OWNER)).div(BIG18).toNumber();
			const veFPIS_balance_mid_usr = parseFloat(new BigNumber(await veFPIS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber().toFixed(4));
			const last_point_usr = await veFPIS_instance.get_last_user_point(STAKING_OWNER);
			const slope_mid_usr = parseFloat(new BigNumber(last_point_usr.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_usr = parseFloat(new BigNumber(last_point_usr.bias).div(BIG18).toNumber().toFixed(4));
			const total_fpis = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
			const total_supply = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
			const last_point_ttl = await veFPIS_instance.get_last_point();
			const slope_mid_ttl = parseFloat(new BigNumber(last_point_ttl.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_ttl = parseFloat(new BigNumber(last_point_ttl.bias).div(BIG18).toNumber().toFixed(4));
			const fpis_amt_mid_ttl = parseFloat(new BigNumber(last_point_ttl.fpis_amt).div(BIG18).toNumber().toFixed(4));
			veFPIS_table_4_years_PXY_TX_AND_LIQ.push([j, FPIS_supply_mid_usr, veFPIS_balance_mid_usr, slope_mid_usr, bias_mid_usr, total_fpis, total_supply, slope_mid_ttl, bias_mid_ttl, fpis_amt_mid_ttl]);

			await time.increase(INTERVAL_AMOUNT_4_YR_PXY_TX_AND_LIQ);
			await time.advanceBlock();
			await veFPIS_instance.checkpoint();

			// await fpis_instance.approve(veFPIS_instance.address, deposit_amount_increment_e18_4_yr_PXY_TX_AND_LIQ, { from: STAKING_OWNER });
			// await veFPIS_instance.increase_amount(deposit_amount_increment_e18_4_yr_PXY_TX_AND_LIQ, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 FPIS, WHITELISTED WITHDRAW MIDWAY THROUGH"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_4_yr_PXY_TX_AND_LIQ} days / 4 years`));
		console.log(veFPIS_table_4_years_PXY_TX_AND_LIQ.toString());

		// Disallow the proxy
		await veFPIS_instance.stakerSetProxy(ZERO_ADDRESS, { from: STAKING_OWNER });
		await veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: DEPLOYER_ADDRESS });



		console.log(chalk.hex("#ff8b3d").bold("=====================QUICK 4 YEAR TEST [DOUBLE STAKERS]====================="));

		// Create a new veFPIS table
		const veFPIS_table_4_years_2stkrs = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		const deposit_amount_quick_e18_4_yr_2stkrs = new BigNumber(`100e18`);
		const deposit_amount_increment_e18_4_yr_2stkrs = new BigNumber(`10e18`);

		const deposit_quick_days_4_yr_2stkrs = 4 * 365 ; // 4 years
		const LOOP_MAX_4_YR_2stkrs = 48 + 2;
		const INTERVAL_AMOUNT_4_YR_2stkrs = 30 * 86400

		let block_time_current_4_yr_2stkrs = (await time.latest()).toNumber();
		const deposit_quick_timestamp_4_yr_2stkrs = block_time_current_4_yr_2stkrs + ((deposit_quick_days_4_yr_2stkrs * 86400) + 1);
		
		// STAKING_OWNER Stakes
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_quick_e18_4_yr_2stkrs, { from: STAKING_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_quick_e18_4_yr_2stkrs, deposit_quick_timestamp_4_yr_2stkrs, { from: STAKING_OWNER });

		// INVESTOR_CUSTODIAN_ADDRESS Stakes
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_quick_e18_4_yr_2stkrs, { from: INVESTOR_CUSTODIAN_ADDRESS });
		await veFPIS_instance.create_lock(deposit_amount_quick_e18_4_yr_2stkrs, deposit_quick_timestamp_4_yr_2stkrs, { from: INVESTOR_CUSTODIAN_ADDRESS });
		
		console.log(`Advance ${LOOP_MAX_4_YR_2stkrs} blocks and ${deposit_quick_days_4_yr_2stkrs} days, checkpointing each time`);
		
		for (let j = 0; j <= (LOOP_MAX_4_YR_2stkrs + 2); j++){
			// console.log("Loop #: ", j);

			// Withdraw at the end
			if (j == (LOOP_MAX_4_YR_2stkrs + 1)) {
				// Withdraw
				await veFPIS_instance.withdraw({ from: STAKING_OWNER });
				await veFPIS_instance.withdraw({ from: INVESTOR_CUSTODIAN_ADDRESS });
				await veFPIS_instance.checkpoint();
				veFPIS_table_4_years_2stkrs.push(["-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL"]);
			}

			const total_fpis = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
			const total_supply = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
			const last_point_ttl = await veFPIS_instance.get_last_point();
			const slope_mid_ttl = parseFloat(new BigNumber(last_point_ttl.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_ttl = parseFloat(new BigNumber(last_point_ttl.bias).div(BIG18).toNumber().toFixed(4));
			const fpis_amt_mid_ttl = parseFloat(new BigNumber(last_point_ttl.fpis_amt).div(BIG18).toNumber().toFixed(4));
			veFPIS_table_4_years_2stkrs.push([j, total_fpis, total_supply, slope_mid_ttl, bias_mid_ttl, fpis_amt_mid_ttl]);

			await time.increase(INTERVAL_AMOUNT_4_YR_2stkrs);
			await time.advanceBlock();
			await veFPIS_instance.checkpoint();

		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 FPIS EACH"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_4_yr_2stkrs} days / 4 years`));
		console.log(veFPIS_table_4_years_2stkrs.toString());


		console.log(chalk.hex("#ff8b3d").bold("=====================QUICK 30 DAY TEST [NO INCREASES]====================="));
		// Checkpoint
		await veFPIS_instance.checkpoint();

		// Create a new veFPIS table
		const veFPIS_table_30_day = new Table({
			head: ['Per.', 'User FPIS', 'User veFPIS', 'User Slope', 'User Bias', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 15, 17, 17, 17, 17, 15, 17, 17, 17]
		});

		const deposit_amount_quick_e18_30_days = new BigNumber(`1000e18`);
		const deposit_amount_increment_e18_30_days = new BigNumber(`10e18`);

		const deposit_quick_days_30_days = 30; // 1 month
		const LOOP_MAX_30_DAYS = 30 + 8;
		const INTERVAL_AMOUNT_30_DAYS = 1 * 86400
		
		let block_time_current_30_days_0 = (await time.latest()).toNumber();
		const deposit_quick_timestamp_30_days_0 = block_time_current_30_days_0 + ((deposit_quick_days_30_days * 86400) + 1);
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_quick_e18_30_days, { from: STAKING_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_quick_e18_30_days, deposit_quick_timestamp_30_days_0, { from: STAKING_OWNER });

		// await veFPIS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_30_DAYS} blocks and ${deposit_quick_days_30_days} days, checkpointing each time`);
		
		for (let j = 0; j <= (LOOP_MAX_30_DAYS + 2); j++){
			// console.log("Loop #: ", j);

			// Withdraw at the end
			if (j == (LOOP_MAX_30_DAYS + 1)) {
				// Withdraw
				await veFPIS_instance.withdraw({ from: STAKING_OWNER });
				await veFPIS_instance.checkpoint();
				veFPIS_table_30_day.push(["-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL", "-", "WITHDRAWAL"]);
			}

			const FPIS_supply_mid_usr = new BigNumber(await veFPIS_instance.locked__amount(STAKING_OWNER)).div(BIG18).toNumber();
			const veFPIS_balance_mid_usr = parseFloat(new BigNumber(await veFPIS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber().toFixed(4));
			const last_point_usr = await veFPIS_instance.get_last_user_point(STAKING_OWNER);
			const slope_mid_usr = parseFloat(new BigNumber(last_point_usr.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_usr = parseFloat(new BigNumber(last_point_usr.bias).div(BIG18).toNumber().toFixed(4));
			const total_fpis = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
			const total_supply = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
			const last_point_ttl = await veFPIS_instance.get_last_point();
			const slope_mid_ttl = parseFloat(new BigNumber(last_point_ttl.slope).div(BIG18).toNumber().toFixed(10));
			const bias_mid_ttl = parseFloat(new BigNumber(last_point_ttl.bias).div(BIG18).toNumber().toFixed(4));
			const fpis_amt_mid_ttl = parseFloat(new BigNumber(last_point_ttl.fpis_amt).div(BIG18).toNumber().toFixed(4));
			veFPIS_table_30_day.push([j, FPIS_supply_mid_usr, veFPIS_balance_mid_usr, slope_mid_usr, bias_mid_usr, total_fpis, total_supply, slope_mid_ttl, bias_mid_ttl, fpis_amt_mid_ttl]);

			await time.increase(INTERVAL_AMOUNT_30_DAYS);
			await time.advanceBlock();
			await veFPIS_instance.checkpoint();

			// await fpis_instance.approve(veFPIS_instance.address, deposit_amount_increment_e18, { from: STAKING_OWNER });
			// await veFPIS_instance.increase_amount(deposit_amount_increment_e18, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 1000 FPIS"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_30_days} days / 4 years`));
		console.log(veFPIS_table_30_day.toString());


		console.log(chalk.hex("#ff8b3d").bold("=====================DEPOSIT FPIS====================="));
		console.log(chalk.hex("#6fa8dc")("Get veFPIS balances before"));
		const pre_deposit_veFPIS_1 = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const pre_deposit_veFPIS_8 = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("pre_deposit_veFPIS [1]:", pre_deposit_veFPIS_1);
		console.log("pre_deposit_veFPIS [8]:", pre_deposit_veFPIS_8);

		const deposit_amount = 1000;
		const deposit_amount_e18 = new BigNumber(`${deposit_amount}e18`);
		const deposit_days = 488;
		console.log(chalk.hex("#6fa8dc")(`Deposit ${deposit_amount} FPIS for ${deposit_days} days`));
		console.log(chalk.hex("#6fa8dc")(`Once for COLLATERAL_FRAX_AND_FXS_OWNER, another for INVESTOR_CUSTODIAN_ADDRESS`));
		block_time_current = (await time.latest()).toNumber();
		let staking_end_time = block_time_current + ((deposit_days * 86400) + 1);
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_e18, { from: INVESTOR_CUSTODIAN_ADDRESS });
		await veFPIS_instance.create_lock(deposit_amount_e18, staking_end_time, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPIS_instance.create_lock(deposit_amount_e18, staking_end_time, { from: INVESTOR_CUSTODIAN_ADDRESS });

		console.log(chalk.hex("#6fa8dc")("Get veFPIS balances after"));
		const post_deposit_veFPIS_1 = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const post_deposit_veFPIS_8 = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("post_deposit_veFPIS [1]:", post_deposit_veFPIS_1);
		console.log("post_deposit_veFPIS [8]:", post_deposit_veFPIS_8);
		console.log(`effective multiplier [1]: ${post_deposit_veFPIS_1 / deposit_amount}x`);
		console.log(`effective multiplier [8]: ${post_deposit_veFPIS_8 / deposit_amount}x`);
		assert(post_deposit_veFPIS_1 > pre_deposit_veFPIS_1, 'Should have increased the veFPIS');
		assert(post_deposit_veFPIS_8 > pre_deposit_veFPIS_8, 'Should have increased the veFPIS');

		// Create a new quick table
		const quick_table_0 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick0 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick0 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick0 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick0 = parseFloat(new BigNumber(last_point_ttl_quick0.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick0 = parseFloat(new BigNumber(last_point_ttl_quick0.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick0 = parseFloat(new BigNumber(last_point_ttl_quick0.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_0.push([0, total_fpis_quick0, total_veFPIS_quick0, slope_mid_ttl_quick0, bias_mid_ttl_quick0, fpis_amt_mid_ttl_quick0]);
		console.log(quick_table_0.toString());
		expect(post_deposit_veFPIS_1 + post_deposit_veFPIS_8).to.be.closeTo(total_veFPIS_quick0, total_veFPIS_quick0 * .01, "veFPIS sums do not match total");


		console.log(chalk.hex("#ff8b3d").bold("=====================[1] ADDS SOME MORE FPIS====================="));
		// Move up 1 second
		await time.increase(1);
		await time.advanceBlock();

		const deposit_amount_2 = 100;
		const deposit_amount_2_e18 = new BigNumber(`${deposit_amount_2}e18`);

		console.log(chalk.hex("#6fa8dc")(`[1] Adds ${deposit_amount_2} more FPIS`));
		await fpis_instance.approve(veFPIS_instance.address, deposit_amount_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFPIS_instance.increase_amount(deposit_amount_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const veFPIS_1_after_adding_more = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFPIS_8_after_not_adding_more = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("veFPIS balance after adding more [1]:", veFPIS_1_after_adding_more);
		console.log("veFPIS balance [didn't add more] [8]:", veFPIS_8_after_not_adding_more);

		// Create a new quick table
		const quick_table_1 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick1 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick1 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick1 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick1 = parseFloat(new BigNumber(last_point_ttl_quick1.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick1 = parseFloat(new BigNumber(last_point_ttl_quick1.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick1 = parseFloat(new BigNumber(last_point_ttl_quick1.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_1.push([0, total_fpis_quick1, total_veFPIS_quick1, slope_mid_ttl_quick1, bias_mid_ttl_quick1, fpis_amt_mid_ttl_quick1]);
		console.log(quick_table_1.toString());
		expect(veFPIS_1_after_adding_more + veFPIS_8_after_not_adding_more).to.be.closeTo(total_veFPIS_quick1, total_veFPIS_quick1 * .01, "veFPIS sums do not match total");


		console.log(chalk.hex("#ff8b3d").bold("=====================[1] INCREASES THE TIME OF THE LOCK BY 3 WEEKS====================="));
		// Move up 1 second
		await time.increase(1);
		await time.advanceBlock();

		const user_lock = await veFPIS_instance.locked(COLLATERAL_FRAX_AND_FXS_OWNER);
		const lock_extension_new_timestamp = (new BigNumber(user_lock.end).toNumber()) + ((3 * 7 * 86400) + 1); // add 3 weeks

		const veFPIS_1_before_lock_extension = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFPIS_8_before_lock_extension = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("veFPIS balance before extending the lock [1]:", veFPIS_1_before_lock_extension);
		console.log("veFPIS balance [didn't extend] [8]:", veFPIS_8_before_lock_extension);

		console.log(chalk.hex("#6fa8dc")(`[1] Extends the lock to ${lock_extension_new_timestamp} timestamp`));
		await veFPIS_instance.increase_unlock_time(lock_extension_new_timestamp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const veFPIS_1_after_lock_extension = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFPIS_8_after_lock_extension = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		const FPIS_1_after_lock_extension = new BigNumber(await veFPIS_instance.locked__amount(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const FPIS_8_after_lock_extension = new BigNumber(await veFPIS_instance.locked__amount(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("veFPIS balance after extending the lock [1]:", veFPIS_1_after_lock_extension);
		console.log("veFPIS balance [didn't extend] [8]:", veFPIS_8_after_lock_extension);
		console.log("veFPIS change [1]:", veFPIS_1_after_lock_extension - veFPIS_1_before_lock_extension);
		assert(veFPIS_1_after_lock_extension > veFPIS_1_before_lock_extension, 'Should have increased the veFPIS');

		const veFPIS_epoch_0 = new BigNumber(await veFPIS_instance.epoch()).toNumber();
		const veFPIS_total_veFPIS_0 = new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber();
		const veFPIS_total_FPIS_0 = new BigNumber(await veFPIS_instance.supply()).div(BIG18).toNumber();
		
		console.log("veFPIS_epoch_0:", veFPIS_epoch_0);
		console.log("veFPIS_total_veFPIS:", veFPIS_total_veFPIS_0);
		console.log("veFPIS_total_FPIS:", veFPIS_total_FPIS_0);
		await utilities.printVeFPIS_Points(veFPIS_instance, veFPIS_epoch_0, COLLATERAL_FRAX_AND_FXS_OWNER);
		expect(veFPIS_1_after_lock_extension + veFPIS_8_after_lock_extension).to.be.closeTo(veFPIS_total_veFPIS_0, veFPIS_total_veFPIS_0 * .01, "veFPIS sums do not match total");
		expect(FPIS_1_after_lock_extension + FPIS_8_after_lock_extension).to.be.closeTo(veFPIS_total_FPIS_0, veFPIS_total_FPIS_0 * .01, "FPIS sums do not match total");

		// Create a new quick table
		const quick_table_2 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick2 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick2 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick2 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick2 = parseFloat(new BigNumber(last_point_ttl_quick2.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick2 = parseFloat(new BigNumber(last_point_ttl_quick2.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick2 = parseFloat(new BigNumber(last_point_ttl_quick2.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_2.push([0, total_fpis_quick2, total_veFPIS_quick2, slope_mid_ttl_quick2, bias_mid_ttl_quick2, fpis_amt_mid_ttl_quick2]);
		console.log(quick_table_2.toString());


		console.log(chalk.hex("#ff8b3d").bold("=====================TRY TO EXTEND A SHORTER AMOUNT (SHOULD FAIL)====================="));
		await expectRevert.unspecified(veFPIS_instance.increase_unlock_time(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));


		console.log(chalk.hex("#ff8b3d").bold("=====================TRY TO UNLOCK EARLY (SHOULD FAIL)====================="));
		console.log(chalk.hex("#6fa8dc")("Move up 30 days"));
		await time.increase((30 * 86400) + 1);
		await time.advanceBlock();

		console.log(chalk.hex("#6fa8dc")("Try to withdraw early (should fail)"));
		await expectRevert.unspecified(veFPIS_instance.withdraw({ from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		// Create a new quick table
		const quick_table_2a = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick2a = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick2a = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick2a = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick2a = parseFloat(new BigNumber(last_point_ttl_quick2a.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick2a = parseFloat(new BigNumber(last_point_ttl_quick2a.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick2a = parseFloat(new BigNumber(last_point_ttl_quick2a.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_2a.push([0, total_fpis_quick2a, total_veFPIS_quick2a, slope_mid_ttl_quick2a, bias_mid_ttl_quick2a, fpis_amt_mid_ttl_quick2a]);
		console.log(quick_table_2a.toString());


		console.log(chalk.hex("#ff8b3d").bold("=====================TRY TO UNLOCK EARLY (EMERGENCY UNLOCK ACTIVE)====================="));
		// Toggle the emergency unlock on
		await veFPIS_instance.toggleEmergencyUnlock({ from: DEPLOYER_ADDRESS });

		console.log(chalk.hex("#6fa8dc")("Get FPIS and veFPIS balances before"));
		
		const pre_withdrawal_FPIS_2_1 = new BigNumber(await fpis_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const pre_withdrawal_veFPIS_2_1 = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const pre_withdrawal_FPIS_2_8 = new BigNumber(await fpis_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		const pre_withdrawal_veFPIS_2_8 = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("Pre-Withdrawal Wallet FPIS [1]:", pre_withdrawal_FPIS_2_1);
		console.log("Pre-Withdrawal veFPIS [1]:", pre_withdrawal_veFPIS_2_1);
		console.log("Pre-Withdrawal Wallet FPIS [8]:", pre_withdrawal_FPIS_2_8);
		console.log("Pre-Withdrawal veFPIS [8]:", pre_withdrawal_veFPIS_2_8);

		console.log(chalk.hex("#6fa8dc")("Try to withdraw early (with the emergency unlock active)"));
		await veFPIS_instance.withdraw({ from: INVESTOR_CUSTODIAN_ADDRESS });

		console.log(chalk.hex("#6fa8dc")("Get FPIS and veFPIS balances after"));
		const post_withdrawal_FPIS_2_1 = new BigNumber(await fpis_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const post_withdrawal_veFPIS_2_1 = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const post_withdrawal_FPIS_2_8 = new BigNumber(await fpis_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		const post_withdrawal_veFPIS_2_8 = new BigNumber(await veFPIS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();

		console.log(`Post-Withdrawal Wallet FPIS [1]: ${post_withdrawal_FPIS_2_1} (change: ${post_withdrawal_FPIS_2_1 - pre_withdrawal_FPIS_2_1})`);
		console.log(`Post-Withdrawal veFPIS [1]: ${post_withdrawal_veFPIS_2_1} (change: ${post_withdrawal_veFPIS_2_1 - pre_withdrawal_veFPIS_2_1})`);
		console.log(`Post-Withdrawal Wallet FPIS [8]: ${post_withdrawal_FPIS_2_8} (change: ${post_withdrawal_FPIS_2_8 - pre_withdrawal_FPIS_2_8})`);
		console.log(`Post-Withdrawal veFPIS [8]: ${post_withdrawal_veFPIS_2_8} (change: ${post_withdrawal_veFPIS_2_8 - pre_withdrawal_veFPIS_2_8})`);
		console.log(`Post-Withdrawal Combined veFPIS Sum: ${post_withdrawal_veFPIS_2_1 + post_withdrawal_veFPIS_2_8}`);
		expect(post_withdrawal_FPIS_2_8 - pre_withdrawal_FPIS_2_8).to.equal(deposit_amount, "Withdrawal FPIS amount should be the same as the deposit amount");
		expect(post_withdrawal_veFPIS_2_8).to.equal(0, "veFPIS should now be zero");

		// Get the time left
		const curr_ts_post_withdrawal = (new BigNumber(await time.latest())).toNumber();
		const end_ts_1_post_withdrawal = (new BigNumber(await veFPIS_instance.locked__end(COLLATERAL_FRAX_AND_FXS_OWNER))).toNumber();
		const timeleft_1_post_withdrawal = (end_ts_1_post_withdrawal - curr_ts_post_withdrawal);
		console.log("Time left to [1]'s end (secs): ", timeleft_1_post_withdrawal);

		// Create a new quick table
		const quick_table_2b = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick2b = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick2b = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick2b = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick2b = parseFloat(new BigNumber(last_point_ttl_quick2b.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick2b = parseFloat(new BigNumber(last_point_ttl_quick2b.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick2b = parseFloat(new BigNumber(last_point_ttl_quick2b.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_2b.push([0, total_fpis_quick2b, total_veFPIS_quick2b, slope_mid_ttl_quick2b, bias_mid_ttl_quick2b, fpis_amt_mid_ttl_quick2b]);
		console.log(quick_table_2b.toString());
		expect(post_withdrawal_veFPIS_2_1 + post_withdrawal_veFPIS_2_8).to.be.closeTo(total_veFPIS_quick2b, total_veFPIS_quick2b * .01, "veFPIS sum does not match total");

		// Toggle the emergency unlock off
		await veFPIS_instance.toggleEmergencyUnlock({ from: DEPLOYER_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("=====================TRY TO UNLOCK EARLY (SHOULD FAIL AGAIN)====================="));
		console.log(chalk.hex("#6fa8dc")("Try to withdraw early (should fail)"));
		await expectRevert.unspecified(veFPIS_instance.withdraw({ from: COLLATERAL_FRAX_AND_FXS_OWNER }));


		console.log(chalk.hex("#ff8b3d").bold("=====================ADVANCE SOME BLOCKS AND DO A CHECKPOINT====================="));
		console.log(chalk.hex("#6fa8dc")("Advance 90 blocks and 90 days and checkpoint"));
		for (let j = 0; j < 90; j++){
			await time.increase(86400);
			await time.advanceBlock();
		}

		// Do a quick checkpoint
		await veFPIS_instance.checkpoint();


		console.log(chalk.hex("#ff8b3d").bold("=====================PRINT SOME STATS====================="));
		const block_10_ago = (new BigNumber(await time.latestBlock())).toNumber() - 10;
		const veFPIS_epoch = new BigNumber(await veFPIS_instance.epoch()).toNumber();
		const veFPIS_total_FPIS = new BigNumber(await veFPIS_instance.supply()).div(BIG18).toNumber();
		const veFPIS_total_veFPIS = new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber();
		const veFPIS_total_veFPIS_10_blocks_before = new BigNumber(await veFPIS_instance.totalSupplyAt(block_10_ago)).div(BIG18).toNumber();
		const veFPIS_account1_balance = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFPIS_account1_balance_10_blocks_before = new BigNumber(await veFPIS_instance.balanceOfAt(COLLATERAL_FRAX_AND_FXS_OWNER, block_10_ago)).div(BIG18).toNumber();
		
		console.log("veFPIS_epoch:", veFPIS_epoch);
		console.log("veFPIS_total_FPIS:", veFPIS_total_FPIS);
		console.log("veFPIS_total_veFPIS:", veFPIS_total_veFPIS);
		console.log("veFPIS_total_veFPIS_10_blocks_before:", veFPIS_total_veFPIS_10_blocks_before);
		await utilities.printVeFPIS_Points(veFPIS_instance, veFPIS_epoch, COLLATERAL_FRAX_AND_FXS_OWNER);

		// Get the time left
		const curr_ts_quick3 = (new BigNumber(await time.latest())).toNumber();
		const end_ts_1_quick3 = (new BigNumber(await veFPIS_instance.locked__end(COLLATERAL_FRAX_AND_FXS_OWNER))).toNumber();
		const timeleft_1_quick3 = (end_ts_1_quick3 - curr_ts_quick3);
		console.log("Time left to [1]'s end (secs): ", timeleft_1_quick3);

		// Create a new quick table
		const quick_table_3 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick3 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick3 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick3 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick3 = parseFloat(new BigNumber(last_point_ttl_quick3.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick3 = parseFloat(new BigNumber(last_point_ttl_quick3.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick3 = parseFloat(new BigNumber(last_point_ttl_quick3.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_3.push([0, total_fpis_quick3, total_veFPIS_quick3, slope_mid_ttl_quick3, bias_mid_ttl_quick3, fpis_amt_mid_ttl_quick3]);
		console.log(quick_table_3.toString());

		assert(veFPIS_total_veFPIS >= veFPIS_total_FPIS, 'veFPIS should be ≥ FPIS');
		console.log(chalk.hex("#6fa8dc")("veFPIS 'balance' should decrease as it gets closer to the expiry. However, the FPIS will not be lost"));
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFPIS_account1_balance:", veFPIS_account1_balance);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFPIS_balance_10_blocks_before:", veFPIS_account1_balance_10_blocks_before);


		console.log(chalk.hex("#ff8b3d").bold("=====================ADVANCE, CHECKPOINT, AND PRINT SOME STATS [1]====================="));
		// Advance up right before the end
		console.log("Move to the end of the veFPIS period");
		const current_ts_end_1 = (new BigNumber(await time.latest())).toNumber();
		const ending_ts_end_1 = (new BigNumber(await veFPIS_instance.locked__end(COLLATERAL_FRAX_AND_FXS_OWNER))).toNumber();

		const increase_time_end_1 = (ending_ts_end_1 - current_ts_end_1) - 10;
		console.log("Increasing time to right before [1]'s end (days): ", increase_time_end_1 / 86400);
		await time.increase(increase_time_end_1);
		await time.advanceBlock();

		// Do a quick checkpoint
		await veFPIS_instance.checkpoint();

		// Create a new quick table
		const quick_table_4 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick4 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick4 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick4 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick4 = parseFloat(new BigNumber(last_point_ttl_quick4.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick4 = parseFloat(new BigNumber(last_point_ttl_quick4.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick4 = parseFloat(new BigNumber(last_point_ttl_quick4.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_4.push([0, total_fpis_quick4, total_veFPIS_quick4, slope_mid_ttl_quick4, bias_mid_ttl_quick4, fpis_amt_mid_ttl_quick4]);
		console.log(quick_table_4.toString());

		// Collect some quick info
		const block_10_ago_1 = (new BigNumber(await time.latestBlock())).toNumber() - 10;
		const veFPIS_epoch_1 = new BigNumber(await veFPIS_instance.epoch()).toNumber();
		const veFPIS_total_FPIS_1 = new BigNumber(await veFPIS_instance.supply()).div(BIG18).toNumber();
		const veFPIS_total_veFPIS_1 = new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber();
		const veFPIS_total_veFPIS_10_blocks_before_1 = new BigNumber(await veFPIS_instance.totalSupplyAt(block_10_ago_1)).div(BIG18).toNumber();
		const veFPIS_account1_balance_1 = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFPIS_account1_balance_10_blocks_before_1 = new BigNumber(await veFPIS_instance.balanceOfAt(COLLATERAL_FRAX_AND_FXS_OWNER, block_10_ago_1)).div(BIG18).toNumber();

		// Print some quick info
		console.log("veFPIS_epoch:", veFPIS_epoch_1);
		console.log("veFPIS_total_FPIS:", veFPIS_total_FPIS_1);
		console.log("veFPIS_total_veFPIS:", veFPIS_total_veFPIS_1);
		console.log("veFPIS_total_veFPIS_10_blocks_before:", veFPIS_total_veFPIS_10_blocks_before_1);
		await utilities.printVeFPIS_Points(veFPIS_instance, veFPIS_epoch_1, COLLATERAL_FRAX_AND_FXS_OWNER);
		assert(veFPIS_total_veFPIS_1 >= veFPIS_total_FPIS_1, 'veFPIS should be ≥ FPIS');

		// Get the time left
		const curr_ts_quick4 = (new BigNumber(await time.latest())).toNumber();
		const end_ts_1_quick4 = (new BigNumber(await veFPIS_instance.locked__end(COLLATERAL_FRAX_AND_FXS_OWNER))).toNumber();
		const timeleft_1_quick4 = (end_ts_1_quick4 - curr_ts_quick4);
		console.log("Time left to [1]'s end (secs): ", timeleft_1_quick4);

		console.log(chalk.hex("#6fa8dc")("veFPIS 'balance' should decrease as it gets closer to the expiry. However, the FPIS will not be lost"));
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFPIS_account1_balance:", veFPIS_account1_balance_1);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFPIS_balance_10_blocks_before:", veFPIS_account1_balance_10_blocks_before_1);


		console.log(chalk.hex("#ff8b3d").bold("=====================TRY TO WITHDRAW CORRECTLY====================="));
		// Advance past the end
		await time.increase((14 * 86400) + 1);
		await time.advanceBlock();

		console.log(chalk.hex("#6fa8dc")("Get FPIS and veFPIS balances before"));
		const pre_withdrawal_FPIS = new BigNumber(await fpis_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const pre_withdrawal_veFPIS = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("pre_withdrawal_FPIS:", pre_withdrawal_FPIS);
		console.log("pre_withdrawal_veFPIS:", pre_withdrawal_veFPIS);

		console.log(chalk.hex("#6fa8dc")("Try to withdraw correctly now"));
		await veFPIS_instance.withdraw({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#6fa8dc")("Get FPIS and veFPIS balances after"));
		const post_withdrawal_FPIS = new BigNumber(await fpis_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const post_withdrawal_veFPIS = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log(`post_withdrawal_FPIS: ${post_withdrawal_FPIS} (change: ${post_withdrawal_FPIS - pre_withdrawal_FPIS})`);
		console.log(`post_withdrawal_veFPIS: ${post_withdrawal_veFPIS} (change: ${post_withdrawal_veFPIS - pre_withdrawal_veFPIS})`);

		// Create a new quick table
		const quick_table_5 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick5 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick5 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick5 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick5 = parseFloat(new BigNumber(last_point_ttl_quick5.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick5 = parseFloat(new BigNumber(last_point_ttl_quick5.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick5 = parseFloat(new BigNumber(last_point_ttl_quick5.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_5.push([0, total_fpis_quick5, total_veFPIS_quick5, slope_mid_ttl_quick5, bias_mid_ttl_quick5, fpis_amt_mid_ttl_quick5]);
		console.log(quick_table_5.toString());


		console.log(chalk.hex("#ff8b3d").bold("=====================ADVANCE, CHECKPOINT, AND PRINT SOME STATS [2]====================="));
		// Advance one week
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		// Do a quick checkpoint
		await veFPIS_instance.checkpoint();

		const block_10_ago_2 = (new BigNumber(await time.latestBlock())).toNumber() - 10;
		const veFPIS_epoch_2 = new BigNumber(await veFPIS_instance.epoch()).toNumber();
		const veFPIS_total_FPIS_2 = new BigNumber(await veFPIS_instance.supply()).div(BIG18).toNumber();
		const veFPIS_total_veFPIS_2 = new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber();
		const veFPIS_total_veFPIS_10_blocks_before_2 = new BigNumber(await veFPIS_instance.totalSupplyAt(block_10_ago_2)).div(BIG18).toNumber();
		const veFPIS_account1_balance_2 = new BigNumber(await veFPIS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFPIS_account1_balance_10_blocks_before_2 = new BigNumber(await veFPIS_instance.balanceOfAt(COLLATERAL_FRAX_AND_FXS_OWNER, block_10_ago_2)).div(BIG18).toNumber();
		
		console.log("veFPIS_epoch:", veFPIS_epoch_2);
		console.log("veFPIS_total_FPIS:", veFPIS_total_FPIS_2);
		console.log("veFPIS_total_veFPIS:", veFPIS_total_veFPIS_2);
		console.log("veFPIS_total_veFPIS_10_blocks_before:", veFPIS_total_veFPIS_10_blocks_before_2);
		await utilities.printVeFPIS_Points(veFPIS_instance, veFPIS_epoch_1, COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log(chalk.hex("#6fa8dc")("veFPIS 'balance' should decrease as it gets closer to the expiry. However, the FPIS will not be lost"));
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFPIS_account1_balance:", veFPIS_account1_balance_2);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFPIS_balance_10_blocks_before:", veFPIS_account1_balance_10_blocks_before_2);

		// Create a new quick table
		const quick_table_6 = new Table({
			head: ['Per.', 'Ttl FPIS', 'Ttl veFPIS', 'Ttl Slope', 'Ttl Bias', 'Ttl fpis_amt'], 
			colWidths: [5, 17, 15, 17, 17, 17]
		});

		// Print a quick table with info
		const total_fpis_quick6 = parseFloat(new BigNumber(await veFPIS_instance.totalFPISSupply()).div(BIG18).toNumber().toFixed(4));
		const total_veFPIS_quick6 = parseFloat(new BigNumber(await veFPIS_instance.totalSupply()).div(BIG18).toNumber().toFixed(4));
		const last_point_ttl_quick6 = await veFPIS_instance.get_last_point();
		const slope_mid_ttl_quick6 = parseFloat(new BigNumber(last_point_ttl_quick6.slope).div(BIG18).toNumber().toFixed(10));
		const bias_mid_ttl_quick6 = parseFloat(new BigNumber(last_point_ttl_quick6.bias).div(BIG18).toNumber().toFixed(4));
		const fpis_amt_mid_ttl_quick6 = parseFloat(new BigNumber(last_point_ttl_quick6.fpis_amt).div(BIG18).toNumber().toFixed(4));
		quick_table_6.push([0, total_fpis_quick6, total_veFPIS_quick6, slope_mid_ttl_quick6, bias_mid_ttl_quick6, fpis_amt_mid_ttl_quick6]);
		console.log(quick_table_6.toString());

		return;
	});

	it("Proxy Fail Tests ", async () => {
		const test_amount_1_initial = new BigNumber("100e18");
		const test_amount_1_increment = new BigNumber("10e18");
		const test_amount_1_liq_fee_amt = test_amount_1_increment.multipliedBy(0.01);
		const curr_ts = (await time.latest()).toNumber();
		const test_deposit_ts = curr_ts + ((30 * 86400) + 1);

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#ff8b3d").bold("=============DEPOSIT/PAYBACK/LIQUIDATION TESTS [PRE-EXPIRATION]============="));
		// console.log(chalk.yellow("ADMIN BLACKLISTS GOVERNOR_GUARDIAN_ADDRESS AS A PROXY "));
		// veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: DEPLOYER_ADDRESS });

		console.log("---------TRY TO PAY BACK NOT AS ADMIN WHITELISTED---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, test_amount_1_initial, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Proxy not whitelisted [admin level]"
		);

		console.log("---------TRY TO LIQUIDATE NOT AS ADMIN WHITELISTED---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, test_amount_1_initial, test_amount_1_liq_fee_amt, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Proxy not whitelisted [admin level]"
		);

		console.log("---------TRY TO TOGGLE PROXY NOT AS AN ADMIN---------");
		await expectRevert(
			veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: POOL_CREATOR }),
			"Admin only"
		);

		console.log(chalk.yellow("ADMIN WHITELISTS GOVERNOR_GUARDIAN_ADDRESS AS A PROXY "));
		veFPIS_instance.adminToggleProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: DEPLOYER_ADDRESS });

		console.log("---------TRY TO PAY BACK NOT AS STAKER APPROVED---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, test_amount_1_initial, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Proxy not whitelisted [staker level]"
		);

		console.log("---------TRY TO LIQUIDATE NOT AS STAKER APPROVED---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, test_amount_1_initial, test_amount_1_liq_fee_amt, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Proxy not whitelisted [staker level]"
		);

		console.log(chalk.yellow("STAKER WHITELISTS GOVERNOR_GUARDIAN_ADDRESS AS A PROXY "));
		veFPIS_instance.stakerSetProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: STAKING_OWNER });

		console.log("---------TRY TO PAY BACK BEFORE STAKER CREATED THE LOCK---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, test_amount_1_initial, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"No existing lock found"
		);

		console.log("---------TRY TO LIQUIDATE BEFORE STAKER CREATED THE LOCK---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, test_amount_1_initial, test_amount_1_liq_fee_amt, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"No existing lock found"
		);

		console.log(chalk.yellow("STAKER CREATES A LOCK"));
		await fpis_instance.approve(veFPIS_instance.address, test_amount_1_initial, { from: STAKING_OWNER });
		veFPIS_instance.create_lock(test_amount_1_initial, test_deposit_ts, { from: STAKING_OWNER });

		console.log(chalk.yellow("TRANSFER 2X AN INCREMENT AMOUNT TO THE PROXY AS A LOAN CORRECTLY"));
		await veFPIS_instance.transfer_to_proxy(STAKING_OWNER, test_amount_1_increment.multipliedBy(2), { from: GOVERNOR_GUARDIAN_ADDRESS })

		console.log("---------TRY TO DEPOSIT NOTHING [STAKER]---------");
		await expectRevert(
			veFPIS_instance.increase_amount(0, { from: STAKING_OWNER }),
			"Value must be > 0"
		);

		console.log("---------TRY TO PAY BACK NOTHING [PROXY]---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Amounts must be non-zero"
		);

		console.log("---------TRY TO LIQUIDATE NOTHING [PROXY]---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Amounts must be non-zero"
		);

		console.log(chalk.yellow("PROXY APPROVES veFPIS TO TAKE FPIS"));
		await fpis_instance.approve(veFPIS_instance.address, test_amount_1_increment, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log(chalk.yellow("PROXY PAYS BACK INCREMENT AMOUNT CORRECTLY"));
		await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, test_amount_1_increment, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("=============WITHDRAWAL TESTS [PRE-EXPIRATION]============="));
		console.log("---------TRY TO WITHDRAW BEFORE EXPIRATION[STAKER]---------");
		await expectRevert(
			veFPIS_instance.withdraw({ from: STAKING_OWNER }),
			"The lock didn't expire"
		);

		console.log(chalk.yellow("TRANSFER 2X AN INCREMENT AMOUNT TO THE PROXY CORRECTLY"));
		await veFPIS_instance.transfer_to_proxy(STAKING_OWNER, test_amount_1_increment.multipliedBy(2), { from: GOVERNOR_GUARDIAN_ADDRESS })

		// const user_fpis_in_proxy = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER)).div(BIG18).toNumber();
		// const user_fpis_ttl_proxied = new BigNumber(await veFPIS_instance.user_ttl_proxied_fpis(STAKING_OWNER)).div(BIG18).toNumber();
		// console.log("user_fpis_in_proxy:", user_fpis_in_proxy);
		// console.log("user_fpis_ttl_proxied:", user_fpis_ttl_proxied);
		

		console.log();
		console.log(chalk.green.bold("================================================================================"));
		console.log(chalk.green.bold("============================ADVANCE AFTER EXPIRATION============================"));
		console.log(chalk.green.bold("================================================================================"));
		console.log();
		// Advance 5 weeks, past the expiration time
		await time.increase((5 * 7 * 86400) + 1);
		await time.advanceBlock();


		console.log(chalk.hex("#ff8b3d").bold("=============DEPOSIT/PAYBACK/LIQUIDATION TESTS [POST-EXPIRATION, PART 1]============="));
		console.log(chalk.yellow("PROXY APPROVES veFPIS TO TAKE FPIS"));
		await fpis_instance.approve(veFPIS_instance.address, test_amount_1_increment, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("---------TRY TO PAY BACK TOO MUCH [PROXY]---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, test_amount_1_increment.multipliedBy(1000), 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Trying to pay back too much"
		);

		console.log(chalk.yellow("PROXY PAYS BACK A SMALL AMOUNT CORRECTLY"));
		await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, test_amount_1_increment, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("---------TRY TO LIQUIDATE TOO MUCH [PROXY]---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, test_amount_1_increment.multipliedBy(1000), test_amount_1_liq_fee_amt, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Cannot liquidate more than the user has"
		);

		console.log(chalk.yellow("PROXY LIQUIDATES A SMALL AMOUNT"));
		await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, test_amount_1_increment.multipliedBy(0.5), test_amount_1_liq_fee_amt, true, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log(chalk.hex("#ff8b3d").bold("=============WITHDRAWAL TESTS [POST-EXPIRATION]============="));
		console.log("---------TRY TO TRANSFER AFTER EXPIRATION, BUT WITH DEBTS [PROXY]---------");
		await expectRevert(
			veFPIS_instance.transfer_to_proxy(STAKING_OWNER, test_amount_1_increment, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"No transfers after expiration"
		);

		console.log("---------TRY TO WITHDRAW AFTER EXPIRATION, BUT WITH DEBTS [STAKER]---------");
		await expectRevert(
			veFPIS_instance.withdraw({ from: STAKING_OWNER }),
			"Outstanding FPIS in proxy. Have proxy use proxy_payback_or_liquidate"
		);

		// Get the amount of FPIS borrowed left
		const user_fpis_in_proxy_bn = new BigNumber(await veFPIS_instance.user_fpis_in_proxy(STAKING_OWNER));

		console.log(chalk.hex("#ff8b3d").bold("=============DEPOSIT/PAYBACK/LIQUIDATION TESTS [POST-EXPIRATION, PART 2]============="));
		console.log(chalk.yellow("PROXY LIQUIDATES THE REMAINDER"));
		await fpis_instance.approve(veFPIS_instance.address, user_fpis_in_proxy_bn, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, 0, user_fpis_in_proxy_bn, 0, true, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("---------TRY TO PAY BACK AFTER ALREADY PAYING OFF THE ENTIRE LOAN---------");
		await expectRevert(
			veFPIS_instance.proxy_payback_or_liquidate(STAKING_OWNER, user_fpis_in_proxy_bn, 0, 0, false, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Nothing to pay back for this proxy"
		);

		console.log(chalk.yellow("USER WITHDRAWS THEIR STAKE"));
		await veFPIS_instance.withdraw({ from: STAKING_OWNER })
	});

});