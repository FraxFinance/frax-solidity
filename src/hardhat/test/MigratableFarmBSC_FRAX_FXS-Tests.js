const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// PancakeSwap related
const IPancakePair = artifacts.require("__BSC/PancakeSwap/IPancakePair");

// FRAX core
const FraxMock = artifacts.require("__BSC/BEP20/Mocks/FraxMock.sol");
const FxsMock = artifacts.require("__BSC/BEP20/Mocks/FxsMock.sol");

// Reward tokens
const Cake = artifacts.require("__BSC/BEP20/Mocks/Cake.sol");

// // Governance related
// const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
// const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const MigratableFarmBSC_FRAX_FXS = artifacts.require("__BSC/Staking/Variants/MigratableFarmBSC_FRAX_FXS.sol");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

contract('MigratableFarmBSC_FRAX_FXS-Tests', async (accounts) => {
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
	const ADDRESS_WITH_CAKE = '0x631fc1ea2270e98fbd9d92658ece0f5a269aa161';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize reward token instances
	let cakeInstance;

	// Initialize Pancake pair contracts
	let pair_instance_Pancake_FRAX_FXS;

	// Initialize staking instances
	let migratableFarmBSC_FRAX_FXS_instance;

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

		// // Fill the Timelock instance
		// timelockInstance = await Timelock.deployed(); 

		// // Initialize the governance contract
		// governanceInstance = await GovernorAlpha.deployed();

		// Get instances of the Pancake pairs
		pair_instance_Pancake_FRAX_FXS = await IPancakePair.at(CONTRACT_ADDRESSES.bsc.pair_tokens["PancakeSwap FRAX/FXS"]);

		// Get the cake intance
		cakeInstance = await Cake.deployed();

		// Fill the staking rewards instances
		migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.deployed();
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
		console.log("Seed the staking contract with CAKE");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_CAKE]
		});

		await cakeInstance.transfer(migratableFarmBSC_FRAX_FXS_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_CAKE });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_CAKE]
		});

		console.log("----------------------------");
		// Fake move in some FXS
		console.log("Seed the staking contract with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Seed the FRAX/FXS staking contract
		await fxs_instance.transfer(migratableFarmBSC_FRAX_FXS_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
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

		await pair_instance_Pancake_FRAX_FXS.transfer(accounts[1], new BigNumber("250e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance_Pancake_FRAX_FXS.transfer(accounts[9], new BigNumber("250e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});
		
		console.log("Initializing Staking Contracts");
		await migratableFarmBSC_FRAX_FXS_instance.initializeDefault({ from: STAKING_OWNER });
		// await stakingInstanceDual_FXS_WETH_Sushi.initializeDefault({ from: STAKING_OWNER });

		// Add a migrator address
		await migratableFarmBSC_FRAX_FXS_instance.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });
	});

	// TESTS
	// ================================================================

	it('PART 1: Normal stakes at CR = 0', async () => {
		console.log("=========================Normal Stakes [CR = 0]=========================");


		// Note the Uniswap Pool Token and FXS amounts after staking
		let token1_pool_tokens_1 = new BigNumber("75e17");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, token1_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] approve FRAX_FXS staking pool for 7.5 (E18) LP tokens");
		const uni_pool_1st_stake_1 = new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_1st_stake_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const token1_1st_stake_1 = new BigNumber(await cakeInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const rewards_balance_1st_stake_1_FXS = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.rewards0.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_balance_1st_stake_1_TOKEN1= new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.rewards1.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		await migratableFarmBSC_FRAX_FXS_instance.stake(token1_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });		
		console.log("accounts[1] staking 7.5 (E18) LP tokens into FRAX_FXS staking pool");
		console.log("accounts[1] LP token balance:", uni_pool_1st_stake_1.toString());
		console.log("accounts[1] FXS balance:", fxs_1st_stake_1.toString());
		console.log("accounts[1] CAKE balance:", token1_1st_stake_1.toString());
		console.log("accounts[1] staking rewards0() [FXS]:", rewards_balance_1st_stake_1_FXS.toString());
		console.log("accounts[1] staking rewards1() [CAKE]:", rewards_balance_1st_stake_1_TOKEN1.toString());
		console.log("accounts[1] balanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] boostedBalanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		let uni_pool_tokens_9 = new BigNumber("25e17");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] approve FRAX_FXS staking pool for 2.5 (E18) LP tokens");
		const uni_pool_1st_stake_9 = new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf.call(accounts[9])).div(BIG18);
		const fxs_1st_stake_9 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const token1_1st_stake_9 = new BigNumber(await cakeInstance.balanceOf.call(accounts[9])).div(BIG18);
		
		const rewards_balance_1st_stake_9_FXS = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.rewards0(accounts[9])).div(BIG18);
		const rewards_balance_1st_stake_9_TOKEN1= new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.rewards1(accounts[9])).div(BIG18);

		await migratableFarmBSC_FRAX_FXS_instance.stake(uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] staking 2.5 (E18) LP tokens into FRAX_FXS staking pool");
		console.log("accounts[9] LP token balance:", uni_pool_1st_stake_9.toString());
		console.log("accounts[9] FXS balance:", fxs_1st_stake_9.toString());
		console.log("accounts[9] CAKE balance:", token1_1st_stake_9.toString());
		console.log("accounts[9] staking rewards0() [FXS]:", rewards_balance_1st_stake_9_FXS.toString());
		console.log("accounts[9] staking rewards1() [CAKE]:", rewards_balance_1st_stake_9_TOKEN1.toString());
		console.log("accounts[9] balanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(accounts[9]))).div(BIG18).toNumber());
		console.log("accounts[9] boostedBalanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(accounts[9]))).div(BIG18).toNumber());
		console.log("");

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let rewards_contract_lastUpdateTime = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		let rewards_contract_periodFinish = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		let rewards_contract_lastTimeRewardApplicable = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

		console.log("====================================================================");
		console.log("advance one week (one rewardsDuration period)");
		// Advance 7 days so the reward can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await frax_instance.refreshCollateralRatio();
		console.log("");

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("block time after waiting one week (in seconds):", block_time_after);

		// Make sure there is a valid period for the contract
		await migratableFarmBSC_FRAX_FXS_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());
		
		// Note the total FRAX supply
		const rewards_contract_stored_uni_pool = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.totalSupply.call()).div(BIG18);
		console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toString());

		// Print the decimals
		const staking_token_decimal = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.stakingDecimals.call())
		console.log("pool stakingDecimals():", staking_token_decimal.toString());

		console.log("");
		// Show the reward
		const account_1_earned = await migratableFarmBSC_FRAX_FXS_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_wk1_earned_1_fxs = new BigNumber(account_1_earned[0]).div(BIG18);
		const staking_wk1_earned_1_token1 = new BigNumber(account_1_earned[1]).div(BIG18);
		
		const account_9_earned = await migratableFarmBSC_FRAX_FXS_instance.earned.call(accounts[9]);
		const staking_wk1_earned_9_fxs = new BigNumber(account_9_earned[0]).div(BIG18);
		const staking_wk1_earned_9_token1 = new BigNumber(account_9_earned[1]).div(BIG18);

		console.log("accounts[1] earnings after 1 week [FXS]:", staking_wk1_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [CAKE]:", staking_wk1_earned_1_token1.toString());
		console.log("accounts[9] earnings after 1 week [FXS]:", staking_wk1_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [CAKE]:", staking_wk1_earned_9_token1.toString());
		const reward_week_1_fxs = (staking_wk1_earned_1_fxs).plus(staking_wk1_earned_9_fxs);
		const reward_week_1_token1 = (staking_wk1_earned_1_token1).plus(staking_wk1_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429)
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429)
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [CAKE]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [CAKE]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_rewards = await migratableFarmBSC_FRAX_FXS_instance.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_rewards[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_rewards[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [CAKE]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());
		await migratableFarmBSC_FRAX_FXS_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the UNI POOL and FXS amounts after the reward
		const uni_pool_post_reward_1 = new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_post_reward_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const token1_post_reward_1 = new BigNumber(await cakeInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[1] LP token balance:", uni_pool_post_reward_1.toString());
		console.log("accounts[1] FXS balance:", fxs_post_reward_1.toString());
		console.log("accounts[1] CAKE balance:", token1_post_reward_1.toString());

		console.log("====================================================================");
		console.log("accounts[1] claim rewards and withdraw LP tokens");
		console.log("accounts[9] will leave everything in the contract");
		console.log("");
		await time.advanceBlock();
		const uni_pool_balance_1 = new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const staking_ew_earned_1 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_ew_earned_1_fxs = new BigNumber(staking_ew_earned_1[0]).div(BIG18);
		const staking_ew_earned_1_token1 = new BigNumber(staking_ew_earned_1[1]).div(BIG18);
		
		console.log("accounts[1] LP token balance:", uni_pool_balance_1.toString());
		console.log("accounts[1] staking earned() [FXS]:", staking_ew_earned_1_fxs.toString());
		console.log("accounts[1] staking earned() [CAKE]:", staking_ew_earned_1_token1.toString());
		console.log("");

		// Ignore [9] here as we are still right after the first week and it isn't collecting
		// const uni_pool_balance_9 = new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf.call(accounts[9])).div(BIG18);
	
		// const staking_ew_earned_9 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(accounts[9]);
		// const staking_ew_earned_9_fxs = new BigNumber(staking_ew_earned_9[0]).div(BIG18);
		// const staking_ew_earned_9_token1 = new BigNumber(staking_ew_earned_9[1]).div(BIG18);
		
		// console.log("accounts[9] LP token balance:", uni_pool_balance_9.toString());
		// console.log("accounts[9] staking earned() [FXS]:", staking_ew_earned_9_fxs.toString());
		// console.log("accounts[9] staking earned() [CAKE]:", staking_ew_earned_9_token1.toString());
		// console.log("");

		console.log("accounts[1] claims getReward()");
		await migratableFarmBSC_FRAX_FXS_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();

		console.log("accounts[1] performs withdraw()");
		await migratableFarmBSC_FRAX_FXS_instance.withdraw(token1_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();
		console.log("");

		const fxs_after_withdraw_0 = (new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18);
		console.log("accounts[1] FXS balance change:", (fxs_after_withdraw_0).minus(fxs_1st_stake_1).toNumber());
		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("====================================================================");

		console.log(`Start allowing token1 rewards (10 CAKE / day)`);
		const new_token1_rate = new BigNumber(3650e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); // (uint256(1000000e18)).div(365 * 86400); // Base emission rate of 1M FXS over 3 years
		const curr_token0_rate = await migratableFarmBSC_FRAX_FXS_instance.rewardRate0.call();
		await migratableFarmBSC_FRAX_FXS_instance.setRewardRates(curr_token0_rate, new_token1_rate, false, { from: STAKING_OWNER });

		console.log("====================================================================");

		console.log("wait two weeks so accounts[9] can earn more");
		// Advance a few days
		await time.increase(2 * (7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await migratableFarmBSC_FRAX_FXS_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_after);

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.periodFinish.call()).toNumber();
		console.log("pool periodFinish: ", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lastTimeRewardApplicable.call()).toNumber();
		console.log("pool lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

		// Show the reward
		const staking_part2_earned_1 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_part2_earned_1_fxs = new BigNumber(staking_part2_earned_1[0]).div(BIG18);
		const staking_part2_earned_1_token1 = new BigNumber(staking_part2_earned_1[1]).div(BIG18);
		
		const staking_part2_earned_9 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(accounts[9]);
		const staking_part2_earned_9_fxs = new BigNumber(staking_part2_earned_9[0]).div(BIG18);
		const staking_part2_earned_9_token1 = new BigNumber(staking_part2_earned_9[1]).div(BIG18);

		console.log("accounts[1] staking earned() [FXS]:", staking_part2_earned_1_fxs.toString());
		console.log("accounts[1] staking earned() [CAKE]:", staking_part2_earned_1_token1.toString());
		console.log("accounts[9] staking earned() [FXS]:", staking_part2_earned_9_fxs.toString());
		console.log("accounts[9] staking earned() [CAKE]:", staking_part2_earned_9_token1.toString());
		console.log("");

		const uni_pool_2nd_time_balance_1 = new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_2nd_time_balance_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const rewards_earned_2nd_time_1 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const rewards_earned_2nd_time_1_fxs = new BigNumber(rewards_earned_2nd_time_1[0]).div(BIG18);
		const rewards_earned_2nd_time_1_token1 = new BigNumber(rewards_earned_2nd_time_1[1]).div(BIG18);
		console.log("accounts[1] LP token balance:", uni_pool_2nd_time_balance_1.toString());
		console.log("accounts[1] FXS balance:", fxs_2nd_time_balance_1.toString());
		console.log("accounts[1] staking earned() [FXS]:", rewards_earned_2nd_time_1_fxs.toString());
		console.log("accounts[1] staking earned() [CAKE]:", rewards_earned_2nd_time_1_token1.toString());
		console.log("");

		console.log("accounts[9] getReward()");
		await migratableFarmBSC_FRAX_FXS_instance.getReward({ from: accounts[9] });

		console.log("accounts[9] withdrawing");
		await migratableFarmBSC_FRAX_FXS_instance.withdraw(uni_pool_tokens_9, { from: accounts[9] });
		await time.advanceBlock();

		const sum_reward_week_3_fxs = ((staking_part2_earned_1_fxs).plus(staking_part2_earned_9_fxs)).plus(staking_wk1_earned_1_fxs);
		const sum_reward_week_3_token1 = ((staking_part2_earned_1_token1).plus(staking_part2_earned_9_token1)).plus(staking_wk1_earned_1_token1);
		const effective_yearly_reward_at_week_3_fxs  = sum_reward_week_3_fxs.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
		const effective_yearly_reward_at_week_3_token1 = sum_reward_week_3_token1.multipliedBy(52.1429 / 2.0); // Total over 2 weeks (1 week delay)
		console.log("Effective weekly reward at week 3 [FXS]: ", sum_reward_week_3_fxs.div(3).toString()); // Total over 3 weeks
		console.log("Effective weekly reward at week 3 [may be lower if delayed] [CAKE]:", sum_reward_week_3_token1.div(2).toString()); // Total over 3 weeks
		console.log("Effective yearly reward at week 3 [FXS]:", effective_yearly_reward_at_week_3_fxs.toString());
		console.log("Effective yearly reward at week 3 [may be lower if delayed] [CAKE]:", effective_yearly_reward_at_week_3_token1.toString());
		
		const duration_reward_3 = await migratableFarmBSC_FRAX_FXS_instance.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected yearly reward: [FXS]", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward: [CAKE]", duration_reward_3_token1.multipliedBy(52.1429).toString());

		const acc_9_FXS_balance_after = (new BigNumber(await fxs_instance.balanceOf(accounts[9]))).div(BIG18);
		const acc_9_TOKEN1_balance_after = (new BigNumber(await cakeInstance.balanceOf(accounts[9]))).div(BIG18);
		console.log("accounts[9] FXS balance change:", acc_9_FXS_balance_after.minus(fxs_1st_stake_9).toNumber());
		console.log("accounts[9] CAKE balance change:", acc_9_TOKEN1_balance_after.minus(token1_1st_stake_9).toNumber());
	});

	
	it("blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await migratableFarmBSC_FRAX_FXS_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert.unspecified(migratableFarmBSC_FRAX_FXS_instance.stake(new BigNumber("1e18"), { from: accounts[9] }));
	});

	it("ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await migratableFarmBSC_FRAX_FXS_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should succeed");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, new BigNumber("1e18"), { from: accounts[9] });
		await migratableFarmBSC_FRAX_FXS_instance.stake(new BigNumber("1e18"), { from: accounts[9] });
	});

	it('PART 2: Locked stakes', async () => {
		console.log("====================================================================");
		console.log("NOW TRY TESTS WITH LOCKED STAKES.");
		console.log("[1] AND [9] HAVE WITHDRAWN EVERYTHING AND ARE NOW AT 0");

		// console.log("====================================================================");

		console.log("Stop token1 rewards");
		const new_token1_rate = 0; // (uint256(1000000e18)).div(365 * 86400); // Base emission rate of 1M FXS over 3 years
		const curr_token0_rate = await migratableFarmBSC_FRAX_FXS_instance.rewardRate0.call();
		await migratableFarmBSC_FRAX_FXS_instance.setRewardRates(curr_token0_rate, new_token1_rate, false, { from: STAKING_OWNER });

		console.log("====================================================================");

		// Need to approve first so the staking can use transfer
		const uni_pool_normal_1 = new BigNumber("15e17");
		const uni_pool_normal_9 = new BigNumber("5e17");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, uni_pool_normal_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, uni_pool_normal_9, { from: accounts[9] });
		
		// Stake Normal
		await migratableFarmBSC_FRAX_FXS_instance.stake(uni_pool_normal_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await migratableFarmBSC_FRAX_FXS_instance.stake(uni_pool_normal_9, { from: accounts[9] });
		await time.advanceBlock();

		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await frax_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_FXS Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_FXS Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		// Stake Locked
		// account[1]
		await migratableFarmBSC_FRAX_FXS_instance.stakeLocked(uni_pool_locked_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await migratableFarmBSC_FRAX_FXS_instance.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await migratableFarmBSC_FRAX_FXS_instance.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1 = await migratableFarmBSC_FRAX_FXS_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9 = await migratableFarmBSC_FRAX_FXS_instance.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const unlocked_balance_1 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.unlockedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lockedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf.call(accounts[9])).div(BIG18);
		const unlocked_balance_9 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.unlockedBalanceOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.lockedBalanceOf.call(accounts[9])).div(BIG18);
		console.log("REGULAR BALANCE [1]: ", regular_balance_1.toString());
		console.log("BOOSTED BALANCE [1]: ", boosted_balance_1.toString());
		console.log("---- UNLOCKED [1]: ", unlocked_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("REGULAR BALANCE [9]: ", regular_balance_9.toString());
		console.log("BOOSTED BALANCE [9]: ", boosted_balance_9.toString());
		console.log("---- UNLOCKED [9]: ", unlocked_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		console.log("WAIT 7 DAYS");

		console.log("====================================================================");

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract and sync it
		await migratableFarmBSC_FRAX_FXS_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_1 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1[0]).div(BIG18);
		const staking_earned_1_token1 = new BigNumber(staking_earned_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [CAKE]: ", staking_earned_1_token1.toString());

		const staking_earned_9 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(accounts[9]);
		const staking_earned_9_fxs = new BigNumber(staking_earned_9[0]).div(BIG18);
		const staking_earned_9_token1 = new BigNumber(staking_earned_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [CAKE]: ", staking_earned_9_token1.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const reward_week_1_token1 = (staking_earned_1_token1).plus(staking_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [CAKE]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [CAKE]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_reward_1 = await migratableFarmBSC_FRAX_FXS_instance.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_reward_1[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [CAKE]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));

		console.log("====================================================================");

		console.log("Start allowing token1 rewards again");
		const new_token1_rate_again = new BigNumber(3650e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); 
		const curr_token0_rate_again = await migratableFarmBSC_FRAX_FXS_instance.rewardRate0.call();
		await migratableFarmBSC_FRAX_FXS_instance.setRewardRates(curr_token0_rate_again, new_token1_rate_again, false, { from: STAKING_OWNER });

		console.log("====================================================================");
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract and sync it
		await migratableFarmBSC_FRAX_FXS_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_fxs_earned_28_1 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1[0]).div(BIG18);
		const staking_fxs_earned_28_1_token1 = new BigNumber(staking_fxs_earned_28_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks [CAKE]: ", staking_fxs_earned_28_1_token1.toString());

		const staking_fxs_earned_28_9 = await migratableFarmBSC_FRAX_FXS_instance.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9[0]).div(BIG18);
		const staking_fxs_earned_28_9_token1 = new BigNumber(staking_fxs_earned_28_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks [CAKE]: ", staking_fxs_earned_28_9_token1.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const reward_week_5_token1 = (staking_fxs_earned_28_1_token1).plus(staking_fxs_earned_28_9_token1);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 5.0);
		const effective_yearly_reward_at_week_5_token1 = reward_week_5_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(5).toString());
		console.log("Effective weekly reward at week 5 [CAKE]: ", reward_week_5_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());
		console.log("Effective yearly reward at week 5 [CAKE]: ", effective_yearly_reward_at_week_5_token1.toString());

		const duration_reward_3 = await migratableFarmBSC_FRAX_FXS_instance.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [CAKE]: ", duration_reward_3_token1.multipliedBy(52.1429).toString());

		// Account 9 withdraws and claims its locked stake
		await migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] });
		await migratableFarmBSC_FRAX_FXS_instance.getReward({ from: accounts[9] });
		await expectRevert.unspecified(migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("UNLOCKING ALL STAKES");
		await migratableFarmBSC_FRAX_FXS_instance.unlockStakes({ from: STAKING_OWNER });
		await migratableFarmBSC_FRAX_FXS_instance.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// await fxs_instance.transfer(migratableFarmBSC_FRAX_FXS_instance.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("stakingInstance FXS balance:", new BigNumber(await fxs_instance.balanceOf(migratableFarmBSC_FRAX_FXS_instance.address)).div(BIG18).toNumber());
		// await migratableFarmBSC_FRAX_FXS_instance.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
	

		// The below part needs to be here for some reason
		// It seems to crash when it is in another it()
		// =====================================================
	

	
	});

	it("Migration Staking / Withdrawal Tests", async () => {

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Untoggle the stake unlocking
		await migratableFarmBSC_FRAX_FXS_instance.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await migratableFarmBSC_FRAX_FXS_instance.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf LP token:", (new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Normal
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, stake_amt_unlocked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await migratableFarmBSC_FRAX_FXS_instance.stake(stake_amt_unlocked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Stake Locked
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await migratableFarmBSC_FRAX_FXS_instance.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_stake_structs = await migratableFarmBSC_FRAX_FXS_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await migratableFarmBSC_FRAX_FXS_instance.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked balanceOf <BEFORE>:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf <BEFORE>:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Have the migrator withdraw unlocked tokens
		const withdraw_unlocked_amt = new BigNumber ("5e18");
		await migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_unlocked(COLLATERAL_FRAX_AND_FXS_OWNER, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_unlocked_amt.div(BIG18)} (E18) unlocked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf LP token:", (new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy stake for someone else as the migrator
		const proxy_stake_amt = new BigNumber ("5e18");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, proxy_stake_amt, { from: MIGRATOR_ADDRESS });
		await migratableFarmBSC_FRAX_FXS_instance.migrator_stake_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_amt, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator staked ${proxy_stake_amt.div(BIG18)} (E18) LP tokens for accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		await migratableFarmBSC_FRAX_FXS_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_Pancake_FRAX_FXS.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await migratableFarmBSC_FRAX_FXS_instance.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await migratableFarmBSC_FRAX_FXS_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await migratableFarmBSC_FRAX_FXS_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_unlocked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_unlocked(COLLATERAL_FRAX_AND_FXS_OWNER, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stake_for WHILE NOT IN MIGRATION---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_stake_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO EMERGENCY WITHDRAWALS WHILE NOT IN MIGRATION---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.recoverBEP20(pair_instance_Pancake_FRAX_FXS.address, test_amount_1, { from: STAKING_OWNER }),
			"Not in migration"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await migratableFarmBSC_FRAX_FXS_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO STAKE NORMALLY DURING A MIGRATION---------");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.stake(test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking paused or in migration"
		);	

		console.log("---------TRY TO STAKE LOCKED NORMALLY DURING A MIGRATION---------");
		await pair_instance_Pancake_FRAX_FXS.approve(migratableFarmBSC_FRAX_FXS_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.stakeLocked(test_amount_1, 28 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking paused or in migration"
		);		

		console.log("---------TRY TO migrator_withdraw_unlocked NOT AS THE MIGRATOR---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_unlocked(COLLATERAL_FRAX_AND_FXS_OWNER, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stake_for NOT AS THE MIGRATOR---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_stake_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await migratableFarmBSC_FRAX_FXS_instance.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await migratableFarmBSC_FRAX_FXS_instance.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await migratableFarmBSC_FRAX_FXS_instance.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			migratableFarmBSC_FRAX_FXS_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

	});
});