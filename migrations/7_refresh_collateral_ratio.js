const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const constants = require(path.join(__dirname, '../src/types/constants'));

const BigNumber = require('bignumber.js');
require('@openzeppelin/test-helpers/configure')({
	provider: process.env.NETWORK_ENDPOINT,
});

const { expectEvent, send, shouldFail, time } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const MigrationHelper = artifacts.require("Utils/MigrationHelper");
const StringHelpers = artifacts.require("Utils/StringHelpers");
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
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");
const TestSwap = artifacts.require("Uniswap/TestSwap");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");

// Collateral Pools
const FraxPoolLibrary = artifacts.require("Frax/Pools/FraxPoolLibrary");
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH.sol");

const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";

// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {

	// ======== Set the addresses ========
	console.log(chalk.yellow('===== SET THE ADDRESSES ====='));
	const COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
	const ORACLE_ADDRESS = accounts[2];
	const POOL_CREATOR = accounts[3];
	const TIMELOCK_ADMIN = accounts[4];
	const GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
	const STAKING_OWNER = accounts[6];
	const STAKING_REWARDS_DISTRIBUTOR = accounts[7];
	// const COLLATERAL_FRAX_AND_FXS_OWNER = accounts[8];

	// ======== Set other constants ========
	console.log(chalk.yellow('===== SET OTHER CONSTANTS ====='));
	const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
	const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
	const TEN_MILLION_DEC18 = new BigNumber("10000000e18");
	const ONE_HUNDRED_MILLION_DEC18 = new BigNumber("100000000e18");
	const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
	const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
	
	const REDEMPTION_FEE = 400; // 0.04%
	const MINTING_FEE = 300; // 0.03%
	const COLLATERAL_PRICE = 1040000; // $1.04
	const FRAX_PRICE = 980000; // $0.98
	const FXS_PRICE = 210000; // $0.21
	const TIMELOCK_DELAY = 86400 * 2; // 2 days
	const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
	const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS;;

	console.log(`====================================================`);

	// Get the necessary instances
	let CONTRACT_ADDRESSES;
	let timelockInstance;
	let migrationHelperInstance;
	let fraxInstance;
	let fxsInstance;
	let governanceInstance;
	let wethInstance;
	let col_instance_USDC;
	let routerInstance;
	let uniswapFactoryInstance;
	let swapToPriceInstance;
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_USDT;
	let oracle_instance_FRAX_FXS;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC; 
	let oracle_instance_FXS_USDT; 
	let oracle_instance_USDC_WETH;
	let oracle_instance_USDT_WETH;
	let pool_instance_USDC;
	let pool_instance_USDT;

	if (process.env.MIGRATION_MODE == 'ganache'){
		timelockInstance = await Timelock.deployed();
		migrationHelperInstance = await MigrationHelper.deployed()
		governanceInstance = await GovernorAlpha.deployed();
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
		oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed(); 
		oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.deployed(); 
		oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.deployed(); 
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed(); 
		oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed(); 
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
		oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_USDT = await Pool_USDT.deployed();
	}
	else {
		CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
		timelockInstance = await Timelock.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.timelock);
		migrationHelperInstance = await MigrationHelper.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.migration_helper);
		fraxInstance = await FRAXStablecoin.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FRAX);
		fxsInstance = await FRAXShares.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FXS);
		governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].governance);
		wethInstance = await WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].weth);
		col_instance_USDC = await FakeCollateral_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDC); 
		col_instance_USDT = await FakeCollateral_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDT); 
		routerInstance = await UniswapV2Router02_Modified.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.router); 
		uniswapFactoryInstance = await UniswapV2Factory.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.factory); 
		swapToPriceInstance = await SwapToPrice.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pricing.swap_to_price); 
		oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_WETH);
		oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_USDC); 
		oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_USDT); 
		oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_FXS); 
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_WETH);
		oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_USDC); 
		oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_USDT); 
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.USDC_WETH);
		oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.USDT_WETH);
		pool_instance_USDC = await Pool_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pools.USDC);
		pool_instance_USDT = await Pool_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pools.USDT);
	
	}


	// CONTINUE MAIN DEPLOY CODE HERE
	// ====================================================================================================================
	// ====================================================================================================================
	
	await fraxInstance.refreshCollateralRatio();
	return false;

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
	
	// Note the collateral ratio
	const collateral_ratio_before = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
	console.log("collateral_ratio_before: ", collateral_ratio_before.toNumber());

	// Note the FXS, FRAX, and FAKE amounts before minting
	const fxs_before = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
	const frax_before = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
	const collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
	const pool_collateral_before = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
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
	await fxsInstance.approve(pool_instance_USDC.address, fxs_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const collateral_amount = new BigNumber("100e18");
	await col_instance_USDC.approve(pool_instance_USDC.address, collateral_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	await pool_instance_USDC.mintFractionalFRAX(collateral_amount, fxs_amount, new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	console.log("accounts[0] mintFractionalFRAX() with 100 USDC and 500 FXS");

	// Note the FXS, FRAX, and FAKE amounts after minting
	const fxs_after = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
	const frax_after = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
	const collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
	const pool_collateral_after = new BigNumber(await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)).div(BIG18);
	console.log("accounts[0] USDC balance change: ", collateral_after.toNumber() - collateral_before.toNumber());
	console.log("accounts[0] FXS balance change: ", fxs_after.toNumber() - fxs_before.toNumber());
	console.log("accounts[0] FRAX balance change: ", frax_after.toNumber() - frax_before.toNumber());
	console.log("FRAX_pool_USDC balance change: ", pool_collateral_after.toNumber() - pool_collateral_before.toNumber());

	// Note the new collateral ratio
	const collateral_ratio_after = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
	console.log("collateral_ratio_after: ", collateral_ratio_after.toNumber());






};
