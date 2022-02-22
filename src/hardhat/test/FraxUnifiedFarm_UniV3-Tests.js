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

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");
const IGUniPool = artifacts.require("Misc_AMOs/gelato/IGUniPool");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Collateral
const WETH = artifacts.require("ERC20/WETH");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const ComboOracle = artifacts.require("Oracle/ComboOracle");
const ComboOracle_UniV2_UniV3 = artifacts.require("Oracle/ComboOracle_UniV2_UniV3");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const FraxUnifiedFarm_UniV3_FRAX_RAI = artifacts.require("Staking/Variants/FraxUnifiedFarm_UniV3_FRAX_RAI");

// veFXS and gauge related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSBoost = artifacts.require("Curve/IVotingEscrowDelegation");
const veFXSBoostDelegationProxy = artifacts.require("Curve/IDelegationProxy");
const FraxGaugeController = artifacts.require("Curve/IFraxGaugeController");
const FraxGaugeFXSRewardsDistributor = artifacts.require("Curve/IFraxGaugeFXSRewardsDistributor");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

contract('FraxUnifiedFarm_UniV3-Tests', async (accounts) => {
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
	const ADDRESS_WITH_RAI = '0xeB2629a2734e272Bcc07BDA959863f316F4bD4Cf';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_FLX = '0xbE74e7AA108436324D5dd3db4979Db3Ba2cAEbcB';
	const ADDRESS_WITH_VEFXS = '0xfF5B4BCbf765FE363269114e1c765229a29eDeFD';
	const ADDRESS_VEFXS_WHALE = '0xb55794c3bef4651b6cBc78b64a2Ef6c5c67837C3';

	const ADDRESS_WITH_UNI_V3_NFT_1 = '0x5180db0237291A6449DdA9ed33aD90a38787621c';
	const TOKEN_ID_1 = 167096;
	const TOKEN_ID_1_ALT_GOOD = 166746;
	const ADDRESS_WITH_UNI_V3_NFT_9 = '0x36a87d1e3200225f881488e4aeedf25303febcae';
	const TOKEN_ID_9_INVALID_WRONG_TICKS = 166748;
	const TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS = 12252;
	const TOKEN_ID_9_INVALID_WRONG_FEE = 166750;
	const TOKEN_ID_9 = 166749;
	const TOKEN_ID_9_INSIDE_WRONG_TICKS = 166753;
	const TOKEN_ID_9_OUTSIDE_WRONG_TICKS = 166751;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let flx_instance;
	let rai_instance;

	// Initialize the Uniswap V3 Positions NFT
	let uniswapV3PositionsNFTInstance;

	// Initialize oracle instances
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;
	let combo_oracle_instance;
    let combo_oracle_univ2_univ3_instance;

	// Initialize staking instances
	let fraxUnifiedFarm_UniV3_FRAX_RAI_instance;
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
		flx_instance = await ERC20.at("0x6243d8CEA23066d098a15582d81a598b4e8391F4");
		rai_instance = await ERC20.at("0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919");

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		combo_oracle_instance = await ComboOracle.deployed(); 
		combo_oracle_univ2_univ3_instance = await ComboOracle_UniV2_UniV3.deployed(); 
	
		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();

		// Fill the Uniswap V3 Instances
		uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Fill the staking rewards instances
		fraxUnifiedFarm_UniV3_FRAX_RAI_instance = await FraxUnifiedFarm_UniV3_FRAX_RAI.deployed();

		// veFXS and gauge related
		veFXS_instance = await veFXS.deployed();
		frax_gauge_controller = await FraxGaugeController.deployed();
		gauge_rewards_distributor_instance = await FraxGaugeFXSRewardsDistributor.deployed();

		// Set which pairs to test
		console.log(chalk.hex("#ff8b3d").bold("CHOOSING THE STAKING CONTRACT"))
		// staking_instance = stakingInstanceMultiGauge_FXS_WETH;
		staking_instance = fraxUnifiedFarm_UniV3_FRAX_RAI_instance;

		// Set which pairs to test
		console.log(chalk.hex("#ff8b3d").bold("CHOOSING THE PAIR"))
		// pair_instance = pair_instance_FXS_WETH_Sushi;
		// pair_instance = pair_instance_Gelato_FRAX_DAI;
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("------------------------------------------------");
		console.log("Give address [1] some FRAX, for the add liquidities");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("2500e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		console.log("------------------------------------------------");
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

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with FLX");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FLX]
		});

		await flx_instance.transfer(staking_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FLX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FLX]
		});

		console.log("------------------------------------------------");
		console.log("Give address[1] some RAI");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_RAI]
		});

		await rai_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("3000e18"), { from: ADDRESS_WITH_RAI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_RAI]
		});

		console.log("------------------------------------------------");
		console.log("Give a NFT to a test user");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_1]
		});

		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_1, accounts[1], TOKEN_ID_1, { from: ADDRESS_WITH_UNI_V3_NFT_1 });
		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_1, accounts[1], TOKEN_ID_1_ALT_GOOD, { from: ADDRESS_WITH_UNI_V3_NFT_1 });
		

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_1]
		});

		console.log("------------------------------------------------");
		console.log("Give different NFTs to a different test user");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_9]
		});

		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_9, accounts[9], TOKEN_ID_9, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_9, accounts[9], TOKEN_ID_9_INVALID_WRONG_TICKS, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_9, accounts[9], TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_9, accounts[9], TOKEN_ID_9_INVALID_WRONG_FEE, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_9, accounts[9], TOKEN_ID_9_INSIDE_WRONG_TICKS, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		await uniswapV3PositionsNFTInstance.safeTransferFrom(ADDRESS_WITH_UNI_V3_NFT_9, accounts[9], TOKEN_ID_9_OUTSIDE_WRONG_TICKS, { from: ADDRESS_WITH_UNI_V3_NFT_9 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_9]
		});

		console.log("------------------------------------------------");
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

		console.log("------------------------------------------------");
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

		console.log("------------------------------------------------");
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

		// Add a migrator address
		await staking_instance.toggleMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		// Move to the end of the gauge controller period
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
		await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_0, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_0, { from: accounts[9] });
		
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

		const all_reward_tokens = await staking_instance.getAllRewardTokens.call();
		console.log("all_reward_tokens: ", all_reward_tokens);

		const ACCOUNT_9_CLAIMS_EARLY = true;
		let ACCOUNT_9_EARLY_EARN = [];
		for (let j = 0; j < all_reward_tokens.length; j++){
			ACCOUNT_9_EARLY_EARN.push(0);
		}
		
		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);


		console.log(chalk.yellow.bold("--------------- Stake once with [1] and test ---------------"));
		console.log(chalk.hex("#f3f3f3").bold("------Basic veFXS Info------"));
		const vefxs_bst_scl_fctr = new BigNumber(await staking_instance.vefxs_boost_scale_factor.call()).div(BIG18).toNumber();
		const vefxs_max_mult = new BigNumber(await staking_instance.vefxs_max_multiplier.call()).div(BIG18).toNumber();
		const vefxs_per_fx_max_bst = new BigNumber(await staking_instance.vefxs_per_frax_for_max_boost.call()).div(BIG18).toNumber();
		console.log("vefxs_boost_scale_factor: ", vefxs_bst_scl_fctr);
		console.log("vefxs_max_multiplier: ", vefxs_max_mult);
		console.log("vefxs_per_frax_for_max_boost: ", vefxs_per_fx_max_bst);

		console.log(chalk.hex("#f3f3f3").bold("------Basic LP Info------"));
		const nft_info = await uniswapV3PositionsNFTInstance.positions.call(TOKEN_ID_1);
		const liq_locked_1 = new BigNumber(nft_info[7]);
		const liq_locked_1_dec = liq_locked_1.div(BIG18).toNumber();
		const frax_per_lp_token_bn = await staking_instance.fraxPerLPToken.call();
		const frax_per_lp_token_dec = new BigNumber(frax_per_lp_token_bn).div(BIG18).toNumber();
		console.log("Liq to lock: ", liq_locked_1_dec);
		console.log("frax_per_lp_token: ", frax_per_lp_token_dec);

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
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.stakeLocked(TOKEN_ID_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 7 days
		const frax_lp_locked_1 = liq_locked_1_dec * frax_per_lp_token_dec;
		console.log("Amount LP locked [1]: ", liq_locked_1_dec);
		console.log("FRAX in LP locked [1]: ", frax_lp_locked_1);

		console.log(chalk.hex("#f3f3f3").bold("------Note after lock------"));
		const vefxs_bal_1_aft = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const vefxs_mult_1_aft = new BigNumber(await staking_instance.veFXSMultiplier(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const min_vefxs_max_boost_1_aft_bn = new BigNumber(await staking_instance.minVeFXSForMaxBoost(COLLATERAL_FRAX_AND_FXS_OWNER));
		const min_vefxs_max_boost_1_aft = min_vefxs_max_boost_1_aft_bn.div(BIG18).toNumber();
		const user_staked_frax_1_aft = new BigNumber(await staking_instance.userStakedFrax(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance after [1]: ", vefxs_bal_1_aft);
		console.log("veFXS multiplier after [1]: ", vefxs_mult_1_aft);
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
		// account[1]
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9, { from: accounts[9] });

		// Get the starting timestamp
		const starting_timestamp = (new BigNumber(await time.latest())).toNumber();

		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(TOKEN_ID_1_ALT_GOOD, 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 548 days
		
		// account[9]
		await staking_instance.stakeLocked(TOKEN_ID_9, 28 * 86400, { from: accounts[9] }); // 28 days

		await time.advanceBlock();

		// Show the stake structs
		const locked_NFT_structs_1 = await staking_instance.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_NFT_structs_9 = await staking_instance.lockedNFTsOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_NFT_structs_1);
		console.log("LOCKED STAKES [9]: ", locked_NFT_structs_9);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await staking_instance.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const combined_weight_1 = new BigNumber(await staking_instance.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await staking_instance.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const combined_weight_9 = new BigNumber(await staking_instance.combinedWeightOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", combined_weight_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", combined_weight_9.toString());
		
		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert(
			staking_instance.withdrawLocked(TOKEN_ID_1, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Stake is still locked"
		);
		await expectRevert(
			staking_instance.withdrawLocked(TOKEN_ID_9, accounts[9], { from: accounts[9] }),
			"Stake is still locked"
		);
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

		const increase_time_1 = (period_end_1 - current_timestamp_1) + 1;
		console.log("increase_time_1 (days): ", increase_time_1 / 86400);
		await time.increase(increase_time_1);
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
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
		console.log("[1] SHOULD SUCCEED (WITH THE TOKEN_ID_1), [9] SHOULD FAIL");

		// Advance to the end of the lock
		const current_timestamp_end_lock = (new BigNumber(await time.latest())).toNumber();
		const increase_time_end_lock = ((starting_timestamp + (7 * 86400)) - current_timestamp_end_lock) + 1;
		await time.increase(increase_time_end_lock);
		await time.advanceBlock();

		await staking_instance.withdrawLocked(TOKEN_ID_1, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			staking_instance.withdrawLocked(TOKEN_ID_9, accounts[9], { from: accounts[9] }),
			"Stake is still locked"
		);

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
		
		// Advance 28 days
		await time.increase((28 * 86400));
		await time.advanceBlock();

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		

		// Checkpoint the gauges again
		const current_timestamp_re_checkpoint = (new BigNumber(await time.latest())).toNumber();
		await frax_gauge_controller.gauge_relative_weight_write(staking_instance.address, current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0xF22471AC2156B489CC4a59092c56713F813ff53e", current_timestamp_re_checkpoint, { from: accounts[9] });
		await frax_gauge_controller.gauge_relative_weight_write("0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", current_timestamp_re_checkpoint, { from: accounts[9] });
				
		// Sync the contract
		await staking_instance.sync_gauge_weights(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);

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
		await staking_instance.withdrawLocked(TOKEN_ID_9, accounts[9], { from: accounts[9] });
		await staking_instance.getReward(accounts[9], { from: accounts[9] });
		await expectRevert.unspecified(staking_instance.withdrawLocked(TOKEN_ID_1_ALT_GOOD, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log(chalk.yellow.bold("UNLOCKING ALL STAKES"));
		await staking_instance.unlockStakes({ from: STAKING_OWNER });
		await staking_instance.withdrawLocked(TOKEN_ID_1_ALT_GOOD, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

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
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9, { from: accounts[9] });

		// Stake Locked
		// account[1]
		await staking_instance.stakeLocked(TOKEN_ID_1, 10 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await staking_instance.stakeLocked(TOKEN_ID_9, 10 * 86400, { from: accounts[9] });


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

		// Advance 2 weeks
		await time.increase((60 * 86400));
		await time.advanceBlock();

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

		const vefxs_multiplier_9_pre_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		console.log("veFXS multiplier [9]: ", vefxs_multiplier_9_pre_proxy.toString());

		console.log(chalk.yellow("Add the veFXS whale as a valid proxy"));
		await staking_instance.toggleValidVeFXSProxy(ADDRESS_VEFXS_WHALE, { from: STAKING_OWNER });

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		console.log(chalk.yellow("veFXS whale allows accounts[9] as a proxy-ee"));
		await staking_instance.proxyToggleStaker(accounts[9], { from: ADDRESS_VEFXS_WHALE });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		console.log(chalk.yellow("Staker uses veFXS whale as proxy"));
		await staking_instance.stakerSetVeFXSProxy(ADDRESS_VEFXS_WHALE, { from: accounts[9] });

		const vefxs_multiplier_9_post_proxy = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		console.log("veFXS multiplier [9]: ", vefxs_multiplier_9_post_proxy.toString());

		// Make sure the weight is higher now
		assert(vefxs_multiplier_9_post_proxy.isGreaterThan(vefxs_multiplier_9_pre_proxy), `Proxing should have boosted the weight`);

		assert(false, "ADD MORE TESTS HERE. SEE THE ERC20 TESTS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		console.log(chalk.yellow("veFXS whale disallows accounts[9] as a proxy-ee"));
		await staking_instance.proxyToggleStaker(accounts[9], { from: ADDRESS_VEFXS_WHALE });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_VEFXS_WHALE]
		});

		const vefxs_multiplier_9_post_proxy_disallow = new BigNumber(await staking_instance.veFXSMultiplier.call(accounts[9])).div(BIG18);
		console.log("veFXS multiplier [9]: ", vefxs_multiplier_9_post_proxy_disallow.toString());

		// Make sure the weight went back to what it was before
		assert(vefxs_multiplier_9_post_proxy_disallow.isEqualTo(vefxs_multiplier_9_pre_proxy), `Weight should be back to normal`);

		
		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Add more to a lock (normal method)"));

		// Print the info for the stake before
		const add_more_before_arr = await staking_instance.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const add_more_nft_before = utilities.getLockedNFTInfoFromArr(add_more_before_arr, TOKEN_ID_1);
		console.log("TOKEN_ID_1 before add more (normal): ", add_more_nft_before);

		// Add more FRAX and RAI to the position
		const add_tkn_amt = new BigNumber("1000e18");
		await rai_instance.approve(staking_instance.address, add_tkn_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(staking_instance.address, add_tkn_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Lock additional
		await staking_instance.lockAdditional(TOKEN_ID_1, add_tkn_amt, add_tkn_amt, 0, 0, false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the info for the stake after
		const add_more_after_arr = await staking_instance.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const add_more_nft_after = utilities.getLockedNFTInfoFromArr(add_more_after_arr, TOKEN_ID_1);
		console.log("TOKEN_ID_1 after add more (normal): ", add_more_nft_after);

		// Make sure the liquidity has increased
		const add_liq_before = new BigNumber(add_more_nft_before.liquidity);
		const add_liq_after = new BigNumber(add_more_nft_after.liquidity);
		const add_liq_diff = add_liq_after.minus(add_liq_before);
		console.log("Add liq diff (normal): ", add_liq_diff.toString());
		assert(add_liq_after.isGreaterThan(add_liq_before), `Liquidity did not increase`);


		console.log(chalk.yellow.bold("===================================================================="));
		console.log(chalk.yellow.bold("Add more to a lock (balanceOf override method)"));

		// Print the info for the stake before
		const add_more_balof_ovr_before_arr = await staking_instance.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const add_more_balof_ovr_nft_before = utilities.getLockedNFTInfoFromArr(add_more_balof_ovr_before_arr, TOKEN_ID_1);
		console.log("TOKEN_ID_1 before add more (balanceOf override): ", add_more_balof_ovr_nft_before);

		// Add more FRAX and RAI to the position
		// Transfer instead of approve for this method
		const add_tkn_balof_ovr_amt = new BigNumber("1000e18");
		await rai_instance.transfer(staking_instance.address, add_tkn_balof_ovr_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.transfer(staking_instance.address, add_tkn_balof_ovr_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Lock additional
		await staking_instance.lockAdditional(TOKEN_ID_1, 0, 0, 0, 0, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the info for the stake after
		const add_more_balof_ovr_after_arr = await staking_instance.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const add_more_balof_ovr_nft_after = utilities.getLockedNFTInfoFromArr(add_more_balof_ovr_after_arr, TOKEN_ID_1);
		console.log("TOKEN_ID_1 after add more (balanceOf override): ", add_more_balof_ovr_nft_after);

		// Make sure the liquidity has increased
		const add_liq_balof_ovr_before = new BigNumber(add_more_balof_ovr_nft_before.liquidity);
		const add_liq_balof_ovr_after = new BigNumber(add_more_balof_ovr_nft_after.liquidity);
		const add_liq_balof_ovr_diff = add_liq_balof_ovr_after.minus(add_liq_balof_ovr_before);
		console.log("Add liq diff (balanceOf override): ", add_liq_balof_ovr_diff.toString());
		assert(add_liq_balof_ovr_after.isGreaterThan(add_liq_balof_ovr_before), `Liquidity did not increase`);
	});

	it("Communal / Token Manager Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("================Communal / Token Manager Tests================"));

		console.log("------------------------------------------------");
		console.log("Give the staking contract some FRAX, to be recovered soon");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		await frax_instance.transfer(staking_instance.address, new BigNumber("1e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		const staking_reward_tokens_addresses = await staking_instance.getAllRewardTokens.call();
		const test_recovery_amount = new BigNumber("1e18");

		// Get some balances
		const flx_bal = new BigNumber(await flx_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		const frax_bal = new BigNumber(await frax_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		const fxs_bal = new BigNumber(await fxs_instance.balanceOf(staking_instance.address)).div(BIG18).toNumber();
		console.log("flx_bal: ", flx_bal);
		console.log("frax_bal: ", frax_bal);
		console.log("fxs_bal: ", fxs_bal);

		console.log("Try recovering a non-reward token as the owner");
		await staking_instance.recoverERC20(frax_instance.address, test_recovery_amount, { from: STAKING_OWNER });

		console.log("Set a reward rate as the owner");
		await staking_instance.setRewardVars(staking_reward_tokens_addresses[1], 1000, frax_gauge_controller.address, gauge_rewards_distributor_instance.address, { from: STAKING_OWNER });

		for (let j = 0; j < staking_reward_tokens_addresses.length; j++){
			const token_manager_address = await staking_instance.rewardManagers.call(staking_reward_tokens_addresses[j]);
			console.log(chalk.yellow.bold(`--------------${staking_reward_tokens_addresses[j]}--------------`));
			console.log(`[${staking_reward_tokens_addresses[j]} Manager]: ${token_manager_address}`);
			console.log(`[${staking_reward_tokens_addresses[j]} Address]: ${staking_reward_tokens_addresses[j]}`);

			// Print the balance
			const quick_instance = await ERC20.at(staking_reward_tokens_addresses[j]);
			const current_balance = new BigNumber(await quick_instance.balanceOf(staking_instance.address));
			console.log("Current balance:", current_balance.div(BIG18).toNumber());
		
			console.log("Try to set the reward rate with the wrong manager [SHOULD FAIL]");
			await expectRevert(
				staking_instance.setRewardVars(staking_reward_tokens_addresses[j], 0, ZERO_ADDRESS, ZERO_ADDRESS, { from: accounts[9] }),
				"Not owner or tkn mgr"
			);

			console.log("Try to change the token manager with the wrong account [SHOULD FAIL]");
			await expectRevert(
				staking_instance.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[9] }),
				"Not owner or tkn mgr"
			);

			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [token_manager_address]
			});
	
			console.log("Set the reward rate with the correct manager");
			const gauge_ctr_add_to_use = (j == 0 ? frax_gauge_controller.address : ZERO_ADDRESS);
			const gauge_rew_dist_add_to_use = (j == 0 ? gauge_rewards_distributor_instance.address : ZERO_ADDRESS);
			await staking_instance.setRewardVars(staking_reward_tokens_addresses[j], 0, gauge_ctr_add_to_use, gauge_rew_dist_add_to_use, { from: token_manager_address });

			console.log("Try recovering reward tokens as the reward manager");
			await staking_instance.recoverERC20(staking_reward_tokens_addresses[j], test_recovery_amount, { from: token_manager_address });

			console.log("Change the token manager");
			await staking_instance.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: token_manager_address });
	
			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [token_manager_address]
			});
		}
	});

	it("Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e18");

		console.log("---------TRY TO ERC20 RECOVER WHILE NOT AN OWNER [SHOULD FAIL]---------");
		await expectRevert(
			staking_instance.recoverERC20(fxs_instance.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Not owner or tkn mgr"
		);

		console.log("---------TRY TO ERC20 RECOVER A REWARD TOKEN AS THE OWNER [SHOULD FAIL]---------");
		await expectRevert(
			staking_instance.recoverERC20(flx_instance.address, test_amount_1, { from: STAKING_OWNER }),
			"No valid tokens to recover"
		);
	});

	it("Migration Staking / Withdrawal Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Migration Staking / Withdrawal Tests=============="));

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Untoggle the stake unlocking
		await staking_instance.unlockStakes({ from: STAKING_OWNER });

		// Allow the migrator function to migrate for you
		await staking_instance.stakerToggleMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] liquidity staked:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Get TOKEN_ID_1 back and give it to COLLATERAL_FRAX_AND_FXS_OWNER
		// Unlock stakes really quick to do so
		await staking_instance.unlockStakes({ from: STAKING_OWNER });
		await staking_instance.withdrawLocked(TOKEN_ID_1, COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		await staking_instance.unlockStakes({ from: STAKING_OWNER });

		// Stake Locked
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await staking_instance.stakeLocked(TOKEN_ID_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 7 days

		// Advance 1 day
		console.log("---Advance a day---");
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Show the stake structs
		const locked_NFT_structs = await staking_instance.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_NFT_structs);

		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		console.log("----PRINT SOME DATA AGAIN----");
		await utilities.printCalcCurCombinedWeight(staking_instance, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(staking_instance, accounts[9]);
		const _total_liquidity_staked_2 = new BigNumber(await staking_instance.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await staking_instance.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_staked_2: ", _total_liquidity_staked_2.toString());
		console.log("_total_combined_weight_2: ", _total_combined_weight_2.toString());

		console.log(chalk.yellow("---Have the migrator withdraw account [1]'s locked token---"));
		const locked_liq_before0 = (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		const combined_weight_before0 = (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		await staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS });		
		const locked_liq_after0 = (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		const combined_weight_after0 = (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		console.log(`accounts[1] lockedLiquidityOf change [${locked_liq_before0} -> ${locked_liq_after0}]:`, locked_liq_after0 - locked_liq_before0);
		console.log(`accounts[1] combinedWeightOf change [${combined_weight_before0} -> ${combined_weight_after0}]:`, combined_weight_after0 - combined_weight_before0);
		assert(locked_liq_after0 < locked_liq_before0, "Locked liquidity should be lower");
		assert(combined_weight_after0 < combined_weight_before0, "Combined weight should be lower");
		console.log("");

		console.log(chalk.yellow("---Have the migrator re-stake account [1]'s token---"));
		const locked_liq_before1 = (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		const combined_weight_before1 = (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_1, { from: MIGRATOR_ADDRESS });
		let block_time_current_0 = (await time.latest()).toNumber();
		await staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, 28 * 86400, block_time_current_0, { from: MIGRATOR_ADDRESS });		
		const locked_liq_after1 = (new BigNumber(await staking_instance.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		const combined_weight_after1 = (new BigNumber(await staking_instance.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
		console.log(`accounts[1] lockedLiquidityOf change [${locked_liq_before1} -> ${locked_liq_after1}]:`, locked_liq_after1 - locked_liq_before1);
		console.log(`accounts[1] combinedWeightOf change [${combined_weight_before1} -> ${combined_weight_after1}]:`, combined_weight_after1 - combined_weight_before1);
		assert(locked_liq_after1 > locked_liq_before1, "Locked liquidity should be higher");
		assert(combined_weight_after1 > combined_weight_before1, "Combined weight should be higher");
		console.log("");
	});

	it("Migration Fail Tests ", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Migration Fail Tests=============="));

		const test_amount_1 = new BigNumber ("1e18");

		console.log(chalk.blue("=============TEST INVALID TOKENS [SHOULD FAIL]============="));

		// Turn off migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY A TOKEN WITH THE WRONG TICKS---------");
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9_INVALID_WRONG_TICKS, { from: accounts[9] });
		await expectRevert(
			staking_instance.stakeLocked(TOKEN_ID_9_INVALID_WRONG_TICKS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	

		console.log("---------TRY A TOKEN WITH THE WRONG TICKS [SECOND VERSION]---------");
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9_INSIDE_WRONG_TICKS, { from: accounts[9] });
		await expectRevert(
			staking_instance.stakeLocked(TOKEN_ID_9_INSIDE_WRONG_TICKS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	

		console.log("---------TRY A TOKEN WITH THE WRONG TICKS [THIRD VERSION]---------");
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9_OUTSIDE_WRONG_TICKS, { from: accounts[9] });
		await expectRevert(
			staking_instance.stakeLocked(TOKEN_ID_9_OUTSIDE_WRONG_TICKS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);

		console.log("---------TRY A TOKEN WITH THE WRONG UNDERLYING TOKENS---------");
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS, { from: accounts[9] });
		await expectRevert(
			staking_instance.stakeLocked(TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	

		console.log("---------TRY A TOKEN WITH THE WRONG FEE---------");
		await uniswapV3PositionsNFTInstance.approve(staking_instance.address, TOKEN_ID_9_INVALID_WRONG_FEE, { from: accounts[9] });
		await expectRevert(
			staking_instance.stakeLocked(TOKEN_ID_9_INVALID_WRONG_FEE, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	


		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });


		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_1 = (await time.latest()).toNumber();
		await expectRevert(
			staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			staking_instance.stakerToggleMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await staking_instance.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------RECOVER ERC721 AND GIVE TO COLLATERAL_FRAX_AND_FXS_OWNER---------");
		await staking_instance.recoverERC721(uniswapV3PositionsNFTInstance.address, TOKEN_ID_1, { from: STAKING_OWNER }),
		await uniswapV3PositionsNFTInstance.safeTransferFrom(STAKING_OWNER, COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			staking_instance.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, 28 * 86400, block_time_current_2, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await staking_instance.stakerToggleMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await staking_instance.stakerToggleMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await staking_instance.toggleMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			staking_instance.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);
	});

	it("Proxy Tests", async () => {
		console.log(chalk.hex("#ff8b3d").bold("==============Proxy Tests=============="));

		console.log(chalk.blue("=============TEST WITH NO PROXIES [SHOULD FAIL]============="));

		console.log("--------- TRY ADD A PROXY NOT AS GOVERNANCE ---------");
		await expectRevert(
			staking_instance.toggleValidVeFXSProxy(ADDRESS_VEFXS_WHALE, { from: accounts[9] }),
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