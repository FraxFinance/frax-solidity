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
const UniswapPairOracle_6DEC_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_6DEC_WETH");

// Chainlink Price Consumer
//const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDC.sol");
//const StakingRewards_FRAX_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDT.sol");
// const StakingRewards_FRAX_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_yUSD.sol");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Fake_Stakes/Stake_FXS_WETH.sol");
//const StakingRewards_FXS_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDC.sol");
//const StakingRewards_FXS_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDT.sol");
// const StakingRewards_FXS_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_FXS_yUSD.sol");

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
	//let stakingInstance_FRAX_USDT;
	// let stakingInstance_FRAX_yUSD;
	let stakingInstance_FXS_WETH;
	//let stakingInstance_FXS_USDC;
	//let stakingInstance_FXS_USDT;
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
		col_instance_6DEC = await FakeCollateral_6DEC.deployed();
		// col_instance_yUSD = await FakeCollateral_yUSD.deployed(); 

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
		pair_addr_6DEC_WETH = await uniswapFactoryInstance.getPair(FakeCollateral_6DEC.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

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
		//stakingInstance_FRAX_USDT = await StakingRewards_FRAX_USDT.deployed();
		// stakingInstance_FRAX_yUSD = await StakingRewards_FRAX_yUSD.deployed();
		stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		//stakingInstance_FXS_USDC = await StakingRewards_FXS_USDC.deployed();
		//stakingInstance_FXS_USDT = await StakingRewards_FXS_USDT.deployed();
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
		await oracle_instance_6DEC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

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
		let DEC6_price_from_DEC6_WETH = (new BigNumber(await oracle_instance_6DEC_WETH.consult.call(WETH.address, (1e18).toString()))).div(1e6).toNumber();

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
		console.log("6DEC_price_from_6DEC_WETH: ", DEC6_price_from_DEC6_WETH.toString(), " 6DEC = 1 WETH");

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
		DEC6_price_from_DEC6_WETH = (new BigNumber(await oracle_instance_6DEC_WETH.consult.call(WETH.address, (1e18).toString()))).div(1e6).toNumber();

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
		console.log("6DEC_price_from_6DEC_WETH: ", DEC6_price_from_DEC6_WETH.toString(), " 6DEC = 1 WETH");
		console.log("USDT_price_from_pool: ", (new BigNumber (await pool_instance_USDT.getCollateralPrice.call())).div(1e6).toString(), " USDT = 1 USD");
		console.log("USDC_price_from_pool: ", (new BigNumber (await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), " USDC = 1 USD");
		console.log("6DEC_price_from_pool: ", (new BigNumber (await pool_instance_6DEC.getCollateralPrice.call())).div(1e6).toString(), " 6DEC = 1 USD");


	});

	// [DEPRECATED] SEEDED IN THE MIGRATION FLOW
	// it('Seed the collateral pools some collateral to start off with', async () => {
	// 	console.log("========================Collateral Seed========================");

	// 	// Link the FAKE collateral pool to the FRAX contract
	// 	await col_instance_USDC.transfer(pool_instance_USDC.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_USDT.transfer(pool_instance_USDT.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_6DEC.transfer(pool_instance_6DEC.address, COLLATERAL_SEED_DEC6, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	// await col_instance_yUSD.transfer(pool_instance_yUSD.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// 	// Refresh the collateral ratio
	// 	const totalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18);
	// 	console.log("totalCollateralValue: ", totalCollateralValue.toNumber());

		
	// 	// Advance 1 hr so the collateral ratio can be recalculated
	// 	//await time.increase(3600 + 1);
	// 	//await time.advanceBlock();
	// 	//await fraxInstance.refreshCollateralRatio();

	// 	// Advance 1 hr so the collateral ratio can be recalculated
	// 	//await time.increase(3600 + 1);
	// 	//await time.advanceBlock();
	// 	//await fraxInstance.refreshCollateralRatio();
		

	// 	const collateral_ratio_refreshed = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
	// 	console.log("collateral_ratio_refreshed: ", collateral_ratio_refreshed.toNumber());
	// 	col_rat = collateral_ratio_refreshed;
	// });


	it("Mints 6DEC 1-to-1", async () => {
		console.log("============6DEC mint1t1FRAX()============");
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the collateral and FRAX amounts before minting
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		const collateral_price = (new BigNumber(await pool_instance_6DEC.getCollateralPrice.call()).div(BIG6)).toNumber()

		bal_frax = frax_before;
		col_bal_6dec = collateral_before;
		pool_bal_6dec = pool_collateral_before;
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_6dec: ", col_bal_6dec.toNumber());
		console.log("pool_bal_6dec: ", pool_bal_6dec.toNumber());
		console.log("6DEC price:", collateral_price);

		// Need to approve first so the pool contract can use transferFrom
		const collateral_amount = new BigNumber("100e6");
		await col_instance_6DEC.approve(pool_instance_6DEC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// Mint some FRAX
		console.log("accounts[0] mint1t1FRAX() with 100 6DEC; slippage limit of 1%");
		const FRAX_out_min = new BigNumber(collateral_amount.times(collateral_price).times(0.99)); // 1% slippage
		await pool_instance_6DEC.mint1t1FRAX(collateral_amount, FRAX_out_min, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collateral and FRAX amounts after minting
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		// assert.equal(frax_after, 103.9584);
		// assert.equal(collateral_after, 8999900);
		// assert.equal(pool_collateral_after, 1000100);
		console.log("accounts[0] frax change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] collateral change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_6DEC collateral change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});


	it("Redeems 6DEC 1-to-1", async () => {
		console.log("============6DEC redeem1t1FRAX()============");
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the collateral and FRAX amounts before redeeming
		const collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		bal_frax = frax_before;
		col_bal_6dec = collateral_before;
		pool_bal_6dec = pool_collateral_before;
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_6dec: ", col_bal_6dec.toNumber());
		console.log("pool_bal_6dec: ", pool_bal_6dec.toNumber());
		console.log("FRAX price (USD): " , new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("100e18");
		await fraxInstance.approve(pool_instance_6DEC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_6DEC.redeem1t1FRAX(frax_amount, new BigNumber("10e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // Get at least 10 6DEC out, roughly 90% slippage limit (testing purposes)
		console.log("accounts[0] redeem1t1() with 100 FRAX");
		// Collect redemption; need to wait at least 3 blocks
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await pool_instance_6DEC.collectRedemption({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collateral and FRAX amounts after redeeming
		const collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const pool_collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		console.log("accounts[0] FRAX change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] 6DEC change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_6DEC change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});


	// REDUCE COLLATERAL RATIO
	it("Reduces the collateral ratio: 1-to-1 Phase => Fractional Phase", async () => {
		console.log("=========================Reducing the collateral ratio=========================")
		// const tokensToMint = new BigNumber(1000000e18);
		// await fraxInstance.mint(tokensToMint, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		// console.log("totalSupplyFRAX: ", totalSupplyFRAX);


		// Add allowances to the swapToPrice contract
		await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fraxInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Print the current FRAX price
		frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		console.log("frax_price_from_FRAX_WETH (before): ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
		
		// Swap the FRAX price upwards
		// Targeting 350 FRAX / 1 WETH
		await swapToPriceInstance.swapToPrice(
			fraxInstance.address,
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
			await fraxInstance.refreshCollateralRatio();
			console.log("global_collateral_ratio:", (new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6)).toNumber());
		}

	});


	// MINTING PART 2
	// ================================================================

	it('Mint some FRAX using FXS and 6DEC (collateral ratio between .000001 and .999999) [mintFractionalFRAX]', async () => {
		console.log("=========================mintFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		console.log("accounts[0] votes intial:", (await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)).toString());
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_6dec = collateral_before;
		pool_bal_6dec = pool_collateral_before;
		console.log("bal_fxs: ", bal_fxs.toNumber());
		console.log("bal_frax: ", bal_frax.toNumber());
		console.log("col_bal_6dec: ", col_bal_6dec.toNumber());
		console.log("pool_bal_6dec: ", pool_bal_6dec.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("500e18");
		await fxsInstance.approve(pool_instance_6DEC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const collateral_amount = new BigNumber("100e6");
		await col_instance_6DEC.approve(pool_instance_6DEC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await pool_instance_6DEC.mintFractionalFRAX(collateral_amount, fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] mintFractionalFRAX() with 100 6DEC and 500 FXS");

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		console.log("accounts[0] 6DEC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] votes final:", (await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)).toString());
		console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
		console.log("FRAX_pool_6DEC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
		//await expectRevert(fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)); //throw error on purpose (to check event log)

	});

	it('Redeem some FRAX for FXS and 6DEC (collateral ratio between .000001 and .999999) [redeemFractionalFRAX]', async () => {
		console.log("=========================redeemFractionalFRAX=========================");
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		console.log("accounts[0] votes intial:", (await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)).toString());

		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_6dec = collateral_before;
		pool_bal_6dec = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] 6DEC balance", col_bal_6dec.toNumber());
		console.log("FRAX_pool_6DEC balance:", pool_bal_6dec.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("135242531948024e6");
		await fraxInstance.approve(pool_instance_6DEC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_6DEC.redeemFractionalFRAX(frax_amount, new BigNumber("10e18"), new BigNumber("10e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemFractionalFRAX() with 135.24253 FRAX");
		// Collect redemption
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await pool_instance_6DEC.collectRedemption({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] votes final:", (await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)).toString());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] 6DEC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_6DEC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());

	});

	it('Recollateralizes the system using recollateralizeFRAX()', async () => {
		console.log("=========================recollateralizeFRAX=========================");
		let totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		let totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		let globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		let globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");

		// Note the new collateral ratio
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		
		console.log("effective collateral ratio before:", globalCollateralValue / totalSupplyFRAX);

		// Note the FXS, FRAX, and FAKE amounts before redeeming
		const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		col_bal_6dec = collateral_before;
		pool_bal_6dec = pool_collateral_before;
		console.log("accounts[0] FXS balance:", bal_frax.toNumber());
		console.log("accounts[0] FRAX balance:", bal_frax.toNumber());
		console.log("accounts[0] 6DEC balance", col_bal_6dec.toNumber());
		console.log("FRAX_pool_6DEC balance:", pool_bal_6dec.toNumber());

		console.log("pool_6DEC getCollateralPrice() (divided by 1e6):", (new BigNumber(await pool_instance_6DEC.getCollateralPrice.call()).div(BIG6)).toNumber());


		// Need to approve first so the pool contract can use transfer
		const DEC6_amount = new BigNumber("10000e6");
		await col_instance_6DEC.approve(pool_instance_6DEC.address, DEC6_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_6DEC.recollateralizeFRAX(DEC6_amount, new BigNumber("10e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] recollateralizeFRAX() with 10,000 6DEC");

		// Note the FXS, FRAX, and FAKE amounts after redeeming
		const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		console.log("accounts[0] FXS balance change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance change:", frax_after.toNumber() - frax_before.toNumber());
		console.log("accounts[0] 6DEC balance change:", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_6DEC balance change:", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

		// Note the new collateral ratio
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		
		console.log("effective collateral ratio after:", globalCollateralValue / totalSupplyFRAX);

	});


	// MINTING AND REDEMPTION [CR = 0]
	// ================================================================

	it('Mint some FRAX using FXS (collateral ratio = 0) [mintAlgorithmicFRAX]', async () => {
		console.log("=========================mintAlgorithmicFRAX=========================");
		for(let i = 0; i < 4*96; i++){ //drop by 96%
			await time.increase(3600 + 1);
			await time.advanceBlock();
			await fraxInstance.refreshCollateralRatio();
			if (i % 20 == 0) { 
				console.log("global_collateral_ratio:", (new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6)).toNumber());
			}
		}
		
		// drop it 3 more times
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await fraxInstance.refreshCollateralRatio();
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await fraxInstance.refreshCollateralRatio();
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await fraxInstance.refreshCollateralRatio();

		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
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
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS and FRAX amounts before minting
		const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		bal_fxs = fxs_before;
		bal_frax = frax_before;
		console.log("accounts[0] FXS balance before:", fxs_before.toNumber());
		console.log("accounts[0] FRAX balance before:", frax_before.toNumber());

		// Need to approve first so the pool contract can use transferFrom
		const fxs_amount = new BigNumber("10000e18");
		await fxsInstance.approve(pool_instance_6DEC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Mint some FRAX
		await pool_instance_6DEC.mintAlgorithmicFRAX(fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] mintAlgorithmicFRAX() using 10,000 FXS");

		// Note the FXS and FRAX amounts after minting
		const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] FXS balance after:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX balance after:", frax_after.toNumber() - frax_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
	});

	// MINTING AND REDEMPTION [Other CRs]
	// ================================================================

	it('Redeem some FRAX for FXS (collateral ratio = 0) [redeemAlgorithmicFRAX]', async () => {
		console.log("=========================redeemAlgorithmicFRAX=========================");
		// Advance 1 hr so the collateral ratio can be recalculated
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS, FRAX, and FAKE amounts before minting
		const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] FXS balance before:", fxs_before.toNumber());
		console.log("accounts[0] FRAX balance before:", frax_before.toNumber());

		// Need to approve first so the pool contract can use transfer
		const frax_amount = new BigNumber("1000e18");
		await fraxInstance.approve(pool_instance_6DEC.address, frax_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem some FRAX
		await pool_instance_6DEC.redeemAlgorithmicFRAX(frax_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] redeemAlgorithmicFRAX() using 1,000 FRAX");

		// Collect redemption
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await pool_instance_6DEC.collectRedemption({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FXS, FRAX, and FAKE amounts after minting
		const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);

		console.log("accounts[0] FXS change:", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] FRAX change:", frax_after.toNumber() - frax_before.toNumber());
	});


	it("Buys back collateral using FXS [should fail if CR = 0]", async () => {
		console.log("=========================buyBackFXS=========================");
		// Advance 1 hr so the collateral ratio can be recalculated
		totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
		totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call()).div(BIG18).toNumber();
		globalCollateralRatio = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6).toNumber();
		globalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("FRAX price (USD): ", (new BigNumber(await fraxInstance.frax_price.call()).div(BIG6)).toNumber());
		console.log("FXS price (USD): ", (new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6)).toNumber());
		console.log("totalSupplyFRAX: ", totalSupplyFRAX);
		console.log("totalSupplyFXS: ", totalSupplyFXS);
		console.log("globalCollateralRatio: ", globalCollateralRatio);
		console.log("globalCollateralValue: ", globalCollateralValue);
		console.log("");
		
		// This will push the collateral ratio below 1
		// Note the collateral ratio
		const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

		// Note the FXS and FAKE amounts before buying back
		const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_before = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		const global_pool_collateral_before = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18);
		bal_fxs = fxs_before;
		col_bal_6dec = collateral_before;
		pool_bal_6dec = pool_collateral_before;
		global_collateral_value = global_pool_collateral_before;
		console.log("accounts[0] FXS balance: ", bal_fxs.toNumber());
		console.log("accounts[0] 6DEC balance: ", col_bal_6dec.toNumber());
		console.log("FRAX_pool_6DEC balance: ", pool_bal_6dec.toNumber());
		console.log("global_collateral_value: ", global_collateral_value.toNumber());

		// Available to buyback
		const buyback_available = new BigNumber(await pool_instance_6DEC.availableExcessCollatDV.call()).div(BIG18);
		console.log("buyback_available: $", buyback_available.toNumber());

		// Need to approve first so the pool contract can use transfer
		const fxs_amount = new BigNumber("40000e18");
		await fxsInstance.approve(pool_instance_6DEC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// FXS price
		const fxs_price = new BigNumber(await fraxInstance.fxs_price()).div(BIG6);
		console.log("fxs_price: $", fxs_price.toNumber());

		// Buy back some FRAX
		console.log("accounts[0] buyBackFXS() using 40,000 FXS");
		await pool_instance_6DEC.buyBackFXS(fxs_amount, new BigNumber("10e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		

		// Note the FXS and FAKE amounts after buying back
		const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		const pool_collateral_after = new BigNumber(await col_instance_6DEC.balanceOf.call(pool_instance_6DEC.address)).div(BIG6);
		const global_pool_collateral_after = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18);
		console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
		console.log("accounts[0] 6DEC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
		console.log("FRAX_pool_6DEC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());
		console.log("global_collateral_value change: ", global_pool_collateral_after.toNumber() - global_pool_collateral_before.toNumber());

		// Note the new collateral ratio
		const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
		console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());
		console.log("getCollateralPrice() from FRAX_pool_6DEC: ", (new BigNumber(await pool_instance_6DEC.getCollateralPrice.call()).div(BIG6)).toNumber());
	});

/*
	// STAKING
	// ================================================================

	it('Make sure the StakingRewards (FRAX/USDC) are initialized', async () => {
		await stakingInstance_FRAX_USDC.renewIfApplicable();
		const pre_period_finish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish());
		const pre_block_timestamp = new BigNumber(await time.latest());

		console.log("periodFinish:", pre_period_finish.toNumber());
		console.log("block.timestamp:", pre_block_timestamp.toNumber());

		console.log("moving forward rest of period & renewing");
		await time.increase((pre_period_finish.minus(pre_block_timestamp)).toNumber());
		await time.advanceBlock();
		
		console.log("periodFinish:", new BigNumber(await stakingInstance_FRAX_USDC.periodFinish()).toNumber());
		console.log("lastUpdateTime:", new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime()).toNumber());
		console.log("block.timestamp:", new BigNumber(await time.latest()).toNumber());
		
		let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call()).toNumber();
		let rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call()).toNumber();
		assert.equal(rewards_contract_periodFinish - rewards_contract_lastUpdateTime, REWARDS_DURATION);
	});

	it('PART 1: Normal stakes', async () => {
		console.log("=========================Normal Stakes=========================");
		// Give some Uniswap Pool tokens to another user so they can stake too
		await pair_instance_FRAX_USDC.transfer(accounts[9], new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("give accounts[9] 250 FRAX-USDC Uniswap pool tokens");

		const cr_boost_multiplier = new BigNumber(await stakingInstance_FRAX_USDC.crBoostMultiplier()).div(BIG6);
		console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier.toNumber());

		const rewardPerToken = new BigNumber(await stakingInstance_FRAX_USDC.rewardPerToken()).div(BIG6);
		console.log("pool rewardPerToken (div 1e6): ", rewardPerToken.toNumber());
		console.log("");

		// Note the Uniswap Pool Token and FXS amounts after staking
		let uni_pool_tokens_1 = new BigNumber("75e18");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[0] approve FRAX_USDC staking pool for 75 LP tokens");
		const uni_pool_1st_stake_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_1st_stake_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_balance_1st_stake_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewards.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });		
		console.log("accounts[0] staking 75 LP tokens into FRAX_USDC staking pool");
		console.log("accounts[0] LP token balance:", uni_pool_1st_stake_1.toString());
		console.log("accounts[0] FXS balance:", fxs_1st_stake_1.toString());
		console.log("accounts[0] staking rewards():", rewards_balance_1st_stake_1.toString());
		console.log("accounts[0] balanceOf:", (new BigNumber(await stakingInstance_FRAX_USDC.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("accounts[0] boostedBalanceOf:", (new BigNumber(await stakingInstance_FRAX_USDC.boostedBalanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber());
		console.log("");

		let uni_pool_tokens_9 = new BigNumber("25e18");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] approve FRAX_USDC staking pool for 25 LP tokens");
		const uni_pool_1st_stake_9 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(accounts[9])).div(BIG18);
		const fxs_1st_stake_9 = new BigNumber(await fxsInstance.balanceOf.call(accounts[9])).div(BIG18);
		const rewards_balance_1st_stake_9 = new BigNumber(await stakingInstance_FRAX_USDC.rewards(accounts[9])).div(BIG18);

		await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] staking 25 LP tokens into FRAX_USDC staking pool");
		console.log("accounts[9] LP token balance:", uni_pool_1st_stake_9.toString());
		console.log("accounts[9] FXS balance:", fxs_1st_stake_9.toString());
		console.log("accounts[9] staking rewards():", rewards_balance_1st_stake_9.toString());
		console.log("accounts[9] balanceOf:", (new BigNumber(await stakingInstance_FRAX_USDC.balanceOf(accounts[9]))).div(BIG18).toNumber());
		console.log("accounts[9] boostedBalanceOf:", (new BigNumber(await stakingInstance_FRAX_USDC.boostedBalanceOf(accounts[9]))).div(BIG18).toNumber());
		console.log("");

		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		let rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());

		console.log("====================================================================");
		console.log("advance one week (one rewardsDuration period)");
		// Advance 7 days so the reward can be claimed
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();
		//await fraxInstance.refreshCollateralRatio();
		console.log("");

		const cr_boost_multiplier_2 = new BigNumber(await stakingInstance_FRAX_USDC.crBoostMultiplier()).div(BIG6);
		console.log("pool cr_boost_multiplier (div 1e6): ", cr_boost_multiplier_2.toNumber());

		const rewardPerToken_2 = new BigNumber(await stakingInstance_FRAX_USDC.rewardPerToken()).div(BIG18);
		console.log("pool rewardPerToken (div 1e18): ", rewardPerToken_2.toNumber());
		console.log("");

		// Note the last update time
		let block_time_after = (await time.latest()).toNumber();
		console.log("block time after waiting one week (in seconds):", block_time_after);

		// Make sure there is a valid period for the contract
		await stakingInstance_FRAX_USDC.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toString());
		
		// Note the total FRAX supply
		const rewards_contract_stored_uni_pool = new BigNumber(await stakingInstance_FRAX_USDC.totalSupply.call()).div(BIG18);
		console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toString());

		// Note the reward per token
		let rewards_per_token = new BigNumber(await stakingInstance_FRAX_USDC.rewardPerToken.call()).div(BIG18);
		console.log("pool rewardPerToken():", rewards_per_token.toString());

		// Print the decimals
		const staking_token_decimal = new BigNumber(await stakingInstance_FRAX_USDC.stakingDecimals.call())
		console.log("pool stakingDecimals():", staking_token_decimal.toString());

		console.log("");
		// Show the reward
		const staking_fxs_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_contract_bal_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_earned_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		const staking_fxs_contract_bal_9 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(accounts[9])).div(BIG18);
		console.log("accounts[0] staking earned():", staking_fxs_earned_1.toString());
		// console.log("STAKING FXS BALANCE IN CONTRACT [1]: ", staking_fxs_contract_bal_1.toString());
		console.log("accounts[9] staking earned():", staking_fxs_earned_9.toString());
		// console.log("STAKING FXS BALANCE IN CONTRACT [9]: ", staking_fxs_contract_bal_9.toString());

		// await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the UNI POOL and FXS amounts after the reward
		const uni_pool_post_reward_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_post_reward_1 = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_balance_1_after = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] LP token balance:", uni_pool_post_reward_1.toString());
		console.log("accounts[0] FXS balance:", fxs_post_reward_1.toString());
		console.log("accounts[0] staking rewardsFor():", rewards_balance_1_after.toString());

		console.log("====================================================================");
		//console.log("accounts[0] withdraws");
		console.log("");
		//await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();
		const uni_pool_balance_1 = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_ew_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] LP token balance:", uni_pool_balance_1.toString());
		console.log("accounts[0] staking earned():", staking_fxs_ew_earned_1.toString());
		console.log("");

		const staking_fxs_ew_contract_bal_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("staking pool rewardsFor(accounts[0]):", staking_fxs_ew_contract_bal_1.toString());

		console.log("accounts[0] claims getReward()");
		await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.advanceBlock();
		console.log("");

		const fxs_after_withdraw_0 = (new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18);
		console.log("accounts[0] FXS balance change:", (fxs_after_withdraw_0).minus(fxs_1st_stake_1).toNumber());
		console.log("====================================================================");

		console.log("wait two weeks so accounts[9] can earn more");
		// Advance a few days
		await time.increase(2 * (7 * 86400) + 1);
		await time.advanceBlock();

		// Make sure there is a valid period for the contract
		await stakingInstance_FRAX_USDC.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the last update time
		block_time_after = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_after);

		// Note the total lastUpdateTime
		rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_USDC.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toString());

		// Note the total periodFinish
		rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_USDC.periodFinish.call()).toNumber();
		console.log("pool periodFinish: ", rewards_contract_periodFinish.toString());

		// Note the total lastTimeRewardApplicable
		rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()).toNumber();
		console.log("pool lastTimeRewardApplicable: ", rewards_contract_lastTimeRewardApplicable.toString());

		rewards_per_token = new BigNumber(await stakingInstance_FRAX_USDC.rewardPerToken.call()).div(BIG18);
		console.log(`pool rewardPerToken():`, rewards_per_token.toString());

		// Show the reward
		const staking_fxs_part2_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_part2_contract_bal_1 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const staking_fxs_part2_earned_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		// const staking_fxs_part2_contract_bal_9 = new BigNumber(await stakingInstance_FRAX_USDC.rewardsFor.call(accounts[9])).div(BIG18);
		console.log("accounts[0] staking earned():", staking_fxs_part2_earned_1.toString());
		console.log("accounts[0] rewardsFor():", staking_fxs_part2_contract_bal_1.toString());

		const uni_pool_2nd_time_balance = new BigNumber(await pair_instance_FRAX_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_2nd_time_balance = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const rewards_earned_2nd_time = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("accounts[0] LP token balance:", uni_pool_2nd_time_balance.toString());
		console.log("accounts[0] FXS balance:", fxs_2nd_time_balance.toString());
		console.log("accounts[0] staking earned():", rewards_earned_2nd_time.toString());
		console.log("");

		console.log("accounts[9] staking earned():", staking_fxs_part2_earned_9.toString());
		console.log("accounts[9] withdrawing");
		await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_9, { from: accounts[9] });
		console.log("accounts[9] getReward()");
		await stakingInstance_FRAX_USDC.getReward({ from: accounts[9] });
		await time.advanceBlock();

		const acc_9_FXS_balance_after = (new BigNumber(await fxsInstance.balanceOf(accounts[9]))).div(BIG18);
		console.log("accounts[9] FXS balance change:", acc_9_FXS_balance_after.minus(fxs_1st_stake_9).toNumber());
	});

	it("blocks a greylisted address which tries to stake; SHOULD FAIL", async () => {
		console.log("greylistAddress(accounts[9])");
		await stakingInstance_FRAX_USDC.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should fail");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, new BigNumber("10e18"), { from: accounts[9] });
		await stakingInstance_FRAX_USDC.stake(new BigNumber("10e18"), { from: accounts[9] });
	});

	it("ungreylists a greylisted address which tries to stake; SHOULD SUCCEED", async () => {
		console.log("greylistAddress(accounts[9])");
		await stakingInstance_FRAX_USDC.greylistAddress(accounts[9], { from: STAKING_OWNER });
		console.log("");
		console.log("this should succeed");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, new BigNumber("10e18"), { from: accounts[9] });
		await stakingInstance_FRAX_USDC.stake(new BigNumber("10e18"), { from: accounts[9] });
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
		const uni_pool_locked_1_sum = new BigNumber ("100e18");
		const uni_pool_locked_9 = new BigNumber("25e18");
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_locked_1_sum, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_USDC.approve(stakingInstance_FRAX_USDC.address, uni_pool_locked_9, { from: accounts[9] });
		
		// // Note the FRAX amounts before
		// const frax_before_1_locked = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const frax_before_9_locked = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
		// console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		// Stake Locked
		await stakingInstance_FRAX_USDC.stakeLocked(uni_pool_locked_1, 30 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 15 days
		await stakingInstance_FRAX_USDC.stakeLocked(uni_pool_locked_9, 180 * 86400, { from: accounts[9] }); // 6 months

		await stakingInstance_FRAX_USDC.stakeLocked(new BigNumber ("25e18"), 270 * 86400, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); // 270 days
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
		await expectRevert.unspecified(stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		const staking_fxs_earned_180_9 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(accounts[9])).div(BIG18);
		console.log("STAKING FXS EARNED [9]: ", staking_fxs_earned_180_9.toString());

		console.log("UNLOCKING ALL STAKES");
		await stakingInstance_FRAX_USDC.unlockStakes({ from: STAKING_OWNER });
		await stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_structs_1[1].kek_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const post_staking_fxs_earned_1 = new BigNumber(await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log("POST-STAKING FXS EARNED [1]: ", post_staking_fxs_earned_1.toString());

		await fxsInstance.transfer(stakingInstance_FRAX_USDC.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("stakingInstance FXS balance:", new BigNumber(await fxsInstance.balanceOf(stakingInstance_FRAX_USDC.address)).div(BIG18).toNumber());
		await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] FXS balance:", new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
	});

	it("Does a fair launch", async () => {
		console.log("====================================================================");
		await fxsInstance.transfer(stakingInstance_FRAX_WETH.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_WETH.transfer(accounts[2], new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pair_instance_FRAX_WETH.transfer(accounts[3], new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("staking contract FXS balance:", (new BigNumber(await fxsInstance.balanceOf(stakingInstance_FRAX_WETH.address))).div(BIG18).toNumber());
		console.log("accounts[2] FRAX-WETH LP token balance:", (new BigNumber(await pair_instance_FRAX_WETH.balanceOf(accounts[2]))).div(BIG18).toNumber());
		console.log("accounts[3] FRAX-WETH LP token balance:", (new BigNumber(await pair_instance_FRAX_WETH.balanceOf(accounts[3]))).div(BIG18).toNumber());

		console.log("");

		let acc2_startingFXSbalance = new BigNumber(await (fxsInstance.balanceOf(accounts[2])));
		let acc3_startingFXSbalance = new BigNumber(await (fxsInstance.balanceOf(accounts[3])));

		console.log("accounts[2] FXS balance:", new BigNumber(await fxsInstance.balanceOf(accounts[2])).div(BIG18).toNumber());
		console.log("accounts[3] FXS balance:", new BigNumber(await fxsInstance.balanceOf(accounts[3])).div(BIG18).toNumber());

		await pair_instance_FRAX_WETH.approve(stakingInstance_FRAX_WETH.address, new BigNumber("100e18"), { from: accounts[2] });
		await pair_instance_FRAX_WETH.approve(stakingInstance_FRAX_WETH.address, new BigNumber("100e18"), { from: accounts[3] });

		console.log("staking");
		await stakingInstance_FRAX_WETH.stake(new BigNumber("100e18"), { from: accounts[3] });


		// Note the last update time
		const block_time_before = (await time.latest()).toNumber();
		console.log("current block time (in seconds):", block_time_before);

		// Note the total lastUpdateTime
		let rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_WETH.lastUpdateTime.call());
		console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toNumber());

		// Note the total periodFinish
		let rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_WETH.periodFinish.call());
		console.log("pool periodFinish:", rewards_contract_periodFinish.toNumber());

		// Note the total lastTimeRewardApplicable
		let rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_WETH.lastTimeRewardApplicable.call());
		console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toNumber());

		
		const staking_fxs_earned_2 = new BigNumber(await stakingInstance_FRAX_WETH.earned(accounts[2])).div(BIG18);
		const staking_fxs_earned_3 = new BigNumber(await stakingInstance_FRAX_WETH.earned(accounts[3])).div(BIG18);
		
		console.log("accounts[2] staking earned():", staking_fxs_earned_2.toNumber());
		console.log("accounts[3] staking earned():", staking_fxs_earned_3.toNumber());

		let cr_boost_multiplier_2;
		let rewardPerToken_2;
		let mid_block_time_before;
		let rewards_contract_stored_uni_pool;
		let rewards_per_token;
		let mid_staking_fxs_earned_2;
		let mid_staking_fxs_earned_3;

		for(let i = 0; i < 3; i++){
			console.log("====================================================================");
			console.log("advance one day [day number:",i,"]");

			if(i == 1){
				await stakingInstance_FRAX_WETH.stake(new BigNumber("100e18"), { from: accounts[2] });
			}

			await time.increase(86400);
			await time.advanceBlock();
			console.log("");

			cr_boost_multiplier_2 = new BigNumber(await stakingInstance_FRAX_WETH.crBoostMultiplier()).div(BIG6);
			console.log("cr_boost_multiplier:", cr_boost_multiplier_2.toNumber());

			rewardPerToken_2 = new BigNumber(await stakingInstance_FRAX_WETH.rewardPerToken()).div(BIG18);
			console.log("rewardPerToken:", rewardPerToken_2.toNumber());
			console.log("");

			// Make sure there is a valid period for the contract
			await stakingInstance_FRAX_WETH.renewIfApplicable({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

			// Note the last update time
			mid_block_time_before = (await time.latest()).toNumber();
			console.log("current block time (in seconds):", mid_block_time_before);

			// Note the total lastUpdateTime
			rewards_contract_lastUpdateTime = new BigNumber(await stakingInstance_FRAX_WETH.lastUpdateTime());
			console.log("pool lastUpdateTime:", rewards_contract_lastUpdateTime.toNumber());

			// Note the total periodFinish
			rewards_contract_periodFinish = new BigNumber(await stakingInstance_FRAX_WETH.periodFinish());
			console.log("pool periodFinish:", rewards_contract_periodFinish.toNumber());

			// Note the total lastTimeRewardApplicable
			rewards_contract_lastTimeRewardApplicable = new BigNumber(await stakingInstance_FRAX_WETH.lastTimeRewardApplicable());
			console.log("pool lastTimeRewardApplicable():", rewards_contract_lastTimeRewardApplicable.toNumber());
			
			// Note the total FRAX supply
			rewards_contract_stored_uni_pool = new BigNumber(await stakingInstance_FRAX_WETH.totalSupply()).div(BIG18);
			console.log("pool totalSupply() (of LP tokens):", rewards_contract_stored_uni_pool.toNumber());

			// Note the reward per token
			rewards_per_token = new BigNumber(await stakingInstance_FRAX_WETH.rewardPerToken()).div(BIG18);
			console.log("pool rewardPerToken():", rewards_per_token.toNumber());
			
			// Show the reward
			mid_staking_fxs_earned_2 = new BigNumber(await stakingInstance_FRAX_WETH.earned(accounts[2])).div(BIG18);
			mid_staking_fxs_earned_3 = new BigNumber(await stakingInstance_FRAX_WETH.earned(accounts[3])).div(BIG18);
			
			console.log("accounts[2] staking earned():", mid_staking_fxs_earned_2.toNumber());
			console.log("accounts[3] staking earned():", mid_staking_fxs_earned_3.toNumber());
		}

		console.log("accounts[2] getReward()");
		await stakingInstance_FRAX_WETH.getReward({ from: accounts[2] });
		console.log("accounts[3] getReward()");
		await stakingInstance_FRAX_WETH.getReward({ from: accounts[3] });
		console.log("");

		console.log("accounts[2] FXS balance change:", ((new BigNumber(await fxsInstance.balanceOf(accounts[2]))).minus(acc2_startingFXSbalance)).div(BIG18).toNumber());
		console.log("accounts[3] FXS balance change:", ((new BigNumber(await fxsInstance.balanceOf(accounts[3]))).minus(acc3_startingFXSbalance)).div(BIG18).toNumber());

		console.log("");

		// Show the reward
		mid_staking_fxs_earned_2 = new BigNumber(await stakingInstance_FRAX_WETH.earned(accounts[2])).div(BIG18);
		mid_staking_fxs_earned_3 = new BigNumber(await stakingInstance_FRAX_WETH.earned(accounts[3])).div(BIG18);
		
		console.log("accounts[2] staking earned():", mid_staking_fxs_earned_2.toNumber());
		console.log("accounts[3] staking earned():", mid_staking_fxs_earned_3.toNumber());

		console.log("staking contract FXS balance:", new BigNumber(await fxsInstance.balanceOf(stakingInstance_FRAX_WETH.address)).div(BIG18).toNumber());
		console.log("crBoostMultiplier():", new BigNumber(await stakingInstance_FRAX_WETH.crBoostMultiplier()).toNumber());
	});
	*/
});