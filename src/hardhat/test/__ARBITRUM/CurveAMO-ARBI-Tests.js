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
const anyFRAX = artifacts.require("ERC20/__CROSSCHAIN/anyFRAX");
const anyFXS = artifacts.require("ERC20/__CROSSCHAIN/anyFXS");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Collateral
const arbiUSDC = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");
const arbiUSDT = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");

// Bridges
const CrossChainBridgeBacker_ARBI_AnySwap = artifacts.require("Bridges/Arbitrum/CrossChainBridgeBacker_ARBI_AnySwap");

// AMOs
const CurveAMO_ARBI = artifacts.require("Misc_AMOs/__CROSSCHAIN/Arbitrum/CurveAMO_ARBI.sol");

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

contract('CurveAMO_ARBI-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Account addresses
	let ORIGINAL_ARBITRUM_ONE_ADDRESS = process.env.ARBITRUM_ONE_ADDRESS;
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
	let arbiUSDC_ADMIN_ADDRESS;
	let ADDRESS_WITH_USDC = "0xbCa9a9Aab13a68d311160D4f997E3D783Da865Fb";
	let ADDRESS_WITH_USDT = "0xbCa9a9Aab13a68d311160D4f997E3D783Da865Fb";

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize collateral addresses
	let arbiUSDC_instance;
	let arbiUSDT_instance;

	// Initialize reward addresses

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances

	// Initialize staking instances

	// Initialize AMO instances
    let curve_amo_arbi_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ORIGINAL_ARBITRUM_ONE_ADDRESS]}
		);

		// Constants
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
		anyFRAX_instance = await anyFRAX.deployed();
		anyFXS_instance = await anyFXS.deployed();
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Fill collateral instances
		arbiUSDC_instance = await arbiUSDC.at("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8");
		arbiUSDT_instance = await arbiUSDT.at("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9");

		// Fill reward instances

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_ARBI_AnySwap.deployed();

		// Fill oracle instances

		// Fill staking instances
		
		// Fill AMO instances
		curve_amo_arbi_instance = await CurveAMO_ARBI.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ORIGINAL_ARBITRUM_ONE_ADDRESS]}
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
			params: [ORIGINAL_ARBITRUM_ONE_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE CrossChainBridgeBacker OWNER  =========='));
		await cc_bridge_backer_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: ORIGINAL_ARBITRUM_ONE_ADDRESS });
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE canFRAX OWNER  =========='));
		await canFRAX_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: ORIGINAL_ARBITRUM_ONE_ADDRESS });
	
		console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE canFXS OWNER  =========='));
		await canFXS_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: ORIGINAL_ARBITRUM_ONE_ADDRESS });

		// console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE SpiritSwapLiquidityAMO OWNER  =========='));
		// await spiritSwapLiquidityAMO_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: ORIGINAL_ARBITRUM_ONE_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ORIGINAL_ARBITRUM_ONE_ADDRESS]
		});

		// Accept ownerships
		await cc_bridge_backer_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFRAX_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await spiritSwapLiquidityAMO_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});    
	
		console.log(chalk.yellow('========== GIVE THE BRIDGEBACKER SOME USDC  =========='));
		await arbiUSDC_instance.transfer(cc_bridge_backer_instance.address, new BigNumber("1000e6"), { from: ADDRESS_WITH_USDC });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDT]
		});    
	
		console.log(chalk.yellow('========== GIVE THE CurveAMO_ARBI SOME USDT  =========='));
		await arbiUSDT_instance.transfer(curve_amo_arbi_instance.address, new BigNumber("1000e6"), { from: ADDRESS_WITH_USDT });
		
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

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		let the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, null);


		console.log(chalk.hex("#ff8b3d").bold("===========================LEND SOME CANONICAL TOKENS TO THE CurveAMO_ARBI==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(curve_amo_arbi_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 canFXS");
		// await cc_bridge_backer_instance.lendFxsToAMO(curve_amo_arbi_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Lend 1000 arbiUSDC");
		await cc_bridge_backer_instance.lendCollatToAMO(curve_amo_arbi_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		let cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		let cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		let old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT FRAX ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit 50 canFRAX");
		const frax_only_deposit_amt = new BigNumber("50e18");
		await curve_amo_arbi_instance.metapoolDeposit(frax_only_deposit_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT USDC ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit 50 arbiUSDC");
		const usdc_only_deposit_amt = new BigNumber("50e6");
		await curve_amo_arbi_instance.metapoolDeposit(0, usdc_only_deposit_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT USDT ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit 50 arbiUSDT");
		const usdt_only_deposit_amt = new BigNumber("50e6");
		await curve_amo_arbi_instance.metapoolDeposit(0, 0, usdt_only_deposit_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT FRAX, USDC, AND USDT FOR LP TOKENS==========================="));
		
		console.log("Deposit 125 FRAX, 125 arbiUSDC, 125 arbiUSDT");
		const frax_mixed_deposit_amt = new BigNumber("125e18");
		const usdc_mixed_deposit_amt = new BigNumber("125e6");
		const usdt_mixed_deposit_amt = new BigNumber("125e6");
		await curve_amo_arbi_instance.metapoolDeposit(frax_mixed_deposit_amt, usdc_mixed_deposit_amt, usdt_mixed_deposit_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW FRAX ONLY==========================="));
		
		console.log("Withdraw 10 FRAX");
		const frax_only_lp_withdraw_amt = new BigNumber("10e18");
		await curve_amo_arbi_instance.metapoolWithdrawFrax(frax_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW USDC ONLY==========================="));
		
		console.log("Withdraw 10 USDC");
		const usdc_only_lp_withdraw_amt = new BigNumber("10e18");
		await curve_amo_arbi_instance.metapoolWithdrawUsdc(usdc_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW USDT ONLY==========================="));
		
		console.log("Withdraw 10 USDT");
		const usdt_only_lp_withdraw_amt = new BigNumber("10e18");
		await curve_amo_arbi_instance.metapoolWithdrawUsdt(usdt_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW MIX OF TOKENS==========================="));
		
		console.log("Withdraw a mix of tokens using 100 LP");
		const mixed_lp_withdraw_amt = new BigNumber("100e18");
		await curve_amo_arbi_instance.metapoolWithdrawAtCurRatio(mixed_lp_withdraw_amt, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [NO BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await curve_amo_arbi_instance.giveFRAXBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await curve_amo_arbi_instance.giveFXSBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give back 1 USDC");
		await curve_amo_arbi_instance.giveCollatBack(new BigNumber("1e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [WITH BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await curve_amo_arbi_instance.giveFRAXBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await curve_amo_arbi_instance.giveFXSBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// AEB bans contract calls back
		// console.log("Give back 1 USDC");
		// await curve_amo_arbi_instance.giveCollatBack(new BigNumber("1e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await curve_amo_arbi_instance.execute(canFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CurveAMO_ARBI] ----------"));
		old_allocations = the_allocations;
		the_allocations = await curve_amo_arbi_instance.showAllocations.call();
		utilities.printAllocations('CurveAMO_ARBI', the_allocations, old_allocations);
	});

});