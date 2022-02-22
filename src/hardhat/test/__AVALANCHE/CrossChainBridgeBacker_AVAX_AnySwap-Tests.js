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
const IanyFRAX = artifacts.require("ERC20/__CROSSCHAIN/IanyFRAX");
const IanyFXS = artifacts.require("ERC20/__CROSSCHAIN/IanyFXS");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Collateral
const IAnyswapV4ERC20 = artifacts.require("ERC20/__CROSSCHAIN/IAnyswapV4ERC20");

// Bridges
const CrossChainBridgeBacker_AVAX_AnySwap = artifacts.require("Bridges/Avalanche/CrossChainBridgeBacker_AVAX_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// AMOs
const PangolinLiquidityAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Avalanche/PangolinLiquidityAMO.sol");

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

contract('CrossChainBridgeBacker_AVAX_AnySwap-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Account addresses
	let ORIGINAL_AVALANCHE_ONE_ADDRESS;
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
	let ANYFRAX_ADMIN_ADDRESS;
	let ANYFXS_ADMIN_ADDRESS;
	let ANYUSDC_ADMIN_ADDRESS;

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let anyUSDC_instance;

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances
	let cross_chain_oracle_instance;

	// Initialize AMO instances
    let pangolinLiquidityAMO_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.AVALANCHE_ONE_ADDRESS]}
		);

		// Constants
		ORIGINAL_AVALANCHE_ONE_ADDRESS = process.env.AVALANCHE_ONE_ADDRESS;
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
		anyFRAX_instance = await IanyFRAX.deployed();
		anyFXS_instance = await IanyFXS.deployed();
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Fill collateral instances
		anyUSDC_instance = await IAnyswapV4ERC20.at("0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664");

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_AVAX_AnySwap.deployed();

		// Fill oracle instances
		cross_chain_oracle_instance = await CrossChainOracle.deployed();
		
		// Fill AMO instances
		pangolinLiquidityAMO_instance = await PangolinLiquidityAMO.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.AVALANCHE_ONE_ADDRESS]}
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
		// Fill admin addresses
		ANYFRAX_ADMIN_ADDRESS = await anyFRAX_instance.owner.call();
		ANYFXS_ADMIN_ADDRESS = await anyFXS_instance.owner.call();
		// ANYUSDC_ADMIN_ADDRESS = await anyUSDC_instance.owner.call();

		// Print admin addresses
		console.log("ANYFRAX_ADMIN_ADDRESS: ", ANYFRAX_ADMIN_ADDRESS);
		console.log("ANYFXS_ADMIN_ADDRESS: ", ANYFXS_ADMIN_ADDRESS);
		console.log("ANYUSDC_ADMIN_ADDRESS: ", ANYUSDC_ADMIN_ADDRESS);

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ANYFRAX_ADMIN_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== GIVE COLLATERAL_FRAX_AND_FXS_OWNER SOME anyFRAX  =========='));
		await anyFRAX_instance.Swapin("0x6666666666666666666666666666666666666666666666666666666666666666", COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50000e18"), { from: ANYFRAX_ADMIN_ADDRESS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ANYFRAX_ADMIN_ADDRESS]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ANYFXS_ADMIN_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== GIVE COLLATERAL_FRAX_AND_FXS_OWNER SOME anyFXS  =========='));
		await anyFXS_instance.Swapin("0x6666666666666666666666666666666666666666666666666666666666666666", COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50000e18"), { from: ANYFXS_ADMIN_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ANYFXS_ADMIN_ADDRESS]
		});

		// // ====================================================
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ANYUSDC_ADMIN_ADDRESS]
		// });    
	
		// console.log(chalk.yellow('========== GIVE COLLATERAL_FRAX_AND_FXS_OWNER SOME anyUSDC  =========='));
		// await anyUSDC_instance.Swapin("0x6666666666666666666666666666666666666666666666666666666666666666", COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50000e6"), { from: ANYUSDC_ADMIN_ADDRESS });
	
		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ANYUSDC_ADMIN_ADDRESS]
		// });

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.AVALANCHE_ONE_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE CrossChainBridgeBacker OWNER  =========='));
		await cc_bridge_backer_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.AVALANCHE_ONE_ADDRESS });
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE canFRAX OWNER  =========='));
		await canFRAX_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.AVALANCHE_ONE_ADDRESS });
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE canFXS OWNER  =========='));
		await canFXS_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.AVALANCHE_ONE_ADDRESS });

		// console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE PangolinLiquidityAMO OWNER  =========='));
		// await pangolinLiquidityAMO_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.AVALANCHE_ONE_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.AVALANCHE_ONE_ADDRESS]
		});

		// Accept ownerships
		await cc_bridge_backer_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFRAX_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await pangolinLiquidityAMO_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// ====================================================

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log(chalk.hex("#ff8b3d").bold("=================INITIALIZE================"));
		
		console.log("Print some info");
		let the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		let the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, null);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, null);


		console.log(chalk.hex("#ff8b3d").bold("=================MINT canFRAX AND canFXS================"));

		console.log("Add GOVERNOR_GUARDIAN_ADDRESS as a minter for canFRAX and canFXS");
		await canFRAX_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Add the bridge backer as a minter for canFRAX and canFXS");
		// await canFRAX_instance.addMinter(cc_bridge_backer_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await canFXS_instance.addMinter(cc_bridge_backer_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Raise the mint caps");
		await canFRAX_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Mint some canFRAX and canFXS");
		await canFRAX_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("100000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("100000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Give the canFRAX and canFXS contracts some old tokens");
		await anyFRAX_instance.transfer(canFRAX_instance.address, new BigNumber("10000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await anyFXS_instance.transfer(canFXS_instance.address, new BigNumber("10000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.hex("#ff8b3d").bold("=========================GIVE THE BRIDGE BACKER SOME canFRAX AND canFXS========================="));
		const initial_dump_amt_canToken = new BigNumber("2000e18");
		console.log("initial_dump_amt_canToken: ", initial_dump_amt_canToken.div(BIG18).toNumber());

		console.log("Give the bridge backer some canFRAX and canFXS");
		await canFRAX_instance.transfer(cc_bridge_backer_instance.address, initial_dump_amt_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.transfer(cc_bridge_backer_instance.address, initial_dump_amt_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("=========================DUMP IN SOME anyFRAX [SIMULATES BRIDGE]========================="));
		const dump_amt_anyFRAX = new BigNumber("10025e18");
		console.log("dump_amt_anyFRAX: ", dump_amt_anyFRAX.div(BIG18).toNumber());

		await anyFRAX_instance.transfer(cc_bridge_backer_instance.address, dump_amt_anyFRAX, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("=========================DUMP IN SOME anyFXS [SIMULATES BRIDGE]========================="));
		const dump_amt_anyFXS = new BigNumber("10025e18");
		console.log("dump_amt_anyFXS: ", dump_amt_anyFXS.div(BIG18).toNumber());
		
		await anyFXS_instance.transfer(cc_bridge_backer_instance.address, dump_amt_anyFXS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		// console.log(chalk.hex("#ff8b3d").bold("=====================DUMP IN SOME USDC [SIMULATES BRIDGE]====================="));
		// const dump_amt_USDC = new BigNumber("10025e6");
		// console.log("dump_amt_USDC: ", dump_amt_USDC.div(BIG6).toNumber());

		// await anyUSDC_instance.transfer(cc_bridge_backer_instance.address, dump_amt_USDC, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Print some info");
		// old_allocations = the_allocations;
		// old_balances = the_token_balances;
		// the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		// the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		// utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		// utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================SELF-BRIDGE SOME TOKENS OVER [with internal swap]==========================="));
		const self_bridge_swap_amt_E18 = new BigNumber("250e18");
		const self_bridge_swap_amt_E6 = new BigNumber("250e6");
		console.log("self_bridge_swap_amt_E18: ", self_bridge_swap_amt_E18.div(BIG18).toNumber());
		console.log("self_bridge_swap_amt_E6: ", self_bridge_swap_amt_E6.div(BIG6).toNumber());

		console.log("Self-Bridge back canFRAX (internal swap to anyFRAX included)");
		await cc_bridge_backer_instance.selfBridge(0, self_bridge_swap_amt_E18, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Self-Bridge back canFXS (internal swap to anyFXS included)");
		await cc_bridge_backer_instance.selfBridge(1, self_bridge_swap_amt_E18, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Self-Bridge back anyUSDC");
		// await cc_bridge_backer_instance.selfBridge(2, self_bridge_swap_amt_E6, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log(chalk.hex("#ff8b3d").bold("===========================SELF-BRIDGE SOME TOKENS OVER [no internal swap]==========================="));
		const self_bridge_no_swap_amt_E18 = new BigNumber("250e18");
		const self_bridge_no_swap_amt_E6 = new BigNumber("250e6");
		console.log("self_bridge_no_swap_amt_E18: ", self_bridge_no_swap_amt_E18.div(BIG18).toNumber());
		console.log("self_bridge_no_swap_amt_E6: ", self_bridge_no_swap_amt_E6.div(BIG6).toNumber());

		console.log("Self-Bridge back canFRAX (no internal swap to anyFRAX)");
		await cc_bridge_backer_instance.selfBridge(0, self_bridge_no_swap_amt_E18, false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Self-Bridge back canFXS (no internal swap to anyFXS)");
		await cc_bridge_backer_instance.selfBridge(1, self_bridge_no_swap_amt_E18, false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Self-Bridge back anyUSDC");
		// await cc_bridge_backer_instance.selfBridge(2, self_bridge_no_swap_amt_E6, false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log(chalk.hex("#ff8b3d").bold("===========================GIVE THE canFRAX CONTRACT SOME anyFRAX ==========================="));
		const giveAnyFRAX_amt = new BigNumber("10e18");
		console.log("giveAnyFRAX_amt: ", giveAnyFRAX_amt.div(BIG18).toNumber());

		await cc_bridge_backer_instance.giveAnyToCan(0, giveAnyFRAX_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================SWAP anyFRAX for canFRAX manually==========================="));
		const swapAnyForCanonical_amt_anyFRAX = new BigNumber("500e18");
		console.log("swapAnyForCanonical_amt_anyFRAX: ", swapAnyForCanonical_amt_anyFRAX.div(BIG18).toNumber());

		await cc_bridge_backer_instance.swapAnyForCanonical(0, swapAnyForCanonical_amt_anyFRAX, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================SWAP anyFXS for canFXS manually==========================="));
		const swapAnyForCanonical_amt_anyFXS = new BigNumber("500e18");
		console.log("swapAnyForCanonical_amt_anyFXS: ", swapAnyForCanonical_amt_anyFXS.div(BIG18).toNumber());

		await cc_bridge_backer_instance.swapAnyForCanonical(1, swapAnyForCanonical_amt_anyFXS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================MINT SOME canFRAX and anyFRAX==========================="));
		const canToken_mint_amt = new BigNumber("125e18");
		console.log("canToken_mint_amt: ", canToken_mint_amt.div(BIG18).toNumber());

		await cc_bridge_backer_instance.mintCanonicalFrax(canToken_mint_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await cc_bridge_backer_instance.mintCanonicalFxs(canToken_mint_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================BURN SOME canFRAX and anyFRAX==========================="));
		const canToken_burn_amt = new BigNumber("10e18");
		console.log("canToken_burn_amt: ", canToken_burn_amt.div(BIG18).toNumber());

		await cc_bridge_backer_instance.burnCanonicalFrax(canToken_burn_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await cc_bridge_backer_instance.burnCanonicalFxs(canToken_burn_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================COLLECT SOME anyFRAX AND anyFXS==========================="));
		const canToken_collect_amt = new BigNumber("1e18");
		console.log("canToken_collect_amt: ", canToken_collect_amt.div(BIG18).toNumber());

		await cc_bridge_backer_instance.collectBridgeTokens(0, anyFRAX_instance.address, canToken_collect_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await cc_bridge_backer_instance.collectBridgeTokens(1, anyFXS_instance.address, canToken_collect_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================ADD A WALLET ADDRESS AS AN AMO==========================="));
		await cc_bridge_backer_instance.addAMO(STAKING_REWARDS_DISTRIBUTOR, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.hex("#ff8b3d").bold("===========================NOTE SOME PangolinLiquidityAMO INFO==========================="));
		console.log("Print some info [PangolinLiquidityAMO]");
		let the_allocations_spiritswap_amo = await pangolinLiquidityAMO_instance.showAllocations.call();
		let the_token_balances_spiritswap_amo = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations_spiritswap_amo, null);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances_spiritswap_amo, null);


		console.log(chalk.hex("#ff8b3d").bold("===========================GIVE SOME TOKENS TO AMOS [EOA]==========================="));
		let amo_canFRAX_bal_before = new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		let amo_canFXS_bal_before = new BigNumber(await canFXS_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		let amo_usdc_bal_before = new BigNumber(await anyUSDC_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG6).toNumber();

		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 canFXS");
		await cc_bridge_backer_instance.lendFxsToAMO(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 anyUSDC");
		// await cc_bridge_backer_instance.lendCollatToAMO(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		let amo_canFRAX_bal_after = new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		let amo_canFXS_bal_after = new BigNumber(await canFXS_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		let amo_usdc_bal_after = new BigNumber(await anyUSDC_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG6).toNumber();

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log("FRAX balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_canFRAX_bal_after - amo_canFRAX_bal_before);
		console.log("FXS balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_canFXS_bal_after - amo_canFXS_bal_before);
		console.log("USDC balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_usdc_bal_after - amo_usdc_bal_before);


		console.log(chalk.hex("#ff8b3d").bold("===========================GIVE SOME TOKENS TO AMOS [SMART CONTRACT]==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(pangolinLiquidityAMO_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 canFXS");
		await cc_bridge_backer_instance.lendFxsToAMO(pangolinLiquidityAMO_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 anyUSDC");
		// await cc_bridge_backer_instance.lendCollatToAMO(pangolinLiquidityAMO_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations_spiritswap_amo = the_allocations_spiritswap_amo;
		old_balances_spiritswap_amo = the_token_balances_spiritswap_amo;
		the_allocations_spiritswap_amo = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances_spiritswap_amo = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations_spiritswap_amo, old_allocations_spiritswap_amo);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances_spiritswap_amo, old_balances_spiritswap_amo);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [EOA, NO BRIDGE]==========================="));
		amo_canFRAX_bal_before = new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_canFXS_bal_before = new BigNumber(await canFXS_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_usdc_bal_before = new BigNumber(await anyUSDC_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG6).toNumber();

		console.log("Give 250 canFRAX");
		await canFRAX_instance.approve(cc_bridge_backer_instance.address, new BigNumber("250e18"), { from: STAKING_REWARDS_DISTRIBUTOR });
		await cc_bridge_backer_instance.receiveBackViaAMO(canFRAX_instance.address, new BigNumber("250e18"), false, { from: STAKING_REWARDS_DISTRIBUTOR });

		console.log("Give 250 canFXS");
		await canFXS_instance.approve(cc_bridge_backer_instance.address, new BigNumber("250e18"), { from: STAKING_REWARDS_DISTRIBUTOR });
		await cc_bridge_backer_instance.receiveBackViaAMO(canFXS_instance.address, new BigNumber("250e18"), false, { from: STAKING_REWARDS_DISTRIBUTOR });

		// console.log("Give 250 anyUSDC");
		// await anyUSDC_instance.approve(cc_bridge_backer_instance.address, new BigNumber("250e6"), { from: STAKING_REWARDS_DISTRIBUTOR });
		// await cc_bridge_backer_instance.receiveBackViaAMO(anyUSDC_instance.address, new BigNumber("250e6"), false, { from: STAKING_REWARDS_DISTRIBUTOR });

		amo_canFRAX_bal_after = new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_canFXS_bal_after = new BigNumber(await canFXS_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_usdc_bal_after = new BigNumber(await anyUSDC_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG6).toNumber();

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log("canFRAX balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_canFRAX_bal_after - amo_canFRAX_bal_before);
		console.log("canFXS balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_canFXS_bal_after - amo_canFXS_bal_before);
		console.log("anyUSDC balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_usdc_bal_after - amo_usdc_bal_before);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [SMART CONTRACT, NO BRIDGE]==========================="));

		console.log("Give back 250 canFRAX");
		await pangolinLiquidityAMO_instance.giveFRAXBack(new BigNumber("250e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 250 canFXS");
		await pangolinLiquidityAMO_instance.giveFXSBack(new BigNumber("250e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 250 anyUSDC");
		// await pangolinLiquidityAMO_instance.giveCollatBack(new BigNumber("250e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info [CROSS_CHAIN_BRIDGE_BACKER]");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations_spiritswap_amo = the_allocations_spiritswap_amo;
		old_balances_spiritswap_amo = the_token_balances_spiritswap_amo;
		the_allocations_spiritswap_amo = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances_spiritswap_amo = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations_spiritswap_amo, old_allocations_spiritswap_amo);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances_spiritswap_amo, old_balances_spiritswap_amo);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [EOA, WITH BRIDGE]==========================="));
		amo_canFRAX_bal_before = new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_canFXS_bal_before = new BigNumber(await canFXS_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_usdc_bal_before = new BigNumber(await anyUSDC_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG6).toNumber();

		console.log("Give 100 canFRAX");
		await canFRAX_instance.approve(cc_bridge_backer_instance.address, new BigNumber("100e18"), { from: STAKING_REWARDS_DISTRIBUTOR });
		await cc_bridge_backer_instance.receiveBackViaAMO(canFRAX_instance.address, new BigNumber("100e18"), true, { from: STAKING_REWARDS_DISTRIBUTOR });

		console.log("Give 100 canFXS");
		await canFXS_instance.approve(cc_bridge_backer_instance.address, new BigNumber("100e18"), { from: STAKING_REWARDS_DISTRIBUTOR });
		await cc_bridge_backer_instance.receiveBackViaAMO(canFXS_instance.address, new BigNumber("100e18"), true, { from: STAKING_REWARDS_DISTRIBUTOR });

		// console.log("Give 100 anyUSDC");
		// await anyUSDC_instance.approve(cc_bridge_backer_instance.address, new BigNumber("100e6"), { from: STAKING_REWARDS_DISTRIBUTOR });
		// await cc_bridge_backer_instance.receiveBackViaAMO(anyUSDC_instance.address, new BigNumber("100e6"), true, { from: STAKING_REWARDS_DISTRIBUTOR });

		amo_canFRAX_bal_after = new BigNumber(await canFRAX_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_canFXS_bal_after = new BigNumber(await canFXS_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG18).toNumber();
		amo_usdc_bal_after = new BigNumber(await anyUSDC_instance.balanceOf.call(STAKING_REWARDS_DISTRIBUTOR)).div(BIG6).toNumber();

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log("canFRAX balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_canFRAX_bal_after - amo_canFRAX_bal_before);
		console.log("canFXS balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_canFXS_bal_after - amo_canFXS_bal_before);
		console.log("anyUSDC balance [STAKING_REWARDS_DISTRIBUTOR] change: ", amo_usdc_bal_after - amo_usdc_bal_before);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [SMART CONTRACT, WITH BRIDGE]==========================="));

		console.log("Give 100 canFRAX");
		await pangolinLiquidityAMO_instance.giveFRAXBack(new BigNumber("100e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give 100 canFXS");
		await pangolinLiquidityAMO_instance.giveFXSBack(new BigNumber("100e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give 100 anyUSDC");
		// await pangolinLiquidityAMO_instance.giveCollatBack(new BigNumber("100e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info [CROSS_CHAIN_BRIDGE_BACKER]");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations_spiritswap_amo = the_allocations_spiritswap_amo;
		old_balances_spiritswap_amo = the_token_balances_spiritswap_amo;
		the_allocations_spiritswap_amo = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances_spiritswap_amo = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations_spiritswap_amo, old_allocations_spiritswap_amo);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances_spiritswap_amo, old_balances_spiritswap_amo);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK allBalances() ====================="));
		const all_balances = await cc_bridge_backer_instance.allBalances.call();

		console.log("frax_ttl: ", new BigNumber(all_balances[0]).div(BIG18).toNumber());
		console.log("fxs_ttl: ", new BigNumber(all_balances[1]).div(BIG18).toNumber());
		console.log("col_ttl: ", new BigNumber(all_balances[2]).div(BIG6).toNumber());
		console.log("ttl_val_usd_e18: ", new BigNumber(all_balances[3]).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await cc_bridge_backer_instance.execute(anyFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await cc_bridge_backer_instance.showAllocations.call();
		the_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', the_allocations, old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', the_token_balances, old_balances);

	});

	it("Fail Tests ", async () => {
		// const test_amount_1 = new BigNumber("1e18");

		// // =========================================================================
		// // =========================================================================
		// console.log(chalk.blue("=============TOKEN EXCHANGES============="));

		// console.log("---------TRY EXCHANGING INVALID OLD TOKENS---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.exchangeOldForCanonical(fxs_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Invalid token"
		// );

		// console.log("---------TRY EXCHANGING WHEN PAUSED---------");
		// // Disable
		// await cc_bridge_backer_instance.toggleExchanges({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// await expectRevert(
		// 	cc_bridge_backer_instance.exchangeOldForCanonical(fei_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Exchanges paused"
		// );
		// // Re-Enable
		// await cc_bridge_backer_instance.toggleExchanges({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("---------TRY EXCHANGING OVER THE MINT CAP---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.exchangeOldForCanonical(fei_instance.address, new BigNumber("250e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Mint cap"
		// );

		// console.log("---------TRY EXCHANGING MORE THAN YOU HAVE---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.exchangeOldForCanonical(fei_instance.address, new BigNumber("10000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"TransferHelper: TRANSFER_FROM_FAILED"
		// );

		// console.log("---------TRY EXCHANGING NEW FOR OLD AS A NON-MINTER---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.exchangeCanonicalForOld(fei_instance.address, new BigNumber("250e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Not minter, owner, or tlck"
		// );

		// // =========================================================================
		// // =========================================================================
		// console.log(chalk.blue("=============TOKEN WITHDRAWALS============="));

		// console.log("---------TRY WITHDRAWING OLD TOKENS WITH THE WRONG ACCOUNT---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.withdrawBridgeTokens(fei_instance.address, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Not minter, owner, or tlck"
		// );

		// console.log("---------TRY WITHDRAWING AN INVALID OLD TOKEN---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.withdrawBridgeTokens(fxs_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		// 	"Invalid token"
		// );

		// console.log("---------TRY WITHDRAWING TOO MANY OLD TOKENS---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.withdrawBridgeTokens(fei_instance.address, new BigNumber("1000000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		// 	"TransferHelper: TRANSFER_FAILED"
		// );

		// console.log("---------DISABLE AN OLD TOKEN AND THEN TRY TO WITHDRAW IT---------");
		// // Disable
		// await cc_bridge_backer_instance.toggleBridgeToken(fei_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// await expectRevert(
		// 	cc_bridge_backer_instance.withdrawBridgeTokens(fei_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
		// 	"Invalid token"
		// );

		// // Re-Enable
		// await cc_bridge_backer_instance.toggleBridgeToken(fei_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// // =========================================================================
		// // =========================================================================
		// console.log(chalk.blue("=============MINTING TESTS============="));

		// console.log("---------TRY MINTING AS A NON-MINTER---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Not a minter"
		// );

		// // Add GOVERNOR_GUARDIAN_ADDRESS as a minter, for tests
		// await cc_bridge_backer_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("---------TRY MINTING OVER THE CAP---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("1000000000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Mint cap"
		// );

		// // Remove GOVERNOR_GUARDIAN_ADDRESS as a minter
		// await cc_bridge_backer_instance.removeMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("---------TRY MINTING AGAIN, NOW THAT GOVERNOR_GUARDIAN_ADDRESS IS NO LONGER A MINTER---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"Not a minter"
		// );

		// // =========================================================================
		// // =========================================================================
		// console.log(chalk.blue("=============BURNING TESTS============="));

		// // Add GOVERNOR_GUARDIAN_ADDRESS as a minter again, for tests
		// await cc_bridge_backer_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("---------TRY BURNING ANOTHER PERSON'S CANONICAL TOKENS [METHOD 1]---------");
		// await expectRevert(
		// 	cc_bridge_backer_instance.burnFrom(COLLATERAL_FRAX_AND_FXS_OWNER, test_amount_1, { from: GOVERNOR_GUARDIAN_ADDRESS }),
		// 	"ERC20: burn amount exceeds allowance"
		// );

		// // Remove GOVERNOR_GUARDIAN_ADDRESS as a minter
		// await cc_bridge_backer_instance.removeMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});
});