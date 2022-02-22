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
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// LP Pairs
const I2pool = artifacts.require("Misc_AMOs/curve/I2pool");
const ISaddleLPToken = artifacts.require("Misc_AMOs/saddle/ISaddleLPToken");

// Staking contracts
const FraxCCFarmV2_ArbiCurveVSTFRAX = artifacts.require("Staking/Variants/FraxCCFarmV2_ArbiCurveVSTFRAX");
const FraxCCFarmV2_SaddleArbUSDv2 = artifacts.require("Staking/Variants/FraxCCFarmV2_SaddleArbUSDv2");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

contract('FraxCrossChainFarmV2-Tests', async (accounts) => {
	let CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let CHAIN_ADDRESSES = CONTRACT_ADDRESSES.arbitrum;

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
	const ADDRESS_WITH_FXS = '0xbCa9a9Aab13a68d311160D4f997E3D783Da865Fb';
	const ADDRESS_WITH_REW1_TKN = '0xbCa9a9Aab13a68d311160D4f997E3D783Da865Fb';
	const ADDRESS_WITH_LP_TOKENS = '0xbCa9a9Aab13a68d311160D4f997E3D783Da865Fb';

	// Initialize core contract instances
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize reward token instance
	let rew1_tkn_instance;
	
	// Initialize pair contracts
	let lp_tkn_instance;

	// Initialize staking instances
	let staking_instance;

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
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Get instances of the Curve pair 
		lp_tkn_instance = await I2pool.at(CHAIN_ADDRESSES.pair_tokens["Curve VSTFRAX-f"]);
		// lp_tkn_instance = await ISaddleLPToken.at(CHAIN_ADDRESSES.bearer_tokens.saddleArbUSDv2);

		// Fill the staking rewards instances
		staking_instance = await FraxCCFarmV2_ArbiCurveVSTFRAX.deployed();

		// Fill reward token instance
		const rew1_address = await staking_instance.rewardsToken1.call();
		rew1_tkn_instance = await ERC20.at(rew1_address);
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
		console.log("Seed the staking contract with FXS and give COLLATERAL_FRAX_AND_FXS_OWNER some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await canFXS_instance.transfer(staking_instance.address, new BigNumber("100e18"), { from: ADDRESS_WITH_FXS });
		await canFXS_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with REW1 tokens");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_REW1_TKN]
		});

		await rew1_tkn_instance.transfer(staking_instance.address, new BigNumber("10e18"), { from: ADDRESS_WITH_REW1_TKN });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_REW1_TKN]
		});

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

		// Get FXS balances before everything starts
		const fxs_bal_acc_1_time0 = new BigNumber(await canFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const fxs_bal_acc_9_time0 = new BigNumber(await canFXS_instance.balanceOf(accounts[9])).div(BIG18).toNumber();

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

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
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
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

		// Print balances
		console.log(chalk.yellow("--- Before claim ---"));
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		// [9] claims
		console.log(chalk.yellow("--- Claim ---"));
		const fxs_bal_9_mid0_before = new BigNumber(await canFXS_instance.balanceOf(accounts[9]));
		const token1_bal_9_mid0_before = new BigNumber(await rew1_tkn_instance.balanceOf(accounts[9]));
		await staking_instance.getReward({ from: accounts[9] });
		const fxs_bal_9_mid0_after = new BigNumber(await canFXS_instance.balanceOf(accounts[9]));
		const token1_bal_9_mid0_after = new BigNumber(await rew1_tkn_instance.balanceOf(accounts[9]));
		const staking_earned_9_mid0_fxs = (fxs_bal_9_mid0_after).minus(fxs_bal_9_mid0_before);
		const staking_earned_9_mid0_token1 = (token1_bal_9_mid0_after).minus(token1_bal_9_mid0_before);
		console.log("accounts[9] mid-week part 0 earnings [FXS]: ", (staking_earned_9_mid0_fxs).div(BIG18).toNumber());
		console.log("accounts[9] mid-week part 0 earnings [REW1]: ", staking_earned_9_mid0_token1.div(BIG18).toNumber());

		// Print balances
		console.log(chalk.yellow("--- After claim ---"));
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("MID-WEEK-SYNC AGAIN AND [9] CLAIMS AGAIN"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		await time.increase(2 * 86400);
		await time.advanceBlock();

		// Sync
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print balances
		console.log(chalk.yellow("--- Before claim ---"));
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		// [9] claims
		console.log(chalk.yellow("--- Claim ---"));
		const fxs_bal_9_mid1_before = new BigNumber(await canFXS_instance.balanceOf(accounts[9]));
		const token1_bal_9_mid1_before = new BigNumber(await rew1_tkn_instance.balanceOf(accounts[9]));
		await staking_instance.getReward({ from: accounts[9] });
		const fxs_bal_9_mid1_after = new BigNumber(await canFXS_instance.balanceOf(accounts[9]));
		const token1_bal_9_mid1_after = new BigNumber(await rew1_tkn_instance.balanceOf(accounts[9]));
		const staking_earned_9_mid1_fxs = (fxs_bal_9_mid1_after).minus(fxs_bal_9_mid1_before);
		const staking_earned_9_mid1_token1 = (token1_bal_9_mid1_after).minus(token1_bal_9_mid1_before);
		console.log("accounts[9] mid-week part 1 earnings [FXS]: ", (staking_earned_9_mid1_fxs).div(BIG18).toNumber());
		console.log("accounts[9] mid-week part 1 earnings [REW1]: ", staking_earned_9_mid1_token1.div(BIG18).toNumber());
		
		// Print balances
		console.log(chalk.yellow("--- After claim ---"));
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WAIT UNTIL THE END OF THE 1st PERIOD"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		const period_end_0 = await staking_instance.periodFinish.call();

		const increase_time_0 = (period_end_0 - current_timestamp_0);
		console.log("increase_time_0 (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
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

		// Print balances
		console.log(chalk.yellow("--- Before claim ---"));
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		const user_min_vefxs_for_max_boost_1_1 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_1 = new BigNumber(await staking_instance.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_1: ", user_min_vefxs_for_max_boost_1_1.toString());
		console.log("user_min_vefxs_for_max_boost_9_1: ", user_min_vefxs_for_max_boost_9_1.toString());

		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: STAKING_OWNER });

		const staking_earned_1 = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1[0]).div(BIG18);
		const staking_earned_1_token1 = new BigNumber(staking_earned_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [REW1]: ", staking_earned_1_token1.toString());

		const staking_earned_9 = await staking_instance.earned.call(accounts[9]);
		const staking_earned_9_fxs = (new BigNumber(staking_earned_9[0])).plus(staking_earned_9_mid0_fxs).plus(staking_earned_9_mid1_fxs).div(BIG18);
		const staking_earned_9_token1 = (new BigNumber(staking_earned_9[1])).plus(staking_earned_9_mid0_token1).plus(staking_earned_9_mid1_token1).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [REW1]: ", staking_earned_9_token1.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const reward_week_1_token1 = (staking_earned_1_token1).plus(staking_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [REW1]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [REW1]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_reward_1 = await staking_instance.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_reward_1[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_1_fxs.toString());
		console.log("Expected weekly reward [REW1]: ", duration_reward_1_token1.toString());
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [REW1]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		// Claim [9]
		await staking_instance.getReward({ from: accounts[9] });

		// Print balances
		console.log(chalk.yellow("--- After claim ---"));
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		const fxs_bal_acc_1_time1 = new BigNumber(await canFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const fxs_bal_acc_9_time1 = new BigNumber(await canFXS_instance.balanceOf(accounts[9])).div(BIG18).toNumber();
		console.log(chalk.green("accounts[1] FXS balance change:", fxs_bal_acc_1_time1 - fxs_bal_acc_1_time0));
		console.log(chalk.green("accounts[9] FXS balance change:", fxs_bal_acc_9_time1 - fxs_bal_acc_9_time0));
		console.log(chalk.green.bold("Total FXS balance change:", (fxs_bal_acc_1_time1 + fxs_bal_acc_9_time1) - (fxs_bal_acc_1_time0 + fxs_bal_acc_9_time0)));


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("ADVANCING 28 DAYS"));
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
		
		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());
		
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

		const staking_fxs_earned_28_1 = await staking_instance.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1[0]).div(BIG18);
		const staking_fxs_earned_28_1_token1 = new BigNumber(staking_fxs_earned_28_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks [REW1]: ", staking_fxs_earned_28_1_token1.toString());

		const staking_fxs_earned_28_9 = await staking_instance.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9[0]).div(BIG18);
		const staking_fxs_earned_28_9_token1 = new BigNumber(staking_fxs_earned_28_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks [REW1]: ", staking_fxs_earned_28_9_token1.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const reward_week_5_token1 = (staking_fxs_earned_28_1_token1).plus(staking_fxs_earned_28_9_token1);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 4.0);
		const effective_yearly_reward_at_week_5_token1 = reward_week_5_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(4).toString());
		console.log("Effective weekly reward at week 5 [REW1]: ", reward_week_5_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());
		console.log("Effective yearly reward at week 5 [REW1]: ", effective_yearly_reward_at_week_5_token1.toString());

		const duration_reward_3 = await staking_instance.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_3_fxs.toString());
		console.log("Expected weekly reward [REW1]: ", duration_reward_3_token1.toString());
		console.log("Expected yearly reward [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [REW1]: ", duration_reward_3_token1.multipliedBy(52.1429).toString());

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

		console.log("Give the staking contract some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await canFXS_instance.transfer(staking_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("Give the staking contract some REW1");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_REW1_TKN]
		});

		await rew1_tkn_instance.transfer(staking_instance.address, new BigNumber("100e18"), { from: ADDRESS_WITH_REW1_TKN });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_REW1_TKN]
		});

		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("CHECK EARNINGS (SHOULD BE ZERO)"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		const staking_fxs_earned_28PR_1 = await staking_instance.earned.call(accounts[1]);
		const staking_fxs_earned_28PR_1_fxs = new BigNumber(staking_fxs_earned_28PR_1[0]).div(BIG18);
		const staking_fxs_earned_28PR_1_token1 = new BigNumber(staking_fxs_earned_28PR_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks (post refill) [FXS]: ", staking_fxs_earned_28PR_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks (post refill) [REW1]: ", staking_fxs_earned_28PR_1_token1.toString());

		const staking_fxs_earned_28PR_9 = await staking_instance.earned.call(accounts[9]);
		const staking_fxs_earned_28PR_9_fxs = new BigNumber(staking_fxs_earned_28PR_9[0]).div(BIG18);
		const staking_fxs_earned_28PR_9_token1 = new BigNumber(staking_fxs_earned_28PR_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks (post refill) [FXS]: ", staking_fxs_earned_28PR_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks (post refill) [REW1]: ", staking_fxs_earned_28PR_9_token1.toString());

		const reward_week_5PR_fxs = (staking_fxs_earned_28PR_1_fxs).plus(staking_fxs_earned_28PR_9_fxs);
		const reward_week_5PR_token1 = (staking_fxs_earned_28PR_1_token1).plus(staking_fxs_earned_28PR_9_token1);
		const effective_yearly_reward_at_week_5PR_fxs = reward_week_5PR_fxs.multipliedBy(52.1429 / 4.0);
		const effective_yearly_reward_at_week_5PR_token1 = reward_week_5PR_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 (post refill) [FXS]: ", reward_week_5PR_fxs.div(4).toString());
		console.log("Effective weekly reward at week 5 (post refill) [REW1]: ", reward_week_5PR_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 (post refill) [FXS]: ", effective_yearly_reward_at_week_5PR_fxs.toString());
		console.log("Effective yearly reward at week 5 (post refill) [REW1]: ", effective_yearly_reward_at_week_5PR_token1.toString());
		assert(reward_week_5PR_fxs.isEqualTo(new BigNumber(0)), `Reward should be zero`);
		assert(reward_week_5PR_token1.isEqualTo(new BigNumber(0)), `Reward should be zero`);

		const duration_reward_3PR = await staking_instance.getRewardForDuration.call();
		const duration_reward_3PR_fxs = new BigNumber(duration_reward_3PR[0]).div(BIG18);
		const duration_reward_3PR_token1 = new BigNumber(duration_reward_3PR[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_3PR_fxs.toString());
		console.log("Expected weekly reward [REW1]: ", duration_reward_3PR_token1.toString());
		console.log("Expected yearly reward (post refill) [FXS]: ", duration_reward_3PR_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward (post refill) [REW1]: ", duration_reward_3PR_token1.multipliedBy(52.1429).toString());


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("ADVANCE TO DAY 35 (next period)"));
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

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		const staking_fxs_earned_35_1 = await staking_instance.earned.call(accounts[1]);
		const staking_fxs_earned_35_1_fxs = new BigNumber(staking_fxs_earned_35_1[0]).div(BIG18);
		const staking_fxs_earned_35_1_token1 = new BigNumber(staking_fxs_earned_35_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 6 weeks [FXS]: ", staking_fxs_earned_35_1_fxs.toString());
		console.log("accounts[1] earnings after 6 weeks [REW1]: ", staking_fxs_earned_35_1_token1.toString());

		const staking_fxs_earned_35_9 = await staking_instance.earned.call(accounts[9]);
		const staking_fxs_earned_35_9_fxs = new BigNumber(staking_fxs_earned_35_9[0]).div(BIG18);
		const staking_fxs_earned_35_9_token1 = new BigNumber(staking_fxs_earned_35_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 6 weeks [FXS]: ", staking_fxs_earned_35_9_fxs.toString());
		console.log("accounts[9] earnings after 6 weeks [REW1]: ", staking_fxs_earned_35_9_token1.toString());

		const reward_week_6_fxs = (staking_fxs_earned_35_1_fxs).plus(staking_fxs_earned_35_9_fxs);
		const reward_week_6_token1 = (staking_fxs_earned_35_1_token1).plus(staking_fxs_earned_35_9_token1);
		const effective_yearly_reward_at_week_6_fxs = reward_week_6_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_6_token1 = reward_week_6_token1.multipliedBy(52.1429); // 1 week delay
		console.log("Effective weekly reward at week 6 [FXS]: ", reward_week_6_fxs.div(1).toString());
		console.log("Effective weekly reward at week 6 [REW1]: ", reward_week_6_token1.div(1).toString()); // 1 week delay
		console.log("Effective yearly reward at week 6 [FXS]: ", effective_yearly_reward_at_week_6_fxs.toString());
		console.log("Effective yearly reward at week 6 [REW1]: ", effective_yearly_reward_at_week_6_token1.toString());

		const duration_reward_4 = await staking_instance.getRewardForDuration.call();
		const duration_reward_4_fxs = new BigNumber(duration_reward_4[0]).div(BIG18);
		const duration_reward_4_token1 = new BigNumber(duration_reward_4[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_4_fxs.toString());
		console.log("Expected weekly reward [REW1]: ", duration_reward_4_token1.toString());
		console.log("Expected yearly reward [FXS]: ", duration_reward_4_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [REW1]: ", duration_reward_4_token1.multipliedBy(52.1429).toString());

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WITHDRAW STAKES"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Account 9 withdraws and claims its locked stake
		await staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await staking_instance.getReward({ from: accounts[9] });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await staking_instance.unlockStakes({ from: STAKING_OWNER });
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

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

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await canFXS_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await staking_instance.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await staking_instance.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm REW1 balance:", new BigNumber(await rew1_tkn_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber());
		console.log("Farm REW1 owed:", new BigNumber(await staking_instance.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm REW1 paid:", new BigNumber(await staking_instance.ttlRew1Paid()).div(BIG18).toNumber());

		const staking_fxs_earned_PW_1 = await staking_instance.earned.call(accounts[1]);
		const staking_fxs_earned_PW_1_fxs = new BigNumber(staking_fxs_earned_PW_1[0]).div(BIG18);
		const staking_fxs_earned_PW_1_token1 = new BigNumber(staking_fxs_earned_PW_1[1]).div(BIG18);
		console.log("accounts[1] earnings leftover [FXS]: ", staking_fxs_earned_PW_1_fxs.toString());
		console.log("accounts[1] earnings leftover [REW1]: ", staking_fxs_earned_PW_1_token1.toString());

		const staking_fxs_earned_PW_9 = await staking_instance.earned.call(accounts[9]);
		const staking_fxs_earned_PW_9_fxs = new BigNumber(staking_fxs_earned_PW_9[0]).div(BIG18);
		const staking_fxs_earned_PW_9_token1 = new BigNumber(staking_fxs_earned_PW_9[1]).div(BIG18);
		console.log("accounts[9] earnings leftover [FXS]: ", staking_fxs_earned_PW_9_fxs.toString());
		console.log("accounts[9] earnings leftover [REW1]: ", staking_fxs_earned_PW_9_token1.toString());
		assert(staking_fxs_earned_PW_9_fxs.isEqualTo(new BigNumber(0)), `Reward should be zero`);
		assert(staking_fxs_earned_PW_9_token1.isEqualTo(new BigNumber(0)), `Reward should be zero`);

		const duration_reward_5 = await staking_instance.getRewardForDuration.call();
		const duration_reward_5_fxs = new BigNumber(duration_reward_5[0]).div(BIG18);
		const duration_reward_5_token1 = new BigNumber(duration_reward_5[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_5_fxs.toString());
		console.log("Expected weekly reward [REW1]: ", duration_reward_5_token1.toString());

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