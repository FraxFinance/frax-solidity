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

// Collateral
const WETH = artifacts.require("ERC20/WETH");
// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Bond contracts
const FraxBond = artifacts.require("FXB/FraxBond");
const FraxBondIssuer = artifacts.require("FXB/FraxBondIssuer");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const BIG6 = new BigNumber("1e6");
const BIG8 = new BigNumber("1e8");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";


contract('FraxBond-Tests', async (accounts) => {
	let CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let ALLOCATIONS = constants.ALLOCATIONS;

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
	let BOND_CONTROLLER_ADDRESS;
	let FRAX_UTILITY_CONTRACTOR;
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';


	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize pool instances
	let pool_instance_USDC;

	// Initialize bond instances
	let fxbInstance;
    let bondIssuerInstance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

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
		BOND_CONTROLLER_ADDRESS = accounts[9];
		FRAX_UTILITY_CONTRACTOR = process.env.FRAX_UTILITY_CONTRACTOR

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();

		// Fill collateral instances
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_USDC_vAMM = await PoolvAMM_USDC.deployed();

		// Fill bond instances
		fxbInstance = await FraxBond.deployed();
		bondIssuerInstance = await FraxBondIssuer.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// INITIALIZATION
	// ================================================================
	it('Initialization related', async () => {
		console.log("=========================Initialization=========================");
		
		console.log("---------Add bond issuer as a pool (on FRAX) and an issuer (on FXB) so it can mint / burn---------");
		await frax_instance.addPool(bondIssuerInstance.address, { from: process.env.FRAX_ONE_ADDRESS });
		await fxbInstance.addIssuer(bondIssuerInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Needed for the minting below
		await frax_instance.addPool(BOND_CONTROLLER_ADDRESS, { from: process.env.FRAX_ONE_ADDRESS });

		console.log("---------Give the FRAX_UTILITY_CONTRACTOR some FRAX via minting---------");
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [bondIssuerInstance.address]
		// });

		await frax_instance.pool_mint(FRAX_UTILITY_CONTRACTOR, new BigNumber("25000000e18"), { from: BOND_CONTROLLER_ADDRESS });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [bondIssuerInstance.address]
		// });

	});

	// Pull in USDC via the mint method
	// ================================================================
	it('Main test', async () => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FRAX_UTILITY_CONTRACTOR]
		});

		console.log(chalk.bold.blue("============================EPOCH #0============================"));

		const frax_balance_before = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_before = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);
		console.log("FRAX balance before : ", frax_balance_before.toNumber());
		console.log("FXB balance before : ", fxb_balance_before.toNumber());

		console.log("---------Start a new epoch---------");
		await bondIssuerInstance.startNewEpoch({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		const frax_balance_after = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_after = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);
		console.log("FRAX balance after : ", frax_balance_after.toNumber());
		console.log("FXB balance after : ", fxb_balance_after.toNumber());

		console.log("---------Print some info---------");
		const amm_spot_price = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price.toNumber());
		console.log("floor_price: ", floor_price.toNumber());
		console.log("initial_discount : ", initial_discount.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor.toNumber());
		console.log("issuable_fxb: ", issuable_fxb.toNumber());

		console.log("---------Buy some unissued bonds---------");
		const buying_amount_3 = new BigNumber("1000e18");
		console.log("Bought:", buying_amount_3.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_3, { from: FRAX_UTILITY_CONTRACTOR });
		await bondIssuerInstance.buyUnissuedFXB(buying_amount_3, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_2 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issue_price_2 = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		const floor_price_2 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_2 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_2 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb_2 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const frax_balance_2 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_2 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_2.toNumber());
		console.log("issue_price: ", issue_price_2.toNumber());
		console.log("floor_price: ", floor_price_2.toNumber());
		console.log("initial_discount : ", initial_discount_2.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_2.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_2.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_2.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_2.toNumber());

		console.log("---------Sell some bonds---------");
		const selling_amount = new BigNumber("100e18");
		console.log("Sold:", selling_amount.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, selling_amount, { from: FRAX_UTILITY_CONTRACTOR });
		await bondIssuerInstance.sellFXBintoAMM(selling_amount, 0, { from: FRAX_UTILITY_CONTRACTOR });
		
		const amm_spot_price_3 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_3 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_3 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_3 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_3 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_3.toNumber());
		console.log("floor_price: ", floor_price_3.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_3.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_3.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_3.toNumber());
		
		// console.log("---------Buy some bonds and deposit---------");
		// await frax_instance.approve(bondIssuerInstance.address, new BigNumber("50e18"), { from: FRAX_UTILITY_CONTRACTOR });
		// // Deposit # 1
		// await bondIssuerInstance.buyFXBfromAMM(new BigNumber("40e18"), 0, true, { from: FRAX_UTILITY_CONTRACTOR });

		// // Deposit # 2
		// await bondIssuerInstance.buyFXBfromAMM(new BigNumber("10e18"), 0, true, { from: FRAX_UTILITY_CONTRACTOR });

		// const amm_spot_price_4 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		// const floor_price_4 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		// const initial_discount_4 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		// const minimum_frax_for_AMM_buy_4 = new BigNumber(await bondIssuerInstance.minimum_frax_for_AMM_buy.call()).div(BIG18);
		// const maximum_fxb_AMM_sellable_above_floor_4 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		// const frax_balance_4 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		// const fxb_balance_4 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		// const deposited_fxb = new BigNumber(await bondIssuerInstance.deposited_fxb()).div(BIG18);
		
		// const deposit_structs = await bondIssuerInstance.depositsOf.call(FRAX_UTILITY_CONTRACTOR);
		// const kek_id_deposit_0 = deposit_structs[0].kek_id;
		// console.log("Deposits: ", deposit_structs);
		// console.log("kek_id: ", kek_id_deposit_0);

		// console.log("amm_spot_price: ", amm_spot_price_4.toNumber());
		// console.log("floor_price: ", floor_price_4.toNumber());
		// console.log("initial_discount : ", initial_discount_4.toNumber());
		// console.log("minimum_frax_for_AMM_buy : ", minimum_frax_for_AMM_buy_4.toNumber());
		// console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_4.toNumber());
		// console.log("FRAX balance [issuer]: ", frax_balance_4.toNumber());
		// console.log("FXB balance [issuer]: ", fxb_balance_4.toNumber());

		// console.log("Deposited FXB : ", deposited_fxb.toNumber());

		console.log("---------Advance a little bit---------");
		// Advance 1 block
		await time.increase((1 * 15) + 1);
		await time.advanceBlock();

		console.log("---------Try to redeem FXB early [SHOULD FAIL]---------");
		await fxbInstance.approve(bondIssuerInstance.address, new BigNumber("25e18"), { from: FRAX_UTILITY_CONTRACTOR });
		await expectRevert(
			bondIssuerInstance.redeemFXB(new BigNumber("25e18"), { from: FRAX_UTILITY_CONTRACTOR }),
			"Not in the cooldown period"
		);

		// console.log("---------Try to redeem deposited FXB early [SHOULD FAIL]---------");
		// await expectRevert(
		// 	bondIssuerInstance.redeemDepositedFXB(kek_id_deposit_0, { from: FRAX_UTILITY_CONTRACTOR }),
		// 	"Deposit is still maturing"
		// );

		console.log("---------Advance some time---------");
		// Advance 90 days
		await time.increase((90 * 86400) + 1);
		await time.advanceBlock();

		const amm_spot_price_5 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_5 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_5 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_5_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_5 = frax_balance_5_E18.div(BIG18);
		const fxb_balance_5_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_5 = fxb_balance_5_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_5.toNumber());
		console.log("floor_price: ", floor_price_5.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_5.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_5.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_5.toNumber());

		console.log("---------Advance to the end of the epoch---------");
		// Advance 280 days
		await time.increase((275 * 86400) + 1);
		await time.advanceBlock();

		console.log("---------Note some things---------");
		const amm_spot_price_7 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_7 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_7 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_7 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_7_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_7 = frax_balance_7_E18.div(BIG18);
		const fxb_balance_7_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_7 = fxb_balance_7_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_7.toNumber());
		console.log("floor_price: ", floor_price_7.toNumber());
		console.log("initial_discount : ", initial_discount_7.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_7.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_7.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_7.toNumber());

		console.log("---------Try to redeem some FXB---------");
		const frax_balance_before_redeem_1 = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		const fxb_balance_before_redeem_1 = new BigNumber(await fxbInstance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		console.log("FRAX balance before : ", frax_balance_before_redeem_1.toNumber());
		console.log("FXB balance before : ", fxb_balance_before_redeem_1.toNumber());

		// Do the redeem
		const redeem_amount = new BigNumber("100e18");
		console.log("Redeeming:", redeem_amount.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, redeem_amount, { from: FRAX_UTILITY_CONTRACTOR });
		await bondIssuerInstance.redeemFXB(redeem_amount, { from: FRAX_UTILITY_CONTRACTOR });
		
		const frax_balance_after_redeem_1 = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		const fxb_balance_after_redeem_1 = new BigNumber(await fxbInstance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		console.log("FRAX balance after : ", frax_balance_after_redeem_1.toNumber());
		console.log("FXB balance after : ", fxb_balance_after_redeem_1.toNumber());
		console.log("FRAX difference : ", (frax_balance_after_redeem_1.minus(frax_balance_before_redeem_1)).toNumber());
		console.log("FXB difference : ", (fxb_balance_after_redeem_1.minus(fxb_balance_before_redeem_1)).toNumber());

		// console.log("---------Try to redeem some deposited bonds---------");
		// const frax_balance_before_redeem_2 = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		// const fxb_balance_before_redeem_2 = new BigNumber(await fxbInstance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		// console.log("FRAX balance before : ", frax_balance_before_redeem_2.toNumber());
		// console.log("FXB balance before : ", fxb_balance_before_redeem_2.toNumber());

		// // Do the redeem
		// console.log("Redeeming:", new BigNumber(deposit_structs[0].amount).div(BIG18).toNumber(), "FXB [Deposited]");
		// await bondIssuerInstance.redeemDepositedFXB(kek_id_deposit_0,{ from: FRAX_UTILITY_CONTRACTOR });
		
		// const frax_balance_after_redeem_2 = new BigNumber(await frax_instance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		// const fxb_balance_after_redeem_2 = new BigNumber(await fxbInstance.balanceOf(FRAX_UTILITY_CONTRACTOR)).div(BIG18);
		// console.log("FRAX balance after : ", frax_balance_after_redeem_2.toNumber());
		// console.log("FXB balance after : ", fxb_balance_after_redeem_2.toNumber());
		// console.log("FRAX difference : ", (frax_balance_after_redeem_2.minus(frax_balance_before_redeem_2)).toNumber());
		// console.log("FXB difference : ", (fxb_balance_after_redeem_2.minus(fxb_balance_before_redeem_2)).toNumber());

		console.log("---------Advance to the end of the cooldown---------");
		// Advance 10 days
		await time.increase((10 * 86400) + 1);
		await time.advanceBlock();

		console.log(chalk.bold.blue("============================EPOCH #1============================"));

		const frax_balance_before_epoch_1 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_before_epoch_1 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);
		console.log("FRAX balance before : ", frax_balance_before_epoch_1.toNumber());
		console.log("FXB balance before : ", fxb_balance_before_epoch_1.toNumber());

		console.log("---------Start a new epoch---------");
		await bondIssuerInstance.startNewEpoch({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		const frax_balance_after_epoch_1 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_after_epoch_1 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("FRAX balance after : ", frax_balance_after_epoch_1.toNumber());
		console.log("FXB balance after : ", fxb_balance_after_epoch_1.toNumber());


		console.log("---------Note some things---------");
		const amm_spot_price_8 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_8 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_8 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_8 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb_8 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const frax_balance_8_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_8 = frax_balance_8_E18.div(BIG18);
		const fxb_balance_8_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_8 = fxb_balance_8_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_8.toNumber());
		console.log("floor_price: ", floor_price_8.toNumber());
		console.log("initial_discount : ", initial_discount_8.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_8.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_8.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_8.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_8.toNumber());

		console.log("---------Expand the bond supply mid-epoch---------");
		await bondIssuerInstance.expand_AMM_liquidity(new BigNumber("100000e18"), 1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		const amm_spot_price_9 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_9 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_9 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_9_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_9 = frax_balance_9_E18.div(BIG18);
		const fxb_balance_9_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_9 = fxb_balance_9_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_9.toNumber());
		console.log("floor_price: ", floor_price_9.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_9.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_9.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_9.toNumber());

		console.log("---------Contract the bond supply mid-epoch---------");
		await bondIssuerInstance.contract_AMM_liquidity(new BigNumber("300000e18"), 1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		const amm_spot_price_10 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_10 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_10 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_10_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_10 = frax_balance_10_E18.div(BIG18);
		const fxb_balance_10_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_10 = fxb_balance_10_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_10.toNumber());
		console.log("floor_price: ", floor_price_10.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_10.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_10.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_10.toNumber());

		console.log("---------Advance to the end of the cooldown---------");
		// Advance 375 days
		await time.increase((375 * 86400) + 1);
		await time.advanceBlock();

		console.log(chalk.bold.blue("============================EPOCH #2============================"));
		console.log("---------Set a smaller tranche size and liquidity---------");
		await bondIssuerInstance.setMaxFXBOutstanding(new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await bondIssuerInstance.setTargetLiquidity(new BigNumber("10000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------Start a new epoch---------");
		await bondIssuerInstance.startNewEpoch({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------Note some things---------");
		const amm_spot_price_11 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_11 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_11 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_11 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb_11 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const frax_balance_11_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_11 = frax_balance_11_E18.div(BIG18);
		const fxb_balance_11_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_11 = fxb_balance_11_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_11.toNumber());
		console.log("floor_price: ", floor_price_11.toNumber());
		console.log("initial_discount : ", initial_discount_11.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_11.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_11.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_11.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_11.toNumber());

		// console.log("---------Try to sell at a price above 1 [SHOULD FAIL]---------");
		// await fxbInstance.approve(bondIssuerInstance.address, new BigNumber("1e18"), { from: FRAX_UTILITY_CONTRACTOR });
		// await expectRevert(
		// 	bondIssuerInstance.sellFXBintoAMM(new BigNumber("1e18"), 0, { from: FRAX_UTILITY_CONTRACTOR }),
		// 	"[sellFXBintoAMM]: Effective sale price is above 1"
		// );

		console.log("---------Sell some bonds---------");
		const selling_amount_11aaaa = new BigNumber("200e18");
		console.log("Sold:", selling_amount_11aaaa.div(BIG18).toNumber(), "FXB");
		// const selling_amount_11aaaa = maximum_fxb_AMM_sellable_above_floor_11.multipliedBy(BIG18);
		// console.log("Sold:", selling_amount_11aaaa.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, selling_amount_11aaaa, { from: FRAX_UTILITY_CONTRACTOR });
		await bondIssuerInstance.sellFXBintoAMM(selling_amount_11aaaa, 0, { from: FRAX_UTILITY_CONTRACTOR });
		
		const amm_spot_price_11aaaa = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_11aaaa = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_11aaaa = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_11aaaa = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_11aaaa = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_11aaaa.toNumber());
		console.log("floor_price: ", floor_price_11aaaa.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_11aaaa.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_11aaaa.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_11aaaa.toNumber());

		console.log("---------Advance some time---------");
		// Advance 175 days
		await time.increase((275 * 86400) + 1);
		await time.advanceBlock();

		console.log("---------Note some things---------");
		const amm_spot_price_11ab = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issue_price_11ab = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		const floor_price_11ab = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_11ab = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_11ab_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_11ab = frax_balance_11ab_E18.div(BIG18);
		const fxb_balance_11ab_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_11ab = fxb_balance_11ab_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_11ab.toNumber());
		console.log("issue_price: ", issue_price_11ab.toNumber());
		console.log("floor_price: ", floor_price_11ab.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_11ab.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_11ab.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_11ab.toNumber());

		console.log("---------Buy some bonds (small amount when AMM price is below floor)---------");
		const buying_amount_11aaa = new BigNumber("5e18");
		console.log("Bought:", buying_amount_11aaa.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_11aaa, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_11aaa = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_11aaa, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_11aaa = (new BigNumber(expected_values_CALL_11aaa['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_11aaa.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_11aaa['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_11aaa).div(fxb_out_E18_11aaa)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_11aaa, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_11aaa = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issue_price_11aaa = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		const floor_price_11aaa = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_11aaa = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_11aaa = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_11aaa = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_11aaa.toNumber());
		console.log("issue_price: ", issue_price_11aaa.toNumber());
		console.log("floor_price: ", floor_price_11aaa.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_11aaa.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_11aaa.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_11aaa.toNumber());

		console.log("---------Buy some bonds (part floor / part market)---------");
		const buying_amount_11aa = new BigNumber("750e18");
		console.log("Bought:", buying_amount_11aa.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_11aa, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_11aa = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_11aa, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_11aa = (new BigNumber(expected_values_CALL_11aa['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_11aa.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_11aa['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_11aa).div(fxb_out_E18_11aa)).toNumber());


		await bondIssuerInstance.buyFXBfromAMM(buying_amount_11aa, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_11aa = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_11aa = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_11aa = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_11aa = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_11aa = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_11aa.toNumber());
		console.log("floor_price: ", floor_price_11aa.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_11aa.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_11aa.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_11aa.toNumber());

		console.log("---------Sell some bonds again (small amount, all at market)---------");
		const selling_amount_13 = new BigNumber("5e18");
		console.log("Sold:", selling_amount_13.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, selling_amount_13, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_13 = await bondIssuerInstance.sellFXBintoAMM.call(selling_amount_13, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const frax_out_E18_13 = (new BigNumber(expected_values_CALL_13['frax_out']));
		const fxb_sold_under_floor_E18_13 = (new BigNumber(expected_values_CALL_13['fxb_sold_under_floor']));
		console.log("frax_out: ", frax_out_E18_13.div(BIG18).toNumber());
		console.log("frax_fee_amt: ", (new BigNumber(expected_values_CALL_13['frax_fee_amt'])).div(BIG18).toNumber());
		console.log("fxb_sold_under_floor: ", fxb_sold_under_floor_E18_13.div(BIG18).toNumber());
		console.log("effective_sale_price: ", (frax_out_E18_13.div(selling_amount_13)).toNumber());

		await bondIssuerInstance.sellFXBintoAMM(selling_amount_13, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_13 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_13 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_13 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_13 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_13 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_13.toNumber());
		console.log("floor_price: ", floor_price_13.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_13.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_13.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_13.toNumber());

		console.log("---------Sell some bonds---------");
		const selling_amount_11d = new BigNumber("600e18");
		console.log("Sold:", selling_amount_11d.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, selling_amount_11d, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_11d = await bondIssuerInstance.sellFXBintoAMM.call(selling_amount_11d, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const frax_out_E18_11d = (new BigNumber(expected_values_CALL_11d['frax_out']));
		const fxb_sold_under_floor_E18_11d = (new BigNumber(expected_values_CALL_11d['fxb_sold_under_floor']));
		console.log("frax_out: ", frax_out_E18_11d.div(BIG18).toNumber());
		console.log("frax_fee_amt: ", (new BigNumber(expected_values_CALL_11d['frax_fee_amt'])).div(BIG18).toNumber());
		console.log("fxb_sold_under_floor: ", fxb_sold_under_floor_E18_11d.div(BIG18).toNumber());
		console.log("effective_sale_price: ", (frax_out_E18_11d.div(selling_amount_11d)).toNumber());

		await bondIssuerInstance.sellFXBintoAMM(selling_amount_11d, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_11d = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_11d = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_11d = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_11d = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_11d = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_11d.toNumber());
		console.log("floor_price: ", floor_price_11d.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_11d.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_11d.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_11d.toNumber());


		console.log("---------Advance to the end of the cooldown---------");
		// Advance 375 days
		await time.increase((200 * 86400) + 1);
		await time.advanceBlock();

		console.log(chalk.bold.blue("============================EPOCH #3============================"));
		console.log("---------Set a realistic tranche size and liquidity---------");
		await bondIssuerInstance.setMaxFXBOutstanding(new BigNumber("1000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await bondIssuerInstance.setTargetLiquidity(new BigNumber("500000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------Start a new epoch---------");
		await bondIssuerInstance.startNewEpoch({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------Note some things---------");
		const amm_spot_price_12 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issue_price_12 = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		const floor_price_12 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_12 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_12 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb_12 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const frax_balance_12_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_12 = frax_balance_12_E18.div(BIG18);
		const fxb_balance_12_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_12 = fxb_balance_12_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_12.toNumber());
		console.log("issue_price: ", issue_price_12.toNumber());
		console.log("floor_price: ", floor_price_12.toNumber());
		console.log("initial_discount : ", initial_discount_12.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_12.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_12.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_12.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_12.toNumber());

		console.log("---------Buy the remaining unissued bonds---------");
		const frax_to_buy_out_issue_15 = new BigNumber(await bondIssuerInstance.frax_to_buy_out_issue.call());
		const buying_amount_15 = frax_to_buy_out_issue_15;
		console.log("Bought:", buying_amount_15.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_15, { from: FRAX_UTILITY_CONTRACTOR });
		await bondIssuerInstance.buyUnissuedFXB(buying_amount_15, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_15 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_15 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_15 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_15 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_15 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_15 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_15.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_15.toNumber());
		console.log("floor_price: ", floor_price_15.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_15.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_15.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_15.toNumber());

		console.log("---------Buy some bonds from the AMM now---------");
		const buying_amount_16 = new BigNumber("100e18");
		console.log("Bought:", buying_amount_16.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_16, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_16 = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_16, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_16 = (new BigNumber(expected_values_CALL_16['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_16.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_16['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_16).div(fxb_out_E18_16)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_16, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_16 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_16 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_16 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_16 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_16 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_16.toNumber());
		console.log("floor_price: ", floor_price_16.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_16.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_16.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_16.toNumber());

		console.log("---------Dump sell a bunch of bonds---------");
		const selling_amount_17 = new BigNumber("10000e18");
		console.log("Sold:", selling_amount_17.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, selling_amount_17, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_17 = await bondIssuerInstance.sellFXBintoAMM.call(selling_amount_17, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const frax_out_E18_17 = (new BigNumber(expected_values_CALL_17['frax_out']));
		const fxb_sold_under_floor_E18_17 = (new BigNumber(expected_values_CALL_17['fxb_sold_under_floor']));
		console.log("frax_out: ", frax_out_E18_17.div(BIG18).toNumber());
		console.log("frax_fee_amt: ", (new BigNumber(expected_values_CALL_17['frax_fee_amt'])).div(BIG18).toNumber());
		console.log("fxb_sold_under_floor: ", fxb_sold_under_floor_E18_17.div(BIG18).toNumber());
		console.log("effective_sale_price: ", (frax_out_E18_17.div(selling_amount_17)).toNumber());

		await bondIssuerInstance.sellFXBintoAMM(selling_amount_17, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_17 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_17 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_17 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_17 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_17 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_17.toNumber());
		console.log("floor_price: ", floor_price_17.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_17.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_17.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_17.toNumber());

		console.log("---------More dump selling---------");
		const selling_amount_18 = new BigNumber("20000e18");
		console.log("Sold:", selling_amount_18.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, selling_amount_18, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_18 = await bondIssuerInstance.sellFXBintoAMM.call(selling_amount_18, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const frax_out_E18_18 = (new BigNumber(expected_values_CALL_18['frax_out']));
		const fxb_sold_under_floor_E18_18 = (new BigNumber(expected_values_CALL_18['fxb_sold_under_floor']));
		console.log("frax_out: ", frax_out_E18_18.div(BIG18).toNumber());
		console.log("frax_fee_amt: ", (new BigNumber(expected_values_CALL_18['frax_fee_amt'])).div(BIG18).toNumber());
		console.log("fxb_sold_under_floor: ", fxb_sold_under_floor_E18_18.div(BIG18).toNumber());
		console.log("effective_sale_price: ", (frax_out_E18_18.div(selling_amount_18)).toNumber());

		await bondIssuerInstance.sellFXBintoAMM(selling_amount_18, 0, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_18 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_18 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_18 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_18.toNumber());
		console.log("floor_price: ", floor_price_18.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_18.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_18.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_18.toNumber());

		console.log("---------Buy some bonds from the AMM---------");
		const buying_amount_19 = new BigNumber("1000e18");
		console.log("Bought:", buying_amount_19.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_19, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_19 = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_19, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_19 = (new BigNumber(expected_values_CALL_19['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_19.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_19['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_19).div(fxb_out_E18_19)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_19, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_19 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_19 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_19 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_19 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_19 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_19.toNumber());
		console.log("floor_price: ", floor_price_19.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_19.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_19.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_19.toNumber());


		console.log("---------Buy some more bonds from the AMM---------");
		const buying_amount_20 = new BigNumber("2500e18");
		console.log("Bought:", buying_amount_20.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_20, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_20 = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_20, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_20 = (new BigNumber(expected_values_CALL_20['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_20.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_20['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_20).div(fxb_out_E18_20)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_20, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_20 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issue_price_20 = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		const floor_price_20 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_20 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_20 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_20 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_20.toNumber());
		console.log("issue_price: ", issue_price_20.toNumber());
		console.log("floor_price: ", floor_price_20.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_20.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_20.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_20.toNumber());

		console.log("---------Wait a block---------");
		// Advance 1 block
		await time.increase((1 * 15) + 1);
		await time.advanceBlock();

		console.log("---------Rebalance the AMM to the floor price---------");
		const floor_price_21 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		await bondIssuerInstance.rebalance_AMM_liquidity_to_price(floor_price_21.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		const amm_spot_price_21 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		
		const maximum_fxb_AMM_sellable_above_floor_21 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_21_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_21 = frax_balance_21_E18.div(BIG18);
		const fxb_balance_21_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_21 = fxb_balance_21_E18.div(BIG18);
		const fxb_total_supply_21 = new BigNumber(await fxbInstance.totalSupply.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_21.toNumber());
		console.log("floor_price: ", floor_price_21.toNumber());
		console.log("Total FXB Supply: ", fxb_total_supply_21.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_21.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_21.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_21.toNumber());

		console.log("---------Advance some time---------");
		// Advance 175 days
		await time.increase((175 * 86400) + 1);
		await time.advanceBlock();

		console.log("---------Note some things---------");
		const amm_spot_price_22 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const floor_price_22 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_22 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_22 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb_22 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const frax_balance_22_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_22 = frax_balance_22_E18.div(BIG18);
		const fxb_balance_22_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_22 = fxb_balance_22_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_22.toNumber());
		console.log("floor_price: ", floor_price_22.toNumber());
		console.log("initial_discount : ", initial_discount_22.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_22.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_22.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_22.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_22.toNumber());

		console.log(chalk.bold.blue("============================EPOCH #4============================"));
		console.log("---------Advance some time---------");
		// Advance 375 days
		await time.increase((375 * 86400) + 1);
		await time.advanceBlock();

		console.log("---------Redeem remaining bonds---------");
		const redeem_amount_22 = new BigNumber(await fxbInstance.balanceOf(FRAX_UTILITY_CONTRACTOR));
		console.log("Redeeming:", redeem_amount_22.div(BIG18).toNumber(), "FXB");
		await fxbInstance.approve(bondIssuerInstance.address, redeem_amount_22, { from: FRAX_UTILITY_CONTRACTOR });
		await bondIssuerInstance.redeemFXB(redeem_amount_22, { from: FRAX_UTILITY_CONTRACTOR });

		console.log("---------Start a new epoch---------");
		await bondIssuerInstance.startNewEpoch({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------Issue some bonds---------");
		const new_issue_amount_23 = new BigNumber("500e18");
		const new_issue_price_23 = new BigNumber("810000");
		await bondIssuerInstance.setIssuableFXB(new_issue_amount_23, new_issue_price_23, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const issuable_fxb_23 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		console.log("issuable_fxb: ", issuable_fxb_23.toNumber());

		console.log("---------Note some things---------");
		const amm_spot_price_24 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issue_price_24 = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		const floor_price_24 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const initial_discount_24 = new BigNumber(await bondIssuerInstance.initial_discount.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_24 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const issuable_fxb_24 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const frax_balance_24_E18 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call());
		const frax_balance_24 = frax_balance_24_E18.div(BIG18);
		const fxb_balance_24_E18 = new BigNumber(await bondIssuerInstance.vBal_FXB.call());
		const fxb_balance_24 = fxb_balance_24_E18.div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_24.toNumber());
		console.log("floor_price: ", floor_price_24.toNumber());
		console.log("issue_price: ", issue_price_24.toNumber());
		console.log("initial_discount : ", initial_discount_24.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_24.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_24.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_24.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_24.toNumber());

		console.log("---------Buy some bonds---------");
		const buying_amount_24aa = new BigNumber("1000e18");
		console.log("Bought:", buying_amount_24aa.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_24aa, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_24aa = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_24aa, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_24aa = (new BigNumber(expected_values_CALL_24aa['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_24aa.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_24aa['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_24aa).div(fxb_out_E18_24aa)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_24aa, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_24aa = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_24aa = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_24aa = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_24aa = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_24aa = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_24aa = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_24aa.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_24aa.toNumber());
		console.log("floor_price: ", floor_price_24aa.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_24aa.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_24aa.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_24aa.toNumber());

		console.log("---------Buy some bonds---------");
		const buying_amount_24ab = new BigNumber("10000e18");
		console.log("Bought:", buying_amount_24ab.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_24ab, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_24ab = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_24ab, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_24ab = (new BigNumber(expected_values_CALL_24ab['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_24ab.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_24ab['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_24ab).div(fxb_out_E18_24ab)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_24ab, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_24ab = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_24ab = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_24ab = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_24ab = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_24ab = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_24ab = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_24ab.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_24ab.toNumber());
		console.log("floor_price: ", floor_price_24ab.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_24ab.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_24ab.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_24ab.toNumber());

		console.log("---------Buy out the remaining issue---------");
		const buying_amount_24ac = new BigNumber(await bondIssuerInstance.frax_to_buy_out_issue.call());
		console.log("Bought:", buying_amount_24ac.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_24ac, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_24ac = await bondIssuerInstance.buyUnissuedFXB.call(buying_amount_24ac, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_24ac = (new BigNumber(expected_values_CALL_24ac['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_24ac.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_24ac['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_24ac).div(fxb_out_E18_24ac)).toNumber());

		await bondIssuerInstance.buyUnissuedFXB(buying_amount_24ac, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_24ac = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_24ac = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_24ac = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_24ac = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_24ac = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_24ac = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_24ac.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_24ac.toNumber());
		console.log("floor_price: ", floor_price_24ac.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_24ac.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_24ac.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_24ac.toNumber());

		console.log("---------Issue some bonds again---------");
		const new_issue_amount_23aaaa = new BigNumber("500e18");
		const new_issue_price_23aaaa = new BigNumber("830000");
		await bondIssuerInstance.setIssuableFXB(new_issue_amount_23aaaa, new_issue_price_23aaaa, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const issuable_fxb_23aaaa = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const issue_price_23aaaa = new BigNumber(await bondIssuerInstance.issue_price.call()).div(BIG6);
		console.log("issuable_fxb: ", issuable_fxb_23aaaa.toNumber());
		console.log("issue_price: ", issue_price_23aaaa.toNumber());

		console.log("---------Do some market buys, despite the unissued bonds---------");
		let buying_amount_27 = new BigNumber("600e18");
		console.log("Bought:", buying_amount_27.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_27, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_27 = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_27, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_27 = (new BigNumber(expected_values_CALL_27['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_27.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_27['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_27).div(fxb_out_E18_27)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_27, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_27 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_27 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_27 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_27 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_27 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_27 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_27.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_27.toNumber());
		console.log("floor_price: ", floor_price_27.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_27.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_27.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_27.toNumber());

		console.log("---------Quick unissued FXB buy---------");
		let buying_amount_28 = new BigNumber("100e18");
		console.log("Bought:", buying_amount_28.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_28, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_28 = await bondIssuerInstance.buyUnissuedFXB.call(buying_amount_28, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_28 = (new BigNumber(expected_values_CALL_28['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_28.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_28['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_28).div(fxb_out_E18_28)).toNumber());

		await bondIssuerInstance.buyUnissuedFXB(buying_amount_28, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_28 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_28 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_28 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_28 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_28 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_28 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_28.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_28.toNumber());
		console.log("floor_price: ", floor_price_28.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_28.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_28.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_28.toNumber());

		console.log("---------Advance some time---------");
		// Advance 100 days
		await time.increase((100 * 86400) + 1);
		await time.advanceBlock();

		console.log("---------Drop the target liquidity---------");
		await bondIssuerInstance.setTargetLiquidity(new BigNumber("2500e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.bold.blue("============================BIG VOLUME TESTS============================"));
		console.log("---------Mega buy some bonds [vAMM]---------");
		const buying_amount_30 = new BigNumber("5000000e18");
		console.log("Bought:", buying_amount_30.div(BIG18).toNumber(), "FRAX worth of FXB");
		await frax_instance.approve(bondIssuerInstance.address, buying_amount_30, { from: FRAX_UTILITY_CONTRACTOR });
		const expected_values_CALL_30 = await bondIssuerInstance.buyFXBfromAMM.call(buying_amount_30, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const fxb_out_E18_30 = (new BigNumber(expected_values_CALL_30['fxb_out']));
		console.log("fxb_out: ", fxb_out_E18_30.div(BIG18).toNumber());
		console.log("fxb_fee_amt: ", (new BigNumber(expected_values_CALL_30['fxb_fee_amt'])).div(BIG18).toNumber());
		console.log("effective_sale_price: ", ((buying_amount_30).div(fxb_out_E18_30)).toNumber());

		await bondIssuerInstance.buyFXBfromAMM(buying_amount_30, 1, { from: FRAX_UTILITY_CONTRACTOR });

		const amm_spot_price_30 = new BigNumber(await bondIssuerInstance.amm_spot_price.call()).div(BIG6);
		const issuable_fxb_30 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		const floor_price_30 = new BigNumber(await bondIssuerInstance.floor_price.call()).div(BIG6);
		const maximum_fxb_AMM_sellable_above_floor_30 = new BigNumber(await bondIssuerInstance.maximum_fxb_AMM_sellable_above_floor.call()).div(BIG18);
		const frax_balance_30 = new BigNumber(await bondIssuerInstance.vBal_FRAX.call()).div(BIG18);
		const fxb_balance_30 = new BigNumber(await bondIssuerInstance.vBal_FXB.call()).div(BIG18);

		console.log("amm_spot_price: ", amm_spot_price_30.toNumber());
		console.log("issuable_fxb: ", issuable_fxb_30.toNumber());
		console.log("floor_price: ", floor_price_30.toNumber());
		console.log("maximum_fxb_AMM_sellable_above_floor: ", maximum_fxb_AMM_sellable_above_floor_30.toNumber());
		console.log("FRAX balance [issuer]: ", frax_balance_30.toNumber());
		console.log("FXB balance [issuer]: ", fxb_balance_30.toNumber());

		console.log("---------Try to mega buy some unissued bonds [should fail]---------");
		const buying_amount_31 = new BigNumber("5000000e18");
		await expectRevert(
			bondIssuerInstance.buyUnissuedFXB(buying_amount_31, 0, { from: FRAX_UTILITY_CONTRACTOR }),
			"Trying to buy too many unissued bonds"
		);

		console.log("---------Remove unissued bonds---------");
		await bondIssuerInstance.clearIssuableFXB({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const issuable_fxb_25 = new BigNumber(await bondIssuerInstance.issuable_fxb.call()).div(BIG18);
		console.log("issuable_fxb: ", issuable_fxb_25.toNumber());

		console.log(chalk.bold.blue("===============================FAIL TESTS==============================="));

		console.log("---------PAUSED ISSUING TEST---------");
		const issue_amt_1 = new BigNumber("1e18");
		await bondIssuerInstance.toggleIssuing({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(bondIssuerInstance.address, issue_amt_1, { from: FRAX_UTILITY_CONTRACTOR });
		await expectRevert(
			bondIssuerInstance.buyUnissuedFXB(issue_amt_1, 0, { from: FRAX_UTILITY_CONTRACTOR }),
			"Issuing is paused"
		);
		await bondIssuerInstance.toggleIssuing({ from: BOND_CONTROLLER_ADDRESS });

		console.log("---------PAUSED BUYING TEST---------");
		const buy_amt_1 = new BigNumber("1e18");
		await bondIssuerInstance.toggleBuying({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(bondIssuerInstance.address, buy_amt_1, { from: FRAX_UTILITY_CONTRACTOR });
		await expectRevert(
			bondIssuerInstance.buyFXBfromAMM(buy_amt_1, 1, { from: FRAX_UTILITY_CONTRACTOR }),
			"Buying is paused"
		);
		await bondIssuerInstance.toggleBuying({ from: BOND_CONTROLLER_ADDRESS });

		console.log("---------PAUSED SELLING TEST---------");
		const sell_amt_1 = new BigNumber("1e18");
		await bondIssuerInstance.toggleSelling({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await fxbInstance.approve(bondIssuerInstance.address, sell_amt_1, { from: FRAX_UTILITY_CONTRACTOR });
		await expectRevert(
			bondIssuerInstance.sellFXBintoAMM(sell_amt_1, 1, { from: FRAX_UTILITY_CONTRACTOR }),
			"Selling is paused"
		);
		await bondIssuerInstance.toggleSelling({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------PAUSED REDEEMING TEST---------");
		const redeem_amt_1 = new BigNumber("1e18");
		await bondIssuerInstance.toggleRedeeming({ from: BOND_CONTROLLER_ADDRESS });
		await fxbInstance.approve(bondIssuerInstance.address, redeem_amt_1, { from: FRAX_UTILITY_CONTRACTOR });
		await expectRevert(
			bondIssuerInstance.redeemFXB(redeem_amt_1, { from: FRAX_UTILITY_CONTRACTOR }),
			"Redeeming is paused"
		);
		await bondIssuerInstance.toggleRedeeming({ from: COLLATERAL_FRAX_AND_FXS_OWNER });





























		// console.log(chalk.bold.blue("===============================PASS TESTS==============================="));

		// console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");

		// console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");

		// console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");



	



		// console.log(chalk.bold.blue("===============================TEST FXB==============================="));

		// console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");

		// console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");

		// console.log("---------TRANSFER BOND #0 TO ANOTHER ADDRESS---------");






		console.log("===============================END===============================");


















		
	});
	
});