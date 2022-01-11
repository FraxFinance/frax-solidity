const path = require('path');
const envPath = path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// Core

const polyFRAX = artifacts.require("ERC20/__CROSSCHAIN/polyFRAX");
const polyFXS = artifacts.require("ERC20/__CROSSCHAIN/polyFXS");
// const IChildChainManager = artifacts.require("ERC20/__CROSSCHAIN/IChildChainManager");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Collateral
const polyUSDC = artifacts.require("ERC20/__CROSSCHAIN/polyUSDC");

// Bridges
const CrossChainBridgeBacker_POLY_MaticBridge = artifacts.require("Bridges/Polygon/CrossChainBridgeBacker_POLY_MaticBridge");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking
const FraxCrossChainFarm_FRAX_mUSD = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_mUSD");

// AMOs
const SushiSwapLiquidityAMO_POLY = artifacts.require("Misc_AMOs/__CROSSCHAIN/Polygon/SushiSwapLiquidityAMO_POLY.sol");

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

contract('SushiSwapLiquidityAMO_POLY-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Account addresses
	let ORIGINAL_POLYGON_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	let CROSS_CHAIN_CUSTODIAN_ADDRESS;
	let AMO_CUSTODIAN_ADDRESS;

	// Useful addresses
	const ADDRESS_WITH_POLYFRAX = "0x5a05bd61f009ae1cb2ee7a3376718923453abe3d";
	const ADDRESS_WITH_POLYFXS = "0xDBC13E67F678Cc00591920ceCe4dCa6322a79AC7";
	const ADDRESS_WITH_POLYUSDC = "0x06959153b974d0d5fdfd87d561db6d8d4fa0bb0b";

	// Initialize core instances
	let polyFRAX_instance;
	let polyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let polyUSDC_instance;

	// Initialize child chain manager
	let child_chain_manager_instance;

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances
	let cross_chain_oracle_instance;

	// Initialize staking instances
	let staking_instance_frax_musd;

	// Initialize AMO instances
    // let scream_amo_instance;
    let SushiSwapLiquidityAMO_POLY_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.POLYGON_ONE_ADDRESS]}
		);

		// Constants
		ORIGINAL_POLYGON_ONE_ADDRESS = process.env.POLYGON_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADDRESS = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		CROSS_CHAIN_CUSTODIAN_ADDRESS = accounts[9]; 
		AMO_CUSTODIAN_ADDRESS = accounts[10]; 

		// Fill core contract instances
		polyFRAX_instance = await polyFRAX.deployed();
		polyFXS_instance = await polyFXS.deployed();
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Fill collateral instances
		polyUSDC_instance = await polyUSDC.at("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");

		// Fill child chain manager
		// child_chain_manager_instance = await IChildChainManager.deployed();

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_POLY_MaticBridge.deployed();

		// Fill oracle instances
		cross_chain_oracle_instance = await CrossChainOracle.deployed();

		// Fill staking instances
		staking_instance_frax_musd = await FraxCrossChainFarm_FRAX_mUSD.deployed();
		
		// Fill AMO instances
		SushiSwapLiquidityAMO_POLY_instance = await SushiSwapLiquidityAMO_POLY.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.POLYGON_ONE_ADDRESS]}
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


		// ====================================================

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");



		console.log(chalk.hex("#ff8b3d").bold("===========================PRINT SOME INFO==========================="));
		console.log("Print some info [SushiSwapLiquidityAMO_POLY]");
		let the_allocations_sushiswap_amo = await SushiSwapLiquidityAMO_POLY_instance.showAllocations.call();
		let the_token_balances_sushiswap_amo = await SushiSwapLiquidityAMO_POLY_instance.showTokenBalances.call();
		utilities.printAllocations('SushiSwapLiquidityAMO_POLY', the_allocations_sushiswap_amo, null);
		utilities.printTokenBalances('SushiSwapLiquidityAMO_POLY', the_token_balances_sushiswap_amo, null);

		// Total profits
		let borrowed_frax = new BigNumber(await SushiSwapLiquidityAMO_POLY_instance.borrowed_frax.call()).div(BIG18).toNumber();
		let borrowed_fxs = new BigNumber(await SushiSwapLiquidityAMO_POLY_instance.borrowed_fxs.call()).div(BIG18).toNumber();
		let borrowed_collat = new BigNumber(await SushiSwapLiquidityAMO_POLY_instance.borrowed_collat.call()).div(BIG6).toNumber();
		let total_profit = new BigNumber(await SushiSwapLiquidityAMO_POLY_instance.total_profit.call()).div(BIG18).toNumber();
		console.log("borrowed_frax: ", borrowed_frax);
		console.log("borrowed_fxs: ", borrowed_fxs);
		console.log("borrowed_collat: ", borrowed_collat);

		// console.log("frax_profit: ", borrowed_frax);
		// console.log("fxs_profit: ", borrowed_fxs);
		// console.log("collat_profit: ", borrowed_collat);

		console.log("total_profit: ", total_profit);
	});

});