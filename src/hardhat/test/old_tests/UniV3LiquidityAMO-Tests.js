const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");


// const Address = artifacts.require("Utils/Address");
// const BlockMiner = artifacts.require("Utils/BlockMiner");
// const Math = artifacts.require("Math/Math");
// const SafeMath = artifacts.require("Math/SafeMath");
// const Babylonian = artifacts.require("Math/Babylonian");
// const FixedPoint = artifacts.require("Math/FixedPoint");
// const UQ112x112 = artifacts.require("Math/UQ112x112");
// const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
// const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
// const SafeERC20 = artifacts.require("ERC20/SafeERC20");
const CRV_DAO_ERC20_Mock = artifacts.require("ERC20/Variants/CRV_DAO_ERC20_Mock");

// Uniswap related
// const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
//const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
// const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
// const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
// const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
// const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
// const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");
const INonfungiblePositionManager = artifacts.require("Uniswap_V3/periphery/interfaces/INonfungiblePositionManager");
const ISwapRouter = artifacts.require("Uniswap_V3/ISwapRouter");
const TickMath = artifacts.require("Uniswap_V3/libraries/TickMath");
const LiquidityAmounts = artifacts.require("Uniswap_V3/libraries/LiquidityAmounts");
const Testing = artifacts.require("Uniswap_V3/libraries/Testing");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("ERC20/ERC20");


// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const PoolvAMM_USDC = artifacts.require("Frax/Pools/PoolvAMM_USDC");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const PIDController = artifacts.require("Oracle/PIDController.sol");
const ReserveTracker = artifacts.require("Oracle/ReserveTracker.sol");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");
// const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
// const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
// const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
// const CurveFactory = artifacts.require("Curve/Factory");
// const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
// const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");
// const CurveAMO_V3 = artifacts.require("Curve/CurveAMO_V3.sol");

// Misc AMOs
//const OHM_AMO = artifacts.require("Misc_AMOs/OHM_AMO_V2");
// const RariFuseLendingAMO = artifacts.require("Misc_AMOs/RariFuseLendingAMO.sol");
// const ICErc20Delegator = artifacts.require("Misc_AMOs/rari/ICErc20Delegator.sol");
// const IComptroller = artifacts.require("Misc_AMOs/rari/IRariComptroller.sol");
const UniV3LiquidityAMO = artifacts.require("Misc_AMOs/UniV3LiquidityAMO");

