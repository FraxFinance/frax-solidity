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
const CrossChainBridgeBacker_FTM_AnySwap = artifacts.require("Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking
const FraxCrossChainFarm_FRAX_FXS_Spirit = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit");

// AMOs
const CurveAMO_FTM = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/CurveAMO_FTM.sol");

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

contract('CurveAMO_FTM-Tests', async (accounts) => {
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
	let ADDRESS_WITH_DAI = "0x6Bf97f2534be2242dDb3A29bfb24d498212DcdED";

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let anyUSDC_instance;
	let dai_instance;

	// Initialize reward addresses
	let scream_instance;

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances
	let cross_chain_oracle_instance;

	// Initialize staking instances
	let staking_instance_frax_fxs_spirit;

	// Initialize AMO instances
    let curve_amo_ftm_instance;

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
		dai_instance = await ERC20.at("0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E");

		// Fill reward instances
		scream_instance = await IAnyswapV4ERC20.at(CONTRACT_ADDRESSES.fantom.reward_tokens.scream); 

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_FTM_AnySwap.deployed();

		// Fill oracle instances
		cross_chain_oracle_instance = await CrossChainOracle.deployed();

		// Fill staking instances
		staking_instance_frax_fxs_spirit = await FraxCrossChainFarm_FRAX_FXS_Spirit.deployed();
		
		// Fill AMO instances
		curve_amo_ftm_instance = await CurveAMO_FTM.deployed();
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
		// ====================================================

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************

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
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_DAI]
		});    
	
		console.log(chalk.yellow('========== GIVE THE CurveAMO_FTM SOME DAI  =========='));
		await dai_instance.transfer(curve_amo_ftm_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_DAI });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_DAI]
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

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		let the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, null);


		console.log(chalk.hex("#ff8b3d").bold("===========================LEND SOME CANONICAL TOKENS TO THE CurveAMO_FTM==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(curve_amo_ftm_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 canFXS");
		// await cc_bridge_backer_instance.lendFxsToAMO(curve_amo_ftm_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 anyUSDC");
		await cc_bridge_backer_instance.lendCollatToAMO(curve_amo_ftm_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		let cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		let cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		let old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT FRAX ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit 50 canFRAX");
		const frax_only_deposit_amt = new BigNumber("50e18");
		await curve_amo_ftm_instance.metapoolDeposit(frax_only_deposit_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT DAI ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit 50 DAI");
		const dai_only_deposit_amt = new BigNumber("50e18");
		await curve_amo_ftm_instance.metapoolDeposit(0, dai_only_deposit_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT USDC ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit 50 anyUSDC");
		const usdc_only_deposit_amt = new BigNumber("50e6");
		await curve_amo_ftm_instance.metapoolDeposit(0, 0, usdc_only_deposit_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT FRAX, DAI, AND USDC FOR LP TOKENS==========================="));
		
		console.log("Deposit 125 FRAX, 125 DAI, and 125 anyUSDC");
		const frax_mixed_deposit_amt = new BigNumber("125e18");
		const dai_mixed_deposit_amt = new BigNumber("125e18");
		const usdc_mixed_deposit_amt = new BigNumber("125e6");
		await curve_amo_ftm_instance.metapoolDeposit(frax_mixed_deposit_amt, dai_mixed_deposit_amt, usdc_mixed_deposit_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW FRAX ONLY==========================="));
		
		console.log("Withdraw 10 FRAX");
		const frax_only_lp_withdraw_amt = new BigNumber("10e18");
		await curve_amo_ftm_instance.metapoolWithdrawFrax(frax_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW USDC ONLY==========================="));
		
		console.log("Withdraw 10 USDC");
		const usdc_only_lp_withdraw_amt = new BigNumber("10e18");
		await curve_amo_ftm_instance.metapoolWithdrawUsdc(usdc_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW MIX OF TOKENS==========================="));
		
		console.log("Withdraw a mix of tokens using 100 LP");
		const mixed_lp_withdraw_amt = new BigNumber("100e18");
		await curve_amo_ftm_instance.metapoolWithdrawAtCurRatio(mixed_lp_withdraw_amt, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [NO BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await curve_amo_ftm_instance.giveFRAXBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await curve_amo_ftm_instance.giveFXSBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 1 USDC");
		await curve_amo_ftm_instance.giveCollatBack(new BigNumber("1e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [WITH BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await curve_amo_ftm_instance.giveFRAXBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await curve_amo_ftm_instance.giveFXSBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// AEB bans contract calls back
		console.log("Give back 1 USDC");
		await curve_amo_ftm_instance.giveCollatBack(new BigNumber("1e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await curve_amo_ftm_instance.execute(canFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_FTM] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_ftm_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_FTM', the_allocations, old_allocations);
	});

});