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
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("contracts/Uniswap/Interfaces/IUniswapV2Pair.sol:IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Collateral Pools
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

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
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");

// Misc AMOs
// const OHM_AMO = artifacts.require("Misc_AMOs/OHM_AMO_V3.sol");
const RariFuseLendingAMO_V3 = artifacts.require("Misc_AMOs/Lending_AMOs/RariFuseLendingAMO_V3.sol");
const ICErc20Delegator = artifacts.require("Misc_AMOs/Lending_AMOs/rari/ICErc20Delegator.sol");
const IComptroller = artifacts.require("Misc_AMOs/Lending_AMOs/rari/IRariComptroller.sol");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

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

contract('RariFuseLendingAMO_V3 AMO Tests', async (accounts) => {
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
	const ADDRESS_WITH_USDC = '0xCFFAd3200574698b78f32232aa9D63eABD290703';
	
	// Curve Metapool
	let crv3Instance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_real_instance;
	let usdt_real_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let curve_amo_v3_instance;

	// AMO
	let stakedao_amo_instance;
	let ohm_amo_instance;
	let rari_amo_instance;
	let frax_amo_minter_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let ohmInstance;

	// Initialize oracle instances
	let oracle_instance_FXS_WETH;

	let pid_controller_instance;
    let reserve_tracker_instance;

	// Initialize pool instances
	let pool_instance_V3;
	
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

		// Constants
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

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_real_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		// curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		// frax_3crv_metapool_instance = await MetaImplementationUSD.at(METAPOOL_ADDRESS); // can break if deployment order changes
		// frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
		ohmInstance = await ERC20.at(CONTRACT_ADDRESSES.ethereum.reward_tokens.ohm);
	
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

		// pid_controller_instance = await PIDController.deployed(); 
		// reserve_tracker_instance = await ReserveTracker.deployed();

		// Initialize the governance contract
		// governanceInstance = await GovernorAlpha.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Initialize pool instances
		pool_instance_V3 = await FraxPoolV3.deployed();
		
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

		// If truffle-fixture is used
		// rari_amo_instance = await RariFuseLendingAMO_V3.deployed();
		
		rari_amo_instance = await RariFuseLendingAMO_V3.new(DEPLOYER_ADDRESS,
			[
				"0x814b02C1ebc9164972D888495927fe1697F0Fb4c", // Pool #6: [Unitroller] Tetranode's Locker.
				"0xfb558ecd2d24886e8d2956775c619deb22f154ef", // Pool #7: [Unitroller] ChainLinkGod's / Tetranode's Up Only Pool
				"0xd4bdcca1ca76ced6fc8bb1ba91c5d7c0ca4fe567", // Pool #9: [Unitroller] Frax & Reflexer Stable Asset Pool
				"0x621579dd26774022f33147d3852ef4e00024b763", // Pool #18: [Unitroller] Olympus Pool Party Frax
				"0x3cb4f05061749497187b7ab4ef6f6f6018b2ee67", // Pool #19: [Unitroller] IndexCoop Pool
				"0x64858bac30f4cc223ea07adc09a51acdcd225998", // Pool #24: [Unitroller] Harvest FARMstead
				"0x26577903c42ce72740a8abb50e7cf97a8e5b5564", // Pool #31: [Unitroller] NFTX Pool
				"0x93de950f609f51b1ff0c5bf81d8588fbadde7d5c", // Pool #36: [Unitroller] Fraximalist Money Market Pool
			],
			[
				"0x1531C1a63A169aC75A2dAAe399080745fa51dE44", // Pool #6: [CErc20Delegator] Tetranode's Locker.
				"0x6313c160b329db59086df28ed2bf172a82f0d9d1", // Pool #7: [CErc20Delegator] ChainLinkGod's / Tetranode's Up Only Pool
				"0x0f43a7e3f7b529015B0517D0D9Aa9b95701fd2Cb", // Pool #9: [CErc20Delegator] Frax & Reflexer Stable Asset Pool
				"0x3e5c122ffa75a9fe16ec0c69f7e9149203ea1a5d", // Pool #18: [CErc20Delegator] Olympus Pool Party Frax
				"0x64E6aF978138732aef99C0648c195B12A6bc2A38", // Pool #19: [CErc20Delegator] IndexCoop Pool
				"0x0A6eAfaA84188A146749D7864bB20E63bD16ea2A", // Pool #24: [CErc20Delegator] Harvest FARMstead
				"0x1BA12ae1FCFadd08FA37Db849Ef4b6e11e435357", // Pool #31: [CErc20Delegator] NFTX Pool
				"0x5e116a4521c99324f344eb7c7bfe1f78e3226493", // Pool #36: [Unitroller] Fraximalist Money Market Pool
			],frax_amo_minter_instance.address);

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
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1500000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]}
		);
		
		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log("=================INITIALIZE================");
		
		console.log("Get the pool addresses");
		const pool_addresses = await rari_amo_instance.allPoolAddresses.call();

		console.log("Initialize USDC lender stuff");
		const usdcRariUnitroller_instance = await IComptroller.at("0x621579DD26774022F33147D3852ef4E00024b763");
		const usdcRariDelegator_instance = await ICErc20Delegator.at("0x6f95d4d251053483f41c8718C30F4F3C404A8cf2");

		console.log("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]=====================");
		// Makes sure the pool is working

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		const fxs_per_usd_exch_rate = (new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// Note balances beforehand
		const frax_balance_before_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_before_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_before_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// Redeem threshold
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});
	
		console.log("Set the redeem threshold to $1.01 now so redeems work");
		await pool_instance_V3.setPriceThresholds(1030000, 1010000, { from: process.env.COMPTROLLER_MSIG_ADDRESS }); 
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});

		// Do a redeem
		const redeem_amount = new BigNumber("1000e18");
		console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		await frax_instance.approve(pool_instance_V3.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pool_instance_V3.redeemFrax(5, redeem_amount, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Advance two blocks
		await time.increase(20);
		await time.advanceBlock();
		await time.increase(20);
		await time.advanceBlock();

		// Collect the redemption
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note balances afterwards
		const frax_balance_after_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_after_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_after_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		
		// Print the changes
		console.log(`FRAX Change: ${frax_balance_after_redeem - frax_balance_before_redeem} FRAX`);
		console.log(`FXS Change: ${fxs_balance_after_redeem - fxs_balance_before_redeem} FXS`);
		console.log(`USDC Change: ${usdc_balance_after_redeem - usdc_balance_before_redeem} USDC`);

		// Note the collatDollarBalances
		console.log("Rari AMO collatDollarBalance:", new BigNumber((await rari_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("gcv_bal_start: ", gcv_bal_start);

		// Note the FraxPoolV3 Balance too
		const pool_usdc_bal_start = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		console.log("pool_usdc_bal_start: ", pool_usdc_bal_start);

		console.log("=========================PULL IN FRAX=========================");
		
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]}
		);
		console.log("add Rari_AMO to AMO Minter");
		await frax_amo_minter_instance.addAMO(rari_amo_instance.address, true, { from: process.env.COMPTROLLER_MSIG_ADDRESS });
		
		console.log("Get some FRAX from the minter");
		await frax_amo_minter_instance.mintFraxForAMO(rari_amo_instance.address, new BigNumber("500250e18"), { from: process.env.COMPTROLLER_MSIG_ADDRESS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});

		const minted_balance = new BigNumber(await rari_amo_instance.mintedBalance.call()).div(BIG18);
		console.log("minted_balance: ", minted_balance.toNumber());

		let the_allocations = await rari_amo_instance.showAllocations.call();
		utilities.printAllocations('RARI_AMO', the_allocations);


		console.log("===========================BURN SOME FRAX===========================");
		// Test burn some FRAX
		
		await rari_amo_instance.burnFRAX(new BigNumber("250e18"), { from: DEPLOYER_ADDRESS });
		the_allocations = await rari_amo_instance.showAllocations.call();
		utilities.printAllocations('RARI_AMO', the_allocations);


		console.log("===========================LEND USDC AS ANOTHER PERSON===========================");
		// Enter the market
		await usdcRariUnitroller_instance.enterMarkets([usdcRariDelegator_instance.address], { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		await usdc_instance.approve(usdcRariDelegator_instance.address, new BigNumber("100000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await usdcRariDelegator_instance.mint(new BigNumber("100000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collatDollarBalances
		console.log("Rari AMO collatDollarBalance:", new BigNumber((await rari_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log(chalk.hex("#ff8b3d").bold("=========================SEND SOME FRAX INTO RARI AMO========================="));
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// Give the AMO address some FRAX
		await frax_instance.transfer(rari_amo_instance.address, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		console.log("=====================LOAN FRAX=====================");
		const frax_balance_loaning_before = new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address)).div(BIG18);

		// Loop through the pools
		for (let i = 0; i < pool_addresses.length; i++){
			// Loan some FRAX
			await rari_amo_instance.lendToPool(pool_addresses[i], new BigNumber("50000e18"), { from: DEPLOYER_ADDRESS });
			console.log(`[${pool_addresses[i]}] balance: `, new BigNumber(await rari_amo_instance.fraxInPoolByPoolIdx.call(i)).div(BIG18).toNumber())
		}
		
		const frax_balance_loaning_after = new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address)).div(BIG18);
		console.log(`FRAX Change: ${frax_balance_loaning_after - frax_balance_loaning_before} FRAX`);

		the_allocations = await rari_amo_instance.showAllocations.call();
		utilities.printAllocations('RARI_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===================== BORROW USDC BY AMO ====================="));
		usdc_pools_in_comptroller = [
			"0xdb55B77F5E8a1a41931684Cf9e4881D24E6b6CC9", // Pool #6: [CErc20Delegator] Tetranode's Locker. 
			"0x53De5A7B03dc24Ff5d25ccF7Ad337a0425Dfd8D1", // Pool #7: [CErc20Delegator] ChainLinkGod's / Tetranode's Up Only Pool
			"0xdC81A91B5B4E056DB3Fe9F27f8A13Be303810957", // Pool #9: [CErc20Delegator] Frax & Reflexer Stable Asset Pool
			"0x6f95d4d251053483f41c8718C30F4F3C404A8cf2", // Pool #18: [CErc20Delegator] Olympus Pool Party Frax
			"0x4AC34649C3Acbe2E06c71080cfa6C2F054F5AaC3", // Pool #19: [CErc20Delegator] IndexCoop Pool
			"0xf6BD560131c1BB8591Cf864cDD51817FD5657061", // Pool #24: [CErc20Delegator] Harvest FARMstead
		];
		let usdc_RariDelegator_instance;
		// let account_snapshot;
		for (let i = 0; i < usdc_pools_in_comptroller.length; i++){
			// Loan some FRAX
			usdc_RariDelegator_instance = await ICErc20Delegator.at(usdc_pools_in_comptroller[i]);
			console.log(`USDC Borrowed from [${usdc_pools_in_comptroller[i]}]`);
			await rari_amo_instance.addBorrowFusePool(usdc_pools_in_comptroller[i], { from: DEPLOYER_ADDRESS });
			await rari_amo_instance.borrowFromPool(usdc_pools_in_comptroller[i], new BigNumber("5000e6"), { from: DEPLOYER_ADDRESS });
			console.log("USDC borrow balance: ", new BigNumber(await rari_amo_instance.assetDeptToPoolByPoolIdx.call(i)).div(BIG6).toNumber());
			console.log("AMO USDC balance: ", new BigNumber(await usdc_instance.balanceOf.call(rari_amo_instance.address)).div(BIG6).toNumber());
		};
		
		console.log("===========================WAIT 4 WEEKS TO PAY===========================");
		console.log("Advance 4 weeks");
		for (let j = 0; j < 4; j++){
			await time.increase((7 * 86400) + 1);
			await time.advanceBlock();
			// Accrue interest
			await rari_amo_instance.accrueBorrowInterest({ from: DEPLOYER_ADDRESS });
		};

		for (let i = 0; i < usdc_pools_in_comptroller.length; i++){
			usdc_RariDelegator_instance = await ICErc20Delegator.at(usdc_pools_in_comptroller[i]);
			console.log(`USDC Borrowed from [${usdc_pools_in_comptroller[i]}]`);
			console.log("USDC borrow balance: ", new BigNumber(await rari_amo_instance.assetDeptToPoolByPoolIdx.call(i)).div(BIG6).toNumber());
		};
		
		console.log("=========================== REPAY USDC BY AMO ===========================");
		
		
		console.log("Transfer WETH to AMO");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]}
		);
		// Give the AMO address some WETH
		await usdc_instance.transfer(rari_amo_instance.address, new BigNumber("100e6"), { from: ADDRESS_WITH_USDC });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		for (let i = 0; i < usdc_pools_in_comptroller.length; i++){
			console.log(`USDC Repay To [${usdc_pools_in_comptroller[i]}]`);
			await rari_amo_instance.repayToPool(usdc_pools_in_comptroller[i], new BigNumber(await rari_amo_instance.assetDeptToPoolByPoolIdx.call(i)), { from: DEPLOYER_ADDRESS });
			console.log("USDC borrow balance: ", new BigNumber(await rari_amo_instance.assetDeptToPoolByPoolIdx.call(i)).div(BIG6).toNumber());
			console.log("AMO USDC balance: ", new BigNumber(await usdc_instance.balanceOf.call(rari_amo_instance.address)).div(BIG6).toNumber());
		};

		console.log("===========================BORROW FRAX AS ANOTHER PERSON===========================");
		const frax_balance_borrowing_before = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		
		// Loop through the pools
		for (let i = 0; i < pool_addresses.length; i++){
			// Borrow some frax
			const quickDelegator_instance = await ICErc20Delegator.at(pool_addresses[i]);
			await quickDelegator_instance.borrow(new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
			console.log(`[${pool_addresses[i]}] debt balance: `, new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		}
		const frax_balance_borrowing_after = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		console.log(`FRAX Change: ${frax_balance_borrowing_after - frax_balance_borrowing_before} FRAX`);
		
		console.log("===========================WAIT 4 WEEKS TO EARN===========================");
		console.log("Advance 4 weeks");
		for (let j = 0; j < 4; j++){
			await time.increase((7 * 86400) + 1);
			await time.advanceBlock();

			// Accrue interest
			await rari_amo_instance.accrueInterest({ from: DEPLOYER_ADDRESS });
		}
		
		the_allocations = await rari_amo_instance.showAllocations.call();
		utilities.printAllocations('RARI_AMO', the_allocations);

		// Note the collatDollarBalances
		console.log("Rari AMO collatDollarBalance:", new BigNumber((await rari_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log("=====================REDEEM FRAX=====================");
		const frax_balance_redeeming_before = new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address)).div(BIG18);

		// Loop through the pools
		for (let i = 0; i < pool_addresses.length; i++){
			// Redeem some cTokens for FRAX
			await rari_amo_instance.redeemFromPool(pool_addresses[i], new BigNumber("50000e18"), { from: DEPLOYER_ADDRESS });
			console.log(`[${pool_addresses[i]}] balance: `, new BigNumber(await rari_amo_instance.fraxInPoolByPoolIdx.call(i)).div(BIG18).toNumber())
		}
		
		const frax_balance_redeeming_after = new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address)).div(BIG18);
		console.log(`FRAX Change: ${frax_balance_redeeming_after - frax_balance_redeeming_before} FRAX`);

		the_allocations = await rari_amo_instance.showAllocations.call();
		utilities.printAllocations('RARI_AMO', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_frax_bal_before = new BigNumber(await frax_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18);
		console.log("investor_frax_bal_before: ", investor_frax_bal_before.toNumber());
		console.log("AMO frax Balance before: ", new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address)).div(BIG18).toNumber());
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1000e18")]);

		await rari_amo_instance.execute(frax_instance.address, 0, calldata, { from: DEPLOYER_ADDRESS });
		
		const investor_frax_bal_after = new BigNumber(await frax_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18);
		console.log("investor_frax_bal_after: ", investor_frax_bal_after.toNumber());
		console.log("AMO frax Balance after: ", new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address)).div(BIG18).toNumber());
		// Make sure tokens were actually transferred
		const investor_frax_balance_change = investor_frax_bal_after.minus(investor_frax_bal_before).div(BIG6).toNumber();
		console.log("Investor frax balance change:", investor_frax_balance_change);
		assert(investor_frax_bal_after > investor_frax_bal_before, 'Should have transferred');

		console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Rari AMO collatDollarBalance:", new BigNumber((await rari_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(rari_amo_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give all of the FRAX BACK");
		const amo_frax_bal = new BigNumber(await frax_instance.balanceOf.call(rari_amo_instance.address));
		await rari_amo_instance.burnFRAX(amo_frax_bal, { from: DEPLOYER_ADDRESS });
		console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FraxPoolV3 balance and collatDollarBalance after
		const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		console.log("Rari AMO collatDollarBalance:", new BigNumber((await rari_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(rari_amo_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK FINAL ALLOCATIONS ====================="));
		the_allocations = await rari_amo_instance.showAllocations.call();
		utilities.printAllocations('RARI_AMO', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);
		console.log("FraxPoolV3 USDC Balance Change:", pool_usdc_bal_end - pool_usdc_bal_start);
	});

	it("Fail Tests ", async () => {
		console.log(chalk.hex('#ffa500')("---------- Try entering the market to an invalid pool ----------"));
		await expectRevert(
			rari_amo_instance.enterMarkets("0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002", { from: accounts[9] }),
			"Invalid pool"
		);

		console.log(chalk.hex('#ffa500')("---------- Try lending to an invalid pool ----------"));
		await expectRevert(
			rari_amo_instance.lendToPool("0x0000000000000000000000000000000000000001", new BigNumber("100e18"), { from: accounts[9] }),
			"Invalid pool"
		);

		console.log(chalk.hex('#ffa500')("---------- Try redeeming from an invalid pool ----------"));
		await expectRevert(
			rari_amo_instance.redeemFromPool("0x0000000000000000000000000000000000000001", new BigNumber("100e18"), { from: accounts[9] }),
			"Invalid pool"
		);

	});

});