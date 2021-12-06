const path = require('path');
const Table = require('cli-table');
const envPath = path.join(__dirname, '../../../.env');
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

contract('veFXS Tests', async (accounts) => {
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

	// Initialize veFXS
	let veFXS_instance;

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
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);
	})

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {

		// await Promise.all([
		// 	oracle_instance_FRAX_USDC.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FRAX_FXS.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FXS_USDC.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FXS_WETH.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FRAX_WETH.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// ])


		// // Get the prices
		// // Price is in collateral needed for 1 FRAX
		// let frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		// let frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(frax_instance.address, new BigNumber("1e18")))).div(BIG6);

		// let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
		// let fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(fxs_instance.address, new BigNumber("1e18")))).div(BIG6);
		
		// let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, new BigNumber("1e18")))).div(BIG6);


		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(STAKING_OWNER, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });
		await fxs_instance.transfer(INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1000000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_FRAX]}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		// await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_FRAX]}
		// );

		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_ETH]}
		// );

		// // Give the Gauge controller admin some ETH
		// await hre.web3.eth.sendTransaction({ to: liquidity_gauge_instance.address, from: ADDRESS_WITH_ETH, value: hre.web3.utils.toWei("1", "ether")});

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_ETH]}
		// );

		// // Transfer some 3CRV
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_3CRV]}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address some 3CRV
		// await crv3Instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10100e18"), { from: ADDRESS_WITH_3CRV });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_3CRV]
		// });
		

		// // Transfer some DAI
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_DAI]}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address some DAI
		// await daiInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50e18"), { from: ADDRESS_WITH_DAI });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_DAI]
		// });

		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_USDC_2]}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		// await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000000e6"), { from: ADDRESS_WITH_USDC_2 });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_USDC_2]
		// });

		// // Transfer a lot of USDC
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_USDC_3]}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		// await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: ADDRESS_WITH_USDC_3 });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_USDC_3]
		// });


		// // Transfer a lot of USDC
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']}
		// );

		// await web3.eth.sendTransaction({ from: COLLATERAL_FRAX_AND_FXS_OWNER, to: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', value: 76000000000000000})
		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		// await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("84000000e6"), { from: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503' });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']
		// });


		// // Transfer a lot of USDT
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: ['0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40']}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDT
		// await usdt_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: '0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40' });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: ['0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40']
		// });

		// // Transfer a lot of DAI
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: ['0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca']}
		// );

		// // Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real DAI
		// await daiInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("20000000e18"), { from: '0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca' });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: ['0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca']
		// });

		console.log("accounts[1] realUSDC balance:", new BigNumber(await usdc_real_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6).toNumber());
		
		console.log(chalk.blue("==================PRICES=================="));

		// await Promise.all([
		// 	oracle_instance_FRAX_USDC.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FRAX_FXS.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FXS_USDC.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FXS_WETH.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// 	oracle_instance_FRAX_WETH.setAllowStaleConsults(true, { from: ORIGINAL_FRAX_ONE_ADDRESS }),
		// ])

		// // Print the new prices
		// console.log("ETH-USD price from Chainlink:", (new BigNumber((await frax_instance.frax_info.call())['7'])).div(1e6).toString() , "USD = 1 ETH");
		// console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), "FRAX = 1 WETH");
		// console.log("FRAX-USD price from Chainlink, Uniswap:", (new BigNumber(await frax_instance.frax_price.call())).div(1e6).toString(), "FRAX = 1 USD",);
		// console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), "USDC = 1 FRAX");
		// console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), "FXS = 1 WETH");
		// console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH");
		// console.log("USDC_price_from_pool: ", (new BigNumber (await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), "USDC = 1 USD");

		// let fxs_usdc_reserves = (await pair_instance_FXS_USDC.getReserves());
		// let fxs_current_reserves = (new BigNumber(fxs_usdc_reserves[0])).toNumber();
		// let usdc_current_reserves = (new BigNumber(fxs_usdc_reserves[1])).toNumber();
		// console.log("FXS-USDC reserves:", fxs_current_reserves, "FXS to", usdc_current_reserves, "USDC");
		// console.log(`[vAMM]: 1 FXS = ${(usdc_current_reserves * 1e12 / fxs_current_reserves).toFixed(4)} USDC`);
		// console.log("[oracle]: 1 FXS = ", fxs_price_from_FXS_USDC.toString(), "USDC");
	});

	it("Tests veFXS", async () => {

		console.log("=====================QUICK 4 YEAR TEST [NO INCREASES]=====================");

		// Create a new veFXS table
		const veFXS_table_4_years = new Table({
			head: ['Month', 'FXS', 'veFXS'], 
			colWidths: [20, 20, 20]
		});

		const deposit_amount_quick_e18_4_yr = new BigNumber(`100e18`);
		const deposit_amount_increment_e18_4_yr = new BigNumber(`10e18`);

		const deposit_quick_days_4_yr = 4 * 365 ; // 4 years
		const LOOP_MAX_4_YR = 48 + 1;
		const INTERVAL_AMOUNT_4_YR = 30 * 86400

		let block_time_current_4_yr = (await time.latest()).toNumber();
		const deposit_quick_timestamp_4_yr = block_time_current_4_yr + ((deposit_quick_days_4_yr * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_quick_e18_4_yr, { from: STAKING_OWNER });
		await veFXS_instance.create_lock(deposit_amount_quick_e18_4_yr, deposit_quick_timestamp_4_yr, { from: STAKING_OWNER });

		// await veFXS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_4_YR} blocks and ${deposit_quick_days_4_yr} days, checkpointing each time`);
		
		for (let j = 0; j <= LOOP_MAX_4_YR; j++){
			console.log("Loop #: ", j);
			const FXS_supply_mid = new BigNumber(await veFXS_instance.totalFXSSupply()).div(BIG18).toNumber();
			const veFXS_balance_mid = new BigNumber(await veFXS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber();
			veFXS_table_4_years.push([j, FXS_supply_mid, veFXS_balance_mid]);

			await time.increase(INTERVAL_AMOUNT_4_YR);
			await time.advanceBlock();
			await veFXS_instance.checkpoint();

			// await fxs_instance.approve(veFXS_instance.address, deposit_amount_increment_e18_4_yr, { from: STAKING_OWNER });
			// await veFXS_instance.increase_amount(deposit_amount_increment_e18_4_yr, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 veFXS"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_4_yr} days / 4 years`));
		console.log(veFXS_table_4_years.toString());

		// Withdraw
		await veFXS_instance.withdraw({ from: STAKING_OWNER });
		
		console.log("=====================QUICK 30 DAY TEST [NO INCREASES]=====================");

		// Create a new veFXS table
		const veFXS_table_30_day = new Table({
			head: ['Month', 'FXS', 'veFXS'], 
			colWidths: [20, 20, 20]
		});

		const deposit_amount_quick_e18_30_days = new BigNumber(`100e18`);
		const deposit_amount_increment_e18_30_days = new BigNumber(`10e18`);

		const deposit_quick_days_30_days = 30; // 1 month
		const LOOP_MAX_30_DAYS = 30 + 1;
		const INTERVAL_AMOUNT_30_DAYS = 1 * 86400
		

		let block_time_current_30_days_0 = (await time.latest()).toNumber();
		const deposit_quick_timestamp_30_days_0 = block_time_current_30_days_0 + ((deposit_quick_days_30_days * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_quick_e18_30_days, { from: STAKING_OWNER });
		await veFXS_instance.create_lock(deposit_amount_quick_e18_30_days, deposit_quick_timestamp_30_days_0, { from: STAKING_OWNER });

		// await veFXS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_30_DAYS} blocks and ${deposit_quick_days_30_days} days, checkpointing each time`);
		
		for (let j = 0; j <= LOOP_MAX_30_DAYS; j++){
			console.log("Loop #: ", j);
			const FXS_supply_mid = new BigNumber(await veFXS_instance.totalFXSSupply()).div(BIG18).toNumber();
			const veFXS_balance_mid = new BigNumber(await veFXS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber();
			veFXS_table_30_day.push([j, FXS_supply_mid, veFXS_balance_mid]);

			await time.increase(INTERVAL_AMOUNT_30_DAYS);
			await time.advanceBlock();
			await veFXS_instance.checkpoint();

			// await fxs_instance.approve(veFXS_instance.address, deposit_amount_increment_e18, { from: STAKING_OWNER });
			// await veFXS_instance.increase_amount(deposit_amount_increment_e18, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 veFXS"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_30_days} days / 3 years`));
		console.log(veFXS_table_30_day.toString());

		// Withdraw
		await veFXS_instance.withdraw({ from: STAKING_OWNER });

		let block_time_current_30_days_1 = (await time.latest()).toNumber();
		const deposit_quick_timestamp_30_days_1 = block_time_current_30_days_1 + ((deposit_quick_days_30_days * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_quick_e18_30_days, { from: STAKING_OWNER });
		await veFXS_instance.create_lock(deposit_amount_quick_e18_30_days, deposit_quick_timestamp_30_days_1, { from: STAKING_OWNER });

		// await veFXS_instance.checkpoint();

		console.log(`Advance ${LOOP_MAX_30_DAYS} blocks and ${deposit_quick_days_30_days} days, checkpointing each time`);
		
		for (let j = 0; j <= LOOP_MAX_30_DAYS; j++){
			console.log("Loop #: ", j);
			const FXS_supply_mid = new BigNumber(await veFXS_instance.totalFXSSupply()).div(BIG18).toNumber();
			const veFXS_balance_mid = new BigNumber(await veFXS_instance.balanceOf(STAKING_OWNER)).div(BIG18).toNumber();
			veFXS_table_30_day.push([j, FXS_supply_mid, veFXS_balance_mid]);

			await time.increase(INTERVAL_AMOUNT_30_DAYS);
			await time.advanceBlock();
			await veFXS_instance.checkpoint();

			// await fxs_instance.approve(veFXS_instance.address, deposit_amount_increment_e18, { from: STAKING_OWNER });
			// await veFXS_instance.increase_amount(deposit_amount_increment_e18, { from: STAKING_OWNER });
		}

		// Print the table
		console.log(chalk.yellow.bold("STARTING WITH 100 veFXS"));
		console.log(chalk.yellow.bold(`${deposit_quick_days_30_days} days / 3 years`));
		console.log(veFXS_table_30_day.toString());

		// Withdraw
		await veFXS_instance.withdraw({ from: STAKING_OWNER });

		console.log("=====================DEPOSIT FXS=====================");
		console.log("Get veFXS balance before");
		const pre_deposit_veFXS = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("pre_deposit_veFXS:", pre_deposit_veFXS);

		
		const deposit_amount = 1000;
		const deposit_amount_e18 = new BigNumber(`${deposit_amount}e18`);
		const deposit_days = 488;
		console.log(`Deposit ${deposit_amount} FXS for ${deposit_days} days`);
		console.log(`Once for COLLATERAL_FRAX_AND_FXS_OWNER, another for INVESTOR_CUSTODIAN_ADDRESS`);
		block_time_current = (await time.latest()).toNumber();
		let staking_end_time = block_time_current + ((deposit_days * 86400) + 1);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_e18, { from: INVESTOR_CUSTODIAN_ADDRESS });
		await veFXS_instance.create_lock(deposit_amount_e18, staking_end_time, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.create_lock(deposit_amount_e18, staking_end_time, { from: INVESTOR_CUSTODIAN_ADDRESS });

		console.log("Get veFXS balance after");
		const post_deposit_veFXS = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("post_deposit_veFXS:", post_deposit_veFXS);
		console.log("effective multiplier:", post_deposit_veFXS / deposit_amount, "x");

		console.log("=====================ADD SOME MORE FXS=====================");
		// Move up 1 second
		await time.increase(1);
		await time.advanceBlock();

		const deposit_amount_2 = 100;
		const deposit_amount_2_e18 = new BigNumber(`${deposit_amount_2}e18`);

		console.log(`Add ${deposit_amount_2} more FXS`);
		await fxs_instance.approve(veFXS_instance.address, deposit_amount_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await veFXS_instance.increase_amount(deposit_amount_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const veFXS_after_adding_more = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance after adding more:", veFXS_after_adding_more);


		console.log("=====================INCREASE THE TIME OF THE LOCK=====================");
		// Move up 1 second
		await time.increase(1);
		await time.advanceBlock();

		const user_lock = await veFXS_instance.locked(COLLATERAL_FRAX_AND_FXS_OWNER);
		const lock_extension_new_timestamp = (new BigNumber(user_lock.end).toNumber()) + ((7 * 86400) + 1); // add a week

		const veFXS_before_lock_extension = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance before extending the lock:", veFXS_before_lock_extension);

		console.log(`Extend the lock to ${lock_extension_new_timestamp} timestamp`);
		await veFXS_instance.increase_unlock_time(lock_extension_new_timestamp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const veFXS_after_lock_extension = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("veFXS balance after extending the lock:", veFXS_after_lock_extension);

		const veFXS_epoch_0 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		const veFXS_total_supply_0 = new BigNumber(await veFXS_instance.totalSupply()).div(BIG18).toNumber();
		const veFXS_fxs_supply_0 = new BigNumber(await veFXS_instance.supply()).div(BIG18).toNumber();
		
		console.log("veFXS_epoch_0:", veFXS_epoch_0);
		console.log("veFXS_total_supply_0:", veFXS_total_supply_0);
		console.log("veFXS_fxs_supply_0:", veFXS_fxs_supply_0);
		await utilities.printVeFXS_Points(veFXS_instance, veFXS_epoch_0, COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log("=====================TRY TO EXTEND A SHORTER AMOUNT (SHOULD FAIL)=====================");
		await expectRevert.unspecified(veFXS_instance.increase_unlock_time(1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("=====================TRY TO UNLOCK EARLY (SHOULD FAIL)=====================");
		// Move up 30 days
		await time.increase((30 * 86400) + 1);
		await time.advanceBlock();

		console.log("Try to withdraw early (should fail)");
		await expectRevert.unspecified(veFXS_instance.withdraw({ from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("=====================TRY TO UNLOCK EARLY (EMERGENCY UNLOCK ACTIVE)=====================");
		// Toggle the emergency unlock on
		await veFXS_instance.toggleEmergencyUnlock({ from: DEPLOYER_ADDRESS });

		console.log("Get FXS and veFXS balances before");
		const pre_withdrawal_FXS_2 = new BigNumber(await fxs_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		const pre_withdrawal_veFXS_2 = new BigNumber(await veFXS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		console.log("pre_withdrawal_FXS_2:", pre_withdrawal_FXS_2);
		console.log("pre_withdrawal_veFXS_2:", pre_withdrawal_veFXS_2);

		console.log("Try to withdraw early (with the emergency unlock active)");
		await veFXS_instance.withdraw({ from: INVESTOR_CUSTODIAN_ADDRESS });

		console.log("Get FXS and veFXS balances after");
		const post_withdrawal_FXS_2 = new BigNumber(await fxs_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();
		const post_withdrawal_veFXS_2 = new BigNumber(await veFXS_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber();

		console.log(`post_withdrawal_FXS_2: ${post_withdrawal_FXS_2} (change: ${post_withdrawal_FXS_2 - pre_withdrawal_FXS_2})`);
		console.log(`post_withdrawal_veFXS_2: ${post_withdrawal_veFXS_2} (change: ${post_withdrawal_veFXS_2 - pre_withdrawal_veFXS_2})`);


		// Toggle the emergency unlock off
		await veFXS_instance.toggleEmergencyUnlock({ from: DEPLOYER_ADDRESS });

		console.log("=====================TRY TO UNLOCK EARLY (SHOULD FAIL AGAIN)=====================");
		console.log("Try to withdraw early (should fail)");
		await expectRevert.unspecified(veFXS_instance.withdraw({ from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("=====================ADVANCE SOME BLOCKS AND DO A CHECKPOINT=====================");
		console.log("Advance 15 blocks and 15 days and checkpoint");
		for (let j = 0; j < 15; j++){
			await time.increase(86400);
			await time.advanceBlock();
		}

		// Do a quick checkpoint
		await veFXS_instance.checkpoint();

		console.log("=====================PRINT SOME STATS=====================");
		const block_10_ago = (new BigNumber(await time.latestBlock())).toNumber() - 10;
		const veFXS_epoch = new BigNumber(await veFXS_instance.epoch()).toNumber();
		const veFXS_fxs_supply = new BigNumber(await veFXS_instance.supply()).div(BIG18).toNumber();
		const veFXS_total_supply = new BigNumber(await veFXS_instance.totalSupply()).div(BIG18).toNumber();
		const veFXS_total_supply_10_blocks_before = new BigNumber(await veFXS_instance.totalSupplyAt(block_10_ago)).div(BIG18).toNumber();
		const veFXS_account1_balance = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFXS_account1_balance_10_blocks_before = new BigNumber(await veFXS_instance.balanceOfAt(COLLATERAL_FRAX_AND_FXS_OWNER, block_10_ago)).div(BIG18).toNumber();
		
		console.log("veFXS_epoch:", veFXS_epoch);
		console.log("veFXS_fxs_supply:", veFXS_fxs_supply);
		console.log("veFXS_total_supply:", veFXS_total_supply);
		console.log("veFXS_total_supply_10_blocks_before:", veFXS_total_supply_10_blocks_before);
		await utilities.printVeFXS_Points(veFXS_instance, veFXS_epoch, COLLATERAL_FRAX_AND_FXS_OWNER);
		
		console.log("veFXS 'balance' should decrease as it gets closer to the expiry. However, the FXS will not be lost");
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFXS_account1_balance:", veFXS_account1_balance);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFXS_balance_10_blocks_before:", veFXS_account1_balance_10_blocks_before);

		console.log("=====================ADVANCE, CHECKPOINT, AND PRINT SOME STATS=====================");
		// Advance up right before the end
		// Move up 487 + 7 - 30 - 15  = 449 days. Subtract 7 days for good measure = 442
		// Do in 1 week increments
		for (let j = 0; j < Math.floor(442 / 7); j++){
			await time.increase(7 * 86400);
			await time.advanceBlock();
		}

		// Do a quick checkpoint
		await veFXS_instance.checkpoint();

		const block_10_ago_1 = (new BigNumber(await time.latestBlock())).toNumber() - 10;
		const veFXS_epoch_1 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		const veFXS_fxs_supply_1 = new BigNumber(await veFXS_instance.supply()).div(BIG18).toNumber();
		const veFXS_total_supply_1 = new BigNumber(await veFXS_instance.totalSupply()).div(BIG18).toNumber();
		const veFXS_total_supply_10_blocks_before_1 = new BigNumber(await veFXS_instance.totalSupplyAt(block_10_ago_1)).div(BIG18).toNumber();
		const veFXS_account1_balance_1 = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFXS_account1_balance_10_blocks_before_1 = new BigNumber(await veFXS_instance.balanceOfAt(COLLATERAL_FRAX_AND_FXS_OWNER, block_10_ago_1)).div(BIG18).toNumber();
		
		console.log("veFXS_epoch:", veFXS_epoch_1);
		console.log("veFXS_fxs_supply:", veFXS_fxs_supply_1);
		console.log("veFXS_total_supply:", veFXS_total_supply_1);
		console.log("veFXS_total_supply_10_blocks_before:", veFXS_total_supply_10_blocks_before_1);
		await utilities.printVeFXS_Points(veFXS_instance, veFXS_epoch_1, COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log("veFXS 'balance' should decrease as it gets closer to the expiry. However, the FXS will not be lost");
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFXS_account1_balance:", veFXS_account1_balance_1);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFXS_balance_10_blocks_before:", veFXS_account1_balance_10_blocks_before_1);


		console.log("=====================TRY TO WITHDRAW CORRECTLY=====================");
		// Advance past the end
		await time.increase((14 * 86400) + 1);
		await time.advanceBlock();

		console.log("Get FXS and veFXS balances before");
		const pre_withdrawal_FXS = new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const pre_withdrawal_veFXS = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("pre_withdrawal_FXS:", pre_withdrawal_FXS);
		console.log("pre_withdrawal_veFXS:", pre_withdrawal_veFXS);

		console.log("Try to withdraw correctly now");
		await veFXS_instance.withdraw({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Get FXS and veFXS balances after");
		const post_withdrawal_FXS = new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const post_withdrawal_veFXS = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log(`post_withdrawal_FXS: ${post_withdrawal_FXS} (change: ${post_withdrawal_FXS - pre_withdrawal_FXS})`);
		console.log(`post_withdrawal_veFXS: ${post_withdrawal_veFXS} (change: ${post_withdrawal_veFXS - pre_withdrawal_veFXS})`);


		console.log("=====================ADVANCE, CHECKPOINT, AND PRINT SOME STATS=====================");
		// Advance one week
		await time.increase((7 * 86400) + 1);
		await time.advanceBlock();

		// Do a quick checkpoint
		await veFXS_instance.checkpoint();

		const block_10_ago_2 = (new BigNumber(await time.latestBlock())).toNumber() - 10;
		const veFXS_epoch_2 = new BigNumber(await veFXS_instance.epoch()).toNumber();
		const veFXS_fxs_supply_2 = new BigNumber(await veFXS_instance.supply()).div(BIG18).toNumber();
		const veFXS_total_supply_2 = new BigNumber(await veFXS_instance.totalSupply()).div(BIG18).toNumber();
		const veFXS_total_supply_10_blocks_before_2 = new BigNumber(await veFXS_instance.totalSupplyAt(block_10_ago_2)).div(BIG18).toNumber();
		const veFXS_account1_balance_2 = new BigNumber(await veFXS_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const veFXS_account1_balance_10_blocks_before_2 = new BigNumber(await veFXS_instance.balanceOfAt(COLLATERAL_FRAX_AND_FXS_OWNER, block_10_ago_2)).div(BIG18).toNumber();
		
		console.log("veFXS_epoch:", veFXS_epoch_2);
		console.log("veFXS_fxs_supply:", veFXS_fxs_supply_2);
		console.log("veFXS_total_supply:", veFXS_total_supply_2);
		console.log("veFXS_total_supply_10_blocks_before:", veFXS_total_supply_10_blocks_before_2);
		await utilities.printVeFXS_Points(veFXS_instance, veFXS_epoch_1, COLLATERAL_FRAX_AND_FXS_OWNER);

		console.log("veFXS 'balance' should decrease as it gets closer to the expiry. However, the FXS will not be lost");
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFXS_account1_balance:", veFXS_account1_balance_2);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER veFXS_balance_10_blocks_before:", veFXS_account1_balance_10_blocks_before_2);

		// Need to do withdrawal tests

		return;

		const pre_deposit_3pool_usdc_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_usdc_only);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 10k USDC into the metapool");
		await curve_amo_v3_instance.metapoolDeposit(0, new BigNumber("10000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_usdc_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_usdc_only);
		const post_deposit_3pool_usdc_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_usdc_only);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================DEPOSIT [FRAX ONLY]=====================");
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_frax_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_frax_only);
		const pre_deposit_3pool_frax_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_frax_only);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 100k FRAX into the metapool")
		await curve_amo_v3_instance.metapoolDeposit(new BigNumber("100000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_frax_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_frax_only);
		const post_deposit_3pool_frax_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_frax_only);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================DEPOSIT [FRAX AND USDC]=====================");
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_both = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_both);
		const pre_deposit_3pool_both = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_both);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 5k FRAX and 5k USDC into the metapool")
		await curve_amo_v3_instance.metapoolDeposit(new BigNumber("5000e18"), new BigNumber("5000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_both = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_both);
		const post_deposit_3pool_both = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_both);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================WITHDRAW FRAX FROM THE METAPOOL=====================");
		const test_amt_frax = new BigNumber("7000e18");
		console.log(`Withdraw ${test_amt_frax.div(BIG18).toNumber()} FRAX from the metapool. Don't burn the FRAX`);
		await curve_amo_v3_instance.metapoolWithdrawFrax(test_amt_frax, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================WITHDRAW 3POOL FROM THE METAPOOL=====================");
		const test_amt_3pool = new BigNumber("3000e18");
		console.log(`Withdraw ${test_amt_3pool.div(BIG18).toNumber()} 3pool from the metapool.`);
		await curve_amo_v3_instance.metapoolWithdraw3pool(test_amt_3pool, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);


		console.log("=====================CONVERT 3POOL TO USDC=====================");
		const bal_3pool = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address));
		console.log(`Convert ${bal_3pool.div(BIG18).toNumber()} 3pool to USDC.`);
		await curve_amo_v3_instance.three_pool_to_collateral(bal_3pool, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================WITHDRAW 3POOL AND USDC FROM THE METAPOOL AT THE SAME TIME=====================");
		const test_amt_3pool_both = new BigNumber("5000e18");
		console.log(`Withdraw ${test_amt_3pool_both.div(BIG18).toNumber()} FRAX3CRV from the metapool and convert.`);
		await curve_amo_v3_instance.metapoolWithdrawAndConvert3pool(test_amt_3pool_both, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================WITHDRAW 3POOL AND FRAX FROM THE METAPOOL AT THE CURRENT BALANCE=====================");
		const test_amt_frax_usdc = new BigNumber("5000e18");
		console.log(`Withdraw ${test_amt_frax_usdc.div(BIG18).toNumber()} FRAX3CRV from the metapool and convert.`);
		await curve_amo_v3_instance.metapoolWithdrawAtCurRatio(test_amt_frax_usdc, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		// GAUGE NEEDS TO BE LIVE FIRST!!!

		console.log("=====================DEPOSIT TO GAUGE=====================");
		console.log("Deposit some of the LP to the gauge");
		await curve_amo_v3_instance.depositToGauge(new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		// Do some gauge and gauge controller checkpoints
		await gauge_controller_instance.checkpoint();
		await gauge_controller_instance.checkpoint_gauge(liquidity_gauge_instance.address);
		await curve_amo_v3_instance.checkpointGauge({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("=====================COLLECT CRV REWARDS=====================");
		await time.increase((31 * 86400) + 1);
		await time.advanceBlock();

		// Do some gauge and gauge controller checkpoints
		await gauge_controller_instance.checkpoint();
		await gauge_controller_instance.checkpoint_gauge(liquidity_gauge_instance.address);
		await curve_amo_v3_instance.checkpointGauge({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Print available CRV rewards");
		const crv_rewards = await curve_amo_v3_instance.claimableCRV();
		console.log("Claimable CRV:", new BigNumber(crv_rewards).div(BIG18).toNumber());

		console.log("Collect CRV rewards");
		await curve_amo_v3_instance.collectCRVFromGauge({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const crv_balance = await curve_amo_v3_instance.freeCRV();
		console.log("CRV balance:", new BigNumber(crv_balance).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		console.log("=====================WITHDRAW FROM THE GAUGE=====================");
		console.log("Withdraw some of the LP from the gauge");
		await curve_amo_v3_instance.withdrawFromGauge(new BigNumber("2500e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V4', the_allocations);

		const fxs_balance_after = new BigNumber(await fxs_instance.balanceOf.call(curve_amo_v3_instance.address)).div(BIG18);
		const usdc_balance_after = new BigNumber(await usdc_instance.balanceOf.call(curve_amo_v3_instance.address)).div(BIG6);
		const borrowed_balance = new BigNumber(await curve_amo_v3_instance.collateralBalance.call()).div(BIG6);
		console.log("FXS after: ", fxs_balance_after.toNumber());
		console.log("USDC after: ", usdc_balance_after.toNumber());
		console.log("collateral balance: ", borrowed_balance.toNumber());
		//console.log("Frax CR:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());
	    console.log("CurveAMO_V4 collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());
		
		console.log("=====================TEST get_D() AND get_D_and_iterations()=====================");

	    var get_D = new BigNumber(await curve_amo_v3_instance.get_D()).toNumber();
		console.log("\nget_D():", get_D);

		console.log("\nFind the new reserves in the metapool if FRAX price fell to CR");
		var balances = await curve_amo_v3_instance.iterate();
		var b0 = new BigNumber(balances[0]).div(BIG18).toNumber();
		var b1 = new BigNumber(balances[1]).div(BIG18).toNumber();
		var b2 = new BigNumber(balances[2]).toNumber();
		console.log("FRAX:", b0, "; 3CRV:", b1);
		console.log("number of rounds needed to find new point", b2);
	});

});