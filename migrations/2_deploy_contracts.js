const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

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

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_6DEC = artifacts.require("FakeCollateral/FakeCollateral_6DEC");

// Collateral Pools
const FraxPoolLibrary = artifacts.require("Frax/Pools/FraxPoolLibrary");
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");
const Pool_6DEC = artifacts.require("Frax/Pools/Pool_6DEC");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_6DEC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_6DEC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_FXS_6DEC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_6DEC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");
const UniswapPairOracle_6DEC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_6DEC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const TokenVesting = artifacts.require("FXS/TokenVesting");

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
	const DEPLOYER_ADDRESS = accounts[0];
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
	const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
	const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
	const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

	// Starting seed amounts
	const FRAX_SEED_AMOUNT_DEC18 = new BigNumber("10000e18");
	const FXS_SEED_AMOUNT_DEC18 = new BigNumber("10000e18");
	
	const REDEMPTION_FEE = 400; // 0.04%
	const MINTING_FEE = 300; // 0.03%
	const COLLATERAL_PRICE = 1040000; // $1.04
	const FRAX_PRICE = 980000; // $0.98
	const FXS_PRICE = 210000; // $0.21
	const TIMELOCK_DELAY = 2 * 86400; // 2 days
	const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
	const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS;;

	// Print the addresses
	console.log(`====================================================`);

	if (process.env.MIGRATION_MODE == 'ganache'){
		// ======== Give Metamask some ether ========
		console.log(chalk.yellow('===== GIVE METAMASK SOME ETHER ====='));
		send.ether(COLLATERAL_FRAX_AND_FXS_OWNER, METAMASK_ADDRESS, 2e18);
	}

