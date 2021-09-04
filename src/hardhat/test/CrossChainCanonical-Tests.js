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
const e = require('express');

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const CrossChainCanonical = artifacts.require("Frax/CrossChainCanonical");

// ERC20
const ERC20 = artifacts.require("ERC20/ERC20");

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

contract('CrossChainCanonical-Tests', async (accounts) => {
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
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_FEI = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;
	let cross_chain_canonical_instance

	// Initialize collateral instances
	let fei_instance;

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
		fei_instance = await ERC20.at("0x956F47F50A910163D8BF957Cf5846D573E7f87CA");
		cross_chain_canonical_instance = await CrossChainCanonical.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Initialization related', async () => {
		console.log("=========================Initialization=========================")

		console.log("------------------------------------------------");
		console.log("Give the GOVERNOR_GUARDIAN_ADDRESS some FEI");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FEI]
		});

		await fei_instance.transfer(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("750e18"), { from: ADDRESS_WITH_FEI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FEI]
		});

		console.log("Add FEI as a valid old token");
		await cross_chain_canonical_instance.addOldToken(fei_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give ORACLE_ADDRESS some canonical tokens, for later tests");
		await cross_chain_canonical_instance.transfer(ORACLE_ADDRESS, new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Raise the mint cap");
		await cross_chain_canonical_instance.setMintCap(new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("List all old tokens");
		const all_old_tokens = await cross_chain_canonical_instance.allOldTokens.call();
		console.log(all_old_tokens);
	});

	it('Main functions', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TEST MAIN FUNCTIONS"));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============TEST AN EXCHANGE============="));
		const exchange_amt = new BigNumber("25e18");

		// Approve
		await fei_instance.approve(cross_chain_canonical_instance.address, new BigNumber("500e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await cross_chain_canonical_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("FEI before:", new BigNumber(await fei_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());

		// Exchange
		await cross_chain_canonical_instance.exchangeOldTokens(fei_instance.address, exchange_amt, { from: GOVERNOR_GUARDIAN_ADDRESS })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await cross_chain_canonical_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("FEI after:", new BigNumber(await fei_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());
		

		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============TEST A MINTER MINT============="));
		const mint_amt = new BigNumber("100e18");

		// Add STAKING_REWARDS_DISTRIBUTOR as a minter, for tests
		await cross_chain_canonical_instance.addMinter(STAKING_REWARDS_DISTRIBUTOR, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Mint
		console.log("Canonical before:", new BigNumber(await cross_chain_canonical_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		await cross_chain_canonical_instance.minter_mint(STAKING_REWARDS_DISTRIBUTOR, mint_amt, { from: STAKING_REWARDS_DISTRIBUTOR })
		console.log("Canonical after:", new BigNumber(await cross_chain_canonical_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		
		// Remove STAKING_REWARDS_DISTRIBUTOR as a minter
		await cross_chain_canonical_instance.removeMinter(STAKING_REWARDS_DISTRIBUTOR, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============TEST A WITHDRAWAL============="));
		const withdrawal_amt = exchange_amt;

		console.log("FEI before:", new BigNumber(await fei_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		await cross_chain_canonical_instance.withdrawOldTokens(fei_instance.address, withdrawal_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		console.log("FEI after:", new BigNumber(await fei_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		

	});

	it("Fail Tests ", async () => {
		const test_amount_1 = new BigNumber("1e18");

		// Approval
		await fei_instance.approve(cross_chain_canonical_instance.address, new BigNumber("500e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Lower the mint cap");
		await cross_chain_canonical_instance.setMintCap(new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============TOKEN EXCHANGES============="));

		console.log("---------TRY EXCHANGING INVALID OLD TOKENS---------");
		await expectRevert(
			cross_chain_canonical_instance.exchangeOldTokens(fxs_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Invalid token"
		);

		console.log("---------TRY EXCHANGING WHEN PAUSED---------");
		// Disable
		await cross_chain_canonical_instance.toggleExchanges({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await expectRevert(
			cross_chain_canonical_instance.exchangeOldTokens(fei_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Exchanges paused"
		);
		// Re-Enable
		await cross_chain_canonical_instance.toggleExchanges({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY EXCHANGING OVER THE MINT CAP---------");
		await expectRevert(
			cross_chain_canonical_instance.exchangeOldTokens(fei_instance.address, new BigNumber("250e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Mint cap"
		);

		console.log("---------TRY EXCHANGING MORE THAN YOU HAVE---------");
		await expectRevert(
			cross_chain_canonical_instance.exchangeOldTokens(fei_instance.address, new BigNumber("10000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"TransferHelper: TRANSFER_FROM_FAILED"
		);

		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============TOKEN WITHDRAWALS============="));

		console.log("---------TRY WITHDRAWING OLD TOKENS WITH THE WRONG ACCOUNT---------");
		await expectRevert(
			cross_chain_canonical_instance.withdrawOldTokens(fei_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not owner or timelock"
		);

		console.log("---------TRY WITHDRAWING AN INVALID OLD TOKEN---------");
		await expectRevert(
			cross_chain_canonical_instance.withdrawOldTokens(fxs_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid token"
		);

		console.log("---------TRY WITHDRAWING TOO MANY OLD TOKENS---------");
		await expectRevert(
			cross_chain_canonical_instance.withdrawOldTokens(fei_instance.address, new BigNumber("1000000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"TransferHelper: TRANSFER_FAILED"
		);

		console.log("---------DISABLE AN OLD TOKEN AND THEN TRY TO WITHDRAW IT---------");
		// Disable
		await cross_chain_canonical_instance.toggleOldToken(fei_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await expectRevert(
			cross_chain_canonical_instance.withdrawOldTokens(fxs_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid token"
		);

		// Re-Enable
		await cross_chain_canonical_instance.toggleOldToken(fei_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============MINTING TESTS============="));

		console.log("---------TRY MINTING AS A NON-MINTER---------");
		await expectRevert(
			cross_chain_canonical_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not a minter"
		);

		// Add GOVERNOR_GUARDIAN_ADDRESS as a minter, for tests
		await cross_chain_canonical_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY MINTING OVER THE CAP---------");
		await expectRevert(
			cross_chain_canonical_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("1000000000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Mint cap"
		);

		// Remove GOVERNOR_GUARDIAN_ADDRESS as a minter
		await cross_chain_canonical_instance.removeMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY MINTING AGAIN, NOW THAT GOVERNOR_GUARDIAN_ADDRESS IS NO LONGER A MINTER---------");
		await expectRevert(
			cross_chain_canonical_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not a minter"
		);

		// =========================================================================
		// =========================================================================
		console.log(chalk.blue("=============BURNING TESTS============="));

		console.log("---------TRY BURNING AS A NON-MINTER---------");
		await expectRevert(
			cross_chain_canonical_instance.minter_burn_from(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not a minter"
		);

		// Add GOVERNOR_GUARDIAN_ADDRESS as a minter again, for tests
		await cross_chain_canonical_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY BURNING ANOTHER PERSON'S CANONICAL TOKENS [METHOD 1]---------");
		await expectRevert(
			cross_chain_canonical_instance.minter_burn_from(ORACLE_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"ERC20: burn amount exceeds allowance"
		);

		console.log("---------TRY BURNING ANOTHER PERSON'S CANONICAL TOKENS [METHOD 2]---------");
		await expectRevert(
			cross_chain_canonical_instance.burnFrom(ORACLE_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"ERC20: burn amount exceeds allowance"
		);

		// Remove GOVERNOR_GUARDIAN_ADDRESS as a minter
		await cross_chain_canonical_instance.removeMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});
});