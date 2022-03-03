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
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Bridges
const CrossChainBridgeBacker_MOON_AnySwap = artifacts.require("Bridges/Moonriver/CrossChainBridgeBacker_MOON_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");
const ComboOracle = artifacts.require("Oracle/ComboOracle");
const ComboOracle_UniV2_UniV3 = artifacts.require("Oracle/ComboOracle_UniV2_UniV3");

// AMOs
const CCFrax1to1AMM = artifacts.require("Misc_AMOs/__CROSSCHAIN/Moonriver/CCFrax1to1AMM.sol");

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

contract('CCFrax1to1AMM-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let MOONRIVER_ADDRESSES = CONTRACT_ADDRESSES.moonriver;
	let MULTISIG_ADDRESS = CONTRACT_ADDRESSES.moonriver.multisigs["Comptrollers"];

	// Account addresses
	let ORIGINAL_MOONRIVER_ONE_ADDRESS;
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
	let ADDRESS_WITH_FRAX = "0x52822Fb548F34fe874D1BEBE53c5eC223a690355";
	let ADDRESS_WITH_USDC = "0x45Df12ea0FF900012b6EE87c6fa30EEE2CC4cCa7";
	let ADDRESS_WITH_USDT = "0x871ea9aF361ec1104489Ed96438319b46E5FB4c6";

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let anyUSDC_instance;
	let usdt_instance;

	// Initialize reward addresses
	let scream_instance;

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances
	let cross_chain_oracle_instance;

	// Initialize staking instances
	let staking_instance_frax_fxs_spirit;

	// Initialize AMO instances
    let ccfrax_1to1_amm_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.MOONRIVER_ONE_ADDRESS]}
		);

		// Constants
		ORIGINAL_MOONRIVER_ONE_ADDRESS = process.env.MOONRIVER_ONE_ADDRESS;
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
		usdt_instance = await ERC20.at(MOONRIVER_ADDRESSES.collaterals.USDT);

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_MOON_AnySwap.deployed();

		// Fill oracle instances
		cross_chain_oracle_instance = await CrossChainOracle.deployed();
		
		// Fill AMO instances
		ccfrax_1to1_amm_instance = await CCFrax1to1AMM.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.MOONRIVER_ONE_ADDRESS]}
		);
	})

	// MAIN TEST
	// ================================================================
	it("Main test", async () => {
		// ====================================================

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [MULTISIG_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE CrossChainBridgeBacker OWNER  =========='));
		await cc_bridge_backer_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: MULTISIG_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [MULTISIG_ADDRESS]
		});

		// Accept ownerships
		await cc_bridge_backer_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// ======================= USDC =============================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});    
	
		console.log(chalk.yellow('========== GIVE THE BRIDGE BACKER SOME USDC  =========='));
		await anyUSDC_instance.transfer(cc_bridge_backer_instance.address, new BigNumber("3000e6"), { from: ADDRESS_WITH_USDC });

		console.log(chalk.yellow('========== GIVE THE CCFrax1to1AMM SOME USDC  =========='));
		await anyUSDC_instance.transfer(ccfrax_1to1_amm_instance.address, new BigNumber("3000e6"), { from: ADDRESS_WITH_USDC });
		
		console.log(chalk.yellow('========== GIVE THE COLLATERAL_FRAX_AND_FXS_OWNER SOME USDC  =========='));
		await anyUSDC_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("3000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		// ======================= FRAX =============================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});    
	
		console.log(chalk.yellow('========== GIVE THE COLLATERAL_FRAX_AND_FXS_OWNER SOME FRAX  =========='));
		await canFRAX_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("3000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		// ======================= USDT =============================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDT]
		});    
	
		console.log(chalk.yellow('========== GIVE THE CCFrax1to1AMM SOME USDT  =========='));
		await usdt_instance.transfer(ccfrax_1to1_amm_instance.address, new BigNumber("1000e6"), { from: ADDRESS_WITH_USDT });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDT]
		});


		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log(chalk.hex("#ff8b3d").bold("=================INITIALIZE================"));

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		let cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		let cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, null);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, null);

		console.log(chalk.hex("#337afe").bold("---------- [CCFrax1to1AMM] ----------"));
		let the_allocations = await ccfrax_1to1_amm_instance.showAllocations.call();
		utilities.printAllocations('CCFrax1to1AMM', the_allocations, null);

		console.log(chalk.hex("#ff8b3d").bold("===========================LEND SOME CANONICAL TOKENS TO THE CCFrax1to1AMM==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(ccfrax_1to1_amm_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 canFXS");
		// await cc_bridge_backer_instance.lendFxsToAMO(ccfrax_1to1_amm_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 anyUSDC");
		await cc_bridge_backer_instance.lendCollatToAMO(ccfrax_1to1_amm_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		let cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		let cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CCFrax1to1AMM] ----------"));
		let old_allocations = the_allocations;
		the_allocations = await ccfrax_1to1_amm_instance.showAllocations.call();
		utilities.printAllocations('CCFrax1to1AMM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================SWAP USDC FOR FRAX==========================="));
		
		const usdc_only_swap_amt = new BigNumber("50e6");
		await anyUSDC_instance.approve(ccfrax_1to1_amm_instance.address, usdc_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Try swapping before it is a whitelisted collateral (should fail)");
		await expectRevert(
			ccfrax_1to1_amm_instance.swapTokenForFrax(anyUSDC_instance.address, usdc_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid swap token"
		);

		console.log("Add USDC as a valid swap token");
		await ccfrax_1to1_amm_instance.addSwapToken(anyUSDC_instance.address, 400, new BigNumber("100000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Swap 50 USDC for FRAX");
		await ccfrax_1to1_amm_instance.swapTokenForFrax(anyUSDC_instance.address, usdc_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Turn off USDC and try swapping again (should fail)");
		await ccfrax_1to1_amm_instance.toggleSwapToken(anyUSDC_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await expectRevert(
			ccfrax_1to1_amm_instance.swapTokenForFrax(anyUSDC_instance.address, usdc_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid swap token"
		);

		console.log("Turn USDC back on");
		await ccfrax_1to1_amm_instance.toggleSwapToken(anyUSDC_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CCFrax1to1AMM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await ccfrax_1to1_amm_instance.showAllocations.call();
		utilities.printAllocations('CCFrax1to1AMM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================SWAP FRAX FOR USDC==========================="));
		
		console.log("Swap 50 canFRAX");
		const frax_only_swap_amt = new BigNumber("50e18");
		await canFRAX_instance.approve(ccfrax_1to1_amm_instance.address, frax_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await ccfrax_1to1_amm_instance.swapFraxForToken(anyUSDC_instance.address, frax_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CCFrax1to1AMM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await ccfrax_1to1_amm_instance.showAllocations.call();
		utilities.printAllocations('CCFrax1to1AMM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW SOME USDT==========================="));

		console.log("Withdraw 1 USDT");
		const usdt_only_swap_amt = new BigNumber("1e6");
		await ccfrax_1to1_amm_instance.withdrawSwapTokens(MOONRIVER_ADDRESSES.collaterals.USDT, usdt_only_swap_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CCFrax1to1AMM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await ccfrax_1to1_amm_instance.showAllocations.call();
		utilities.printAllocations('CCFrax1to1AMM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [NO BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await ccfrax_1to1_amm_instance.giveFRAXBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await ccfrax_1to1_amm_instance.giveFXSBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 1 USDC");
		await ccfrax_1to1_amm_instance.giveCollatBack(new BigNumber("1e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CCFrax1to1AMM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await ccfrax_1to1_amm_instance.showAllocations.call();
		utilities.printAllocations('CCFrax1to1AMM', the_allocations, old_allocations);



		console.log(chalk.hex("#ff8b3d").bold("===========================FAIL TESTS==========================="));
		const test_amount_1 = new BigNumber ("1e6");

		// ------------- withdrawSwapTokens -------------

		console.log("---------TRY TO WITHDRAW COLLAT TOKEN---------");
		await expectRevert(
			ccfrax_1to1_amm_instance.withdrawSwapTokens(anyUSDC_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Col tkm must go via CCBB"
		);

		console.log("---------TRY TO WITHDRAW TOKENS NOT AS AN OWNER---------");
		await expectRevert(
			ccfrax_1to1_amm_instance.withdrawSwapTokens(anyUSDC_instance.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Not owner"
		);
		

		// ------------- ERC20 -------------

		console.log("---------TRY TO ERC20 RECOVER WHILE NOT AN OWNER [SHOULD FAIL]---------");
		await expectRevert(
			ccfrax_1to1_amm_instance.recoverERC20(ccfrax_1to1_amm_instance.address, test_amount_1, { from: INVESTOR_CUSTODIAN_ADDRESS }),
			"Not owner"
		);

		console.log("---------TRY TO ERC20 RECOVER A SWAP TOKEN [SHOULD FAIL]---------");
		await expectRevert(
			ccfrax_1to1_amm_instance.recoverERC20(anyUSDC_instance.address, test_amount_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Cannot withdraw swap tokens"
		);

	});

});