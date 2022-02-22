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
const e = require('express');

// Uniswap related
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");


// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");

const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");

const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");


// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");
const StakingRewardsDual_FRAX_FXS_Sushi = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX_FXS_Sushi.sol");
const StakingRewardsDual_FXS_WETH_Sushi = artifacts.require("Staking/Variants/StakingRewardsDual_FXS_WETH_Sushi.sol");
// const StakingRewardsDual_FRAX3CRV = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX3CRV.sol");
const StakingRewardsDualV2_FRAX3CRV_V2 = artifacts.require("Staking/Variants/StakingRewardsDualV2_FRAX3CRV_V2.sol");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");
const CRV_DAO_ERC20_Mock = artifacts.require("ERC20/Variants/CRV_DAO_ERC20_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS related
const veFXS = artifacts.require("Curve/veFXS");
const veFXSYieldDistributor = artifacts.require("Staking/veFXSYieldDistributorV2");

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

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('veFXSYieldDistributor-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let ORIGINAL_FRAX_DEPLOYER_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	let MIGRATOR_ADDRESS;
	const ADDRESS_WITH_FXS = '0x8a97a178408d7027355a7ef144fdf13277cea776';
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_FRAX3CRV_V2 = '0x36a87d1e3200225f881488e4aeedf25303febcae';

	// Initialize core contract instances
	let fraxInstance;
	let fxsInstance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let col_instance_USDC;
	let sushi_instance;
	let mockFRAX3CRVInstance;
	let mockFRAX3CRV_V2Instance;
	let mockCRVDAOInstance;
	
	// Initialize the Uniswap Router Instance
	let routerInstance; 

	// Initialize the Uniswap Factory Instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	// Initialize oracle instances
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_FXS;
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Initialize the governance contract
	let governanceInstance;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_USDC_vAMM;
	

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
	let stakingInstanceDualV2_FRAX3CRV_V2;

	// Initialize veFXS related instances
	let veFXS_instance;
	let veFXSYieldDistributor_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_DEPLOYER_ADDRESS]
		});

		// Constants
		ORIGINAL_FRAX_DEPLOYER_ADDRESS = process.env.FRAX_DEPLOYER_ADDRESS;
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
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();

		// vestingInstance = await TokenVesting.deployed();

		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		sushi_instance = await SushiToken.deployed(); 

		// Fill the Uniswap Router Instance
		routerInstance = await UniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
		oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed(); 
		oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.deployed(); 
		 
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed();
		
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
		
		// Initialize ETH-USD Chainlink Oracle too
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory Instance
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/FXS"]);
		// pair_instance_FXS_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FXS/USDC"]);

		// Get instances of the Sushi pairs
		pair_instance_FRAX_FXS_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FRAX/FXS"]);
		pair_instance_FXS_WETH_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FXS/WETH"]);

		// Get the mock CRVDAO Instance
		mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.deployed();

		// Get the mock FRAX3CRV Instance
		// mockFRAX3CRV_V2Instance = await FRAX3CRV_Mock.deployed(); 
		// mockFRAX3CRV_V2Instance = await FRAX3CRV_V2_Mock.deployed(); 

		// Get the pair order results
		isToken0Frax_FRAX_WETH = await oracle_instance_FRAX_WETH.token0();
		isToken0Frax_FRAX_USDC = await oracle_instance_FRAX_USDC.token0();
		isToken0Fxs_FXS_WETH = await oracle_instance_FXS_WETH.token0();
		isToken0Fxs_FXS_USDC = await oracle_instance_FXS_USDC.token0();

		isToken0Frax_FRAX_WETH = fraxInstance.address == isToken0Frax_FRAX_WETH;
		isToken0Frax_FRAX_USDC = fraxInstance.address == isToken0Frax_FRAX_USDC;
		isToken0Fxs_FXS_WETH = fxsInstance.address == isToken0Fxs_FXS_WETH;
		isToken0Fxs_FXS_USDC = fxsInstance.address == isToken0Fxs_FXS_USDC;

		// Fill the staking rewards instances
		stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
		stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		// stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();
		stakingInstanceDualV2_FRAX3CRV_V2 = await StakingRewardsDualV2_FRAX3CRV_V2.deployed();

		// Initialize veFXS related instances
		veFXS_instance = await veFXS.deployed();
		veFXSYieldDistributor_instance = await veFXSYieldDistributor.deployed();
	}); 
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_DEPLOYER_ADDRESS]
		});
	})

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {

		// Refresh FXS / WETH oracle
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

	});

	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");

		// Fake move in some FXS
		console.log("Seed the distributor with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxsInstance.transfer(veFXSYieldDistributor_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		await fxsInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("25000e18"), { from: ADDRESS_WITH_FXS });
		await fxsInstance.transfer(accounts[9], new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});


		// Get some veFXS
		const deposit_amount_1 = 5000;
		const deposit_amount_9 = 1250;
		const deposit_amount_1_e18 = new BigNumber(`${deposit_amount_1}e18`);
		const deposit_amount_9_e18 = new BigNumber(`${deposit_amount_9}e18`);
		console.log(`Deposit (accounts[1]) ${deposit_amount_1} FXS (4 years) for veFXS`);
		console.log(`Deposit (accounts[9])  ${deposit_amount_9} FXS (4 years) for veFXS`);

		const veFXS_deposit_days = (4 * 365); // 4 years
		let block_time_current = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp = block_time_current + ((veFXS_deposit_days * 86400) + 1);
		await fxsInstance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.approve(veFXS_instance.address, deposit_amount_9_e18, { from: accounts[9] });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_9_e18, veFXS_deposit_end_timestamp, { from: accounts[9] });
		
		console.log("Initializing Contract");
		await veFXSYieldDistributor_instance.initializeDefault({ from: STAKING_OWNER });
	});

	it('Normal yield', async () => {
		console.log("=========================Normal Yields=========================");

		// Note accounts[1]
		const vefxs_at_1st_checkpoint_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_at_1st_checkpoint_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const yield_at_1st_checkpoint_1_FXS = new BigNumber(await veFXSYieldDistributor_instance.yields.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		await veFXSYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] at first checkpoint");
		console.log("accounts[1] veFXS balance:", vefxs_at_1st_checkpoint_1.toString());
		console.log("accounts[1] FXS balance:", fxs_at_1st_checkpoint_1.toString());
		console.log("accounts[1] staking yields() [FXS]:", yield_at_1st_checkpoint_1_FXS.toString());
		console.log("accounts[1] userVeFXSCheckpointed:", (new BigNumber(await veFXSYieldDistributor_instance.userVeFXSCheckpointed(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Note accounts[9]
		const vefxs_at_1st_checkpoint_9 = new BigNumber(await veFXS_instance.balanceOf.call(accounts[9])).div(BIG18);
		const fxs_at_1st_checkpoint_9 = new BigNumber(await fxsInstance.balanceOf.call(accounts[9])).div(BIG18);
		const yield_at_1st_checkpoint_9_FXS = new BigNumber(await veFXSYieldDistributor_instance.yields(accounts[9])).div(BIG18);

		await veFXSYieldDistributor_instance.checkpoint({ from: accounts[9] });
		console.log("accounts[9] at first checkpoint");
		console.log("accounts[9] veFXS balance:", vefxs_at_1st_checkpoint_9.toString());
		console.log("accounts[9] FXS balance:", fxs_at_1st_checkpoint_9.toString());
		console.log("accounts[9] staking yields() [FXS]:", yield_at_1st_checkpoint_9_FXS.toString());
		console.log("accounts[9] userVeFXSCheckpointed:", (new BigNumber(await veFXSYieldDistributor_instance.userVeFXSCheckpointed(accounts[9]))).div(BIG18).toNumber());
		console.log("");

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let distributor_lastUpdateTime = new BigNumber(await veFXSYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toString());

		// Note the total periodFinish
		let distributor_periodFinish = new BigNumber(await veFXSYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish:", distributor_periodFinish.toString());

		// Note the total lastTimeYieldApplicable
		let distributor_lastTimeYieldApplicable = new BigNumber(await veFXSYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable():", distributor_lastTimeYieldApplicable.toString());

		console.log("====================================================================");
		console.log("advance one week (one yieldDuration period)");
		// Advance 7 days so the yield can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await fraxInstance.refreshCollateralRatio();
		console.log("");

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("block time after waiting one week (in seconds):", block_time_after);

		// Make sure there is a valid period for the contract
		await veFXSYieldDistributor_instance.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		distributor_lastUpdateTime = new BigNumber(await veFXSYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toString());

		// Note the total periodFinish
		distributor_periodFinish = new BigNumber(await veFXSYieldDistributor_instance.periodFinish.call());
		console.log("Distributor periodFinish:", distributor_periodFinish.toString());

		// Note the total lastTimeYieldApplicable
		distributor_lastTimeYieldApplicable = new BigNumber(await veFXSYieldDistributor_instance.lastTimeYieldApplicable.call());
		console.log("Distributor lastTimeYieldApplicable():", distributor_lastTimeYieldApplicable.toString());
		
		// Note the total veFXS supply stored
		const distributor_total_vefxs_supply_Stored = new BigNumber(await veFXSYieldDistributor_instance.totalVeFXSSupplyStored.call()).div(BIG18);
		console.log("Distributor totalVeFXSSupplyStored():", distributor_total_vefxs_supply_Stored.toString());

		// Quick checkpoint
		await veFXSYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.checkpoint({ from: accounts[9] });

		console.log("");
		// Show the yields
		const account_1_earned = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_wk1_earned_1_fxs = new BigNumber(account_1_earned).div(BIG18);
		const account_9_earned = await veFXSYieldDistributor_instance.earned.call(accounts[9]);
		const staking_wk1_earned_9_fxs = new BigNumber(account_9_earned).div(BIG18);

		console.log("accounts[1] earnings after 1 week [FXS]:", staking_wk1_earned_1_fxs.toString());
		console.log("accounts[9] earnings after 1 week [FXS]:", staking_wk1_earned_9_fxs.toString());
		const yield_week_1_fxs = (staking_wk1_earned_1_fxs).plus(staking_wk1_earned_9_fxs);
		const effective_yearly_yield_at_week_1_fxs = yield_week_1_fxs.multipliedBy(52.1429)
		console.log("Effective weekly yield at week 1 [FXS]: ", yield_week_1_fxs.toString());
		console.log("Effective yearly yield at week 1 [FXS]: ", effective_yearly_yield_at_week_1_fxs.toString());

		const duration_yield = await veFXSYieldDistributor_instance.getYieldForDuration.call();
		const fractionParticipating = new BigNumber(await veFXSYieldDistributor_instance.fractionParticipating.call()).div(BIG6).toNumber();
		const pct_participating = fractionParticipating * 100;
		const duration_yield_1_fxs = new BigNumber(duration_yield).div(BIG18);
		console.log("Expected yearly yield [FXS]: ", duration_yield_1_fxs.multipliedBy(52.1429).toString());
		console.log(`Expected yearly yield [FXS], accounting for ${pct_participating}% participation: `, duration_yield_1_fxs.multipliedBy(52.1429).multipliedBy(fractionParticipating).toString());

		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the veFXS and FXS amounts after the yield
		const veFXS_post_yield_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_post_yield_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_post_yield_1.toString());
		console.log("accounts[1] FXS balance:", fxs_post_yield_1.toString());

		console.log("====================================================================");
		console.log("accounts[1] claim yield");
		console.log("accounts[9] will not claim");
		console.log("");
		await time.advanceBlock();
		const veFXS_balance_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const staking_ew_earned_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_ew_earned_1_fxs = new BigNumber(staking_ew_earned_1).div(BIG18);
		
		console.log("accounts[1] veFXS balance:", veFXS_balance_1.toString());
		console.log("accounts[1] staking earned() [FXS]:", staking_ew_earned_1_fxs.toString());
		console.log("");

		console.log("accounts[1] claims getYield()");
		await veFXSYieldDistributor_instance.getYield({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();

		const fxs_after_withdraw_0 = (new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18);
		console.log("accounts[1] FXS balance change:", (fxs_after_withdraw_0).minus(fxs_at_1st_checkpoint_1).toNumber());
		console.log("accounts[1] vote balance:", new BigNumber(await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("====================================================================");

		console.log("wait two weeks so accounts[9] can earn more");
		// Advance a few days
		await time.increase(2 * (7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await veFXSYieldDistributor_instance.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_after);

		// Note the total lastUpdateTime
		distributor_lastUpdateTime = new BigNumber(await veFXSYieldDistributor_instance.lastUpdateTime.call());
		console.log("Distributor lastUpdateTime:", distributor_lastUpdateTime.toString());

		// Note the total periodFinish
		distributor_periodFinish = new BigNumber(await veFXSYieldDistributor_instance.periodFinish.call()).toNumber();
		console.log("Distributor periodFinish: ", distributor_periodFinish.toString());

		// Note the total lastTimeYieldApplicable
		distributor_lastTimeYieldApplicable = new BigNumber(await veFXSYieldDistributor_instance.lastTimeYieldApplicable.call()).toNumber();
		console.log("Distributor lastTimeYieldApplicable: ", distributor_lastTimeYieldApplicable.toString());

		// Quick checkpoint
		await veFXSYieldDistributor_instance.checkpoint({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXSYieldDistributor_instance.checkpoint({ from: accounts[9] });

		// Show the yield
		const staking_part2_earned_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_part2_earned_1_fxs = new BigNumber(staking_part2_earned_1).div(BIG18);
		
		const staking_part2_earned_9 = await veFXSYieldDistributor_instance.earned.call(accounts[9]);
		const staking_part2_earned_9_fxs = new BigNumber(staking_part2_earned_9).div(BIG18);

		console.log("accounts[1] staking earned() [FXS]:", staking_part2_earned_1_fxs.toString());
		console.log("accounts[9] staking earned() [FXS]:", staking_part2_earned_9_fxs.toString());
		console.log("");

		const veFXS_2nd_time_balance_1 = new BigNumber(await veFXS_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_2nd_time_balance_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const yield_earned_2nd_time_1 = await veFXSYieldDistributor_instance.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const yield_earned_2nd_time_1_fxs = new BigNumber(yield_earned_2nd_time_1).div(BIG18);
		console.log("accounts[1] veFXS balance:", veFXS_2nd_time_balance_1.toString());
		console.log("accounts[1] FXS balance:", fxs_2nd_time_balance_1.toString());
		console.log("accounts[1] earned() [FXS]:", yield_earned_2nd_time_1_fxs.toString());
		console.log("");

		console.log("accounts[9] getYield()");
		await veFXSYieldDistributor_instance.getYield({ from: accounts[9] });

		await time.advanceBlock();

		const sum_yield_week_3_fxs = ((staking_part2_earned_1_fxs).plus(staking_part2_earned_9_fxs)).plus(staking_wk1_earned_1_fxs);
		const effective_yearly_yield_at_week_3_fxs  = sum_yield_week_3_fxs.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
		const fractionParticipating_week_3 = new BigNumber(await veFXSYieldDistributor_instance.fractionParticipating.call()).div(BIG6).toNumber();
		const pct_participating_week_3 = fractionParticipating_week_3 * 100;
		console.log("Effective weekly yield at week 3 [FXS]: ", sum_yield_week_3_fxs.div(3).toString()); // Total over 3 weeks
		console.log("Effective yearly yield at week 3 [FXS]:", effective_yearly_yield_at_week_3_fxs.toString());
		
		const duration_yield_3 = await veFXSYieldDistributor_instance.getYieldForDuration.call();
		const duration_yield_3_fxs = new BigNumber(duration_yield_3).div(BIG18);
		console.log("Expected yearly yield: [FXS]", duration_yield_3_fxs.multipliedBy(52.1429).toString());
		console.log(`Expected yearly yield [FXS], accounting for ${pct_participating_week_3}% participation: `, duration_yield_3_fxs.multipliedBy(52.1429).multipliedBy(fractionParticipating_week_3).toString());

		const acc_9_FXS_balance_after = (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18);
		console.log("accounts[9] FXS balance change:", acc_9_FXS_balance_after.minus(fxs_at_1st_checkpoint_9).toNumber());
	});

	
	it("blocks a greylisted address which tries to get yield; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await veFXSYieldDistributor_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");

		await expectRevert.unspecified(veFXSYieldDistributor_instance.getYield({ from: accounts[9] }));
	});

	it("ungreylists a greylisted address which tries to get yield; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await veFXSYieldDistributor_instance.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should succeed");
		await veFXSYieldDistributor_instance.getYield({ from: accounts[9] });
	});


});