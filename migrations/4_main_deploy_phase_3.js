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

	const IS_MAINNET = (process.env.MIGRATION_MODE == 'mainnet');
	const IS_ROPSTEN = (process.env.MIGRATION_MODE == 'ropsten');
	
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
	
	const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
	const FIVE_MILLION_DEC18 = new BigNumber("5000000e18");
	const FIVE_MILLION_DEC6 = new BigNumber("5000000e6");
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

	// Get the necessary instances
	let CONTRACT_ADDRESSES;
	let timelockInstance;
	let migrationHelperInstance;
	let fraxInstance;
	let fxsInstance;
	let governanceInstance;
	let wethInstance;
	let col_instance_USDC;
	let col_instance_USDT;
	let routerInstance;
	let uniswapFactoryInstance;
	let swapToPriceInstance;
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FRAX_FXS;
	let stakingInstance_FXS_WETH;
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FRAX_FXS;
	let pair_instance_FXS_WETH;

	if (process.env.MIGRATION_MODE == 'ganache'){
		timelockInstance = await Timelock.deployed();
		migrationHelperInstance = await MigrationHelper.deployed()
		governanceInstance = await GovernorAlpha.deployed(); 
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		col_instance_USDT = await FakeCollateral_USDT.deployed(); 
		routerInstance = await UniswapV2Router02_Modified.deployed(); 
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
		swapToPriceInstance = await SwapToPrice.deployed();
		stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
		stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
		stakingInstance_FRAX_FXS = await StakingRewards_FRAX_FXS.deployed();
		stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();


		const pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(fraxInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(fraxInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const pair_addr_FRAX_FXS = await uniswapFactoryInstance.getPair(fraxInstance.address, fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(pair_addr_FRAX_WETH);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(pair_addr_FRAX_USDC);
		pair_instance_FRAX_FXS = await UniswapV2Pair.at(pair_addr_FRAX_FXS);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);
	}
	else {
		CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
		timelockInstance = await Timelock.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.timelock);
		migrationHelperInstance = await MigrationHelper.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.migration_helper);
		governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].governance);
		fraxInstance = await FRAXStablecoin.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FRAX);
		fxsInstance = await FRAXShares.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FXS);
		wethInstance = await WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].weth);
		col_instance_USDC = await FakeCollateral_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDC);
		col_instance_USDT = await FakeCollateral_USDT.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDT); 
		routerInstance = await UniswapV2Router02.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.router); 
		uniswapFactoryInstance = await UniswapV2Factory.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.factory); 
		swapToPriceInstance = await SwapToPrice.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pricing.swap_to_price); 
		stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap FRAX/WETH"]);
		stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap FRAX/USDC"]);
		stakingInstance_FRAX_FXS = await StakingRewards_FRAX_FXS.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap FRAX/FXS"]);
		stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].staking_contracts["Uniswap FXS/WETH"]);
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FRAX_FXS = await UniswapV2Pair.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pair_tokens["Uniswap FRAX/FXS"]);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pair_tokens["Uniswap FXS/WETH"]);
	}

	// CONTINUE MAIN DEPLOY CODE HERE
	// ====================================================================================================================
	// ====================================================================================================================
	
	// ======== Spread some FXS around ========
	console.log(chalk.yellow('===== SPREAD SOME FXS AROUND ====='));

	// Transfer 1,000,000 FXS each to various accounts
	if (!IS_MAINNET){
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
	console.log(chalk.yellow('===== Transfer FXS to staking contracts ====='));
	await Promise.all([
		fxsInstance.transfer(stakingInstance_FRAX_WETH.address, new BigNumber("6000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		fxsInstance.transfer(stakingInstance_FRAX_USDC.address, new BigNumber("6000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		fxsInstance.transfer(stakingInstance_FRAX_FXS.address, new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		fxsInstance.transfer(stakingInstance_FXS_WETH.address, new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })
	]);

	if (!IS_MAINNET){
		// Advance 1 block so you can check the votes below
		await time.increase(20);
		await time.advanceBlock();
	}

	// Print some vote totals
	console.log(chalk.yellow('===== PRINT OUT SOME VOTES ====='));

	const previous_block = (await time.latestBlock()) - 1;

	// Get the prices
	let stake_FRAX_WETH_votes = (new BigNumber(await fxsInstance.getPriorVotes.call(stakingInstance_FRAX_WETH.address, previous_block))).div(BIG18);
	let stake_FRAX_USDC_votes = (new BigNumber(await fxsInstance.getPriorVotes.call(stakingInstance_FRAX_USDC.address, previous_block))).div(BIG18);
	let stake_FRAX_FXS_votes = (new BigNumber(await fxsInstance.getPriorVotes.call(stakingInstance_FRAX_FXS.address, previous_block))).div(BIG18);
	let stake_FXS_WETH_votes = (new BigNumber(await fxsInstance.getPriorVotes.call(stakingInstance_FXS_WETH.address, previous_block))).div(BIG18);

	// Print the new prices
	console.log("stake_FRAX_WETH_votes: ", stake_FRAX_WETH_votes.toString());
	console.log("stake_FRAX_USDC_votes: ", stake_FRAX_USDC_votes.toString());
	console.log("stake_FRAX_FXS_votes: ", stake_FRAX_FXS_votes.toString());
	console.log("stake_FXS_WETH_votes: ", stake_FXS_WETH_votes.toString());
	
	// ======== Add liquidity to the pairs so the oracle constructor doesn't error  ========
	// Initially, all prices will be 1:1, but that can be changed in further testing via arbitrage simulations to a known price
	console.log(chalk.yellow('===== ADDING LIQUIDITY TO THE PAIRS ====='));

	// const weth_balance_superowner = (new BigNumber(await wethInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
	// console.log("weth_balance_superowner: ", weth_balance_superowner);

	await Promise.all([
		// FRAX / WETH
		routerInstance.addLiquidity(
			fraxInstance.address, 
			wethInstance.address,
			new BigNumber(600e18), 
			new BigNumber(1e18), 
			new BigNumber(600e18), 
			new BigNumber(1e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		),
		// FRAX / USDC
		routerInstance.addLiquidity(
			fraxInstance.address, 
			col_instance_USDC.address,
			new BigNumber(100e18), 
			new BigNumber(100e6), 
			new BigNumber(100e18), 
			new BigNumber(100e6), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		),
		// FRAX / USDT
		routerInstance.addLiquidity(
			fraxInstance.address, 
			col_instance_USDT.address,
			new BigNumber(100e18), 
			new BigNumber(100e6), 
			new BigNumber(100e18), 
			new BigNumber(100e6), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		),
		// FRAX / FXS
		routerInstance.addLiquidity(
			fxsInstance.address, 
			fraxInstance.address,
			new BigNumber(133333e15), 
			new BigNumber(100e18), 
			new BigNumber(133333e15), 
			new BigNumber(100e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		),
		// FXS / WETH
		routerInstance.addLiquidity(
			fxsInstance.address, 
			wethInstance.address,
			new BigNumber(800e18), 
			new BigNumber(1e18), 
			new BigNumber(800e18), 
			new BigNumber(1e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		),
		// FXS / USDC
		routerInstance.addLiquidity(
			fxsInstance.address, 
			col_instance_USDC.address,
			new BigNumber(133333e15), 
			new BigNumber(100e6), 
			new BigNumber(133333e15), 
			new BigNumber(100e6), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		),
		// FXS / USDT
		routerInstance.addLiquidity(
			fxsInstance.address, 
			col_instance_USDT.address,
			new BigNumber(133333e15), 
			new BigNumber(100e6), 
			new BigNumber(133333e15), 
			new BigNumber(100e6), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		)
	]);


	// These are already liquid on mainnet so no need to seed unless you are in the fake / test environment
	if (!IS_MAINNET) {
		// Handle USDC / WETH
		await routerInstance.addLiquidity(
			col_instance_USDC.address, 
			wethInstance.address,
			new BigNumber(600000e6), 
			new BigNumber(1000e18), 
			new BigNumber(600000e6), 
			new BigNumber(1000e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Handle USDT / WETH
		await routerInstance.addLiquidity(
			col_instance_USDT.address, 
			wethInstance.address,
			new BigNumber(600000e6), 
			new BigNumber(1000e18), 
			new BigNumber(600000e6), 
			new BigNumber(1000e18), 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			new BigNumber(2105300114), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
	}

	// ======== Set the Uniswap oracles ========
	console.log(chalk.yellow('========== UNISWAP ORACLES =========='));
	console.log(chalk.blue('=== FRAX ORACLES ==='));
	await Promise.all([
		deployer.deploy(UniswapPairOracle_FRAX_WETH, uniswapFactoryInstance.address, fraxInstance.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_FRAX_USDC, uniswapFactoryInstance.address, fraxInstance.address, col_instance_USDC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_FRAX_USDT, uniswapFactoryInstance.address, fraxInstance.address, col_instance_USDT.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_FRAX_FXS, uniswapFactoryInstance.address, fraxInstance.address, fxsInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address)
	]);

	console.log(chalk.blue('=== FXS ORACLES ==='));
	await Promise.all([
		deployer.deploy(UniswapPairOracle_FXS_WETH, uniswapFactoryInstance.address, fxsInstance.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_FXS_USDC, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_FXS_USDT, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDT.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address)
	]);

	console.log(chalk.blue('=== COLLATERAL ORACLES ==='));
	await Promise.all([
		deployer.deploy(UniswapPairOracle_USDT_WETH, uniswapFactoryInstance.address, col_instance_USDT.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
		deployer.deploy(UniswapPairOracle_USDC_WETH, uniswapFactoryInstance.address, col_instance_USDC.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address),
	]);

	// ============= Set the Frax Pools ========
	console.log(chalk.yellow('========== FRAX POOLS =========='));
	await deployer.link(StringHelpers, [Pool_USDC, Pool_USDT]);
	await Promise.all([
		deployer.deploy(Pool_USDC, fraxInstance.address, fxsInstance.address, col_instance_USDC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC6),
		deployer.deploy(Pool_USDT, fraxInstance.address, fxsInstance.address, col_instance_USDT.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC6)
	])
	
	// ============= Get the pool instances ========
	console.log(chalk.yellow('========== POOL INSTANCES =========='));
	const pool_instance_USDC = await Pool_USDC.deployed();
	const pool_instance_USDT = await Pool_USDT.deployed();

	// ============= Set the redemption and minting fees ========
	console.log(chalk.yellow('========== REDEMPTION AND MINTING FEES =========='));

	// Set the redemption fee to 0.04%
	// Set the minting fee to 0.03%
	await Promise.all([
		fraxInstance.setRedemptionFee(REDEMPTION_FEE, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		fraxInstance.setMintingFee(MINTING_FEE, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
	])

	// ============= Set the pool parameters so the minting and redemption fees get set ========
	console.log(chalk.yellow('========== REFRESH POOL PARAMETERS =========='));
	await Promise.all([
		await pool_instance_USDC.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, { from: POOL_CREATOR }),
		await pool_instance_USDT.setPoolParameters(FIVE_MILLION_DEC6, 7500, 1, { from: POOL_CREATOR }),
	]);

	// ============= Get FRAX and FXS oracles ========
	console.log(chalk.yellow('========== GET FRAX AND FXS ORACLES =========='));
	
	// Get the instances
	const oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
	const oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed(); 
	const oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.deployed();
	const oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.deployed();
	const oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
	const oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed();
	const oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed();
	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
	const oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();


	// ======== Set the Chainlink oracle ========
	console.log(chalk.yellow('===== SET THE CHAINLINK ORACLE ====='));

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Add the ETH / USD Chainlink oracle
	if (IS_MAINNET){
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.at("0xBa6C6EaC41a24F9D39032513f66D738B3559f15a");
		await fraxInstance.setETHUSDOracle(oracle_chainlink_ETH_USD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	}
	else {
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumerTest.deployed();
		await fraxInstance.setETHUSDOracle(oracle_chainlink_ETH_USD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	}


	// ======== Link oracles ========
	console.log(chalk.yellow('===== LINK ORACLES ====='));

	// Link the oracles
	console.log(chalk.blue('=== FRAX / WETH ORACLE SETTING ==='));
	console.log(chalk.blue('=== COLLATERAL / WETH ORACLE SETTING ==='));
	await Promise.all([
		fraxInstance.setFRAXEthOracle(oracle_instance_FRAX_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		pool_instance_USDC.setCollatETHOracle(oracle_instance_USDC_WETH.address, wethInstance.address, { from: POOL_CREATOR }),
		pool_instance_USDT.setCollatETHOracle(oracle_instance_USDT_WETH.address, wethInstance.address, { from: POOL_CREATOR })
		
	]);
	
	// ======== Link FXS oracles ========
	console.log(chalk.yellow('===== LINK FXS ORACLES ====='));

	// Link the FXS oracles
	await fraxInstance.setFXSEthOracle(oracle_instance_FXS_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Note the addresses ========
	// If you are testing the frontend, you need to copy-paste the output of CONTRACT_ADDRESSES to the frontend src/misc/constants.tsx
	let CONTRACT_ADDRESSES_PHASE_3 = {
		[process.env.MIGRATION_MODE]: {
			main: {
				FRAX: fraxInstance.address,
				FXS: fxsInstance.address,
				vesting: "NOT_DEPLOYED_YET"
			},
			weth: wethInstance.address,
			oracles: {
				FRAX_WETH: oracle_instance_FRAX_WETH.address,
				FRAX_USDC: oracle_instance_FRAX_USDC.address,
				FRAX_USDT: oracle_instance_FRAX_USDT.address,
				FRAX_FXS: oracle_instance_FRAX_FXS.address,
				FXS_WETH: oracle_instance_FXS_WETH.address,
				FXS_USDC: oracle_instance_FXS_USDC.address,
				FXS_USDT: oracle_instance_FXS_USDT.address,
				USDC_WETH: oracle_instance_USDC_WETH.address,
				USDT_WETH: oracle_instance_USDT_WETH.address,
			},
			collateral: {
				USDC: col_instance_USDC.address,
				USDT: col_instance_USDT.address,
			},
			governance: governanceInstance.address,
			pools: {
				USDC: pool_instance_USDC.address,
				USDT: pool_instance_USDT.address,
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
			pair_tokens: {
				'Uniswap FRAX/WETH': pair_instance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': pair_instance_FRAX_USDC.address,
				'Uniswap FRAX/FXS': pair_instance_FRAX_FXS.address,
				'Uniswap FXS/WETH': pair_instance_FXS_WETH.address,
			},
			staking_contracts: {
				'Uniswap FRAX/WETH': stakingInstance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': stakingInstance_FRAX_USDC.address,
				'Uniswap FRAX/FXS': stakingInstance_FRAX_FXS.address,
				'Uniswap FXS/WETH': stakingInstance_FXS_WETH.address,
			}
		}      
	}

	console.log("CONTRACT_ADDRESSES: ", CONTRACT_ADDRESSES_PHASE_3);
};
