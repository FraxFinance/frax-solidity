const path = require('path');
const Table = require('cli-table');
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
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const PIDController = artifacts.require("Oracle/PIDController.sol");
const ReserveTracker = artifacts.require("Oracle/ReserveTracker.sol");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");
// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
const CurveFactory = artifacts.require("Curve/Factory");
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const LiquidityGaugeV2 = artifacts.require("Curve/ILiquidityGaugeV2");
const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");
const GaugeController = artifacts.require("Curve/GaugeController");
const CurveAMO_V4 = artifacts.require("Curve/CurveAMO_V4.sol");

// veFXS
const veFXS = artifacts.require("Curve/IveFXS");
const SmartWalletWhitelist = artifacts.require("Curve/SmartWalletWhitelist");
const MicroVeFXSStaker = artifacts.require("Staking/MicroVeFXSStaker");

const BIG6 = new BigNumber("1e6");
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

contract('Smart Wallet Whitelist Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let ORIGINAL_FRAX_DEPLOYER_ADDRESS;
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	const ADDRESS_WITH_ETH = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik's Vb
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_3CRV = '0x99739fa525c0a98384430235d278fd08938997f9';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';
	// Curve Metapool
	let crv3Instance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_real_instance;
	let usdt_real_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let liquidity_gauge_instance;
	let curve_amo_v3_instance;
	let gauge_controller_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;

	// Initialize oracle instances
	let oracle_instance_FXS_WETH;

	let pid_controller_instance;
    let reserve_tracker_instance;

	// Initialize pool instances
	let pool_instance_USDC;
	
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

	// Initialize veFXS and Smart Wallet Whitelist
	let veFXS_instance;
	let smart_wallet_whitelist_instance;
	let micro_vefxs_staker_instance;

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

		// Constants
		ORIGINAL_FRAX_DEPLOYER_ADDRESS = process.env.FRAX_DEPLOYER_ADDRESS;
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADDRESS = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ORIGINAL_FRAX_DEPLOYER_ADDRESS]}
		);

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_real_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		// curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		// frax_3crv_metapool_instance = await MetaImplementationUSD.at(METAPOOL_ADDRESS); // can break if deployment order changes
		frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
		gauge_controller_instance = await GaugeController.at("0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB");
		curve_amo_v3_instance = await CurveAMO_V4.deployed();
		liquidity_gauge_instance = await LiquidityGaugeV2.deployed();

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();

		pid_controller_instance = await PIDController.deployed(); 
		reserve_tracker_instance = await ReserveTracker.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/WETH"]);
		//pair_instance_FXS_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/USDC"]);

		

		

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();

		// console.log("=========================Proxy Deployments=========================");

		// // console.log(chalk.yellow('========== veFXS =========='));
		// // const veFXS_Implementation = await hre.ethers.getContractFactory("veFXS");
		// const veFXS_Implementation = await hre.ethers.ContractFactory.fromSolidity(veFXS);
		// console.log(veFXS_Implementation)
		// const proxy_obj = await hre.upgrades.deployProxy(veFXS_Implementation, [
		// 	fxs_instance.address, 
		// 	"veFXS",
		// 	"veFXS",
		// 	"veFXS_1.0.0"
		// ]);
		// const proxy_instance = await proxy_obj.deployed();
		// console.log("veFXS proxy deployed at: ", proxy_instance.address);

		// // Get out of ethers and back to web3. It gives a signer-related error
		// veFXS_instance = await veFXS.at(proxy_instance.address);

		// If truffle-fixture is used
		veFXS_instance = await veFXS.deployed();

		// Smart Wallet Whitelist
		smart_wallet_whitelist_instance = await SmartWalletWhitelist.deployed();

		// Testing smart contract
		micro_vefxs_staker_instance = await MicroVeFXSStaker.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ORIGINAL_FRAX_DEPLOYER_ADDRESS]}
		);
	})


	it("Tests SmartWalletWhitelist", async () => {

		console.log("=====================TRANSFER SOME FXS=====================");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(micro_vefxs_staker_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		console.log("=====================ATTACH THE WHITELIST CONTRACT TO VEFXS=====================");

		console.log("Commit");
		await veFXS_instance.commit_smart_wallet_checker(smart_wallet_whitelist_instance.address, { from: ORIGINAL_FRAX_DEPLOYER_ADDRESS });
		
		console.log("Approve");
		await veFXS_instance.apply_smart_wallet_checker( { from: ORIGINAL_FRAX_DEPLOYER_ADDRESS });


		console.log("=====================TEST FXS LOCKING=====================");

		const deposit_amount_quick_e18_4_yr = new BigNumber(`100e18`);
		const deposit_amount_increment_e18_4_yr = new BigNumber(`10e18`);

		const deposit_quick_days_4_yr = 4 * 365 ; // 4 years

		let block_time_current_4_yr = (await time.latest()).toNumber();
		const deposit_quick_timestamp_4_yr = block_time_current_4_yr + ((deposit_quick_days_4_yr * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_quick_e18_4_yr, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_quick_e18_4_yr, deposit_quick_timestamp_4_yr, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("=====================TEST FXS LOCKING FOR SMART CONTRACT (SHOULD FAIL)=====================");

		// Try to lock
		await expectRevert(
			micro_vefxs_staker_instance.vefxs_create_lock(deposit_amount_quick_e18_4_yr, deposit_quick_timestamp_4_yr, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Smart contract depositors not allowed"
		);

		console.log("=====================WHITELIST THE CONTRACT AND TRY AGAIN (SHOULD SUCCEED)=====================");

		// Whitelist the micro veFXS staker contract
		await smart_wallet_whitelist_instance.approveWallet(micro_vefxs_staker_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Try to lock now
		await micro_vefxs_staker_instance.vefxs_create_lock(deposit_amount_quick_e18_4_yr, deposit_quick_timestamp_4_yr, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

	});

});