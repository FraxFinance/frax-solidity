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
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Bridges
const CrossChainBridgeBacker_AVAX_AnySwap = artifacts.require("Bridges/Avalanche/CrossChainBridgeBacker_AVAX_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// AMOs
const AxialAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Avalanche/AxialAMO.sol");
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

contract('AxialAMO-Tests', async (accounts) => {
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
	let ADDRESS_WITH_TSD = "0x4e3376018AdD04EBE4C46bf6F924DDec8C67AA7B";
	let ADDRESS_WITH_MIM = "0x4e3376018AdD04EBE4C46bf6F924DDec8C67AA7B";
	let ADDRESS_WITH_DAI = "0x4e3376018AdD04EBE4C46bf6F924DDec8C67AA7B";

	// Initialize core instances
	let anyFRAX_instance;
	let anyFXS_instance;
	let canFRAX_instance;
	let canFXS_instance;

	// Initialized reward addresses
	let axial_instance;

	// Initialize collateral addresses
	let tsd_instance;
	let mim_instance;
	let dai_instance;

	// Initialize bridge instances
	let cc_bridge_backer_instance;

	// Initialize oracle instances
	let cross_chain_oracle_instance;

	// Initialize AMO instances
	let axial_amo_instance;
    let pangolin_liquidity_amo_instance;

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

		// Initialized reward addresses
		axial_instance = await ERC20.at("0xcF8419A615c57511807236751c0AF38Db4ba3351");

		// Fill collateral instances
		tsd_instance = await ERC20.at("0x4fbf0429599460D327BD5F55625E30E4fC066095");
		mim_instance = await ERC20.at("0x130966628846BFd36ff31a822705796e8cb8C18D");
		dai_instance = await ERC20.at("0xd586E7F844cEa2F87f50152665BCbc2C279D8d70");

		// Fill bridge instances
		cc_bridge_backer_instance = await CrossChainBridgeBacker_AVAX_AnySwap.deployed();

		// Fill oracle instances
		cross_chain_oracle_instance = await CrossChainOracle.deployed();
		
		// Fill AMO instances
		axial_amo_instance = await AxialAMO.deployed();
		pangolin_liquidity_amo_instance = await PangolinLiquidityAMO.deployed();
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
		// ====================================================

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************

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

		// console.log(chalk.yellow('========== SET COLLATERAL_FRAX_AND_FXS_OWNER AS THE SpiritSwapLiquidityAMO OWNER  =========='));
		// await spiritSwapLiquidityAMO_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.AVALANCHE_ONE_ADDRESS });
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.AVALANCHE_ONE_ADDRESS]
		});

		// Accept ownerships
		await cc_bridge_backer_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFRAX_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await canFXS_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await spiritSwapLiquidityAMO_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_TSD]
		});    
	
		console.log(chalk.yellow('========== GIVE THE AxialAMO SOME TSD  =========='));
		await tsd_instance.transfer(axial_amo_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_TSD });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_TSD]
		});

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_MIM]
		});    
	
		console.log(chalk.yellow('========== GIVE THE AxialAMO SOME MIM  =========='));
		await mim_instance.transfer(axial_amo_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_MIM });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_MIM]
		});

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_DAI]
		});    
	
		console.log(chalk.yellow('========== GIVE THE AxialAMO SOME DAI  =========='));
		await dai_instance.transfer(axial_amo_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_DAI });
		
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

		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		let the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, null);


		console.log(chalk.hex("#ff8b3d").bold("===========================LEND SOME CANONICAL TOKENS TO THE AxialAMO==========================="));
		
		console.log("Lend 1000 canFRAX");
		await cc_bridge_backer_instance.lendFraxToAMO(axial_amo_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 canFXS");
		// await cc_bridge_backer_instance.lendFxsToAMO(axial_amo_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Lend 1000 anyUSDC");
		// await cc_bridge_backer_instance.lendCollatToAMO(axial_amo_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		let cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		let cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		let old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT TSD ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit TSD amount");
		const tsd_only_deposit_amt = new BigNumber("50e18");
		await axial_amo_instance.ac4dDeposit(tsd_only_deposit_amt, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT MIM ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit MIM amount");
		const mim_only_deposit_amt = new BigNumber("50e18");
		await axial_amo_instance.ac4dDeposit(0, mim_only_deposit_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT FRAX ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit FRAX amount");
		const frax_only_deposit_amt = new BigNumber("50e18");
		await axial_amo_instance.ac4dDeposit(0, 0, frax_only_deposit_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT DAI ALONE FOR LP TOKENS==========================="));
		
		console.log("Deposit TSD amount");
		const dai_only_deposit_amt = new BigNumber("50e18");
		await axial_amo_instance.ac4dDeposit(0, 0, 0, dai_only_deposit_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT ALL 4 TOKENS FOR LP TOKENS==========================="));
		
		console.log("Deposit 125 each of the 4 tokens");
		const tsd_mixed_deposit_amt = new BigNumber("125e18");
		const mim_mixed_deposit_amt = new BigNumber("125e18");
		const frax_mixed_deposit_amt = new BigNumber("125e18");
		const dai_mixed_deposit_amt = new BigNumber("125e18");
		await axial_amo_instance.ac4dDeposit(tsd_mixed_deposit_amt, mim_mixed_deposit_amt, frax_mixed_deposit_amt, dai_mixed_deposit_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW TSD ONLY==========================="));
		
		console.log("Withdraw 10 TSD");
		const tsd_only_lp_withdraw_amt = new BigNumber("10e18");
		await axial_amo_instance.ac4dWithdrawTSD(tsd_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW MIM ONLY==========================="));
		
		console.log("Withdraw 10 MIM");
		const mim_only_lp_withdraw_amt = new BigNumber("10e18");
		await axial_amo_instance.ac4dWithdrawMIM(mim_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW FRAX ONLY==========================="));
		
		console.log("Withdraw 10 FRAX");
		const frax_only_lp_withdraw_amt = new BigNumber("10e18");
		await axial_amo_instance.ac4dWithdrawFRAX(frax_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW DAI ONLY==========================="));
		
		console.log("Withdraw 10 DAI");
		const dai_only_lp_withdraw_amt = new BigNumber("10e18");
		await axial_amo_instance.ac4dWithdrawDAI(dai_only_lp_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW MIX OF TOKENS==========================="));
		
		console.log("Withdraw a mix of tokens using 100 LP");
		const mixed_lp_withdraw_amt = new BigNumber("100e18");
		await axial_amo_instance.ac4dWithdrawAtCurRatio(mixed_lp_withdraw_amt, 0, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================DEPOSIT TO MASTERCHEF==========================="));
		
		console.log("Deposit 10 LP to the MasterChef");
		const masterchef_dep_amt = new BigNumber("10e18");
		await axial_amo_instance.masterChefDeposit(masterchef_dep_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WAIT SOME TIME AND CLAIM REWARDS==========================="));
		// Advance a few days
		for (let j = 0; j < 8; j++){
			await time.increase(86400);
			await time.advanceBlock();
		}

		console.log("Claim AXIAL rewards");
		console.log("AXIAL balance before: ", (new BigNumber(await axial_instance.balanceOf.call(axial_amo_instance.address))).div(BIG18).toNumber());
		await axial_amo_instance.masterChefCollect({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("AXIAL balance after: ", (new BigNumber(await axial_instance.balanceOf.call(axial_amo_instance.address))).div(BIG18).toNumber());
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WITHDRAW FROM MASTERCHEF==========================="));
		
		console.log("Withdraw 10 LP from the MasterChef");
		const masterchef_withdraw_amt = new BigNumber("10e18");
		await axial_amo_instance.masterChefWithdraw(masterchef_withdraw_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [NO BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await axial_amo_instance.giveFRAXBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await axial_amo_instance.giveFXSBack(new BigNumber("1e18"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 USDC");
		// await axial_amo_instance.giveCollatBack(new BigNumber("1e6"), false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================AMO GIVES BACK TOKENS [WITH BRIDGE]==========================="));

		console.log("Give back 1 canFRAX");
		await axial_amo_instance.giveFRAXBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give back 1 canFXS");
		// await axial_amo_instance.giveFXSBack(new BigNumber("1e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// AEB bans contract calls back
		// console.log("Give back 1 USDC");
		// await axial_amo_instance.giveCollatBack(new BigNumber("1e6"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [CROSS_CHAIN_BRIDGE_BACKER] ----------"));
		cc_bridge_backer_old_allocations = cc_bridge_backer_allocations;
		cc_bridge_backer_old_balances = cc_bridge_backer_token_balances;
		cc_bridge_backer_allocations = await cc_bridge_backer_instance.showAllocations.call();
		cc_bridge_backer_token_balances = await cc_bridge_backer_instance.showTokenBalances.call();
		utilities.printAllocations('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_allocations, cc_bridge_backer_old_allocations);
		utilities.printTokenBalances('CROSS_CHAIN_BRIDGE_BACKER', cc_bridge_backer_token_balances, cc_bridge_backer_old_balances);

		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e18")]);

		await axial_amo_instance.execute(canFRAX_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log(chalk.hex("#337afe").bold("---------- [AxialAMO] ----------"));
		old_allocations = the_allocations;
		the_allocations = await axial_amo_instance.showAllocations.call();
		utilities.printAllocations('AxialAMO', the_allocations, old_allocations);
	});

});