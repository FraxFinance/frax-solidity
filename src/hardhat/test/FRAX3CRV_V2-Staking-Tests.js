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
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
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
const PoolvAMM_USDC = artifacts.require("Frax/Pools/PoolvAMM_USDC");

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

contract('FRAX3CRV_V2-Staking-Tests', async (accounts) => {
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

	// Initialize running balances
	let bal_frax = 0;
	let bal_fxs = 0;
	let col_bal_usdc = 0;
	let col_rat = 1;
	let pool_bal_usdc = 0;
	let global_collateral_value = 0;

	const USE_CALLS = false;
	const MAX_SLIPPAGE = .025;

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
		pool_instance_USDC_vAMM = await PoolvAMM_USDC.deployed();
		
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
		mockFRAX3CRV_V2Instance = await FRAX3CRV_V2_Mock.deployed(); 

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

		// // Get the prices
		// // Price is in collateral needed for 1 FRAX
		// let frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		// let frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(fraxInstance.address, new BigNumber("1e18")))).div(BIG6);

		// let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		// let fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(fxsInstance.address, new BigNumber("1e18")))).div(BIG6);
		
		// let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, new BigNumber("1e18")))).div(BIG6);


		// console.log(chalk.blue("==================PRICES=================="));
		// // Print the new prices
		// console.log("ETH-USD price from Chainlink:", (new BigNumber((await fraxInstance.frax_info.call())['7'])).div(1e6).toString() , "USD = 1 ETH");
		// console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), "FRAX = 1 WETH");
		// console.log("FRAX-USD price from Chainlink, Uniswap:", (new BigNumber(await fraxInstance.frax_price.call())).div(1e6).toString(), "FRAX = 1 USD",);
		// console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), "USDC = 1 FRAX");
		// console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), "FXS = 1 WETH");
		// console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), "USDC = 1 FXS");
		// console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH");
		// console.log("USDC_price_from_pool: ", (new BigNumber (await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), "USDC = 1 USD");

		// let fxs_usdc_reserves = (await pair_instance_FXS_USDC.getReserves());
		// let fxs_current_reserves = (new BigNumber(fxs_usdc_reserves[0])).toNumber();
		// let usdc_current_reserves = (new BigNumber(fxs_usdc_reserves[1])).toNumber();
		// console.log("FXS-USDC reserves:", fxs_current_reserves, "FXS to", usdc_current_reserves, "USDC");
		// console.log(`[vAMM]: 1 FXS = ${(usdc_current_reserves * 1e12 / fxs_current_reserves).toFixed(4)} USDC`);
		// console.log("[oracle]: 1 FXS = ", fxs_price_from_FXS_USDC.toString(), "USDC");
	});

	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");
		// Fake move in some CRVDAO
		console.log("Seed the staking contract with CRV DAO");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_CRV_DAO]
		});

		await mockCRVDAOInstance.transfer(stakingInstanceDualV2_FRAX3CRV_V2.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_CRV_DAO });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_CRV_DAO]
		});

		console.log("----------------------------");
		// Fake move in some FXS
		console.log("Seed the staking contract with FXS");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Seed the FRAX/FXS staking contract
		await fxsInstance.transfer(stakingInstanceDualV2_FRAX3CRV_V2.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		// await mockCRVDAOInstance.transfer(stakingInstanceDual_FXS_WETH_Sushi.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("----------------------------");
		console.log("Give some LP tokens to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX3CRV_V2]
		});

		await mockFRAX3CRV_V2Instance.transfer(accounts[1], new BigNumber("250e18"), { from: ADDRESS_WITH_FRAX3CRV_V2 });
		await mockFRAX3CRV_V2Instance.transfer(accounts[9], new BigNumber("250e18"), { from: ADDRESS_WITH_FRAX3CRV_V2 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX3CRV_V2]
		});
		
		console.log("Initializing Staking Contracts");
		await stakingInstanceDualV2_FRAX3CRV_V2.initializeDefault({ from: STAKING_OWNER });
		// await stakingInstanceDual_FXS_WETH_Sushi.initializeDefault({ from: STAKING_OWNER });

		// Add a migrator address
		await stakingInstanceDualV2_FRAX3CRV_V2.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });
	});

	it('PART 1: Normal stakes at CR = 0', async () => {
		console.log("=========================Normal Stakes [CR = 0]=========================");

		const cr_boost_multiplier = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.crBoostMultiplier()).div(BIG6);
		console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier.toNumber());

		// Note the Uniswap Pool Token and FXS amounts after staking
		let token1_pool_tokens_1 = new BigNumber("75e17");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, token1_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] approve FRAX_USDC staking pool for 7.5 (E18) LP tokens");
		const uni_pool_1st_stake_1 = new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_1st_stake_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const token1_1st_stake_1 = new BigNumber(await mockCRVDAOInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const rewards_balance_1st_stake_1_FXS = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.rewards0.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_balance_1st_stake_1_TOKEN1= new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.rewards1.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		await stakingInstanceDualV2_FRAX3CRV_V2.stake(token1_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });		
		console.log("accounts[1] staking 7.5 (E18) LP tokens into FRAX_USDC staking pool");
		console.log("accounts[1] LP token balance:", uni_pool_1st_stake_1.toString());
		console.log("accounts[1] FXS balance:", fxs_1st_stake_1.toString());
		console.log("accounts[1] CRVDAO balance:", token1_1st_stake_1.toString());
		console.log("accounts[1] staking rewards0() [FXS]:", rewards_balance_1st_stake_1_FXS.toString());
		console.log("accounts[1] staking rewards1() [CRVDAO]:", rewards_balance_1st_stake_1_TOKEN1.toString());
		console.log("accounts[1] balanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] boostedBalanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		let uni_pool_tokens_9 = new BigNumber("25e17");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] approve FRAX_USDC staking pool for 2.5 (E18) LP tokens");
		const uni_pool_1st_stake_9 = new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf.call(accounts[9])).div(BIG18);
		const fxs_1st_stake_9 = new BigNumber(await fxsInstance.balanceOf.call(accounts[9])).div(BIG18);
		const token1_1st_stake_9 = new BigNumber(await mockCRVDAOInstance.balanceOf.call(accounts[9])).div(BIG18);
		
		const rewards_balance_1st_stake_9_FXS = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.rewards0(accounts[9])).div(BIG18);
		const rewards_balance_1st_stake_9_TOKEN1= new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.rewards1(accounts[9])).div(BIG18);

		await stakingInstanceDualV2_FRAX3CRV_V2.stake(uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] staking 2.5 (E18) LP tokens into FRAX_USDC staking pool");
		console.log("accounts[9] LP token balance:", uni_pool_1st_stake_9.toString());
		console.log("accounts[9] FXS balance:", fxs_1st_stake_9.toString());
		console.log("accounts[9] CRVDAO balance:", token1_1st_stake_9.toString());
		console.log("accounts[9] staking rewards0() [FXS]:", rewards_balance_1st_stake_9_FXS.toString());
		console.log("accounts[9] staking rewards1() [CRVDAO]:", rewards_balance_1st_stake_9_TOKEN1.toString());
		console.log("accounts[9] balanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(accounts[9]))).div(BIG18).toNumber());
		console.log("accounts[9] boostedBalanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(accounts[9]))).div(BIG18).toNumber());
		console.log("");

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		let rewards_contract_periodFinish = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

		console.log("====================================================================");
		console.log("advance one week (one rewardsDuration period)");
		// Advance 7 days so the reward can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await fraxInstance.refreshCollateralRatio();
		console.log("");

		const cr_boost_multiplier_2 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.crBoostMultiplier()).div(BIG6);
		console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier_2.toNumber());

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("block time after waiting one week (in seconds):", block_time_after);

		// Make sure there is a valid period for the contract
		await stakingInstanceDualV2_FRAX3CRV_V2.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());
		
		// Note the total FRAX supply
		const rewards_contract_stored_uni_pool = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.totalSupply.call()).div(BIG18);
		console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toString());

		// Print the decimals
		const staking_token_decimal = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.stakingDecimals.call())
		console.log("pool stakingDecimals():", staking_token_decimal.toString());

		console.log("");
		// Show the reward
		const account_1_earned = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_wk1_earned_1_fxs = new BigNumber(account_1_earned[0]).div(BIG18);
		const staking_wk1_earned_1_token1 = new BigNumber(account_1_earned[1]).div(BIG18);
		
		const account_9_earned = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(accounts[9]);
		const staking_wk1_earned_9_fxs = new BigNumber(account_9_earned[0]).div(BIG18);
		const staking_wk1_earned_9_token1 = new BigNumber(account_9_earned[1]).div(BIG18);

		console.log("accounts[1] earnings after 1 week [FXS]:", staking_wk1_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [CRVDAO]:", staking_wk1_earned_1_token1.toString());
		console.log("accounts[9] earnings after 1 week [FXS]:", staking_wk1_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [CRVDAO]:", staking_wk1_earned_9_token1.toString());
		const reward_week_1_fxs = (staking_wk1_earned_1_fxs).plus(staking_wk1_earned_9_fxs);
		const reward_week_1_token1 = (staking_wk1_earned_1_token1).plus(staking_wk1_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429)
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429)
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [CRVDAO]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [CRVDAO]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_rewards = await stakingInstanceDualV2_FRAX3CRV_V2.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_rewards[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_rewards[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [CRVDAO]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());
		await stakingInstanceDualV2_FRAX3CRV_V2.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the UNI POOL and FXS amounts after the reward
		const uni_pool_post_reward_1 = new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_post_reward_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const token1_post_reward_1 = new BigNumber(await mockCRVDAOInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[1] LP token balance:", uni_pool_post_reward_1.toString());
		console.log("accounts[1] FXS balance:", fxs_post_reward_1.toString());
		console.log("accounts[1] CRVDAO balance:", token1_post_reward_1.toString());

		console.log("====================================================================");
		console.log("accounts[1] claim rewards and withdraw LP tokens");
		console.log("accounts[9] will leave everything in the contract");
		console.log("");
		await time.advanceBlock();
		const uni_pool_balance_1 = new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const staking_ew_earned_1 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_ew_earned_1_fxs = new BigNumber(staking_ew_earned_1[0]).div(BIG18);
		const staking_ew_earned_1_token1 = new BigNumber(staking_ew_earned_1[1]).div(BIG18);
		
		console.log("accounts[1] LP token balance:", uni_pool_balance_1.toString());
		console.log("accounts[1] staking earned() [FXS]:", staking_ew_earned_1_fxs.toString());
		console.log("accounts[1] staking earned() [CRVDAO]:", staking_ew_earned_1_token1.toString());
		console.log("");

		// Ignore [9] here as we are still right after the first week and it isn't collecting
		// const uni_pool_balance_9 = new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf.call(accounts[9])).div(BIG18);
	
		// const staking_ew_earned_9 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(accounts[9]);
		// const staking_ew_earned_9_fxs = new BigNumber(staking_ew_earned_9[0]).div(BIG18);
		// const staking_ew_earned_9_token1 = new BigNumber(staking_ew_earned_9[1]).div(BIG18);
		
		// console.log("accounts[9] LP token balance:", uni_pool_balance_9.toString());
		// console.log("accounts[9] staking earned() [FXS]:", staking_ew_earned_9_fxs.toString());
		// console.log("accounts[9] staking earned() [CRVDAO]:", staking_ew_earned_9_token1.toString());
		// console.log("");

		console.log("accounts[1] claims getReward()");
		await stakingInstanceDualV2_FRAX3CRV_V2.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();

		console.log("accounts[1] performs withdraw()");
		await stakingInstanceDualV2_FRAX3CRV_V2.withdraw(token1_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();
		console.log("");

		const fxs_after_withdraw_0 = (new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18);
		console.log("accounts[1] FXS balance change:", (fxs_after_withdraw_0).minus(fxs_1st_stake_1).toNumber());
		console.log("accounts[1] vote balance:", new BigNumber(await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("====================================================================");

		console.log("Start allowing token1 rewards");
		const new_token1_rate = new BigNumber(3650e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); // (uint256(1000000e18)).div(365 * 86400); // Base emission rate of 1M FXS over 3 years
		const curr_token0_rate = await stakingInstanceDualV2_FRAX3CRV_V2.rewardRate0.call();
		await stakingInstanceDualV2_FRAX3CRV_V2.setRewardRates(curr_token0_rate, new_token1_rate, false, { from: STAKING_OWNER });

		console.log("====================================================================");

		console.log("wait two weeks so accounts[9] can earn more");
		// Advance a few days
		await time.increase(2 * (7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await stakingInstanceDualV2_FRAX3CRV_V2.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_after);

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.periodFinish.call()).toNumber();
		console.log("pool periodFinish: ", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lastTimeRewardApplicable.call()).toNumber();
		console.log("pool lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

		// Show the reward
		const staking_part2_earned_1 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_part2_earned_1_fxs = new BigNumber(staking_part2_earned_1[0]).div(BIG18);
		const staking_part2_earned_1_token1 = new BigNumber(staking_part2_earned_1[1]).div(BIG18);
		
		const staking_part2_earned_9 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(accounts[9]);
		const staking_part2_earned_9_fxs = new BigNumber(staking_part2_earned_9[0]).div(BIG18);
		const staking_part2_earned_9_token1 = new BigNumber(staking_part2_earned_9[1]).div(BIG18);

		console.log("accounts[1] staking earned() [FXS]:", staking_part2_earned_1_fxs.toString());
		console.log("accounts[1] staking earned() [CRVDAO]:", staking_part2_earned_1_token1.toString());
		console.log("accounts[9] staking earned() [FXS]:", staking_part2_earned_9_fxs.toString());
		console.log("accounts[9] staking earned() [CRVDAO]:", staking_part2_earned_9_token1.toString());
		console.log("");

		const uni_pool_2nd_time_balance_1 = new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_2nd_time_balance_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		const rewards_earned_2nd_time_1 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
		const rewards_earned_2nd_time_1_fxs = new BigNumber(rewards_earned_2nd_time_1[0]).div(BIG18);
		const rewards_earned_2nd_time_1_token1 = new BigNumber(rewards_earned_2nd_time_1[1]).div(BIG18);
		console.log("accounts[1] LP token balance:", uni_pool_2nd_time_balance_1.toString());
		console.log("accounts[1] FXS balance:", fxs_2nd_time_balance_1.toString());
		console.log("accounts[1] staking earned() [FXS]:", rewards_earned_2nd_time_1_fxs.toString());
		console.log("accounts[1] staking earned() [CRVDAO]:", rewards_earned_2nd_time_1_token1.toString());
		console.log("");

		console.log("accounts[9] getReward()");
		await stakingInstanceDualV2_FRAX3CRV_V2.getReward({ from: accounts[9] });

		console.log("accounts[9] withdrawing");
		await stakingInstanceDualV2_FRAX3CRV_V2.withdraw(uni_pool_tokens_9, { from: accounts[9] });
		await time.advanceBlock();

		const sum_reward_week_3_fxs = ((staking_part2_earned_1_fxs).plus(staking_part2_earned_9_fxs)).plus(staking_wk1_earned_1_fxs);
		const sum_reward_week_3_token1 = ((staking_part2_earned_1_token1).plus(staking_part2_earned_9_token1)).plus(staking_wk1_earned_1_token1);
		const effective_yearly_reward_at_week_3_fxs  = sum_reward_week_3_fxs.multipliedBy(52.1429 / 3.0); // Total over 3 weeks
		const effective_yearly_reward_at_week_3_token1 = sum_reward_week_3_token1.multipliedBy(52.1429 / 2.0); // Total over 2 weeks (1 week delay)
		console.log("Effective weekly reward at week 3 [FXS]: ", sum_reward_week_3_fxs.div(3).toString()); // Total over 3 weeks
		console.log("Effective weekly reward at week 3 [may be lower if delayed] [CRVDAO]:", sum_reward_week_3_token1.div(2).toString()); // Total over 3 weeks
		console.log("Effective yearly reward at week 3 [FXS]:", effective_yearly_reward_at_week_3_fxs.toString());
		console.log("Effective yearly reward at week 3 [may be lower if delayed] [CRVDAO]:", effective_yearly_reward_at_week_3_token1.toString());
		
		const duration_reward_3 = await stakingInstanceDualV2_FRAX3CRV_V2.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected yearly reward: [FXS]", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward: [CRVDAO]", duration_reward_3_token1.multipliedBy(52.1429).toString());

		const acc_9_FXS_balance_after = (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18);
		const acc_9_TOKEN1_balance_after = (new BigNumber(await mockCRVDAOInstance.balanceOf(accounts[9]))).div(BIG18);
		console.log("accounts[9] FXS balance change:", acc_9_FXS_balance_after.minus(fxs_1st_stake_9).toNumber());
		console.log("accounts[9] CRVDAO balance change:", acc_9_TOKEN1_balance_after.minus(token1_1st_stake_9).toNumber());
	});

	
	it("blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await stakingInstanceDualV2_FRAX3CRV_V2.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert.unspecified(stakingInstanceDualV2_FRAX3CRV_V2.stake(new BigNumber("1e18"), { from: accounts[9] }));
	});

	it("ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await stakingInstanceDualV2_FRAX3CRV_V2.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should succeed");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, new BigNumber("1e18"), { from: accounts[9] });
		await stakingInstanceDualV2_FRAX3CRV_V2.stake(new BigNumber("1e18"), { from: accounts[9] });
	});

	it('PART 2: Locked stakes', async () => {
		console.log("====================================================================");
		console.log("NOW TRY TESTS WITH LOCKED STAKES.");
		console.log("[1] AND [9] HAVE WITHDRAWN EVERYTHING AND ARE NOW AT 0");

		// console.log("====================================================================");

		console.log("Stop token1 rewards");
		const new_token1_rate = 0; // (uint256(1000000e18)).div(365 * 86400); // Base emission rate of 1M FXS over 3 years
		const curr_token0_rate = await stakingInstanceDualV2_FRAX3CRV_V2.rewardRate0.call();
		await stakingInstanceDualV2_FRAX3CRV_V2.setRewardRates(curr_token0_rate, new_token1_rate, false, { from: STAKING_OWNER });

		console.log("====================================================================");

		// Need to approve first so the staking can use transfer
		const uni_pool_normal_1 = new BigNumber("15e17");
		const uni_pool_normal_9 = new BigNumber("5e17");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, uni_pool_normal_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, uni_pool_normal_9, { from: accounts[9] });
		
		// Stake Normal
		await stakingInstanceDualV2_FRAX3CRV_V2.stake(uni_pool_normal_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceDualV2_FRAX3CRV_V2.stake(uni_pool_normal_9, { from: accounts[9] });
		await time.advanceBlock();

		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		// Stake Locked
		// account[1]
		await stakingInstanceDualV2_FRAX3CRV_V2.stakeLocked(uni_pool_locked_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await stakingInstanceDualV2_FRAX3CRV_V2.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await stakingInstanceDualV2_FRAX3CRV_V2.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] }); // 6 months
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1 = await stakingInstanceDualV2_FRAX3CRV_V2.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9 = await stakingInstanceDualV2_FRAX3CRV_V2.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const unlocked_balance_1 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.unlockedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lockedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf.call(accounts[9])).div(BIG18);
		const unlocked_balance_9 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.unlockedBalanceOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.lockedBalanceOf.call(accounts[9])).div(BIG18);
		console.log("REGULAR BALANCE [1]: ", regular_balance_1.toString());
		console.log("BOOSTED BALANCE [1]: ", boosted_balance_1.toString());
		console.log("---- UNLOCKED [1]: ", unlocked_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("REGULAR BALANCE [9]: ", regular_balance_9.toString());
		console.log("BOOSTED BALANCE [9]: ", boosted_balance_9.toString());
		console.log("---- UNLOCKED [9]: ", unlocked_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		console.log("WAIT 7 DAYS");

		console.log("====================================================================");

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract and sync it
		await stakingInstanceDualV2_FRAX3CRV_V2.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_1 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1[0]).div(BIG18);
		const staking_earned_1_token1 = new BigNumber(staking_earned_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [CRVDAO]: ", staking_earned_1_token1.toString());

		const staking_earned_9 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(accounts[9]);
		const staking_earned_9_fxs = new BigNumber(staking_earned_9[0]).div(BIG18);
		const staking_earned_9_token1 = new BigNumber(staking_earned_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 1 week [FXS]: ", staking_earned_9_fxs.toString());
		console.log("accounts[9] earnings after 1 week [CRVDAO]: ", staking_earned_9_token1.toString());

		const reward_week_1_fxs = (staking_earned_1_fxs).plus(staking_earned_9_fxs);
		const reward_week_1_token1 = (staking_earned_1_token1).plus(staking_earned_9_token1);
		const effective_yearly_reward_at_week_1_fxs = reward_week_1_fxs.multipliedBy(52.1429);
		const effective_yearly_reward_at_week_1_token1 = reward_week_1_token1.multipliedBy(52.1429);
		console.log("Effective weekly reward at week 1 [FXS]: ", reward_week_1_fxs.toString());
		console.log("Effective weekly reward at week 1 [CRVDAO]: ", reward_week_1_token1.toString());
		console.log("Effective yearly reward at week 1 [FXS]: ", effective_yearly_reward_at_week_1_fxs.toString());
		console.log("Effective yearly reward at week 1 [CRVDAO]: ", effective_yearly_reward_at_week_1_token1.toString());

		const duration_reward_1 = await stakingInstanceDualV2_FRAX3CRV_V2.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_reward_1[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [CRVDAO]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));

		console.log("====================================================================");

		console.log("Start allowing token1 rewards again");
		const new_token1_rate_again = new BigNumber(3650e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); 
		const curr_token0_rate_again = await stakingInstanceDualV2_FRAX3CRV_V2.rewardRate0.call();
		await stakingInstanceDualV2_FRAX3CRV_V2.setRewardRates(curr_token0_rate_again, new_token1_rate_again, false, { from: STAKING_OWNER });

		console.log("====================================================================");
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract and sync it
		await stakingInstanceDualV2_FRAX3CRV_V2.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_fxs_earned_28_1 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1[0]).div(BIG18);
		const staking_fxs_earned_28_1_token1 = new BigNumber(staking_fxs_earned_28_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks [CRVDAO]: ", staking_fxs_earned_28_1_token1.toString());

		const staking_fxs_earned_28_9 = await stakingInstanceDualV2_FRAX3CRV_V2.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9[0]).div(BIG18);
		const staking_fxs_earned_28_9_token1 = new BigNumber(staking_fxs_earned_28_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks [CRVDAO]: ", staking_fxs_earned_28_9_token1.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const reward_week_5_token1 = (staking_fxs_earned_28_1_token1).plus(staking_fxs_earned_28_9_token1);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 5.0);
		const effective_yearly_reward_at_week_5_token1 = reward_week_5_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(5).toString());
		console.log("Effective weekly reward at week 5 [CRVDAO]: ", reward_week_5_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());
		console.log("Effective yearly reward at week 5 [CRVDAO]: ", effective_yearly_reward_at_week_5_token1.toString());

		const duration_reward_3 = await stakingInstanceDualV2_FRAX3CRV_V2.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [CRVDAO]: ", duration_reward_3_token1.multipliedBy(52.1429).toString());

		// Account 9 withdraws and claims its locked stake
		await stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] });
		await stakingInstanceDualV2_FRAX3CRV_V2.getReward({ from: accounts[9] });
		await expectRevert.unspecified(stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("UNLOCKING ALL STAKES");
		await stakingInstanceDualV2_FRAX3CRV_V2.unlockStakes({ from: STAKING_OWNER });
		await stakingInstanceDualV2_FRAX3CRV_V2.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// await fxsInstance.transfer(stakingInstanceDualV2_FRAX3CRV_V2.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("stakingInstance FXS balance:", new BigNumber(await fxsInstance.balanceOf(stakingInstanceDualV2_FRAX3CRV_V2.address)).div(BIG18).toNumber());
		// await stakingInstanceDualV2_FRAX3CRV_V2.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
	

		// The below part needs to be here for some reason
		// It seems to crash when it is in another it()
		// =====================================================
	

	
	});

	it("Migration Staking / Withdrawal Tests", async () => {

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Untoggle the stake unlocking
		await stakingInstanceDualV2_FRAX3CRV_V2.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await stakingInstanceDualV2_FRAX3CRV_V2.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf FRAX3CRV_V2:", (new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Normal
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, stake_amt_unlocked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceDualV2_FRAX3CRV_V2.stake(stake_amt_unlocked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Stake Locked
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceDualV2_FRAX3CRV_V2.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 6 months

		// Show the stake structs
		const locked_stake_structs = await stakingInstanceDualV2_FRAX3CRV_V2.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await stakingInstanceDualV2_FRAX3CRV_V2.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked balanceOf <BEFORE>:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf <BEFORE>:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Have the migrator withdraw unlocked tokens
		const withdraw_unlocked_amt = new BigNumber ("5e18");
		await stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_unlocked(COLLATERAL_FRAX_AND_FXS_OWNER, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_unlocked_amt.div(BIG18)} (E18) unlocked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf FRAX3CRV_V2:", (new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy stake for someone else as the migrator
		const proxy_stake_amt = new BigNumber ("5e18");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, proxy_stake_amt, { from: MIGRATOR_ADDRESS });
		await stakingInstanceDualV2_FRAX3CRV_V2.migrator_stake_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_amt, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator staked ${proxy_stake_amt.div(BIG18)} (E18) LP tokens for accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		await stakingInstanceDualV2_FRAX3CRV_V2.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await mockFRAX3CRV_V2Instance.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked balanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked boostedBalanceOf:", (new BigNumber(await stakingInstanceDualV2_FRAX3CRV_V2.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await stakingInstanceDualV2_FRAX3CRV_V2.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await stakingInstanceDualV2_FRAX3CRV_V2.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_unlocked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_unlocked(COLLATERAL_FRAX_AND_FXS_OWNER, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO migrator_stake_for WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_stake_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO EMERGENCY WITHDRAWALS WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.recoverERC20(mockFRAX3CRV_V2Instance.address, test_amount_1, { from: STAKING_OWNER }),
			"Cannot withdraw staking tokens unless migration is on"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await stakingInstanceDualV2_FRAX3CRV_V2.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO STAKE NORMALLY DURING A MIGRATION---------");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.stake(test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking is paused, or migration is happening"
		);	

		console.log("---------TRY TO STAKE LOCKED NORMALLY DURING A MIGRATION---------");
		await mockFRAX3CRV_V2Instance.approve(stakingInstanceDualV2_FRAX3CRV_V2.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.stakeLocked(test_amount_1, 28 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking is paused, or migration is happening"
		);		

		console.log("---------TRY TO migrator_withdraw_unlocked NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_unlocked(COLLATERAL_FRAX_AND_FXS_OWNER, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_stake_for NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_stake_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await stakingInstanceDualV2_FRAX3CRV_V2.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await stakingInstanceDualV2_FRAX3CRV_V2.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance disallows it
		await stakingInstanceDualV2_FRAX3CRV_V2.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			stakingInstanceDualV2_FRAX3CRV_V2.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

	});
});