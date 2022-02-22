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
const FraxUniV3Farm_Stable_FRAX_USDC = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_USDC");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS and gauge related
const veFXS = artifacts.require("Curve/IveFXS");
const FraxGaugeController = artifacts.require("Curve/IFraxGaugeController");

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

contract('FraxUniV3Farm_Stable_FRAX_USDC-Tests', async (accounts) => {
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
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_UNI_V3_NFT_1 = '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2';
	const TOKEN_ID_1 = 74601;
	const TOKEN_ID_1_ALT_GOOD = 74602;
	const ADDRESS_WITH_UNI_V3_NFT_9 = '0x36a87d1e3200225f881488e4aeedf25303febcae';
	const TOKEN_ID_9_INVALID_WRONG_TICKS = 47909;
	const TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS = 12252;
	const TOKEN_ID_9_INVALID_WRONG_FEE = 12448;
	const TOKEN_ID_9 = 74583;
	const TOKEN_ID_9_INSIDE_WRONG_TICKS = 74493;

	// Custom testing
	let MANUALLY_CALL_SYNC;

	// Initialize core contract instances
	let fraxInstance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let col_instance_USDC;
	let sushi_instance;
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
	let fraxFarmInstance_FRAX_USDC;

	// Initialize veFXS and gauge-related instances
	let veFXS_instance;
	let frax_gauge_controller;

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

		// For different tests
		MANUALLY_CALL_SYNC = true;

		// Fill core contract instances
		fraxInstance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		sushi_instance = await SushiToken.deployed(); 

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


		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// uniswapV3PositionsNFTInstance = await FRAX3CRV_Mock.deployed(); 

		// Get the pair order results
		isToken0Frax_FRAX_WETH = await oracle_instance_FRAX_WETH.token0();
		isToken0Frax_FRAX_USDC = await oracle_instance_FRAX_USDC.token0();
		isToken0Fxs_FXS_WETH = await oracle_instance_FXS_WETH.token0();
		isToken0Fxs_FXS_USDC = await oracle_instance_FXS_USDC.token0();

		isToken0Frax_FRAX_WETH = fraxInstance.address == isToken0Frax_FRAX_WETH;
		isToken0Frax_FRAX_USDC = fraxInstance.address == isToken0Frax_FRAX_USDC;
		isToken0Fxs_FXS_WETH = fxs_instance.address == isToken0Fxs_FXS_WETH;
		isToken0Fxs_FXS_USDC = fxs_instance.address == isToken0Fxs_FXS_USDC;

		// Fill the staking rewards instances
		fraxFarmInstance_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deployed();

		// veFXS and gauge related
		veFXS_instance = await veFXS.deployed();
		frax_gauge_controller = await FraxGaugeController.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {

		// Refresh FXS / WETH oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

	});

	it('Initialize FraxGaugeController', async () => {
		// Add the initial type
		await frax_gauge_controller.add_type("Liquidity", new BigNumber("1e18"), { from: DEPLOYER_ADDRESS });

		// Add this UniV3 Farm as a gauge
		await frax_gauge_controller.add_gauge(fraxFarmInstance_FRAX_USDC.address, 0, 1000, { from: ORIGINAL_FRAX_ONE_ADDRESS });

		// Add the FRAX-WETH contract as a gauge (to take up weight)
		await frax_gauge_controller.add_gauge(stakingInstance_FRAX_WETH.address, 0, 1000, { from: ORIGINAL_FRAX_ONE_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_9]
		});

		// Vote for the UniV3 FRAX-USDC farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(fraxFarmInstance_FRAX_USDC.address, 9000, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		
		// Vote for the FRAX-WETH farm
		// 10000 = 100% of your weight. 1 = 0.01% of your weight
		await frax_gauge_controller.vote_for_gauge_weights(stakingInstance_FRAX_WETH.address, 1000, { from: ADDRESS_WITH_UNI_V3_NFT_9 });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_9]
		});
	
		// Wait 7 days
		for (let j = 0; j < 7; j++){
			await time.increase(86400);
			await time.advanceBlock();
		}

		// Print out the gauge relative weights
		const FRAX_USDC_relative_weight = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber();
		const FRAX_WETH_relative_weight = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(stakingInstance_FRAX_WETH.address)).div(BIG18).toNumber();
		
		console.log("FRAX_USDC_relative_weight: ", FRAX_USDC_relative_weight);
		console.log("FRAX_WETH_relative_weight: ", FRAX_WETH_relative_weight);

		// Change the global emission rate to 10 FXS per year
		await frax_gauge_controller.change_global_emission_rate(11574074074074, { from: DEPLOYER_ADDRESS });

		// Print the reward rate
		let reward_rate = new BigNumber(await fraxFarmInstance_FRAX_USDC.rewardRate0.call()).div(BIG18).toNumber();
		console.log("reward_rate: ", (reward_rate * 31557600));

		// Wait 14 days
		for (let j = 0; j < 7; j++){
			await time.increase(86400);
			await time.advanceBlock();
		}

		// Print out the gauge relative weights
		const FRAX_USDC_relative_weight_0 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber();
		const FRAX_WETH_relative_weight_0 = new BigNumber(await frax_gauge_controller.gauge_relative_weight.call(stakingInstance_FRAX_WETH.address)).div(BIG18).toNumber();
		
		console.log("FRAX_USDC_relative_weight_0: ", FRAX_USDC_relative_weight_0);
		console.log("FRAX_WETH_relative_weight_0: ", FRAX_WETH_relative_weight_0);

		console.log("Print the reward rate again, without checkpointing");
		let reward_rate_00 = new BigNumber(await fraxFarmInstance_FRAX_USDC.rewardRate0.call()).div(BIG18).toNumber();
		console.log("reward_rate_00: ", (reward_rate_00 * 31557600));

		console.log(chalk.red("THE GAUGE NEEDS TO HAVE CHECKPOINTS OR SIMILAR, OR ELSE IT WILL RETURN 0 REWARDS!"));
	});

	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");

		console.log("----------------------------");
		// Fake move in some FXS
		console.log("Seed the staking contract with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Seed the FRAX/FXS staking contract and give COLLATERAL_FRAX_AND_FXS_OWNER some FXS
		await fxs_instance.transfer(fraxFarmInstance_FRAX_USDC.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("25000e18"), { from: ADDRESS_WITH_FXS });
		// await mockCRVDAOInstance.transfer(stakingInstanceDual_FXS_WETH_Sushi.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("----------------------------");
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

		console.log("----------------------------");
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

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_UNI_V3_NFT_9]
		});

		console.log("Initializing Staking Contract");
		await fraxFarmInstance_FRAX_USDC.initializeDefault({ from: STAKING_OWNER });
		// await stakingInstanceDual_FXS_WETH_Sushi.initializeDefault({ from: STAKING_OWNER });

		// Add a migrator address
		await fraxFarmInstance_FRAX_USDC.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

	});

	// it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
	// 	console.log("greylistAddress(accounts[9])");
	// 	await fraxFarmInstance_FRAX_USDC.greylistAddress(accounts[9], { from: STAKING_OWNER });
	// 	console.log("");
	// 	console.log("this should fail");
	// 	await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9, { from: accounts[9] });
		
	// 	await expectRevert(
	// 		fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9, 7 * 86400, { from: accounts[9] }),
	// 		"Address has been greylisted"
	// 	);
	// });

	// it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
	// 	console.log("greylistAddress(accounts[9])");
	// 	await fraxFarmInstance_FRAX_USDC.greylistAddress(accounts[9], { from: STAKING_OWNER });
	// 	console.log("");
	// 	console.log("this should succeed");
	// 	await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_1_ALT_GOOD, 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	// 	// Wait 2 days
	// 	for (let j = 0; j < 2; j++){
	// 		await time.increase(86400);
	// 		await time.advanceBlock();
	// 	}

	// 	// Claim back the NFT and collect the rewards
	// 	await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await fraxFarmInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// });

	it('Locked stakes - WITH EMISSION FACTOR', async () => {
		console.log(chalk.bold.cyan("===================================================================="));
		console.log(chalk.bold.cyan("TRY TESTS WITH LOCKED STAKES AND EMISSION FACTOR."));
		console.log(chalk.bold.cyan("===================================================================="));

		// Get more veFXS
		const deposit_amount_1 = 100;
		const deposit_amount_1_e18 = new BigNumber(`${deposit_amount_1}e18`);
		console.log(`Deposit ${deposit_amount_1} FXS (4 years) for veFXS`);

		const veFXS_deposit_days = (4 * 365); // 4 years
		let block_time_current = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp = block_time_current + ((veFXS_deposit_days * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the emission factor
		const emission_factor_week_0 = new BigNumber(await fraxFarmInstance_FRAX_USDC.emissionFactor.call()).div(BIG18).toNumber();
		console.log("emission_factor_week_0: ", emission_factor_week_0);

		// Need to approve first so the staking can use transfer
		// account[1]
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9, { from: accounts[9] });

		// Stake Locked
		// account[1]
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_1_ALT_GOOD, 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 548 days
		
		// account[9]
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9, 28 * 86400, { from: accounts[9] }); // 28 days

		await time.advanceBlock();

		// Show the stake structs
		const locked_NFT_structs_1 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_NFT_structs_9 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_NFT_structs_1);
		console.log("LOCKED STAKES [9]: ", locked_NFT_structs_9);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const combined_weight_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const combined_weight_9 = new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", combined_weight_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", combined_weight_9.toString());
		
		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Stake is still locked"
		);
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_9, { from: accounts[9] }),
			"Stake is still locked"
		);
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);

		console.log("WAIT 7 DAYS");

		console.log("====================================================================");

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);

		// This sync() needs to be called here for the simulation only, because rewardPerToken() will return an artificially
		// low number otherwise because rewardPerTokenStored0 had not been updated yet. In real life, calling
		// getReward() would correct that because retroCatchUp() would be included and correct rewardPerTokenStored0
		await fraxFarmInstance_FRAX_USDC.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the emission factor
		const emission_factor_week_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.emissionFactor.call()).div(BIG18).toNumber();
		console.log("emission_factor_week_1: ", emission_factor_week_1);

		const staking_earned_1 = await fraxFarmInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());

		const staking_earned_9 = await fraxFarmInstance_FRAX_USDC.earned.call(accounts[9]);
		const staking_earned_9_fxs = new BigNumber(staking_earned_9).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());

		const duration_reward_1 = await fraxFarmInstance_FRAX_USDC.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1).div(BIG18);
		console.log("Expected yearly reward (with emission factor) [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).multipliedBy(emission_factor_week_1).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED (WITH THE TOKEN_ID_1), [9] SHOULD FAIL");
		await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_9, { from: accounts[9] }),
			"Stake is still locked"
		);

		// Note balances beforehand
		const fxs_balance_before_reward = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const frax_balance_before_reward = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		const usdc_balance_before_reward = new BigNumber(await col_instance_USDC.balanceOf.call(accounts[9])).div(BIG6);

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		console.log("[9] COLLECT REWARDS");
		await fraxFarmInstance_FRAX_USDC.getReward({ from: accounts[9] });

		// Note balances afterwards. Should have FRAX and USDC LP fees too
		const fxs_balance_after_reward = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const frax_balance_after_reward = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		const usdc_balance_after_reward = new BigNumber(await col_instance_USDC.balanceOf.call(accounts[9])).div(BIG6);
		
		// Print the changes
		console.log(`FXS change from reward: ${fxs_balance_after_reward - fxs_balance_before_reward} FXS`);
		console.log(`FRAX change from reward: ${frax_balance_after_reward - frax_balance_before_reward} FRAX`);
		console.log(`USDC change from reward: ${usdc_balance_after_reward - usdc_balance_before_reward} USDC`);

		const user_staked_frax_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.userStakedFrax(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber();
		const user_staked_frax_9 = new BigNumber(await fraxFarmInstance_FRAX_USDC.userStakedFrax(accounts[9], { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber();
		
		console.log("user_staked_frax_1: ", user_staked_frax_1);
		console.log("user_staked_frax_9: ", user_staked_frax_9);

		console.log("====================================================================");
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400) + 1);
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);

		// Make sure there is a valid period for the contract and sync it
		if (MANUALLY_CALL_SYNC){
			await fraxFarmInstance_FRAX_USDC.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		}
		
		const staking_fxs_earned_28_1 = await fraxFarmInstance_FRAX_USDC.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());

		const staking_fxs_earned_28_9 = await fraxFarmInstance_FRAX_USDC.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 4);
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(4).toString());
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());

		// Print the emission factor
		const emission_factor_week_5 = new BigNumber(await fraxFarmInstance_FRAX_USDC.emissionFactor.call()).div(BIG18).toNumber();
		console.log("emission_factor_week_5: ", emission_factor_week_5);

		// Print the reward rate
		let reward_rate_1_raw = new BigNumber(await fraxFarmInstance_FRAX_USDC.rewardRate0.call()).toNumber();
		let reward_rate_1 = new BigNumber(reward_rate_1_raw).div(BIG18).toNumber();
		console.log("reward_rate_1_raw: ", reward_rate_1_raw);
		console.log("reward_rate_1: ", (reward_rate_1 * 31557600));

		// Print the reward duration
		let rewards_duration = new BigNumber(await fraxFarmInstance_FRAX_USDC.rewardsDuration.call()).toNumber();;
		console.log("rewards_duration: ", rewards_duration);

		const duration_reward_3 = await fraxFarmInstance_FRAX_USDC.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3).div(BIG18);
		console.log("Expected yearly reward (with emission factor) [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).multipliedBy(emission_factor_week_5).toString());

		// Account 9 withdraws and claims its locked stake
		await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_9, { from: accounts[9] });
		await fraxFarmInstance_FRAX_USDC.getReward({ from: accounts[9] });
		await expectRevert.unspecified(fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("====================================================================");
		console.log("PRINT SOME DATA");
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);
		const _total_liquidity_staked_0 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_staked GLOBAL: ", _total_liquidity_staked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		console.log("====================================================================");
		console.log("UNLOCKING ALL STAKES AND WITHDRAWING");
		await fraxFarmInstance_FRAX_USDC.unlockStakes({ from: STAKING_OWNER });
		await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_NFT_structs_post_unlock_1 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_NFT_structs_post_unlock_9 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(accounts[9]);
		console.log("LOCKED STAKES POST UNLOCK [1]: ", locked_NFT_structs_post_unlock_1);
		console.log("LOCKED STAKES POST UNLOCK [9]: ", locked_NFT_structs_post_unlock_9);

		console.log("====================================================================");
		console.log("PRINT SOME DATA AGAIN");
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);
		const _total_liquidity_staked_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_staked GLOBAL: ", _total_liquidity_staked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		// await fxs_instance.transfer(fraxFarmInstance_FRAX_USDC.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("stakingInstance FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber());
		// await fraxFarmInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
	
		// The below part needs to be here for some reason
		// It seems to crash when it is in another it()
		// =====================================================
	});

	it('Locked stakes - NO EMISSION FACTOR', async () => {
		console.log(chalk.bold.cyan("===================================================================="));
		console.log(chalk.bold.cyan("TRY TESTS WITH LOCKED STAKES, NO EMISSION FACTOR."));
		console.log(chalk.bold.cyan("===================================================================="));

		// Stop the emission factor
		await fraxFarmInstance_FRAX_USDC.toggleEmissionFactorBypass({ from: STAKING_OWNER });

		// Re-lock stakes
		await fraxFarmInstance_FRAX_USDC.unlockStakes({ from: STAKING_OWNER });

		// Print the emission factor
		const emission_factor_week_0 = new BigNumber(await fraxFarmInstance_FRAX_USDC.emissionFactor.call()).div(BIG18).toNumber();
		console.log("emission_factor_week_0: ", emission_factor_week_0);

		// Need to approve first so the staking can use transfer
		// account[1]
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// account[9]
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9, { from: accounts[9] });

		// Stake Locked
		// account[1]
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_1_ALT_GOOD, 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 548 days
		
		// account[9]
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9, 28 * 86400, { from: accounts[9] }); // 28 days

		await time.advanceBlock();

		// Show the stake structs
		const locked_NFT_structs_1 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_NFT_structs_9 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_NFT_structs_1);
		console.log("LOCKED STAKES [9]: ", locked_NFT_structs_9);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const combined_weight_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const combined_weight_9 = new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", combined_weight_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", combined_weight_9.toString());
		
		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Stake is still locked"
		);
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_9, { from: accounts[9] }),
			"Stake is still locked"
		);
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);

		console.log("WAIT 7 DAYS");

		console.log("====================================================================");

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);

		// This sync() needs to be called here for the simulation only, because rewardPerToken() will return an artificially
		// low number otherwise because rewardPerTokenStored0 had not been updated yet. In real life, calling
		// getReward() would correct that because retroCatchUp() would be included and correct rewardPerTokenStored0
		await fraxFarmInstance_FRAX_USDC.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the emission factor
		const emission_factor_week_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.emissionFactor.call()).div(BIG18).toNumber();
		console.log("emission_factor_week_1: ", emission_factor_week_1);

		const staking_earned_1 = await fraxFarmInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());

		const staking_earned_9 = await fraxFarmInstance_FRAX_USDC.earned.call(accounts[9]);
		const staking_earned_9_fxs = new BigNumber(staking_earned_9).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());

		const duration_reward_1 = await fraxFarmInstance_FRAX_USDC.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1).div(BIG18);
		console.log("Expected yearly reward (with emission factor) [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).multipliedBy(emission_factor_week_1).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED (WITH THE TOKEN_ID_1), [9] SHOULD FAIL");
		await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_9, { from: accounts[9] }),
			"Stake is still locked"
		);

		// Note balances beforehand
		const fxs_balance_before_reward = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const frax_balance_before_reward = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		const usdc_balance_before_reward = new BigNumber(await col_instance_USDC.balanceOf.call(accounts[9])).div(BIG6);

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		console.log("[9] COLLECT REWARDS");
		await fraxFarmInstance_FRAX_USDC.getReward({ from: accounts[9] });

		// Note balances afterwards. Should have FRAX and USDC LP fees too
		const fxs_balance_after_reward = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const frax_balance_after_reward = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		const usdc_balance_after_reward = new BigNumber(await col_instance_USDC.balanceOf.call(accounts[9])).div(BIG6);
		
		// Print the changes
		console.log(`FXS change from reward: ${fxs_balance_after_reward - fxs_balance_before_reward} FXS`);
		console.log(`FRAX change from reward: ${frax_balance_after_reward - frax_balance_before_reward} FRAX`);
		console.log(`USDC change from reward: ${usdc_balance_after_reward - usdc_balance_before_reward} USDC`);

		const user_staked_frax_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.userStakedFrax(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber();
		const user_staked_frax_9 = new BigNumber(await fraxFarmInstance_FRAX_USDC.userStakedFrax(accounts[9], { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber();
		
		console.log("user_staked_frax_1: ", user_staked_frax_1);
		console.log("user_staked_frax_9: ", user_staked_frax_9);

		console.log("====================================================================");
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400) + 1);
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);

		// Make sure there is a valid period for the contract and sync it
		if (MANUALLY_CALL_SYNC){
			await fraxFarmInstance_FRAX_USDC.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		}
		
		const staking_fxs_earned_28_1 = await fraxFarmInstance_FRAX_USDC.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());

		const staking_fxs_earned_28_9 = await fraxFarmInstance_FRAX_USDC.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 4);
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(4).toString());
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());

		// Print the emission factor
		const emission_factor_week_5 = new BigNumber(await fraxFarmInstance_FRAX_USDC.emissionFactor.call()).div(BIG18).toNumber();
		console.log("emission_factor_week_5: ", emission_factor_week_5);

		// Print the reward rate
		let reward_rate_1_raw = new BigNumber(await fraxFarmInstance_FRAX_USDC.rewardRate0.call()).toNumber();
		let reward_rate_1 = new BigNumber(reward_rate_1_raw).div(BIG18).toNumber();
		console.log("reward_rate_1_raw: ", reward_rate_1_raw);
		console.log("reward_rate_1: ", (reward_rate_1 * 31557600));

		// Print the reward duration
		let rewards_duration = new BigNumber(await fraxFarmInstance_FRAX_USDC.rewardsDuration.call()).toNumber();;
		console.log("rewards_duration: ", rewards_duration);

		const duration_reward_3 = await fraxFarmInstance_FRAX_USDC.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3).div(BIG18);
		console.log("Expected yearly reward (with emission factor) [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).multipliedBy(emission_factor_week_5).toString());

		// Account 9 withdraws and claims its locked stake
		await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_9, { from: accounts[9] });
		await fraxFarmInstance_FRAX_USDC.getReward({ from: accounts[9] });
		await expectRevert.unspecified(fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("====================================================================");
		console.log("PRINT SOME DATA");
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);
		const _total_liquidity_staked_0 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_staked GLOBAL: ", _total_liquidity_staked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		console.log("====================================================================");
		console.log("UNLOCKING ALL STAKES AND WITHDRAWING");
		await fraxFarmInstance_FRAX_USDC.unlockStakes({ from: STAKING_OWNER });
		await fraxFarmInstance_FRAX_USDC.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Show the stake structs
		const locked_NFT_structs_post_unlock_1 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_NFT_structs_post_unlock_9 = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(accounts[9]);
		console.log("LOCKED STAKES POST UNLOCK [1]: ", locked_NFT_structs_post_unlock_1);
		console.log("LOCKED STAKES POST UNLOCK [9]: ", locked_NFT_structs_post_unlock_9);

		console.log("====================================================================");
		console.log("PRINT SOME DATA AGAIN");
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);
		const _total_liquidity_staked_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_staked GLOBAL: ", _total_liquidity_staked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		// await fxs_instance.transfer(fraxFarmInstance_FRAX_USDC.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("stakingInstance FXS balance:", new BigNumber(await fxs_instance.balanceOf(fraxFarmInstance_FRAX_USDC.address)).div(BIG18).toNumber());
		// await fraxFarmInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
	
		// The below part needs to be here for some reason
		// It seems to crash when it is in another it()
		// =====================================================
	});

	it("Migration Staking / Withdrawal Tests", async () => {
		console.log("====================================================================");
		console.log("MIGRATION STAKING TESTS");
		
		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Untoggle the stake unlocking
		await fraxFarmInstance_FRAX_USDC.unlockStakes({ from: STAKING_OWNER });

		// Allow the migrator function to migrate for you
		await fraxFarmInstance_FRAX_USDC.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] liquidity staked:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 7 days

		// Advance 1 day
		console.log("---Advance a day---");
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Show the stake structs
		const locked_NFT_structs = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_NFT_structs);

		// Turn on migrations
		await fraxFarmInstance_FRAX_USDC.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		console.log("----PRINT SOME DATA AGAIN----");
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(fraxFarmInstance_FRAX_USDC, accounts[9]);
		const _total_liquidity_staked_2 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await fraxFarmInstance_FRAX_USDC.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_staked_2: ", _total_liquidity_staked_2.toString());
		console.log("_total_combined_weight_2: ", _total_combined_weight_2.toString());

		// Have the migrator withdraw locked tokens
		await fraxFarmInstance_FRAX_USDC.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS });		
		console.log("Migrator (accounts[10]) lockedLiquidityOf:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] lockedLiquidityOf:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] combinedWeightOf:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_1, { from: MIGRATOR_ADDRESS });
		let block_time_current_0 = (await time.latest()).toNumber();
		await fraxFarmInstance_FRAX_USDC.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, 28 * 86400, block_time_current_0, { from: MIGRATOR_ADDRESS });		
		console.log("Migrator (accounts[10]) lockedLiquidityOf:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] lockedLiquidityOf:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] combinedWeightOf:", (new BigNumber(await fraxFarmInstance_FRAX_USDC.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_NFT_structs = await fraxFarmInstance_FRAX_USDC.lockedNFTsOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log(chalk.blue("=============TEST INVALID TOKENS [SHOULD FAIL]============="));

		// Turn off migrations
		await fraxFarmInstance_FRAX_USDC.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY A TOKEN WITH THE WRONG TICKS---------");
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9_INVALID_WRONG_TICKS, { from: accounts[9] });
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9_INVALID_WRONG_TICKS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	

		console.log("---------TRY A TOKEN WITH THE WRONG TICKS [SECOND VERSION]---------");
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9_INSIDE_WRONG_TICKS, { from: accounts[9] });
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9_INSIDE_WRONG_TICKS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	

		console.log("---------TRY A TOKEN WITH THE WRONG UNDERLYING TOKENS---------");
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS, { from: accounts[9] });
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9_INVALID_WRONG_UNDERLYING_TOKENS, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	

		console.log("---------TRY A TOKEN WITH THE WRONG FEE---------");
		await uniswapV3PositionsNFTInstance.approve(fraxFarmInstance_FRAX_USDC.address, TOKEN_ID_9_INVALID_WRONG_FEE, { from: accounts[9] });
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.stakeLocked(TOKEN_ID_9_INVALID_WRONG_FEE, 28 * 86400, { from: accounts[9] }),
			"Wrong token characteristics"
		);	


		// Turn on migrations
		await fraxFarmInstance_FRAX_USDC.toggleMigrations({ from: STAKING_OWNER });


		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await fraxFarmInstance_FRAX_USDC.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_1 = (await time.latest()).toNumber();
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS }),
			"Not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO ERC20 RECOVERY WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.recoverERC20(uniswapV3PositionsNFTInstance.address, test_amount_1, { from: STAKING_OWNER }),
			"Not in migration"
		);	

		console.log("---------TRY TO DO ERC721 RECOVERY WHILE NOT IN MIGRATION---------");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.recoverERC721(uniswapV3PositionsNFTInstance.address, TOKEN_ID_1, { from: STAKING_OWNER }),
			"Not in migration"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await fraxFarmInstance_FRAX_USDC.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------RECOVER ERC721 AND GIVE TO COLLATERAL_FRAX_AND_FXS_OWNER---------");
		await fraxFarmInstance_FRAX_USDC.recoverERC721(uniswapV3PositionsNFTInstance.address, TOKEN_ID_1, { from: STAKING_OWNER }),
		await uniswapV3PositionsNFTInstance.safeTransferFrom(STAKING_OWNER, COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, 28 * 86400, block_time_current_2, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await fraxFarmInstance_FRAX_USDC.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			fraxFarmInstance_FRAX_USDC.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await fraxFarmInstance_FRAX_USDC.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance now disallows it
		await fraxFarmInstance_FRAX_USDC.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			fraxFarmInstance_FRAX_USDC.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, TOKEN_ID_1, { from: MIGRATOR_ADDRESS }),
			"Mig. invalid or unapproved"
		);

	});
});