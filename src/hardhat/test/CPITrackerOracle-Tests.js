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
const { assert } = require('console');

// ERC20
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Oracles
const CPITrackerOracle = artifacts.require("Oracle/CPITrackerOracle");

const BIG6 = new BigNumber("1e6");
const BIG8 = new BigNumber("1e8");
const BIG18 = new BigNumber("1e18");

contract('CPITrackerOracle-Tests', async (accounts) => {
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

	const ADDRESS_WITH_LINK = '0xF977814e90dA44bFA03b6295A0616a897441aceC';

	// Initialize ERC20 instances
	let link_instance;

	// Initialize oracle instances
	let cpi_tracker_oracle_instance;

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

		// Fill ERC20 instances
		link_instance = await ERC20.at("0x514910771AF9Ca656af840dff83E8264EcF986CA");

		// Fill oracle instances
		cpi_tracker_oracle_instance = await CPITrackerOracle.deployed();

	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));

		console.log("------------------------------------------------");
		console.log("Give the oracle some LINK");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LINK]
		});

		await link_instance.transfer(cpi_tracker_oracle_instance.address, new BigNumber("100e18"), { from: ADDRESS_WITH_LINK });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LINK]
		});
	});

	it('Main Script', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("MAIN TEST"));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));


		console.log(chalk.hex("#ff8b3d").bold("================== DATA AT WEEK 0 =================="));
		// Get the data
		const peg_price_last_week0 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_last.call()).div(BIG18).toNumber();
		const peg_price_target_week0 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_target.call()).div(BIG18).toNumber();
		const cpi_last_week0 = new BigNumber(await cpi_tracker_oracle_instance.cpi_last.call()).div(BIG8).toNumber();
		const cpi_target_week0 = new BigNumber(await cpi_tracker_oracle_instance.cpi_target.call()).div(BIG8).toNumber();
		const curr_peg_price_week0 = new BigNumber(await cpi_tracker_oracle_instance.currPegPrice.call()).div(BIG18).toNumber();
		const curr_delta_pct_week0 = new BigNumber(await cpi_tracker_oracle_instance.currDeltaFracE6.call());
		const upcoming_cpi_params_week0 = await cpi_tracker_oracle_instance.upcomingCPIParams.call();
		const upcoming_serie_week0 = await cpi_tracker_oracle_instance.upcomingSerie.call();
		
		// Print the data
		console.log("peg_price_last_week0: ", peg_price_last_week0);
		console.log("peg_price_target_week0: ", peg_price_target_week0);
		console.log("cpi_last_week0: ", cpi_last_week0);
		console.log("cpi_target_week0: ", cpi_target_week0);
		console.log("curr_peg_price_week0: ", curr_peg_price_week0);
		console.log("curr_delta_pct_week0_raw: ", curr_delta_pct_week0.toNumber());
		console.log("curr_delta_pct_week0: ", `${curr_delta_pct_week0.div(BIG6).toNumber() * 100}%`);
		console.log("upcoming_cpi_params_week0: ", `[${upcoming_cpi_params_week0[0]}, ${upcoming_cpi_params_week0[1]}]`);
		console.log("upcoming_serie_week0: ", upcoming_serie_week0);


		console.log(chalk.hex("#ff8b3d").bold("================== DATA AT WEEK 2 =================="));
		// Advance two weeks
		const increase_time_week2 = 14 * 86400;
		await time.increase(increase_time_week2);
		await time.advanceBlock();

		// Get the data
		const peg_price_last_week2 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_last.call()).div(BIG18).toNumber();
		const peg_price_target_week2 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_target.call()).div(BIG18).toNumber();
		const cpi_last_week2 = new BigNumber(await cpi_tracker_oracle_instance.cpi_last.call()).div(BIG8).toNumber();
		const cpi_target_week2 = new BigNumber(await cpi_tracker_oracle_instance.cpi_target.call()).div(BIG8).toNumber();
		const curr_peg_price_week2 = new BigNumber(await cpi_tracker_oracle_instance.currPegPrice.call()).div(BIG18).toNumber();
		const curr_delta_pct_week2 = new BigNumber(await cpi_tracker_oracle_instance.currDeltaFracE6.call());
		const upcoming_cpi_params_week2 = await cpi_tracker_oracle_instance.upcomingCPIParams.call();
		const upcoming_serie_week2 = await cpi_tracker_oracle_instance.upcomingSerie.call();
		
		// Print the data
		console.log("peg_price_last_week2: ", peg_price_last_week2);
		console.log("peg_price_target_week2: ", peg_price_target_week2);
		console.log("cpi_last_week2: ", cpi_last_week2);
		console.log("cpi_target_week2: ", cpi_target_week2);
		console.log("curr_peg_price_week2: ", curr_peg_price_week2);
		console.log("curr_delta_pct_week2_raw: ", curr_delta_pct_week2.toNumber());
		console.log("curr_delta_pct_week2: ", `${curr_delta_pct_week2.div(BIG6).toNumber() * 100}%`);
		console.log("upcoming_cpi_params_week2: ", `[${upcoming_cpi_params_week2[0]}, ${upcoming_cpi_params_week2[1]}]`);
		console.log("upcoming_serie_week2: ", upcoming_serie_week2);


		console.log(chalk.hex("#ff8b3d").bold("================== DATA AT WEEK 4 =================="));
		// Advance two weeks
		const increase_time_week4 = 14 * 86400;
		await time.increase(increase_time_week4);
		await time.advanceBlock();

		// Get the data
		const peg_price_last_week4 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_last.call()).div(BIG18).toNumber();
		const peg_price_target_week4 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_target.call()).div(BIG18).toNumber();
		const cpi_last_week4 = new BigNumber(await cpi_tracker_oracle_instance.cpi_last.call()).div(BIG8).toNumber();
		const cpi_target_week4 = new BigNumber(await cpi_tracker_oracle_instance.cpi_target.call()).div(BIG8).toNumber();
		const curr_peg_price_week4 = new BigNumber(await cpi_tracker_oracle_instance.currPegPrice.call()).div(BIG18).toNumber();
		const curr_delta_pct_week4 = new BigNumber(await cpi_tracker_oracle_instance.currDeltaFracE6.call());
		const upcoming_cpi_params_week4 = await cpi_tracker_oracle_instance.upcomingCPIParams.call();
		const upcoming_serie_week4 = await cpi_tracker_oracle_instance.upcomingSerie.call();
		
		// Print the data
		console.log("peg_price_last_week4: ", peg_price_last_week4);
		console.log("peg_price_target_week4: ", peg_price_target_week4);
		console.log("cpi_last_week4: ", cpi_last_week4);
		console.log("cpi_target_week4: ", cpi_target_week4);
		console.log("curr_peg_price_week4: ", curr_peg_price_week4);
		console.log("curr_delta_pct_week4_raw: ", curr_delta_pct_week4.toNumber());
		console.log("curr_delta_pct_week4: ", `${curr_delta_pct_week4.div(BIG6).toNumber() * 100}%`);
		console.log("upcoming_cpi_params_week4: ", `[${upcoming_cpi_params_week4[0]}, ${upcoming_cpi_params_week4[1]}]`);
		console.log("upcoming_serie_week4: ", upcoming_serie_week4);


		console.log(chalk.hex("#ff8b3d").bold("================== DATA AT WEEK 5 =================="));
		// Advance one week
		const increase_time_week5 = 7 * 86400;
		await time.increase(increase_time_week5);
		await time.advanceBlock();

		// Get the data
		const peg_price_last_week5 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_last.call()).div(BIG18).toNumber();
		const peg_price_target_week5 = new BigNumber(await cpi_tracker_oracle_instance.peg_price_target.call()).div(BIG18).toNumber();
		const cpi_last_week5 = new BigNumber(await cpi_tracker_oracle_instance.cpi_last.call()).div(BIG8).toNumber();
		const cpi_target_week5 = new BigNumber(await cpi_tracker_oracle_instance.cpi_target.call()).div(BIG8).toNumber();
		const curr_peg_price_week5 = new BigNumber(await cpi_tracker_oracle_instance.currPegPrice.call()).div(BIG18).toNumber();
		const curr_delta_pct_week5 = new BigNumber(await cpi_tracker_oracle_instance.currDeltaFracE6.call());
		const upcoming_cpi_params_week5 = await cpi_tracker_oracle_instance.upcomingCPIParams.call();
		const upcoming_serie_week5 = await cpi_tracker_oracle_instance.upcomingSerie.call();
		
		// Print the data
		console.log("peg_price_last_week5: ", peg_price_last_week5);
		console.log("peg_price_target_week5: ", peg_price_target_week5);
		console.log("cpi_last_week5: ", cpi_last_week5);
		console.log("cpi_target_week5: ", cpi_target_week5);
		console.log("curr_peg_price_week5: ", curr_peg_price_week5);
		console.log("curr_delta_pct_week5_raw: ", curr_delta_pct_week5.toNumber());
		console.log("curr_delta_pct_week5: ", `${curr_delta_pct_week5.div(BIG6).toNumber() * 100}%`);
		console.log("upcoming_cpi_params_week5: ", `[${upcoming_cpi_params_week5[0]}, ${upcoming_cpi_params_week5[1]}]`);
		console.log("upcoming_serie_week5: ", upcoming_serie_week5);

	});
});