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
const ERC20 = artifacts.require("ERC20/ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");
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
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_USDC");
// const UniswapPairOracle_FRAX_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_yUSD");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_USDC");
// const UniswapPairOracle_FXS_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_yUSD");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDT_WETH");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
//const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDT.sol");
// const StakingRewards_FRAX_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_yUSD.sol");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Fake_Stakes/Stake_FXS_WETH.sol");
const StakingRewards_FXS_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDC.sol");
const StakingRewards_FXS_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDT.sol");
// const StakingRewards_FXS_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_FXS_yUSD.sol");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

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
	let fraxInstance;
	let fxsInstance;

	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let col_instance_USDC;
	let col_instance_USDT;
	// let col_instance_yUSD;

	let TestSwap_instance;

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
	let oracle_instance_FRAX_USDT;
	// let oracle_instance_FRAX_yUSD;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;
	let oracle_instance_FXS_USDT;
	// let oracle_instance_FXS_yUSD;

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Initialize the governance contract
	let governanceInstance;

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
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();

		vestingInstance = await TokenVesting.deployed();

		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
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

		// Initialize the Uniswap Factory Instance
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Initialize the swap to price contract
		swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get the addresses of the pairs
		pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(fraxInstance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(fraxInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FRAX_USDT = await uniswapFactoryInstance.getPair(fraxInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// pair_addr_FRAX_yUSD = await uniswapFactoryInstance.getPair(fraxInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FXS_USDC = await uniswapFactoryInstance.getPair(fxsInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_addr_FXS_USDT = await uniswapFactoryInstance.getPair(fxsInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// pair_addr_FXS_yUSD = await uniswapFactoryInstance.getPair(fxsInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
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

		fraxfxs_first_FRAX_WETH = fraxInstance.address == fraxfxs_first_FRAX_WETH;
		fraxfxs_first_FRAX_USDC = fraxInstance.address == fraxfxs_first_FRAX_USDC;
		fraxfxs_first_FRAX_USDT = fraxInstance.address == fraxfxs_first_FRAX_USDT;
		// fraxfxs_first_FRAX_yUSD = fraxInstance.address == fraxfxs_first_FRAX_yUSD;
		fraxfxs_first_FXS_WETH = fxsInstance.address == fraxfxs_first_FXS_WETH;
		fraxfxs_first_FXS_USDC = fxsInstance.address == fraxfxs_first_FXS_USDC;
		fraxfxs_first_FXS_USDT = fxsInstance.address == fraxfxs_first_FXS_USDT;
		// fraxfxs_first_FXS_yUSD = fxsInstance.address == fraxfxs_first_FXS_yUSD;

		// Fill the staking rewards instances
		stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
		stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
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
		await col_instance_USDC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_yUSD.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Add allowances to the swapToPrice contract
		await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await col_instance_yUSD.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.approve(swapToPriceInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// console.log("===============FIRST SWAPS===============");
		
		// //--- FRAX

		// // Handle FRAX / WETH
		// // Targeting 390.6 FRAX / 1 WETH
		// await swapToPriceInstance.swapToPrice(
		// 	fraxInstance.address,
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
		// 	fraxInstance.address,
		// 	col_instance_USDC.address,
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
		// 	fraxInstance.address,
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
		// // 	fraxInstance.address,
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
		// 	fxsInstance.address,
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
		// 	fxsInstance.address,
		// 	col_instance_USDC.address,
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
		// 	fxsInstance.address,
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
		// // 	fxsInstance.address,
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
		console.log("ETH-USD price from Chainlink:", (new BigNumber((await fraxInstance.frax_info.call())['7'])).div(1e6).toString() , "USD = 1 ETH");
		console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		console.log("FRAX-USD price from Chainlink, Uniswap:", (new BigNumber(await fraxInstance.frax_price.call())).div(1e6).toString(), "FRAX = 1 USD");
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

	// TOKEN VESTING TEST
	
	it('Deposits FXS into the vesting contract, attempts to withdraw before the cliff, between cliff and end, and after end', async () => {
		await vestingInstance.setFXSAddress(fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await vestingInstance.setTimelockAddress(timelockInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(vestingInstance.address, new BigNumber("5400000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("current timestamp:", (await time.latest()).toNumber());
		console.log("TokenVesting contract info:");
		console.log("beneficiary:", await vestingInstance.beneficiary());
		console.log("cliff:", (await vestingInstance.cliff()).toNumber());
		console.log("start:", (await vestingInstance.start()).toNumber());
		console.log("duration:", (await vestingInstance.duration()).toNumber());
		console.log("revocable:", await vestingInstance.revocable());
		console.log("released:", (await vestingInstance.released()).toNumber());
		console.log("accounts[9] FXS balance:", (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());

		console.log("======================================");
		console.log("wait 121.25 days (1/3 of a year, ~four months)");
		await time.increase(86400 * 121.25);
		await time.advanceBlock();
		console.log("======================================");

		//console.log("current timestamp:", (await time.latest()).toNumber());
		//console.log("released:", (await vestingInstance.released()).toNumber());
		//console.log("attempt to withdraw from vesting instance", await vestingInstance.release({ from: accounts[9] }));
		//console.log("accounts[9] FXS balance:", (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());

		console.log("======================================");
		console.log("wait another 121.25 days");
		await time.increase(86400 * 121.25);
		await time.advanceBlock();
		console.log("======================================");

		console.log("current timestamp:", (await time.latest()).toNumber());
		console.log("released:", (new BigNumber(await vestingInstance.released())).div(BIG18).toNumber())
		console.log("attempt to withdraw from vesting instance");
		await vestingInstance.release({ from: accounts[9] });
		console.log("accounts[9] FXS balance:", (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());

		console.log("======================================");
		console.log("wait the last 121.25 days");
		await time.increase(86400 * 121.25);
		await time.advanceBlock();
		console.log("======================================");

		console.log("current timestamp:", (await time.latest()).toNumber());
		console.log("released:", (new BigNumber(await vestingInstance.released())).div(BIG18).toNumber())
		console.log("attempt to withdraw from vesting instance");
		await vestingInstance.release({ from: accounts[9] });
		console.log("accounts[9] FXS balance:", (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18).toNumber());
	});

});