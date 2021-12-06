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
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
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
const CurveAMO_V4 = artifacts.require("Curve/CurveAMO_V4.sol");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

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

contract('Curve AMO V4 Tests', async (accounts) => {
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
	const ADDRESS_WITH_3CRV = '0x524ABA01f9E2b6d68e738E9ed22CaAe8B4125411';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';
	const PROXY_ADMIN_ADDRESS = '0x900909C07c2761d84C5d863FF5905102916DF69C';

	// Curve Metapool
	let crv3Instance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_real_instance;
	let usdt_real_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let curve_amo_v4_instance;
	let frax_amo_minter_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;

	// Initialize oracle instances
	let oracle_instance_FXS_WETH;

	// Initialize pool instances
	let pool_instance_V3;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);

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

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_real_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		// curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		// frax_3crv_metapool_instance = await MetaImplementationUSD.at(METAPOOL_ADDRESS); // can break if deployment order changes
		frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
	
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

		// Get instances of the Sushi pairs
		//pair_instance_FRAX_FXS_Sushi = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Sushi FRAX/FXS"]);
		//pair_instance_FXS_WETH_Sushi = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Sushi FXS/WETH"]);

		

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();

		console.log(chalk.hex("#ff8b3d").bold("=========================Proxy Upgrade========================="));


		// console.log(chalk.hex("#ff8b3d").bold("=========================Proxy Deployments========================="));

		// console.log(chalk.yellow('========== Curve AMO V4 =========='));
		// const CurveAMO_V4_Implementation = await hre.ethers.getContractFactory("CurveAMO_V4");
		// const proxy_obj = await hre.upgrades.deployProxy(CurveAMO_V4_Implementation, [
		// 	frax_instance.address, 
		// 	fxs_instance.address, 
		// 	usdc_instance.address, 
		// 	COLLATERAL_FRAX_AND_FXS_OWNER, 
		// 	INVESTOR_CUSTODIAN_ADDRESS, 
		// 	timelockInstance.address,
		// 	frax_3crv_metapool_instance.address,
		// 	"0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // 3CRV pool
		// 	"0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // 3CRV token
		// 	pool_instance_USDC.address
		// ]);
		// const proxy_instance = await proxy_obj.deployed();
		// console.log("CurveAMO_V4 proxy deployed at: ", proxy_instance.address);

		// // Get out of ethers and back to web3. It gives a signer-related error
		// curve_amo_v4_instance = await CurveAMO_V4.at(proxy_instance.address);

		// If truffle-fixture is used
		curve_amo_v4_instance = await CurveAMO_V4.deployed();

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
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("500000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

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

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC_2]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000000e6"), { from: ADDRESS_WITH_USDC_2 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC_2]
		});

		// Transfer a lot of USDC
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC_3]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: ADDRESS_WITH_USDC_3 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC_3]
		});

		// Transfer a lot of ETH
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']}
		);

		await web3.eth.sendTransaction({ from: COLLATERAL_FRAX_AND_FXS_OWNER, to: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', value: 76000000000000000})
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		// await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("84000000e6"), { from: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503' });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']
		});

		// Transfer a lot of USDT
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40']}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDT
		await usdt_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: '0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40' });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40']
		});

		// Transfer a lot of DAI
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca']}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real DAI
		await daiInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("20000000e18"), { from: '0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca' });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca']
		});





		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log("=================SET VARIABLES================");

		console.log("Advance a block");
		await time.increase(15);
		await time.advanceBlock();


		console.log(chalk.hex("#ff8b3d").bold("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]====================="));
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

		// Note balances afterwards
		const frax_balance_after_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_after_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_after_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		
		// Print the changes
		console.log(`FRAX Change: ${frax_balance_after_redeem - frax_balance_before_redeem} FRAX`);
		console.log(`FXS Change: ${fxs_balance_after_redeem - fxs_balance_before_redeem} FXS`);
		console.log(`USDC Change: ${usdc_balance_after_redeem - usdc_balance_before_redeem} USDC`);



		// PRE TEST
		// console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW EVERYTHING FROM THE VAULT====================="));
		// const amount_in_vault_00_E18 = await curve_amo_v4_instance.yvCurveFRAXBalance.call();
		// const withdrawal_amount_00_e18 = amount_in_vault_00_E18;
		// const withdrawal_amount_00 = (new BigNumber(withdrawal_amount_00_e18)).div(BIG18).toNumber();
		// console.log(`Redeem ${withdrawal_amount_00} yVault tokens for FRAX3CRV`);
		// await curve_amo_v4_instance.withdrawFromVault(withdrawal_amount_00_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Print some info");
		// let quick_allocations = await curve_amo_v4_instance.showAllocations.call();
  //   	utilities.printAllocations("Curve_AMO", quick_allocations);

		// return false;

		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("gcv_bal_start: ", gcv_bal_start);

		// Note the FraxPoolV3 Balance too
		const pool_usdc_bal_start = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		console.log("pool_usdc_bal_start: ", pool_usdc_bal_start);


		console.log(chalk.hex("#ff8b3d").bold("=====================GET USDC====================="));
		console.log("Get some USDC from the AMO Minter");
		await frax_amo_minter_instance.giveCollatToAMO(curve_amo_v4_instance.address, new BigNumber("300000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Print some info");
		// let the_allocations = await curve_amo_v4_instance.showAllocations.call();
  //   	utilities.printAllocations("Curve_AMO", the_allocations);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================DEPOSIT [USDC ONLY]====================="));
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_usdc_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_usdc_only);
		const pre_deposit_3pool_usdc_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_usdc_only);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 10k USDC into the metapool");
		await curve_amo_v4_instance.metapoolDeposit(0, new BigNumber("10000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_usdc_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_usdc_only);
		const post_deposit_3pool_usdc_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_usdc_only);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO dollarBalances [FRAX]:", (new BigNumber((await curve_amo_v4_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("Curve AMO dollarBalances [COLLAT]:", (new BigNumber((await curve_amo_v4_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================DEPOSIT [FRAX ONLY]====================="));
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_frax_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_frax_only);
		const pre_deposit_3pool_frax_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_frax_only);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Get some FRAX from the minter");
		await frax_amo_minter_instance.mintFraxForAMO(curve_amo_v4_instance.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Depositing 100k FRAX into the metapool")
		await curve_amo_v4_instance.metapoolDeposit(new BigNumber("100000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_frax_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_frax_only);
		const post_deposit_3pool_frax_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_frax_only);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO dollarBalances [FRAX]:", (new BigNumber((await curve_amo_v4_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("Curve AMO dollarBalances [COLLAT]:", (new BigNumber((await curve_amo_v4_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================DEPOSIT [FRAX AND USDC]====================="));
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_both = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_both);
		const pre_deposit_3pool_both = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_both);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Get some FRAX from the minter");
		await frax_amo_minter_instance.mintFraxForAMO(curve_amo_v4_instance.address, new BigNumber("5000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Depositing 5k FRAX and 5k USDC into the metapool")
		await curve_amo_v4_instance.metapoolDeposit(new BigNumber("5000e18"), new BigNumber("5000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_both = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_both);
		const post_deposit_3pool_both = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_both);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await usdc_instance.balanceOf(curve_amo_v4_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO dollarBalances [FRAX]:", (new BigNumber((await curve_amo_v4_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("Curve AMO dollarBalances [COLLAT]:", (new BigNumber((await curve_amo_v4_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW FRAX FROM THE METAPOOL====================="));
		const test_amt_frax = new BigNumber("7000e18");
		console.log(`Withdraw ${test_amt_frax.div(BIG18).toNumber()} FRAX from the metapool. Don't burn the FRAX`);
		await curve_amo_v4_instance.metapoolWithdrawFrax(test_amt_frax, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW 3POOL FROM THE METAPOOL====================="));
		const test_amt_3pool = new BigNumber("3000e18");
		console.log(`Withdraw ${test_amt_3pool.div(BIG18).toNumber()} 3pool from the metapool.`);
		await curve_amo_v4_instance.metapoolWithdraw3pool(test_amt_3pool, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================CONVERT 3POOL TO USDC====================="));
		const bal_3pool = new BigNumber(await crv3Instance.balanceOf(curve_amo_v4_instance.address));
		console.log(`Convert ${bal_3pool.div(BIG18).toNumber()} 3pool to USDC.`);
		await curve_amo_v4_instance.three_pool_to_collateral(bal_3pool, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW 3POOL AND USDC FROM THE METAPOOL AT THE SAME TIME====================="));
		const test_amt_3pool_both = new BigNumber("5000e18");
		console.log(`Withdraw ${test_amt_3pool_both.div(BIG18).toNumber()} FRAX3CRV from the metapool and convert.`);
		await curve_amo_v4_instance.metapoolWithdrawAndConvert3pool(test_amt_3pool_both, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW 3POOL AND FRAX FROM THE METAPOOL AT THE CURRENT BALANCE====================="));
		const test_amt_frax_usdc = new BigNumber("5000e18");
		console.log(`Withdraw ${test_amt_frax_usdc.div(BIG18).toNumber()} FRAX3CRV from the metapool and convert.`);
		await curve_amo_v4_instance.metapoolWithdrawAtCurRatio(test_amt_frax_usdc, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

    	console.log(chalk.hex("#ff8b3d").bold("=====================CHECK iterate()====================="));
    	const iterate = await curve_amo_v4_instance.iterate();
    	const frax_iterate_balance = new BigNumber(iterate[0]).div(BIG18).toNumber();
    	const crv3_iterate_balance = new BigNumber(iterate[1]).div(BIG18).toNumber();
    	console.log(frax_iterate_balance);
    	console.log(crv3_iterate_balance);
    	console.log("# of rounds:", new BigNumber(iterate[2]).toNumber());
    	console.log("factor:", new BigNumber(iterate[3]).div(BIG6).toNumber());
    	console.log("iterate balance total:", frax_iterate_balance + crv3_iterate_balance);

    	const frax_amo_balance = new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber();
    	const crv3_amo_balance = new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber();
    	console.log(frax_amo_balance);
    	console.log(crv3_amo_balance);
    	console.log("raw balance total:", frax_amo_balance + crv3_amo_balance);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================DEPOSIT TO VAULT====================="));
		const deposit_amount_e18 = new BigNumber("5000e18");
		const deposit_amount = deposit_amount_e18.div(BIG18).toNumber();
		console.log(`Deposit ${deposit_amount} LP to the vault`);
		await curve_amo_v4_instance.depositToVault(deposit_amount_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		const amount_in_vault_0 = new BigNumber(await curve_amo_v4_instance.yvCurveFRAXBalance.call()).div(BIG18).toNumber();
		const usd_value_in_vault_0 = new BigNumber(await curve_amo_v4_instance.usdValueInVault.call()).div(BIG18).toNumber();
    	console.log("yvCurveFRAXBalance amount_in_vault_0: ", amount_in_vault_0);
		console.log("usd_value_in_vault_0: ", usd_value_in_vault_0);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================ADVANCE SOME TIME AND SEE GROWTH====================="));
		// Advance a few weeks
		for (let j = 0; j < 10; j++){
			await time.increase(7 * 86400);
			await time.advanceBlock();
		}

		const amount_in_vault_1_E18 = await curve_amo_v4_instance.yvCurveFRAXBalance.call();
		const amount_in_vault_1 = (new BigNumber(amount_in_vault_1_E18)).div(BIG18).toNumber();
		const usd_value_in_vault_1 = (new BigNumber(await curve_amo_v4_instance.usdValueInVault.call())).div(BIG18).toNumber();
    	console.log("yvCurveFRAXBalance amount_in_vault_1: ", amount_in_vault_1);
		console.log("usd_value_in_vault_1: ", usd_value_in_vault_1);
		
		console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW EVERYTHING FROM THE VAULT====================="));
		const withdrawal_amount_e18 = amount_in_vault_1_E18;
		const withdrawal_amount = (new BigNumber(withdrawal_amount_e18)).div(BIG18).toNumber();
		console.log(`Redeem ${withdrawal_amount} yVault tokens for FRAX3CRV`);
		await curve_amo_v4_instance.withdrawFromVault(withdrawal_amount_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		const fxs_balance_after = new BigNumber(await fxs_instance.balanceOf.call(curve_amo_v4_instance.address)).div(BIG18);
		const usdc_balance_after = new BigNumber(await usdc_instance.balanceOf.call(curve_amo_v4_instance.address)).div(BIG6);
		const borrowed_balance = new BigNumber(await frax_amo_minter_instance.collat_borrowed_balances.call(curve_amo_v4_instance.address)).div(BIG6);
		console.log("FXS after: ", fxs_balance_after.toNumber());
		console.log("USDC after: ", usdc_balance_after.toNumber());
		console.log("collateral balance: ", borrowed_balance.toNumber());
		//console.log("Frax CR:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());

		const big_test_collatdollarbalance_before = (new BigNumber((await curve_amo_v4_instance.dollarBalances())[1])).div(BIG18).toNumber();
		console.log("CurveAMO_V4 dollarBalances before [COLLAT]:", big_test_collatdollarbalance_before);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================PUT 10k FRAX3CRV IN THE VAULT====================="));
		const deposit_amount_2_e18 = new BigNumber("10000e18");
		const deposit_amount_2 = deposit_amount_2_e18.div(BIG18).toNumber();
		console.log(`Deposit ${deposit_amount_2} LP to the vault`);
		await curve_amo_v4_instance.depositToVault(deposit_amount_2_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		const amount_in_vault_3 = new BigNumber(await curve_amo_v4_instance.yvCurveFRAXBalance.call()).div(BIG18).toNumber();
		const usd_value_in_vault_3 = new BigNumber(await curve_amo_v4_instance.usdValueInVault.call()).div(BIG18).toNumber();
    	console.log("yvCurveFRAXBalance amount_in_vault_3: ", amount_in_vault_3);
		console.log("usd_value_in_vault_3: ", usd_value_in_vault_3);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================ADVANCE SOME TIME AND SEE GROWTH====================="));
		// Advance a few weeks
		for (let j = 0; j < 10; j++){
			await time.increase(7 * 86400);
			await time.advanceBlock();
		}

		const amount_in_vault_4_E18 = await curve_amo_v4_instance.yvCurveFRAXBalance.call();
		const amount_in_vault_4 = (new BigNumber(amount_in_vault_4_E18)).div(BIG18).toNumber();
		const usd_value_in_vault_4 = (new BigNumber(await curve_amo_v4_instance.usdValueInVault.call())).div(BIG18).toNumber();
    	console.log("yvCurveFRAXBalance amount_in_vault_4: ", amount_in_vault_4);
		console.log("usd_value_in_vault_4: ", usd_value_in_vault_4);

		// Note the collatDollarBalances
		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		
		console.log(chalk.hex("#ff8b3d").bold("=====================WITHDRAW EVERYTHING FROM THE VAULT====================="));
		const withdrawal_amount_4_e18 = amount_in_vault_4_E18;
		const withdrawal_amount_4 = (new BigNumber(withdrawal_amount_4_e18)).div(BIG18).toNumber();
		console.log(`Redeem ${withdrawal_amount_4} yVault tokens for FRAX3CRV`);
		await curve_amo_v4_instance.withdrawFromVault(withdrawal_amount_4_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
    	utilities.printAllocations("Curve_AMO", the_allocations);

		const fxs_balance_4_after = new BigNumber(await fxs_instance.balanceOf.call(curve_amo_v4_instance.address)).div(BIG18);
		const usdc_balance_4_after = new BigNumber(await usdc_instance.balanceOf.call(curve_amo_v4_instance.address)).div(BIG6);
		const borrowed_balance_4 = new BigNumber(await frax_amo_minter_instance.collat_borrowed_balances.call(curve_amo_v4_instance.address)).div(BIG6);
		console.log("FXS after: ", fxs_balance_4_after.toNumber());
		console.log("USDC after: ", usdc_balance_4_after.toNumber());
		console.log("collateral balance: ", borrowed_balance_4.toNumber());

		const big_test_collatdollarbalance_after = (new BigNumber((await curve_amo_v4_instance.dollarBalances())[1])).div(BIG18).toNumber();
		console.log("CurveAMO_V4 dollarBalances after [COLLAT]:", big_test_collatdollarbalance_after);

		console.log("dollarBalances change [COLLAT]:", big_test_collatdollarbalance_after - big_test_collatdollarbalance_before);
		
		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await curve_amo_v4_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const investor_usdc_bal_after = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));

		// Make sure tokens were actually transferred
		const investor_usdc_balance_change = investor_usdc_bal_after.minus(investor_usdc_bal_before).div(BIG6).toNumber();
		console.log("Investor USDC balance change:", investor_usdc_balance_change);
		assert(investor_usdc_bal_after > investor_usdc_bal_before, 'Should have transferred');

		console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(curve_amo_v4_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give all the FRAX back");
		const amo_frax_bal = new BigNumber(await frax_instance.balanceOf.call(curve_amo_v4_instance.address));
		await curve_amo_v4_instance.burnFRAX(amo_frax_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		console.log("Give all the USDC back");
		const amo_usdc_bal = new BigNumber(await usdc_instance.balanceOf.call(curve_amo_v4_instance.address));
		await curve_amo_v4_instance.giveCollatBack(amo_usdc_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER })
		console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FraxPoolV3 balance and collatDollarBalance after
		const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		console.log("CurveAMO collatDollarBalance:", new BigNumber((await curve_amo_v4_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(curve_amo_v4_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK FINAL ALLOCATIONS ====================="));
		the_allocations = await curve_amo_v4_instance.showAllocations.call();
		utilities.printAllocations("Curve_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);
		console.log("FraxPoolV3 USDC Balance Change:", pool_usdc_bal_end - pool_usdc_bal_start);
	});

});