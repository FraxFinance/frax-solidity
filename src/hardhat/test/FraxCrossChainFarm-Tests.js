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

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// mStable related
const IFeederPool = artifacts.require("Misc_AMOs/mstable/IFeederPool");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const FraxCrossChainFarm_FRAX_mUSD = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_mUSD");

const FraxUniV3Farm_Stable_FRAX_USDC = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_USDC");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const IQToken = artifacts.require("ERC20/Variants/IQToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS related
const veFXS = artifacts.require("Curve/IveFXS");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FraxCrossChainFarm-Tests', async (accounts) => {
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
	const ADDRESS_WITH_IQ = '0xaCa39B187352D9805DECEd6E73A3d72ABf86E7A0';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;
	let iq_instance;
	let mockFRAX3CRVInstance;
	
	// Initialize the Uniswap Router instance
	let routerInstance; 

	// Initialize the Uniswap Factory instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;

	// Initialize the Uniswap V3 Positions NFT
	let uniswapV3PositionsNFTInstance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	// Initialize oracle instances
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Initialize pool instances
	let pool_instance_USDC;
	

	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FXS_WETH;

	// Initialize Uniswap pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FXS_WETH;
	let pair_instance_FRAX_IQ;

	// Initialize mStable pair contracts
	let pair_instance_mUSD_GUSD;

	// Initialize Sushi pair contracts
	let pair_instance_FRAX_FXS_Sushi;
	let pair_instance_FXS_WETH_Sushi;

	// Initialize pair orders
	let isToken0Frax_FRAX_WETH;
	let isToken0Frax_FRAX_USDC;
	let isToken0Fxs_FXS_WETH;

	// Initialize staking instances
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FXS_WETH;

    // let stakingInstanceDual_FRAX_FXS_Sushi;
	// let stakingInstanceDual_FXS_WETH_Sushi;
	// let stakingInstanceDual_FRAX3CRV;
	// let stakingInstanceDualV2_FRAX3CRV_V2;
	let stakingInstanceDualV5_FRAX_OHM;
	// let fraxFarmInstance_FRAX_USDC;
	let fraxCrossChainFarm_FRAX_mUSD;

	// Initialize veFXS instance
	let veFXS_instance;

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
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		iq_instance = await IQToken.deployed();

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		
		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Fill the Uniswap V3 Instances
		uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/FXS"]);
		// pair_instance_FRAX_IQ = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/IQ"]);
		// pair_instance_FXS_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/USDC"]);

		// Get instances of the mStable pairs 
		pair_instance_mUSD_GUSD = await IFeederPool.at("0x4fB30C5A3aC8e85bC32785518633303C4590752d");

		// Fill the staking rewards instances
		fraxCrossChainFarm_FRAX_mUSD = await FraxCrossChainFarm_FRAX_mUSD.deployed();
		// fraxFarmInstance_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deployed();

		veFXS_instance = await veFXS.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Initialization related', async () => {
		console.log("=========================Initialization=========================")

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with FXS and give COLLATERAL_FRAX_AND_FXS_OWNER some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("100e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("500000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with IQ");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_IQ]
		});

		await iq_instance.transfer(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("10e18"), { from: ADDRESS_WITH_IQ });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_IQ]
		});

		console.log("------------------------------------------------");
		console.log("Give LPs to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await pair_instance_mUSD_GUSD.transfer(accounts[1], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance_mUSD_GUSD.transfer(accounts[9], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		
		// Add a migrator address
		await fraxCrossChainFarm_FRAX_mUSD.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		// Move to the end of the gauge controller period
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		const time_total = await frax_gauge_controller.time_total.call();

		const increase_time_0 = (time_total - current_timestamp_0);
		console.log("increase_time_0 (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

	});

	it('Locked stakes', async () => {
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));
		console.log(chalk.hex("#ff8b3d").bold("TRY TESTS WITH LOCKED STAKES."));
		console.log(chalk.hex("#ff8b3d").bold("===================================================================="));

		const ACCOUNT_9_CLAIMS_EARLY = true;
		let ACCOUNT_9_EARLY_EARN = [0, 0];

		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, accounts[9]);

		// Get more veFXS (accounts[1])
		const deposit_amount_1 = 0.1;
		const deposit_amount_1_e18 = new BigNumber(deposit_amount_1).multipliedBy("1e18");
		console.log(`Deposit ${deposit_amount_1} FXS (4 years) for veFXS`);

		const veFXS_deposit_days_1 = (4 * 365); // 4 years
		let block_time_current_1 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_1 = block_time_current_1 + ((veFXS_deposit_days_1 * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Get more veFXS (accounts[9])
		// const deposit_amount_9 = 1;
		// const deposit_amount_9_e18 = new BigNumber(`${deposit_amount_9}e18`);
		// console.log(`Deposit ${deposit_amount_9} FXS (4 years) for veFXS`);

		// const veFXS_deposit_days_9 = (4 * 365); // 4 years
		// let block_time_current_9 = (await time.latest()).toNumber();
		// const veFXS_deposit_end_timestamp_9 = block_time_current_9 + ((veFXS_deposit_days_9 * 86400) + 1);
		// await fxs_instance.approve(veFXS_instance.address, deposit_amount_9_e18, { from: accounts[9] });
		// await veFXS_instance.increase_amount(deposit_amount_9_e18, veFXS_deposit_end_timestamp_9, { from: accounts[9] });

		// Print FXS and veFXS balances
		console.log("Farm FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm IQ balance:", new BigNumber(await iq_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		
		const fxs_bal_acc_1_time0 = new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const fxs_bal_acc_9_time0 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();
		console.log("accounts[1] FXS balance:", fxs_bal_acc_1_time0);
		console.log("accounts[1] veFXS balance:", new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", fxs_bal_acc_9_time0);
		console.log("accounts[9] veFXS balance:", new BigNumber(await veFXS_instance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance_mUSD_GUSD.approve(fraxCrossChainFarm_FRAX_mUSD.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_mUSD_GUSD.approve(fraxCrossChainFarm_FRAX_mUSD.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await frax_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		console.log("Try to stake before initialization [SHOULD FAIL]");
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.stakeLocked(uni_pool_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Contract not initialized"
		);

		console.log("Initialize Staking Contract");
		await fraxCrossChainFarm_FRAX_mUSD.initializeDefault({ from: STAKING_OWNER });

		// Stake Locked
		// account[1]
		await fraxCrossChainFarm_FRAX_mUSD.stakeLocked(uni_pool_locked_1, 6.95 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 7 days
		await fraxCrossChainFarm_FRAX_mUSD.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await fraxCrossChainFarm_FRAX_mUSD.stakeLocked(uni_pool_locked_9, 27.95 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1_0 = await fraxCrossChainFarm_FRAX_mUSD.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9_0 = await fraxCrossChainFarm_FRAX_mUSD.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, accounts[9]);

		const user_min_vefxs_for_max_boost_1_0 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_0 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_0: ", user_min_vefxs_for_max_boost_1_0.toString());
		console.log("user_min_vefxs_for_max_boost_9_0: ", user_min_vefxs_for_max_boost_9_0.toString());

		const _total_liquidity_locked_0 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.totalCombinedWeight.call()).div(BIG18);
		const frax_per_lp_token_0 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.fraxPerLPToken.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());
		console.log("frax_per_lp_token_0 GLOBAL: ", frax_per_lp_token_0.toString());

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("MID-WEEK-SYNC AND POSSIBLY CLAIM"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		await time.increase(2 * 86400);
		await time.advanceBlock();

		// Sync
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Account 9 either claims or it does not
		if (ACCOUNT_9_CLAIMS_EARLY){
			console.log(chalk.green.bold("ACCOUNT[9] claims early"));

			// Mutate
			await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: accounts[9] });
		}
		else {
			console.log(chalk.red.bold("ACCOUNT[9] does not claim"));

			// Call
			const early_earned_res_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9])
			ACCOUNT_9_EARLY_EARN = [ACCOUNT_9_EARLY_EARN[0].plus(new BigNumber(early_earned_res_9[0]).div(BIG18)), ACCOUNT_9_EARLY_EARN[1].plus(new BigNumber(early_earned_res_9[1]).div(BIG18))];
		}

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("MID-WEEK-SYNC AGAIN AND POSSIBLY CLAIM. ADD IN SOME FXS TOO"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		await time.increase(2 * 86400);
		await time.advanceBlock();

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("10e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Sync
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Account 9 either claims or it does not
		if (ACCOUNT_9_CLAIMS_EARLY){
			console.log(chalk.green.bold("ACCOUNT[9] claims early"));

			// Mutate
			await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: accounts[9] });
		}
		else {
			console.log(chalk.red.bold("ACCOUNT[9] does not claim"));

			// Call
			const early_earned_res_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9])
			ACCOUNT_9_EARLY_EARN = [ACCOUNT_9_EARLY_EARN[0].plus(new BigNumber(early_earned_res_9[0]).div(BIG18)), ACCOUNT_9_EARLY_EARN[1].plus(new BigNumber(early_earned_res_9[1]).div(BIG18))];
		}

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WAIT UNTIL THE END OF THE 1st PERIOD"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		const period_end_0 = await fraxCrossChainFarm_FRAX_mUSD.periodFinish.call();

		const increase_time_0 = (period_end_0 - current_timestamp_0);
		console.log("increase_time_0 (days): ", increase_time_0 / 86400);
		await time.increase(increase_time_0);
		await time.advanceBlock();

		// Sync afterwards
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm IQ balance:", new BigNumber(await iq_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm IQ owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm IQ paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Paid()).div(BIG18).toNumber());

		const user_min_vefxs_for_max_boost_1_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_1: ", user_min_vefxs_for_max_boost_1_1.toString());
		console.log("user_min_vefxs_for_max_boost_9_1: ", user_min_vefxs_for_max_boost_9_1.toString());

		// Make sure there is a valid period for the contract and sync it
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: STAKING_OWNER });

		const staking_earned_1 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1[0]).div(BIG18);
		const staking_earned_1_token1 = new BigNumber(staking_earned_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [IQ]: ", staking_earned_1_token1.toString());

		const staking_earned_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9]);
		const staking_earned_9_fxs = new BigNumber(staking_earned_9[0]).div(BIG18);
		const staking_earned_9_token1 = new BigNumber(staking_earned_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [IQ]: ", staking_earned_9_token1.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const reward_week_1_token1 = (staking_earned_1_token1).plus(staking_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [IQ]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [IQ]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_reward_1 = await fraxCrossChainFarm_FRAX_mUSD.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_reward_1[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_1_fxs.toString());
		console.log("Expected weekly reward [IQ]: ", duration_reward_1_token1.toString());
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IQ]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		// Account 9 either claims or it does not
		if (ACCOUNT_9_CLAIMS_EARLY){
			console.log(chalk.green.bold("ACCOUNT[9] claims early"));

			// Mutate
			await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: accounts[9] });
		}
		else {
			console.log(chalk.red.bold("ACCOUNT[9] does not claim"));

			// Call
			const early_earned_res_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9])
			ACCOUNT_9_EARLY_EARN = [ACCOUNT_9_EARLY_EARN[0].plus(new BigNumber(early_earned_res_9[0]).div(BIG18)), ACCOUNT_9_EARLY_EARN[1].plus(new BigNumber(early_earned_res_9[1]).div(BIG18))];
		}

		const fxs_bal_acc_1_time1 = new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const fxs_bal_acc_9_time1 = new BigNumber(await fxs_instance.balanceOf(accounts[9])).div(BIG18).toNumber();
		console.log(chalk.green("accounts[1] FXS balance change:", fxs_bal_acc_1_time1 - fxs_bal_acc_1_time0));
		console.log(chalk.green("accounts[9] FXS balance change:", fxs_bal_acc_9_time1 - fxs_bal_acc_9_time0));
		console.log(chalk.green.bold("Total FXS balance change:", (fxs_bal_acc_1_time1 + fxs_bal_acc_9_time1) - (fxs_bal_acc_1_time0 + fxs_bal_acc_9_time0)));

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("ADVANCING 28 DAYS"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		const period_end_1 = await fraxCrossChainFarm_FRAX_mUSD.periodFinish.call();
		
		const increase_time_1 = (period_end_1 - current_timestamp_1) + ((3 * 7) * 86400);
		console.log("increase_time_1 (days): ", increase_time_1 / 86400);
		await time.increase(increase_time_1);
		await time.advanceBlock();

		// Sync afterwards
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, accounts[9]);
		

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm IQ balance:", new BigNumber(await iq_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm IQ owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm IQ paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Paid()).div(BIG18).toNumber());
		
		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		const user_min_vefxs_for_max_boost_1_2 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_2 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_2: ", user_min_vefxs_for_max_boost_1_2.toString());
		console.log("user_min_vefxs_for_max_boost_9_2: ", user_min_vefxs_for_max_boost_9_2.toString());

		// Make sure there is a valid period for the contract and sync it
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_fxs_earned_28_1 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1[0]).div(BIG18);
		const staking_fxs_earned_28_1_token1 = new BigNumber(staking_fxs_earned_28_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks [IQ]: ", staking_fxs_earned_28_1_token1.toString());

		const staking_fxs_earned_28_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9[0]).div(BIG18);
		const staking_fxs_earned_28_9_token1 = new BigNumber(staking_fxs_earned_28_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks [IQ]: ", staking_fxs_earned_28_9_token1.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs.minus(ACCOUNT_9_EARLY_EARN[0]));
		const reward_week_5_token1 = (staking_fxs_earned_28_1_token1).plus(staking_fxs_earned_28_9_token1.minus(ACCOUNT_9_EARLY_EARN[1]));
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 4.0);
		const effective_yearly_reward_at_week_5_token1 = reward_week_5_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(4).toString());
		console.log("Effective weekly reward at week 5 [IQ]: ", reward_week_5_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());
		console.log("Effective yearly reward at week 5 [IQ]: ", effective_yearly_reward_at_week_5_token1.toString());

		const duration_reward_3 = await fraxCrossChainFarm_FRAX_mUSD.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_3_fxs.toString());
		console.log("Expected weekly reward [IQ]: ", duration_reward_3_token1.toString());
		console.log("Expected yearly reward [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IQ]: ", duration_reward_3_token1.multipliedBy(52.1429).toString());


		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("REFILL REWARDS AND SYNC"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		console.log("Give the staking contract some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("Give the staking contract some IQ");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_IQ]
		});

		await iq_instance.transfer(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("100e18"), { from: ADDRESS_WITH_IQ });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_IQ]
		});

		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("CHECK EARNINGS"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm IQ balance:", new BigNumber(await iq_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm IQ owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm IQ paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Paid()).div(BIG18).toNumber());

		const staking_fxs_earned_28PR_1 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[1]);
		const staking_fxs_earned_28PR_1_fxs = new BigNumber(staking_fxs_earned_28PR_1[0]).div(BIG18);
		const staking_fxs_earned_28PR_1_token1 = new BigNumber(staking_fxs_earned_28PR_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks (post refill) [FXS]: ", staking_fxs_earned_28PR_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks (post refill) [IQ]: ", staking_fxs_earned_28PR_1_token1.toString());

		const staking_fxs_earned_28PR_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9]);
		const staking_fxs_earned_28PR_9_fxs = new BigNumber(staking_fxs_earned_28PR_9[0]).div(BIG18);
		const staking_fxs_earned_28PR_9_token1 = new BigNumber(staking_fxs_earned_28PR_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks (post refill) [FXS]: ", staking_fxs_earned_28PR_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks (post refill) [IQ]: ", staking_fxs_earned_28PR_9_token1.toString());

		const reward_week_5PR_fxs = (staking_fxs_earned_28PR_1_fxs).plus(staking_fxs_earned_28PR_9_fxs.minus(ACCOUNT_9_EARLY_EARN[0]));
		const reward_week_5PR_token1 = (staking_fxs_earned_28PR_1_token1).plus(staking_fxs_earned_28PR_9_token1.minus(ACCOUNT_9_EARLY_EARN[1]));
		const effective_yearly_reward_at_week_5PR_fxs = reward_week_5PR_fxs.multipliedBy(52.1429 / 4.0);
		const effective_yearly_reward_at_week_5PR_token1 = reward_week_5PR_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 (post refill) [FXS]: ", reward_week_5PR_fxs.div(4).toString());
		console.log("Effective weekly reward at week 5 (post refill) [IQ]: ", reward_week_5PR_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 (post refill) [FXS]: ", effective_yearly_reward_at_week_5PR_fxs.toString());
		console.log("Effective yearly reward at week 5 (post refill) [IQ]: ", effective_yearly_reward_at_week_5PR_token1.toString());

		const duration_reward_3PR = await fraxCrossChainFarm_FRAX_mUSD.getRewardForDuration.call();
		const duration_reward_3PR_fxs = new BigNumber(duration_reward_3PR[0]).div(BIG18);
		const duration_reward_3PR_token1 = new BigNumber(duration_reward_3PR[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_3PR_fxs.toString());
		console.log("Expected weekly reward [IQ]: ", duration_reward_3PR_token1.toString());
		console.log("Expected yearly reward (post refill) [FXS]: ", duration_reward_3PR_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward (post refill) [IQ]: ", duration_reward_3PR_token1.multipliedBy(52.1429).toString());

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("ADVANCE TO DAY 35 (next period)"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		// Sync beforehand
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_2 = (new BigNumber(await time.latest())).toNumber();
		const period_end_2 = await fraxCrossChainFarm_FRAX_mUSD.periodFinish.call();

		// Advance ~7 days
		const increase_time_2 = (period_end_2 - current_timestamp_2);
		console.log("increase_time_2 (days): ", increase_time_2 / 86400);
		await time.increase(increase_time_2);
		await time.advanceBlock();

		// Sync afterwards
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm IQ balance:", new BigNumber(await iq_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm IQ owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm IQ paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Paid()).div(BIG18).toNumber());

		const staking_fxs_earned_35_1 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[1]);
		const staking_fxs_earned_35_1_fxs = new BigNumber(staking_fxs_earned_35_1[0]).div(BIG18);
		const staking_fxs_earned_35_1_token1 = new BigNumber(staking_fxs_earned_35_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 6 weeks [FXS]: ", staking_fxs_earned_35_1_fxs.toString());
		console.log("accounts[1] earnings after 6 weeks [IQ]: ", staking_fxs_earned_35_1_token1.toString());

		const staking_fxs_earned_35_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9]);
		const staking_fxs_earned_35_9_fxs = new BigNumber(staking_fxs_earned_35_9[0]).div(BIG18);
		const staking_fxs_earned_35_9_token1 = new BigNumber(staking_fxs_earned_35_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 6 weeks [FXS]: ", staking_fxs_earned_35_9_fxs.toString());
		console.log("accounts[9] earnings after 6 weeks [IQ]: ", staking_fxs_earned_35_9_token1.toString());

		const reward_week_6_fxs = (staking_fxs_earned_35_1_fxs).plus(staking_fxs_earned_35_9_fxs.minus(ACCOUNT_9_EARLY_EARN[0]));
		const reward_week_6_token1 = (staking_fxs_earned_35_1_token1).plus(staking_fxs_earned_35_9_token1.minus(ACCOUNT_9_EARLY_EARN[1]));
		const effective_yearly_reward_at_week_6_fxs = reward_week_6_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_6_token1 = reward_week_6_token1.multipliedBy(52.1429); // 1 week delay
		console.log("Effective weekly reward at week 6 [FXS]: ", reward_week_6_fxs.div(1).toString());
		console.log("Effective weekly reward at week 6 [IQ]: ", reward_week_6_token1.div(1).toString()); // 1 week delay
		console.log("Effective yearly reward at week 6 [FXS]: ", effective_yearly_reward_at_week_6_fxs.toString());
		console.log("Effective yearly reward at week 6 [IQ]: ", effective_yearly_reward_at_week_6_token1.toString());

		const duration_reward_4 = await fraxCrossChainFarm_FRAX_mUSD.getRewardForDuration.call();
		const duration_reward_4_fxs = new BigNumber(duration_reward_4[0]).div(BIG18);
		const duration_reward_4_token1 = new BigNumber(duration_reward_4[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_4_fxs.toString());
		console.log("Expected weekly reward [IQ]: ", duration_reward_4_token1.toString());
		console.log("Expected yearly reward [FXS]: ", duration_reward_4_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IQ]: ", duration_reward_4_token1.multipliedBy(52.1429).toString());

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("WITHDRAW STAKES"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Account 9 withdraws and claims its locked stake
		await fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: accounts[9] });
		await expectRevert.unspecified(fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await fraxCrossChainFarm_FRAX_mUSD.unlockStakes({ from: STAKING_OWNER });
		await fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxCrossChainFarm_FRAX_mUSD, accounts[9]);

		const user_min_vefxs_for_max_boost_1_3 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_3 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_3: ", user_min_vefxs_for_max_boost_1_3.toString());
		console.log("user_min_vefxs_for_max_boost_9_3: ", user_min_vefxs_for_max_boost_9_3.toString());

		const _total_liquidity_locked_2 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.totalCombinedWeight.call()).div(BIG18);
		const frax_per_lp_token_2 = new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.fraxPerLPToken.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());
		console.log("frax_per_lp_token_2 GLOBAL: ", frax_per_lp_token_2.toString());

		// Claim rewards
		console.log("Claim rewards");
		await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: accounts[9] });

		console.log(chalk.hex("#ff8b3d")("===================================================================="));
		console.log(chalk.hex("#ff8b3d")("CHECK EARNINGS AGAIN"));
		console.log(chalk.hex("#ff8b3d")("===================================================================="));

		// Sync beforehand
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const current_timestamp_3 = (new BigNumber(await time.latest())).toNumber();
		const period_end_3 = await fraxCrossChainFarm_FRAX_mUSD.periodFinish.call();

		// Advance to the next period
		const increase_time_3 = (period_end_3 - current_timestamp_3);
		console.log("increase_time_3 (days): ", increase_time_3 / 86400);
		await time.increase(increase_time_3);
		await time.advanceBlock();

		// Sync afterwards
		await fraxCrossChainFarm_FRAX_mUSD.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print balances
		console.log("Farm FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm FXS owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Owed()).div(BIG18).toNumber());
		console.log("Farm FXS paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew0Paid()).div(BIG18).toNumber());
		console.log("Farm IQ balance:", new BigNumber(await iq_instance.balanceOf(fraxCrossChainFarm_FRAX_mUSD.address)).div(BIG18).toNumber());
		console.log("Farm IQ owed:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Owed()).div(BIG18).toNumber());
		console.log("Farm IQ paid:", new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.ttlRew1Paid()).div(BIG18).toNumber());

		const staking_fxs_earned_PW_1 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[1]);
		const staking_fxs_earned_PW_1_fxs = new BigNumber(staking_fxs_earned_PW_1[0]).div(BIG18);
		const staking_fxs_earned_PW_1_token1 = new BigNumber(staking_fxs_earned_PW_1[1]).div(BIG18);
		console.log("accounts[1] earnings leftover [FXS]: ", staking_fxs_earned_PW_1_fxs.toString());
		console.log("accounts[1] earnings leftover [IQ]: ", staking_fxs_earned_PW_1_token1.toString());

		const staking_fxs_earned_PW_9 = await fraxCrossChainFarm_FRAX_mUSD.earned.call(accounts[9]);
		const staking_fxs_earned_PW_9_fxs = new BigNumber(staking_fxs_earned_PW_9[0]).div(BIG18);
		const staking_fxs_earned_PW_9_token1 = new BigNumber(staking_fxs_earned_PW_9[1]).div(BIG18);
		console.log("accounts[9] earnings leftover [FXS]: ", staking_fxs_earned_PW_9_fxs.toString());
		console.log("accounts[9] earnings leftover [IQ]: ", staking_fxs_earned_PW_9_token1.toString());

		const duration_reward_5 = await fraxCrossChainFarm_FRAX_mUSD.getRewardForDuration.call();
		const duration_reward_5_fxs = new BigNumber(duration_reward_5[0]).div(BIG18);
		const duration_reward_5_token1 = new BigNumber(duration_reward_5[1]).div(BIG18);
		console.log("Expected weekly reward [FXS]: ", duration_reward_5_fxs.toString());
		console.log("Expected weekly reward [IQ]: ", duration_reward_5_token1.toString());

	});

	it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await fraxCrossChainFarm_FRAX_mUSD.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_mUSD_GUSD.approve(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.stakeLocked(new BigNumber("1e18"), 7 * 86400, { from: accounts[9] }),
			"Address has been greylisted"
		);
	});

	it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await fraxCrossChainFarm_FRAX_mUSD.greylistAddress(accounts[9], { from: STAKING_OWNER });
		// console.log("");
		// console.log("this should succeed");
		// await pair_instance_mUSD_GUSD.approve(fraxCrossChainFarm_FRAX_mUSD.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fraxCrossChainFarm_FRAX_mUSD.stakeLocked(new BigNumber("1e18"), 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// // Wait 2 days
		// for (let j = 0; j < 2; j++){
		// 	await time.increase(86400);
		// 	await time.advanceBlock();
		// }

		// // Claim back the NFT and collect the rewards
		// await fraxCrossChainFarm_FRAX_mUSD.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fraxCrossChainFarm_FRAX_mUSD.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
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
		await fraxCrossChainFarm_FRAX_mUSD.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await fraxCrossChainFarm_FRAX_mUSD.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf UniV2 FRAX/IQ LP:", (new BigNumber(await pair_instance_mUSD_GUSD.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await pair_instance_mUSD_GUSD.approve(fraxCrossChainFarm_FRAX_mUSD.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxCrossChainFarm_FRAX_mUSD.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_stake_structs = await fraxCrossChainFarm_FRAX_mUSD.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await fraxCrossChainFarm_FRAX_mUSD.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await fraxCrossChainFarm_FRAX_mUSD.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_mUSD_GUSD.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await pair_instance_mUSD_GUSD.approve(fraxCrossChainFarm_FRAX_mUSD.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		let block_time_current_1 = (await time.latest()).toNumber();
		await fraxCrossChainFarm_FRAX_mUSD.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_mUSD_GUSD.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await fraxCrossChainFarm_FRAX_mUSD.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await fraxCrossChainFarm_FRAX_mUSD.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await fraxCrossChainFarm_FRAX_mUSD.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_2, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO EMERGENCY WITHDRAWALS WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.recoverERC20(pair_instance_mUSD_GUSD.address, test_amount_1, { from: STAKING_OWNER }),
			"Not in migration"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await fraxCrossChainFarm_FRAX_mUSD.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_3 = (await time.latest()).toNumber();
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_3, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await fraxCrossChainFarm_FRAX_mUSD.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await fraxCrossChainFarm_FRAX_mUSD.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await fraxCrossChainFarm_FRAX_mUSD.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			fraxCrossChainFarm_FRAX_mUSD.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

	});
});