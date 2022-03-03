const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Bond contracts
const FXBA10000M3 = artifacts.require("FXB/Variants/FXBA10000M3.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const BIG6 = new BigNumber("1e6");
const BIG8 = new BigNumber("1e8");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";


contract('FraxBond_NFT-Tests', async (accounts) => {
	let CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let ALLOCATIONS = constants.ALLOCATIONS;

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
	let BOND_CONTROLLER_ADDRESS;
	let FRAX_UTILITY_CONTRACTOR;
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';


	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize pool instances
	let pool_instance_USDC;

	// Bond contracts
	let bondInstance_FXBA10000M3;

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
		BOND_CONTROLLER_ADDRESS = accounts[9];
		FRAX_UTILITY_CONTRACTOR = process.env.FRAX_UTILITY_CONTRACTOR

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();

		// Fill collateral instances
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_USDC_vAMM = await PoolvAMM_USDC.deployed();
		
		// Fill bond instances
		bondInstance_FXBA10000M3 = await FXBA10000M3.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// INITIALIZATION
	// ================================================================
	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");

		console.log("Add the bond contract as a 'pool'");
		await frax_instance.addPool(bondInstance_FXBA10000M3.address, { from: process.env.FRAX_ONE_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		// Give the FRAX_UTILITY_CONTRACTOR address some FRAX
		await frax_instance.transfer(FRAX_UTILITY_CONTRACTOR, new BigNumber("100000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

	});

	// Pull in USDC via the mint method
	// ================================================================
	it('Main test', async () => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FRAX_UTILITY_CONTRACTOR]
		});

		console.log(chalk.bold.blue("============================BOND #0============================"));

		console.log("---------NOTE FRAX BALANCE BEFORE---------");
		const frax_balance_before = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		console.log("FRAX balance before : ", frax_balance_before.toNumber());

		console.log("---------Mint bond #0---------");
		await frax_instance.approve(bondInstance_FXBA10000M3.address, new BigNumber(100000e18), { from: FRAX_UTILITY_CONTRACTOR });
		await bondInstance_FXBA10000M3.issueBond(false, { from: FRAX_UTILITY_CONTRACTOR });
	
		const bond0_details_after_mint = await bondInstance_FXBA10000M3.bondDetails.call(0);
		console.log(bond0_details_after_mint);

		console.log("---------Attempt to immediately redeem [should fail]---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.redeemBond(0, { from: FRAX_UTILITY_CONTRACTOR }));

		console.log("---------Wait a few days and try again [should fail again]---------");
		// Advance 2 months
		await time.increase((15 * 86400) + 1);
		await time.advanceBlock();

		await expectRevert.unspecified(bondInstance_FXBA10000M3.redeemBond(0, { from: FRAX_UTILITY_CONTRACTOR }));
	
		console.log("---------Wait a few more days [should work now, but with a penalty]---------");
		// Advance 2 months
		await time.increase((30 * 86400) + 1);
		await time.advanceBlock();

		const expected_values_CALL = await bondInstance_FXBA10000M3.redeemBond.call(0, { from: FRAX_UTILITY_CONTRACTOR });
		console.log("maturity_value: ", (new BigNumber(expected_values_CALL['maturity_value'])).div(BIG18).toNumber());
		console.log("return_value: ", (new BigNumber(expected_values_CALL['return_value'])).div(BIG18).toNumber());

		await bondInstance_FXBA10000M3.redeemBond(0, { from: FRAX_UTILITY_CONTRACTOR });

		const bond_details_after_redeem_CALL = await bondInstance_FXBA10000M3.bondDetails.call(0);
		console.log(bond_details_after_redeem_CALL);

		console.log("---------NOTE FRAX BALANCE AFTER---------");
		const frax_balance_after = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		console.log("FRAX balance after : ", frax_balance_after.toNumber());
		console.log("FRAX profit : ", (frax_balance_after.minus(frax_balance_before)).toNumber());


		
		console.log(chalk.bold.blue("============================BOND #1============================"));

		console.log("---------Mint bond #1---------");
		await frax_instance.approve(bondInstance_FXBA10000M3.address, new BigNumber(100000e18), { from: FRAX_UTILITY_CONTRACTOR });
		await bondInstance_FXBA10000M3.issueBond(false, { from: FRAX_UTILITY_CONTRACTOR });
	
		const bond1_details_after_mint = await bondInstance_FXBA10000M3.bondDetails.call(0);
		console.log(bond1_details_after_mint);



		console.log("---------NOTE FRAX BALANCE BEFORE---------");
		const frax_balance_before_bond1 = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		console.log("FRAX balance before : ", frax_balance_before_bond1.toNumber());





		// TODO



		console.log(chalk.bold.blue("============================BOND #2============================"));

		console.log("---------Mint bond #2---------");
		await frax_instance.approve(bondInstance_FXBA10000M3.address, new BigNumber(100000e18), { from: FRAX_UTILITY_CONTRACTOR });
		await bondInstance_FXBA10000M3.issueBond(false, { from: FRAX_UTILITY_CONTRACTOR });



		console.log("===============================FAIL TESTS===============================");

		console.log("---------TRY TO MINT ABOVE THE LIMIT---------");
		await frax_instance.approve(bondInstance_FXBA10000M3.address, new BigNumber(100000e18), { from: FRAX_UTILITY_CONTRACTOR });
		await expectRevert.unspecified(bondInstance_FXBA10000M3.issueBond(false, { from: FRAX_UTILITY_CONTRACTOR }));

		console.log("---------TRY TO REDEEM SOMEBODY ELSE'S BOND---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.redeemBond(0, { from: ORACLE_ADDRESS }));

		console.log("---------TRY TO REDEEM A NONEXISTANT BOND---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.redeemBond(69, { from: ORACLE_ADDRESS }));

		console.log("---------TRY TO BURN A BOND---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.burn(0, { from: ORACLE_ADDRESS }));

		console.log("---------TRY TO TRANSFER THE BOND TO A NON-ERC721 COMPLIANT SMART CONTRACT---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.safeTransferFrom(FRAX_UTILITY_CONTRACTOR, frax_instance.address, 0, { from: FRAX_UTILITY_CONTRACTOR }));

		console.log("---------TRY TO TRANSFER SOMEBODY ELSE'S BOND---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.transferFrom(ORACLE_ADDRESS, FRAX_UTILITY_CONTRACTOR, 0, { from: TIMELOCK_ADMIN }));

		console.log("---------PAUSE REDEMPTIONS AND MINTING---------");
		await bondInstance_FXBA10000M3.toggleMinting({ from: BOND_CONTROLLER_ADDRESS });
		await bondInstance_FXBA10000M3.toggleRedeeming({ from: BOND_CONTROLLER_ADDRESS });
		
		console.log("---------TRY MINTING WHEN PAUSED---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.issueBond(false, { from: FRAX_UTILITY_CONTRACTOR }));

		console.log("---------TRY REDEEMING WHEN PAUSED---------");
		await expectRevert.unspecified(bondInstance_FXBA10000M3.redeemBond(3, { from: FRAX_UTILITY_CONTRACTOR }));

		console.log("===============================PASS TESTS===============================");

		console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");
		await bondInstance_FXBA10000M3.transferFrom(FRAX_UTILITY_CONTRACTOR, TIMELOCK_ADMIN, 0, { from: FRAX_UTILITY_CONTRACTOR });

		console.log("---------SAFE TRANSFER BOND #1 TO ANOTHER ADDRESS---------");
		await bondInstance_FXBA10000M3.safeTransferFrom(FRAX_UTILITY_CONTRACTOR, TIMELOCK_ADMIN, 1, { from: FRAX_UTILITY_CONTRACTOR });

		console.log("---------APPROVE AND TRANSFER BOND #2---------");
		await bondInstance_FXBA10000M3.approve(TIMELOCK_ADMIN, 2, { from: FRAX_UTILITY_CONTRACTOR });
		await bondInstance_FXBA10000M3.transferFrom(FRAX_UTILITY_CONTRACTOR, TIMELOCK_ADMIN, 2, { from: TIMELOCK_ADMIN });

		console.log("===============================END===============================");

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [FRAX_UTILITY_CONTRACTOR]
		});

	});
	
});