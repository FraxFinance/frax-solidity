const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const constants = require(path.join(__dirname, '../../../dist/types/constants'));

const BigNumber = require('bignumber.js');
require('@openzeppelin/test-helpers/configure')({
	provider: process.env.ETHEREUM_NETWORK_ENDPOINT,
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
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02_Modified = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH.sol");

const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";


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
	let frax_instance;
	let fxs_instance;
	let governanceInstance;
	let wethInstance;
	let usdc_instance;
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

	usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 
	col_instance_USDT = await ERC20.at("0xdac17f958d2ee523a2206206994597c13d831ec7"); 

	if (process.env.MIGRATION_MODE == 'ganache'){
		timelockInstance = await Timelock.deployed();
		migrationHelperInstance = await MigrationHelper.deployed()
		governanceInstance = await GovernorAlpha.deployed();
		routerInstance = await IUniswapV2Router02_Modified.deployed(); 
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 
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
		frax_instance = await FRAXStablecoin.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FRAX);
		fxs_instance = await FRAXShares.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FXS);
		governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].governance);
		wethInstance = await WETH.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].weth);
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
	// ======== Seed the collateral pools ========

	// ======== Advance a block and 24 hours to catch things up ========
	// await time.increase(86400 + 1);
	// await time.advanceBlock();
	// await frax_instance.refreshCollateralRatio();

	// ======== Make some governance proposals ========

	// Minting fee 0.04% -> 0.1%
	await governanceInstance.propose(
		[frax_instance.address],
		[0],
		['setMintingFee(uint256)'],
		[web3.eth.abi.encodeParameters(['uint256'], [1000])], // 0.1%
		"Minting fee increase",
		"I hereby propose to increase the minting fee from 0.04% to 0.1%",
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);
	
	// Redemption fee 0.04% -> 0.08%
	await governanceInstance.propose(
		[frax_instance.address],
		[0],
		['setMintingFee(uint256)'],
		[web3.eth.abi.encodeParameters(['uint256'], [800])], // 0.1%
		"Redemption fee increase",
		"I want to increase the redemption fee from 0.04% to 0.08%",
		{ from: GOVERNOR_GUARDIAN_ADDRESS }
	);

	// Increase the USDC pool ceiling from 10M to 15M
	// This mini hack is needed
	const num = 15000000 * (10 ** 18);
	const numAsHex = "0x" + num.toString(16);
	await governanceInstance.propose(
		[pool_instance_USDC.address],
		[0],
		['setPoolCeiling(uint256)'],
		[web3.eth.abi.encodeParameters(['uint256'], [numAsHex])], // 15M
		"USDC Pool ceiling raise",
		"Raise the USDC pool ceiling to 15M",
		{ from: STAKING_REWARDS_DISTRIBUTOR }
	);

	// // Advance one block so voting can begin
	// await time.increase(15);
	// await time.advanceBlock();

	// await governanceInstance.castVote(1, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// await governanceInstance.castVote(2, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
	// await governanceInstance.castVote(3, true, { from: STAKING_REWARDS_DISTRIBUTOR });

	// // ======== Advance a block and 24 hours to catch things up ========
	// await time.increase(86400 + 1);
	// await time.advanceBlock();

};
