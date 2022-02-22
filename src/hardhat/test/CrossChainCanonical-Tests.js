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

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const anyFRAX = artifacts.require("ERC20/__CROSSCHAIN/anyFRAX");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");

// ERC20
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

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
	let anyFRAX_instance;
	let canFRAX_instance;

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
		anyFRAX_instance = await anyFRAX.deployed();

		// Fill the cross chain canonical instances
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Initialization related', async () => {
		console.log("=========================Initialization=========================")
		console.log(chalk.gray("---------------------------"));
		console.log("Give the canonical token address some anyFRAX");
		await anyFRAX_instance.transfer(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give the GOVERNOR_GUARDIAN_ADDRESS address some anyFRAX");
		await anyFRAX_instance.transfer(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give the ORACLE_ADDRESS address some anyFRAX, for later tests");
		await anyFRAX_instance.transfer(ORACLE_ADDRESS, new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give the TIMELOCK_ADMIN address some anyFRAX, for later tests");
		await anyFRAX_instance.transfer(TIMELOCK_ADMIN, new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give the STAKING_REWARDS_DISTRIBUTOR address some anyFRAX, for later tests");
		await anyFRAX_instance.transfer(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.gray("---------------------------"));
		console.log("Give ORACLE_ADDRESS some canonical tokens, for later tests");
		await canFRAX_instance.transfer(ORACLE_ADDRESS, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give TIMELOCK_ADMIN some canonical tokens, for later tests");
		await canFRAX_instance.transfer(TIMELOCK_ADMIN, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give the STAKING_REWARDS_DISTRIBUTOR some canonical tokens for later tests");
		await canFRAX_instance.transfer(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		console.log(chalk.gray("---------------------------"));
		console.log("Raise the mint cap");
		await canFRAX_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.gray("---------------------------"));
		console.log("Set TIMELOCK_ADMIN as fee exempt");
		await canFRAX_instance.toggleFeesForAddress(TIMELOCK_ADMIN, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.gray("---------------------------"));
		console.log("Set the fees at the same (0.04%), as a test");
		await canFRAX_instance.setSwapFees(anyFRAX_instance.address, 400, 400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.gray("---------------------------"));
		console.log("List all old tokens");
		const all_bridge_tokens = await canFRAX_instance.allBridgeTokens.call();
		console.log(all_bridge_tokens);
	});

	it('Main functions', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TEST MAIN FUNCTIONS"));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST AN EXCHANGE [OLD -> NEW, non-minter, non exempt]============="));
		const exchange_amt = new BigNumber("100e18");

		// Approve
		await anyFRAX_instance.approve(canFRAX_instance.address, new BigNumber("500e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());

		// Exchange
		await canFRAX_instance.exchangeOldForCanonical(anyFRAX_instance.address, exchange_amt, { from: GOVERNOR_GUARDIAN_ADDRESS })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(GOVERNOR_GUARDIAN_ADDRESS)).div(BIG18).toNumber());
		

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============ADD STAKING_REWARDS_DISTRIBUTOR AS A MINTER============="));
		await canFRAX_instance.addMinter(STAKING_REWARDS_DISTRIBUTOR, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST AN EXCHANGE [OLD -> NEW, minter]============="));
		const exchange_amt_1 = new BigNumber("100e18");

		// Approve
		await anyFRAX_instance.approve(canFRAX_instance.address, new BigNumber("500e18"), { from: STAKING_REWARDS_DISTRIBUTOR });

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());

		// Exchange
		await canFRAX_instance.exchangeOldForCanonical(anyFRAX_instance.address, exchange_amt_1, { from: STAKING_REWARDS_DISTRIBUTOR })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST AN EXCHANGE [OLD -> NEW, non-minter, fee-exempt]============="));
		const exchange_amt_2 = new BigNumber("100e18");

		// Approve
		await anyFRAX_instance.approve(canFRAX_instance.address, new BigNumber("500e18"), { from: TIMELOCK_ADMIN });

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());
		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());

		// Exchange
		await canFRAX_instance.exchangeOldForCanonical(anyFRAX_instance.address, exchange_amt_2, { from: TIMELOCK_ADMIN })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());
		

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST A MINTER MINT============="));
		const mint_amt = new BigNumber("100e18");

		// Mint
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		await canFRAX_instance.minter_mint(STAKING_REWARDS_DISTRIBUTOR, mint_amt, { from: STAKING_REWARDS_DISTRIBUTOR })
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		
		
		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST A MINTER BURN============="));
		const burn_amt = new BigNumber("10e18");

		// Mint
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		await canFRAX_instance.minter_burn(burn_amt, { from: STAKING_REWARDS_DISTRIBUTOR })
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST AN EXCHANGE [NEW -> OLD, minter]============="));
		const exchange_amt2 = new BigNumber("25e18");

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());

		// Exchange
		await canFRAX_instance.exchangeCanonicalForOld(anyFRAX_instance.address, exchange_amt2, { from: STAKING_REWARDS_DISTRIBUTOR })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber());
		
		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST AN EXCHANGE [NEW -> OLD, non-minter]============="));
		const exchange_amt3 = new BigNumber("10e18");

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(ORACLE_ADDRESS)).div(BIG18).toNumber());
		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(ORACLE_ADDRESS)).div(BIG18).toNumber());

		// Exchange
		await canFRAX_instance.exchangeCanonicalForOld(anyFRAX_instance.address, exchange_amt3, { from: ORACLE_ADDRESS })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(ORACLE_ADDRESS)).div(BIG18).toNumber());
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(ORACLE_ADDRESS)).div(BIG18).toNumber());
		

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST AN EXCHANGE [NEW -> OLD, non-minter, fee exempt]============="));
		const exchange_amt4 = new BigNumber("10e18");

		// Note the balances before
		console.log("Canonical before:", new BigNumber(await canFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());
		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());

		// Exchange
		await canFRAX_instance.exchangeCanonicalForOld(anyFRAX_instance.address, exchange_amt4, { from: TIMELOCK_ADMIN })

		// Note the balances after
		console.log("Canonical after:", new BigNumber(await canFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(TIMELOCK_ADMIN)).div(BIG18).toNumber());

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============REMOVE STAKING_REWARDS_DISTRIBUTOR AS A MINTER============="));
		await canFRAX_instance.removeMinter(STAKING_REWARDS_DISTRIBUTOR, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TEST A WITHDRAWAL============="));
		const withdrawal_amt = exchange_amt4;

		console.log("anyFRAX before:", new BigNumber(await anyFRAX_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		await canFRAX_instance.withdrawBridgeTokens(anyFRAX_instance.address, withdrawal_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		console.log("anyFRAX after:", new BigNumber(await anyFRAX_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
	
	});

	it("Fail Tests ", async () => {
		const test_amount_1 = new BigNumber("1e18");

		// Approval
		await anyFRAX_instance.approve(canFRAX_instance.address, new BigNumber("500e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Lower the mint cap");
		await canFRAX_instance.setMintCap(new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TOKEN EXCHANGES============="));

		console.log("---------TRY EXCHANGING INVALID OLD TOKENS---------");
		await expectRevert(
			canFRAX_instance.exchangeOldForCanonical(frax_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Invalid old token"
		);

		console.log("---------TRY EXCHANGING WHEN PAUSED---------");
		// Disable
		await canFRAX_instance.toggleExchanges({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await expectRevert(
			canFRAX_instance.exchangeOldForCanonical(anyFRAX_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Exchanges paused"
		);
		// Re-Enable
		await canFRAX_instance.toggleExchanges({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY EXCHANGING OVER THE MINT CAP---------");
		await expectRevert(
			canFRAX_instance.exchangeOldForCanonical(anyFRAX_instance.address, new BigNumber("250e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Mint cap"
		);

		console.log("---------TRY EXCHANGING MORE THAN YOU HAVE---------");
		await expectRevert(
			canFRAX_instance.exchangeOldForCanonical(anyFRAX_instance.address, new BigNumber("10000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"TransferHelper: TRANSFER_FROM_FAILED"
		);


		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============TOKEN WITHDRAWALS============="));

		console.log("---------TRY WITHDRAWING OLD TOKENS WITH THE WRONG ACCOUNT---------");
		await expectRevert(
			canFRAX_instance.withdrawBridgeTokens(anyFRAX_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not minter, owner, or tlck"
		);

		console.log("---------TRY WITHDRAWING AN INVALID OLD TOKEN---------");
		await expectRevert(
			canFRAX_instance.withdrawBridgeTokens(frax_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid old token"
		);

		console.log("---------TRY WITHDRAWING TOO MANY OLD TOKENS---------");
		await expectRevert(
			canFRAX_instance.withdrawBridgeTokens(anyFRAX_instance.address, new BigNumber("1000000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"TransferHelper: TRANSFER_FAILED"
		);

		console.log("---------DISABLE AN OLD TOKEN AND THEN TRY TO WITHDRAW IT---------");
		// Disable
		await canFRAX_instance.toggleBridgeToken(anyFRAX_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await expectRevert(
			canFRAX_instance.withdrawBridgeTokens(anyFRAX_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid old token"
		);

		// Re-Enable
		await canFRAX_instance.toggleBridgeToken(anyFRAX_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============MINTING TESTS============="));

		console.log("---------TRY MINTING AS A NON-MINTER---------");
		await expectRevert(
			canFRAX_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not a minter"
		);

		// Add GOVERNOR_GUARDIAN_ADDRESS as a minter, for tests
		await canFRAX_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY MINTING OVER THE CAP---------");
		await expectRevert(
			canFRAX_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("1000000000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Mint cap"
		);

		// Remove GOVERNOR_GUARDIAN_ADDRESS as a minter
		await canFRAX_instance.removeMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY MINTING AGAIN, NOW THAT GOVERNOR_GUARDIAN_ADDRESS IS NO LONGER A MINTER---------");
		await expectRevert(
			canFRAX_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"Not a minter"
		);

		// =========================================================================
		// =========================================================================
		console.log(chalk.hex("#1da1f2")("=============BURNING TESTS============="));

		// Add GOVERNOR_GUARDIAN_ADDRESS as a minter again, for tests
		await canFRAX_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY BURNING ANOTHER PERSON'S CANONICAL TOKENS [METHOD 1]---------");
		await expectRevert(
			canFRAX_instance.burnFrom(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
			"ERC20: burn amount exceeds allowance"
		);

		// Remove GOVERNOR_GUARDIAN_ADDRESS as a minter
		await canFRAX_instance.removeMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});
});