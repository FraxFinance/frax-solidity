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
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");

const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");

const UniswapPairOracle_USDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDT_WETH");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracle_6DEC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_6DEC_WETH");

// Chainlink Price Consumer
// const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
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
//const StakingRewards_FRAX_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FRAX_USDT.sol");

const StakingRewards_FXS_WETH = artifacts.require("Staking/Variants/Stake_FXS_WETH.sol");
//const StakingRewards_FXS_USDC = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDC.sol");
//const StakingRewards_FXS_USDT = artifacts.require("Staking/Fake_Stakes/Stake_FXS_USDT.sol");

const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");

// Token vesting contract
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

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
	const ONE_HUNDRED_MILLION_DEC6 = new BigNumber("100000000e6");
	const ONE_BILLION_DEC18 = new BigNumber("1000000000e18");
	const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
	
	const REDEMPTION_FEE = 400; // 0.04%
	const MINTING_FEE = 300; // 0.03%
	const COLLATERAL_PRICE = 1040000; // $1.04
	const FRAX_PRICE = 980000; // $0.98
	const FXS_PRICE = 210000; // $0.21
	const TIMELOCK_DELAY = 86400 * 2; // 2 days
	const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
	const METAMASK_ADDRESS = "0x69863CDD8a25Bae9a57271f7a29a76764da87F1a";

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
	await deployer.link(FixedPoint, [UniswapV2OracleLibrary, UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDT, UniswapPairOracle_FXS_USDC, UniswapPairOracle_USDT_WETH, UniswapPairOracle_USDC_WETH, UniswapPairOracle_6DEC_WETH]);
	await deployer.link(Address, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_6DEC]);
	await deployer.deploy(Math);
	await deployer.link(Math, [StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FXS_WETH, StakingRewards_FRAX_FXS, UniswapV2ERC20, UniswapV2Pair]);
	await deployer.deploy(SafeMath);
	await deployer.link(SafeMath, [ERC20, ERC20Custom, SafeERC20, WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_6DEC, FRAXStablecoin, Pool_USDC, Pool_USDT, Pool_6DEC, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FXS_WETH, StakingRewards_FRAX_FXS, UniswapV2ERC20, UniswapV2Library, UniswapV2Router02_Modified, SwapToPrice, Timelock]);
	await deployer.deploy(TransferHelper);
	await deployer.link(TransferHelper, [UniswapV2Router02_Modified, SwapToPrice, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FXS_WETH, StakingRewards_FRAX_FXS, Pool_USDC, Pool_USDT, Pool_6DEC]);
	await deployer.deploy(UniswapV2ERC20);
	await deployer.link(UniswapV2ERC20, [UniswapV2Pair]);
	await deployer.deploy(UniswapV2OracleLibrary);
	await deployer.link(UniswapV2OracleLibrary, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDT, UniswapPairOracle_FXS_USDC, UniswapPairOracle_USDT_WETH, UniswapPairOracle_USDC_WETH, UniswapPairOracle_6DEC_WETH]);
	await deployer.deploy(UniswapV2Library);
	await deployer.link(UniswapV2Library, [UniswapPairOracle_FRAX_WETH, UniswapPairOracle_FRAX_USDT, UniswapPairOracle_FRAX_USDC, UniswapPairOracle_FXS_WETH, UniswapPairOracle_FXS_USDT, UniswapPairOracle_FXS_USDC, UniswapPairOracle_USDT_WETH, UniswapPairOracle_USDC_WETH, UniswapPairOracle_6DEC_WETH, UniswapV2Router02_Modified, SwapToPrice]);
	await deployer.deploy(UniswapV2Pair);
	await deployer.link(UniswapV2Pair, [UniswapV2Factory]);
	await deployer.deploy(UniswapV2Factory, DUMP_ADDRESS);
	await deployer.deploy(SafeERC20);
	await deployer.link(SafeERC20, [WETH, FakeCollateral_USDC, FakeCollateral_USDT, FakeCollateral_6DEC, FRAXStablecoin, Pool_USDC, Pool_USDT, Pool_6DEC, FRAXShares, StakingRewards_FRAX_WETH, StakingRewards_FRAX_USDC, StakingRewards_FXS_WETH, StakingRewards_FRAX_FXS]);
	await deployer.deploy(FraxPoolLibrary);
	await deployer.link(FraxPoolLibrary, [Pool_USDC, Pool_USDT, Pool_6DEC]);
	await deployer.deploy(Owned, COLLATERAL_FRAX_AND_FXS_OWNER);
	await deployer.deploy(ChainlinkETHUSDPriceConsumerTest);
	await deployer.deploy(Timelock, TIMELOCK_ADMIN, TIMELOCK_DELAY);
	const timelockInstance = await Timelock.deployed();
	await deployer.deploy(FRAXStablecoin, "FRAX", COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fraxInstance = await FRAXStablecoin.deployed();
	await deployer.deploy(FRAXShares, "FXS", ORACLE_ADDRESS, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	const fxsInstance = await FRAXShares.deployed();

	// ======== Deploy the governance contract and its associated timelock ========
	console.log(chalk.yellow('===== DEPLOY THE GOVERNANCE CONTRACT ====='));
	await deployer.deploy(GovernorAlpha, timelockInstance.address, fxsInstance.address, GOVERNOR_GUARDIAN_ADDRESS);
	const governanceInstance = await GovernorAlpha.deployed();
	await governanceInstance.__setTimelockAddress(timelockInstance.address, { from: GOVERNOR_GUARDIAN_ADDRESS });

	// ======== Set the Governance contract as the timelock admin ========
	console.log(chalk.yellow('===== SET THE GOVERNANCE CONTRACT AS THE TIMELOCK ADMIN ====='));
	console.log("GOVERNANCE_ADDRESS [BEFORE]: ", governanceInstance.address );
	let timelock_admin_address = await timelockInstance.admin.call();
	console.log("timelock_admin [BEFORE]: ", timelock_admin_address)

	// // Give control from TIMELOCK_ADMIN to GovernorAlpha
	const current_timestamp = (await time.latest()).toNumber();
	const timelock_delay = (await timelockInstance.delay.call()).toNumber();

	console.log("timelock_delay: ", timelock_delay);
	console.log("current_timestamp: ", current_timestamp);
	console.log("current_timestamp + timelock_delay: ", current_timestamp + timelock_delay);

	const tx_nugget = [
		timelockInstance.address, 
		0, 
		"setPendingAdmin(address)",
		web3.eth.abi.encodeParameters(['address'], [governanceInstance.address]),
		current_timestamp + timelock_delay,
		{ from: TIMELOCK_ADMIN }
	]
	await timelockInstance.queueTransaction(...tx_nugget);

	// Advance timelock_delay until the timelock is done
	await time.increase(timelock_delay + 1);
	await time.advanceBlock();

	await timelockInstance.executeTransaction(...tx_nugget);

	await governanceInstance.__acceptAdmin({ from: GOVERNOR_GUARDIAN_ADDRESS });

	timelock_admin_address = await timelockInstance.admin.call();
	console.log("timelock_admin [AFTER]: ", timelock_admin_address)
	

	// ======== Set FRAX FXS address ========
	console.log(chalk.yellow('===== FRAX FXS ADDRESS ====='));
	// Link the FXS contract to the FRAX contract
	await fraxInstance.setFXSAddress(fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	// ======== Create the fake collateral ERC20 contracts ========
	console.log(chalk.yellow('===== FAKE COLLATERAL ====='));
	await deployer.deploy(WETH, COLLATERAL_FRAX_AND_FXS_OWNER);
	await deployer.deploy(FakeCollateral_USDC, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "USDC", 18);
	await deployer.deploy(FakeCollateral_USDT, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC18, "USDT", 18);
	await deployer.deploy(FakeCollateral_6DEC, COLLATERAL_FRAX_AND_FXS_OWNER, ONE_HUNDRED_MILLION_DEC6, "6DEC", 6);
	const wethInstance = await WETH.deployed();
	const col_instance_USDC = await FakeCollateral_USDC.deployed(); 
	const col_instance_USDT = await FakeCollateral_USDT.deployed(); 
	const col_instance_6DEC = await FakeCollateral_6DEC.deployed();
	

	// ======== Deploy the router and the SwapToPrice ========
	console.log(chalk.yellow('===== DEPLOY THE ROUTER AND SWAPTOPRICE ====='));
	await deployer.deploy(UniswapV2Router02_Modified, UniswapV2Factory.address, wethInstance.address);
	const routerInstance = await UniswapV2Router02_Modified.deployed(); 
	const uniswapFactoryInstance = await UniswapV2Factory.deployed(); 
	await deployer.deploy(SwapToPrice, uniswapFactoryInstance.address, routerInstance.address);
	let swapToPriceInstance = await SwapToPrice.deployed(); 

	// ======== Set the Uniswap pairs ========
	console.log(chalk.yellow('===== SET UNISWAP PAIRS ====='));
	await uniswapFactoryInstance.createPair(fraxInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await uniswapFactoryInstance.createPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fxsInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await uniswapFactoryInstance.createPair(col_instance_USDT.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(col_instance_6DEC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await uniswapFactoryInstance.createPair(fraxInstance.address, fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Get the addresses of the pairs ========
	console.log(chalk.yellow('===== GET THE ADDRESSES OF THE PAIRS ====='));
	const pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(fraxInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(fraxInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FRAX_USDT = await uniswapFactoryInstance.getPair(fraxInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	const pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(fxsInstance.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_USDC = await uniswapFactoryInstance.getPair(fxsInstance.address, col_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_FXS_USDT = await uniswapFactoryInstance.getPair(fxsInstance.address, col_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	const pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(col_instance_USDT.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(col_instance_USDC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	const pair_addr_6DEC_WETH = await uniswapFactoryInstance.getPair(col_instance_6DEC.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	const pair_addr_FRAX_FXS = await uniswapFactoryInstance.getPair(fraxInstance.address, fxsInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

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
	
	const stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
	const stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
	//const stakingInstance_FRAX_USDT = await StakingRewards_FRAX_USDT.deployed();
	
	const stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
	//const stakingInstance_FXS_USDC = await StakingRewards_FXS_USDC.deployed();
	//const stakingInstance_FXS_USDT = await StakingRewards_FXS_USDT.deployed();
	
	const stakingInstance_FRAX_FXS = await StakingRewards_FRAX_FXS.deployed();

	// ======== Get instances of the pairs ========
	console.log(chalk.yellow('===== GET THE INSTANCES OF THE PAIRS ====='));
	const pair_instance_FRAX_WETH = await UniswapV2Pair.at(pair_addr_FRAX_WETH);
	const pair_instance_FRAX_USDC = await UniswapV2Pair.at(pair_addr_FRAX_USDC);
	const pair_instance_FRAX_USDT = await UniswapV2Pair.at(pair_addr_FRAX_USDT);
	
	const pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);
	const pair_instance_FXS_USDC = await UniswapV2Pair.at(pair_addr_FXS_USDC);
	const pair_instance_FXS_USDT = await UniswapV2Pair.at(pair_addr_FXS_USDT);
	
	const pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
	const pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);
	const pair_instance_6DEC_WETH = await UniswapV2Pair.at(pair_addr_6DEC_WETH);

	const pair_instance_FRAX_FXS = await UniswapV2Pair.at(pair_addr_FRAX_FXS);

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
	// Advance 1 hr to catch things up
	await time.increase(3600 + 1);
	await time.advanceBlock();

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
	//await fxsInstance.transfer(stakingInstance_FRAX_USDT.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await fxsInstance.transfer(stakingInstance_FXS_WETH.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	//await fxsInstance.transfer(stakingInstance_FXS_USDC.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	//await fxsInstance.transfer(stakingInstance_FXS_USDT.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await fxsInstance.transfer(stakingInstance_FRAX_FXS.address, new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Add liquidity to the pairs so the oracle constructor doesn't error  ========
	// Initially, all prices will be 1:1, but that can be changed in further testing via arbitrage simulations to a known price
	console.log(chalk.yellow('===== ADDING LIQUIDITY TO THE PAIRS ====='));

	// const weth_balance_superowner = (new BigNumber(await wethInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))).div(BIG18).toNumber();
	// console.log("weth_balance_superowner: ", weth_balance_superowner);

	// Handle FRAX / WETH
	// Normally you would use addLiquidityETH here
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		wethInstance.address,
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		new BigNumber(392000e18), 
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

	// Handle FXS / WETH
	// Normally you would use addLiquidityETH here
	await routerInstance.addLiquidity(
		fxsInstance.address, 
		wethInstance.address,
		new BigNumber(1955000e18), 
		new BigNumber(1000e18), 
		new BigNumber(1955000e18), 
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

	// Normally, you would use addLiquidityETH
	// Handle USDT / WETH
	await routerInstance.addLiquidity(
		col_instance_USDT.address, 
		wethInstance.address,
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle USDC / WETH
	await routerInstance.addLiquidity(
		col_instance_USDC.address, 
		wethInstance.address,
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle 6DEC / WETH
	await routerInstance.addLiquidity(
		col_instance_6DEC.address, 
		wethInstance.address,
		new BigNumber(392000e6), 
		new BigNumber(1000e18), 
		new BigNumber(392000e6), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Handle FRAX / FXS
	await routerInstance.addLiquidity(
		fraxInstance.address, 
		fxsInstance.address,
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		new BigNumber(392000e18), 
		new BigNumber(1000e18), 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		new BigNumber(2105300114), 
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	);

	// Advance 1 hr to catch things up
	await time.increase(3600 + 1);
	await time.advanceBlock();

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
	
	await deployer.deploy(UniswapPairOracle_FXS_WETH, uniswapFactoryInstance.address, fxsInstance.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FXS_USDC, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDC.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_FXS_USDT, uniswapFactoryInstance.address, fxsInstance.address, col_instance_USDT.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	
	await deployer.deploy(UniswapPairOracle_USDT_WETH, uniswapFactoryInstance.address, col_instance_USDT.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_USDC_WETH, uniswapFactoryInstance.address, col_instance_USDC.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);
	await deployer.deploy(UniswapPairOracle_6DEC_WETH, uniswapFactoryInstance.address, col_instance_6DEC.address, wethInstance.address, COLLATERAL_FRAX_AND_FXS_OWNER, timelockInstance.address);

	// ======== Set the Frax Pools ========
	console.log(chalk.yellow('===== FRAX POOLS ====='));
	await deployer.link(StringHelpers, [Pool_USDC, Pool_USDT, Pool_6DEC]);
	// await deployer.deploy(Pool_USDC, fraxInstance.address, fxsInstance.address, col_instance_USDC.address, UniswapPairOracle_FRAX_USDC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	// await deployer.deploy(Pool_USDT, fraxInstance.address, fxsInstance.address, col_instance_USDT.address, UniswapPairOracle_FRAX_USDT.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_USDC, fraxInstance.address, fxsInstance.address, col_instance_USDC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_USDT, fraxInstance.address, fxsInstance.address, col_instance_USDT.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	await deployer.deploy(Pool_6DEC, fraxInstance.address, fxsInstance.address, col_instance_6DEC.address, POOL_CREATOR, timelockInstance.address, FIVE_MILLION_DEC18);
	
	

	
	// ======== Get the pool instances ========
	console.log(chalk.yellow('===== POOL INSTANCES ====='));
	const pool_instance_USDC = await Pool_USDC.deployed();
	const pool_instance_USDT = await Pool_USDT.deployed();
	const pool_instance_6DEC = await Pool_6DEC.deployed();
	

	// ======== Set FraxPool various private variables ======== (DEPRECATED)
	//console.log(chalk.yellow('===== FRAXPOOL PRIVATE VARIABLES ====='));
	// USDC
	//await pool_instance_USDC.setFRAXAddress(fraxInstance.address, { from: POOL_CREATOR });
	//await pool_instance_USDC.setFXSAddress(fxsInstance.address, { from: POOL_CREATOR });

	// USDT
	//await pool_instance_USDT.setFRAXAddress(fraxInstance.address, { from: POOL_CREATOR });
	//await pool_instance_USDT.setFXSAddress(fxsInstance.address, { from: POOL_CREATOR });


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
	
	const oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
	const oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed(); 
	const oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed(); 
	
	const oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
	const oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
	const oracle_instance_6DEC_WETH = await UniswapPairOracle_6DEC_WETH.deployed();

	// Initialize ETH-USD Chainlink Oracle too
	const oracle_chainlink_ETH_USD_TEST = await ChainlinkETHUSDPriceConsumerTest.deployed();

	// ======== Link FRAX oracles ========
	console.log(chalk.yellow('===== LINK FRAX ORACLES ====='));

	// Link the FRAX oracles
	await fraxInstance.setFRAXEthOracle(oracle_instance_FRAX_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	//await fraxInstance.addStablecoinOracle(0, oracle_instance_FRAX_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	//await fraxInstance.addStablecoinOracle(0, oracle_instance_FRAX_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	await pool_instance_USDT.setCollatETHOracle(oracle_instance_USDT_WETH.address, wethInstance.address, { from: POOL_CREATOR });
	await pool_instance_USDC.setCollatETHOracle(oracle_instance_USDC_WETH.address, wethInstance.address, { from: POOL_CREATOR });
	await pool_instance_6DEC.setCollatETHOracle(oracle_instance_6DEC_WETH.address, wethInstance.address, { from: POOL_CREATOR });


	// ======== Link FXS oracles ========
	console.log(chalk.yellow('===== LINK FXS ORACLES ====='));

	// Link the FXS oracles
	await fraxInstance.setFXSEthOracle(oracle_instance_FXS_WETH.address, wethInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	//await fraxInstance.addStablecoinOracle(1, oracle_instance_FXS_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	//await fraxInstance.addStablecoinOracle(1, oracle_instance_FXS_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	

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
	
	await oracle_instance_FXS_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FXS_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_FXS_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	

	await oracle_instance_USDT_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_USDC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await oracle_instance_6DEC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
	// Advance 24 hrs so the period can be computed
	await time.increase(86400 + 1);
	await time.advanceBlock();
	
	// ======== Set FRAX collateral pools ========
	console.log(chalk.yellow('===== FRAX COLLATERAL POOL ====='));
	// Link the FAKE collateral pool to the FRAX contract
	await fraxInstance.addPool(pool_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addPool(pool_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await fraxInstance.addPool(pool_instance_6DEC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	

	// ======== Set the FRAX address inside of the FXS contract ========
	console.log(chalk.yellow('===== SET FRAX ADDRESS ====='));
	// Link the FRAX contract to the FXS contract
	await fxsInstance.setFRAXAddress(fraxInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Display prices ========
	console.log(chalk.yellow('===== DISPLAY PRICES ====='));

	// Get the prices
	let frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	let frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(col_instance_USDC.address, 1e6))).div(BIG6).toNumber();
	let frax_price_from_FRAX_USDT = (new BigNumber(await oracle_instance_FRAX_USDT.consult.call(col_instance_USDT.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(col_instance_USDC.address, 1e6))).div(BIG6).toNumber();
	let fxs_price_from_FXS_USDT = (new BigNumber(await oracle_instance_FXS_USDT.consult.call(col_instance_USDT.address, 1e6))).div(BIG6).toNumber();
	let USDT_price_from_USDT_WETH = (new BigNumber(await oracle_instance_USDT_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	let DEC6_price_from_DEC6_WETH = (new BigNumber(await oracle_instance_6DEC_WETH.consult.call(wethInstance.address, 1e12))).toNumber();
	const frax_price_initial = new BigNumber(await fraxInstance.frax_price({ from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6);
	const fxs_price_initial = new BigNumber(await fraxInstance.fxs_price({ from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6);

	// Print the new prices
	console.log("frax_price_initial: ", frax_price_initial.toString() , " USD = 1 FRAX");
	console.log("fxs_price_initial: ", fxs_price_initial.toString(), " USD = 1 FXS");
	console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), " FRAX = 1 WETH");
	console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), " FRAX = 1 USDC");
	console.log("frax_price_from_FRAX_USDT: ", frax_price_from_FRAX_USDT.toString(), " FRAX = 1 USDT");
	console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), " FXS = 1 WETH");
	console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), " FXS = 1 USDC");
	console.log("fxs_price_from_FXS_USDT: ", fxs_price_from_FXS_USDT.toString(), " FXS = 1 USDT");
	console.log("USDT_price_from_USDT_WETH: ", USDT_price_from_USDT_WETH.toString(), " USDT = 1 WETH");
	console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), " USDC = 1 WETH");
	console.log("6DEC_price_from_6DEC_WETH: ", DEC6_price_from_DEC6_WETH.toString(), " 6DEC = 1 WETH");

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

	// Liquidity tokens
	await pair_instance_FRAX_WETH.transfer(METAMASK_ADDRESS, new BigNumber("200e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FRAX_USDC.transfer(METAMASK_ADDRESS, new BigNumber("210e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FRAX_USDT.transfer(METAMASK_ADDRESS, new BigNumber("220e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_WETH.transfer(METAMASK_ADDRESS, new BigNumber("240e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_USDC.transfer(METAMASK_ADDRESS, new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FXS_USDT.transfer(METAMASK_ADDRESS, new BigNumber("260e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	await pair_instance_FRAX_FXS.transfer(METAMASK_ADDRESS, new BigNumber("220e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// ======== Initialize the staking rewards ========
	await stakingInstance_FRAX_WETH.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FRAX_USDC.initializeDefault({ from: STAKING_OWNER });
	// await stakingInstance_FRAX_USDT.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FXS_WETH.initializeDefault({ from: STAKING_OWNER });
	// await stakingInstance_FXS_USDC.initializeDefault({ from: STAKING_OWNER });
	// await stakingInstance_FXS_USDT.initializeDefault({ from: STAKING_OWNER });
	await stakingInstance_FRAX_FXS.initializeDefault({ from: STAKING_OWNER });


	// ======== Seed the collateral pools ========
	console.log(chalk.yellow('===== SEED THE COLLATERAL POOL ====='));


	// IF YOU ARE RUNNING MOCHA TESTS, SET THIS GROUP TO FALSE!
	// IF YOU ARE RUNNING MOCHA TESTS, SET THIS GROUP TO FALSE!
	// IF YOU ARE RUNNING MOCHA TESTS, SET THIS GROUP TO FALSE!
	if (false){
		await col_instance_USDC.transfer(pool_instance_USDC.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await col_instance_USDT.transfer(pool_instance_USDT.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	
		// ======== Advance a block and 24 hours to catch things up ========
		await time.increase(86400 + 1);
		await time.advanceBlock();
		// await fraxInstance.refreshCollateralRatio();
	
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

		
	// 	// =========================== Set prices ==========================
	// 	console.log("===============SWAP TO PRICES===============");

	// 	// Add allowances to the Uniswap Router
	// 	await wethInstance.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_USDC.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_USDT.approve(routerInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await fraxInstance.approve(routerInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await fxsInstance.approve(routerInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// 	// Add allowances to the swapToPrice contract
	// 	await wethInstance.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_USDC.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await col_instance_USDT.approve(swapToPriceInstance.address, new BigNumber(2000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await fraxInstance.approve(swapToPriceInstance.address, new BigNumber(1000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await fxsInstance.approve(swapToPriceInstance.address, new BigNumber(5000000e18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// 	//--- FRAX

	// 	// Handle FRAX / WETH
	// 	// Targeting 390.6 FRAX / 1 WETH
	// 	await swapToPriceInstance.swapToPrice(
	// 		fraxInstance.address,
	// 		wethInstance.address,
	// 		new BigNumber(3906e5),
	// 		new BigNumber(1e6),
	// 		new BigNumber(100e18),
	// 		new BigNumber(100e18),
	// 		COLLATERAL_FRAX_AND_FXS_OWNER,
	// 		new BigNumber(2105300114),
	// 		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// 	)

	// 	// Handle FRAX / USDC
	// 	// Targeting 1.003 FRAX / 1 USDC
	// 	await swapToPriceInstance.swapToPrice(
	// 		fraxInstance.address,
	// 		col_instance_USDC.address,
	// 		new BigNumber(1003e3),
	// 		new BigNumber(997e3),
	// 		new BigNumber(100e18),
	// 		new BigNumber(100e18),
	// 		COLLATERAL_FRAX_AND_FXS_OWNER,
	// 		new BigNumber(2105300114),
	// 		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// 	)

	// 	// Handle FRAX / USDT
	// 	// Targeting 0.995 FRAX / 1 USDT
	// 	await swapToPriceInstance.swapToPrice(
	// 		fraxInstance.address,
	// 		col_instance_USDT.address,
	// 		new BigNumber(995e3),
	// 		new BigNumber(1005e3),
	// 		new BigNumber(100e18),
	// 		new BigNumber(100e18),
	// 		COLLATERAL_FRAX_AND_FXS_OWNER,
	// 		new BigNumber(2105300114),
	// 		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// 	)

	// 	//--- FXS

	// 	// Handle FXS / WETH
	// 	// Targeting 1955 FXS / 1 WETH
	// 	await swapToPriceInstance.swapToPrice(
	// 		fxsInstance.address,
	// 		wethInstance.address,
	// 		new BigNumber(1955e6),
	// 		new BigNumber(1e6),
	// 		new BigNumber(100e18),
	// 		new BigNumber(100e18),
	// 		COLLATERAL_FRAX_AND_FXS_OWNER,
	// 		new BigNumber(2105300114),
	// 		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// 	)

	// 	// Handle FXS / USDC
	// 	// Targeting 5.2 FXS / 1 USDC
	// 	await swapToPriceInstance.swapToPrice(
	// 		fxsInstance.address,
	// 		col_instance_USDC.address,
	// 		new BigNumber(52e5),
	// 		new BigNumber(1e6),
	// 		new BigNumber(100e18),
	// 		new BigNumber(100e18),
	// 		COLLATERAL_FRAX_AND_FXS_OWNER,
	// 		new BigNumber(2105300114),
	// 		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// 	)


	// 	// Handle FXS / USDT
	// 	// Targeting 5.1 FXS / 1 USDT
	// 	await swapToPriceInstance.swapToPrice(
	// 		fxsInstance.address,
	// 		col_instance_USDT.address,
	// 		new BigNumber(51e5),
	// 		new BigNumber(1e6),
	// 		new BigNumber(100e18),
	// 		new BigNumber(100e18),
	// 		COLLATERAL_FRAX_AND_FXS_OWNER,
	// 		new BigNumber(2105300114),
	// 		{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// 	)

	// 	// Advance 24 hrs so the period can be computed
	// 	await time.increase(86400 + 1);
	// 	await time.advanceBlock();

	// 	// Make sure the prices are updated
	// 	await oracle_instance_FRAX_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_FRAX_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_FRAX_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_FXS_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_FXS_USDC.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_FXS_USDT.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_USDT_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// 	await oracle_instance_USDC_WETH.update({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

	// 	// Advance 24 hrs so the period can be computed
	// 	await time.increase(86400 + 1);
	// 	await time.advanceBlock();
	}

	await deployer.deploy(TokenVesting, accounts[5], await time.latest(), 86400, 86400 * 10, true, { from: accounts[0] });
	const vestingInstance = await TokenVesting.deployed();	

	// ======== Note the addresses ========
	// If you are testing the frontend, you need to copy-paste the output of CONTRACT_ADDRESSES to the frontend src/misc/constants.tsx
	let CONTRACT_ADDRESSES = {
		ganache: {
			main: {
				FRAX: fraxInstance.address,
				FXS: fxsInstance.address
			},
			weth: wethInstance.address,
			oracles: {
				FRAX_WETH: oracle_instance_FRAX_WETH.address,
				FRAX_USDC: oracle_instance_FRAX_USDC.address,
				FRAX_USDT: oracle_instance_FRAX_USDT.address,
				FXS_WETH: oracle_instance_FXS_WETH.address,
				FXS_USDC: oracle_instance_FXS_USDC.address,
				FXS_USDT: oracle_instance_FXS_USDT.address,
				USDT_WETH: oracle_instance_USDT_WETH.address,
				USDC_WETH: oracle_instance_USDC_WETH.address
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
			stake_tokens: {
				'Uniswap FRAX/WETH': pair_instance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': pair_instance_FRAX_USDC.address,
				'Uniswap FRAX/USDT': pair_instance_FRAX_USDT.address,
				'Uniswap FXS/WETH': pair_instance_FXS_WETH.address,
				'Uniswap FXS/USDC': pair_instance_FXS_USDC.address,
				'Uniswap FXS/USDT': pair_instance_FXS_USDT.address,
				'Uniswap FRAX/FXS': pair_instance_FRAX_FXS.address
			},
			staking_contracts_for_tokens: {
				'Uniswap FRAX/WETH': stakingInstance_FRAX_WETH.address,
				'Uniswap FRAX/USDC': stakingInstance_FRAX_USDC.address,
				// 'Uniswap FRAX/USDT': stakingInstance_FRAX_USDT.address,
				'Uniswap FXS/WETH': stakingInstance_FXS_WETH.address,
				//'Uniswap FXS/USDC': stakingInstance_FXS_USDC.address,
				//'Uniswap FXS/USDT': stakingInstance_FXS_USDT.address,
				'Uniswap FRAX/FXS': stakingInstance_FRAX_FXS.address,
			}
		}      
	}

	console.log("CONTRACT_ADDRESSES: ", CONTRACT_ADDRESSES);

	
	console.log(`==========================================================`);
};
