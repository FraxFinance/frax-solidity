const path = require('path');
const envPath = path.join(__dirname, '../../../.env');
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

// Core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Misc AMOs
const TWAMM_AMO = artifacts.require("Misc_AMOs/TWAMM_AMO");

// TWAMM
const UniV2TWAMMFactory = artifacts.require("Fraxswap/core/FraxswapFactory");
const UniV2TWAMMPair = artifacts.require("Fraxswap/core/FraxswapPair");
const UniV2TWAMMRouter = artifacts.require("Fraxswap/periphery/FraxswapRouter");


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

contract('TWAMM_AMO-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Account addresses
	let ORIGINAL_ETHEREUM_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADMIN;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	let CROSS_CHAIN_CUSTODIAN_ADDRESS;
	let AMO_CUSTODIAN_ADDRESS;

	// Useful addresses
	let COMPTROLLER_ADDRESS = CONTRACT_ADDRESSES.ethereum.multisigs["Comptrollers"];
	let FPI_ZERO_ADDRESS = "0x26Ce2091749059a66703CD4B998156d94eC393ef";
	let FPI_ONE_ADDRESS = "0xF2c4592813B5B3F79aC522E4efb2C19a666e937c";
	let ADDRESS_WITH_FRAX = "0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE";
	let ADDRESS_WITH_FXS = "0xf977814e90da44bfa03b6295a0616a897441acec";
	let ADDRESS_WITH_ETH = "0x876EabF441B2EE5B5b0554Fd502a8E0600950cFa";

	let ADVANCEMENT_DAYS = 0.25;

	// Initialize core instances
	let frax_instance;
	let fxs_instance;

	// Initialize FPI instances
    let twamm_amo_instance;

	// Initialize msig address
	let msig_address;

	// Initialize TWAMM instances
	let fraxswap_factory_instance;
	let twamm_pair_address
	let twamm_pair_instance;
	let fraxswap_router_instance;

	// Initialize yield distributor address
	let yield_distributor_address;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.ETHEREUM_ONE_ADDRESS]}
		);

		// Constants
		ORIGINAL_ETHEREUM_ONE_ADDRESS = process.env.ETHEREUM_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADMIN = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		CROSS_CHAIN_CUSTODIAN_ADDRESS = accounts[9]; 
		AMO_CUSTODIAN_ADDRESS = accounts[10]; 

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();

		// Fill Misc AMO contract instances
		twamm_amo_instance = await TWAMM_AMO.deployed();
	
		// Fill msig address
		msig_address = await twamm_amo_instance.msig_address.call();

		// Fill TWAMM instances and pair info
		fraxswap_factory_instance = await UniV2TWAMMFactory.deployed();
		twamm_pair_address = await twamm_amo_instance.fraxswap_pair.call();
		twamm_pair_instance = await UniV2TWAMMPair.at(twamm_pair_address);
		fraxswap_router_instance = await UniV2TWAMMRouter.deployed();

		// Fill msig address
		yield_distributor_address = await twamm_amo_instance.yield_distributor.call();
	
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.ETHEREUM_ONE_ADDRESS]}
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
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [FPI_ONE_ADDRESS]
		// });    
	
		// console.log(chalk.yellow('========== ADD THE TWAMM AMO AS A FPI MINTER =========='));
		// await fxs_instance.addMinter(twamm_amo_instance.address, { from: FPI_ONE_ADDRESS });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [FPI_ONE_ADDRESS]
		// });

		// ====================================================
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [FPI_ZERO_ADDRESS]
		// });    

		// console.log(chalk.yellow('========== NOMINATE ADDRESS[1] AS THE FPIControllerPool OWNER =========='));
		// await twamm_amo_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: FPI_ZERO_ADDRESS });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [FPI_ZERO_ADDRESS]
		// });

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});    
		
		console.log(chalk.yellow('========== GIVE THE TWAMM AMO SOME FRAX =========='));
		await frax_instance.transfer(twamm_amo_instance.address, new BigNumber("500000e18"), { from: ADDRESS_WITH_FRAX });
		
		console.log(chalk.yellow('========== GIVE ADDRESS[1] SOME FRAX =========='));
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000e18"), { from: ADDRESS_WITH_FRAX });

		console.log(chalk.yellow('========== GIVE STAKING_REWARDS_DISTRIBUTOR SOME FRAX (FOR TESTING LATER) =========='));
		await frax_instance.transfer(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("100e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});    

		console.log(chalk.yellow('========== GIVE THE TWAMM AMO SOME FXS =========='));
		await fxs_instance.transfer(twamm_amo_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });
		
		console.log(chalk.yellow('========== GIVE ADDRESS[1] SOME FXS =========='));
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// // Accept ownerships
		// await twamm_amo_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log(chalk.hex("#ff8b3d").bold("=================INITIALIZE================"));
		// Print some info
		const frax_price = await twamm_amo_instance.getFRAXPriceE18.call();
		const fxs_price = await twamm_amo_instance.getFXSPriceE18.call();
		const frax_is_token0 = await twamm_amo_instance.frax_is_token0.call();
		const num_twamm_intervals = await twamm_amo_instance.num_twamm_intervals.call();
		const swap_period = await twamm_amo_instance.swap_period.call();
		const reserves_pack = await twamm_pair_instance.getTwammReserves.call();
		const reserve0 = new BigNumber(reserves_pack[0]).div(BIG18).toNumber();
		const reserve1 = new BigNumber(reserves_pack[1]).div(BIG18).toNumber();
		console.log("frax_price:", new BigNumber(frax_price).div(BIG18).toNumber());
		console.log("fxs_price:", new BigNumber(fxs_price).div(BIG18).toNumber());
		console.log("num_twamm_intervals:", new BigNumber(num_twamm_intervals).toNumber());
		console.log("swap_period:", new BigNumber(swap_period).toNumber());
		console.log("reserves_pack[0] [reserve0]:", reserve0);
		console.log("reserves_pack[1] [reserve1]:", reserve1);
		console.log("reserves_pack[2] [blockTimestampLast]:", new BigNumber(reserves_pack[2]).toNumber());
		console.log("reserves_pack[3] [twammReserve0]:", new BigNumber(reserves_pack[3]).div(BIG18).toNumber());
		console.log("reserves_pack[4] [twammReserve1]:", new BigNumber(reserves_pack[4]).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMSWAP TO SELL FXS [INTERVAL OVERRIDE]================"));
		console.log("Do the order");
		const manual_fxs_int_ovr_amt = new BigNumber("100e18");
		const manual_fxs_int_ovr_amt_dec = manual_fxs_int_ovr_amt.div(BIG18).toNumber();
		const manual_fxs_intervals = 50;
		const ttp_frax_before_manual_fxs_int_ovr = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_before_manual_fxs_int_ovr = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const manual_fxs_int_ovr_order_id = utilities.parseTwammAMOSwapLog(await twamm_amo_instance.twammSwap(0, manual_fxs_int_ovr_amt, manual_fxs_intervals, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("Advance some time");
		await time.increase(manual_fxs_intervals * 3600 * 0.5);
		await time.advanceBlock();

		console.log("Cancel the order")
		await twamm_amo_instance.cancelTWAMMOrder(manual_fxs_int_ovr_order_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_fxs_int_ovr = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_after_manual_fxs_int_ovr = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_fxs_int_ovr - ttp_frax_before_manual_fxs_int_ovr);
		console.log("FXS change: ", ttp_fxs_after_manual_fxs_int_ovr - ttp_fxs_before_manual_fxs_int_ovr);
		expect(ttp_fxs_after_manual_fxs_int_ovr - ttp_fxs_before_manual_fxs_int_ovr).to.be.closeTo(-1 * manual_fxs_int_ovr_amt_dec * (0.5), manual_fxs_int_ovr_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMSWAP TO SELL FRAX [INTERVAL OVERRIDE]================"));
		console.log("Do the order");
		const manual_frax_int_ovr_amt = new BigNumber("100e18");
		const manual_frax_int_ovr_amt_dec = manual_frax_int_ovr_amt.div(BIG18).toNumber();
		const manual_frax_intervals = 50;
		const ttp_frax_before_manual_frax_int_ovr = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_before_manual_frax_int_ovr = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const manual_frax_int_ovr_order_id = utilities.parseTwammAMOSwapLog(await twamm_amo_instance.twammSwap(manual_frax_int_ovr_amt, 0, manual_frax_intervals, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		
		console.log("Advance some time");
		await time.increase(manual_frax_intervals * 3600 * 0.5);
		await time.advanceBlock();

		console.log("Cancel the order")
		await twamm_amo_instance.cancelTWAMMOrder(manual_frax_int_ovr_order_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_frax_int_ovr = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_after_manual_frax_int_ovr = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_frax_int_ovr - ttp_frax_before_manual_frax_int_ovr);
		console.log("FXS change: ", ttp_fxs_after_manual_frax_int_ovr - ttp_fxs_before_manual_frax_int_ovr);
		expect(ttp_frax_after_manual_frax_int_ovr - ttp_frax_before_manual_frax_int_ovr).to.be.closeTo(-1 * manual_frax_int_ovr_amt_dec * (0.5), manual_frax_int_ovr_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMSWAP TO SELL FXS================"));
		console.log("Do the order");
		const manual_fxs_amt = new BigNumber("100e18");
		const manual_fxs_amt_dec = manual_fxs_amt.div(BIG18).toNumber();
		const ttp_frax_before_manual_fxs = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_before_manual_fxs = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const manual_fxs_order_id = utilities.parseTwammAMOSwapLog(await twamm_amo_instance.twammSwap(0, manual_fxs_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		
		console.log("Advance some time")
		await time.increase(ADVANCEMENT_DAYS * 86400);
		await time.advanceBlock();

		console.log("Cancel the order")
		await twamm_amo_instance.cancelTWAMMOrder(manual_fxs_order_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_fxs = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_after_manual_fxs = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_fxs - ttp_frax_before_manual_fxs);
		console.log("FXS change: ", ttp_fxs_after_manual_fxs - ttp_fxs_before_manual_fxs);
		expect(ttp_fxs_after_manual_fxs - ttp_fxs_before_manual_fxs).to.be.closeTo(-1 * manual_fxs_amt_dec * (1 / 28), manual_fxs_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMSWAP TO SELL FRAX================"));
		console.log("Do the order");
		const manual_frax_amt = new BigNumber("100e18");
		const manual_frax_amt_dec = manual_frax_amt.div(BIG18).toNumber();
		const ttp_frax_before_manual_frax = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_before_manual_frax = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const manual_frax_order_id = utilities.parseTwammAMOSwapLog(await twamm_amo_instance.twammSwap(manual_frax_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		
		console.log("Advance some time")
		await time.increase(ADVANCEMENT_DAYS * 86400);
		await time.advanceBlock();
		
		console.log("Cancel the order")
		await twamm_amo_instance.cancelTWAMMOrder(manual_frax_order_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_frax = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const ttp_fxs_after_manual_frax = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_frax - ttp_frax_before_manual_frax);
		console.log("FXS change: ", ttp_fxs_after_manual_frax - ttp_fxs_before_manual_frax);
		expect(ttp_frax_after_manual_frax - ttp_frax_before_manual_frax).to.be.closeTo(-1 * manual_frax_amt_dec * (1 / 28), manual_frax_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMSWAP TO SELL FRAX [AGAIN]================"));
		console.log("Do the order");
		const manual_frax_collect_amt = new BigNumber("100e18");
		const manual_frax_collect_amt_dec = manual_frax_collect_amt.div(BIG18).toNumber();
		const frax_before_collect = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const fxs_before_collect = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const manual_frax_collect_order_id = utilities.parseTwammAMOSwapLog(await twamm_amo_instance.twammSwap(manual_frax_collect_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		
		console.log("Advance some time")
		await time.increase(ADVANCEMENT_DAYS * 86400);
		await time.advanceBlock();

		console.log("Collect the order, NOT cancelling it")
		await twamm_amo_instance.collectCurrTWAMMProceeds(manual_frax_collect_order_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_after_collect = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const fxs_after_collect = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", frax_after_collect - frax_before_collect);
		console.log("FXS change: ", fxs_after_collect - fxs_before_collect);
		expect(frax_after_collect - frax_before_collect).to.be.closeTo(-1 * manual_frax_collect_amt_dec, manual_frax_collect_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE TO END OF TWAMM================"));
		// Advance 7 days so the TWAMM order is done
		await time.increase(7 * 86400);
		await time.advanceBlock();

		// Final collect
		console.log("Final collect (should cancel too)");
		const frax_before_withdraw = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const fxs_before_withdraw = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		await twamm_amo_instance.collectCurrTWAMMProceeds(manual_frax_collect_order_id, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_after_withdraw = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const fxs_after_withdraw = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", frax_after_withdraw - frax_before_withdraw);
		console.log("FXS change: ", fxs_after_withdraw - fxs_before_withdraw);
		expect(frax_after_withdraw - frax_before_withdraw).to.be.closeTo(0, manual_frax_collect_amt_dec * .01);



		console.log(chalk.hex("#ff8b3d").bold("=================BURNANDORGIVE FRAX================"));
		// Set amounts
		const burn_amt = new BigNumber("5e18");
		const burn_amt_dec = burn_amt.div(BIG18).toNumber();
		const give_amt_yield_dist = new BigNumber("25e17");
		const give_amt_yield_dist_dec = give_amt_yield_dist.div(BIG18).toNumber();
		const give_amt_msig = new BigNumber("1e18");
		const give_amt_msig_dec = give_amt_msig.div(BIG18).toNumber();

		// Collect info and burnAndOrGive
		console.log("Collect info and burnAndOrGive");
		const frax_before_baog_amo = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const frax_before_baog_yld_dist = new BigNumber(await frax_instance.balanceOf(yield_distributor_address)).div(BIG18).toNumber();
		const frax_before_baog_msig = new BigNumber(await frax_instance.balanceOf(msig_address)).div(BIG18).toNumber();
		await twamm_amo_instance.burnAndOrGive(0, burn_amt, give_amt_yield_dist, give_amt_msig, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_after_baog_amo = new BigNumber(await frax_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const frax_after_baog_yld_dist = new BigNumber(await frax_instance.balanceOf(yield_distributor_address)).div(BIG18).toNumber();
		const frax_after_baog_msig = new BigNumber(await frax_instance.balanceOf(msig_address)).div(BIG18).toNumber();
		console.log("FRAX change [TWAMM_AMO]: ", frax_after_baog_amo - frax_before_baog_amo);
		console.log("FRAX change [Yield Distributor]: ", frax_after_baog_yld_dist - frax_before_baog_yld_dist);
		console.log("FRAX change [Multisig]: ", frax_after_baog_msig - frax_before_baog_msig);
		expect(frax_after_baog_amo - frax_before_baog_amo).to.equal(-1 * (burn_amt_dec + give_amt_msig_dec + (give_amt_yield_dist_dec * 0)));
		expect(frax_after_baog_yld_dist - frax_before_baog_yld_dist).to.equal(0); // FRAX is never given to yield distributor
		expect(frax_after_baog_msig - frax_before_baog_msig).to.equal(give_amt_msig_dec);


		console.log(chalk.hex("#ff8b3d").bold("=================BURNANDORGIVE FXS================"));
		// Collect info and burnAndOrGive
		console.log("Collect info and burnAndOrGive");
		const fxs_before_baog_amo = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const fxs_before_baog_yld_dist = new BigNumber(await fxs_instance.balanceOf(yield_distributor_address)).div(BIG18).toNumber();
		const fxs_before_baog_msig = new BigNumber(await fxs_instance.balanceOf(msig_address)).div(BIG18).toNumber();
		await twamm_amo_instance.burnAndOrGive(1, burn_amt, give_amt_yield_dist, give_amt_msig, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const fxs_after_baog_amo = new BigNumber(await fxs_instance.balanceOf(twamm_amo_instance.address)).div(BIG18).toNumber();
		const fxs_after_baog_yld_dist = new BigNumber(await fxs_instance.balanceOf(yield_distributor_address)).div(BIG18).toNumber();
		const fxs_after_baog_msig = new BigNumber(await fxs_instance.balanceOf(msig_address)).div(BIG18).toNumber();
		console.log("FXS change [TWAMM_AMO]: ", fxs_after_baog_amo - fxs_before_baog_amo);
		console.log("FXS change [Yield Distributor]: ", fxs_after_baog_yld_dist - fxs_before_baog_yld_dist);
		console.log("FXS change [Multisig]: ", fxs_after_baog_msig - fxs_before_baog_msig);
		expect(fxs_after_baog_amo - fxs_before_baog_amo).to.equal(-1 * (burn_amt_dec + give_amt_msig_dec + (give_amt_yield_dist_dec * 1)));
		expect(fxs_after_baog_yld_dist - fxs_before_baog_yld_dist).to.equal(give_amt_yield_dist_dec);
		expect(fxs_after_baog_msig - fxs_before_baog_msig).to.equal(give_amt_msig_dec);
	});

	it("AMO Fail Tests", async () => {
		const lend_amount_small = new BigNumber ("1e18");

		console.log(chalk.blue("==================TEST AMO FAILS=================="));

		console.log("---------TRY TO burnAndOrGive FRAX AS A NON-OWNER---------");
		// Approve FRAX
		await frax_instance.approve(twamm_amo_instance.address, lend_amount_small, { from: STAKING_REWARDS_DISTRIBUTOR }); 

		await expectRevert(
			twamm_amo_instance.burnAndOrGive(0, lend_amount_small, 0, 0, { from: STAKING_REWARDS_DISTRIBUTOR }),
			"Not owner or timelock"
		);
	});

	it("TWAMM Fail Tests", async () => {
		const test_amount_small = new BigNumber ("1e18");
		const test_amount_huge = new BigNumber ("1000e18");

		console.log(chalk.blue("==================TEST TWAMMSWAP SWAP FAILS=================="));
		console.log("---------TRY TO TWAMM SWAP MORE THAN THE MAX SWAP---------");
		// Set low max swaps
		await twamm_amo_instance.setTWAMMMaxSwapIn(
			new BigNumber("1e18"), 
			new BigNumber("1e18"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("---FRAX---");
		await expectRevert(
			twamm_amo_instance.twammSwap(new BigNumber("10e18"), 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Too much FRAX sold"
		);

		console.log("---FXS---");
		await expectRevert(
			twamm_amo_instance.twammSwap(0, new BigNumber("10e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Too much FXS sold"
		);

		// Re-set the normal swaps
		await twamm_amo_instance.setTWAMMMaxSwapIn(
			new BigNumber("10000000e18"), 
			new BigNumber("10000000e18"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
	});

});