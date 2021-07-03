const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require("chai");

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

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
const ERC20 = artifacts.require("ERC20/ERC20");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Saddle related
const ISaddleD4_LP = artifacts.require("Misc_AMOs/saddle/ISaddleD4_LP");

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
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const CommunalFarm_SaddleD4 = artifacts.require("Staking/Variants/CommunalFarm_SaddleD4");
const FraxFarm_UniV3_veFXS_FRAX_USDC = artifacts.require("Staking/Variants/FraxFarm_UniV3_veFXS_FRAX_USDC");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const IQToken = artifacts.require("ERC20/Variants/IQToken");
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

contract('CommunalFarm-Tests', async (accounts) => {
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

	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_FXS = '0x8a97a178408d7027355a7ef144fdf13277cea776';
	const ADDRESS_WITH_TRIBE = '0xA06Ad2e0339375124D255F1fAb201964eF707E18';
	const ADDRESS_WITH_ALCX = '0x000000000000000000000000000000000000dEaD';
	const ADDRESS_WITH_LQTY = '0xF6323aD07c30D696D3e572cb4648814F1188372D';

	// Initialize core contract instances
	let fraxInstance;
	let fxsInstance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let col_instance_USDC;
	let sushi_instance;
	let iq_instance;
	let tribe_instance;
	let alcx_instance;
	let lqty_instance;
	let mockFRAX3CRVInstance;
	let mockCRVDAOInstance;
	
	// Initialize the Uniswap Router Instance
	let routerInstance; 

	// Initialize the Uniswap Factory Instance
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
	let pair_instance_FRAX_IQ;

	// Initialize Sushi pair contracts
	let pair_instance_FRAX_FXS_Sushi;
	let pair_instance_FXS_WETH_Sushi;

	// Initialize Saddle pair contracts
	let pair_instance_Saddle_D4;

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
	// let stakingInstanceDualV5_FRAX_OHM;
	let communalFarmInstance_Saddle_D4; 
	// let fraxFarmInstance_FRAX_USDC;

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
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();

		// vestingInstance = await TokenVesting.deployed();

		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		sushi_instance = await SushiToken.deployed(); 
		iq_instance = await IQToken.deployed();
		tribe_instance = await ERC20.at("0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B");
		alcx_instance = await ERC20.at("0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF");
		lqty_instance = await ERC20.at("0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D");

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

		// Fill the Uniswap V3 Instances
		uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/FXS"]);
		pair_instance_FRAX_IQ = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/IQ"]);
		pair_instance_Saddle_D4 = await ISaddleD4_LP.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Saddle alUSD/FEI/FRAX/LUSD"]);
		// pair_instance_FXS_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FXS/USDC"]);

		// Get the mock CRVDAO Instance
		mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.deployed();

		// Get the mock FRAX3CRV Instance
		// uniswapV3PositionsNFTInstance = await FRAX3CRV_Mock.deployed(); 

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
		// stakingInstanceDualV2_FRAX3CRV_V2 = await StakingRewardsDualV2_FRAX3CRV_V2.deployed();
		// stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.deployed();
		communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.deployed();
		// fraxFarmInstance_FRAX_USDC = await FraxFarm_UniV3_veFXS_FRAX_USDC.deployed();

		// veFXS_instance = await veFXS.deployed();
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
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("------------------------------------------------");
		console.log("Give the staking contract some FRAX, to be recovered later");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		await fraxInstance.transfer(communalFarmInstance_Saddle_D4.address, new BigNumber("1e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxsInstance.transfer(communalFarmInstance_Saddle_D4.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with TRIBE");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_TRIBE]
		});

		await tribe_instance.transfer(communalFarmInstance_Saddle_D4.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_TRIBE });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_TRIBE]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with ALCX");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_ALCX]
		});

		await alcx_instance.transfer(communalFarmInstance_Saddle_D4.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_ALCX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_ALCX]
		});

		console.log("------------------------------------------------");
		console.log("Seed the staking contract with LQTY");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LQTY]
		});

		await lqty_instance.transfer(communalFarmInstance_Saddle_D4.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_LQTY });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LQTY]
		});

		console.log("------------------------------------------------");
		console.log("Give LPs to test users");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		await pair_instance_Saddle_D4.transfer(accounts[1], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance_Saddle_D4.transfer(accounts[9], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		
		console.log("Initializing Staking Contracts");
		await communalFarmInstance_Saddle_D4.initializeDefault({ from: STAKING_OWNER });
		// await stakingInstanceDual_FXS_WETH_Sushi.initializeDefault({ from: STAKING_OWNER });

		// Add a migrator address
		await communalFarmInstance_Saddle_D4.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

	});

	it('Locked stakes', async () => {
		console.log("====================================================================");
		console.log("TRY TESTS WITH LOCKED STAKES.");

		console.log("====================================================================");

		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, accounts[9]);

		// Print FXS and veFXS balances
		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", new BigNumber(await fxsInstance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		// Stake Locked
		// account[1]
		await communalFarmInstance_Saddle_D4.stakeLocked(uni_pool_locked_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await communalFarmInstance_Saddle_D4.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await communalFarmInstance_Saddle_D4.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] }); // 6 months
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1_0 = await communalFarmInstance_Saddle_D4.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9_0 = await communalFarmInstance_Saddle_D4.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, accounts[9]);

		const _total_liquidity_locked_0 = new BigNumber(await communalFarmInstance_Saddle_D4.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await communalFarmInstance_Saddle_D4.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());

		console.log("WAIT 7 DAYS");

		console.log("====================================================================");

		// Advance 7 days
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await communalFarmInstance_Saddle_D4.renewIfApplicable({ from: STAKING_OWNER });

		const staking_reward_symbols = await communalFarmInstance_Saddle_D4.getRewardSymbols.call();
		console.log("staking_reward_symbols: ", staking_reward_symbols);

		const staking_earned_1_arr = await communalFarmInstance_Saddle_D4.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_9_arr = await communalFarmInstance_Saddle_D4.earned.call(accounts[9]);
		const duration_reward_1_arr = await communalFarmInstance_Saddle_D4.getRewardForDuration.call();

		let reward_week_1 = [];
		for (let j = 0; j < staking_reward_symbols.length; j++){
			const staking_earned_1 = new BigNumber(staking_earned_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 1 week [${staking_reward_symbols[j]}]: `, staking_earned_1.toString());
			const staking_earned_9 = new BigNumber(staking_earned_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 1 week [${staking_reward_symbols[j]}]: `, staking_earned_9.toString());
	
			reward_week_1[j] = (staking_earned_1).plus(staking_earned_9);
			const effective_yearly_reward_at_week_1 = reward_week_1[j].multipliedBy(52.1429);
			console.log(`Effective weekly reward at week 1 [${staking_reward_symbols[j]}]: `, reward_week_1[j].toString());
			console.log(`Effective yearly reward at week 1 [${staking_reward_symbols[j]}]: `, effective_yearly_reward_at_week_1.toString());

			const duration_reward_1 = new BigNumber(duration_reward_1_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${staking_reward_symbols[j]}]: `, duration_reward_1.multipliedBy(52.1429).toString());
		}

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		// Since withdrawLocked does getReward, accounts[9] should collect now as well
		console.log("[9] COLLECT REWARDS");
		await communalFarmInstance_Saddle_D4.getReward({ from: accounts[9] });

		console.log("====================================================================");
		console.log("ADVANCING 28 DAYS");
		
		// Advance 28 days
		await time.increase((28 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		// Make sure there is a valid period for the contract and sync it
		await communalFarmInstance_Saddle_D4.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_earned_week5_1_arr = await communalFarmInstance_Saddle_D4.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_week5_9_arr = await communalFarmInstance_Saddle_D4.earned.call(accounts[9]);
		const duration_reward_week5_arr = await communalFarmInstance_Saddle_D4.getRewardForDuration.call();

		let reward_week_5 = [];
		for (let j = 0; j < staking_reward_symbols.length; j++){
			const staking_earned_week5_1 = new BigNumber(staking_earned_week5_1_arr[j]).div(BIG18);
			console.log(`accounts[1] earnings after 5 weeks [${staking_reward_symbols[j]}]: `, staking_earned_week5_1.toString());
			const staking_earned_week5_9 = new BigNumber(staking_earned_week5_9_arr[j]).div(BIG18);
			console.log(`accounts[9] earnings after 5 weeks [${staking_reward_symbols[j]}]: `, staking_earned_week5_9.toString());
	
			reward_week_5[j] = (staking_earned_week5_1).plus(staking_earned_week5_9);
			const effective_yearly_reward_at_week_5 = reward_week_5[j].multipliedBy(52.1429 / 4.0);
			console.log(`Effective weekly reward after 5 weeks [${staking_reward_symbols[j]}]: `, reward_week_5[j].div(4).toString());
			console.log(`Effective yearly reward after 5 weeks [${staking_reward_symbols[j]}]: `, effective_yearly_reward_at_week_5.toString());

			const duration_reward_week5 = new BigNumber(duration_reward_week5_arr[j]).div(BIG18);
			console.log(`Expected yearly reward [${staking_reward_symbols[j]}]: `, duration_reward_week5.multipliedBy(52.1429).toString());
		}

		// Account 9 withdraws and claims its locked stake
		await communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await communalFarmInstance_Saddle_D4.getReward({ from: accounts[9] });
		await expectRevert.unspecified(communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await communalFarmInstance_Saddle_D4.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await communalFarmInstance_Saddle_D4.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await communalFarmInstance_Saddle_D4.unlockStakes({ from: STAKING_OWNER });
		await communalFarmInstance_Saddle_D4.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeightNoVeFXS(communalFarmInstance_Saddle_D4, accounts[9]);

		const _total_liquidity_locked_2 = new BigNumber(await communalFarmInstance_Saddle_D4.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await communalFarmInstance_Saddle_D4.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());

	});

	it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await communalFarmInstance_Saddle_D4.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert(
			communalFarmInstance_Saddle_D4.stakeLocked(new BigNumber("1e18"), 7 * 86400, { from: accounts[9] }),
			"Address has been greylisted"
		);
	});

	it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await communalFarmInstance_Saddle_D4.greylistAddress(accounts[9], { from: STAKING_OWNER });
		// console.log("");
		// console.log("this should succeed");
		// await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await communalFarmInstance_Saddle_D4.stakeLocked(new BigNumber("1e18"), 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// // Wait 2 days
		// for (let j = 0; j < 2; j++){
		// 	await time.increase(86400);
		// 	await time.advanceBlock();
		// }

		// // Claim back the NFT and collect the rewards
		// await communalFarmInstance_Saddle_D4.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await communalFarmInstance_Saddle_D4.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});

	it("Communal / Token Manager Tests", async () => {
		const staking_reward_symbols = await communalFarmInstance_Saddle_D4.getRewardSymbols.call();
		const staking_reward_tokens_addresses = await communalFarmInstance_Saddle_D4.getAllRewardTokens.call();
		const test_recovery_amount = new BigNumber("1e18");

		// Try recovering a non-reward token as the owner
		await communalFarmInstance_Saddle_D4.recoverERC20(fraxInstance.address, test_recovery_amount, { from: STAKING_OWNER });
		
		for (let j = 0; j < staking_reward_symbols.length; j++){
			const token_manager_address = await communalFarmInstance_Saddle_D4.rewardManagers.call(staking_reward_tokens_addresses[j]);
			console.log(chalk.yellow(`---------------------------`));
			console.log(`[${staking_reward_symbols[j]} Manager]: ${token_manager_address}`);

			console.log("Try to set the reward rate with the wrong manager [SHOULD FAIL]");
			await expectRevert(
				communalFarmInstance_Saddle_D4.setRewardRate(staking_reward_tokens_addresses[0], 0, true, { from: accounts[9] }),
				"You are not the owner, governance timelock, or the correct token manager"
			);

			console.log("Try to change the token manager with the wrong account [SHOULD FAIL]");
			await expectRevert(
				communalFarmInstance_Saddle_D4.changeTokenManager(staking_reward_tokens_addresses[0], COLLATERAL_FRAX_AND_FXS_OWNER, { from: accounts[9] }),
				"You are not the owner, governance timelock, or the correct token manager"
			);

			await hre.network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [token_manager_address]
			});
	
			// Set the reward rate with the correct manager
			await communalFarmInstance_Saddle_D4.setRewardRate(staking_reward_tokens_addresses[j], 0, true, { from: token_manager_address });

			// Try recovering reward tokens as the reward manager
			await communalFarmInstance_Saddle_D4.recoverERC20(staking_reward_tokens_addresses[j], test_recovery_amount, { from: token_manager_address });

			// Change the token manager
			await communalFarmInstance_Saddle_D4.changeTokenManager(staking_reward_tokens_addresses[j], COLLATERAL_FRAX_AND_FXS_OWNER, { from: token_manager_address });
	
			await hre.network.provider.request({
				method: "hardhat_stopImpersonatingAccount",
				params: [token_manager_address]
			});
		}
	});

	it("Migration Staking / Withdrawal Tests", async () => {

		// Advance 1 day
		await time.increase((1 * 86400) + 1);
		await time.advanceBlock();

		// Refresh oracle
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Untoggle the stake unlocking
		await communalFarmInstance_Saddle_D4.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await communalFarmInstance_Saddle_D4.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf UniV2 FRAX/IQ LP:", (new BigNumber(await pair_instance_Saddle_D4.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await communalFarmInstance_Saddle_D4.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 6 months

		// Show the stake structs
		const locked_stake_structs = await communalFarmInstance_Saddle_D4.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await communalFarmInstance_Saddle_D4.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await communalFarmInstance_Saddle_D4.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_Saddle_D4.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		let block_time_current_0 = (await time.latest()).toNumber();
		await communalFarmInstance_Saddle_D4.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, block_time_current_0, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_Saddle_D4.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await communalFarmInstance_Saddle_D4.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await communalFarmInstance_Saddle_D4.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");
	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await communalFarmInstance_Saddle_D4.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await communalFarmInstance_Saddle_D4.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			communalFarmInstance_Saddle_D4.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		let block_time_current_1 = (await time.latest()).toNumber();
		await expectRevert(
			communalFarmInstance_Saddle_D4.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_1, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			communalFarmInstance_Saddle_D4.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO ERC20 RECOVER WHILE NOT AN OWNER [SHOULD FAIL]---------");
		await expectRevert(
			communalFarmInstance_Saddle_D4.recoverERC20(pair_instance_Saddle_D4.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"You are not the owner, governance timelock, or the correct token manager"
		);

		console.log("---------TRY TO ERC20 RECOVER LP TOKENS [SHOULD FAIL]---------");
		await expectRevert(
			communalFarmInstance_Saddle_D4.recoverERC20(pair_instance_Saddle_D4.address, test_amount_1, { from: STAKING_OWNER }),
			"Cannot rug staking / LP tokens"
		);

		console.log("---------TRY TO ERC20 RECOVER A REWARD TOKEN AS THE OWNER [SHOULD FAIL]---------");
		await expectRevert(
			communalFarmInstance_Saddle_D4.recoverERC20(tribe_instance.address, test_amount_1, { from: STAKING_OWNER }),
			"No valid tokens to recover"
		);

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await communalFarmInstance_Saddle_D4.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO STAKE LOCKED NORMALLY DURING A MIGRATION---------");
		await pair_instance_Saddle_D4.approve(communalFarmInstance_Saddle_D4.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			communalFarmInstance_Saddle_D4.stakeLocked(test_amount_1, 28 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking is paused, or migration is happening"
		);		

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			communalFarmInstance_Saddle_D4.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		let block_time_current_2 = (await time.latest()).toNumber();
		await expectRevert(
			communalFarmInstance_Saddle_D4.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, block_time_current_2, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await communalFarmInstance_Saddle_D4.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			communalFarmInstance_Saddle_D4.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await communalFarmInstance_Saddle_D4.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance disallows it
		await communalFarmInstance_Saddle_D4.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			communalFarmInstance_Saddle_D4.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

	});

});