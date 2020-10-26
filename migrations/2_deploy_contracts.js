const BigNumber = require('bignumber.js');
console.log("IF YOU ERROR ABOVE HERE, MAKE SURE TO SET THE PROVIDER BELOW CORRECTLY");
require('@openzeppelin/test-helpers/configure')({
	provider: 'http://127.0.0.1:8545',
  });
const { expectEvent, send, shouldFail, time } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
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
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");
const TestSwap = artifacts.require("Uniswap/TestSwap");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_yUSD = artifacts.require("FakeCollateral/FakeCollateral_yUSD");

// Collateral Pools
const FraxPoolLibrary = artifacts.require("Frax/Pools/FraxPoolLibrary");
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");
const Pool_yUSD = artifacts.require("Frax/Pools/Pool_yUSD");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_yUSD");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_FXS_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_yUSD");
const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDT_WETH");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
// const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumerTest");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");
const TimelockGovernance = artifacts.require("Governance/TimelockGovernance");

// Staking contracts
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDT.sol");
const StakingRewards_FRAX_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_yUSD.sol");
const StakingRewards_FXS_WETH = artifacts.require("Staking/Fake_Stakes/Stake_FXS_WETH.sol");
const StakingRewards_FXS_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDC.sol");
const StakingRewards_FXS_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDT.sol");
const StakingRewards_FXS_yUSD = artifacts.require("Staking/Fake_Stakes/Stake_FXS_yUSD.sol");

const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";