// Constants
const BIG2 = new BigNumber("1e2");
const BIG6 = new BigNumber("1e6");
const BIG9 = new BigNumber("1e9");
const BIG12 = new BigNumber("1e12");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";
const METAPOOL_ADDRESS = "0xC7E0ABfe4e0278af66F69C93CD3fD6810198b15B"; // hard-coded from deployment, can break

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('UniV3LiquidityAMO Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDT = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_UST = '0xa1d8d972560c2f8144af871db508f0b0b10a3fbf';
	
	// Curve Metapool
	let crv3Instance;
	let mockCRVDAOInstance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_instance;
	let usdt_instance;
	let ust_instance;
	let fei_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let curve_amo_v3_instance;

	// AMO
	let stakedao_amo_instance;
	let ohm_amo_instance;
	let rari_amo_instance;
	let univ3_liquidity_amo_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let ohmInstance;
	
	// Initialize the Uniswap Router instance
	let routerInstance; 

	// Initialize the Uniswap Factory instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;
    let uniswapV3PositionsNFTInstance;
    let univ3_position_manager_instance;
    let tickMath_instance;
    let liquidityAmounts_instance;
    let testing_instance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	let swapRouterInstance;

	// Initialize oracle instances
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_FXS;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	let pid_controller_instance;
    let reserve_tracker_instance;

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Initialize the governance contract
	let governanceInstance;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_USDC_vAMM;
	
	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FXS_WETH;

	// Initialize pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FXS_WETH;
	let pair_instance_FXS_USDC;

	// Initialize pair orders
	let isToken0Frax_FRAX_WETH;
	let isToken0Frax_FRAX_USDC;
	let isToken0Fxs_FXS_WETH;

	// Initialize staking instances
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FXS_WETH;

	// Initialize running balances
	let bal_frax = 0;
	let bal_fxs = 0;
	let col_bal_usdc = 0;
	let col_rat = 1;
	let pool_bal_usdc = 0;
	let global_collateral_value = 0;

	const USE_CALLS = false;
	const MAX_SLIPPAGE = .025;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ["0xb39e2041b042f39b8572B6F84dEba99BbB589c8d"]
		});

		// Constants
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
		ORIGINAL_POOL_CREATOR = "0xb39e2041b042f39b8572B6F84dEba99BbB589c8d";
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADDRESS = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		ust_instance = await ERC20.at('0xa47c8bf37f92abed4a126bda807a7b7498661acd'); // "Name: Wrapped UST Token", "Symbol: UST"
		fei_instance = await ERC20.at('0x956F47F50A910163D8BF957Cf5846D573E7f87CA');
		// curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		// frax_3crv_metapool_instance = await MetaImplementationUSD.at(METAPOOL_ADDRESS); // can break if deployment order changes
		// frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		// stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
		// mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.deployed();
		// ohmInstance = await ERC20.at(CONTRACT_ADDRESSES.ethereum.reward_tokens.ohm);
	
		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

		// Fill the Uniswap Router Instance
		//routerInstance = await UniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();

		pid_controller_instance = await PIDController.deployed(); 
		reserve_tracker_instance = await ReserveTracker.deployed();

		// Initialize ETH-USD Chainlink Oracle too
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		//uniswapFactoryInstance = await UniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed();
		tickMath_instance = await TickMath.deployed();
		liquidityAmounts_instance = await LiquidityAmounts.deployed(); 
		testing_instance = await Testing.deployed();


		// Initialize the swap to price contract
		//swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		// pair_instance_FRAX_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/WETH"]);
		// pair_instance_FRAX_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/USDC"]);
		// pair_instance_FXS_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/WETH"]);
		// //pair_instance_FXS_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/USDC"]);

		

		

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();

		swapRouterInstance = await ISwapRouter.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.SwapRouter);

		univ3_liquidity_amo_instance = await UniV3LiquidityAMO.deployed();
		uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed();
		univ3_position_manager_instance = await INonfungiblePositionManager.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager);

		// console.log("=========================Proxy Deployments=========================");

		// console.log(chalk.yellow('========== OHM AMO =========='));
		// const OHM_AMO_Implementation = await hre.ethers.getContractFactory("OHM_AMO");
		// const proxy_obj = await hre.upgrades.deployProxy(OHM_AMO_Implementation, [
		// 	frax_instance.address, 
		// 	pool_instance_USDC.address,
		// 	usdc_instance.address, 
		// 	COLLATERAL_FRAX_AND_FXS_OWNER, 
		// 	INVESTOR_CUSTODIAN_ADDRESS, 
		// 	timelockInstance.address
		// ]);
		// const proxy_instance = await proxy_obj.deployed();
		// console.log("OHM_AMO proxy deployed at: ", proxy_instance.address);

		// // Get out of ethers and back to web3. It gives a signer-related error
		// ohm_amo_instance = await OHM_AMO.at(proxy_instance.address);

		// If truffle-fixture is used
		//rari_amo_instance = await RariFuseLendingAMO.deployed();

	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);
	})

	// MAIN TEST
	// ================================================================
	it("Main test", async () => {

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		console.log("Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX");
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("150000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		console.log("Give the COLLATERAL_FRAX_AND_FXS_OWNER address some USDC");
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("150000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************


		// console.log(chalk.hex("#ff8b3d").bold("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]====================="));
		// // Makes sure the pool is working

		// const fxs_per_usd_exch_rate = (new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		// console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// // Note balances beforehand
		// const frax_balance_before_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const fxs_balance_before_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const usdc_balance_before_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// // Do a redeem
		// const redeem_amount = new BigNumber("1000e18");
		// console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		// await frax_instance.approve(pool_instance_USDC.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await pool_instance_USDC.redeemFractionalFRAX(redeem_amount, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Advance two blocks
		// await time.increase(20);
		// await time.advanceBlock();
		// await time.increase(20);
		// await time.advanceBlock();

		// Redeem threshold
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.POOL_OWNER_ADDRESS]
		});
	
		console.log("Set the redeem threshold to $1.01 now so redeems work");
		await pool_instance_V3.setPriceThresholds(1030000, 1010000, { from: process.env.POOL_OWNER_ADDRESS }); 
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.POOL_OWNER_ADDRESS]
		});

		// Do a redeem
		const redeem_amount = new BigNumber("1000e18");
		console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		await frax_instance.approve(pool_instance_USDC.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pool_instance_V3.redeemFrax(5, redeem_amount, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Advance two blocks
		await time.increase(20);
		await time.advanceBlock();
		await time.increase(20);
		await time.advanceBlock();

		// Collect the redemption
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Note balances afterwards
		// const frax_balance_after_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const fxs_balance_after_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const usdc_balance_after_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		
		// // Print the changes
		// console.log(`FRAX Change: ${frax_balance_after_redeem - frax_balance_before_redeem} FRAX`);
		// console.log(`FXS Change: ${fxs_balance_after_redeem - fxs_balance_before_redeem} FXS`);
		// console.log(`USDC Change: ${usdc_balance_after_redeem - usdc_balance_before_redeem} USDC`);



		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		let the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);

		console.log("\n>set mint cap, collat borrow cap, min cr");
		await univ3_liquidity_amo_instance.setSafetyParams(new BigNumber("820000"), new BigNumber("500000e18"), new BigNumber("500000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Uni v3 AMO [min_cr]:", new BigNumber(await univ3_liquidity_amo_instance.min_cr()).div(BIG6).toNumber());
		console.log("Uni v3 AMO [mint_cap]:", new BigNumber(await univ3_liquidity_amo_instance.mint_cap()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [collat_borrow_cap]:", new BigNumber(await univ3_liquidity_amo_instance.min_cr()).div(BIG6).toNumber());

		console.log("\n>add Uni v3 AMO to the frax pool array");
		await frax_instance.addPool(univ3_liquidity_amo_instance.address, { from: ORIGINAL_FRAX_ONE_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("====================== Do 100k worth of FRAX mintRedeem() to get USDC into Uni v3 AMO ====================="));
		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		if(await pool_instance_USDC.redeemPaused.call() == true){
			await pool_instance_USDC.toggleRedeeming({ from: ORIGINAL_POOL_CREATOR });
		}
		await univ3_liquidity_amo_instance.mintRedeemPart1(new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.increase(20);
		await time.advanceBlock();
		await time.advanceBlock();
		await univ3_liquidity_amo_instance.mintRedeemPart2({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);

		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG6).toNumber());
		console.log("Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== 100k FRAX into the Uni v3 AMO ====================="));
		await univ3_liquidity_amo_instance.mintFRAXForInvestments(new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG6).toNumber());
		console.log("Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());

		
		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		// UDSC
		console.log("Uni v3 AMO [borrowed_collat_historical]:", new BigNumber(await univ3_liquidity_amo_instance.borrowed_collat_historical()).div(BIG6).toNumber());
		console.log("Uni v3 AMO [collateralBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collateralBalance()).div(BIG6).toNumber());

		// FRAX
		console.log("Uni v3 AMO [minted_sum_historical]:", new BigNumber(await univ3_liquidity_amo_instance.minted_sum_historical()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [mintedBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.mintedBalance()).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== Testing Uni v3 NonfungiblePositionManager ====================="));
		console.log("\n>approve FRAX and USDC for Uni v3 NonfungiblePositionManager");
		await frax_instance.approve(univ3_position_manager_instance.address, new BigNumber("1e42"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await usdc_instance.approve(univ3_position_manager_instance.address, new BigNumber("1e30"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("accounts[1] [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6).toNumber());
		console.log("accounts[1] [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== Mint a Uni v3 position with EOA using NonfungiblePositionManager ====================="));
		const amountFRAX = "1000000000000000000000";
		const amountUSDC = "1000000000";

		await univ3_position_manager_instance.mint(
		{
			token0: frax_instance.address,
			token1: usdc_instance.address,
			fee: 500,
			tickLower: -276380,
			tickUpper: -276270,
			amount0Desired: amountFRAX,
			amount1Desired: amountUSDC,
			amount0Min: 0,
			amount1Min: 0,
			recipient: COLLATERAL_FRAX_AND_FXS_OWNER,
			deadline: 2105300114
		}, {from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log(chalk.hex("#ff8b3d").bold("====================== Mint 10k/10k Uni v3 FRAX-USDC Position ====================="));
		await univ3_liquidity_amo_instance.mint(
			usdc_instance.address,
			new BigNumber("10000e6"),
			new BigNumber("10000e18"),
			500,
			-276380,
			-276270,
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_instance.numPositions()).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		const token_id_0 = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_instance.address, 0)).toNumber();
		const position_0 = await univ3_position_manager_instance.positions(token_id_0);
		const liquidity_0 = new BigNumber(position_0.liquidity).toNumber();

		console.log("token_id", token_id_0);
		console.log("liquidity:", liquidity_0);
		//console.log("positions_mapping[token_id]:", await univ3_liquidity_amo_instance.positions_mapping(token_id_0));
		console.log("positions_mapping[token_id].liquidity:", new BigNumber((await univ3_liquidity_amo_instance.positions_mapping(token_id_0)).liquidity).toNumber());
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG6).toNumber());
		console.log("Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== Withdraw all liquidity from the minted NFT position from uni v3 ====================="));
		await univ3_liquidity_amo_instance.withdraw(token_id_0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_instance.numPositions()).toNumber());
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG6).toNumber());
		console.log("Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());
		const token_id_0_after = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_instance.address, 0)).toNumber();
		const position_0_after = await univ3_position_manager_instance.positions(token_id_0_after);
		const liquidity_0_after = new BigNumber(position_0.liquidity).toNumber();
		console.log("token_id", token_id_0_after);
		console.log("liquidity:", liquidity_0_after);

		console.log("\n>AMO swap 10k USDC for DAI");

		console.log("\n>Add DAI as a collateral")
		await univ3_liquidity_amo_instance.addCollateral(daiInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await univ3_liquidity_amo_instance.swap(usdc_instance.address, daiInstance.address, 500, new BigNumber("10000e6"), 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG6).toNumber());
		console.log("Uni v3 AMO [DAI balance]:", new BigNumber(await daiInstance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== Mint 5k/5k Uni v3 FRAX-DAI Position ====================="));
		await univ3_liquidity_amo_instance.mint(
			daiInstance.address,
			new BigNumber("5000e18"),
			new BigNumber("5000e18"),
			500,
			0,
			20,
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_instance.numPositions()).toNumber());
		

		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		const token_id_1 = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_instance.address, 1)).toNumber();
		const position_1 = await univ3_position_manager_instance.positions(token_id_1);
		const liquidity_1 = new BigNumber(position_1.liquidity).toNumber();
		
		console.log("token_id", token_id_1);
		console.log("liquidity:", liquidity_1);
		console.log("positions_mapping[token_id].liquidity:", new BigNumber((await univ3_liquidity_amo_instance.positions_mapping(token_id_1)).liquidity).toNumber());
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());
		console.log("Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());
		console.log("Uni v3 AMO [DAI balance]:", new BigNumber(await daiInstance.balanceOf(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());
		console.log("Custodian # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(accounts[8])).toNumber());
		
		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== Recover empty FRAX-USDC NFT ====================="));
		await univ3_liquidity_amo_instance.recoverERC721(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager, token_id_0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());
		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_instance.numPositions()).toNumber());
		console.log("Custodian # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(accounts[8])).toNumber());

		console.log("\n>approve router");
		console.log("accounts[1] [DAI balance]:", new BigNumber(await daiInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		await daiInstance.approve(swapRouterInstance.address, new BigNumber("1e42"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(swapRouterInstance.address, new BigNumber("1e42"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		

		console.log(chalk.hex("#ff8b3d").bold("====================== Swap 2k FRAX for DAI to accrue some fees to LPs ====================="));
		const amountSwapped = "2000000000000000000000";
		await swapRouterInstance.exactInputSingle({
			tokenIn: frax_instance.address,
			tokenOut: daiInstance.address,
			fee: 500,
			recipient: COLLATERAL_FRAX_AND_FXS_OWNER,
			deadline: 2105300114,
			amountIn: amountSwapped,
			amountOutMinimum: 0,
			sqrtPriceLimitX96: 0
			},
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== Swap 1k DAI for FRAX to accrue some fees to LPs ====================="));
		const amountSwapped2 = "1000000000000000000000";
		await swapRouterInstance.exactInputSingle({
			tokenIn: daiInstance.address,
			tokenOut: frax_instance.address,
			fee: 500,
			recipient: COLLATERAL_FRAX_AND_FXS_OWNER,
			deadline: 2105300114,
			amountIn: amountSwapped2,
			amountOutMinimum: 0,
			sqrtPriceLimitX96: 0
			},
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		console.log("accounts[1] [DAI balance]:", new BigNumber(await daiInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		console.log("custodian [DAI balance]:", new BigNumber(await daiInstance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("custodian [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());

		console.log("\n>collect fees from Uni v3 AMO to investor custodian")
		await univ3_liquidity_amo_instance.collectFees({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("custodian [DAI balance]:", new BigNumber(await daiInstance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("custodian [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== TEST USDT safeApprove PROBLEM ====================="));
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDT]}
		);

		console.log("Drop in some USDT into the AMO");
		await usdt_instance.transfer(univ3_liquidity_amo_instance.address, new BigNumber("10000e6"), { from: ADDRESS_WITH_USDT });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDT]}
		);

		// Do the safeApprove first for USDT
		await univ3_liquidity_amo_instance.approveTarget(swapRouterInstance.address, usdt_instance.address, 0, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// Add USDT as collateral
		await univ3_liquidity_amo_instance.addCollateral(usdt_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Do a test swap
		await univ3_liquidity_amo_instance.swap(
			usdt_instance.address, 
			daiInstance.address, 
			500, 
			new BigNumber("10000e6"), 
			0, 
			0, 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log(chalk.hex("#ff8b3d").bold("====================== TEST FEI mint ====================="));

		console.log("add FEI as whitelisted collateral");
		await univ3_liquidity_amo_instance.addCollateral(fei_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("\n>swap 40k FRAX for FEI");
		// Swap for FEI
		await univ3_liquidity_amo_instance.swap(
			frax_instance.address, 
			fei_instance.address, 
			500, 
			new BigNumber("40000e18"), 
			0, 
			0, 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("Uni v3 AMO [FEI balance]:", new BigNumber(await fei_instance.balanceOf.call(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());

		console.log("\n>Approve FEI from the Uni v3 AMO");
		await univ3_liquidity_amo_instance.approveTarget(uniswapV3PositionsNFTInstance.address, fei_instance.address, new BigNumber("1e42"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		console.log("\n>Mint a 10k/10k FRAX/FEI Uni v3 AMO position");
		await univ3_liquidity_amo_instance.mint(
			fei_instance.address,
			new BigNumber("10000e18"),
			new BigNumber("10000e18"),
			500,
			-200,
			200,
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);		
		console.log("FRAX/FEI Uni v3 minted");
		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_instance.numPositions()).toNumber());

		const token_id_fei = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_instance.address, 1)).toNumber();
		const position_fei = await univ3_position_manager_instance.positions(token_id_fei);
		const liquidity_fei = new BigNumber(position_0.liquidity);

		console.log("token_id", token_id_fei);
		//console.log("positions_mapping[FRAX/FEI position]:", await univ3_liquidity_amo_instance.positions_mapping(token_id_fei));
		console.log("collateral_address:", (await univ3_liquidity_amo_instance.positions_mapping(token_id_fei)).collateral_address);
		console.log("tickLower:", new BigNumber((await univ3_liquidity_amo_instance.positions_mapping(token_id_fei)).tickLower).toNumber());
		console.log("tickUpper::", new BigNumber((await univ3_liquidity_amo_instance.positions_mapping(token_id_fei)).tickUpper).toNumber());
		console.log("liquidity:", new BigNumber((await univ3_liquidity_amo_instance.positions_mapping(token_id_fei)).liquidity).toNumber());

		console.log(chalk.hex("#02FFE2").bold("testing [TickMath] and [LiquidityAmounts] Uni v3 libraries"));

		const sqrtRatioAX96 = new BigNumber(await testing_instance.getSqrtRatioAtTick(-200));
		const sqrtRatioBX96 = new BigNumber(await testing_instance.getSqrtRatioAtTick(200));
		console.log("sqrtRatioAX96:", sqrtRatioAX96.toNumber());
		console.log("sqrtRatioBX96:", sqrtRatioBX96.toNumber());

		const amount0 = new BigNumber(await testing_instance.getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity_fei));
		const amount1 = new BigNumber(await testing_instance.getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity_fei));
		
		console.log("amount0:", amount0.toNumber());
		console.log("amount1:", amount1.toNumber());

		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("====================== TEST UST mint PROBLEM ====================="));

		console.log("add UST as whitelisted collateral");
		await univ3_liquidity_amo_instance.addCollateral(ust_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_UST]}
		);

		console.log("\n>Drop in some UST into the AMO");
		await ust_instance.transfer(univ3_liquidity_amo_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_UST });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_UST]}
		);

		// Do the approveTarget for UST
		await univ3_liquidity_amo_instance.approveTarget(uniswapV3PositionsNFTInstance.address, ust_instance.address, new BigNumber("1e42"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// // Do a test swap for UST
		// await univ3_liquidity_amo_instance.swap(
		// 	usdt_instance.address, 
		// 	daiInstance.address, 
		// 	500, 
		// 	new BigNumber("10000e6"), 
		// 	0, 
		// 	0, 
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// );
		console.log("Uni v3 AMO UST balance:", new BigNumber(await ust_instance.balanceOf.call(univ3_liquidity_amo_instance.address)).div(BIG18).toNumber());

		console.log("\n>minting 10k/10k UST/FRAX uni v3 position");
		await univ3_liquidity_amo_instance.mint(
			ust_instance.address,
			new BigNumber("10000e18"),
			new BigNumber("10000e18"),
			500,
			-200,
			200,
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("UST/FRAX Uni v3 minted");
		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_instance.numPositions()).toNumber());

		console.log("Uni v3 AMO [collatDollarBalance()]:", new BigNumber(await univ3_liquidity_amo_instance.collatDollarBalance()).div(BIG18).toNumber());


	});

});