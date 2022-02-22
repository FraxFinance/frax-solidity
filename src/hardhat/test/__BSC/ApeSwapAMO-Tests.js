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

contract('ApeSwapAMO-Tests', async (accounts) => {
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
	let ADDRESS_WITH_USDC = "0x6A5dCeff750561ae05BA3eAfd961Ad5fdc73A12b";

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let usdc_instance;

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
		usdc_instance = await IAnyswapV4ERC20.at("0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664");

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
		// ANYUSDC_ADMIN_ADDRESS = await usdc_instance.owner.call();

		// Print admin addresses
		console.log("ANYFRAX_ADMIN_ADDRESS: ", ANYFRAX_ADMIN_ADDRESS);
		console.log("ANYFXS_ADMIN_ADDRESS: ", ANYFXS_ADMIN_ADDRESS);


		// // ====================================================
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ANYFRAX_ADMIN_ADDRESS]
		// });    
	
		// console.log(chalk.yellow('========== GIVE COLLATERAL_FRAX_AND_FXS_OWNER SOME anyFRAX  =========='));
		// await anyFRAX_instance.Swapin("0x6666666666666666666666666666666666666666666666666666666666666666", COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50000e18"), { from: ANYFRAX_ADMIN_ADDRESS });
		
		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ANYFRAX_ADMIN_ADDRESS]
		// });

		// // ====================================================
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ANYFXS_ADMIN_ADDRESS]
		// });    
	
		// console.log(chalk.yellow('========== GIVE COLLATERAL_FRAX_AND_FXS_OWNER SOME anyFXS  =========='));
		// await anyFXS_instance.Swapin("0x6666666666666666666666666666666666666666666666666666666666666666", COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50000e18"), { from: ANYFXS_ADMIN_ADDRESS });
	
		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ANYFXS_ADMIN_ADDRESS]
		// });

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});    
	
		console.log(chalk.yellow('========== GIVE PangolinLiquidityAMO SOME USDC.e  =========='));
		await usdc_instance.transfer(pangolinLiquidityAMO_instance.address, new BigNumber("100000e6"), { from: ADDRESS_WITH_USDC });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

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

		const FXS_ORACLE_PRICE_E6 = new BigNumber(await cross_chain_oracle_instance.getPrice.call(CONTRACT_ADDRESSES.avalanche.canonicals.FXS));
		const FXS_ORACLE_PRICE = FXS_ORACLE_PRICE_E6.div(BIG6).toNumber();

		console.log("FXS_ORACLE_PRICE: ", FXS_ORACLE_PRICE);
		
		console.log("Print some info [CROSS_CHAIN_BRIDGE_BACKER]");
		let cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		let cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, null);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, null);

		console.log("Print some info [PangolinLiquidityAMO]");
		let the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		let the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, null);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, null);


		console.log(chalk.hex("#ff8b3d").bold("=================MINT canFRAX AND canFXS================"));

		console.log("Add GOVERNOR_GUARDIAN_ADDRESS as a minter for canFRAX and canFXS");
		await canFRAX_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Add the bridge backer as a minter for canFRAX and canFXS");
		// await canFRAX_instance.addMinter(pangolinLiquidityAMO_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await canFXS_instance.addMinter(pangolinLiquidityAMO_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Raise the mint caps");
		await canFRAX_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Mint some canFRAX and canFXS");
		await canFRAX_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("100000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("100000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("=========================GIVE THE BRIDGE BACKER SOME canFRAX AND canFXS========================="));
		const initial_dump_amt_ccbb_canToken = new BigNumber("2000e18");
		console.log("initial_dump_amt_ccbb_canToken: ", initial_dump_amt_ccbb_canToken.div(BIG18).toNumber());

		console.log("Give the bridge backer some canFRAX and canFXS");
		await canFRAX_instance.transfer(cc_bridge_backer_instance.address, initial_dump_amt_ccbb_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.transfer(cc_bridge_backer_instance.address, initial_dump_amt_ccbb_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Print some info");
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);


		console.log(chalk.hex("#ff8b3d").bold("=========================GIVE THE PangolinLiquidityAMO SOME canFRAX AND canFXS========================="));
		const initial_dump_amt_amo_canToken = new BigNumber("75000e18");
		console.log("initial_dump_amt_amo_canToken: ", initial_dump_amt_amo_canToken.div(BIG18).toNumber());

		console.log("Give the bridge backer some canFRAX and canFXS");
		await canFRAX_instance.transfer(pangolinLiquidityAMO_instance.address, initial_dump_amt_amo_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.transfer(pangolinLiquidityAMO_instance.address, initial_dump_amt_amo_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================CREATE SOME FRAX/FXS LP TOKENS==========================="));
		const FXS_PRICE_FROM_LP0_E18 = new BigNumber(await pangolinLiquidityAMO_instance.pair_reserve_ratio_E18.call(CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFRAX/canFXS"], CONTRACT_ADDRESSES.avalanche.canonicals.FRAX));
		const FXS_PRICE_FROM_LP0 = FXS_PRICE_FROM_LP0_E18.div(BIG18).toNumber();

		console.log("FXS_PRICE_FROM_LP0: ", FXS_PRICE_FROM_LP0);

		const lp0_amt_0 = new BigNumber("1000e18");
		const lp0_amt_1 = lp0_amt_0.div(FXS_PRICE_FROM_LP0).integerValue(BigNumber.ROUND_FLOOR);

		console.log("Add liquidity");
		await pangolinLiquidityAMO_instance.addLiquidity(
			CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFRAX/canFXS"],
			CONTRACT_ADDRESSES.avalanche.canonicals.FRAX,
			lp0_amt_0,
			CONTRACT_ADDRESSES.avalanche.canonicals.FXS,
			lp0_amt_1,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================CREATE SOME FRAX/USDC.e LP TOKENS==========================="));
		const lp1_amt_0 = new BigNumber("1000e18");
		const lp1_amt_1 = new BigNumber("1000e6");

		console.log("Add liquidity");
		await pangolinLiquidityAMO_instance.addLiquidity(
			CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFRAX/USDC.e"],
			CONTRACT_ADDRESSES.avalanche.canonicals.FRAX,
			lp1_amt_0,
			CONTRACT_ADDRESSES.avalanche.collaterals["USDC.e"],
			lp1_amt_1,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================CREATE SOME FXS/USDC.e LP TOKENS==========================="));
		const FXS_PRICE_FROM_LP2_E18 = new BigNumber(await pangolinLiquidityAMO_instance.pair_reserve_ratio_E18.call(CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFXS/USDC.e"], CONTRACT_ADDRESSES.avalanche.collaterals["USDC.e"]));
		const FXS_PRICE_FROM_LP2 = FXS_PRICE_FROM_LP2_E18.div(BIG18).toNumber();

		console.log("FXS_PRICE_FROM_LP2: ", FXS_PRICE_FROM_LP2);

		const lp2_amt_0 = new BigNumber("1000e18").div(FXS_PRICE_FROM_LP2).integerValue(BigNumber.ROUND_FLOOR);
		const lp2_amt_1 = new BigNumber("1000e6");

		console.log("Add liquidity");
		await pangolinLiquidityAMO_instance.addLiquidity(
			CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFXS/USDC.e"],
			CONTRACT_ADDRESSES.avalanche.canonicals.FXS,
			lp2_amt_0,
			CONTRACT_ADDRESSES.avalanche.collaterals["USDC.e"],
			lp2_amt_1,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================SWAP SOME FRAX FOR USDC.e==========================="));
		const swap_direct_amt = new BigNumber("1e18");

		console.log("Swap directly");
		await pangolinLiquidityAMO_instance.swapTokens(
			CONTRACT_ADDRESSES.avalanche.canonicals.FRAX,
			swap_direct_amt,
			CONTRACT_ADDRESSES.avalanche.collaterals["USDC.e"],
			0,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================SWAP SOME FRAX FOR USDC.e VIA FXS==========================="));
		const swap_amt = new BigNumber("1e18");

		console.log("Swap via FXS");
		await pangolinLiquidityAMO_instance.swapTokensWithCustomPath(
			CONTRACT_ADDRESSES.avalanche.canonicals.FRAX,
			swap_amt,
			0,
			[
				CONTRACT_ADDRESSES.avalanche.canonicals.FRAX,
				CONTRACT_ADDRESSES.avalanche.canonicals.FXS,
				CONTRACT_ADDRESSES.avalanche.collaterals["USDC.e"],
			],
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================GIVE SOME CANONICAL TOKENS TO THE PangolinLiquidityAMO==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(cc_bridge_backer_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 canFXS");
		await cc_bridge_backer_instance.lendFxsToAMO(cc_bridge_backer_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 anyUSDC");
		// await cc_bridge_backer_instance.lendCollatToAMO(cc_bridge_backer_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info [CROSS_CHAIN_BRIDGE_BACKER]");
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [NO BRIDGE]==========================="));

		console.log("Give back 250 canFRAX");
		await pangolinLiquidityAMO_instance.giveFRAXBack(new BigNumber("250e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 250 canFXS");
		await pangolinLiquidityAMO_instance.giveFXSBack(new BigNumber("250e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 250 USDC.e");
		await pangolinLiquidityAMO_instance.giveCollatBack(new BigNumber("250e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info [CROSS_CHAIN_BRIDGE_BACKER]");
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [WITH BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await pangolinLiquidityAMO_instance.giveFRAXBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 1 canFXS");
		await pangolinLiquidityAMO_instance.giveFXSBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// AEB bans contract calls back
		// console.log("Give back 1 USDC.e");
		// await pangolinLiquidityAMO_instance.giveCollatBack(new BigNumber("1e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info [CROSS_CHAIN_BRIDGE_BACKER]");
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await pangolinLiquidityAMO_instance.execute(canFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info [PangolinLiquidityAMO]");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await pangolinLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await pangolinLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('PangolinLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('PangolinLiquidityAMO', the_token_balances, old_balances);
	});

});