// Make sure Ganache is running beforehand
module.exports = async function(deployer, network, accounts) {
	// // ======== Set Web3 ========
	// console.log("networks: ", networks);
	// console.log("network: ", network);
	// const { host, port } = (networks[network] || {})
    // if (!host || !port) {
    //   throw new Error(`Unable to find provider for network: ${network}`)
    // }
    // window.web3 = new Web3.providers.HttpProvider(`http://${host}:${port}`);

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
	const COLLATERAL_SEED_DEC18 = new BigNumber(339000e18);
	
	const REDEMPTION_FEE = 400; // 0.04%
	const MINTING_FEE = 300; // 0.03%
	const COLLATERAL_PRICE = 1040000; // $1.04
	const FRAX_PRICE = 980000; // $0.98
	const FXS_PRICE = 210000; // $0.21
	const TIMELOCK_DELAY = 86400 * 2; // 2 days
	const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
	const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";

	// Print the addresses
	console.log(`====================================================`);

	// ======== Give Metamask some ether ========
	console.log(chalk.yellow('===== GIVE METAMASK SOME ETHER ====='));
	send.ether(COLLATERAL_FRAX_AND_FXS_OWNER, METAMASK_ADDRESS, 2e18);

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
	await deployer.link(FixedPoint, [UniswapV2OracleLibrary, UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_yUSD, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDT, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_yUSD, UniswapPairOracle_USDT_WETH, UniswapPairOracle_USDC_WETH]);
	await deployer.link(Address, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_yUSD]);
	await deployer.deploy(Math);
	await deployer.link(Math, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDT,StakingRewards_FRAX_USDC, StakingRewards_FRAX_yUSD, StakingRewards_FXS_WETH, StakingRewards_FXS_USDT, StakingRewards_FXS_USDC, StakingRewards_FXS_yUSD, UniswapV2ERC20, UniswapV2Pair]);
	await deployer.deploy(SafeMath);
	await deployer.link(SafeMath, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_yUSD, FRAXStablecoin, Pool_USDC, Pool_USDT, Pool_yUSD, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDT,StakingRewards_FRAX_USDC, StakingRewards_FRAX_yUSD, StakingRewards_FXS_WETH, StakingRewards_FXS_USDT, StakingRewards_FXS_USDC, StakingRewards_FXS_yUSD, UniswapV2ERC20, UniswapV2Library, UniswapV2Router02_Modified, SwapToPrice, Timelock, TimelockGovernance]);
	await deployer.deploy(TransferHelper);
	await deployer.link(TransferHelper, [UniswapV2Router02_Modified, SwapToPrice, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDT,StakingRewards_FRAX_USDC, StakingRewards_FRAX_yUSD, StakingRewards_FXS_WETH, StakingRewards_FXS_USDT, StakingRewards_FXS_USDC, StakingRewards_FXS_yUSD, Pool_USDC, Pool_USDT, Pool_yUSD]);
	await deployer.deploy(UniswapV2ERC20);
	await deployer.link(UniswapV2ERC20, [UniswapV2Pair]);
	await deployer.deploy(UniswapV2OracleLibrary);
	await deployer.link(UniswapV2OracleLibrary, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_yUSD, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDT, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_yUSD, UniswapPairOracle_USDT_WETH, UniswapPairOracle_USDC_WETH]);
	await deployer.deploy(UniswapV2Library);
	await deployer.link(UniswapV2Library, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FRAX_yUSD, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDT, UniswapPairOracle_FXS_USDC, UniswapPairOracle_FXS_yUSD, UniswapPairOracle_USDT_WETH, UniswapPairOracle_USDC_WETH, UniswapV2Router02_Modified, SwapToPrice]);
	await deployer.deploy(UniswapV2Pair);
	await deployer.link(UniswapV2Pair, [UniswapV2Factory]);
	await deployer.deploy(UniswapV2Factory, DUMP_ADDRESS);
	await deployer.deploy(SafeERC20);
	await deployer.link(SafeERC20, [WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_yUSD, FRAXStablecoin, Pool_USDC, Pool_USDT, Pool_yUSD, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDT,StakingRewards_FRAX_USDC, StakingRewards_FRAX_yUSD, StakingRewards_FXS_WETH, StakingRewards_FXS_USDT, StakingRewards_FXS_USDC, StakingRewards_FXS_yUSD]);
	await deployer.deploy(FraxPoolLibrary);
	await deployer.link(FraxPoolLibrary, [Pool_USDC, Pool_USDT, Pool_yUSD]);
	await deployer.deploy(Owned, COLLATERAL_FRAX_AND_FXS_OWNER);
	await deployer.deploy(ChainlinkETHUSDPriceConsumerTest);
	await deployer.deploy(Timelock, TIMELOCK_ADMIN, TIMELOCK_DELAY);
	const timelockInstance = await Timelock.deployed();
	await deployer.deploy(FRAXStablecoin, "FRAX", COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fraxInstance = await FRAXStablecoin.deployed();
	await deployer.deploy(FRAXShares, "FXS", ONE_BILLION_DEC18, ORACLE_ADDRESS, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fxsInstance = await FRAXShares.deployed();

	// ======== Deploy the governance contract and its associated timelock ========
	console.log(chalk.yellow('===== DEPLOY THE GOVERNANCE CONTRACT ====='));
	await deployer.deploy(GovernorAlpha, timelockInstance.address, fxsInstance.address, GOVERNOR_GUARDIAN_ADDRESS);
	const governanceInstance = await GovernorAlpha.deployed();
	await governanceInstance.__setTimelockAddress(timelockInstance.address, { from: GOVERNOR_GUARDIAN_ADDRESS });
	
	// ======== Create the fake collateral ERC20 contracts ========
	console.log(chalk.yellow('===== FAKE COLLATERAL ====='));
	await deployer.deploy(WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
	await deployer.deploy(FakeCollateral_USDC, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "USDC", 18);
	await deployer.deploy(FakeCollateral_USDT, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "USDT", 18);
	await deployer.deploy(FakeCollateral_yUSD, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "yUSD", 18);
	const wethInstance = await WETH.deployed();
	const col_instance_USDC = await FakeCollateral_USDC.deployed(); 
	const col_instance_USDT = await FakeCollateral_USDT.deployed(); 
	const col_instance_yUSD = await FakeCollateral_yUSD.deployed(); 

	// ======== Deploy the router and the SwapToPrice ========
	console.log(chalk.yellow('===== DEPLOY THE ROUTER AND SWAPTOPRICE ====='));
	await deployer.deploy(UniswapV2Router02_Modified, UniswapV2Factory.address, WETH.address);
	const routerInstance = await UniswapV2Router02_Modified.deployed(); 
	const uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
	await deployer.deploy(SwapToPrice, uniswapFactoryInstance.address, routerInstance.address);

	// ======== Set the Uniswap pairs ========
	console.log(chalk.yellow('===== SET UNISWAP PAIRS ====='));
	await uniswapFactoryInstance.createPair(fraxInstance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(col_instance_USDT.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(col_instance_USDC.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Get the addresses of the pairs ========
	console.log(chalk.yellow('===== GET THE ADDRESSES OF THE PAIRS ====='));
	const pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(fraxInstance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(fraxInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDT = await uniswapFactoryInstance.getPair(fraxInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_yUSD = await uniswapFactoryInstance.getPair(fraxInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_USDC = await uniswapFactoryInstance.getPair(fxsInstance.address, FakeCollateral_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_USDT = await uniswapFactoryInstance.getPair(fxsInstance.address, FakeCollateral_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_yUSD = await uniswapFactoryInstance.getPair(fxsInstance.address, FakeCollateral_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(col_instance_USDT.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(col_instance_USDC.address, WETH.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Deploy the staking contracts ========
	console.log(chalk.yellow('===== DEPLOY THE STAKING CONTRACTS ====='));
	await deployer.link(FRAXStablecoin, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDT,StakingRewards_FRAX_USDC, StakingRewards_FRAX_yUSD, StakingRewards_FXS_WETH, StakingRewards_FXS_USDT, StakingRewards_FXS_USDC, StakingRewards_FXS_yUSD]);
	await deployer.link(StringHelpers, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDT,StakingRewards_FRAX_USDC, StakingRewards_FRAX_yUSD, StakingRewards_FXS_WETH, StakingRewards_FXS_USDT, StakingRewards_FXS_USDC, StakingRewards_FXS_yUSD]);
	await deployer.deploy(StakingRewards_FRAX_WETH, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_WETH, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FRAX_USDC, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_USDC, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FRAX_USDT, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_USDT, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FRAX_yUSD, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FRAX_yUSD, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FXS_WETH, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_WETH, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FXS_USDC, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_USDC, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FXS_USDT, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_USDT, FRAXStablecoin.address, timelockInstance.address);
	await deployer.deploy(StakingRewards_FXS_yUSD, STAKING_OWNER, STAKING_REWARDS_DISTRIBUTOR, fxsInstance.address, pair_addr_FXS_yUSD, FRAXStablecoin.address, timelockInstance.address);
	const stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
	const stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
	const stakingInstance_FRAX_USDT = await StakingRewards_FRAX_USDT.deployed();
	const stakingInstance_FRAX_yUSD = await StakingRewards_FRAX_yUSD.deployed();
	const stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
	const stakingInstance_FXS_USDC = await StakingRewards_FXS_USDC.deployed();
	const stakingInstance_FXS_USDT = await StakingRewards_FXS_USDT.deployed();
	const stakingInstance_FXS_yUSD = await StakingRewards_FXS_yUSD.deployed();

	// ======== Get instances of the pairs ========
	console.log(chalk.yellow('===== GET THE INSTANCES OF THE PAIRS ====='));
	const pair_instance_FRAX_WETH = await UniswapV2Pair.at(pair_addr_FRAX_WETH);
	const pair_instance_FRAX_USDC = await UniswapV2Pair.at(pair_addr_FRAX_USDC);
	const pair_instance_FRAX_USDT = await UniswapV2Pair.at(pair_addr_FRAX_USDT);
	const pair_instance_FRAX_yUSD = await UniswapV2Pair.at(pair_addr_FRAX_yUSD);
	const pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);
	const pair_instance_FXS_USDC = await UniswapV2Pair.at(pair_addr_FXS_USDC);
	const pair_instance_FXS_USDT = await UniswapV2Pair.at(pair_addr_FXS_USDT);
	const pair_instance_FXS_yUSD = await UniswapV2Pair.at(pair_addr_FXS_yUSD);
	const pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
	const pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

	// ======== Add allowances to the Uniswap Router ========
	console.log(chalk.yellow('===== ADD ALLOWANCES TO THE UNISWAP ROUTER ====='));
	await wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_USDC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_yUSD.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Spread some FXS around ========
	console.log(chalk.yellow('===== SPREAD SOME FXS AROUND ====='));
	// Transfer 1,000,000 FXS each to various accounts
	await fxsInstance.transfer(accounts[1], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[2], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[3], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[4], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[5], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[6], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[7], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[8], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(accounts[9], new BigNumber(ONE_MILLION_DEC18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// Transfer 1,000,000 FXS each to the staking contracts
	await fxsInstance.transfer(stakingInstance_FRAX_WETH.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FRAX_USDC.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FRAX_USDT.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FRAX_yUSD.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FXS_WETH.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FXS_USDC.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FXS_USDT.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fxsInstance.transfer(stakingInstance_FXS_yUSD.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Add liquidity to the pairs so the oracle constructor doesn't error  ========
	// Initially, all prices will be 1:1, but that can be changed in further testing via arbitrage simulations to a known price
	console.log(chalk.yellow('===== ADDING LIQUIDITY TO THE PAIRS ====='));

	const weth_balance_superowner = (new BigNumber(await wethInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
	console.log("weth_balance_superowner: ", weth_balance_superowner);

	// Handle FRAX / WETH
	// Normally you would use addLiquidityETH here
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		WETH.address,
		new BigNumber(323000e18), 
		new BigNumber(1000e18), 
		new BigNumber(323000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / USDC
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		col_instance_USDC.address,
		new BigNumber(1050e18), 
		new BigNumber(1000e18), 
		new BigNumber(1050e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / USDT
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		col_instance_USDT.address,
		new BigNumber(995e18), 
		new BigNumber(1000e18), 
		new BigNumber(995e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / yUSD
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		col_instance_yUSD.address,
		new BigNumber(1010e18), 
		new BigNumber(1000e18), 
		new BigNumber(1010e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / WETH
	// Normally you would use addLiquidityETH here
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		WETH.address,
		new BigNumber(1615000e18), 
		new BigNumber(1000e18), 
		new BigNumber(1615000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / USDC
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		col_instance_USDC.address,
		new BigNumber(4950e18), 
		new BigNumber(1000e18), 
		new BigNumber(4950e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / USDT
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		col_instance_USDT.address,
		new BigNumber(5050e18), 
		new BigNumber(1000e18), 
		new BigNumber(5050e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FXS / yUSD
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		col_instance_yUSD.address,
		new BigNumber(5010e18), 
		new BigNumber(1000e18), 
		new BigNumber(5010e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Normally, you would use addLiquidityETH
	// Handle USDT / WETH
	await routerInstance.addLiquidity(
		col_instance_USDT.address, 
		WETH.address,
		new BigNumber(300000e18), 
		new BigNumber(1000e18), 
		new BigNumber(300000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle USDC / WETH
	await routerInstance.addLiquidity(
		col_instance_USDC.address, 
		WETH.address,
		new BigNumber(300000e18), 
		new BigNumber(1000e18), 
		new BigNumber(300000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// ======== Set the Uniswap oracles ========
	console.log(chalk.yellow('===== UNISWAP ORACLES ====='));
	await deployer.deploy(UniswapPairOracle_FRAX_WETH, uniswapFactoryInstance.address, fraxInstance.address, WETH.address);
	await deployer.deploy(UniswapPairOracle_FRAX_USDC, uniswapFactoryInstance.address, fraxInstance.address, col_instance_USDC.address);
	await deployer.deploy(UniswapPairOracle_FRAX_USDT, uniswapFactoryInstance.address, fraxInstance.address, col_instance_USDT.address);
	await deployer.deploy(UniswapPairOracle_FRAX_yUSD, uniswapFactoryInstance.address, fraxInstance.address, col_instance_yUSD.address);
	await deployer.deploy(UniswapPairOracle_FXS_WETH, uniswapFactoryInstance.address, fxsInstance.address, WETH.address);
	await deployer.deploy(UniswapPairOracle_FXS_USDC, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDC.address);
	await deployer.deploy(UniswapPairOracle_FXS_USDT, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDT.address);
	await deployer.deploy(UniswapPairOracle_FXS_yUSD, uniswapFactoryInstance.address, fxsInstance.address, col_instance_yUSD.address);
	await deployer.deploy(UniswapPairOracle_USDT_WETH, uniswapFactoryInstance.address, col_instance_USDT.address, WETH.address);
	await deployer.deploy(UniswapPairOracle_USDC_WETH, uniswapFactoryInstance.address, col_instance_USDC.address, WETH.address);

	// ======== Set the Frax Pools ========
	console.log(chalk.yellow('===== FRAX POOLS ====='));
	await deployer.link(StringHelpers, [Pool_USDC, Pool_USDT, Pool_yUSD]);
	await deployer.deploy(Pool_USDC, col_instance_USDC.address, UniswapPairOracle_FRAX_USDC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_USDT, col_instance_USDT.address, UniswapPairOracle_FRAX_USDT.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_yUSD, col_instance_yUSD.address, UniswapPairOracle_FRAX_yUSD.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18); 

	// Uniswap Test Swap
	await deployer.deploy(TestSwap, col_instance_USDT.address, WETH.address, UniswapV2Router02_Modified.address);

	// ======== Get the pool instances ========
	console.log(chalk.yellow('===== POOL INSTANCES ====='));
	const pool_instance_USDC = await Pool_USDC.deployed();
	const pool_instance_USDT = await Pool_USDT.deployed();
	const pool_instance_yUSD = await Pool_yUSD.deployed();

	// ======== Set FraxPool various private variables ========
	console.log(chalk.yellow('===== FRAXPOOL PRIVATE VARIABLES ====='));
	// USDC
	await pool_instance_USDC.setFRAXAddress(fraxInstance.address, { from: POOL_CREATOR });
	await pool_instance_USDC.setFXSAddress(fxsInstance.address, { from: POOL_CREATOR });

	// USDT
	await pool_instance_USDT.setFRAXAddress(fraxInstance.address, { from: POOL_CREATOR });
	await pool_instance_USDT.setFXSAddress(fxsInstance.address, { from: POOL_CREATOR });

	// yUSD
	await pool_instance_yUSD.setFRAXAddress(fraxInstance.address, { from: POOL_CREATOR });
	await pool_instance_yUSD.setFXSAddress(fxsInstance.address, { from: POOL_CREATOR });

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
	const oracle_instance_FRAX_yUSD = await UniswapPairOracle_FRAX_yUSD.deployed(); 
	const oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
	const oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed(); 
	const oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed(); 
	const oracle_instance_FXS_yUSD = await UniswapPairOracle_FXS_yUSD.deployed(); 
	const oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();

	// Initialize ETH-USD Chainlink Oracle too
	const oracle_chainlink_ETH_USD_TEST = await ChainlinkETHUSDPriceConsumerTest.deployed();

	// ======== Link FRAX oracles ========
	console.log(chalk.yellow('===== LINK FRAX ORACLES ====='));

	// Link the FRAX oracles
	await fraxInstance.setFRAXEthOracle(oracle_instance_FRAX_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addStablecoinOracle(0, oracle_instance_FRAX_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addStablecoinOracle(0, oracle_instance_FRAX_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addStablecoinOracle(0, oracle_instance_FRAX_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pool_instance_USDT.setCollatETHOracle(oracle_instance_USDT_WETH.address, wethInstance.address, { from: POOL_CREATOR });
	await pool_instance_USDC.setCollatETHOracle(oracle_instance_USDC_WETH.address, wethInstance.address, { from: POOL_CREATOR });

	// ======== Link FXS oracles ========
	console.log(chalk.yellow('===== LINK FXS ORACLES ====='));

	// Link the FXS oracles
	await fraxInstance.setFXSEthOracle(oracle_instance_FXS_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addStablecoinOracle(1, oracle_instance_FXS_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addStablecoinOracle(1, oracle_instance_FXS_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addStablecoinOracle(1, oracle_instance_FXS_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Set the Chainlink oracle ========
	console.log(chalk.yellow('===== SET THE CHAINLINK ORACLE ====='));

	// Add the ETH / USD Chainlink oracle too
	await fraxInstance.setETHUSDOracle(oracle_chainlink_ETH_USD_TEST.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Update the prices ========
	console.log(chalk.yellow('===== UPDATE THE PRICES ====='));
	// Advance 24 hrs so the period can be computed
	await time.increase(86400 + 1);
	await time.advanceBlock();

	// Make sure the prices are updated
	await oracle_instance_FRAX_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FRAX_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FRAX_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FRAX_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FXS_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FXS_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FXS_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FXS_yUSD.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	// ======== Set FRAX FXS address ========
	console.log(chalk.yellow('===== FRAX FXS ADDRESS ====='));
	// Link the FAKE collateral pool to the FRAX contract
	await fraxInstance.setFXSAddress(fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Set FRAX collateral pools ========
	console.log(chalk.yellow('===== FRAX COLLATERAL POOL ====='));
	// Link the FAKE collateral pool to the FRAX contract
	await fraxInstance.addPool(pool_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addPool(pool_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addPool(pool_instance_yUSD.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Set the FRAX address inside of the FXS contract ========
	console.log(chalk.yellow('===== SET FRAX ADDRESS ====='));
	// Link the FRAX contract to the FXS contract
	await fxsInstance.setFRAXAddress(fraxInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Display prices ========
	console.log(chalk.yellow('===== DISPLAY PRICES ====='));

	// Get the prices
	let frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	let frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
	let frax_price_from_FRAX_USDT = (new BigNumber(await oracle_instance_FRAX_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
	let frax_price_from_FRAX_yUSD = (new BigNumber(await oracle_instance_FRAX_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_USDT = (new BigNumber(await oracle_instance_FXS_USDT.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_yUSD = (new BigNumber(await oracle_instance_FXS_yUSD.consult.call(FakeCollateral_yUSD.address, 1e6))).div(BIG6).toNumber();
	let USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(FakeCollateral_USDT.address, 1e6))).div(BIG6).toNumber();
	let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(FakeCollateral_USDC.address, 1e6))).div(BIG6).toNumber();
	const frax_price_initial = new BigNumber(await fraxInstance.frax_price({ from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6);
	const fxs_price_initial = new BigNumber(await fraxInstance.fxs_price({ from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6);

	// Print the new prices
	console.log("frax_price_initial: ", frax_price_initial.toString() , " FRAX = 1 USD");
	console.log("fxs_price_initial: ", fxs_price_initial.toString(), " FXS = 1 USD");
	console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
	console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), " FRAX = 1 USDC");
	console.log("frax_price_from_FRAX_USDT: ", frax_price_from_FRAX_USDT.toString(), " FRAX = 1 USDT");
	console.log("frax_price_from_FRAX_yUSD: ", frax_price_from_FRAX_yUSD.toString(), " FRAX = 1 yUSD");
	console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), " FXS = 1 WETH");
	console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), " FXS = 1 USDC");
	console.log("fxs_price_from_FXS_USDT: ", fxs_price_from_FXS_USDT.toString(), " FXS = 1 USDT");
	console.log("fxs_price_from_FXS_yUSD: ", fxs_price_from_FXS_yUSD.toString(), " FXS = 1 yUSD");
	console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
	console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");

	// ======== Transfer some tokens and ETH to Metamask ========
	console.log(chalk.yellow('===== TRANSFER SOME TOKENS AND ETH TO METAMASK ====='));
	// ETH
	await fxsInstance.transfer(METAMASK_ADDRESS, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// FRAX and FXS
	await fxsInstance.transfer(METAMASK_ADDRESS, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.transfer(METAMASK_ADDRESS, new BigNumber("777e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// Collateral 
	await wethInstance.transfer(METAMASK_ADDRESS, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_USDC.transfer(METAMASK_ADDRESS, new BigNumber("2000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_USDT.transfer(METAMASK_ADDRESS, new BigNumber("3000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await col_instance_yUSD.transfer(METAMASK_ADDRESS, new BigNumber("4000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// Liquidity tokens
	await pair_instance_FRAX_WETH.transfer(METAMASK_ADDRESS, new BigNumber("200e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FRAX_USDC.transfer(METAMASK_ADDRESS, new BigNumber("210e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FRAX_USDT.transfer(METAMASK_ADDRESS, new BigNumber("220e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FRAX_yUSD.transfer(METAMASK_ADDRESS, new BigNumber("230e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_WETH.transfer(METAMASK_ADDRESS, new BigNumber("240e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_USDC.transfer(METAMASK_ADDRESS, new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_USDT.transfer(METAMASK_ADDRESS, new BigNumber("260e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_yUSD.transfer(METAMASK_ADDRESS, new BigNumber("270e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Initialize the staking rewards ========
	await stakingInstance_FRAX_WETH.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FRAX_USDC.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FRAX_USDT.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FRAX_yUSD.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FXS_WETH.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FXS_USDC.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FXS_USDT.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FXS_yUSD.initializeDefault({ from: STAKING_OWNER });


	// ======== Seed the collateral pools ========
	console.log(chalk.yellow('===== SEED THE COLLATERAL POOL ====='));


	// IF YOU ARE RUNNING MOCHA TESTS, SET THIS GROUP TO FALSE!
	// IF YOU ARE RUNNING MOCHA TESTS, SET THIS GROUP TO FALSE!
	// IF YOU ARE RUNNING MOCHA TESTS, SET THIS GROUP TO FALSE!
	if (false){
		await col_instance_USDC.transfer(pool_instance_USDC.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.transfer(pool_instance_USDT.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_yUSD.transfer(pool_instance_yUSD.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// ======== Advance a block and 24 hours to catch things up ========
		await time.increase(86400 + 1);
		await time.advanceBlock();
		await fraxInstance.refreshCollateralRatio();
	
		// ======== Make some governance proposals ========
	
		// Minting fee 0.04% -> 0.1%
		await governanceInstance.propose(
			[fraxInstance.address],
			[0],
			['setMintingFee(uint256)'],
			[web3.eth.abi.encodeParameters(['uint256'], [1000])], // 0.1%
			"Minting fee increase",
			"I hereby propose to increase the minting fee from 0.04% to 0.1%",
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
		
		// Redemption fee 0.04% -> 0.08%
		await governanceInstance.propose(
			[fraxInstance.address],
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
	
		// Advance one block so voting can begin
		await time.increase(15);
		await time.advanceBlock();
	
		await governanceInstance.castVote(1, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await governanceInstance.castVote(2, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await governanceInstance.castVote(3, true, { from: STAKING_REWARDS_DISTRIBUTOR });
	
		// ======== Advance a block and 24 hours to catch things up ========
		await time.increase(86400 + 1);
		await time.advanceBlock();
	}
	

	// ======== Note the addresses ========
	// If you are testing the frontend, you need to copy-paste the output of CONTRACT_ADDRESSES to the frontend src/misc/constants.tsx
	let CONTRACT_ADDRESSES = {
		ganache: {
			main: {
				FRAX: fraxInstance.address,
				FXS: fxsInstance.address
			},
			oracles: {
				FRAX_WETH: oracle_instance_FRAX_WETH.address,
				FRAX_USDC: oracle_instance_FRAX_USDC.address,
				FRAX_USDT: oracle_instance_FRAX_USDT.address,
				FRAX_yUSD: oracle_instance_FRAX_yUSD.address,
				FXS_WETH: oracle_instance_FXS_WETH.address,
				FXS_USDC: oracle_instance_FXS_USDC.address,
				FXS_USDT: oracle_instance_FXS_USDT.address,
				FXS_yUSD: oracle_instance_FXS_yUSD.address,
				USDT_WETH: oracle_instance_USDT_WETH.address,
				USDC_WETH: oracle_instance_USDC_WETH.address
			},
			collateral: {
				USDC: col_instance_USDC.address,
				USDT: col_instance_USDT.address,
				yUSD: col_instance_yUSD.address,
			},
			governance: governanceInstance.address,
			pools: {
				USDC: pool_instance_USDC.address,
				USDT: pool_instance_USDT.address,
				yUSD: pool_instance_yUSD.address,
			},
			stake_tokens: {
				'Uniswap FRAX/WETH': pair_instance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': pair_instance_FRAX_USDC.address,
				'Uniswap FRAX/USDT': pair_instance_FRAX_USDT.address,
				'Uniswap FRAX/yUSD': pair_instance_FRAX_yUSD.address,
				'Uniswap FXS/WETH': pair_instance_FXS_WETH.address,
				'Uniswap FXS/USDC': pair_instance_FXS_USDC.address,
				'Uniswap FXS/USDT': pair_instance_FXS_USDT.address,
				'Uniswap FXS/yUSD': pair_instance_FXS_yUSD.address,
			},
			staking_contracts_for_tokens: {
				'Uniswap FRAX/WETH': stakingInstance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': stakingInstance_FRAX_USDC.address,
				'Uniswap FRAX/USDT': stakingInstance_FRAX_USDT.address,
				'Uniswap FRAX/yUSD': stakingInstance_FRAX_yUSD.address,
				'Uniswap FXS/WETH': stakingInstance_FXS_WETH.address,
				'Uniswap FXS/USDC': stakingInstance_FXS_USDC.address,
				'Uniswap FXS/USDT': stakingInstance_FXS_USDT.address,
				'Uniswap FXS/yUSD': stakingInstance_FXS_yUSD.address,
			}
		}      
	}

	console.log("CONTRACT_ADDRESSES: ", CONTRACT_ADDRESSES);

	// deployer.deploy(UniswapPairOracle);
	console.log(`==========================================================`);
};