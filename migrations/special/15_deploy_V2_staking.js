const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const constants = require(path.join(__dirname, '../../../dist/types/constants'));

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
const Math_Artifact = artifacts.require("Math/Math");
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

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");

// Collateral Pools
const FraxPoolLibrary = artifacts.require("Frax/Pools/FraxPoolLibrary");
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");
const Pool_USDC_V2 = artifacts.require("Frax/Pools/Pool_USDC_V2");
const Pool_USDT_V2 = artifacts.require("Frax/Pools/Pool_USDT_V2");

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
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC");
const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH");

// Staking contracts V2
const StakingRewards_FRAX_WETH_V2 = artifacts.require("Staking/Variants/Stake_FRAX_WETH_V2");
const StakingRewards_FRAX_USDC_V2 = artifacts.require("Staking/Variants/Stake_FRAX_USDC_V2");
const StakingRewards_FRAX_FXS_V2 = artifacts.require("Staking/Variants/Stake_FRAX_FXS_V2");
const StakingRewards_FXS_WETH_V2 = artifacts.require("Staking/Variants/Stake_FXS_WETH_V2");

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
	const TWENTY_FIVE_DEC6 = new BigNumber("25e6");
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

	// ================= Start Initializing =================

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
		routerInstance = await UniswapV2Router02.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.router); 
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

	return false;

	const pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(fraxInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(fraxInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
    const pair_addr_FRAX_FXS = await uniswapFactoryInstance.getPair(fraxInstance.address, fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
  	const pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// CONTINUE MAIN DEPLOY CODE HERE
	// ====================================================================================================================
	// ====================================================================================================================

	// Have to do these since Truffle gets messy when you want to link already-deployed libraries
	console.log(chalk.yellow('========== LINK STUFF =========='));
	console.log(chalk.blue("--- Linking Math ---"));
	await deployer.link(Math_Artifact, [StakingRewards_FRAX_WETH_V2, StakingRewards_FRAX_USDC_V2, StakingRewards_FRAX_FXS_V2, StakingRewards_FXS_WETH_V2]);
	
	console.log(chalk.blue("--- Linking TransferHelper ---"));
	await deployer.link(TransferHelper, [StakingRewards_FRAX_WETH_V2, StakingRewards_FRAX_USDC_V2, StakingRewards_FRAX_FXS_V2, StakingRewards_FXS_WETH_V2]);
	
	console.log(chalk.blue("--- Linking SafeERC20 ---"));
	await deployer.link(SafeERC20, [StakingRewards_FRAX_WETH_V2, StakingRewards_FRAX_USDC_V2, StakingRewards_FRAX_FXS_V2, StakingRewards_FXS_WETH_V2]);
	
	console.log(chalk.blue("--- Linking FRAXStablecoin ---"));
	await deployer.link(FRAXStablecoin, [StakingRewards_FRAX_WETH_V2, StakingRewards_FRAX_USDC_V2, StakingRewards_FXS_WETH_V2, StakingRewards_FRAX_FXS_V2]);
	
	console.log(chalk.blue("--- Linking StringHelpers ---"));
	await deployer.link(StringHelpers, [StakingRewards_FRAX_WETH_V2, StakingRewards_FRAX_USDC_V2, StakingRewards_FXS_WETH_V2, StakingRewards_FRAX_FXS_V2]);
	
	// ======== Deploy the staking contracts ========
	console.log(chalk.yellow('===== DEPLOY THE STAKING CONTRACTS ====='));
	await Promise.all([
		deployer.deploy(StakingRewards_FRAX_WETH_V2, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_WETH, FRAXStablecoin.address, timelockInstance.address, 500000),
		deployer.deploy(StakingRewards_FRAX_USDC_V2, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_USDC, FRAXStablecoin.address, timelockInstance.address, 500000),
		deployer.deploy(StakingRewards_FRAX_FXS_V2, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_FXS, FRAXStablecoin.address, timelockInstance.address, 0),
		deployer.deploy(StakingRewards_FXS_WETH_V2, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_WETH, FRAXStablecoin.address, timelockInstance.address, 0)
	])
	
	// ======== Get various staking addresses ======== 
	console.log(chalk.yellow('===== GET VARIOUS STAKING ADDRESSES ====='));
	const stakingInstance_FRAX_WETH_V2 = await StakingRewards_FRAX_WETH_V2.deployed();
	const stakingInstance_FRAX_USDC_V2 = await StakingRewards_FRAX_USDC_V2.deployed();
	const stakingInstance_FRAX_FXS_V2 = await StakingRewards_FRAX_FXS_V2.deployed();
	const stakingInstance_FXS_WETH_V2 = await StakingRewards_FXS_WETH_V2.deployed();
	
	// Transfer FXS to staking contracts
	console.log(chalk.yellow('===== Transfer FXS to staking contracts ====='));
	await Promise.all([
		fxsInstance.transfer(stakingInstance_FRAX_WETH_V2.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }), // eventually should be 6000000e18
		fxsInstance.transfer(stakingInstance_FRAX_USDC_V2.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }), // eventually should be 6000000e18
		fxsInstance.transfer(stakingInstance_FRAX_FXS_V2.address, new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }), // eventually should be 1000000e18
		fxsInstance.transfer(stakingInstance_FXS_WETH_V2.address, new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }) // eventually should be 1000000e18
	]);

	// THIS WILL BE DONE AT A LATER TIME
	// // ======== Initialize the staking rewards ========
	// console.log(chalk.yellow.bold('======== Initialize the staking rewards ========'));
	// await Promise.all([
	// 	stakingInstance_FRAX_WETH_V2.initializeDefault({ from: STAKING_OWNER }),
	// 	stakingInstance_FRAX_USDC_V2.initializeDefault({ from: STAKING_OWNER }),
	// ])

	// ============= Print the new staking contracts ========
	const NEW_STAKING_CONTRACTS = {
		staking_contracts: {
			'Uniswap FRAX/WETH': stakingInstance_FRAX_WETH_V2.address,
			'Uniswap FRAX/USDC': stakingInstance_FRAX_USDC_V2.address,
			'Uniswap FRAX/FXS': stakingInstance_FRAX_FXS_V2.address,
			'Uniswap FXS/WETH': stakingInstance_FXS_WETH_V2.address
		}
	}
	console.log("NEW STAKING CONTRACTS: ", NEW_STAKING_CONTRACTS);
};