// if (false) {

	// ======== Deploy most of the contracts ========
	console.log(chalk.yellow('===== DEPLOY MOST OF THE CONTRACTS ====='));
	await deployer.deploy(Address);
	await deployer.deploy(BlockMiner);
	await deployer.deploy(Babylonian);
	await deployer.deploy(UQ112x112);
	await deployer.deploy(StringHelpers);
	await deployer.link(UQ112x112, [UniswapV2Pair]);
	await deployer.link(Babylonian, [FixedPoint, SwapToPrice]);
	await deployer.deploy(FixedPoint);
	await deployer.link(FixedPoint, [UniswapV2OracleLibrary, UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_FXS, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_USDT, UniswapPairOracle_USDC_WETH, UniswapPairOracle_USDT_WETH, UniswapPairOracle_6DEC_WETH]);
	await deployer.link(Address, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_6DEC]);
	await deployer.deploy(Math);
	await deployer.link(Math, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, UniswapV2ERC20, UniswapV2Pair]);
	await deployer.deploy(SafeMath);
	await deployer.link(SafeMath, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_6DEC, FRAXStablecoin, Pool_USDC, Pool_USDT, Pool_6DEC, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, UniswapV2ERC20, UniswapV2Library, UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, Timelock]);
	await deployer.deploy(TransferHelper);
	await deployer.link(TransferHelper, [UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, Pool_USDC, Pool_USDT, Pool_6DEC]);
	await deployer.deploy(UniswapV2ERC20);
	await deployer.link(UniswapV2ERC20, [UniswapV2Pair]);
	await deployer.deploy(UniswapV2OracleLibrary);
	await deployer.link(UniswapV2OracleLibrary, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_FXS, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_USDT, UniswapPairOracle_USDC_WETH, UniswapPairOracle_USDT_WETH, UniswapPairOracle_6DEC_WETH]);
	await deployer.deploy(UniswapV2Library);
	await deployer.link(UniswapV2Library, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_USDC_WETH, UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, UniswapPairOracle_6DEC_WETH]);
	await deployer.deploy(UniswapV2Pair);
	await deployer.link(UniswapV2Pair, [UniswapV2Factory]);
	await deployer.deploy(UniswapV2Factory, DUMP_ADDRESS);
	await deployer.deploy(SafeERC20);
	await deployer.link(SafeERC20, [WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_6DEC, FRAXStablecoin, Pool_USDC, Pool_USDT, Pool_6DEC, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH]);
	await deployer.deploy(FraxPoolLibrary);
	await deployer.link(FraxPoolLibrary, [Pool_USDC, Pool_USDT, Pool_6DEC]);
	await deployer.deploy(Owned, COLLATERAL_FRAX_AND_FXS_OWNER);
	await deployer.deploy(ChainlinkETHUSDPriceConsumer);
	await deployer.deploy(ChainlinkETHUSDPriceConsumerTest);
	await deployer.deploy(Timelock, TIMELOCK_ADMIN, TIMELOCK_DELAY);
	await deployer.deploy(MigrationHelper, TIMELOCK_ADMIN);

	// Timelock and MigrationHelper
	const timelockInstance = await Timelock.deployed();
	const migrationHelperInstance = await MigrationHelper.deployed();

	// FRAX
	await deployer.deploy(FRAXStablecoin, "FRAX", COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fraxInstance = await FRAXStablecoin.deployed();

	// FXS
	await deployer.deploy(FRAXShares, "FXS", ORACLE_ADDRESS, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fxsInstance = await FRAXShares.deployed();

// 	const timelockInstance = await Timelock.at("0x776a2C6e7588AB1E97537E9c19d39C7F13b1C6eF");
// 	const migrationHelperInstance = await MigrationHelper.at("0xA756b43b1D23c5c8d539744AAcB0353d71749F34");
// 	const fraxInstance = await FRAXStablecoin.at("0xC70a6A861C55f0F8E1b416BEd0cD54b41fd1804A");
// 	const fxsInstance = await FRAXShares.at("0x982244F946BEB9FFE5585759E054Dd3947438A8B");

	// ======== Deploy the governance contract and its associated timelock ========
	console.log(chalk.yellow('===== DEPLOY THE GOVERNANCE CONTRACT ====='));
	await deployer.deploy(GovernorAlpha, timelockInstance.address, fxsInstance.address, GOVERNOR_GUARDIAN_ADDRESS);
	const governanceInstance = await GovernorAlpha.deployed();
	await governanceInstance.__setTimelockAddress(timelockInstance.address, { from: GOVERNOR_GUARDIAN_ADDRESS });

	// ======== Set the Governance contract as the timelock admin [Phase 1] ========
    console.log(chalk.yellow('===== SET THE GOVERNANCE CONTRACT AS THE TIMELOCK ADMIN [Phase 1] ====='));
	console.log("GOVERNANCE_ADDRESS [BEFORE]: ", governanceInstance.address );
	let timelock_admin_address = await timelockInstance.admin.call();
	console.log("timelock_admin [BEFORE]: ", timelock_admin_address)

	// // Give control from TIMELOCK_ADMIN to GovernorAlpha
	let current_timestamp = (await time.latest()).toNumber();
	let timelock_delay = (await timelockInstance.delay.call()).toNumber();
	let eta_with_delay = current_timestamp + timelock_delay + 300; // 5 minute buffer
	console.log("timelock_delay [BEFORE]: ", timelock_delay);
	console.log("current_timestamp [BEFORE]: ", current_timestamp);
	console.log("current_timestamp + timelock_delay [BEFORE]: ", eta_with_delay);
	await migrationHelperInstance.setGovToTimeLockETA(eta_with_delay, { from: TIMELOCK_ADMIN });

	const tx_nugget = [
		timelockInstance.address, 
		0, 
		"setPendingAdmin(address)",
		web3.eth.abi.encodeParameters(['address'], [governanceInstance.address]),
		eta_with_delay,
		{ from: TIMELOCK_ADMIN }
	]
    await timelockInstance.queueTransaction(...tx_nugget);
    
    console.log(chalk.red.bold('NEED TO DO THIS PART LATER [Execute timelock]'));

	// ======== Set FRAX FXS address ========
	console.log(chalk.yellow('===== FRAX FXS ADDRESS ====='));

	// Link the FXS contract to the FRAX contract
	await fraxInstance.setFXSAddress(fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	// ======== Create or link the collateral ERC20 contracts ========
	let wethInstance;
	let col_instance_USDC;
	let col_instance_USDT;
  	let col_instance_6DEC;

	if (process.env.MIGRATION_MODE != 'mainnet'){
		console.log(chalk.yellow('===== FAKE COLLATERAL ====='));

		await deployer.deploy(WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await deployer.deploy(FakeCollateral_USDC, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "USDC", 18);
		await deployer.deploy(FakeCollateral_USDT, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "USDT", 18);
	  	await deployer.deploy(FakeCollateral_6DEC, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC6, "6DEC", 6);
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
    	col_instance_6DEC = await FakeCollateral_6DEC.deployed();
	}
	else {
		console.log(chalk.yellow('===== REAL COLLATERAL ====='));
		wethInstance = await WETH.at("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
		col_instance_USDC = await FakeCollateral_USDC.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
		col_instance_USDT = await FakeCollateral_USDC.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 
    	col_instance_6DEC = await FakeCollateral_6DEC.at(""); 
	}

	// ======== Create or link the router and the SwapToPrice ========
	console.log(chalk.yellow('===== DEPLOY OR LINK THE ROUTER AND SWAP_TO_PRICE ====='));
	let routerInstance;
	let uniswapFactoryInstance;

	if (process.env.MIGRATION_MODE != 'mainnet'){
		await deployer.deploy(UniswapV2Router02_Modified, UniswapV2Factory.address, wethInstance.address);
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 

	}
	else {
		// Note UniswapV2Router02 vs UniswapV2Router02_Modified
		routerInstance = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"); 
		uniswapFactoryInstance = await UniswapV2Factory.at("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"); 
	}

	await deployer.deploy(SwapToPrice, uniswapFactoryInstance.address, routerInstance.address);
	const swapToPriceInstance = await SwapToPrice.deployed();

	// ======== Set the Uniswap pairs ========
	console.log(chalk.yellow('===== SET UNISWAP PAIRS ====='));
	await uniswapFactoryInstance.createPair(fraxInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, col_instance_6DEC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	await uniswapFactoryInstance.createPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, col_instance_6DEC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await uniswapFactoryInstance.createPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(col_instance_USDT.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
  	await uniswapFactoryInstance.createPair(col_instance_6DEC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Get the addresses of the pairs ========
	console.log(chalk.yellow('===== GET THE ADDRESSES OF THE PAIRS ====='));
	const pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(fraxInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(fraxInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDT = await uniswapFactoryInstance.getPair(fraxInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
    
    const pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_USDC = await uniswapFactoryInstance.getPair(fxsInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_USDT = await uniswapFactoryInstance.getPair(fxsInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	const pair_addr_FRAX_FXS = await uniswapFactoryInstance.getPair(fraxInstance.address, fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	const pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(col_instance_USDT.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
  	const pair_addr_6DEC_WETH = await uniswapFactoryInstance.getPair(col_instance_6DEC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


	// ======== Deploy the staking contracts ========
	console.log(chalk.yellow('===== DEPLOY THE STAKING CONTRACTS ====='));
	await deployer.link(FRAXStablecoin, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FXS_WETH, StakingRewards_FRAX_FXS]);
	await deployer.link(StringHelpers, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FXS_WETH, StakingRewards_FRAX_FXS]);
	await deployer.deploy(StakingRewards_FRAX_WETH, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_WETH, FRAXStablecoin.address, timelockInstance.address, 500000);
	await deployer.deploy(StakingRewards_FRAX_USDC, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_USDC, FRAXStablecoin.address, timelockInstance.address, 500000);
	//await deployer.deploy(StakingRewards_FRAX_USDT, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_USDT, FRAXStablecoin.address, timelockInstance.address);
	
	await deployer.deploy(StakingRewards_FXS_WETH, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_WETH, FRAXStablecoin.address, timelockInstance.address, 0);
	//await deployer.deploy(StakingRewards_FXS_USDC, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_USDC, FRAXStablecoin.address, timelockInstance.address);
	//await deployer.deploy(StakingRewards_FXS_USDT, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_USDT, FRAXStablecoin.address, timelockInstance.address);
	
	await deployer.deploy(StakingRewards_FRAX_FXS, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_FXS, FRAXStablecoin.address, timelockInstance.address, 0);

	// ======== Get various staking addresses ======== 
	console.log(chalk.yellow('===== GET VARIOUS STAKING ADDRESSES ====='));
	const stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
	const stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
	const stakingInstance_FRAX_FXS = await StakingRewards_FRAX_FXS.deployed();
	const stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();

	// ======== Get various pair instances ======== 
	console.log(chalk.yellow('===== GET VARIOUS PAIR INSTANCES ====='));
	const pair_instance_FRAX_WETH = await UniswapV2Pair.at(pair_addr_FRAX_WETH);
	const pair_instance_FRAX_USDC = await UniswapV2Pair.at(pair_addr_FRAX_USDC);
	const pair_instance_FRAX_FXS = await UniswapV2Pair.at(pair_addr_FRAX_FXS);
	const pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);

	const pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);
	const pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
	const pair_instance_6DEC_WETH = await UniswapV2Pair.at(pair_addr_6DEC_WETH);
	  
	// ======== Add allowances to the Uniswap Router ========
	console.log(chalk.yellow('===== ADD ALLOWANCES TO THE UNISWAP ROUTER ====='));
	await wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_USDC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_6DEC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await fraxInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Spread some FXS around ========
	console.log(chalk.yellow('===== SPREAD SOME FXS AROUND ====='));

	// Transfer 1,000,000 FXS each to various accounts
	if (process.env.MIGRATION_MODE != 'mainnet'){
		await fxsInstance.transfer(accounts[1], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[2], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[3], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[4], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[5], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[6], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[7], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[8], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxsInstance.transfer(accounts[9], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	}

	// Transfer FXS to staking contracts
	await fxsInstance.transfer(stakingInstance_FRAX_WETH.address, new BigNumber("6000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FRAX_USDC.address, new BigNumber("6000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FRAX_FXS.address, new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FXS_WETH.address, new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Add liquidity to the pairs so the oracle constructor doesn't error  ========
	// Initially, all prices will be 1:1, but that can be changed in further testing via arbitrage simulations to a known price
	console.log(chalk.yellow('===== ADDING LIQUIDITY TO THE PAIRS ====='));

	// const weth_balance_superowner = (new BigNumber(await wethInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
	// console.log("weth_balance_superowner: ", weth_balance_superowner);

	// Handle FRAX / WETH
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		wethInstance.address,
		new BigNumber(605e18), 
		new BigNumber(1e18), 
		new BigNumber(605e18), 
		new BigNumber(1e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / USDC
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		col_instance_USDC.address,
		new BigNumber(105e18), 
		new BigNumber(100e18), 
		new BigNumber(105e18), 
		new BigNumber(100e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / USDT
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		col_instance_USDT.address,
		new BigNumber(105e18), 
		new BigNumber(100e18), 
		new BigNumber(105e18), 
		new BigNumber(100e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / 6DEC
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		col_instance_6DEC.address,
		new BigNumber(105e6), 
		new BigNumber(100e6), 
		new BigNumber(105e6), 
		new BigNumber(100e6), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / FXS
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		fraxInstance.address,
		new BigNumber(500e18), 
		new BigNumber(100e18), 
		new BigNumber(500e18), 
		new BigNumber(100e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);


	// Handle FXS / WETH
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		wethInstance.address,
		new BigNumber(3025e18), 
		new BigNumber(1e18), 
		new BigNumber(3025e18), 
		new BigNumber(1e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / USDC
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		col_instance_USDC.address,
		new BigNumber(495e18), 
		new BigNumber(100e18), 
		new BigNumber(495e18), 
		new BigNumber(100e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / USDT
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		col_instance_USDT.address,
		new BigNumber(495e18), 
		new BigNumber(100e18), 
		new BigNumber(495e18), 
		new BigNumber(100e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / 6DEC
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		col_instance_6DEC.address,
		new BigNumber(495e6), 
		new BigNumber(100e6), 
		new BigNumber(495e6), 
		new BigNumber(100e6), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// These are already liquid on mainnet so no need to seed unless you are in the fake / test environment
	if (process.env.MIGRATION_MODE != 'mainnet') {
		// Handle USDC / WETH
		await routerInstance.addLiquidity(
			col_instance_USDC.address, 
			wethInstance.address,
			new BigNumber(605000e18), 
			new BigNumber(1000e18), 
			new BigNumber(605000e18), 
			new BigNumber(1000e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Handle USDT / WETH
		await routerInstance.addLiquidity(
			col_instance_USDT.address, 
			wethInstance.address,
			new BigNumber(605000e18), 
			new BigNumber(1000e18), 
			new BigNumber(605000e18), 
			new BigNumber(1000e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
	
		// Handle 6DEC / WETH
		await routerInstance.addLiquidity(
			col_instance_6DEC.address, 
			wethInstance.address,
			new BigNumber(605000e6), 
			new BigNumber(1000e18), 
			new BigNumber(60500e6), 
			new BigNumber(1000e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
	}

	// // ======== PRINT LIQUIDITY POOL BALANCES ========
	console.log(chalk.yellow('===== PRINT USDC_WETH POOL BALANCE ====='));

	// Print USDC / WETH reserves
	let USDC_WETH_token0_address = await pair_instance_USDC_WETH.token0.call();
	let USDC_WETH_token1_address = await pair_instance_USDC_WETH.token1.call();

	console.log("col_instance_USDC.address: ", col_instance_USDC.address);
	console.log("wethInstance.address: ", wethInstance.address);

	console.log("USDC_WETH_token0_address: ", USDC_WETH_token0_address);
	console.log("USDC_WETH_token1_address: ", USDC_WETH_token1_address);

	let USDC_WETH_reserves = await pair_instance_USDC_WETH.getReserves.call();
	if (col_instance_USDC.address == USDC_WETH_token0_address){
		console.log("USDC (token0) reserves in USDC / WETH: ", (new BigNumber(USDC_WETH_reserves._reserve0)).div(1e18).toNumber());
		console.log("WETH (token1) reserves in USDC / WETH: ", (new BigNumber(USDC_WETH_reserves._reserve1)).div(1e18).toNumber());
	}
	else {
		console.log("WETH (token0) reserves in USDC / WETH: ", (new BigNumber(USDC_WETH_reserves._reserve0)).div(1e18).toNumber());
		console.log("USDC (token1) reserves in USDC / WETH: ", (new BigNumber(USDC_WETH_reserves._reserve1)).div(1e18).toNumber());
	}

	// ======== Set the Uniswap oracles ========
	console.log(chalk.yellow('===== UNISWAP ORACLES ====='));
	await deployer.deploy(UniswapPairOracle_FRAX_WETH, uniswapFactoryInstance.address, fraxInstance.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FRAX_USDC, uniswapFactoryInstance.address, fraxInstance.address, col_instance_USDC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FRAX_USDT, uniswapFactoryInstance.address, fraxInstance.address, col_instance_USDT.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FRAX_6DEC, uniswapFactoryInstance.address, fraxInstance.address, col_instance_6DEC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FRAX_FXS, uniswapFactoryInstance.address, fraxInstance.address, fxsInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);

	await deployer.deploy(UniswapPairOracle_FXS_WETH, uniswapFactoryInstance.address, fxsInstance.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FXS_USDC, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FXS_USDT, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDT.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FXS_6DEC, uniswapFactoryInstance.address, fxsInstance.address, col_instance_6DEC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	

	await deployer.deploy(UniswapPairOracle_USDT_WETH, uniswapFactoryInstance.address, col_instance_USDT.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_USDC_WETH, uniswapFactoryInstance.address, col_instance_USDC.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_6DEC_WETH, uniswapFactoryInstance.address, col_instance_6DEC.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);

	// ======== Set the Frax Pools ========
	console.log(chalk.yellow('===== FRAX POOLS ====='));
	await deployer.link(StringHelpers, [Pool_USDC, Pool_USDT, Pool_6DEC]);
	await deployer.deploy(Pool_USDC, fraxInstance.address, fxsInstance.address, col_instance_USDC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_USDT, fraxInstance.address, fxsInstance.address, col_instance_USDT.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_6DEC, fraxInstance.address, fxsInstance.address, col_instance_6DEC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	
	// ======== Get the pool instances ========
	console.log(chalk.yellow('===== POOL INSTANCES ====='));
	const pool_instance_USDC = await Pool_USDC.deployed();
	const pool_instance_USDT = await Pool_USDT.deployed();
	const pool_instance_6DEC = await Pool_6DEC.deployed();
	
	// ======== Set the redemption and minting fees ========
	console.log(chalk.yellow('===== REDEMPTION AND MINTING FEES ====='));

	// Set the redemption fee to 0.04%
	await fraxInstance.setRedemptionFee(REDEMPTION_FEE, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// Set the minting fee to 0.03%
	await fraxInstance.setMintingFee(MINTING_FEE, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Set FRAX and FXS oracles ========
	console.log(chalk.yellow('===== FRAX AND FXS ORACLES ====='));
	// Get the instances
	const oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
	const oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed(); 
	const oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.deployed();
	const oracle_instance_FRAX_6DEC = await UniswapPairOracle_FRAX_6DEC.deployed();
	const oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.deployed();
	const oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
	const oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed(); 
	const oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed(); 
	const oracle_instance_FXS_6DEC = await UniswapPairOracle_FXS_6DEC.deployed(); 
	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
	const oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
	const oracle_instance_6DEC_WETH = await UniswapPairOracle_6DEC_WETH.deployed();

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Add the ETH / USD Chainlink oracle
	if (process.env.MIGRATION_MODE != 'mainnet'){
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();
		await fraxInstance.setETHUSDOracle(oracle_chainlink_ETH_USD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	}
	else {
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();
		await fraxInstance.setETHUSDOracle(oracle_chainlink_ETH_USD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	}

	// ======== Link FRAX oracles ========
	console.log(chalk.yellow('===== LINK FRAX ORACLES ====='));

	// Link the FRAX oracles
	await fraxInstance.setFRAXEthOracle(oracle_instance_FRAX_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	await pool_instance_USDT.setCollatETHOracle(oracle_instance_USDT_WETH.address, wethInstance.address, { from: POOL_CREATOR });
	await pool_instance_USDC.setCollatETHOracle(oracle_instance_USDC_WETH.address, wethInstance.address, { from: POOL_CREATOR });
	await pool_instance_6DEC.setCollatETHOracle(oracle_instance_6DEC_WETH.address, wethInstance.address, { from: POOL_CREATOR });

	// ======== Link FXS oracles ========
	console.log(chalk.yellow('===== LINK FXS ORACLES ====='));

	// Link the FXS oracles
	await fraxInstance.setFXSEthOracle(oracle_instance_FXS_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Set the Chainlink oracle ========
	console.log(chalk.yellow('===== SET THE CHAINLINK ORACLE ====='));

	const theTime = await time.latest();
	await deployer.deploy(TokenVesting, accounts[5], theTime, 86400, 86400 * 10, true, { from: accounts[0] });
	const vestingInstance = await TokenVesting.deployed();	

	// ======== Note the addresses ========
	// If you are testing the frontend, you need to copy-paste the output of CONTRACT_ADDRESSES to the frontend src/misc/constants.tsx
	let CONTRACT_ADDRESSES = {
		[process.env.MIGRATION_MODE]: {
			main: {
				FRAX: fraxInstance.address,
				FXS: fxsInstance.address,
				vesting: vestingInstance.address
			},
			weth: wethInstance.address,
			oracles: {
				FRAX_WETH: oracle_instance_FRAX_WETH.address,
				FRAX_USDC: oracle_instance_FRAX_USDC.address,
				FRAX_USDT: oracle_instance_FRAX_USDT.address,
				FRAX_6DEC: oracle_instance_FRAX_6DEC.address,
				FRAX_FXS: oracle_instance_FRAX_FXS.address,
				FXS_WETH: oracle_instance_FXS_WETH.address,
				FXS_USDC: oracle_instance_FXS_USDC.address,
				FXS_USDT: oracle_instance_FXS_USDT.address,
				FXS_6DEC: oracle_instance_FXS_6DEC.address,
				USDC_WETH: oracle_instance_USDC_WETH.address,
				USDT_WETH: oracle_instance_USDT_WETH.address,
				"6DEC_WETH": oracle_instance_USDT_WETH.address,
			},
			collateral: {
				USDC: col_instance_USDC.address,
				USDT: col_instance_USDT.address,
				"6DEC": col_instance_6DEC.address,
			},
			governance: governanceInstance.address,
			pools: {
				USDC: pool_instance_USDC.address,
				USDT: pool_instance_USDT.address,
				"6DEC": pool_instance_6DEC.address,
			},
			uniswap_other: {
				router: routerInstance.address,
				factory: uniswapFactoryInstance.address,
			},
			pricing: {
				swap_to_price: swapToPriceInstance.address
			},
			misc: {
				timelock: timelockInstance.address,
				migration_helper: migrationHelperInstance.address
			},
			libraries: {
				UniswapV2OracleLibrary: UniswapV2OracleLibrary.address,
				UniswapV2Library: UniswapV2Library.address,
				FraxPoolLibrary: FraxPoolLibrary.address,
			},
			stake_tokens: {
				'Uniswap FRAX/WETH': pair_instance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': pair_instance_FRAX_USDC.address,
				'Uniswap FRAX/FXS': pair_instance_FRAX_FXS.address,
				'Uniswap FXS/WETH': pair_instance_FXS_WETH.address,
			},
			staking_contracts_for_tokens: {
				'Uniswap FRAX/WETH': stakingInstance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': stakingInstance_FRAX_USDC.address,
				'Uniswap FRAX/FXS': stakingInstance_FRAX_FXS.address,
				'Uniswap FXS/WETH': stakingInstance_FXS_WETH.address,
			}
		}      
	}

	console.log("CONTRACT_ADDRESSES: ", CONTRACT_ADDRESSES);
}
