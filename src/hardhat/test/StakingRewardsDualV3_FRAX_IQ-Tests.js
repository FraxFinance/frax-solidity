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
const e = require('express');

// Uniswap related
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

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
const StakingRewardsDualV3_FRAX_IQ = artifacts.require("Staking/Variants/StakingRewardsDualV3_FRAX_IQ");

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

contract('StakingRewardsDualV3_FRAX_IQ-Tests', async (accounts) => {
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
	const ADDRESS_WITH_IQ = '0xaCa39B187352D9805DECEd6E73A3d72ABf86E7A0';
	const ADDRESS_WITH_LP_TOKENS = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';

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
	let stakingInstanceDualV3_FRAX_IQ;
	// let fraxFarmInstance_FRAX_USDC;

	// Initialize veFXS instance
	let veFXS_instance;

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
		iq_instance = await IQToken.deployed();

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
		// pair_instance_FXS_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FXS/USDC"]);

		// Get instances of the Sushi pairs
		pair_instance_FRAX_FXS_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FRAX/FXS"]);
		pair_instance_FXS_WETH_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FXS/WETH"]);

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
		stakingInstanceDualV3_FRAX_IQ = await StakingRewardsDualV3_FRAX_IQ.deployed();
		// fraxFarmInstance_FRAX_USDC = await FraxFarm_UniV3_veFXS_FRAX_USDC.deployed();

		veFXS_instance = await veFXS.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_DEPLOYER_ADDRESS]
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
		console.log("Seed the staking contract with FXS and give COLLATERAL_FRAX_AND_FXS_OWNER some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxsInstance.transfer(stakingInstanceDualV3_FRAX_IQ.address, new BigNumber("25000e18"), { from: ADDRESS_WITH_FXS });
		await fxsInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("500000e18"), { from: ADDRESS_WITH_FXS });

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

		await iq_instance.transfer(stakingInstanceDualV3_FRAX_IQ.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_IQ });

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

		await pair_instance_FRAX_IQ.transfer(accounts[1], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });
		await pair_instance_FRAX_IQ.transfer(accounts[9], new BigNumber("30e18"), { from: ADDRESS_WITH_LP_TOKENS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LP_TOKENS]
		});

		
		console.log("Initializing Staking Contracts");
		await stakingInstanceDualV3_FRAX_IQ.initializeDefault({ from: STAKING_OWNER });
		// await stakingInstanceDual_FXS_WETH_Sushi.initializeDefault({ from: STAKING_OWNER });

		// Add a migrator address
		await stakingInstanceDualV3_FRAX_IQ.addMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		// Disable token1 rewards at first
		await stakingInstanceDualV3_FRAX_IQ.toggleToken1Rewards({ from: STAKING_OWNER });

		return false;
	});

	it('Locked stakes', async () => {
		console.log("====================================================================");
		console.log("TRY TESTS WITH LOCKED STAKES.");

		console.log("====================================================================");

		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, accounts[9]);

		// Get more veFXS (accounts[1])
		const deposit_amount_1 = 0.1;
		const deposit_amount_1_e18 = new BigNumber(deposit_amount_1).multipliedBy("1e18");
		console.log(`Deposit ${deposit_amount_1} FXS (4 years) for veFXS`);

		const veFXS_deposit_days_1 = (4 * 365); // 4 years
		let block_time_current_1 = (await time.latest()).toNumber();
		const veFXS_deposit_end_timestamp_1 = block_time_current_1 + ((veFXS_deposit_days_1 * 86400) + 1);
		await fxsInstance.approve(veFXS_instance.address, deposit_amount_1_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_1_e18, veFXS_deposit_end_timestamp_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Get more veFXS (accounts[9])
		// const deposit_amount_9 = 1;
		// const deposit_amount_9_e18 = new BigNumber(`${deposit_amount_9}e18`);
		// console.log(`Deposit ${deposit_amount_9} FXS (4 years) for veFXS`);

		// const veFXS_deposit_days_9 = (4 * 365); // 4 years
		// let block_time_current_9 = (await time.latest()).toNumber();
		// const veFXS_deposit_end_timestamp_9 = block_time_current_9 + ((veFXS_deposit_days_9 * 86400) + 1);
		// await fxsInstance.approve(veFXS_instance.address, deposit_amount_9_e18, { from: accounts[9] });
		// await veFXS_instance.increase_amount(deposit_amount_9_e18, veFXS_deposit_end_timestamp_9, { from: accounts[9] });

		// Print FXS and veFXS balances
		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] veFXS balance:", new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[9] FXS balance:", new BigNumber(await fxsInstance.balanceOf(accounts[9])).div(BIG18).toNumber());
		console.log("accounts[9] veFXS balance:", new BigNumber(await veFXS_instance.balanceOf(accounts[9])).div(BIG18).toNumber());
		
		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e17");
		const uni_pool_locked_1_sum = new BigNumber ("10e18");
		const uni_pool_locked_9 = new BigNumber("25e17");
		await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		// Stake Locked
		// account[1]
		await stakingInstanceDualV3_FRAX_IQ.stakeLocked(uni_pool_locked_1, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await stakingInstanceDualV3_FRAX_IQ.stakeLocked(new BigNumber ("25e17"), 548 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
		
		// account[9]
		await stakingInstanceDualV3_FRAX_IQ.stakeLocked(uni_pool_locked_9, 28 * 86400, { from: accounts[9] }); // 6 months
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1_0 = await stakingInstanceDualV3_FRAX_IQ.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9_0 = await stakingInstanceDualV3_FRAX_IQ.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1_0);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9_0);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, accounts[9]);

		const user_min_vefxs_for_max_boost_1_0 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_0 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_0: ", user_min_vefxs_for_max_boost_1_0.toString());
		console.log("user_min_vefxs_for_max_boost_9_0: ", user_min_vefxs_for_max_boost_9_0.toString());

		const _total_liquidity_locked_0 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_0 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.totalCombinedWeight.call()).div(BIG18);
		const frax_per_lp_token_0 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.fraxPerLPToken.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_0.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_0.toString());
		console.log("frax_per_lp_token_0 GLOBAL: ", frax_per_lp_token_0.toString());

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

		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_00_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_00_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_00_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_00_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_00_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_00_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_00_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_00_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_00_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_00_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_00_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_00_9.toString());

		const user_min_vefxs_for_max_boost_1_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_1: ", user_min_vefxs_for_max_boost_1_1.toString());
		console.log("user_min_vefxs_for_max_boost_9_1: ", user_min_vefxs_for_max_boost_9_1.toString());

		// Make sure there is a valid period for the contract and sync it
		await stakingInstanceDualV3_FRAX_IQ.renewIfApplicable({ from: STAKING_OWNER });

		const staking_earned_1 = await stakingInstanceDualV3_FRAX_IQ.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const staking_earned_1_fxs = new BigNumber(staking_earned_1[0]).div(BIG18);
		const staking_earned_1_token1 = new BigNumber(staking_earned_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 1 week [FXS]: ", staking_earned_1_fxs.toString());
		console.log("accounts[1] earnings after 1 week [IQ]: ", staking_earned_1_token1.toString());

		const staking_earned_9 = await stakingInstanceDualV3_FRAX_IQ.earned.call(accounts[9]);
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

		const duration_reward_1 = await stakingInstanceDualV3_FRAX_IQ.getRewardForDuration.call();
		const duration_reward_1_fxs = new BigNumber(duration_reward_1[0]).div(BIG18);
		const duration_reward_1_token1 = new BigNumber(duration_reward_1[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_1_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IQ]: ", duration_reward_1_token1.multipliedBy(52.1429).toString());

		console.log("TRY WITHDRAWING AGAIN");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");
		await stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_1_0[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] }));

		console.log("====================================================================");

		console.log("Start allowing token1 rewards again");
		await stakingInstanceDualV3_FRAX_IQ.toggleToken1Rewards({ from: STAKING_OWNER });
		const new_token1_rate_again = new BigNumber(365e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); 
		const curr_token0_rate_again = await stakingInstanceDualV3_FRAX_IQ.rewardRate0.call();
		await stakingInstanceDualV3_FRAX_IQ.setRewardRates(curr_token0_rate_again, new_token1_rate_again, false, { from: STAKING_OWNER });

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

		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, accounts[9]);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_01_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_01_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_01_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_01_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		const boosted_balance_01_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf.call(accounts[9])).div(BIG18);
		const locked_balance_01_9 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf.call(accounts[9])).div(BIG18);
		console.log("LOCKED LIQUIDITY [1]: ", regular_balance_01_1.toString());
		console.log("COMBINED WEIGHT [1]: ", boosted_balance_01_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_01_1.toString());
		console.log("LOCKED LIQUIDITY [9]: ", regular_balance_01_9.toString());
		console.log("COMBINED WEIGHT [9]: ", boosted_balance_01_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_01_9.toString());

		const user_min_vefxs_for_max_boost_1_2 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_2 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_2: ", user_min_vefxs_for_max_boost_1_2.toString());
		console.log("user_min_vefxs_for_max_boost_9_2: ", user_min_vefxs_for_max_boost_9_2.toString());

		// Make sure there is a valid period for the contract and sync it
		await stakingInstanceDualV3_FRAX_IQ.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const staking_fxs_earned_28_1 = await stakingInstanceDualV3_FRAX_IQ.earned.call(accounts[1]);
		const staking_fxs_earned_28_1_fxs = new BigNumber(staking_fxs_earned_28_1[0]).div(BIG18);
		const staking_fxs_earned_28_1_token1 = new BigNumber(staking_fxs_earned_28_1[1]).div(BIG18);
		console.log("accounts[1] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_1_fxs.toString());
		console.log("accounts[1] earnings after 5 weeks [IQ]: ", staking_fxs_earned_28_1_token1.toString());

		const staking_fxs_earned_28_9 = await stakingInstanceDualV3_FRAX_IQ.earned.call(accounts[9]);
		const staking_fxs_earned_28_9_fxs = new BigNumber(staking_fxs_earned_28_9[0]).div(BIG18);
		const staking_fxs_earned_28_9_token1 = new BigNumber(staking_fxs_earned_28_9[1]).div(BIG18);
		console.log("accounts[9] earnings after 5 weeks [FXS]: ", staking_fxs_earned_28_9_fxs.toString());
		console.log("accounts[9] earnings after 5 weeks [IQ]: ", staking_fxs_earned_28_9_token1.toString());

		const reward_week_5_fxs = (staking_fxs_earned_28_1_fxs).plus(staking_fxs_earned_28_9_fxs);
		const reward_week_5_token1 = (staking_fxs_earned_28_1_token1).plus(staking_fxs_earned_28_9_token1);
		const effective_yearly_reward_at_week_5_fxs = reward_week_5_fxs.multipliedBy(52.1429 / 5.0);
		const effective_yearly_reward_at_week_5_token1 = reward_week_5_token1.multipliedBy(52.1429 / 4.0); // 1 week delay
		console.log("Effective weekly reward at week 5 [FXS]: ", reward_week_5_fxs.div(5).toString());
		console.log("Effective weekly reward at week 5 [IQ]: ", reward_week_5_token1.div(4).toString()); // 1 week delay
		console.log("Effective yearly reward at week 5 [FXS]: ", effective_yearly_reward_at_week_5_fxs.toString());
		console.log("Effective yearly reward at week 5 [IQ]: ", effective_yearly_reward_at_week_5_token1.toString());

		const duration_reward_3 = await stakingInstanceDualV3_FRAX_IQ.getRewardForDuration.call();
		const duration_reward_3_fxs = new BigNumber(duration_reward_3[0]).div(BIG18);
		const duration_reward_3_token1 = new BigNumber(duration_reward_3[1]).div(BIG18);
		console.log("Expected yearly reward [FXS]: ", duration_reward_3_fxs.multipliedBy(52.1429).toString());
		console.log("Expected yearly reward [IQ]: ", duration_reward_3_token1.multipliedBy(52.1429).toString());

		// Account 9 withdraws and claims its locked stake
		await stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_9_0[0].kek_id, { from: accounts[9] });
		await stakingInstanceDualV3_FRAX_IQ.getReward({ from: accounts[9] });
		await expectRevert.unspecified(stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const _total_liquidity_locked_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_1 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.totalCombinedWeight.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_1.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_1.toString());

		console.log("UNLOCKING ALL STAKES");
		await stakingInstanceDualV3_FRAX_IQ.unlockStakes({ from: STAKING_OWNER });
		await stakingInstanceDualV3_FRAX_IQ.withdrawLocked(locked_stake_structs_1_0[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, COLLATERAL_FRAX_AND_FXS_OWNER);
		await utilities.printCalcCurCombinedWeight(stakingInstanceDualV3_FRAX_IQ, accounts[9]);

		const user_min_vefxs_for_max_boost_1_3 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const user_min_vefxs_for_max_boost_9_3 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.minVeFXSForMaxBoost.call(accounts[9])).div(BIG18);
		console.log("user_min_vefxs_for_max_boost_1_3: ", user_min_vefxs_for_max_boost_1_3.toString());
		console.log("user_min_vefxs_for_max_boost_9_3: ", user_min_vefxs_for_max_boost_9_3.toString());

		const _total_liquidity_locked_2 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.totalLiquidityLocked.call()).div(BIG18);
		const _total_combined_weight_2 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.totalCombinedWeight.call()).div(BIG18);
		const frax_per_lp_token_2 = new BigNumber(await stakingInstanceDualV3_FRAX_IQ.fraxPerLPToken.call()).div(BIG18);
		console.log("_total_liquidity_locked GLOBAL: ", _total_liquidity_locked_2.toString());
		console.log("_total_combined_weight GLOBAL: ", _total_combined_weight_2.toString());
		console.log("frax_per_lp_token_2 GLOBAL: ", frax_per_lp_token_2.toString());

	});

	it("Blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await stakingInstanceDualV3_FRAX_IQ.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, new BigNumber("1e18"), { from: accounts[9] });
		
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.stakeLocked(new BigNumber("1e18"), 7 * 86400, { from: accounts[9] }),
			"Address has been greylisted"
		);
	});

	it("Ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await stakingInstanceDualV3_FRAX_IQ.greylistAddress(accounts[9], { from: STAKING_OWNER });
		// console.log("");
		// console.log("this should succeed");
		// await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await stakingInstanceDualV3_FRAX_IQ.stakeLocked(new BigNumber("1e18"), 1 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// // Wait 2 days
		// for (let j = 0; j < 2; j++){
		// 	await time.increase(86400);
		// 	await time.advanceBlock();
		// }

		// // Claim back the NFT and collect the rewards
		// await stakingInstanceDualV3_FRAX_IQ.withdrawLocked(TOKEN_ID_1_ALT_GOOD, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await stakingInstanceDualV3_FRAX_IQ.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
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
		await stakingInstanceDualV3_FRAX_IQ.unlockStakes({ from: STAKING_OWNER });

		// Stake normally again for next part
		// Need to approve first so the staking can use transfer
		const stake_amt_unlocked = new BigNumber("5e18");
		const stake_amt_locked = new BigNumber("5e18");

		// Allow the migrator function to migrate for you
		await stakingInstanceDualV3_FRAX_IQ.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Print the balance
		console.log("accounts[1] ERC20 balanceOf UniV2 FRAX/IQ LP:", (new BigNumber(await pair_instance_FRAX_IQ.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		
		// Stake Locked
		await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, stake_amt_locked, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstanceDualV3_FRAX_IQ.stakeLocked(stake_amt_locked, 7 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 6 months

		// Show the stake structs
		const locked_stake_structs = await stakingInstanceDualV3_FRAX_IQ.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs);

		// Turn on migrations
		await stakingInstanceDualV3_FRAX_IQ.toggleMigrations({ from: STAKING_OWNER });

		// Print balances before
		console.log("accounts[1] staked lockedLiquidityOf <BEFORE>:", (new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf <BEFORE>:", (new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());

		// Have the migrator withdraw locked tokens
		const withdraw_locked_amt = new BigNumber ("5e18");
		await stakingInstanceDualV3_FRAX_IQ.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS });		
		console.log(`Migrator (accounts[10]) withdrew ${withdraw_locked_amt.div(BIG18)} (E18) locked LP tokens from accounts[1]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_FRAX_IQ.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		// Proxy locked stake for someone else as the migrator
		const proxy_stake_lock_amt = new BigNumber ("5e18");
		await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, proxy_stake_lock_amt, { from: MIGRATOR_ADDRESS });
		await stakingInstanceDualV3_FRAX_IQ.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, proxy_stake_lock_amt, 28 * 86400, { from: MIGRATOR_ADDRESS });		
		console.log(`accounts[1] lock staked ${proxy_stake_lock_amt.div(BIG18)} (E18) LP tokens for account[8]`);
		console.log("Migrator (accounts[10]) ERC20 balanceOf:", (new BigNumber(await pair_instance_FRAX_IQ.balanceOf(MIGRATOR_ADDRESS))).div(BIG18).toNumber());
		console.log("accounts[1] staked lockedLiquidityOf:", (new BigNumber(await stakingInstanceDualV3_FRAX_IQ.lockedLiquidityOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[1] staked combinedWeightOf:", (new BigNumber(await stakingInstanceDualV3_FRAX_IQ.combinedWeightOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");


	});

	it("Fail Tests ", async () => {

		const test_amount_1 = new BigNumber ("1e18");
		const locked_stake_structs = await stakingInstanceDualV3_FRAX_IQ.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log(chalk.blue("=============TEST NOT IN MIGRATION [SHOULD FAIL]============="));

		// Turn off migrations
		await stakingInstanceDualV3_FRAX_IQ.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO migrator_withdraw_locked WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO migrator_stakeLocked_for WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, { from: MIGRATOR_ADDRESS }),
			"Contract is not in migration"
		);

		console.log("---------TRY TO ALLOW A WRONG MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.stakerAllowMigrator(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid migrator address"
		);

		console.log("---------TRY TO DO EMERGENCY WITHDRAWALS WHILE NOT IN MIGRATION---------");
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.recoverERC20(pair_instance_FRAX_IQ.address, test_amount_1, { from: STAKING_OWNER }),
			"Cannot withdraw staking tokens unless migration is on"
		);	

		console.log(chalk.blue("=============TEST TRYING TO MIGRATE NOT AS A MIGRATOR [SHOULD FAIL]============="));

		// Turn on migrations
		await stakingInstanceDualV3_FRAX_IQ.toggleMigrations({ from: STAKING_OWNER });

		console.log("---------TRY TO STAKE LOCKED NORMALLY DURING A MIGRATION---------");
		await pair_instance_FRAX_IQ.approve(stakingInstanceDualV3_FRAX_IQ.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.stakeLocked(test_amount_1, 28 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Staking is paused, or migration is happening"
		);		

		console.log("---------TRY TO migrator_withdraw_locked NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_stakeLocked_for NOT AS THE MIGRATOR---------");
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.migrator_stakeLocked_for(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, 28 * 86400, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_locked AS A NOW NON-APPROVED MIGRATOR ---------");
		// Staker disallows MIGRATOR_ADDRESS
		await stakingInstanceDualV3_FRAX_IQ.stakerDisallowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		
		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

		console.log("---------TRY TO migrator_withdraw_unlocked AS A NOW INVALID MIGRATOR ---------");
		// Staker re-allows MIGRATOR_ADDRESS
		await stakingInstanceDualV3_FRAX_IQ.stakerAllowMigrator(MIGRATOR_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// But governance disallows it
		await stakingInstanceDualV3_FRAX_IQ.removeMigrator(MIGRATOR_ADDRESS, { from: STAKING_OWNER });

		await expectRevert(
			stakingInstanceDualV3_FRAX_IQ.migrator_withdraw_locked(COLLATERAL_FRAX_AND_FXS_OWNER, locked_stake_structs[2].kek_id, { from: MIGRATOR_ADDRESS }),
			"msg.sender is either an invalid migrator or the staker has not approved them"
		);

	});
});