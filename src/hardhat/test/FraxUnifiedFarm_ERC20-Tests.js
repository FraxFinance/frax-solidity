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

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const IFraxswapPair = artifacts.require("Fraxswap/core/interfaces/IFraxswapPair");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");
const IGUniPool = artifacts.require("Misc_AMOs/gelato/IGUniPool");
const ITempleFraxAMMOps = artifacts.require("Misc_AMOs/temple/ITempleFraxAMMOps");
const IVPool = artifacts.require("Misc_AMOs/vesper/IVPool");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI");
const FraxUnifiedFarm_ERC20_Fraxswap_FRAX_IQ = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_IQ");
const FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE");
const FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX = artifacts.require("Staking/Variants/FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX");

// veFXS and gauge related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSBoost = artifacts.require("Curve/IVotingEscrowDelegation");
const veFXSBoostDelegationProxy = artifacts.require("Curve/IDelegationProxy");
const FraxGaugeController = artifacts.require("Curve/FraxGaugeController");
const FraxGaugeControllerV2 = artifacts.require("Curve/FraxGaugeControllerV2");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

contract('FraxUnifiedFarm_ERC20-Tests', async (accounts) => {
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

	const ADDRESS_WITH_FRAX = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_LP_ADMIN = '0x4D6175d58C5AceEf30F546C0d5A557efFa53A950';
	const ADDRESS_WITH_LP_TOKENS = '0x5180db0237291A6449DdA9ed33aD90a38787621c';
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_REW1 = '0x5180db0237291A6449DdA9ed33aD90a38787621c';
	const ADDRESS_WITH_VEFXS = '0xfF5B4BCbf765FE363269114e1c765229a29eDeFD';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let rew1_instance;


	// Initialize pair contracts
	let pair_instance;

	// Initialize staking instances
	let staking_instance;

	// Initialize veFXS and gauge-related instances
	let veFXS_instance;
	let frax_gauge_controller;
	let gauge_rewards_distributor_instance;

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
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");

		// Fill the Uniswap V3 Instances
		// uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs

		// pair_instance_FRAX_SUSHI_Sushi = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Sushi FRAX/SUSHI"]);
		pair_instance_Fraxswap_FRAX_IQ = await IFraxswapPair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Fraxswap FRAX/IQ"]);
		// pair_instance_Gelato_FRAX_DAI = await IGUniPool.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Gelato Uniswap FRAX/DAI"]);
		// pair_instance_Temple_FRAX_TEMPLE = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Temple FRAX/TEMPLE"]);
		// pair_instance_Vesper_FRAX = await IVPool.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Vesper Orbit FRAX"]);

		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// uniswapV3PositionsNFTInstance = await FRAX3CRV_Mock.deployed(); 

		// Fill the staking rewards instances
		// fraxUnifiedFarm_Gelato_FRAX_DAI_instance = await FraxUnifiedFarm_ERC20_Gelato_FRAX_DAI.deployed();
		fraxUnifiedFarm_Fraxswap_FRAX_IQ_instance = await FraxUnifiedFarm_ERC20_Fraxswap_FRAX_IQ.deployed();
		// fraxUnifiedFarm_Temple_FRAX_TEMPLE_instance = await FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.deployed();
		// fraxUnifiedFarm_Vesper_FRAX_instance = await FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX.deployed();

		// veFXS and gauge related
		veFXS_instance = await veFXS.deployed();
		frax_gauge_controller = await FraxGaugeController.deployed();
		gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.deployed();

		// Set which pairs to test
		console.log(chalk.hex("#ff8b3d").bold("CHOOSING THE PAIR"))
		pair_instance = pair_instance_Fraxswap_FRAX_IQ;

		// Set which pairs to test
		console.log(chalk.hex("#ff8b3d").bold("CHOOSING THE STAKING CONTRACT"))
		staking_instance = fraxUnifiedFarm_Fraxswap_FRAX_IQ_instance;

		const rew1_address = (await staking_instance.getAllRewardTokens.call())[1];
		rew1_instance = await ERC20.at(rew1_address);
		rew1_tkn_symbol = utilities.rewardTokenSymbolFromAddress(rew1_address);
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));

		// ---------------------------------------------------------------
		console.log("Give the staking contract some FRAX, to be recovered later");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		await frax_instance.transfer(staking_instance.address, new BigNumber("1e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		// ---------------------------------------------------------------
		console.log("Seed the staking contract and address[1] with FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(staking_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// ---------------------------------------------------------------
		console.log("Seed the staking contract with REW1 tokens");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_REW1]
		});

		await rew1_instance.transfer(staking_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_REW1 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_REW1]
		});

		// ---------------------------------------------------------------
		console.log("Give LPs to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await pair_instance.transfer(accounts[1], new BigNumber("150e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance.transfer(accounts[4], new BigNumber("150e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance.transfer(accounts[9], new BigNumber("150e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		// ---------------------------------------------------------------
		console.log("Add this farm as a gauge");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await frax_gauge_controller.add_gauge(staking_instance.address, 0, 1000, { from: COMPTROLLER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		// ---------------------------------------------------------------
		console.log("Vote for the farm");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		// Vote for this farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(staking_instance.address, 10000, { from: ADDRESS_WITH_VEFXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		// ---------------------------------------------------------------
		console.log("Add the gauge info to the rewards distributor");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await gauge_rewards_distributor_instance.setGaugeState(staking_instance.address, 0, 1, { from: COMPTROLLER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		// ---------------------------------------------------------------
		// // ONLY IF LIVE TESTING
		// console.log("Set Ropsten [6] as the owner");
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [COMPTROLLER_ADDRESS]
		// });

		// // Set the owner as Ropsten[6]
		// await staking_instance.nominateNewOwner(STAKING_OWNER, { from: COMPTROLLER_ADDRESS });
		
		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [COMPTROLLER_ADDRESS]
		// });

		// // Accept ownership
		// await staking_instance.acceptOwnership({ from: STAKING_OWNER });

		// ---------------------------------------------------------------


		console.log("Move to the end of the gauge controller period");
		const current_timestamp_00 = (new BigNumber(await time.latest())).toNumber();
		const time_total = await frax_gauge_controller.time_total.call();

		const increase_time_0 = (time_total - current_timestamp_00);
		console.log("increase_time_0 [to gauge controller period end] (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		// Move to the end of the staking contract's period
		const current_timestamp_0a = (new BigNumber(await time.latest())).toNumber();
		const period_end_0a = await staking_instance.periodFinish.call();

		const increase_time_0a = (period_end_0a - current_timestamp_0a) + 1;
		console.log("increase_time_0a [to staking contract period end] (days): ", increase_time_0a / 86400);
		await time.increase(increase_time_0a);
		await time.advanceBlock();

		// Checkpoint the gauges
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		// await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, current_timestamp_0, { from: accounts[9] });
		// await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_0, { from: accounts[9] });
		// await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_0, { from: accounts[9] });
		// await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_0, { from: accounts[9] });
		
		await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", { from: accounts[9] });
		

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print out the gauge relative weights
		const gauge_rel_wgt = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(staking_instance.address)).div(BIG18).toNumber();
		console.log("gauge_rel_wgt: ", gauge_rel_wgt);

		// Print the weekly emission
		const weekly_total_emission = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission);

		// Print the reward rate
		let reward_amount = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount per week (FXS): ", reward_amount);

		// Print the FRAX per LP Token
		const frax_per_lp_token = new BigNumber(await staking_instance.fraxPerLPToken.call()).div(BIG18);
		console.log("frax_per_lp_token: ", frax_per_lp_token.toString());

		// NOTE
		console.log(chalk.yellow.bold("DEPENDING ON WHO VOTED, THE REWARD RATE MAY CHANGE SLIGHTLY WEEK AFTER WEEK DUE TO VEFXS DECAY"));
	});

	it('Locked stakes', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TRY TESTS WITH LOCKED STAKES."));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		console.log(chalk.hex("#f3f3f3").bold("------Basic LP Info------"));
		const liq_locked_1 = new BigNumber("75e17");
		const liq_locked_1_dec = liq_locked_1.div(BIG18).toNumber();
		const liq_locked_1_sum = new BigNumber ("10e18");
		const frax_per_lp_token_bn = await staking_instance.fraxPerLPToken.call();
		const frax_per_lp_token_dec = new BigNumber(frax_per_lp_token_bn).div(BIG18).toNumber();
		console.log("LP to lock: ", liq_locked_1_dec);
		console.log("frax_per_lp_token: ", frax_per_lp_token_dec);

		// Print the reward rate
		let reward_amount_check_wk0 = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check_wk0 per week (FXS): ", reward_amount_check_wk0);

		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Test [4], which has no veFXS and will be locking for very short time"));

		console.log(chalk.hex("#f3f3f3").bold("------Lock a position for [4]------"));
		await utilities.printCalcCurCombinedWeight(staking_instance, TIMELOCK_ADMIN);
		await pair_instance.approve(staking_instance.address, liq_locked_1_sum, { from: TIMELOCK_ADMIN });
		await staking_instance.stakeLocked(liq_locked_1, 6.95 * 86400, { from: TIMELOCK_ADMIN }); // 15 days
		const stake_idx_4_0 = new BigNumber((await staking_instance.lockedStakesOfLength.call(TIMELOCK_ADMIN))).toNumber() - 1;
		const frax_lp_locked_4 = liq_locked_1_dec * frax_per_lp_token_dec;
		console.log("Amount LP locked [4]: ", liq_locked_1_dec);
		console.log("FRAX in LP locked [4]: ", frax_lp_locked_4);

		console.log(chalk.hex("#f3f3f3").bold("------Note after lock [4]------"));
		await utilities.printCalcCurCombinedWeight(staking_instance, TIMELOCK_ADMIN);
		const vefxs_bal_4_aft = new BigNumber(await veFXS_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		const vefxs_mult_4_aft = new BigNumber(await staking_instance.veFXSMultiplier(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		const lock_mult_4_aft = new BigNumber(await staking_instance.calcCurrLockMultiplier(TIMELOCK_ADMIN, stake_idx_4_0)).div(BIG18).toNumber();
		const min_vefxs_max_boost_4_aft_bn = new BigNumber(await staking_instance.minVeFXSForMaxBoost(TIMELOCK_ADMIN));
		const min_vefxs_max_boost_4_aft = min_vefxs_max_boost_4_aft_bn.div(BIG18).toNumber();
		const user_staked_frax_4_aft = new BigNumber(await staking_instance.userStakedFrax(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		console.log("veFXS balance after [4]: ", vefxs_bal_4_aft);
		console.log("veFXS multiplier after [4]: ", vefxs_mult_4_aft);
		console.log("lock multiplier after [4]: ", lock_mult_4_aft);
		console.log("minVeFXSForMaxBoost after [4]: ", min_vefxs_max_boost_4_aft);
		console.log("userStakedFrax after [4]: ", user_staked_frax_4_aft);


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Advance 1 day and claim"));

		// Advance 1 day
		await time.increase((1 * 86400));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, TIMELOCK_ADMIN);
		const fxs_bal_4_dy1_pre_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		await staking_instance.getReward(TIMELOCK_ADMIN, { from: TIMELOCK_ADMIN });
		const fxs_bal_4_dy1_post_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		console.log("FXS collected [4] (1 day): ", fxs_bal_4_dy1_post_collect - fxs_bal_4_dy1_pre_collect);
		assert((fxs_bal_4_dy1_post_collect - fxs_bal_4_dy1_pre_collect) >= .99, '[4] should have earned the daily FXS amount');


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Advance 6 days and claim"));

		// Advance 6 days
		await time.increase((6 * 86400));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, TIMELOCK_ADMIN);
		const fxs_bal_4_wk1_pre_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		await staking_instance.getReward(TIMELOCK_ADMIN, { from: TIMELOCK_ADMIN });
		const fxs_bal_4_wk1_post_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		console.log("FXS collected [4] (6 days): ", fxs_bal_4_wk1_post_collect - fxs_bal_4_wk1_pre_collect);
		assert((fxs_bal_4_wk1_post_collect - fxs_bal_4_wk1_pre_collect) >= 5.99, '[4] should have earned the 6 day FXS amount');

		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Advance 1 week and claim again. Should still be earning at 1x"));

		// Advance 7 days
		await time.increase((7 * 86400));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, TIMELOCK_ADMIN);
		const fxs_bal_4_wk2_pre_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		await staking_instance.getReward(TIMELOCK_ADMIN, { from: TIMELOCK_ADMIN });
		const fxs_bal_4_wk2_post_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		console.log("FXS collected [4] (7 days, post expiry): ", fxs_bal_4_wk2_post_collect - fxs_bal_4_wk2_pre_collect);
		assert((fxs_bal_4_wk2_post_collect - fxs_bal_4_wk2_pre_collect) >= 6.99, '[4] should have earned the weekly FXS amount');


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Advance 1 week and claim yet again. Should still be earning at 1x"));

		// Advance 7 days
		await time.increase((7 * 86400));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, TIMELOCK_ADMIN);
		const fxs_bal_4_wk3_pre_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		await staking_instance.getReward(TIMELOCK_ADMIN, { from: TIMELOCK_ADMIN });
		const fxs_bal_4_wk3_post_collect = new BigNumber(await fxs_instance.balanceOf(TIMELOCK_ADMIN)).div(BIG18).toNumber();
		console.log("FXS collected [4] (7 days, post expiry): ", fxs_bal_4_wk3_post_collect - fxs_bal_4_wk3_pre_collect);
		assert((fxs_bal_4_wk3_post_collect - fxs_bal_4_wk3_pre_collect) >= 6.99, '[4] should have earned the weekly FXS amount');

		console.log("Withdraw everything now to clean up for the future tests");
		let locked_stake_structs_4_wk3_0 = await staking_instance.lockedStakesOf.call(TIMELOCK_ADMIN);
		staking_instance.withdrawLocked(locked_stake_structs_4_wk3_0[0].kek_id, TIMELOCK_ADMIN, { from: TIMELOCK_ADMIN });


		console.log(chalk.yellow.bold("============================= MAIN TEST ============================"));

		const all_reward_tokens = await staking_instance.getAllRewardTokens.call();
		console.log("all_reward_tokens: ", all_reward_tokens);

		const ACCOUNT_9_CLAIMS_EARLY = true;
		let ACCOUNT_9_EARLY_EARN = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			ACCOUNT_9_EARLY_EARN.push(0);
		}
		
		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Print FXS balances
		const fxs_bal_week_0 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		console.log("FXS balance week 0:", fxs_bal_week_0);
		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await frax_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		console.log(chalk.yellow.bold("--------------- Stake once with [1] and test ---------------"));
		console.log(chalk.hex("#f3f3f3").bold("------Basic veFXS Info------"));
		const vefxs_bst_scl_fctr = new BigNumber(await staking_instance.vefxs_boost_scale_factor.call()).div(BIG18).toNumber();
		const vefxs_max_mult = new BigNumber(await staking_instance.vefxs_max_multiplier.call()).div(BIG18).toNumber();
		const vefxs_per_fx_max_bst = new BigNumber(await staking_instance.vefxs_per_frax_for_max_boost.call()).div(BIG18).toNumber();
		console.log("vefxs_boost_scale_factor: ", vefxs_bst_scl_fctr);
		console.log("vefxs_max_multiplier: ", vefxs_max_mult);
		console.log("vefxs_per_frax_for_max_boost: ", vefxs_per_fx_max_bst);

		console.log(chalk.hex("#f3f3f3").bold("------Note before lock------"));
		const vefxs_bal_1_bef = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const vefxs_mult_1_bef = new BigNumber(await staking_instance.veFXSMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const min_vefxs_max_boost_1_bef = new BigNumber(await staking_instance.minVeFXSForMaxBoost(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const user_staked_frax_1_bef = new BigNumber(await staking_instance.userStakedFrax(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance before [1]: ", vefxs_bal_1_bef);
		console.log("veFXS multiplier before [1]: ", vefxs_mult_1_bef);
		console.log("minVeFXSForMaxBoost before [1]: ", min_vefxs_max_boost_1_bef);
		console.log("userStakedFrax before [1]: ", user_staked_frax_1_bef);

		console.log(chalk.hex("#f3f3f3").bold("------Lock a position for [1]------"))
		await pair_instance.approve(staking_instance.address, liq_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.stakeLocked(liq_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		const stake_idx_1_0 = new BigNumber((await staking_instance.lockedStakesOfLength.call(COLLATERAL_FRAX_AND_FXS_OWNER))).toNumber() - 1;
		const frax_lp_locked_1 = liq_locked_1_dec * frax_per_lp_token_dec;
		console.log("Amount LP locked [1]: ", liq_locked_1_dec);
		console.log("FRAX in LP locked [1]: ", frax_lp_locked_1);

		console.log(chalk.hex("#f3f3f3").bold("------Note after lock [1]------"));
		const vefxs_bal_1_aft = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const vefxs_mult_1_aft = new BigNumber(await staking_instance.veFXSMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const lock_mult_1_aft = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, stake_idx_1_0)).div(BIG18).toNumber();
		const min_vefxs_max_boost_1_aft_bn = new BigNumber(await staking_instance.minVeFXSForMaxBoost(COLLATERAL_FRAX_AND_FXS_OWNER));
		const min_vefxs_max_boost_1_aft = min_vefxs_max_boost_1_aft_bn.div(BIG18).toNumber();
		const user_staked_frax_1_aft = new BigNumber(await staking_instance.userStakedFrax(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance after [1]: ", vefxs_bal_1_aft);
		console.log("veFXS multiplier after [1]: ", vefxs_mult_1_aft);
		console.log("lock multiplier after [1]: ", lock_mult_1_aft);
		console.log("minVeFXSForMaxBoost after [1]: ", min_vefxs_max_boost_1_aft);
		console.log("userStakedFrax after [1]: ", user_staked_frax_1_aft);


		console.log(chalk.hex("#f3f3f3").bold("------Quick check [minVeFXSForMaxBoost / userStakedFrax]------"));
		assert((min_vefxs_max_boost_1_aft / user_staked_frax_1_aft) >= (vefxs_per_fx_max_bst * .99), 'minVeFXSForMaxBoost / userStakedFrax error [too low]');
		assert((min_vefxs_max_boost_1_aft / user_staked_frax_1_aft) <= (vefxs_per_fx_max_bst * 1.01), 'minVeFXSForMaxBoost / userStakedFrax error [too high]');
		console.log("Looks ok");

		console.log(chalk.hex("#f3f3f3").bold("------Get some veFXS and target 1x veFXSMultiplier------"));
		const fxs_needed_at_4_year_for_max_bst = min_vefxs_max_boost_1_aft_bn.div(4);
		const fxs_needed_at_4_year_for_1x_bst = fxs_needed_at_4_year_for_max_bst.div(2).integerValue(BigNumber.ROUND_FLOOR);
		const fxs_needed_at_4_year_for_1x_bst_dec = fxs_needed_at_4_year_for_1x_bst.div(BIG18).toNumber();

		console.log(chalk.hex("#f3f3f3")(`Deposit ${fxs_needed_at_4_year_for_1x_bst_dec} FXS (4 years) for veFXS`));
		
		const veFXS_deposit_days_1 = (4 * 365); // 4 years
		let block_time_current_1 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_1 = block_time_current_1 + ((veFXS_deposit_days_1 * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, fxs_needed_at_4_year_for_1x_bst, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(fxs_needed_at_4_year_for_1x_bst, veFXS_deposit_end_timestamp_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
				
		console.log(chalk.hex("#f3f3f3").bold("------Note after veFXS increase------"));
		const vefxs_bal_1_aft_vefxs = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const vefxs_mult_1_aft_vefxs = new BigNumber(await staking_instance.veFXSMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const min_vefxs_max_boost_1_aft_vefxs = new BigNumber(await staking_instance.minVeFXSForMaxBoost(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const user_staked_frax_1_aft_vefxs = new BigNumber(await staking_instance.userStakedFrax(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance after veFXS lock [1]: ", vefxs_bal_1_aft_vefxs);
		console.log("veFXS multiplier after veFXS lock [1]: ", vefxs_mult_1_aft_vefxs);
		console.log("minVeFXSForMaxBoost after veFXS lock [1]: ", min_vefxs_max_boost_1_aft_vefxs);
		console.log("userStakedFrax after veFXS lock [1]: ", user_staked_frax_1_aft_vefxs);

		console.log(chalk.hex("#f3f3f3").bold("------Quick check [veFXSMultiplier]------"));
		assert(vefxs_mult_1_aft_vefxs >= .99, 'veFXSMultiplier error [too low]');
		assert(vefxs_mult_1_aft_vefxs <= 1.01, 'veFXSMultiplier error [too high]');
		console.log("Looks ok");


		console.log(chalk.yellow.bold("------------ Lock the other positions ------------"));
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance.approve(staking_instance.address, uni_pool_locked_9, { from: accounts[9] });
		
		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(new BigNumber ("25e17"), 365 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await staking_instance.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		let locked_stake_structs_1_0 = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		let locked_stake_structs_9_0 = await staking_instance.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", utilities.cleanLockedStakes(locked_stake_structs_1_0));
		console.log("LOCKED STAKES [9]: ", utilities.cleanLockedStakes(locked_stake_structs_9_0));

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const lock_mult_0a_1_0 = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, 0)).div(BIG18).toNumber();
		const lock_mult_0a_1_1 = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, 1)).div(BIG18).toNumber();
		const regular_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const lock_mult_0a_9 = new BigNumber(await staking_instance.calcCurrLockMultiplier(accounts[9], 0)).div(BIG18).toNumber();
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("LOCK MULTIPLIER [1] (Stake 0): ", lock_mult_0a_1_0.toString());
		console.log("LOCK MULTIPLIER [1] (Stake 1): ", lock_mult_0a_1_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("LOCK MULTIPLIER [0] (Stake 0): ", lock_mult_0a_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

	
		console.log("TRY A WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, accounts[9], { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		const _total_liquidity_locked_0 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		// Print the reward rate
		let reward_amount_check1 = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check1 per week (FXS): ", reward_amount_check1);

		// Print out the gauge relative weights
		const gauge_rel_wgt_check_0 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(staking_instance.address)).div(BIG18).toNumber();
		console.log("gauge_rel_wgt_check_0: ", gauge_rel_wgt_check_0);

		// Print the weekly emission
		const weekly_total_emission_check_0 = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission_check_0);

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WAIT UNTIL THE END OF THE 1st PERIOD"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		const period_end_1 = await staking_instance.periodFinish.call();

		const increase_time_1 = (period_end_1 - current_timestamp_1) + 10;
		console.log("increase_time_1 (days): ", increase_time_1 / 86400);
		await time.increase(increase_time_1);
		await time.advanceBlock();

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const lock_mult_00_1_0 = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, 0)).div(BIG18).toNumber();
		const lock_mult_00_1_1 = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, 1)).div(BIG18).toNumber();
		const regular_balance_00_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const lock_mult_00_9 = new BigNumber(await staking_instance.calcCurrLockMultiplier(accounts[9], 0)).div(BIG18).toNumber();
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("LOCK MULTIPLIER [1] (Stake 0): ", lock_mult_00_1_0.toString());
		console.log("LOCK MULTIPLIER [1] (Stake 1): ", lock_mult_00_1_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("LOCK MULTIPLIER [9] (Stake 0): ", lock_mult_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: STAKING_OWNER });

		const staking_earned_1_arr = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		// Call here, not send. Just want to see return values
		const staking_getRewardCall_1_arr = await staking_instance.getReward.call(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_9_arr = await staking_instance.earned.call(accounts[9]);
		const duration_reward_1_arr = await staking_instance.getRewardForDuration.call();

		let reward_week_1 = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			const staking_earned_1 = new BigNumber(staking_earned_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 1 week [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, staking_earned_1.toString());
			const staking_getReward_1 = new BigNumber(staking_getRewardCall_1_arr[j]).div(BIG18);
			console.log(`accounts[1] getReward call after 1 week [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, staking_getReward_1.toString());

			// Make sure getReward() and earned() match
			assert(staking_earned_1.isEqualTo(staking_getReward_1), `${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])} getReward() and earned() mismatch`);

			const staking_earned_9 = new BigNumber(staking_earned_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 1 week [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, staking_earned_9.toString());
	
			reward_week_1[j] = (staking_earned_1).plus(staking_earned_9);
			const effective_yearly_reward_at_week_1 = reward_week_1[j].multipliedBy(52.1429);
			console.log(`Effective weekly reward at week 1 [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, reward_week_1[j].toString());
			console.log(`Effective yearly reward at week 1 [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, effective_yearly_reward_at_week_1.toString());

			const duration_reward_1 = new BigNumber(duration_reward_1_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, duration_reward_1.multipliedBy(52.1429).toString());
		
			const reward_amount_this_week = new BigNumber(await staking_instance.rewardRates.call(j)).multipliedBy(604800).div(BIG18).toNumber();
			console.log(`reward per week from rewardRate (${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}): `, reward_amount_this_week);
		}

		// Note the FXS balance before the reward claims
		const fxs_bal_before_claim_wk_1 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[0].kek_id, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, accounts[9], { from: accounts[9] }));


		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		// Account 9 either claims or it does not
		if (ACCOUNT_9_CLAIMS_EARLY){
			console.log(chalk.green.bold("ACCOUNT[9] claims early"));

			// Mutate
			await staking_instance.getReward(accounts[9], { from: accounts[9] });

			ACCOUNT_9_EARLY_EARN[0] = new BigNumber(0);
		}
		else {
			console.log(chalk.red.bold("ACCOUNT[9] does not claim"));

			// Call
			const early_earned_res_9 = await staking_instance.earned.call(accounts[9])

			for (let j = 0; j < all_reward_tokens.length; j++){
				ACCOUNT_9_EARLY_EARN[j] = new BigNumber(early_earned_res_9[j]);
			}
		}

		// Note the FXS balance after the reward claims
		const fxs_bal_after_claim_wk_1 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		// Make sure the proper amount of FXS was actually emitted
		const fxs_actually_emitted_wk_1 = fxs_bal_before_claim_wk_1 - fxs_bal_after_claim_wk_1;
		const early_earn = ACCOUNT_9_EARLY_EARN[0].div(BIG18).toNumber()
		console.log("reward_week_1 [FXS]:", reward_week_1[0].toNumber());
		console.log("fxs_actually_emitted_wk_1:", fxs_actually_emitted_wk_1);
		console.log("ACCOUNT_9_EARLY_EARN[0]:", early_earn);
		assert(fxs_actually_emitted_wk_1 + early_earn >= (reward_week_1[0].toNumber() * .99), 'FXS actually emitted mismatches FXS earned() [underemission]');
		assert(fxs_actually_emitted_wk_1 + early_earn <= (reward_week_1[0].toNumber() * 1.01), 'FXS actually emitted mismatches FXS earned() [overemission]');

		// Print the reward rate
		let reward_amount_check2 = new BigNumber(await staking_instance.rewardRates.call(0)).multipliedBy(604800).div(BIG18).toNumber();
		console.log("reward_amount_check2 per week (FXS): ", reward_amount_check2);

		// Print out the gauge relative weights
		const gauge_rel_wgt_check_1 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(staking_instance.address)).div(BIG18).toNumber();
		console.log("gauge_rel_wgt_check_1: ", gauge_rel_wgt_check_1);

		// Print the weekly emission
		const weekly_total_emission_check_1 = new BigNumber(await frax_gauge_controller.global_emission_rate.call()).multipliedBy(604800).div(BIG18).toNumber();
		console.log("Weekly Total FXS Emission: ", weekly_total_emission_check_1);

		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("CUT THE VOTE FOR THE FARM by 90%"));

		console.log("------------------------------------------------");
		console.log("Vote for the farm");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		// Vote for this farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(staking_instance.address, 1000, { from: ADDRESS_WITH_VEFXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_VEFXS]
		});

		console.log("VOTE CUT");

		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("ADVANCING 28 DAYS"));
		
		// Advance 28 days (in one-week batches, to sync the TWAMM)
		for (let j = 0; j <= (28); j++){
			if (j % 7 == 0){
				await time.increase((7 * 86400));
				await time.advanceBlock();

				console.log(`Syncing TWAMM for week ${Math.floor(j / 7)}`)
				const current_ts = (new BigNumber(await time.latest())).toNumber();
				await pair_instance.executeVirtualOrders(current_ts, { from: accounts[1] });
			}
		}



		// Checkpoint the gauges again
		const current_timestamp_re_checkpoint = (new BigNumber(await time.latest())).toNumber();
		// await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, current_timestamp_re_checkpoint, { from: accounts[9] });
		// await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_re_checkpoint, { from: accounts[9] });
		// await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_re_checkpoint, { from: accounts[9] });
		// await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_re_checkpoint, { from: accounts[9] });
				
		await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", { from: accounts[9] });
				

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const lock_mult_01_1_0 = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, 0)).div(BIG18).toNumber();
		const lock_mult_01_1_1 = new BigNumber(await staking_instance.calcCurrLockMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER, 1)).div(BIG18).toNumber();
		const regular_balance_01_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const lock_mult_01_9 = new BigNumber(await staking_instance.calcCurrLockMultiplier(accounts[9], 0)).div(BIG18).toNumber();
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("LOCK MULTIPLIER [1] (Stake 0): ", lock_mult_01_1_0.toString());
		console.log("LOCK MULTIPLIER [1] (Stake 1): ", lock_mult_01_1_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("LOCK MULTIPLIER [9] (Stake 0): ", lock_mult_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());


		// Make sure there is a valid period for the contract and sync it
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_week5_1_arr = await staking_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_week5_9_arr = await staking_instance.earned.call(accounts[9]);
		const duration_reward_week5_arr = await staking_instance.getRewardForDuration.call();

		let reward_week_5 = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			const staking_earned_week5_1 = new BigNumber(staking_earned_week5_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 5 weeks [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, staking_earned_week5_1.toString());
			const staking_earned_week5_9 = new BigNumber(staking_earned_week5_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 5 weeks [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, staking_earned_week5_9.toString());
	
			reward_week_5[j] = (staking_earned_week5_1).plus(staking_earned_week5_9.minus(ACCOUNT_9_EARLY_EARN[j]));
			const effective_yearly_reward_at_week_5 = reward_week_5[j].multipliedBy(52.1429 / 4.0);
			console.log(`Effective weekly reward after 5 weeks [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, reward_week_5[j].div(4).toString());
			console.log(`Effective yearly reward after 5 weeks [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, effective_yearly_reward_at_week_5.toString());

			const duration_reward_week5 = new BigNumber(duration_reward_week5_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}]: `, duration_reward_week5.multipliedBy(52.1429).toString());
		
			const reward_amount_this_week = new BigNumber(await staking_instance.rewardRates.call(j)).multipliedBy(604800).div(BIG18).toNumber();
			console.log(`reward per week from rewardRate (${utilities.rewardTokenSymbolFromAddress(all_reward_tokens[j])}): `, reward_amount_this_week);
		}

		// Note the FXS balance before the reward claims
		const fxs_bal_before_claim_wk_5 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		// Account 9 withdraws and claims its locked stake
		await staking_instance.withdrawLocked(locked_stake_structs_9_0[0].kek_id, accounts[9], { from: accounts[9] });
		await staking_instance.getReward(accounts[9], { from: accounts[9] });
		await expectRevert.unspecified(staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log(chalk.yellow.bold("UNLOCKING ALL STAKES"));
		await staking_instance.unlockStakes({ from: STAKING_OWNER });
		await staking_instance.withdrawLocked(locked_stake_structs_1_0[1].kek_id, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

		const _total_liquidity_locked_2 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());

		// Note the FXS balance after the reward claims
		const fxs_bal_after_claim_wk_5 = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();

		// Make sure the proper amount of FXS was actually emitted
		const fxs_actually_emitted_wk_5 = fxs_bal_before_claim_wk_5 - fxs_bal_after_claim_wk_5;
		console.log("reward_week_5 [FXS]:", reward_week_5[0].toNumber());
		console.log("fxs_actually_emitted_wk_5:", fxs_actually_emitted_wk_5);
		assert(fxs_actually_emitted_wk_5 >= (reward_week_5[0].toNumber() * .99), 'FXS actually emitted mismatches FXS earned() [underemission]');
		assert(fxs_actually_emitted_wk_5 <= (reward_week_5[0].toNumber() * 1.01), 'FXS actually emitted mismatches FXS earned() [overemission]');

		console.log(chalk.yellow.bold("===================================================================="));
		console.log("PREPARING LOCK EXPIRY BOUNDARY ISSUE CHECK");

		const uni_pool_lock_boundary_check_amount = new BigNumber("1e18");

		// Get starting FXS balances
		const starting_bal_fxs_1 =  new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const starting_bal_fxs_9 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();
		
		// Approve
		await pair_instance.approve(staking_instance.address, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance.approve(staking_instance.address, uni_pool_lock_boundary_check_amount, { from: accounts[9] });
		
		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(uni_pool_lock_boundary_check_amount, 10 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await staking_instance.stakeLocked(uni_pool_lock_boundary_check_amount, 10 * 86400, { from: accounts[9] });


		console.log(chalk.yellow.bold("===================================================================="));
		console.log("account[1] claims right before expiry");

		// Advance 9 days and 12 hrs
		await time.increase((9.5 * 86400));
		await time.advanceBlock();

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Account 1 claims. Account 9 does not
		await staking_instance.getReward(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.yellow.bold("===================================================================="));
		console.log("Advance 60 days and have both accounts claim");

		// Advance 60 days (in one-week batches, to sync the TWAMM)
		for (let j = 0; j <= (28); j++){
			if (j % 7 == 0){
				await time.increase((7 * 86400));
				await time.advanceBlock();

				console.log(`Syncing TWAMM for week ${Math.floor(j / 7)}`)
				const current_ts = (new BigNumber(await time.latest())).toNumber();
				await pair_instance.executeVirtualOrders(current_ts, { from: accounts[1] });
			}
		}

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Both accounts claim
		await staking_instance.getReward(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.getReward(accounts[9], { from: accounts[9] });

		// Fetch the new balances
		const ending_bal_fxs_1 =  new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const ending_bal_fxs_9 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();

		// Print the balance changes. Should be close to the same
		console.log("account[1] FXS difference: ", ending_bal_fxs_1 - starting_bal_fxs_1);
		console.log("account[9] FXS difference: ", ending_bal_fxs_9 - starting_bal_fxs_9);


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Proxy test"));

		console.log(chalk.yellow(`Print balances before`));
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[9] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await staking_instance.lockedLiquidityOf(accounts[9]))).div(BIG18).toNumber());
		console.log("accounts[9] staked combinedWeightOf <BEFORE>:", (new BigNumber(await staking_instance.combinedWeightOf(accounts[9]))).div(BIG18).toNumber());

		console.log(chalk.yellow(`veFXS Proxy deposits 2.5 FXS for 4 years`));
		const deposit_amount_e18 = new BigNumber("25e17");
		let block_time_current_0 = (await time.latest()).toNumber();
		let staking_end_time = block_time_current_0 + (126144000);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_e18, { from: accounts[4] });
		await veFXS_instance.create_lock(deposit_amount_e18, staking_end_time, { from: accounts[4] });

		const vefxs_multiplier_1_pre_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const vefxs_multiplier_9_pre_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		const min_vefxs_whale_pre_proxy = new BigNumber(await staking_instance.minVeFXSForMaxBoostProxy.call(accounts[4])).div(BIG18);
		const lp_whale_pre_proxy = new BigNumber(await staking_instance.proxy_lp_balances.call(accounts[4])).div(BIG18);
		const max_lp_whale_pre_proxy = new BigNumber(await staking_instance.maxLPForMaxBoost.call(accounts[4])).div(BIG18);
		console.log("veFXS multiplier (pre proxy) [1]: ", vefxs_multiplier_1_pre_proxy.toString());
		console.log("veFXS multiplier (pre proxy) [9]: ", vefxs_multiplier_9_pre_proxy.toString());
		console.log("minVeFXSForMaxBoostProxy (veFXS whale): ", min_vefxs_whale_pre_proxy.toString());
		console.log("LP balance (veFXS whale): ", lp_whale_pre_proxy.toString());
		console.log("maxLPForMaxBoost (veFXS whale): ", max_lp_whale_pre_proxy.toString());

		console.log(chalk.yellow("Add the veFXS whale as a valid proxy"));
		await staking_instance.toggleValidVeFXSProxy(accounts[4], { from: STAKING_OWNER });

		console.log(chalk.yellow("veFXS whale allows accounts[1] and accounts[9] as a proxy-ee"));
		await staking_instance.proxyToggleStaker(COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[4] });
		await staking_instance.proxyToggleStaker(accounts[9], { from: accounts[4] });

		console.log(chalk.yellow("[1] and [9] use veFXS whale as proxy"));
		await staking_instance.stakerSetVeFXSProxy(accounts[4], { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.stakerSetVeFXSProxy(accounts[4], { from: accounts[9] });

		const vefxs_multiplier_1_post_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const vefxs_multiplier_9_post_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		const min_vefxs_whale_post_proxy = new BigNumber(await staking_instance.minVeFXSForMaxBoostProxy.call(accounts[4])).div(BIG18);
		const lp_whale_post_proxy = new BigNumber(await staking_instance.proxy_lp_balances.call(accounts[4])).div(BIG18);
		const max_lp_whale_post_proxy = new BigNumber(await staking_instance.maxLPForMaxBoost.call(accounts[4])).div(BIG18);
		console.log(chalk.yellow("Should be max boosted"));
		console.log("veFXS multiplier (post proxy) [1]: ", vefxs_multiplier_1_post_proxy.toString());
		console.log("veFXS multiplier (post proxy) [9]: ", vefxs_multiplier_9_post_proxy.toString());
		console.log("minVeFXSForMaxBoostProxy (veFXS whale): ", min_vefxs_whale_post_proxy.toString());
		console.log("LP balance (veFXS whale): ", lp_whale_post_proxy.toString());
		console.log("maxLPForMaxBoost (veFXS whale): ", max_lp_whale_post_proxy.toString());

		// Make sure the multiplier is higher now
		// Skip test for [1] since it is proxying now
		// assert(vefxs_multiplier_1_post_proxy.isGreaterThanOrEqualTo(vefxs_multiplier_1_pre_proxy), `Proxying should have boosted the multiplier`);
		assert(vefxs_multiplier_9_post_proxy.isGreaterThanOrEqualTo(vefxs_multiplier_9_pre_proxy), `Proxying should have boosted the multiplier`);

		// Add 1 more LP token to the lock
		console.log(chalk.yellow("Add 1 more LP token for [9]. Should stay at max boost (still under LP limit)"));
		let add_more_before = await staking_instance.lockedStakes.call(accounts[9], 0);
		const addl_amt = new BigNumber("1e18");
		await pair_instance.approve(staking_instance.address, addl_amt, { from: accounts[9] });
		await staking_instance.lockAdditional(add_more_before.kek_id, addl_amt, { from: accounts[9] });

		const vefxs_multiplier_1_post_proxy_addl = new BigNumber(await staking_instance.veFXSMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const vefxs_multiplier_9_post_proxy_addl = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		const min_vefxs_whale_post_proxy_addl = new BigNumber(await staking_instance.minVeFXSForMaxBoostProxy.call(accounts[4])).div(BIG18);
		const lp_whale_post_proxy_addl = new BigNumber(await staking_instance.proxy_lp_balances.call(accounts[4])).div(BIG18);
		const max_lp_whale_post_proxy_addl = new BigNumber(await staking_instance.maxLPForMaxBoost.call(accounts[4])).div(BIG18);
		console.log("veFXS multiplier (after add) [1]: ", vefxs_multiplier_1_post_proxy_addl.toString());
		console.log("veFXS multiplier (after add) [9]: ", vefxs_multiplier_9_post_proxy_addl.toString());
		console.log("minVeFXSForMaxBoostProxy (veFXS whale): ", min_vefxs_whale_post_proxy_addl.toString());
		console.log("LP balance (veFXS whale): ", lp_whale_post_proxy_addl.toString());
		console.log("maxLPForMaxBoost (veFXS whale): ", max_lp_whale_post_proxy_addl.toString());

		// Make sure minVeFXSForMaxBoostProxy increases
		assert(min_vefxs_whale_post_proxy_addl.isGreaterThan(min_vefxs_whale_post_proxy), `minVeFXSForMaxBoostProxy should have increased`);

		// Add 5 more LP tokens to the lock.
		console.log(chalk.yellow("Add 40 more LP tokens for [9]. Should push the multiplier below the max"));
		let add_more_before_max = await staking_instance.lockedStakes.call(accounts[9], 0);
		const addl_amt_max = new BigNumber("40e18");
		await pair_instance.approve(staking_instance.address, addl_amt_max, { from: accounts[9] });
		await staking_instance.lockAdditional(add_more_before_max.kek_id, addl_amt_max, { from: accounts[9] });

		const vefxs_multiplier_1_post_proxy_addl_max = new BigNumber(await staking_instance.veFXSMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const vefxs_multiplier_9_post_proxy_addl_max = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		const min_vefxs_whale_post_proxy_addl_max = new BigNumber(await staking_instance.minVeFXSForMaxBoostProxy.call(accounts[4])).div(BIG18);
		const lp_whale_post_proxy_addl_max = new BigNumber(await staking_instance.proxy_lp_balances.call(accounts[4])).div(BIG18);
		const max_lp_whale_post_proxy_addl_max = new BigNumber(await staking_instance.maxLPForMaxBoost.call(accounts[4])).div(BIG18);
		console.log("veFXS multiplier (after add max) [1]: ", vefxs_multiplier_1_post_proxy_addl_max.toString());
		console.log("veFXS multiplier (after add max) [9]: ", vefxs_multiplier_9_post_proxy_addl_max.toString());
		console.log("minVeFXSForMaxBoostProxy (veFXS whale): ", min_vefxs_whale_post_proxy_addl_max.toString());
		console.log("LP balance (veFXS whale): ", lp_whale_post_proxy_addl_max.toString());
		console.log("maxLPForMaxBoost (veFXS whale): ", max_lp_whale_post_proxy_addl_max.toString());

		// Make sure the veFXS multiplier decreases
		assert(vefxs_multiplier_1_post_proxy_addl_max.isLessThan(vefxs_multiplier_1_post_proxy_addl), `veFXS multiplier should have decreased`);
		assert(vefxs_multiplier_9_post_proxy_addl_max.isLessThan(vefxs_multiplier_9_post_proxy_addl), `veFXS multiplier should have decreased`);

		console.log(chalk.yellow("veFXS whale disallows accounts [1] and [9] as a proxy-ee"));
		await staking_instance.proxyToggleStaker(COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[4] });
		await staking_instance.proxyToggleStaker(accounts[9], { from: accounts[4] });

		const vefxs_multiplier_1_post_proxy_disallow = new BigNumber(await staking_instance.veFXSMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const vefxs_multiplier_9_post_proxy_disallow = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		const min_vefxs_whale_post_proxy_disallow = new BigNumber(await staking_instance.minVeFXSForMaxBoostProxy.call(accounts[4])).div(BIG18);
		const lp_whale_post_proxy_disallow = new BigNumber(await staking_instance.proxy_lp_balances.call(accounts[4])).div(BIG18);
		const max_lp_whale_post_proxy_disallow = new BigNumber(await staking_instance.maxLPForMaxBoost.call(accounts[4])).div(BIG18);
		console.log("veFXS multiplier (after disallow) [1]: ", vefxs_multiplier_1_post_proxy_disallow.toString());
		console.log("veFXS multiplier (after disallow) [9]: ", vefxs_multiplier_9_post_proxy_disallow.toString());
		console.log("minVeFXSForMaxBoostProxy (veFXS whale): ", min_vefxs_whale_post_proxy_disallow.toString());
		console.log("LP balance (veFXS whale): ", lp_whale_post_proxy_disallow.toString());
		console.log("maxLPForMaxBoost (veFXS whale): ", max_lp_whale_post_proxy_disallow.toString());

		// Make sure the weight went back to what it was before
		assert(vefxs_multiplier_1_post_proxy_disallow.isEqualTo(vefxs_multiplier_1_pre_proxy), `Multiplier [1] should be back to normal`);
		assert(vefxs_multiplier_9_post_proxy_disallow.isEqualTo(vefxs_multiplier_9_pre_proxy), `Multiplier [9] should be back to normal`);

		// Make sure the proxy lp balance went back to what it was before
		assert(lp_whale_post_proxy_disallow.isEqualTo(lp_whale_pre_proxy), `Proxy LP balance should be back to normal`);
		
		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Add more to a lock"));

		// Print the info for the stake
		add_more_before = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		console.log("add_more_before: ", utilities.cleanLockedStake(add_more_before));

		// Add 1 more LP token to the lock
		await pair_instance.approve(staking_instance.address, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.lockAdditional(add_more_before.kek_id, uni_pool_lock_boundary_check_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the info for the stake
		const add_more_after = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		console.log("add_more_after: ", utilities.cleanLockedStake(add_more_after));

		// Make sure the liquidity has increased
		const add_liq_before = new BigNumber(add_more_before.liquidity);
		const add_liq_after = new BigNumber(add_more_after.liquidity);
		const add_liq_diff = add_liq_after.minus(add_liq_before);
		console.log("Add liq diff: ", add_liq_diff.toString());
		assert(add_liq_after.isGreaterThan(add_liq_before), `Liquidity did not increase`);


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Extend lock"));

		// Print the info for the stake
		let extend_lock_before = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		const cleaned_lock_stake_before = utilities.cleanLockedStake(extend_lock_before);
		console.log("extend_lock_before: ", cleaned_lock_stake_before);

		// Extend lock
		const end_ts_before = parseInt(cleaned_lock_stake_before.ending_timestamp);
		const extend_lock_time = (30 * 86400);
		const current_timestamp_extend_lock = (new BigNumber(await time.latest())).toNumber();
		const end_ts_after_calc = current_timestamp_extend_lock + extend_lock_time;
		let true_lock_mx_before = new BigNumber(await staking_instance.calcCurrLockMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2)).div(BIG18).toNumber();
		console.log("true_lock_mx_before: ", true_lock_mx_before);
		console.log("end_ts_before: ", end_ts_before);
		console.log("current_timestamp: ", current_timestamp_extend_lock);
		console.log("end_ts_after_calc: ", end_ts_after_calc);
		await staking_instance.lockLonger(extend_lock_before.kek_id, end_ts_after_calc, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the info for the stake
		const extend_lock_after = await staking_instance.lockedStakes.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2);
		const cleaned_lock_stake_after = utilities.cleanLockedStake(extend_lock_after);
		const end_ts_after_actual = parseInt(cleaned_lock_stake_after.ending_timestamp);
		let true_lock_mx_after = new BigNumber(await staking_instance.calcCurrLockMultiplier.call(COLLATERAL_FRAX_AND_FXS_OWNER, 2)).div(BIG18).toNumber();
		console.log("true_lock_mx_after: ", true_lock_mx_after);
		console.log("end_ts_after_actual: ", end_ts_after_actual);
		console.log("extend_lock_after: ", utilities.cleanLockedStake(extend_lock_after));

		// Make sure the end time has increased
		const end_time_diff = end_ts_after_actual - current_timestamp_extend_lock;
		console.log("End time diff: ", end_time_diff);
		expect(end_time_diff).to.be.closeTo(extend_lock_time, extend_lock_time * .02);
	});

	it("Communal / Token Manager Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("================Communal / Token Manager Tests================"));

		const staking_reward_tokens_addresses = await staking_instance.getAllRewardTokens.call();
		const test_recovery_amount = new BigNumber("1e18");

		// Get FXS and SUSHI balances
		const fxs_bal = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		const gel_bal = new BigNumber(await rew1_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		console.log("fxs_bal: ", fxs_bal);
		console.log("gel_bal: ", gel_bal);

		console.log("Try recovering a non-reward token as the owner");
		await staking_instance.recoverERC20(frax_instance.address, test_recovery_amount, { from: STAKING_OWNER });

		console.log("Set a reward rate as the owner");
		await staking_instance.setRewardVars(staking_reward_tokens_addresses[1], 1000, frax_gauge_controller.address, gauge_rewards_distributor_instance.address, { from: STAKING_OWNER });

		for (let j = 0; j < staking_reward_tokens_addresses.length; j++){
			const rew_tkn_addr = staking_reward_tokens_addresses[j];
			const rew_tkn_symbol = utilities.rewardTokenSymbolFromAddress(rew_tkn_addr)
			const token_manager_address = await staking_instance.rewardManagers.call(staking_reward_tokens_addresses[j]);

			console.log(chalk.yellow.bold(`--------------${rew_tkn_addr} [${rew_tkn_symbol}]--------------`));
			console.log(`[${rew_tkn_symbol} Manager]: ${token_manager_address}`);
			console.log(`[${rew_tkn_symbol} Address]: ${rew_tkn_addr}`);

			// Print the balance
			const quick_instance = await ERC20.at(rew_tkn_addr);
			const current_balance = new BigNumber(await quick_instance.balanceOf(staking_instance.address));
			console.log("Current balance:", current_balance.div(BIG18).toNumber());
		
			console.log("Try to set the reward rate with the wrong manager [SHOULD FAIL]");
			await expectRevert(
				staking_instance.setRewardVars(rew_tkn_addr, 0, ZERO_ADDRESS, ZERO_ADDRESS, { from: accounts[9] }),
				"Not owner or tkn mgr"
			);

			console.log("Try to change the token manager with the wrong account [SHOULD FAIL]");
			await expectRevert(
				staking_instance.changeTokenManager(rew_tkn_addr, COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[9] }),
				"Not owner or tkn mgr"
			);

			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [token_manager_address]
			});
	
			console.log("Set the reward rate with the correct manager");
			const gauge_ctr_add_to_use = (j == 0 ? frax_gauge_controller.address : ZERO_ADDRESS);
			const gauge_rew_dist_add_to_use = (j == 0 ? gauge_rewards_distributor_instance.address : ZERO_ADDRESS);
			await staking_instance.setRewardVars(rew_tkn_addr, 0, gauge_ctr_add_to_use, gauge_rew_dist_add_to_use, { from: token_manager_address });

			console.log("Try recovering reward tokens as the reward manager");
			const tkn_bal_before_rec = new BigNumber(await quick_instance.balanceOf(staking_instance.address));
			console.log(`${rew_tkn_symbol} balance before: ${tkn_bal_before_rec.div(BIG18).toNumber()}`);
			await staking_instance.recoverERC20(rew_tkn_addr, test_recovery_amount, { from: token_manager_address });
			const tkn_bal_after_rec = new BigNumber(await quick_instance.balanceOf(staking_instance.address));
			console.log(`${rew_tkn_symbol} balance after: ${tkn_bal_after_rec.div(BIG18).toNumber()}`);
			assert(tkn_bal_before_rec.minus(tkn_bal_after_rec).isEqualTo(test_recovery_amount), "Reward token not recovered");

			console.log("Change the token manager");
			await staking_instance.changeTokenManager(rew_tkn_addr, COLLATERAL_FRAX_AND_FXS_OWNER, { from: token_manager_address });
	
			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [token_manager_address]
			});
		}
	});

	it("Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await staking_instance.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log("---------TRY TO ERC20 RECOVER WHILE NOT AN OWNER [SHOULD FAIL]---------");
		await expectRevert(
			staking_instance.recoverERC20(pair_instance.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Not owner or tkn mgr"
		);

		console.log("---------TRY TO ERC20 RECOVER A REWARD TOKEN AS THE OWNER [SHOULD FAIL]---------");
		await expectRevert(
			staking_instance.recoverERC20(rew1_instance.address, test_amount_1, { from: STAKING_OWNER }),
			"No valid tokens to recover"
		);
	});

	it("Proxy Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Proxy Tests=============="));

		console.log(chalk.blue("=============TEST WITH NO PROXIES [SHOULD FAIL]============="));

		console.log("--------- TRY ADD A PROXY NOT AS GOVERNANCE ---------");
		await expectRevert(
			staking_instance.toggleValidVeFXSProxy(accounts[4], { from: accounts[9] }),
			"Not owner or timelock"
		);

		console.log("--------- TRY ALLOWING A STAKER FOR AN INVALID PROXY ---------");
		await expectRevert(
			staking_instance.proxyToggleStaker(accounts[9], { from: MIGRATOR_ADDRESS }),
			"Invalid proxy"
		);

		console.log("--------- TRY ALLOWING A INVALID PROXY FOR A STAKER ---------");
		await expectRevert(
			staking_instance.stakerSetVeFXSProxy(MIGRATOR_ADDRESS, { from: accounts[9] }),
			"Invalid proxy"
		);


		console.log(chalk.blue("=============TEST WITH PROXIES [SHOULD FAIL]============="));

		// Set a real proxy now
		staking_instance.toggleValidVeFXSProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: STAKING_OWNER }),


		console.log("--------- TRY ALLOWING A VALID PROXY FOR A STAKER BEFORE THE PROXY TOGGLED THEM FIRST ---------");
		await expectRevert(
			staking_instance.stakerSetVeFXSProxy(GOVERNOR_GUARDIAN_ADDRESS, { from: accounts[9] }),
			"Proxy has not allowed you yet"
		);
	});

});