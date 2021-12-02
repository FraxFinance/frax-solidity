const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const Babylonian = artifacts.require("Math/Babylonian");
const FixedPoint = artifacts.require("Math/FixedPoint");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02_Modified = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");
const TestSwap = artifacts.require("Uniswap/TestSwap");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
// const FakeCollateral_yUSD = artifacts.require("FakeCollateral/FakeCollateral_yUSD");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");
// const Pool_yUSD = artifacts.require("Frax/Pools/Pool_yUSD");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
// const UniswapPairOracle_FRAX_yUSD = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_yUSD");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
// const UniswapPairOracle_FXS_yUSD = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_yUSD");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
//const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_USDT = artifacts.require("Staking/Variants/Stake_FRAX_USDT.sol");
// const StakingRewards_FRAX_yUSD = artifacts.require("Staking/Variants/Stake_FRAX_yUSD.sol");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH.sol");
const StakingRewards_FXS_USDC = artifacts.require("Staking/Variants/Stake_FXS_USDC.sol");
const StakingRewards_FXS_USDT = artifacts.require("Staking/Variants/Stake_FXS_USDT.sol");
// const StakingRewards_FXS_yUSD = artifacts.require("Staking/Variants/Stake_FXS_yUSD.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FRAX', async (accounts) => {
	// Constants
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	// let COLLATERAL_FRAX_AND_FXS_OWNER;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let col_instance_USDT;
	// let col_instance_yUSD;

	let TestSwap_instance;

	// Initialize the Uniswap Router instance
	let routerInstance; 

	// Initialize the Uniswap Factory instance
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
	let oracle_instance_FRAX_USDT;
	// let oracle_instance_FRAX_yUSD;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;
	let oracle_instance_FXS_USDT;
	// let oracle_instance_FXS_yUSD;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_USDT;
	// let pool_instance_yUSD;

	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FRAX_USDT;
	// let pair_addr_FRAX_yUSD;
	let pair_addr_FXS_WETH;
	let pair_addr_FXS_USDC;
	let pair_addr_FXS_USDT;
	// let pair_addr_FXS_yUSD;

	// Initialize pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FRAX_USDT;
	// let pair_instance_FRAX_yUSD;
	let pair_instance_FXS_WETH;
	let pair_instance_FXS_USDC;
	let pair_instance_FXS_USDT;
	// let pair_instance_FXS_yUSD;

	// Initialize pair orders
	let fraxfxs_first_FRAX_WETH;
	let fraxfxs_first_FRAX_USDC;
	let fraxfxs_first_FRAX_USDT;
	// let fraxfxs_first_FRAX_yUSD;
	let fraxfxs_first_FXS_WETH;
	let fraxfxs_first_FXS_USDC;
	let fraxfxs_first_FXS_USDT;
	// let fraxfxs_first_FXS_yUSD;

	// Initialize staking instances
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FRAX_USDT;
	// let stakingInstance_FRAX_yUSD;
	let stakingInstance_FXS_WETH;
	let stakingInstance_FXS_USDC;
	let stakingInstance_FXS_USDT;
	// let stakingInstance_FXS_yUSD;

	// Initialize running balances
	let bal_frax = 0;
	let bal_fxs = 0;
	let col_bal_usdc = 0;
	let col_rat = 1;
	let pool_bal_usdc = 0;
	let global_collateral_value = 0;

    beforeEach(async() => {
		// Constants
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADDRESS = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		// COLLATERAL_FRAX_AND_FXS_OWNER = accounts[8];

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();

		// Fill collateral instances
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
		col_instance_USDT = await ERC20.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 
		// col_instance_yUSD = await FakeCollateral_yUSD.deployed(); 

		TestSwap_instance = await TestSwap.deployed();

		// Fill the Uniswap Router Instance
		routerInstance = await UniswapV2Router02_Modified.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
		oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed(); 
		oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.deployed(); 
		// oracle_instance_FRAX_yUSD = await UniswapPairOracle_FRAX_yUSD.deployed(); 
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed(); 
		oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed(); 
		// oracle_instance_FXS_yUSD = await UniswapPairOracle_FXS_yUSD.deployed(); 
		oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();

		// Initialize ETH-USD Chainlink Oracle too
		//oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Fill pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_USDT = await Pool_USDT.deployed();
		// pool_instance_yUSD = await Pool_yUSD.deployed();

		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Get the addresses of the pairs
		pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(frax_instance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(frax_instance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FRAX_USDT = await uniswapFactoryInstance.getPair(frax_instance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// pair_addr_FRAX_yUSD = await uniswapFactoryInstance.getPair(frax_instance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxs_instance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FXS_USDC = await uniswapFactoryInstance.getPair(fxs_instance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FXS_USDT = await uniswapFactoryInstance.getPair(fxs_instance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// pair_addr_FXS_yUSD = await uniswapFactoryInstance.getPair(fxs_instance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_USDT.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_USDC.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Get instances of the pairs
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(pair_addr_FRAX_WETH);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(pair_addr_FRAX_USDC);
		pair_instance_FRAX_USDT = await UniswapV2Pair.at(pair_addr_FRAX_USDT);
		// pair_instance_FRAX_yUSD = await UniswapV2Pair.at(pair_addr_FRAX_yUSD);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);
		pair_instance_FXS_USDC = await UniswapV2Pair.at(pair_addr_FXS_USDC);
		pair_instance_FXS_USDT = await UniswapV2Pair.at(pair_addr_FXS_USDT);
		// pair_instance_FXS_yUSD = await UniswapV2Pair.at(pair_addr_FXS_yUSD); 
		pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
		pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

		// Get the pair order results
		fraxfxs_first_FRAX_WETH = await oracle_instance_FRAX_WETH.token0();
		fraxfxs_first_FRAX_USDC = await oracle_instance_FRAX_USDC.token0();
		fraxfxs_first_FRAX_USDT = await oracle_instance_FRAX_USDT.token0();
		// fraxfxs_first_FRAX_yUSD = await oracle_instance_FRAX_yUSD.token0();
		fraxfxs_first_FXS_WETH = await oracle_instance_FXS_WETH.token0();
		fraxfxs_first_FXS_USDC = await oracle_instance_FXS_USDC.token0();
		fraxfxs_first_FXS_USDT = await oracle_instance_FXS_USDT.token0();
		// fraxfxs_first_FXS_yUSD = await oracle_instance_FXS_yUSD.token0();

		fraxfxs_first_FRAX_WETH = frax_instance.address == fraxfxs_first_FRAX_WETH;
		fraxfxs_first_FRAX_USDC = frax_instance.address == fraxfxs_first_FRAX_USDC;
		fraxfxs_first_FRAX_USDT = frax_instance.address == fraxfxs_first_FRAX_USDT;
		// fraxfxs_first_FRAX_yUSD = frax_instance.address == fraxfxs_first_FRAX_yUSD;
		fraxfxs_first_FXS_WETH = fxs_instance.address == fraxfxs_first_FXS_WETH;
		fraxfxs_first_FXS_USDC = fxs_instance.address == fraxfxs_first_FXS_USDC;
		fraxfxs_first_FXS_USDT = fxs_instance.address == fraxfxs_first_FXS_USDT;
		// fraxfxs_first_FXS_yUSD = fxs_instance.address == fraxfxs_first_FXS_yUSD;

		// Fill the staking rewards instances
		stakingInstance_FRAX_USDT = await StakingRewards_FRAX_USDT.deployed();
		// stakingInstance_FRAX_yUSD = await StakingRewards_FRAX_yUSD.deployed();
		stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		stakingInstance_FXS_USDC = await StakingRewards_FXS_USDC.deployed();
		stakingInstance_FXS_USDT = await StakingRewards_FXS_USDT.deployed();
		// stakingInstance_FXS_yUSD = await StakingRewards_FXS_yUSD.deployed();
    });

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {
		// Advance 24 hrs so the period can be computed
		await time.increase(86400 + 1);
		await time.advanceBlock();

		// Make sure the prices are updated
		await oracle_instance_FRAX_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await oracle_instance_FRAX_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await oracle_instance_FRAX_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FRAX_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await oracle_instance_FXS_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await oracle_instance_FXS_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await oracle_instance_FXS_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await oracle_instance_USDT_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await oracle_instance_USDC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Get the prices
		// Price is in collateral needed for 1 FRAX
		let frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		let frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
		let frax_price_from_FRAX_USDT = (new BigNumber(await oracle_instance_FRAX_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
		// let frax_price_from_FRAX_yUSD = (new BigNumber(await oracle_instance_FRAX_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
		let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		let fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
		let fxs_price_from_FXS_USDT = (new BigNumber(await oracle_instance_FXS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
		// let fxs_price_from_FXS_yUSD = (new BigNumber(await oracle_instance_FXS_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
		let USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();
		let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();

		// Print the prices
		console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), " FRAX = 1 USDC");
		console.log("frax_price_from_FRAX_USDT: ", frax_price_from_FRAX_USDT.toString(), " FRAX = 1 USDT");
		// console.log("frax_price_from_FRAX_yUSD: ", frax_price_from_FRAX_yUSD.toString(), " FRAX = 1 yUSD");
		console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), " FXS = 1 WETH");
		console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), " FXS = 1 USDC");
		console.log("fxs_price_from_FXS_USDT: ", fxs_price_from_FXS_USDT.toString(), " FXS = 1 USDT");
		// console.log("fxs_price_from_FXS_yUSD: ", fxs_price_from_FXS_yUSD.toString(), " FXS = 1 yUSD");
		console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
		console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");

		// Add allowances to the Uniswap Router
		await wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await usdc_instance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_yUSD.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxs_instance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Add allowances to the swapToPrice contract
		await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await usdc_instance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_yUSD.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxs_instance.approve(swapToPriceInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// console.log("===============FIRST SWAPS===============");
		
		// //--- FRAX

		// // Handle FRAX / WETH
		// // Targeting 390.6 FRAX / 1 WETH
		// await swapToPriceInstance.swapToPrice(
		// 	frax_instance.address,
		// 	wethInstance.address,
		// 	new BigNumber(3906e5),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FRAX / USDC
		// // Targeting 1.003 FRAX / 1 USDC
		// await swapToPriceInstance.swapToPrice(
		// 	frax_instance.address,
		// 	usdc_instance.address,
		// 	new BigNumber(1003e3),
		// 	new BigNumber(997e3),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FRAX / USDT
		// // Targeting 0.995 FRAX / 1 USDT
		// await swapToPriceInstance.swapToPrice(
		// 	frax_instance.address,
		// 	col_instance_USDT.address,
		// 	new BigNumber(995e3),
		// 	new BigNumber(1005e3),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FRAX / yUSD
		// // Targeting 0.998 FRAX / 1 yUSD
		// // await swapToPriceInstance.swapToPrice(
		// // 	frax_instance.address,
		// // 	col_instance_yUSD.address,
		// // 	new BigNumber(998e3),
		// // 	new BigNumber(1002e3),
		// // 	new BigNumber(100e18),
		// // 	new BigNumber(100e18),
		// // 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// // 	new BigNumber(2105300114),
		// // 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// // )

		// //--- FXS

		// // Handle FXS / WETH
		// // Targeting 1955 FXS / 1 WETH
		// await swapToPriceInstance.swapToPrice(
		// 	fxs_instance.address,
		// 	wethInstance.address,
		// 	new BigNumber(1955e6),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FXS / USDC
		// // Targeting 5.2 FXS / 1 USDC
		// await swapToPriceInstance.swapToPrice(
		// 	fxs_instance.address,
		// 	usdc_instance.address,
		// 	new BigNumber(52e5),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )


		// // Handle FXS / USDT
		// // Targeting 5.1 FXS / 1 USDT
		// await swapToPriceInstance.swapToPrice(
		// 	fxs_instance.address,
		// 	col_instance_USDT.address,
		// 	new BigNumber(51e5),
		// 	new BigNumber(1e6),
		// 	new BigNumber(100e18),
		// 	new BigNumber(100e18),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )

		// // Handle FXS / yUSD
		// // Targeting 4.9 FXS / 1 yUSD
		// // await swapToPriceInstance.swapToPrice(
		// // 	fxs_instance.address,
		// // 	col_instance_yUSD.address,
		// // 	new BigNumber(49e5),
		// // 	new BigNumber(1e6),
		// // 	new BigNumber(100e18),
		// // 	new BigNumber(100e18),
		// // 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// // 	new BigNumber(2105300114),
		// // 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// // )

		// // Advance 24 hrs so the period can be computed
		// await time.increase(86400 + 1);
		// await time.advanceBlock();

		// // Make sure the prices are updated
		// await oracle_instance_FRAX_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FRAX_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FRAX_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// // await oracle_instance_FRAX_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_FXS_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// // await oracle_instance_FXS_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_USDT_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await oracle_instance_USDC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Advance 24 hrs so the period can be computed
		// await time.increase(86400 + 1);
		// await time.advanceBlock();

		// Get the prices
		frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
		frax_price_from_FRAX_USDT = (new BigNumber(await oracle_instance_FRAX_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
		// frax_price_from_FRAX_yUSD = (new BigNumber(await oracle_instance_FRAX_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
		fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
		fxs_price_from_FXS_USDT = (new BigNumber(await oracle_instance_FXS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
		// fxs_price_from_FXS_yUSD = (new BigNumber(await oracle_instance_FXS_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
		USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();
		USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(WETH.address, 1e6))).div(1e6).toNumber();

		console.log(chalk.blue("==================PRICES=================="));
		// Print the new prices
		console.log("ETH-USD price from Chainlink:", (new BigNumber((await frax_instance.frax_info.call())['7'])).div(1e6).toString() , "USD = 1 ETH");
		console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		console.log("FRAX-USD price from Chainlink, Uniswap:", (new BigNumber(await frax_instance.frax_price.call())).div(1e6).toString(), "FRAX = 1 USD");
		//console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), " FRAX = 1 USDC");
		//console.log("frax_price_from_FRAX_USDT: ", frax_price_from_FRAX_USDT.toString(), " FRAX = 1 USDT");
		//console.log("frax_price_from_FRAX_yUSD: ", frax_price_from_FRAX_yUSD.toString(), " FRAX = 1 yUSD");
		console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), " FXS = 1 WETH");
		//console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), " FXS = 1 USDC");
		//console.log("fxs_price_from_FXS_USDT: ", fxs_price_from_FXS_USDT.toString(), " FXS = 1 USDT");
		//console.log("fxs_price_from_FXS_yUSD: ", fxs_price_from_FXS_yUSD.toString(), " FXS = 1 yUSD");
		console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
		console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");
		console.log("USDT_price_from_pool: ", (new BigNumber (await pool_instance_USDT.getCollateralPrice.call())).div(1e6).toString(), " USDT = 1 USD");
		console.log("USDC_price_from_pool: ", (new BigNumber (await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), " USDC = 1 USD");


	});
/* IGNORE THIS
	it("Changes the price of USDT through swapping on the USDT-ETH Uniswap pair", async () => {
		console.log("=========================Uniswapv2Router.swapExactETHForTokens=========================");
		const amountIn = 1000;
		const amountOutMin = 1;
		await col_instance_USDT.approve.call(TestSwap.address, amountIn, {from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("approved TestSwap for", amountIn, "USDT");
		//const path = await TestSwap_instance.getPath.call();
		//console.log("test6");
		const result = await TestSwap_instance.swapUSDTforETH.call(amountIn, amountOutMin, {from: COLLATERAL_FRAX_AND_FXS_OWNER});
		console.log("swapped");
		console.log(result);
	});
*/
/* 0x01
	// GOVERNANCE TEST [PART 1]
	// ================================================================
	it('Propose changing the minting fee', async () => {
		console.log("======== Minting fee 0.03% -> 0.1% ========");

		// Temporarily set the voting period to 10 blocks
		await governanceInstance.__setVotingPeriod(10, { from: GOVERNOR_GUARDIAN_ADDRESS });

		// Determine the latest block
		const latestBlock = (new BigNumber(await time.latestBlock())).toNumber();
		console.log("Latest block: ", latestBlock);

		// Print the minting fee beforehand
		let minting_fee_before = (new BigNumber(await frax_instance.minting_fee.call())).div(BIG6).toNumber();
		console.log("minting_fee_before: ", minting_fee_before);

		// https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js
		await governanceInstance.propose(
			[frax_instance.address],
			[0],
			['setMintingFee(uint256)'],
			[web3.eth.abi.encodeParameters(['uint256'], [1000])], // 0.1%
			"Minting fee change",
			"I hereby propose to increase the minting fee from 0.03% to 0.1%",
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Advance one block so the voting can begin
		await time.increase(15);
		await time.advanceBlock();

		// Print the proposal count
		let proposal_id = await governanceInstance.latestProposalIds.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		// Print the proposal before
		let proposal_details = await governanceInstance.proposals.call(proposal_id);
		// console.log(util.inspect(proposal_details, false, null, true));
		console.log("id: ", proposal_details.id.toNumber());
		console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
		console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
		console.log("startBlock: ", proposal_details.startBlock.toString());
		console.log("endBlock: ", proposal_details.endBlock.toString());
		
		// Have at least 4% of FXS holders vote (so the quorum is reached)
		await governanceInstance.castVote(proposal_id, true, { from: POOL_CREATOR });
		await governanceInstance.castVote(proposal_id, true, { from: TIMELOCK_ADMIN });
		await governanceInstance.castVote(proposal_id, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await governanceInstance.castVote(proposal_id, true, { from: STAKING_OWNER });
		await governanceInstance.castVote(proposal_id, true, { from: STAKING_REWARDS_DISTRIBUTOR });

		// Print the proposal after votes
		proposal_details = await governanceInstance.proposals.call(proposal_id);
		// console.log(util.inspect(proposal_details, false, null, true));
		console.log("id: ", proposal_details.id.toString());
		console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
		console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
		console.log("startBlock: ", proposal_details.startBlock.toString());
		console.log("endBlock: ", proposal_details.endBlock.toString());

		// Print the proposal state
		let proposal_state_before = await governanceInstance.state.call(proposal_id);
		console.log("proposal_state_before: ", new BigNumber(proposal_state_before).toNumber());

		// Advance 10 blocks so the voting ends
		await time.increase(10 * 15); // ~15 sec per block
		await time.advanceBlockTo(latestBlock + 10 + 5);

		// Print the proposal state
		let proposal_state_after = await governanceInstance.state.call(proposal_id);
		console.log("proposal_state_after: ", new BigNumber(proposal_state_after).toNumber());

		// Give control from TIMELOCK_ADMIN to GovernerAlpha
		await timelockInstance.setPendingAdmin.call(governanceInstance.address, { from: timelockInstance.address });
		await timelockInstance.acceptAdmin.call({ from: governanceInstance.address });

		// Queue the execution
		await governanceInstance.queue.call(proposal_id, { from: TIMELOCK_ADMIN });

		// Advance two days to the timelock is done
		await time.increase((86400 * 2) + 1);
		await time.advanceBlock();

		// Execute the proposal
		await governanceInstance.execute.call(proposal_id, { from: TIMELOCK_ADMIN });

		// Print the minting fee afterwards
		let minting_fee_after = (new BigNumber(await frax_instance.minting_fee.call())).div(BIG6).toNumber();
		console.log("minting_fee_after: ", minting_fee_after);

		// Set the voting period back to 17280 blocks
		await governanceInstance.__setVotingPeriod.call(17280, { from: GOVERNOR_GUARDIAN_ADDRESS });

	});


	// GOVERNANCE TEST [PART 2]
	// ================================================================
	it('Change the minting fee back to 0.03%', async () => {
		console.log("======== Minting fee 0.1% -> 0.03% ========");
		// Temporarily set the voting period to 10 blocks
		await governanceInstance.__setVotingPeriod.call(10, { from: GOVERNOR_GUARDIAN_ADDRESS });

		// Determine the latest block
		const latestBlock = (new BigNumber(await time.latestBlock())).toNumber();
		console.log("Latest block: ", latestBlock);

		// Print the minting fee beforehand
		let minting_fee_before = (new BigNumber(await frax_instance.minting_fee.call())).div(BIG6).toNumber();
		console.log("minting_fee_before: ", minting_fee_before);

		// https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js
		await governanceInstance.propose.call(
			[frax_instance.address],
			[0],
			['setMintingFee(uint256)'],
			[web3.eth.abi.encodeParameters(['uint256'], [300])], // 0.03%
			"Minting fee revert back to old value",
			"I hereby propose to decrease the minting fee back to 0.03% from 0.1%",
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Advance one block so the voting can begin
		await time.increase(15);
		await time.advanceBlock();

		// Print the proposal count
		let proposal_id = await governanceInstance.latestProposalIds.call(COLLATERAL_FRAX_AND_FXS_OWNER);

		// Print the proposal before
		let proposal_details = await governanceInstance.proposals.call(proposal_id);
		// console.log(util.inspect(proposal_details, false, null, true));
		console.log("id: ", proposal_details.id.toNumber());
		console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
		console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
		console.log("startBlock: ", proposal_details.startBlock.toString());
		console.log("endBlock: ", proposal_details.endBlock.toString());
		
		// Have at least 4% of FXS holders vote (so the quorum is reached)
		await governanceInstance.castVote.call(proposal_id, true, { from: POOL_CREATOR });
		await governanceInstance.castVote.call(proposal_id, true, { from: TIMELOCK_ADMIN });
		await governanceInstance.castVote.call(proposal_id, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await governanceInstance.castVote.call(proposal_id, true, { from: STAKING_OWNER });
		await governanceInstance.castVote.call(proposal_id, true, { from: STAKING_REWARDS_DISTRIBUTOR });

		// Print the proposal after votes
		proposal_details = await governanceInstance.proposals.call(proposal_id);
		// console.log(util.inspect(proposal_details, false, null, true));
		console.log("id: ", proposal_details.id.toString());
		console.log("forVotes: ", new BigNumber(proposal_details.forVotes).div(BIG18).toNumber());
		console.log("againstVotes: ", new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber());
		console.log("startBlock: ", proposal_details.startBlock.toString());
		console.log("endBlock: ", proposal_details.endBlock.toString());

		// Print the proposal state
		let proposal_state_before = await governanceInstance.state.call(proposal_id);
		console.log("proposal_state_before: ", new BigNumber(proposal_state_before).toNumber());

		// Advance 10 blocks so the voting ends
		await time.increase(10 * 15); // ~15 sec per block
		await time.advanceBlockTo(latestBlock + 10 + 5);

		// Print the proposal state
		let proposal_state_after = await governanceInstance.state.call(proposal_id);
		console.log("proposal_state_after: ", new BigNumber(proposal_state_after).toNumber());

		// Queue the execution
		await governanceInstance.queue.call(proposal_id, { from: TIMELOCK_ADMIN });

		// Advance two days to the timelock is done
		await time.increase((86400 * 2) + 1);
		await time.advanceBlock();

		// Execute the proposal
		await governanceInstance.execute.call(proposal_id, { from: TIMELOCK_ADMIN });

		// Print the minting fee afterwards
		let minting_fee_after = (new BigNumber(await frax_instance.minting_fee.call())).div(BIG6).toNumber();
		console.log("minting_fee_after: ", minting_fee_after);

		// Set the voting period back to 17280 blocks
		await governanceInstance.__setVotingPeriod.call(17280, { from: GOVERNOR_GUARDIAN_ADDRESS });

	});
0x01 */

	// [DEPRECATED] SEEDED IN THE MIGRATION FLOW
	// it('Seed the collateral pools some collateral to start off with', async () => {
	// 	console.log("========================Collateral Seed========================");

	// 	// Link the FAKE collateral pool to the FRAX contract
	// 	await usdc_instance.transfer(pool_instance_USDC.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_USDT.transfer(pool_instance_USDT.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	// await col_instance_yUSD.transfer(pool_instance_yUSD.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// 	// Refresh the collateral ratio
	// 	const totalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18);
	// 	console.log("totalCollateralValue: ", totalCollateralValue.toNumber());

	// 	/*
	// 	// Advance 1 hr so the collateral ratio can be recalculated
	// 	await time.increase(3600 + 1);
	// 	await time.advanceBlock();
	// 	await frax_instance.refreshCollateralRatio();

	// 	// Advance 1 hr so the collateral ratio can be recalculated
	// 	await time.increase(3600 + 1);
	// 	await time.advanceBlock();
	// 	await frax_instance.refreshCollateralRatio();
	// 	*/

	// 	const collateral_ratio_refreshed = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
	// 	console.log("collateral_ratio_refreshed: ", collateral_ratio_refreshed.toNumber());
	// 	col_rat = collateral_ratio_refreshed;
	// });
/*
	it('Mint some FRAX using USDC as collateral (collateral ratio = 1) [mint1t1FRAX]', async () => {
		console.log("=========================mint1t1FRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the collateral and FRAX amounts before minting
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);

		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const collateral_amount = new BigNumber("100e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// Mint some FRAX
		console.log("accounts[0] mint1t1FRAX() with 100 USDC; slippage limit of 1%");
		const collateral_price = (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber()
		const FRAX_out_min = new BigNumber(collateral_amount.times(collateral_price).times(0.99)); // 1% slippage
		await pool_instance_USDC.mint1t1FRAX(collateral_amount, FRAX_out_min, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collateral and FRAX amounts after minting
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		// assert.equal(frax_after, 103.9584);
		// assert.equal(collateral_after, 8999900);
		// assert.equal(pool_collateral_after, 1000100);
		console.log("accounts[0] frax change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] collateral change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC collateral change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});

	it('SHOULD FAIL: Mint some FRAX using USDC as collateral, sets too high of an expectation for FRAX output [mint1t1FRAX]', async () => {
		console.log("=========================mint1t1FRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the collateral and FRAX amounts before minting
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);

		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const collateral_amount = new BigNumber("100e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// Mint some FRAX
		console.log("accounts[0] mint1t1FRAX() with 100 USDC; slippage limit of 1%");
		const collateral_price = (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber()
		const FRAX_out_min = new BigNumber(collateral_amount.times(collateral_price).times(1.01)); // Expects more FRAX than current price levels
		await pool_instance_USDC.mint1t1FRAX(collateral_amount, FRAX_out_min, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collateral and FRAX amounts after minting
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		// assert.equal(frax_after, 103.9584);
		// assert.equal(collateral_after, 8999900);
		// assert.equal(pool_collateral_after, 1000100);
		console.log("accounts[0] frax change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] collateral change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC collateral change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});

	it('Redeem some FRAX for USDC (collateral ratio >= 1) [redeem1t1FRAX]', async () => {
		console.log("=========================redeem1t1FRAX=========================");
		// Advance 1 hr so the collateral ratio can be recalculated
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Deposit some collateral to move the collateral ratio above 1
		await usdc_instance.transfer(pool_instance_USDC.address, THREE_THOUSAND_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.transfer(pool_instance_USDT.address, THREE_THOUSAND_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_yUSD.transfer(pool_instance_yUSD.address, THREE_THOUSAND_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the collateral and FRAX amounts before redeeming
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());
		console.log("FRAX price (USD): " , new BigNumber(await frax_instance.frax_price.call()).div(BIG6).toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("100e18");
		await frax_instance.approve(pool_instance_USDC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_USDC.redeem1t1FRAX(frax_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // Get at least 10 USDC out, roughly 90% slippage limit (testing purposes)
		console.log("accounts[0] redeem1t1() with 100 FRAX");
		// Collect redemption
		await time.advanceBlock();
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collateral and FRAX amounts after redeeming
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] FRAX change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] USDC change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});


*/
	// REDUCE COLLATERAL RATIO
	it("Reduces the collateral ratio: 1-to-1 Phase => Fractional Phase", async () => {
		console.log("=========================Reducing the collateral ratio=========================")
		// const tokensToMint = new BigNumber(1000000e18);
		// await frax_instance.mint(tokensToMint, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		// console.log("totalSupplyFRAX: ", totalSupplyFRAX);


		// Add allowances to the swapToPrice contract
		await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the current FRAX price
		frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		console.log("frax_price_from_FRAX_WETH (before): ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		
		// Swap the FRAX price upwards
		// Targeting 350 FRAX / 1 WETH
		await swapToPriceInstance.swapToPrice(
			frax_instance.address,
			wethInstance.address,
			new BigNumber(350e6),
			new BigNumber(1e6),
			new BigNumber(100e18),
			new BigNumber(100e18),
			COLLATERAL_FRAX_AND_FXS_OWNER,
			new BigNumber(2105300114),
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		)

		// Advance 24 hrs so the period can be computed
		await time.increase(86400 + 1);
		await time.advanceBlock();

		// Make sure the price is updated
		await oracle_instance_FRAX_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the new FRAX price
		frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		console.log("frax_price_from_FRAX_WETH (after): ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		
		for(let i = 0; i < 13; i++){ // Drop the collateral ratio by 13 * 0.25%
			await time.increase(3600 + 1);
			await time.advanceBlock();
			await frax_instance.refreshCollateralRatio();
			console.log("global_collateral_ratio:", (new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6)).toNumber());
		}

	});
/*

	// MINTING PART 2
	// ================================================================

	it('Mint some FRAX using FXS and USDC (collateral ratio between .000001 and .999999) [mintFractionalFRAX]', async () => {
		console.log("=========================mintFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_fxs: ", bal_fxs.toNumber());
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("500e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const collateral_amount = new BigNumber("100e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await pool_instance_USDC.mintFractionalFRAX(collateral_amount, fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] mintFractionalFRAX() with 100 USDC and 500 FXS");

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});



	it('SHOULD FAIL: Mint some FRAX using FXS and USDC, but doesn\'t send in enough FXS [mintFractionalFRAX]', async () => {
		console.log("=========================mintFractionalFRAX=========================");

		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_fxs: ", bal_fxs.toNumber());
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("5e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const collateral_amount = new BigNumber("100e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await pool_instance_USDC.mintFractionalFRAX(collateral_amount, fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] mintFractionalFRAX() with 100 USDC and 5 FXS");

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});
*/

	it('redeemFractionalFRAX() - Testing slippage, FXS amountOut passing && USDC amountOut passing', async () => {
		console.log("=========================redeemFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] USDC balance", col_bal_usdc.toNumber());
		console.log("FRAX_pool_USDC balance:", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("135242531948024e6");
		await frax_instance.approve(pool_instance_USDC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_out = new BigNumber("21e18");
		const usdc_out = new BigNumber("131e18");

		// Redeem some FRAX
		await pool_instance_USDC.redeemFractionalFRAX(frax_amount, fxs_out, usdc_out, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemFractionalFRAX() with 135.24253 FRAX");
		// Collect redemption
		await time.advanceBlock();
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});

	it('redeemFractionalFRAX() - Testing slippage, FXS amountOut failing && USDC amountOut passing', async () => {
		console.log("=========================redeemFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] USDC balance", col_bal_usdc.toNumber());
		console.log("FRAX_pool_USDC balance:", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("135242531948024e6");
		await frax_instance.approve(pool_instance_USDC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_out = new BigNumber("22e18");
		const usdc_out = new BigNumber("131e18");

		// Redeem some FRAX
		await pool_instance_USDC.redeemFractionalFRAX(frax_amount, fxs_out, usdc_out, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemFractionalFRAX() with 135.24253 FRAX");
		// Collect redemption
		await time.advanceBlock();
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});


	it('redeemFractionalFRAX() - Testing slippage, FXS amountOut passing && USDC amountOut failing', async () => {
		console.log("=========================redeemFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] USDC balance", col_bal_usdc.toNumber());
		console.log("FRAX_pool_USDC balance:", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("135242531948024e6");
		await frax_instance.approve(pool_instance_USDC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_out = new BigNumber("21e18");
		const usdc_out = new BigNumber("132e18");

		// Redeem some FRAX
		await pool_instance_USDC.redeemFractionalFRAX(frax_amount, fxs_out, usdc_out, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemFractionalFRAX() with 135.24253 FRAX");
		// Collect redemption
		await time.advanceBlock();
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});


	it('redeemFractionalFRAX() - Testing slippage, FXS amountOut failing && USDC amountOut failing', async () => {
		console.log("=========================redeemFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] USDC balance", col_bal_usdc.toNumber());
		console.log("FRAX_pool_USDC balance:", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("135242531948024e6");
		await frax_instance.approve(pool_instance_USDC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_out = new BigNumber("22e18");
		const usdc_out = new BigNumber("132e18");

		// Redeem some FRAX
		await pool_instance_USDC.redeemFractionalFRAX(frax_amount, fxs_out, usdc_out, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemFractionalFRAX() with 135.24253 FRAX");
		// Collect redemption
		await time.advanceBlock();
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});

	it('mintFractionalFRAX, FRAX amountOut trivially passes', async () => {
		console.log("=========================mintFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_fxs: ", bal_fxs.toNumber());
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("50000e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const collateral_amount = new BigNumber("10000e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const FRAX_out_min = new BigNumber("10e18");

		console.log("accounts[0] mintFractionalFRAX() with 10,000 USDC and 50,000 FXS; FRAX_out_min: ", FRAX_out_min.div(BIG18).toNumber());
		await pool_instance_USDC.mintFractionalFRAX(collateral_amount, fxs_amount, FRAX_out_min, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});

	it('mintFractionalFRAX, FRAX amountOut passes', async () => {
		console.log("=========================mintFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_fxs: ", bal_fxs.toNumber());
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("50000e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const collateral_amount = new BigNumber("10000e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const FRAX_out_min = new BigNumber(collateral_amount.times(await pool_instance_USDC.getCollateralPrice()).div(globalCollateralRatio)).idiv(BIG6).idiv(BIG6).idiv(BIG6).plus(20);
		const FRAX_out_min_2 = new BigNumber("10306e18");

		console.log("accounts[0] mintFractionalFRAX() with 10,000 USDC and 50,000 FXS; FRAX_out_min_2: ", FRAX_out_min_2.toNumber());
		await pool_instance_USDC.mintFractionalFRAX(collateral_amount, fxs_amount, FRAX_out_min_2, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});


	it('mintFractionalFRAX, FRAX amountOut fails', async () => {
		console.log("=========================mintFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("bal_fxs: ", bal_fxs.toNumber());
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_usdc: ", col_bal_usdc.toNumber());
		console.log("pool_bal_usdc: ", pool_bal_usdc.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("50000e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const collateral_amount = new BigNumber("10000e18");
		await usdc_instance.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const FRAX_out_min = new BigNumber(collateral_amount.times(await pool_instance_USDC.getCollateralPrice()).div(globalCollateralRatio)).idiv(BIG6).idiv(BIG6).idiv(BIG6).plus(20);
		const FRAX_out_min_3 = new BigNumber("10307e18");

		console.log("accounts[0] mintFractionalFRAX() with 10,000 USDC and 50,000 FXS; FRAX_out_min_3: ", FRAX_out_min_3.toNumber());
		await pool_instance_USDC.mintFractionalFRAX(collateral_amount, fxs_amount, FRAX_out_min_3, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});
/*


	it('Recollateralizes the system using recollateralizeFRAX()', async () => {
		console.log("=========================recollateralizeFRAX=========================");
		let totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		let totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		let globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		let globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the new collateral ratio
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		
		console.log("effective collateral ratio before:", globalCollateralValue / totalSupplyFRAX);

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] USDC balance", col_bal_usdc.toNumber());
		console.log("FRAX_pool_USDC balance:", pool_bal_usdc.toNumber());

		console.log("pool_USDC getCollateralPrice() (divided by 1e6):", (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber());


		// Need to approve first so the pool contract can use transfer
		const USDC_amount = new BigNumber("10000e18");
		await usdc_instance.approve(pool_instance_USDC.address, USDC_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_USDC.recollateralizeFRAX(USDC_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] recollateralizeFRAX() with 10,000 USDC");

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] USDC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		
		console.log("effective collateral ratio after:", globalCollateralValue / totalSupplyFRAX);

	});


	// MINTING AND REDEMPTION [CR = 0]
	// ================================================================

	it('Mint some FRAX using FXS (collateral ratio = 0) [mintAlgorithmicFRAX]', async () => {
		console.log("=========================mintAlgorithmicFRAX=========================");
		for(let i = 0; i < 4*96; i++){ //drop by 96%
			await time.increase(3600 + 1);
			await time.advanceBlock();
			await frax_instance.refreshCollateralRatio();
			if (i % 20 == 0) { 
				console.log("global_collateral_ratio:", (new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6)).toNumber());
			}
		}
		
		// drop it 3 more times
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await frax_instance.refreshCollateralRatio();
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await frax_instance.refreshCollateralRatio();
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await frax_instance.refreshCollateralRatio();

		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
		// IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
		// IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
		//console.log(chalk.red("IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!"));

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS and FRAX amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		console.log("accounts[0] FXS balance before:", fxs_before.toNumber());
		console.log("accounts[0] FRAX balance before:", frax_before.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("10000e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Mint some FRAX
		await pool_instance_USDC.mintAlgorithmicFRAX(fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] mintAlgorithmicFRAX() using 10,000 FXS");

		// Note the FXS and FRAX amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] FXS balance after:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance after:", frax_after.toNumber() - frax_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});

	// MINTING AND REDEMPTION [Other CRs]
	// ================================================================

	it('Redeem some FRAX for FXS (collateral ratio = 0) [redeemAlgorithmicFRAX]', async () => {
		console.log("=========================redeemAlgorithmicFRAX=========================");
		// Advance 1 hr so the collateral ratio can be recalculated
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] FXS balance before:", fxs_before.toNumber());
		console.log("accounts[0] FRAX balance before:", frax_before.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("1000e18");
		await frax_instance.approve(pool_instance_USDC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_USDC.redeemAlgorithmicFRAX(frax_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemAlgorithmicFRAX() using 1,000 FRAX");

		// Collect redemption
		await time.advanceBlock();
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		//const fxs_unclaimed = new BigNumber(await pool_instance_USDC.getRedeemFXSBalance.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		//console.log("bal_fxs change: ", fxs_after.toNumber() - bal_fxs);
		//console.log("bal_fxs sitting inside Pool_USDC waiting to be claimed by COLLATERAL_FRAX_AND_FXS_OWNER: ", fxs_unclaimed);
		//console.log("bal_frax change: ", frax_after.toNumber() - bal_frax);
		console.log("accounts[0] FXS change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX change:", frax_after.toNumber() - frax_before.toNumber());
	});


	it("Buys back collateral using FXS", async () => {
		console.log("=========================buyBackFXS=========================");
		// Advance 1 hr so the collateral ratio can be recalculated
		totalSupplyFRAX = new BigNumber(await frax_instance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxs_instance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await frax_instance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await frax_instance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// This will push the collateral ratio below 1
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS and FAKE amounts before buying back
		const fxs_before = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_before = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const global_pool_collateral_before = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18);
		bal_fxs = fxs_before;
		col_bal_usdc = collateral_before;
		pool_bal_usdc = pool_collateral_before;
		global_collateral_value = global_pool_collateral_before;
		console.log("accounts[0] FXS balance: ", bal_fxs.toNumber());
		console.log("accounts[0] USDC balance: ", col_bal_usdc.toNumber());
		console.log("FRAX_pool_USDC balance: ", pool_bal_usdc.toNumber());
		console.log("global_collateral_value: ", global_collateral_value.toNumber());

		// Available to buyback
		const buyback_available = new BigNumber(await pool_instance_USDC.availableExcessCollatDV.call()).div(BIG18);
		// const buyback_available_in_fxs = new BigNumber(await pool_instance_USDC.availableExcessCollatDVInFXS.call()).div(BIG18);
		console.log("buyback_available: $", buyback_available.toNumber());
		// console.log("buyback_available_in_fxs: ", buyback_available_in_fxs.toNumber(), " FXS");

		// Need to approve first so the pool contract can use transfer
		const fxs_amount = new BigNumber("40000e18");
		await fxs_instance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// FXS price
		const fxs_price = new BigNumber(await frax_instance.fxs_price()).div(BIG6);
		console.log("fxs_price: $", fxs_price.toNumber());

		// Buy back some FRAX
		console.log("accounts[0] buyBackFXS() using 40,000 FXS");
		await pool_instance_USDC.buyBackFXS(fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// Note the FXS and FAKE amounts after buying back
		const fxs_after = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
		const global_pool_collateral_after = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18);
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());
		console.log("global_collateral_value change: ", global_pool_collateral_after.toNumber() - global_pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
		console.log("getCollateralPrice() from FRAX_pool_USDC: ", (new BigNumber(await pool_instance_USDC.getCollateralPrice.call()).div(BIG6)).toNumber());
	});


	// STAKING
	// ================================================================

	it('Make sure the StakingRewards (FRAX/USDC) are initialized', async () => {
		let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call()).toNumber();
		let rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call()).toNumber();
		assert.equal(rewards_contract_periodFinish - rewards_contract_lastUpdateTime, REWARDS_DURATION);
	});

	it('PART 1: Normal stakes', async () => {
		console.log("=========================Normal Stakes=========================");
		// Give some Uniswap Pool tokens to another user so they can stake too
		await pair_instance_FRAX_USDC.transfer(accounts[9], new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const cr_boost_multiplier = new BigNumber(await stakingInstance_FRAX_USDC.crBoostMultiplier()).div(BIG6);
		console.log("cr_boost_multiplier: ", cr_boost_multiplier.toNumber());

		// Need to approve first so the staking can use transfer
		let uni_pool_tokens_1 = new BigNumber("75e18");
		let uni_pool_tokens_9 = new BigNumber("25e18");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_tokens_9, { from: accounts[9] });
		
		// Note the FRAX amounts before
		const uni_pool_tokens_before_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const uni_pool_tokens_before_9 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(accounts[9])).div(BIG18);
		console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", uni_pool_tokens_before_1.toString());
		console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", uni_pool_tokens_before_9.toString());

		// Stake
		await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_9, { from: accounts[9] });
		await time.advanceBlock();

		// Note the Uniswap Pool Token and FXS amounts after staking
		const uni_pool_1st_stake_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const uni_pool_1st_stake_9 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(accounts[9])).div(BIG18);
		const fxs_1st_stake_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_1st_stake_9 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9])).div(BIG18);
		const rewards_balance_1st_stake_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewards.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_balance_1st_stake_9 = new BigNumber(await stakingInstance_FRAX_USDC.rewards.call(accounts[9])).div(BIG18);
		console.log("UNI POOL AFTER 1ST STAKE [1]: ", uni_pool_1st_stake_1.toString());
		console.log("UNI POOL AFTER 1ST STAKE [9]: ", uni_pool_1st_stake_9.toString());
		console.log("FXS AFTER 1ST STAKE [1]: ", fxs_1st_stake_1.toString());
		console.log("FXS AFTER 1ST STAKE [9]: ", fxs_1st_stake_9.toString());
		console.log("REWARDS BALANCE BEFORE [1]: ", rewards_balance_1st_stake_1.toString());
		console.log("REWARDS BALANCE BEFORE [9]: ", rewards_balance_1st_stake_9.toString());

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("BLOCK TIME AT STAKING: ", block_time_before);

		// Note the total lastUpdateTime
		let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call());
		console.log("REWARDS CONTRACT lastUpdateTime: ", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		let rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call());
		console.log("REWARDS CONTRACT periodFinish: ", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call());
		console.log("REWARDS CONTRACT lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

		console.log("====================================================================");
		// Advance 7 days so the reward can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await frax_instance.refreshCollateralRatio();

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("BLOCK TIME AFTER WAITING: ", block_time_after);

		// Make sure there is a valid period for the contract
		await stakingInstance_FRAX_USDC.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call());
		console.log("REWARDS CONTRACT lastUpdateTime: ", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call());
		console.log("REWARDS CONTRACT periodFinish: ", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call());
		console.log("REWARDS CONTRACT lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());
		
		// Note the total FRAX supply
		const rewards_contract_stored_uni_pool = new BigNumber(await stakingInstance_FRAX_USDC.totalSupply.call()).div(BIG18);
		console.log("REWARDS CONTRACT STORED UNI POOL: ", rewards_contract_stored_uni_pool.toString());

		// Note the reward per token
		let rewards_per_token = new BigNumber(await stakingInstance_FRAX_USDC.rewardPerToken.call()).div(BIG18);
		console.log("REWARDS PER TOKEN (SINCE DEPOSIT): ", rewards_per_token.toString());

		// Print the decimals
		const staking_token_decimal = new BigNumber(await stakingInstance_FRAX_USDC.stakingDecimals.call())
		console.log("STAKING TOKEN DECIMALS: ", staking_token_decimal.toString());

		// Show the reward
		const staking_fxs_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_contract_bal_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_earned_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		const staking_fxs_contract_bal_9 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(accounts[9])).div(BIG18);
		console.log("STAKING FXS EARNED [1]: ", staking_fxs_earned_1.toString());
		// console.log("STAKING FXS BALANCE IN CONTRACT [1]: ", staking_fxs_contract_bal_1.toString());
		console.log("STAKING FXS EARNED [9]: ", staking_fxs_earned_9.toString());
		// console.log("STAKING FXS BALANCE IN CONTRACT [9]: ", staking_fxs_contract_bal_9.toString());

		// await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the UNI POOL and FXS amounts after the reward
		const uni_pool_post_reward_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_post_reward_1 = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_balance_1_after = new BigNumber(await stakingInstance_FRAX_USDC.rewards.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("UNI POOL POST REWARD [1]: ", uni_pool_post_reward_1.toString());
		console.log("FXS POST REWARD [1]: ", fxs_post_reward_1.toString());
		console.log("REWARDS BALANCE AFTER [1]: ", rewards_balance_1_after.toString());

		console.log("====================================================================");
		console.log("USER 1 DOES AN EARLY UNI POOL WITHDRAWAL, SO STOPS ACCUMULATING REWARDS");
		await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();
		const uni_pool_balance_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_ew_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("UNI POOL BALANCE IN CONTRACT [1]: ", uni_pool_balance_1.toString());
		console.log("STAKING FXS EARNED [1]: ", staking_fxs_ew_earned_1.toString());

		console.log("CLAIMING THE REWARD [1]...");
		await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();

		const staking_fxs_ew_contract_bal_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("STAKING FXS BALANCE IN CONTRACT [1]: ", staking_fxs_ew_contract_bal_1.toString());
		console.log("WAIT A FEW DAYS FOR USER 9 TO EARN SOME MORE");
		console.log("====================================================================");

		// Advance a few days
		await time.increase((3 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await stakingInstance_FRAX_USDC.sync({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("BLOCK TIME: ", block_time_after);

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call());
		console.log("REWARDS CONTRACT lastUpdateTime: ", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call()).toNumber();
		console.log("REWARDS CONTRACT periodFinish: ", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()).toNumber();
		console.log("REWARDS CONTRACT lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

		rewards_per_token = new BigNumber(await stakingInstance_FRAX_USDC.rewardPerToken.call()).div(BIG18);
		console.log(`REWARDS PER TOKEN (SINCE DEPOSIT): `, rewards_per_token.toString());

		// Show the reward
		const staking_fxs_part2_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_part2_contract_bal_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_part2_earned_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		// const staking_fxs_part2_contract_bal_9 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(accounts[9])).div(BIG18);
		console.log("STAKING FXS EARNED [1]: ", staking_fxs_part2_earned_1.toString());
		console.log("STAKING FXS BALANCE IN CONTRACT [1]: ", staking_fxs_part2_contract_bal_1.toString());
		console.log("STAKING FXS EARNED [9]: ", staking_fxs_part2_earned_9.toString());
		// console.log("STAKING FXS BALANCE IN CONTRACT [9]: ", staking_fxs_part2_contract_bal_9.toString());

		const uni_pool_2nd_time_balance = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_2nd_time_balance = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_earned_2nd_time = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("UNI POOL 2nd_time BALANCE [1]: ", uni_pool_2nd_time_balance.toString());
		console.log("FXS 2nd_time BALANCE [1]: ", fxs_2nd_time_balance.toString());
		console.log("REWARDS earned 2nd_time [1]: ", rewards_earned_2nd_time.toString());

		await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_9, { from: accounts[9] });
		await stakingInstance_FRAX_USDC.getReward({ from: accounts[9] });
		await time.advanceBlock();
	});


	it('PART 2: Locked stakes', async () => {
		console.log("====================================================================");
		console.log("NOW TRY TESTS WITH LOCKED STAKES.");
		console.log("[1] AND [9] HAVE WITHDRAWN EVERYTHING AND ARE NOW AT 0");

		// Need to approve first so the staking can use transfer
		const uni_pool_normal_1 = new BigNumber("15e18");
		const uni_pool_normal_9 = new BigNumber("5e18");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_normal_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_normal_9, { from: accounts[9] });
		
		// Stake Normal
		await stakingInstance_FRAX_USDC.stake(uni_pool_normal_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await stakingInstance_FRAX_USDC.stake(uni_pool_normal_9, { from: accounts[9] });
		await time.advanceBlock();

		// Need to approve first so the staking can use transfer
		const uni_pool_locked_1 = new BigNumber("75e18");
		const uni_pool_locked_9 = new BigNumber("25e18");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_locked_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await frax_instance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		// Stake Locked
		await stakingInstance_FRAX_USDC.stakeLocked(uni_pool_locked_1, 30 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 1 month
		await stakingInstance_FRAX_USDC.stakeLocked(uni_pool_locked_9, 180 * 86400, { from: accounts[9] });
		await time.advanceBlock();

		// Show the stake structs
		const locked_stake_structs_1 = await stakingInstance_FRAX_USDC.lockedStakesOf.call(COLLATERAL_FRAX_AND_FXS_OWNER);
		const locked_stake_structs_9 = await stakingInstance_FRAX_USDC.lockedStakesOf.call(accounts[9]);
		console.log("LOCKED STAKES [1]: ", locked_stake_structs_1);
		console.log("LOCKED STAKES [9]: ", locked_stake_structs_9);

		// Note the UNI POOL and FXS amount after staking
		const regular_balance_1 = new BigNumber(await stakingInstance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const boosted_balance_1 = new BigNumber(await stakingInstance_FRAX_USDC.boostedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const unlocked_balance_1 = new BigNumber(await stakingInstance_FRAX_USDC.unlockedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const locked_balance_1 = new BigNumber(await stakingInstance_FRAX_USDC.lockedBalanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const regular_balance_9 = new BigNumber(await stakingInstance_FRAX_USDC.balanceOf.call(accounts[9])).div(BIG18);
		const boosted_balance_9 = new BigNumber(await stakingInstance_FRAX_USDC.boostedBalanceOf.call(accounts[9])).div(BIG18);
		const unlocked_balance_9 = new BigNumber(await stakingInstance_FRAX_USDC.unlockedBalanceOf.call(accounts[9])).div(BIG18);
		const locked_balance_9 = new BigNumber(await stakingInstance_FRAX_USDC.lockedBalanceOf.call(accounts[9])).div(BIG18);
		console.log("REGULAR BALANCE [1]: ", regular_balance_1.toString());
		console.log("BOOSTED BALANCE [1]: ", boosted_balance_1.toString());
		console.log("---- UNLOCKED [1]: ", unlocked_balance_1.toString());
		console.log("---- LOCKED [1]: ", locked_balance_1.toString());
		console.log("REGULAR BALANCE [9]: ", regular_balance_9.toString());
		console.log("BOOSTED BALANCE [9]: ", boosted_balance_9.toString());
		console.log("---- UNLOCKED [9]: ", unlocked_balance_9.toString());
		console.log("---- LOCKED [9]: ", locked_balance_9.toString());

		console.log("TRY AN EARLY WITHDRAWAL (SHOULD FAIL)");
		await expectRevert.unspecified(stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		await expectRevert.unspecified(stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));
		await time.advanceBlock();

		console.log("====================================================================");
		console.log("TRY WITHDRAWING AGAIN AFTER WAITING 30 DAYS");
		console.log("[1] SHOULD SUCCEED, [9] SHOULD FAIL");

		// Advance 30 days
		await time.increase(30 * 86400);
		await time.advanceBlock();

		await stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_1[0].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert.unspecified(stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] }));

		const staking_fxs_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_earned_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		console.log("STAKING FXS EARNED [1]: ", staking_fxs_earned_1.toString());
		console.log("STAKING FXS EARNED [9]: ", staking_fxs_earned_9.toString());

		console.log("====================================================================");
		console.log("ADVANCING 150 DAYS");
		
		// Advance 150 days
		await time.increase(150 * 86400);
		await time.advanceBlock();

		await stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_9[0].kek_id, { from: accounts[9] });

		const staking_fxs_earned_180_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		console.log("STAKING FXS EARNED [9]: ", staking_fxs_earned_180_9.toString());

	});
*/
});