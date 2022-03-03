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
const anyUSDC = artifacts.require("ERC20/__CROSSCHAIN/anyUSDC");

// Collateral
const IAnyswapV4ERC20 = artifacts.require("ERC20/__CROSSCHAIN/IAnyswapV4ERC20");

// Bridges
const CrossChainBridgeBacker_FTM_AnySwap = artifacts.require("Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking
const FraxCrossChainFarm_FRAX_FXS_Spirit = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit");

// AMOs
const SpiritSwapLiquidityAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/SpiritSwapLiquidityAMO.sol");

// Swapping
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02.sol");

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

contract('SpiritSwapLiquidityAMO-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Account addresses
	let ORIGINAL_FANTOM_ONE_ADDRESS;
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
	let ADDRESS_WITH_USDC = "0xD7ECe7ED77AF50d6C0f27E4755A2B09B5f97d7B7";

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let anyUSDC_instance;

	// Initialize reward addresses
	let scream_instance;

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances
	let cross_chain_oracle_instance;

	// Initialize staking instances
	let staking_instance_frax_fxs_spirit;

	// Initialize AMO instances
    // let scream_amo_instance;
    let spiritSwapLiquidityAMO_instance;

	// Initial router instances
	let swap_router_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FANTOM_ONE_ADDRESS]}
		);

		// Constants
		ORIGINAL_FANTOM_ONE_ADDRESS = process.env.FANTOM_ONE_ADDRESS;
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
		anyUSDC_instance = await anyUSDC.deployed();

		// Fill reward instances
		scream_instance = await IAnyswapV4ERC20.at(CONTRACT_ADDRESSES.fantom.reward_tokens.scream); 

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_FTM_AnySwap.deployed();

		// Fill oracle instances
		cross_chain_oracle_instance = await CrossChainOracle.deployed();

		// Fill staking instances
		staking_instance_frax_fxs_spirit = await FraxCrossChainFarm_FRAX_FXS_Spirit.deployed();
		
		// Fill AMO instances
		// scream_amo_instance = await ScreamAMO.deployed();
		spiritSwapLiquidityAMO_instance = await SpiritSwapLiquidityAMO.deployed();

		// Fill router instance
		swap_router_instance = await IUniswapV2Router02.at("0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52");
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FANTOM_ONE_ADDRESS]}
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
	
		console.log(chalk.yellow('========== GIVE THE BRIDGE BACKER SOME USDC  =========='));
		await anyUSDC_instance.transfer(cc_bridge_backer_instance.address, new BigNumber("100000e6"), { from: ADDRESS_WITH_USDC });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FANTOM_ONE_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE CrossChainBridgeBacker OWNER  =========='));
		await cc_bridge_backer_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FANTOM_ONE_ADDRESS });
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE canFRAX OWNER  =========='));
		await canFRAX_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FANTOM_ONE_ADDRESS });
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE canFXS OWNER  =========='));
		await canFXS_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FANTOM_ONE_ADDRESS });

		// console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE SpiritSwapLiquidityAMO OWNER  =========='));
		// await spiritSwapLiquidityAMO_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FANTOM_ONE_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FANTOM_ONE_ADDRESS]
		});

		// Accept ownerships
		await cc_bridge_backer_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFRAX_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await spiritSwapLiquidityAMO_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// ====================================================

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log(chalk.hex("#ff8b3d").bold("=================INITIALIZE================"));

		const FXS_ORACLE_PRICE_E6 = new BigNumber(await cross_chain_oracle_instance.getPrice.call(CONTRACT_ADDRESSES.fantom.canonicals.FXS));
		const FXS_ORACLE_PRICE = FXS_ORACLE_PRICE_E6.div(BIG6).toNumber();

		console.log("FXS_ORACLE_PRICE: ", FXS_ORACLE_PRICE);
		
		let cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		let cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, null);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, null);

		let the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		let the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, null);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, null);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("=================MINT canFRAX AND canFXS================"));

		console.log("Add GOVERNOR_GUARDIAN_ADDRESS as a minter for canFRAX and canFXS");
		await canFRAX_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Add the bridge backer as a minter for canFRAX and canFXS");
		// await canFRAX_instance.addMinter(spiritSwapLiquidityAMO_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await canFXS_instance.addMinter(spiritSwapLiquidityAMO_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Raise the mint caps");
		await canFRAX_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.setMintCap(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Mint some canFRAX and canFXS");
		await canFRAX_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("100000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.minter_mint(GOVERNOR_GUARDIAN_ADDRESS, new BigNumber("100000e18"), { from: GOVERNOR_GUARDIAN_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("=========================GIVE THE BRIDGE BACKER SOME canFRAX AND canFXS========================="));
		const initial_dump_amt_ccbb_canToken = new BigNumber("10000e18");
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
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("===========================LEND SOME CANONICAL TOKENS TO THE SpiritSwapLiquidityAMO==========================="));
		
		console.log("Lend 250 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(spiritSwapLiquidityAMO_instance.address, new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 250 canFXS");
		await cc_bridge_backer_instance.lendFxsToAMO(spiritSwapLiquidityAMO_instance.address, new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 250 anyUSDC");
		await cc_bridge_backer_instance.lendCollatToAMO(spiritSwapLiquidityAMO_instance.address, new BigNumber("250e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("===========================CREATE SOME FRAX/FXS LP TOKENS==========================="));
		const FXS_PRICE_FROM_LP0_E18 = new BigNumber(await spiritSwapLiquidityAMO_instance.pair_reserve_ratio_E18.call(CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFRAX/canFXS"], CONTRACT_ADDRESSES.fantom.canonicals.FRAX));
		const FXS_PRICE_FROM_LP0 = FXS_PRICE_FROM_LP0_E18.div(BIG18).toNumber();

		console.log("FXS_PRICE_FROM_LP0: ", FXS_PRICE_FROM_LP0);

		const lp0_amt_0 = new BigNumber("50e18");
		const lp0_amt_1 = lp0_amt_0.div(FXS_PRICE_FROM_LP0).integerValue(BigNumber.ROUND_FLOOR);

		console.log("Add liquidity");
		await spiritSwapLiquidityAMO_instance.addLiquidity(
			CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFRAX/canFXS"],
			CONTRACT_ADDRESSES.fantom.canonicals.FRAX,
			lp0_amt_0,
			CONTRACT_ADDRESSES.fantom.canonicals.FXS,
			lp0_amt_1,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("===========================CREATE SOME FRAX/anyUSDC LP TOKENS==========================="));
		const lp1_amt_0 = new BigNumber("50e18");
		const lp1_amt_1 = new BigNumber("50e6");

		console.log("Add liquidity");
		await spiritSwapLiquidityAMO_instance.addLiquidity(
			CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFRAX/anyUSDC"],
			CONTRACT_ADDRESSES.fantom.canonicals.FRAX,
			lp1_amt_0,
			CONTRACT_ADDRESSES.fantom.collaterals["anyUSDC"],
			lp1_amt_1,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("===========================CREATE SOME FXS/anyUSDC LP TOKENS==========================="));
		const FXS_PRICE_FROM_LP2_E18 = new BigNumber(await spiritSwapLiquidityAMO_instance.pair_reserve_ratio_E18.call(CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFXS/anyUSDC"], CONTRACT_ADDRESSES.fantom.collaterals["anyUSDC"]));
		const FXS_PRICE_FROM_LP2 = FXS_PRICE_FROM_LP2_E18.div(BIG18).toNumber();

		console.log("FXS_PRICE_FROM_LP2: ", FXS_PRICE_FROM_LP2);

		const lp2_amt_0 = new BigNumber("50e18").div(FXS_PRICE_FROM_LP2).integerValue(BigNumber.ROUND_FLOOR);
		const lp2_amt_1 = new BigNumber("50e6");

		console.log("Add liquidity");
		await spiritSwapLiquidityAMO_instance.addLiquidity(
			CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFXS/anyUSDC"],
			CONTRACT_ADDRESSES.fantom.canonicals.FXS,
			lp2_amt_0,
			CONTRACT_ADDRESSES.fantom.collaterals["anyUSDC"],
			lp2_amt_1,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())
		

		console.log(chalk.hex("#ff8b3d").bold("=======SWAP SOME FRAX FOR FXS VIA AN EOA, TO EARN FEES FOR THE AMO======="));
		const eoa_swap_amt = new BigNumber("10e18");

		await canFRAX_instance.approve(swap_router_instance.address, eoa_swap_amt, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Swap directly");
		await swap_router_instance.swapExactTokensForTokens(
			eoa_swap_amt,
			0,
			[CONTRACT_ADDRESSES.fantom.canonicals.FRAX, CONTRACT_ADDRESSES.fantom.canonicals.FXS],
			GOVERNOR_GUARDIAN_ADDRESS,
			2505300114,
		{ from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("=======SWAP SOME FRAX FOR USDC VIA AN EOA, TO EARN FEES FOR THE AMO======="));
		const eoa_swap_amt_back = new BigNumber("10e18");

		await canFRAX_instance.approve(swap_router_instance.address, eoa_swap_amt_back, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Swap directly");
		await swap_router_instance.swapExactTokensForTokens(
			eoa_swap_amt_back,
			0,
			[CONTRACT_ADDRESSES.fantom.canonicals.FRAX, CONTRACT_ADDRESSES.fantom.collaterals.anyUSDC],
			GOVERNOR_GUARDIAN_ADDRESS,
			2105300114,
		{ from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("============SWAP SOME FRAX FOR USDC [AMO DIRECT]============"));
		const swap_direct_amt = new BigNumber("1e18");

		console.log("Swap directly");
		await spiritSwapLiquidityAMO_instance.swapTokens(
			CONTRACT_ADDRESSES.fantom.canonicals.FRAX,
			swap_direct_amt,
			CONTRACT_ADDRESSES.fantom.collaterals["anyUSDC"],
			0,
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("============SWAP SOME FRAX FOR USDC VIA FXS [AMO DIRECT]============"));
		const swap_amt = new BigNumber("1e18");

		console.log("Swap via FXS");
		await spiritSwapLiquidityAMO_instance.swapTokensWithCustomPath(
			CONTRACT_ADDRESSES.fantom.canonicals.FRAX,
			swap_amt,
			0,
			[
				CONTRACT_ADDRESSES.fantom.canonicals.FRAX,
				CONTRACT_ADDRESSES.fantom.canonicals.FXS,
				CONTRACT_ADDRESSES.fantom.collaterals["anyUSDC"],
			],
		{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("==========AMO GIVES BACK TOKENS [NO BRIDGE]=========="));

		console.log("Give back 25 canFRAX");
		await spiritSwapLiquidityAMO_instance.giveFRAXBack(new BigNumber("25e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 25 canFXS");
		await spiritSwapLiquidityAMO_instance.giveFXSBack(new BigNumber("25e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 25 USDC");
		await spiritSwapLiquidityAMO_instance.giveCollatBack(new BigNumber("25e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("==========AMO GIVES BACK TOKENS [WITH BRIDGE]=========="));

		console.log("Give back 1 canFRAX");
		await spiritSwapLiquidityAMO_instance.giveFRAXBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 1 canFXS");
		await spiritSwapLiquidityAMO_instance.giveFXSBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// AEB bans contract calls back
		// console.log("Give back 1 USDC");
		// await spiritSwapLiquidityAMO_instance.giveCollatBack(new BigNumber("1e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await spiritSwapLiquidityAMO_instance.execute(canFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await spiritSwapLiquidityAMO_instance.showAllocations.call();
		the_token_balances = await spiritSwapLiquidityAMO_instance.showTokenBalances.call();
		utilities.printAllocations('SpiritSwapLiquidityAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('SpiritSwapLiquidityAMO', the_token_balances, old_balances);
		console.log("Total Profit:", (new BigNumber(await spiritSwapLiquidityAMO_instance.total_profit.call())).div(BIG18).toNumber())
	});

});