const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const chai = require('chai');
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost());

const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// FRAX core
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// LP Pairs
const IConvexCvxLPRewardPoolCombo = artifacts.require("Misc_AMOs/convex/IConvexCvxLPRewardPoolCombo");

// Staking contracts
const FraxCCFarmV4_cvxUSDPlusFRAXBP = artifacts.require("Staking/Variants/FraxCCFarmV4_cvxUSDPlusFRAXBP");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

contract('FraxCrossChainFarmV3_ERC20-Tests', async (accounts) => {
	let CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let CHAIN_ADDRESSES = CONTRACT_ADDRESSES.arbitrum;

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
	const ADDRESSES_WITH_REWARD_TOKENS = [
		'0x5180db0237291A6449DdA9ed33aD90a38787621c', // FXS
		'0x5180db0237291A6449DdA9ed33aD90a38787621c', // CRV
		'0x5180db0237291A6449DdA9ed33aD90a38787621c', // ARB
		'0x5180db0237291A6449DdA9ed33aD90a38787621c' // OVN
	];
	const REWARD_TOKEN_SEED_AMOUNTS = [
		'1000e18', // FXS
		'100e18', // CRV
		'100e18', // ARB
		'10e18' // OVN
	]
	const REWARD_TOKEN_REFILL_AMOUNTS = [
		'250e18', // FXS
		'25e18', // CRV
		'25e18', // ARB
		'25e17' // OVN
	]
	const ADDRESS_WITH_LP_TOKENS = '0x5180db0237291A6449DdA9ed33aD90a38787621c';

	// Initialize core contract instances
	let canFRAX_instance;
	let canFXS_instance;
	
	// Initialize pair contracts
	let lp_tkn_instance;

	// Initialize staking instances
	let staking_instance;

	// Initialize reward addresses, instances, and symbols
	let rew_addresses = [], rew_instances = [], rew_symbols = [];

	// Initialize reward token balance tracking
	let rew_tkn_bals_before = {};
	for (let i = 0; i < REWARD_TOKEN_SEED_AMOUNTS.length; i++) {
		rew_tkn_bals_before[i] = { 1: {}, 9: {} };
	}
	let rew_tkn_bals_after = structuredClone(rew_tkn_bals_before); // [token index][account][""]

	// Initialize earnings tracking
	let rew_tkn_earned = structuredClone(rew_tkn_bals_before); // [token index][account][phase]

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
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Get instances of the Convex cvxLP 
		lp_tkn_instance = await IConvexCvxLPRewardPoolCombo.at(CHAIN_ADDRESSES.bearer_tokens.cvxUSDPlusFRAXBP);

		// Fill the staking rewards instances
		staking_instance = await FraxCCFarmV4_cvxUSDPlusFRAXBP.deployed();

		// Fill reward token instances and info
		for (let i = 0; i < REWARD_TOKEN_SEED_AMOUNTS.length; i++) {
			rew_addresses[i] = await staking_instance.rewardTokens.call(i);
			rew_instances[i] = await ERC20.at(rew_addresses[i]);
			rew_symbols[i] = await utilities.rewardTokenSymbolFromAddress(rew_addresses[i])
		}
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Initialization related', async () => {
		console.log("=========================Initialization=========================")

		// console.log("------------------------------------------------");
		// console.log("Seed the staking contract with FXS and give COLLATERAL_FRAX_AND_FXS_OWNER some FXS");
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_FXS]
		// });

		// await canFXS_instance.transfer(staking_instance.address, new BigNumber("100e18"), { from: ADDRESS_WITH_FXS });
		// await canFXS_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FXS });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_FXS]
		// });

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with reward tokens");

		for (let i = 0; i < rew_addresses.length; i++) {
			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [ADDRESSES_WITH_REWARD_TOKENS[i]]
			});

			await rew_instances[i].transfer(staking_instance.address, new BigNumber(REWARD_TOKEN_SEED_AMOUNTS[i]), { from: ADDRESSES_WITH_REWARD_TOKENS[i] });

			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [ADDRESSES_WITH_REWARD_TOKENS[i]]
			});
		}

		console.log("------------------------------------------------");
		console.log("Give LPs to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await lp_tkn_instance.transfer(accounts[1], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await lp_tkn_instance.transfer(accounts[9], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		// Add a migrator address
		await staking_instance.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });
	});

	it('Locked stakes', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TRY TESTS WITH LOCKED STAKES."));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		// Print reward token balances
		for (let i = 0; i < rew_addresses.length; i++) {
			// Get reward token balances before everything starts
			rew_tkn_bals_before[i][1]['time0'] = new BigNumber(await rew_instances[i].balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber()
			rew_tkn_bals_before[i][9]['time0'] = new BigNumber(await rew_instances[i].balanceOf(accounts[9])).div(BIG18).toNumber()

			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		}

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await lp_tkn_instance.approve(staking_instance.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await lp_tkn_instance.approve(staking_instance.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await canFRAX_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await canFRAX_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		console.log("Try to stake before initialization [SHOULD FAIL]");
		await expectRevert(
			staking_instance.stakeLocked(uni_pool_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Contract not initialized"
		);

		console.log("Initialize Staking Contract");
		await staking_instance.initializeDefault({ from: STAKING_OWNER });

		// Get the original starting time and period finish
		const original_start_timestamp = (new BigNumber(await time.latest())).toNumber();
		const original_period_end = (new BigNumber(await staking_instance.periodFinish.call())).toNumber();
		console.log("original_start_timestamp: ", original_start_timestamp);
		console.log("original_period_end: ", original_period_end);

		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(uni_pool_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 7 days
		await staking_instance.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await staking_instance.stakeLocked(uni_pool_locked_9, 27.95 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1_0 = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9_0 = await staking_instance.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, true, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		const user_min_vefxs_for_max_boost_1_0 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_0 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_0: ", user_min_vefxs_for_max_boost_1_0.toString());
		console.log("user_min_vefxs_for_max_boost_9_0: ", user_min_vefxs_for_max_boost_9_0.toString());

		const _total_liquidity_locked_0 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		const frax_per_lp_token_0 = new BigNumber(await staking_instance.fraxPerLPToken.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());
		console.log("frax_per_lp_token_0 GLOBAL: ", frax_per_lp_token_0.toString());


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("MID-WEEK-SYNC AND [9] CLAIMS"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		await time.increase(2 * 86400);
		await time.advanceBlock();

		// Sync
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print reward token balances
		console.log(chalk.yellow("--- Before claim ---"));
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		
			// Balance tracking
			rew_tkn_bals_before[i][9]["mid0"] = new BigNumber(await rew_instances[i].balanceOf(accounts[9])).div(BIG18).toNumber();
			console.log(`accounts[9] ${rew_symbols[i]} balance: ${rew_tkn_bals_before[i][9]["mid0"]}`);
		}

		// [9] claims
		console.log(chalk.yellow("--- Claim ---"));
		await staking_instance.getReward({ from: accounts[9] });

		// Print reward token balances
		console.log(chalk.yellow("--- After claim ---"));
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		
			// Balance tracking
			rew_tkn_bals_after[i][9]["mid0"] = new BigNumber(await rew_instances[i].balanceOf(accounts[9])).div(BIG18).toNumber();
			console.log(`accounts[9] ${rew_symbols[i]} balance: ${rew_tkn_bals_after[i][9]["mid0"]}`);

			// Earnings tracking
			rew_tkn_earned[i][9]["mid0"] = (rew_tkn_bals_after[i][9]["mid0"]) - (rew_tkn_bals_before[i][9]["mid0"]);
			console.log(`accounts[9] mid-week part 0 earnings ${rew_symbols[i]}: ${(rew_tkn_earned[i][9]["mid0"])}`);
		}

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("MID-WEEK-SYNC AGAIN AND [9] CLAIMS AGAIN"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		await time.increase(2 * 86400);
		await time.advanceBlock();

		// Sync
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print reward token balances
		console.log(chalk.yellow("--- Before claim ---"));
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		
			// Balance tracking
			rew_tkn_bals_before[i][9]["mid1"] = new BigNumber(await rew_instances[i].balanceOf(accounts[9])).div(BIG18).toNumber();
			console.log(`accounts[9] ${rew_symbols[i]} balance: ${rew_tkn_bals_before[i][9]["mid1"]}`);
		}

		// [9] claims
		console.log(chalk.yellow("--- Claim ---"));
		await staking_instance.getReward({ from: accounts[9] });

		// Print reward token balances
		console.log(chalk.yellow("--- After claim ---"));
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		
			// Balance tracking
			rew_tkn_bals_after[i][9]["mid1"] = new BigNumber(await rew_instances[i].balanceOf(accounts[9])).div(BIG18).toNumber();
			console.log(`accounts[9] ${rew_symbols[i]} balance: ${rew_tkn_bals_after[i][9]["mid1"]}`);

			// Earnings tracking
			rew_tkn_earned[i][9]["mid1"] = (rew_tkn_bals_after[i][9]["mid1"]) - (rew_tkn_bals_before[i][9]["mid1"]);
			console.log(`accounts[9] mid-week part 1 earnings ${rew_symbols[i]}: ${(rew_tkn_earned[i][9]["mid1"])}`);
		}

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WAIT UNTIL THE END OF THE PERIOD (WHICH IS NEW DUE TO ROLLING"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		const period_end_0 = (new BigNumber(await staking_instance.periodFinish.call())).toNumber();
		console.log("current_timestamp_0: ", current_timestamp_0);
		console.log("original_period_end: ", original_period_end);
		console.log("period_end_0: ", period_end_0);
		const increase_time_0 = (period_end_0 - current_timestamp_0);
		console.log("increase_time_0 (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0 + (15 * 86400));
		await time.advanceBlock();


		// Sync afterwards
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Print reward token balances
		console.log(chalk.yellow("--- Before claim ---"));
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		}

		const user_min_vefxs_for_max_boost_1_1 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_1 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_1: ", user_min_vefxs_for_max_boost_1_1.toString());
		console.log("user_min_vefxs_for_max_boost_9_1: ", user_min_vefxs_for_max_boost_9_1.toString());

		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: STAKING_OWNER });

		// Print earnings
		let staking_earned_1 = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		let staking_earned_9 = await staking_instance.earned.call(accounts[9]);
		let duration_reward = await staking_instance.getRewardForDuration.call();
		for (let i = 0; i < rew_addresses.length; i++) {
			// accounts[1] never called getReward yet
			rew_tkn_earned[i][1]["week1"] = new BigNumber(staking_earned_1[i]).div(BIG18).toNumber();
			console.log(`accounts[1] earnings after 1 week [${rew_symbols[i]}]: ${rew_tkn_earned[i][1]["week1"]}`);

			// For accounts[9], sum the previous claims, plus the unclaimed
			const acct9_unclaimed = new BigNumber(staking_earned_9[i]).div(BIG18).toNumber();
			rew_tkn_earned[i][9]["week1"] = acct9_unclaimed + rew_tkn_earned[i][9]["mid0"] + rew_tkn_earned[i][9]["mid1"];
			console.log(`accounts[9] earnings after 1 week [${rew_symbols[i]}]: ${rew_tkn_earned[i][9]["week1"]}`);
		
			// Get the effective / actual weekly and yearly rewards being emitted
			const reward_week_1 = rew_tkn_earned[i][1]["week1"] + rew_tkn_earned[i][9]["week1"];
			const effective_yearly_reward_at_week_1 = reward_week_1 * 52.1429;
			console.log(`Effective weekly reward at week 1 [${rew_symbols[i]}]: ${reward_week_1}`);
			console.log(`Effective yearly reward at week 1 [${rew_symbols[i]}]: ${effective_yearly_reward_at_week_1}`);
		
			// Get the expected weekly and yearly rewards
			const duration_reward_tkn = new BigNumber(duration_reward[i]).div(BIG18).toNumber();
			const yearly_reward_tkn = duration_reward_tkn * 52.1429
			console.log(`Expected weekly reward at week 1 [${rew_symbols[i]}]: ${duration_reward_tkn}`);
			console.log(`Expected yearly reward at week 1 [${rew_symbols[i]}]: ${yearly_reward_tkn}`);

			// Make sure emissions happened properly
			const expected_tkn_amount = new BigNumber(REWARD_TOKEN_SEED_AMOUNTS[i]).div(BIG18).toNumber();
			expect(reward_week_1).to.be.almost(expected_tkn_amount, .001 * expected_tkn_amount);
		}

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, true, { from: accounts[9] }));

		// Claim [9]
		await staking_instance.getReward({ from: accounts[9] });

		// Print reward token balances
		console.log(chalk.yellow("--- After claim ---"));
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		
			// Balance tracking
			rew_tkn_bals_after[i][1]["week1"] = new BigNumber(await rew_instances[i].balanceOf(accounts[1])).div(BIG18).toNumber();
			rew_tkn_bals_after[i][9]["week1"] = new BigNumber(await rew_instances[i].balanceOf(accounts[9])).div(BIG18).toNumber();
		
			const acc1_diff = rew_tkn_bals_after[i][1]["week1"] - rew_tkn_bals_before[i][1]["time0"];
			const acc9_diff = rew_tkn_bals_after[i][9]["week1"] - rew_tkn_bals_before[i][9]["time0"];
			console.log(chalk.green(`accounts[1] ${rew_symbols[i]} balance change: ${acc1_diff}`));
			console.log(chalk.green(`accounts[9] ${rew_symbols[i]} balance change: ${acc9_diff}`));
			console.log(chalk.green.bold(`Total ${rew_symbols[i]} balance change: ${acc1_diff + acc9_diff}`));


		}

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("ADVANCING 28 DAYS (WEEK 5)"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		const period_end_1 = await staking_instance.periodFinish.call();
		
		const increase_time_1 = (period_end_1 - current_timestamp_1) + ((3 * 7) * 86400);
		console.log("increase_time_1 (days): ", increase_time_1 / 86400);
		await time.increase(increase_time_1);
		await time.advanceBlock();

		// Sync afterwards
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);
		
		// Print reward token balances
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		}
		
		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		const user_min_vefxs_for_max_boost_1_2 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_2 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_2: ", user_min_vefxs_for_max_boost_1_2.toString());
		console.log("user_min_vefxs_for_max_boost_9_2: ", user_min_vefxs_for_max_boost_9_2.toString());

		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print earnings
		staking_earned_1 = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		staking_earned_9 = await staking_instance.earned.call(accounts[9]);
		duration_reward = await staking_instance.getRewardForDuration.call();
		for (let i = 0; i < rew_addresses.length; i++) {
			// accounts[1]
			rew_tkn_earned[i][1]["week5"] = new BigNumber(staking_earned_1[i]).div(BIG18).toNumber();
			console.log(`accounts[1] earnings after 5 weeks [${rew_symbols[i]}]: ${rew_tkn_earned[i][1]["week5"]}`);

			// accounts[9]
			const acct9_unclaimed = new BigNumber(staking_earned_9[i]).div(BIG18).toNumber();
			rew_tkn_earned[i][9]["week5"] = acct9_unclaimed;
			console.log(`accounts[9] earnings after 5 weeks [${rew_symbols[i]}]: ${rew_tkn_earned[i][9]["week5"]}`);

			// Get the effective / actual weekly and yearly rewards being emitted
			const reward_week_5 = rew_tkn_earned[i][1]["week5"] + rew_tkn_earned[i][9]["week5"];
			const effective_yearly_reward_at_week_5 = reward_week_5 * 52.1429;
			console.log(`Effective weekly reward after 5 weeks [${rew_symbols[i]}]: ${reward_week_5}`);
			console.log(`Effective yearly reward after 5 weeks [${rew_symbols[i]}]: ${effective_yearly_reward_at_week_5}`);

			// Get the expected weekly and yearly rewards
			const duration_reward_tkn = new BigNumber(duration_reward[i]).div(BIG18).toNumber();
			const yearly_reward_tkn = duration_reward_tkn * 52.1429
			console.log(`Expected weekly reward after 5 weeks [${rew_symbols[i]}]: ${duration_reward_tkn}`);
			console.log(`Expected yearly reward after 5 weeks [${rew_symbols[i]}]: ${yearly_reward_tkn}`);

			// Make sure nothing emitted
			const expected_tkn_amount = 0;
			expect(reward_week_5).to.be.almost(expected_tkn_amount, .01);
		}

		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Add more to a lock"));

		// Print the info for the stake
		let add_more_before = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 1);
		console.log("add_more_before: ", utilities.cleanLockedStake(add_more_before));

		// Add 1 more LP token to the lock
		const addl_amt_add = new BigNumber("1e18");
		await lp_tkn_instance.approve(staking_instance.address, addl_amt_add, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.lockAdditional(add_more_before.kek_id, addl_amt_add, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the info for the stake
		const add_more_after = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 1);
		console.log("add_more_after: ", utilities.cleanLockedStake(add_more_after));

		// Make sure the liquidity has increased
		const add_liq_before = new BigNumber(add_more_before.liquidity);
		const add_liq_after = new BigNumber(add_more_after.liquidity);
		const add_liq_diff = add_liq_after.minus(add_liq_before);
		console.log("Add liq diff: ", add_liq_diff.toString());
		assert(add_liq_after.isGreaterThan(add_liq_before), `Liquidity did not increase`);

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("REFILL REWARDS AND SYNC"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		for (let i = 0; i < rew_addresses.length; i++) {
			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [ADDRESSES_WITH_REWARD_TOKENS[i]]
			});

			await rew_instances[i].transfer(staking_instance.address, new BigNumber(REWARD_TOKEN_REFILL_AMOUNTS[i]), { from: ADDRESSES_WITH_REWARD_TOKENS[i] });

			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [ADDRESSES_WITH_REWARD_TOKENS[i]]
			});
		}

		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("CHECK EARNINGS (SHOULD BE ZERO)"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Print reward token balances
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		}

		// Print earnings
		staking_earned_1 = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		staking_earned_9 = await staking_instance.earned.call(accounts[9]);
		duration_reward = await staking_instance.getRewardForDuration.call();
		for (let i = 0; i < rew_addresses.length; i++) {
			// accounts[1] 
			rew_tkn_earned[i][1]["week5_PR"] = new BigNumber(staking_earned_1[i]).div(BIG18).toNumber();
			console.log(`accounts[1] earnings after 5 weeks (post refill) [${rew_symbols[i]}]: ${rew_tkn_earned[i][1]["week5_PR"]}`);

			// accounts[9]
			const acct9_unclaimed = new BigNumber(staking_earned_9[i]).div(BIG18).toNumber();
			rew_tkn_earned[i][9]["week5_PR"] = acct9_unclaimed;
			console.log(`accounts[9] earnings after 5 weeks (post refill) [${rew_symbols[i]}]: ${rew_tkn_earned[i][9]["week5_PR"]}`);

			// Get the effective / actual weekly and yearly rewards being emitted
			const reward_week_5_PR = rew_tkn_earned[i][1]["week5_PR"] + rew_tkn_earned[i][9]["week5_PR"];
			const effective_yearly_reward_at_week_5_PR = reward_week_5_PR * 52.1429;
			console.log(`Effective weekly reward after 5 weeks (post refill) [${rew_symbols[i]}]: ${reward_week_5_PR}`);
			console.log(`Effective yearly reward after 5 weeks (post refill) [${rew_symbols[i]}]: ${effective_yearly_reward_at_week_5_PR}`);

			// Get the expected weekly and yearly rewards
			const duration_reward_tkn = new BigNumber(duration_reward[i]).div(BIG18).toNumber();
			const yearly_reward_tkn = duration_reward_tkn * 52.1429
			console.log(`Expected weekly reward after 5 weeks (post refill) [${rew_symbols[i]}]: ${duration_reward_tkn}`);
			console.log(`Expected yearly reward after 5 weeks (post refill) [${rew_symbols[i]}]: ${yearly_reward_tkn}`);

			// Make sure nothing emitted
			const expected_tkn_amount = 0;
			expect(reward_week_5_PR).to.be.almost(expected_tkn_amount, .01);
		}


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("ADVANCE TO DAY 35 (next period, week 6)"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_2 = (new BigNumber(await time.latest())).toNumber();
		const period_end_2 = await staking_instance.periodFinish.call();

		// Advance ~7 days
		const increase_time_2 = (period_end_2 - current_timestamp_2);
		console.log("increase_time_2 (days): ", increase_time_2 / 86400);
		await time.increase(increase_time_2);
		await time.advanceBlock();

		// Sync afterwards
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print reward token balances
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		}

		// Print earnings
		staking_earned_1 = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		staking_earned_9 = await staking_instance.earned.call(accounts[9]);
		duration_reward = await staking_instance.getRewardForDuration.call();
		for (let i = 0; i < rew_addresses.length; i++) {
			// accounts[1] 
			rew_tkn_earned[i][1]["week6"] = new BigNumber(staking_earned_1[i]).div(BIG18).toNumber();
			console.log(`accounts[1] earnings after 6 weeks (post refill) [${rew_symbols[i]}]: ${rew_tkn_earned[i][1]["week6"]}`);

			// accounts[9]
			const acct9_unclaimed = new BigNumber(staking_earned_9[i]).div(BIG18).toNumber();
			rew_tkn_earned[i][9]["week6"] = acct9_unclaimed;
			console.log(`accounts[9] earnings after 6 weeks (post refill) [${rew_symbols[i]}]: ${rew_tkn_earned[i][9]["week6"]}`);

			// Get the effective / actual weekly and yearly rewards being emitted
			const reward_week_6 = rew_tkn_earned[i][1]["week6"] + rew_tkn_earned[i][9]["week6"];
			const effective_yearly_reward_at_week_6 = reward_week_6 * 52.1429;
			console.log(`Effective weekly reward after 6 weeks (post refill) [${rew_symbols[i]}]: ${reward_week_6}`);
			console.log(`Effective yearly reward after 6 weeks (post refill) [${rew_symbols[i]}]: ${effective_yearly_reward_at_week_6}`);

			// Get the expected weekly and yearly rewards
			const duration_reward_tkn = new BigNumber(duration_reward[i]).div(BIG18).toNumber();
			const yearly_reward_tkn = duration_reward_tkn * 52.1429
			console.log(`Expected weekly reward after 6 weeks (post refill) [${rew_symbols[i]}]: ${duration_reward_tkn}`);
			console.log(`Expected yearly reward after 6 weeks (post refill) [${rew_symbols[i]}]: ${yearly_reward_tkn}`);

			// Make sure emissions happened properly
			const expected_tkn_amount = new BigNumber(REWARD_TOKEN_REFILL_AMOUNTS[i]).div(BIG18).toNumber();
			expect(reward_week_6).to.be.almost(expected_tkn_amount, .001 * expected_tkn_amount);
		}


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WITHDRAW STAKES"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Account 9 withdraws and claims its locked stake
		await staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, true, { from: accounts[9] });
		await staking_instance.getReward({ from: accounts[9] });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await staking_instance.unlockStakes({ from: STAKING_OWNER });
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		const user_min_vefxs_for_max_boost_1_3 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_3 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_3: ", user_min_vefxs_for_max_boost_1_3.toString());
		console.log("user_min_vefxs_for_max_boost_9_3: ", user_min_vefxs_for_max_boost_9_3.toString());

		const _total_liquidity_locked_2 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		const frax_per_lp_token_2 = new BigNumber(await staking_instance.fraxPerLPToken.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());
		console.log("frax_per_lp_token_2 GLOBAL: ", frax_per_lp_token_2.toString());

		// Claim rewards
		console.log("Claim rewards");
		await staking_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.getReward({ from: accounts[9] });

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("CHECK EARNINGS AGAIN"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Sync beforehand
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_3 = (new BigNumber(await time.latest())).toNumber();
		const period_end_3 = await staking_instance.periodFinish.call();

		// Advance to the next period
		const increase_time_3 = (period_end_3 - current_timestamp_3);
		console.log("increase_time_3 (days): ", increase_time_3 / 86400);
		await time.increase(increase_time_3);
		await time.advanceBlock();

		// Sync afterwards
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print reward token balances
		for (let i = 0; i < rew_addresses.length; i++) {
			console.log(`Farm ${rew_symbols[i]} balance: ${new BigNumber(await rew_instances[i].balanceOf(staking_instance.address)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} owed: ${new BigNumber(await staking_instance.ttlRewsOwed(i)).div(BIG18).toNumber()}`);
			console.log(`Farm ${rew_symbols[i]} paid: ${new BigNumber(await staking_instance.ttlRewsPaid(i)).div(BIG18).toNumber()}`);
		}

		// Print earnings
		staking_earned_1 = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		staking_earned_9 = await staking_instance.earned.call(accounts[9]);
		duration_reward = await staking_instance.getRewardForDuration.call();
		for (let i = 0; i < rew_addresses.length; i++) {
			// accounts[1] 
			rew_tkn_earned[i][1]["week6_PW"] = new BigNumber(staking_earned_1[i]).div(BIG18).toNumber();
			console.log(`accounts[1] earnings after 6 weeks (post withdrawal) [${rew_symbols[i]}]: ${rew_tkn_earned[i][1]["week6_PW"]}`);

			// accounts[9]
			const acct9_unclaimed = new BigNumber(staking_earned_9[i]).div(BIG18).toNumber();
			rew_tkn_earned[i][9]["week6_PW"] = acct9_unclaimed;
			console.log(`accounts[9] earnings after 6 weeks (post withdrawal) [${rew_symbols[i]}]: ${rew_tkn_earned[i][9]["week6_PW"]}`);

			// Get the effective / actual weekly and yearly rewards being emitted
			const reward_week_6_PW = rew_tkn_earned[i][1]["week6_PW"] + rew_tkn_earned[i][9]["week6_PW"];
			const effective_yearly_reward_at_week_6 = reward_week_6_PW * 52.1429;
			console.log(`Effective weekly reward after 6 weeks (post withdrawal) [${rew_symbols[i]}]: ${reward_week_6_PW}`);
			console.log(`Effective yearly reward after 6 weeks (post withdrawal) [${rew_symbols[i]}]: ${effective_yearly_reward_at_week_6}`);

			// Get the expected weekly and yearly rewards
			const duration_reward_tkn = new BigNumber(duration_reward[i]).div(BIG18).toNumber();
			const yearly_reward_tkn = duration_reward_tkn * 52.1429
			console.log(`Expected weekly reward after 6 weeks (post withdrawal) [${rew_symbols[i]}]: ${duration_reward_tkn}`);
			console.log(`Expected yearly reward after 6 weeks (post withdrawal) [${rew_symbols[i]}]: ${yearly_reward_tkn}`);

			// Make sure emissions happened properly
			const expected_tkn_amount = 0;
			expect(reward_week_6_PW).to.be.almost(expected_tkn_amount, .001);
		}

	});


	it("Migration Staking / Withdrawal Tests", async () => {

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Untoggle the stake unlocking
		await staking_instance.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await staking_instance.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf LP:", (new BigNumber(await lp_tkn_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await lp_tkn_instance.approve(staking_instance.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_stake_structs = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await lp_tkn_instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await lp_tkn_instance.approve(staking_instance.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		let block_time_current_1 = (await time.latest()).toNumber();
		await staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await lp_tkn_instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_2, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			staking_instance.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO EMERGENCY WITHDRAWALS WHILE NOT IN MIGRATION---------");
		await expectRevert(
			staking_instance.recoverERC20(lp_tkn_instance.address, test_amount_1, { from: STAKING_OWNER }),
			"Not in migration"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_3 = (await time.latest()).toNumber();
		await expectRevert(
			staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_3, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await staking_instance.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await staking_instance.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await staking_instance.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

	});
});