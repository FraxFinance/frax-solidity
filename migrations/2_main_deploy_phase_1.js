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
	const USE_MAINNET_EXISTING = true;
	const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet');
	const IS_ROPSTEN = (process.env.MIGRATION_MODE == 'ropsten');
	
	// ======== Set the addresses ========
	
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
	const TIMELOCK_DELAY = 2 * 86400; // 2 days
	const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
	const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS;;

	// Print the addresses
	// ================= Start Initializing =================

	if (process.env.MIGRATION_MODE == 'ganache'){
		// ======== Give Metamask some ether ========
		console.log(chalk.yellow('===== GIVE METAMASK SOME ETHER ====='));
		send.ether(COLLATERAL_FRAX_AND_FXS_OWNER, METAMASK_ADDRESS, 2e18);
	}

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
	await deployer.link(FixedPoint, [UniswapV2OracleLibrary, UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_FXS, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_USDT, UniswapPairOracle_USDC_WETH, UniswapPairOracle_USDT_WETH]);
	await deployer.link(Address, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT]);
	await deployer.deploy(Math);
	await deployer.link(Math, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, UniswapV2ERC20, UniswapV2Pair]);
	await deployer.deploy(SafeMath);
	await deployer.link(SafeMath, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FRAXStablecoin, Pool_USDC, Pool_USDT, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, UniswapV2ERC20, UniswapV2Library, UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, Timelock]);
	await deployer.deploy(TransferHelper);
	await deployer.link(TransferHelper, [UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH, Pool_USDC, Pool_USDT]);
	await deployer.deploy(UniswapV2ERC20);
	await deployer.link(UniswapV2ERC20, [UniswapV2Pair]);
	await deployer.deploy(UniswapV2OracleLibrary);
	await deployer.link(UniswapV2OracleLibrary, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_FXS, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_USDT, UniswapPairOracle_USDC_WETH, UniswapPairOracle_USDT_WETH]);
	await deployer.deploy(UniswapV2Library);
	await deployer.link(UniswapV2Library, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDC, UniswapPairOracle_USDC_WETH, UniswapV2Router02, UniswapV2Router02_Modified, SwapToPrice]);
	await deployer.deploy(UniswapV2Pair);
	await deployer.link(UniswapV2Pair, [UniswapV2Factory]);
	await deployer.deploy(UniswapV2Factory, DUMP_ADDRESS);
	await deployer.deploy(SafeERC20);
	await deployer.link(SafeERC20, [WETH, FakeCollateral_USDC, FakeCollateral_USDT, FRAXStablecoin, Pool_USDC, Pool_USDT, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FRAX_FXS, StakingRewards_FXS_WETH]);
	await deployer.deploy(FraxPoolLibrary);
	await deployer.link(FraxPoolLibrary, [Pool_USDC, Pool_USDT]);
	await deployer.deploy(Owned, COLLATERAL_FRAX_AND_FXS_OWNER);
	await deployer.deploy(ChainlinkETHUSDPriceConsumer);
	await deployer.deploy(ChainlinkETHUSDPriceConsumerTest);
	await deployer.deploy(Timelock, TIMELOCK_ADMIN, TIMELOCK_DELAY);
	await deployer.deploy(MigrationHelper, TIMELOCK_ADMIN);

	// Timelock and MigrationHelper
	const timelockInstance = await Timelock.deployed();
	const migrationHelperInstance = await MigrationHelper.deployed();

	// FRAX
	await deployer.deploy(FRAXStablecoin, "Frax", "FRAX", COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fraxInstance = await FRAXStablecoin.deployed();

	// FXS
	await deployer.deploy(FRAXShares, "Frax Share", "FXS", ORACLE_ADDRESS, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fxsInstance = await FRAXShares.deployed();

	console.log(chalk.yellow("===== Make sure name()'s work ====="));
	let frax_name = await fraxInstance.name.call();
	let fxs_name = await fxsInstance.name.call();
	console.log(`frax_name: [${frax_name}]`);
	console.log(`fxs_name: [${fxs_name}]`);


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
	
	if (IS_MAINNET){
		console.log(chalk.yellow('===== REAL COLLATERAL ====='));
		wethInstance = await WETH.at("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
		col_instance_USDC = await FakeCollateral_USDC.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
		col_instance_USDT = await FakeCollateral_USDT.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 

	}
	else {
		console.log(chalk.yellow('===== FAKE COLLATERAL ====='));

		await deployer.deploy(WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
		await deployer.deploy(FakeCollateral_USDC, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDC", 6);
		await deployer.deploy(FakeCollateral_USDT, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC6, "USDT", 6);
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
	}


	let CONTRACT_ADDRESSES_PHASE_1 = {
		[process.env.MIGRATION_MODE]: {
			main: {
				FRAX: fraxInstance.address,
				FXS: fxsInstance.address,
				vesting: "NOT_DEPLOYED_YET"
			},
			weth: wethInstance.address,
			oracles: {
				FRAX_WETH: "NOT_DEPLOYED_YET",
				FRAX_USDC: "NOT_DEPLOYED_YET",
				FRAX_USDT: "NOT_DEPLOYED_YET",
				FRAX_FXS: "NOT_DEPLOYED_YET",
				FXS_WETH: "NOT_DEPLOYED_YET",
				FXS_USDC: "NOT_DEPLOYED_YET",
				FXS_USDT: "NOT_DEPLOYED_YET",
				USDC_WETH: "NOT_DEPLOYED_YET",
				USDT_WETH: "NOT_DEPLOYED_YET",
			},
			collateral: {
				USDC: col_instance_USDC.address,
				USDT: col_instance_USDT.address,
			},
			governance: governanceInstance.address,
			pools: {
				USDC: "NOT_DEPLOYED_YET",
				USDT: "NOT_DEPLOYED_YET",
			},
			uniswap_other: {
				router: "NOT_DEPLOYED_YET",
				factory: "NOT_DEPLOYED_YET",
			},
			pricing: {
				swap_to_price: "NOT_DEPLOYED_YET"
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
			pair_tokens: {
				'Uniswap FRAX/WETH': "NOT_DEPLOYED_YET",
				'Uniswap FRAX/USDC': "NOT_DEPLOYED_YET",
				'Uniswap FRAX/FXS': "NOT_DEPLOYED_YET",
				'Uniswap FXS/WETH': "NOT_DEPLOYED_YET",
			},
			staking_contracts: {
				'Uniswap FRAX/WETH': "NOT_DEPLOYED_YET",
				'Uniswap FRAX/USDC': "NOT_DEPLOYED_YET",
				'Uniswap FRAX/FXS': "NOT_DEPLOYED_YET",
				'Uniswap FXS/WETH': "NOT_DEPLOYED_YET",
			}
		}      
	}

	console.log("CONTRACT_ADDRESSES: ", CONTRACT_ADDRESSES_PHASE_1);
}
