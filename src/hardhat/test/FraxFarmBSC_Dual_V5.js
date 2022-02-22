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

// Impossible Finance related
const IImpossiblePair = artifacts.require("__BSC/PancakeSwap/IImpossiblePair");

// FRAX core
const FraxMock = artifacts.require("__BSC/BEP20/Mocks/FraxMock.sol");
const FxsMock = artifacts.require("__BSC/BEP20/Mocks/FxsMock.sol");

// Reward tokens
const Cake = artifacts.require("__BSC/BEP20/Mocks/Cake.sol");
const ImpossibleFinance = artifacts.require("__BSC/BEP20/Mocks/ImpossibleFinance.sol");

// // Governance related
// const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
// const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const MigratableFarmBSC_FRAX_FXS = artifacts.require("__BSC/Staking/Variants/MigratableFarmBSC_FRAX_FXS.sol");
const FraxFarmBSC_Dual_FRAX_IF = artifacts.require("__BSC/Staking/Variants/FraxFarmBSC_Dual_FRAX_IF.sol");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

contract('FraxFarmBSC_Dual_V5-Tests', async (accounts) => {
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
	const ADDRESS_WITH_FXS = '0x631fc1ea2270e98fbd9d92658ece0f5a269aa161';
	const ADDRESS_WITH_IF = '0x038c9fBB2Ad77b0b09639eDBbc3AFB82651e4e57';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize reward token instances
	let cakeInstance;
	let impossibleFinanceToken;

	// Initialize Impossible pair contracts
	let pair_instance_impossible_FRAX_IF;

	// Initialize staking instances
	let fraxFarmBSC_Dual_FRAX_IF_instance;

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
		frax_instance = await FraxMock.deployed();
		fxs_instance = await FxsMock.deployed();

		// Get mock BEP-20 instances
		cakeInstance = await Cake.deployed();
		impossibleFinanceToken = await ImpossibleFinance.deployed();

		// // Fill the Timelock instance
		// timelockInstance = await Timelock.deployed(); 

		// // Initialize the governance contract
		// governanceInstance = await GovernorAlpha.deployed();

		// Get instances of the pairs
		pair_instance_impossible_FRAX_IF = await IImpossiblePair.at(CONTRACT_ADDRESSES.bsc.pair_tokens["Impossible FRAX/IF"]);

		// Get instances of the staking contract
		fraxFarmBSC_Dual_FRAX_IF_instance = await FraxFarmBSC_Dual_FRAX_IF.deployed();

		// Disable token1 rewards at first
		await fraxFarmBSC_Dual_FRAX_IF_instance.toggleToken1Rewards({ from: STAKING_OWNER });

		return false;

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
		// Fake move in some CAKE
		console.log("Seed the staking contract with IF");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_IF]
		});

		await impossibleFinanceToken.transfer(fraxFarmBSC_Dual_FRAX_IF_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_IF });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_IF]
		});

		console.log("----------------------------");
		// Fake move in some FXS
		console.log("Seed the staking contract with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Seed the FRAX/FXS staking contract
		await fxs_instance.transfer(fraxFarmBSC_Dual_FRAX_IF_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });
		// await cakeInstance.transfer(stakingInstanceDual_FXS_WETH_Sushi.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("----------------------------");
		console.log("Give some LP tokens to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await pair_instance_impossible_FRAX_IF.transfer(accounts[1], new BigNumber("250e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance_impossible_FRAX_IF.transfer(accounts[9], new BigNumber("250e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});
		
		console.log("Initializing Staking Contracts");
		await fraxFarmBSC_Dual_FRAX_IF_instance.initializeDefault({ from: STAKING_OWNER });
		// await stakingInstanceDual_FXS_WETH_Sushi.initializeDefault({ from: STAKING_OWNER });

		// Add a migrator address
		await fraxFarmBSC_Dual_FRAX_IF_instance.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });
	});

	// TESTS
	// ================================================================

	it('Locked stakes', async () => {
		console.log("====================================================================");
		console.log("TRY TESTS WITH LOCKED STAKES.");

		console.log("====================================================================");

		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, accounts[9]);

		// Print FXS balances
		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, uni_pool_locked_9, { from: accounts[9] });
		
		// Stake Locked
		// account[1]
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(uni_pool_locked_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1_0 = await fraxFarmBSC_Dual_FRAX_IF_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9_0 = await fraxFarmBSC_Dual_FRAX_IF_instance.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, accounts[9]);

		const _total_liquidity_locked_0 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		console.log("WAIT 7 DAYS");

		console.log("====================================================================");

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await fraxFarmBSC_Dual_FRAX_IF_instance.sync({ from: STAKING_OWNER });

		const staking_earned_1 = await fraxFarmBSC_Dual_FRAX_IF_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1[0]).div(BIG18);
		const staking_earned_1_token1 = new BigNumber(staking_earned_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [IF]: ", staking_earned_1_token1.toString());

		const staking_earned_9 = await fraxFarmBSC_Dual_FRAX_IF_instance.earned.call(accounts[9]);
		const staking_earned_9_fxs = new BigNumber(staking_earned_9[0]).div(BIG18);
		const staking_earned_9_token1 = new BigNumber(staking_earned_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [IF]: ", staking_earned_9_token1.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const reward_week_1_token1 = (staking_earned_1_token1).plus(staking_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [IF]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [IF]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_reward_1 = await fraxFarmBSC_Dual_FRAX_IF_instance.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_reward_1[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IF]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		console.log("====================================================================");

		console.log("Start allowing token1 rewards again");
		await fraxFarmBSC_Dual_FRAX_IF_instance.toggleToken1Rewards({ from: STAKING_OWNER });
		const new_token1_rate_again = new BigNumber(365e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); 
		const curr_token0_rate_again = await fraxFarmBSC_Dual_FRAX_IF_instance.rewardRate0.call();
		await fraxFarmBSC_Dual_FRAX_IF_instance.setRewardRates(curr_token0_rate_again, new_token1_rate_again, false, { from: STAKING_OWNER });

		console.log("====================================================================");
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await fraxFarmBSC_Dual_FRAX_IF_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_fxs_earned_28_1 = await fraxFarmBSC_Dual_FRAX_IF_instance.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1[0]).div(BIG18);
		const staking_fxs_earned_28_1_token1 = new BigNumber(staking_fxs_earned_28_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks [IF]: ", staking_fxs_earned_28_1_token1.toString());

		const staking_fxs_earned_28_9 = await fraxFarmBSC_Dual_FRAX_IF_instance.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9[0]).div(BIG18);
		const staking_fxs_earned_28_9_token1 = new BigNumber(staking_fxs_earned_28_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks [IF]: ", staking_fxs_earned_28_9_token1.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const reward_week_5_token1 = (staking_fxs_earned_28_1_token1).plus(staking_fxs_earned_28_9_token1);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 5.0);
		const effective_yearly_reward_at_week_5_token1 = reward_week_5_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(5).toString());
		console.log("Effective weekly reward at week 5 [IF]: ", reward_week_5_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());
		console.log("Effective yearly reward at week 5 [IF]: ", effective_yearly_reward_at_week_5_token1.toString());

		const duration_reward_3 = await fraxFarmBSC_Dual_FRAX_IF_instance.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IF]: ", duration_reward_3_token1.multipliedBy(52.1429).toString());

		// Account 9 withdraws and claims its locked stake
		await fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await fraxFarmBSC_Dual_FRAX_IF_instance.getReward({ from: accounts[9] });
		await expectRevert.unspecified(fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await fraxFarmBSC_Dual_FRAX_IF_instance.unlockStakes({ from: STAKING_OWNER });
		await fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(fraxFarmBSC_Dual_FRAX_IF_instance, accounts[9]);

		const _total_liquidity_locked_2 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());

	});

	it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await fraxFarmBSC_Dual_FRAX_IF_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(new BigNumber("1e18"), 7 * 86400, { from: accounts[9] }),
			"Address has been greylisted"
		);
	});

	it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await fraxFarmBSC_Dual_FRAX_IF_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		// console.log("");
		// console.log("this should succeed");
		// await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(new BigNumber("1e18"), 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// // Wait 2 days
		// for (let j = 0; j < 2; j++){
		// 	await time.increase(86400);
		// 	await time.advanceBlock();
		// }

		// // Claim back the NFT and collect the rewards
		// await fraxFarmBSC_Dual_FRAX_IF_instance.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fraxFarmBSC_Dual_FRAX_IF_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});

	it("Migration Staking / Withdrawal Tests", async () => {

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Untoggle the stake unlocking
		await fraxFarmBSC_Dual_FRAX_IF_instance.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf UniV2 FRAX/IQ LP:", (new BigNumber(await pair_instance_impossible_FRAX_IF.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_stake_structs = await fraxFarmBSC_Dual_FRAX_IF_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await fraxFarmBSC_Dual_FRAX_IF_instance.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await fraxFarmBSC_Dual_FRAX_IF_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_impossible_FRAX_IF.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		let block_time_current_0 = (await time.latest()).toNumber();
		await fraxFarmBSC_Dual_FRAX_IF_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, block_time_current_0, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_impossible_FRAX_IF.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await fraxFarmBSC_Dual_FRAX_IF_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await fraxFarmBSC_Dual_FRAX_IF_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await fraxFarmBSC_Dual_FRAX_IF_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_1 = (await time.latest()).toNumber();
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO EMERGENCY WITHDRAWALS WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.recoverBEP20(pair_instance_impossible_FRAX_IF.address, test_amount_1, { from: STAKING_OWNER }),
			"Not in migration"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await fraxFarmBSC_Dual_FRAX_IF_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO STAKE LOCKED NORMALLY DURING A MIGRATION---------");
		await pair_instance_impossible_FRAX_IF.approve(fraxFarmBSC_Dual_FRAX_IF_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.stakeLocked(test_amount_1, 28 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking paused or in migration"
		);		

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_2, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await fraxFarmBSC_Dual_FRAX_IF_instance.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await fraxFarmBSC_Dual_FRAX_IF_instance.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			fraxFarmBSC_Dual_FRAX_IF_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

	});
});