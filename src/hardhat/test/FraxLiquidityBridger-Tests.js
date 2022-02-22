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

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");

// Misc AMOs
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");
const FraxLiquidityBridger_AUR_Rainbow = artifacts.require("Bridges/Aurora/FraxLiquidityBridger_AUR_Rainbow.sol");
const FraxLiquidityBridger_OPTI_Celer = artifacts.require("Bridges/Avalanche/FraxLiquidityBridger_OPTI_Celer.sol");

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

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FraxLiquidityBridger-Tests', async (accounts) => {
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
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_USDC = '0x55FE002aefF02F77364de339a1292923A15844B8';

	// AMO
	let frax_bridger_instance;
	let frax_amo_minter_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let usdc_instance;

	// Initialize pool instances
	let pool_instance_V3;
	
    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);

		// Constants
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
	
		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Initialize pool instances
		pool_instance_V3 = await FraxPoolV3.deployed();
		
		// If truffle-fixture is used
		frax_bridger_instance = await FraxLiquidityBridger_AUR_Rainbow.deployed();

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
			params: [ADDRESS_WITH_FRAX]}
		);

		console.log("Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX");
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("150000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		console.log("Give the COLLATERAL_FRAX_AND_FXS_OWNER address some USDC");
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("150000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});

		console.log("Give the FraxPoolV3 some collateral to start");
		await usdc_instance.transfer(pool_instance_V3.address, new BigNumber("5000000e6"), { from: ADDRESS_WITH_USDC });

		console.log("Give the bridger some collateral");
		await usdc_instance.transfer(frax_bridger_instance.address, new BigNumber("10000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});

		console.log("Set the AMO Minter owner to process.env.FRAX_ONE_ADDRESS");
		await frax_amo_minter_instance.nominateNewOwner(process.env.FRAX_ONE_ADDRESS, { from: process.env.COMPTROLLER_MSIG_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});

		console.log("Accept AMO Minter ownership");
		await frax_amo_minter_instance.acceptOwnership({ from: process.env.FRAX_ONE_ADDRESS });


		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log("=================INITIALIZE================");
		
		console.log("Print some info");
		let the_allocations = await frax_bridger_instance.showAllocations.call();
		let the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, null);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, null);


		console.log("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]=====================");
		// Makes sure the pool is working

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		const fxs_per_usd_exch_rate = (new BigNumber(await pool_instance_V3.getFXSPrice()).div(BIG6).toNumber());
		console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// Redeem threshold
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});
	
		console.log("Set the redeem threshold to $1.01 now so redeems work");
		await pool_instance_V3.setPriceThresholds(1030000, 1010000, { from: process.env.COMPTROLLER_MSIG_ADDRESS }); 
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});

		// Do a redeem
		const redeem_amount = new BigNumber("1000e18");
		console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		await frax_instance.approve(pool_instance_V3.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pool_instance_V3.redeemFrax(5, redeem_amount, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Advance two blocks
		await time.increase(20);
		await time.advanceBlock();
		await time.increase(20);
		await time.advanceBlock();

		// Collect the redemption
		await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the collatDollarBalances
		console.log("Bridger collatDollarBalance:", new BigNumber((await frax_bridger_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("gcv_bal_start: ", gcv_bal_start);

		// Note the FraxPoolV3 Balance too
		const pool_usdc_bal_start = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		console.log("pool_usdc_bal_start: ", pool_usdc_bal_start);


		console.log("=========================GET SOME FRAX=========================");
		console.log("Get some FRAX from the minter");
		await frax_amo_minter_instance.mintFraxForAMO(frax_bridger_instance.address, new BigNumber("100250e18"), { from: process.env.FRAX_ONE_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log("===========================BURN SOME FRAX===========================");
		// Test burn some FRAX
		await frax_bridger_instance.burnFRAX(new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log("=========================GET SOME FXS=========================");
		console.log("Get some FXS from the minter");
		await frax_amo_minter_instance.mintFxsForAMO(frax_bridger_instance.address, new BigNumber("100250e18"), { from: process.env.FRAX_ONE_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log("===========================BURN SOME FXS===========================");
		// Test burn some FRAX
		await frax_bridger_instance.burnFXS(new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("=====================GET SOME USDC====================="));
		console.log("Get some USDC from the AMO Minter");
		await frax_amo_minter_instance.giveCollatToAMO(frax_bridger_instance.address, new BigNumber("100000e6"), { from: process.env.FRAX_ONE_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log("===========================BRIDGE SOME TOKENS OVER===========================");
		console.log("Bridge FRAX");
		console.log("FRAX TokenType:", new BigNumber(await frax_bridger_instance.getTokenType.call(frax_instance.address)).toNumber());
		await frax_bridger_instance.bridge(frax_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Bridge FXS");
		console.log("FXS TokenType:", new BigNumber(await frax_bridger_instance.getTokenType.call(fxs_instance.address)).toNumber());
		await frax_bridger_instance.bridge(fxs_instance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Bridge USDC");
		console.log("USDC TokenType:", new BigNumber(await frax_bridger_instance.getTokenType.call(usdc_instance.address)).toNumber());
		await frax_bridger_instance.bridge(usdc_instance.address, new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);

		
		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await frax_bridger_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const investor_usdc_bal_after = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));

		// // Make sure tokens were actually transferred
		// const investor_usdc_balance_change = investor_usdc_bal_after.minus(investor_usdc_bal_before).div(BIG6).toNumber();
		// console.log("Investor USDC balance change:", investor_usdc_balance_change);
		// assert(investor_usdc_bal_after > investor_usdc_bal_before, 'Should have transferred');


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK AMO CORRECTION OFFSET [POSITIVE] ====================="));
		await frax_amo_minter_instance.setAMOCorrectionOffsets(frax_bridger_instance.address, new BigNumber("10e18"), new BigNumber("25e18"), { from: process.env.FRAX_ONE_ADDRESS });
		
		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);

		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(frax_bridger_instance.address)).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK AMO CORRECTION OFFSET [NEGATIVE] ====================="));
		await frax_amo_minter_instance.setAMOCorrectionOffsets(frax_bridger_instance.address, new BigNumber("-10e18"), new BigNumber("-25e18"), { from: process.env.FRAX_ONE_ADDRESS });

		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);

		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(frax_bridger_instance.address)).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("===================== UNSET THE AMO CORRECTION OFFSETS ====================="));
		await frax_amo_minter_instance.setAMOCorrectionOffsets(frax_bridger_instance.address, 0, 0, { from: process.env.FRAX_ONE_ADDRESS });


		console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));
		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Bridger collatDollarBalance:", new BigNumber((await frax_bridger_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(frax_bridger_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give all of the remaining FRAX back");
		const amo_frax_bal = new BigNumber(await frax_instance.balanceOf.call(frax_bridger_instance.address));
		await frax_bridger_instance.burnFRAX(amo_frax_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Give all of the remaining FXS back");
		const amo_fxs_bal = new BigNumber(await fxs_instance.balanceOf.call(frax_bridger_instance.address));
		await frax_bridger_instance.burnFXS(amo_fxs_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Give all of the remaining Collateral back");
		// const amo_collat_bal = new BigNumber(await usdc_instance.balanceOf.call(frax_bridger_instance.address));
		// await frax_bridger_instance.giveCollatBack(amo_collat_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FraxPoolV3 balance and collatDollarBalance after
		const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		console.log("Bridger collatDollarBalance:", new BigNumber((await frax_bridger_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(frax_bridger_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK FINAL ALLOCATIONS ====================="));
		console.log("Print some info");
		old_allocations = the_allocations;
		old_balances = the_token_balances;
		the_allocations = await frax_bridger_instance.showAllocations.call();
		the_token_balances = await frax_bridger_instance.showTokenBalances.call();
		utilities.printAllocations('LIQUIDITY_BRIDGER', the_allocations, old_allocations);
		utilities.printTokenBalances('LIQUIDITY_BRIDGER', the_token_balances, old_balances);


		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);
		console.log("FraxPoolV3 USDC Balance Change:", pool_usdc_bal_end - pool_usdc_bal_start);

	});
});