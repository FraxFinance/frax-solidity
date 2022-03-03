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


// FPI Core
const FPI = artifacts.require("FPI/FPI");
const FPIS = artifacts.require("FPI/FPIS");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

contract('FPI-FPIS-Tests', async (accounts) => {
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


	// Initialize FPI core contract instances
	let fpi_instance;
	let fpis_instance;


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
		fpi_instance = await FPI.deployed();
		fpis_instance = await FPIS.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Uniform Tests========================="));

		const mint_test_amount = new BigNumber ("100e18");
		const transfer_test_amount = new BigNumber ("5e18");
		const burn_test_amount = new BigNumber ("1e18");

		console.log("Add [1] as a minter"); 
		await fpi_instance.addMinter(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.addMinter(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Transfer a test amount");
		await fpi_instance.transfer(INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.transfer(INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Approve for transferFrom");
		await fpi_instance.approve(INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.approve(INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Transfer a test amount");
		await fpi_instance.transferFrom(COLLATERAL_FRAX_AND_FXS_OWNER, INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS });
		await fpis_instance.transferFrom(COLLATERAL_FRAX_AND_FXS_OWNER, INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS });

		console.log("Mint a test amount");
		await fpi_instance.minter_mint(COLLATERAL_FRAX_AND_FXS_OWNER, mint_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.minter_mint(COLLATERAL_FRAX_AND_FXS_OWNER, mint_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Burn a test amount");
		await fpi_instance.burn(burn_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.burn(burn_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Approve for burnFrom");
		await fpi_instance.approve(COLLATERAL_FRAX_AND_FXS_OWNER, burn_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.approve(COLLATERAL_FRAX_AND_FXS_OWNER, burn_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("BurnFrom a test amount");
		await fpi_instance.minter_burn_from(COLLATERAL_FRAX_AND_FXS_OWNER, burn_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.minter_burn_from(COLLATERAL_FRAX_AND_FXS_OWNER, burn_test_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Remove [1] as a minter"); 
		await fpi_instance.removeMinter(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fpis_instance.removeMinter(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.hex("#ff8b3d").bold("==============Permission Fail Tests=============="));


		console.log(chalk.blue("=============MINT TESTS [SHOULD FAIL]============="));

		console.log("---------TRY TO MINTER MINT NOT AS A MINTER---------");
		await expectRevert(
			fpi_instance.minter_mint(INVESTOR_CUSTODIAN_ADDRESS, mint_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Only minters"
		);
		await expectRevert(
			fpis_instance.minter_mint(INVESTOR_CUSTODIAN_ADDRESS, mint_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Only minters"
		);

		console.log(chalk.blue("=============TRANSFER TESTS [SHOULD FAIL]============="));


		console.log("---------TRY TO transferFrom WITHOUT ALLOWANCE---------");
		await expectRevert(
			fpi_instance.transferFrom(COLLATERAL_FRAX_AND_FXS_OWNER, INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"ERC20: insufficient allowance"
		);
		await expectRevert(
			fpis_instance.transferFrom(COLLATERAL_FRAX_AND_FXS_OWNER, INVESTOR_CUSTODIAN_ADDRESS, transfer_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"ERC20: insufficient allowance"
		);

		console.log(chalk.blue("=============BURN TESTS [SHOULD FAIL]============="));

		console.log("---------TRY TO burnFrom WITHOUT ALLOWANCE---------");
		await expectRevert(
			fpi_instance.burnFrom(INVESTOR_CUSTODIAN_ADDRESS, burn_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"ERC20: insufficient allowance"
		);
		await expectRevert(
			fpis_instance.burnFrom(INVESTOR_CUSTODIAN_ADDRESS, burn_test_amount, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"ERC20: insufficient allowance"
		);
	});

});