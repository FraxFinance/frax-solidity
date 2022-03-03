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
const ScreamAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/ScreamAMO.sol");
// const SpiritSwapLiquidityAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/SpiritSwapLiquidityAMO.sol");

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

contract('ScreamAMO-Tests', async (accounts) => {
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
	let ANYUSDC_ADMIN_ADDRESS;
	let ADDRESS_WITH_SCREAM = "0x370f4B2DCf75c94D8d4450B493661A9C6170D0b5";

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
    let scream_amo_instance;
    // let spiritSwapLiquidityAMO_instance;

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
		scream_amo_instance = await ScreamAMO.deployed();
		// spiritSwapLiquidityAMO_instance = await SpiritSwapLiquidityAMO.deployed();
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
		// ANYUSDC_ADMIN_ADDRESS = await usdc_instance.owner.call();

		// Print admin addresses
		console.log("ANYFRAX_ADMIN_ADDRESS: ", ANYFRAX_ADMIN_ADDRESS);
		console.log("ANYFXS_ADMIN_ADDRESS: ", ANYFXS_ADMIN_ADDRESS);

		
		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_SCREAM]
		});    
	
		console.log(chalk.yellow('========== GIVE THE ScreamAMO SOME SCREAM TOKENS  =========='));
		await scream_instance.transfer(scream_amo_instance.address, new BigNumber("2500e18"), { from: ADDRESS_WITH_SCREAM });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_SCREAM]
		});

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
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_USDC]
		// });    
	
		// console.log(chalk.yellow('========== GIVE ScreamAMO SOME USDC.e  =========='));
		// await usdc_instance.transfer(scream_amo_instance.address, new BigNumber("100000e6"), { from: ADDRESS_WITH_USDC });
	
		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_USDC]
		// });

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

		// console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE ScreamAMO OWNER  =========='));
		// await scream_amo_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FANTOM_ONE_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FANTOM_ONE_ADDRESS]
		});

		// Accept ownerships
		await cc_bridge_backer_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFRAX_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await scream_amo_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


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
		
		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		let cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		let cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, null);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, null);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		let the_allocations = await scream_amo_instance.showAllocations.call();
		let the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, null);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, null);

		let the_rewards = await scream_amo_instance.showRewards.call();
		utilities.printRewards('ScreamAMO', the_rewards);


		console.log(chalk.hex("#ff8b3d").bold("=================MINT canFRAX AND canFXS================"));

		console.log("Add GOVERNOR_GUARDIAN_ADDRESS as a minter for canFRAX and canFXS");
		await canFRAX_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.addMinter(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Add the bridge backer as a minter for canFRAX and canFXS");
		// await canFRAX_instance.addMinter(scream_amo_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await canFXS_instance.addMinter(scream_amo_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

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

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);


		console.log(chalk.hex("#ff8b3d").bold("=========================GIVE THE ScreamAMO SOME canFRAX AND canFXS========================="));
		const initial_dump_amt_amo_canToken = new BigNumber("75000e18");
		console.log("initial_dump_amt_amo_canToken: ", initial_dump_amt_amo_canToken.div(BIG18).toNumber());

		console.log("Give the bridge backer some canFRAX and canFXS");
		await canFRAX_instance.transfer(scream_amo_instance.address, initial_dump_amt_amo_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });
		await canFXS_instance.transfer(scream_amo_instance.address, initial_dump_amt_amo_canToken, { from: GOVERNOR_GUARDIAN_ADDRESS });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================LEND SOME CANONICAL TOKENS TO THE ScreamAMO==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(cc_bridge_backer_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 canFXS");
		await cc_bridge_backer_instance.lendFxsToAMO(cc_bridge_backer_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 anyUSDC");
		// await cc_bridge_backer_instance.lendCollatToAMO(cc_bridge_backer_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT FRAX FOR scFRAX==========================="));
		
		console.log("Deposit 100 canFRAX");
		await scream_amo_instance.depositFRAX(new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW SOME scFRAX [redeem_scFRAX]==========================="));
		
		console.log("Withdraw 10 canFRAX");
		await scream_amo_instance.redeem_scFRAX(new BigNumber("10e8"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW SOME scFRAX [redeemUnderlying_scFRAX]==========================="));
		
		console.log("Withdraw 10 canFRAX");
		await scream_amo_instance.redeemUnderlying_scFRAX(new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);

		let old_rewards = the_rewards;
		the_rewards = await scream_amo_instance.showRewards.call();
		utilities.printRewards('ScreamAMO', the_rewards, old_rewards);


		console.log(chalk.hex("#ff8b3d").bold("===========================STAKE SOME SCREAM==========================="));
		
		console.log("Stake 1000 SCREAM");
		await scream_amo_instance.stakeSCREAM(new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);

		old_rewards = the_rewards;
		the_rewards = await scream_amo_instance.showRewards.call();
		utilities.printRewards('ScreamAMO', the_rewards, old_rewards);


		console.log(chalk.hex("#ff8b3d").bold("===========================WAIT SOME TIME AND COLLECT==========================="));

		// Advance a few days
		for (let j = 0; j < 8; j++){
			await time.increase(86400);
			await time.advanceBlock();
		}

		console.log("COLLECT REWARDS");
		await scream_amo_instance.collectSCREAM({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);

		old_rewards = the_rewards;
		the_rewards = await scream_amo_instance.showRewards.call();
		utilities.printRewards('ScreamAMO', the_rewards, old_rewards);


		console.log(chalk.hex("#ff8b3d").bold("===========================UNSTAKE SOME XSCREAM==========================="));
		
		console.log("Unstake 500 XSCREAM");
		await scream_amo_instance.unstakeXSCREAM(new BigNumber("500e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);

		old_rewards = the_rewards;
		the_rewards = await scream_amo_instance.showRewards.call();
		utilities.printRewards('ScreamAMO', the_rewards, old_rewards);

		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [NO BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await scream_amo_instance.giveFRAXBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await scream_amo_instance.giveFXSBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 USDC.e");
		// await scream_amo_instance.giveCollatBack(new BigNumber("1e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [WITH BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await scream_amo_instance.giveFRAXBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await scream_amo_instance.giveFXSBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// AEB bans contract calls back
		// console.log("Give back 1 USDC.e");
		// await scream_amo_instance.giveCollatBack(new BigNumber("1e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await scream_amo_instance.execute(canFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [ScreamAMO] ----------"));
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await scream_amo_instance.showAllocations.call();
		the_token_balances = await scream_amo_instance.showTokenBalances.call();
		utilities.printAllocations('ScreamAMO', the_allocations, old_allocations);
		utilities.printTokenBalances('ScreamAMO', the_token_balances, old_balances);
	});

});