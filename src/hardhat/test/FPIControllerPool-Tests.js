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

// FPI
const FPI = artifacts.require("FPI/FPI");
const FPIS = artifacts.require("FPI/FPIS");
const FPIControllerPool = artifacts.require("FPI/FPIControllerPool.sol");

// Oracles
const CPITrackerOracle = artifacts.require("Oracle/CPITrackerOracle");

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

contract('FPIControllerPool-Tests', async (accounts) => {
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
	let ADDRESS_WITH_FPI = "0xF2c4592813B5B3F79aC522E4efb2C19a666e937c";
	let ADDRESS_WITH_ETH = "0x876EabF441B2EE5B5b0554Fd502a8E0600950cFa";

	let ADVANCEMENT_DAYS = 0.25;

	// Initialize core instances
	let frax_instance;

	// Initialize FPI instances
	let fpi_instance;
    let fpis_instance;
    let fpi_controller_pool_instance;

	// Initialize oracle instances
	let cpi_tracker_oracle_instance;

	// Initialize TWAMM instances
	let fraxswap_factory_instance;
	let twamm_pair_instance;
	let fraxswap_router_instance;

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

		// Fill FPI contract instances
		fpi_instance = await FPI.deployed();
		fpis_instance = await FPIS.deployed();
		fpi_controller_pool_instance = await FPIControllerPool.deployed();
	
		// Fill oracle instances
		cpi_tracker_oracle_instance = await CPITrackerOracle.deployed();

		// Fill TWAMM instances
		fraxswap_factory_instance = await UniV2TWAMMFactory.deployed();
		twamm_pair_instance = await UniV2TWAMMPair.deployed();
		fraxswap_router_instance = await UniV2TWAMMRouter.deployed();
	
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
	
		// console.log(chalk.yellow('========== ADD THE FPI CONTROLLER AS A FPI MINTER =========='));
		// await fpi_instance.addMinter(fpi_controller_pool_instance.address, { from: FPI_ONE_ADDRESS });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [FPI_ONE_ADDRESS]
		// });

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FPI_ZERO_ADDRESS]
		});    

		console.log(chalk.yellow('========== NOMINATE ADDRESS[1] AS THE FPIControllerPool OWNER =========='));
		await fpi_controller_pool_instance.nominateNewOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: FPI_ZERO_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [FPI_ZERO_ADDRESS]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});    

		// console.log(chalk.yellow('========== GIVE THE TWAMM PAIR SOME FRAX =========='));
		// await frax_instance.transfer(twamm_pair_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FRAX });
		
		console.log(chalk.yellow('========== GIVE THE FPI CONTROLLER SOME FRAX =========='));
		await frax_instance.transfer(fpi_controller_pool_instance.address, new BigNumber("500000e18"), { from: ADDRESS_WITH_FRAX });
		
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
			params: [ADDRESS_WITH_FPI]
		});    

		// console.log(chalk.yellow('========== GIVE THE TWAMM PAIR SOME FPI =========='));
		// await fpi_instance.transfer(twamm_pair_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FPI });
	
		console.log(chalk.yellow('========== GIVE THE FPI CONTROLLER SOME FPI =========='));
		await fpi_instance.transfer(fpi_controller_pool_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FPI });
		
		console.log(chalk.yellow('========== GIVE ADDRESS[1] SOME FPI =========='));
		await fpi_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000e18"), { from: ADDRESS_WITH_FPI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FPI]
		});

		// Accept ownerships
		await fpi_controller_pool_instance.acceptOwnership({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log(chalk.hex("#ff8b3d").bold("=================INITIALIZE================"));
		// Print some info
		const frax_price = await fpi_controller_pool_instance.getFRAXPriceE18.call();
		const fpi_price = await fpi_controller_pool_instance.getFPIPriceE18.call();
		const frax_is_token0 = await fpi_controller_pool_instance.frax_is_token0.call();
		const mint_fee = await fpi_controller_pool_instance.mint_fee.call();
		const redeem_fee = await fpi_controller_pool_instance.redeem_fee.call();
		const peg_status_pack = await fpi_controller_pool_instance.pegStatusMntRdm.call();
		const price_info_pack = await fpi_controller_pool_instance.price_info.call();
		const collat_imbalance = new BigNumber(price_info_pack[0]).div(BIG18).toNumber();
		const cpi_peg_price = new BigNumber(price_info_pack[1]).div(BIG18).toNumber();
		const num_twamm_intervals = await fpi_controller_pool_instance.num_twamm_intervals.call();
		const swap_period = await fpi_controller_pool_instance.swap_period.call();
		const reserves_pack = await twamm_pair_instance.getTwammReserves.call();
		const reserve0 = new BigNumber(reserves_pack[0]).div(BIG18).toNumber();
		const reserve1 = new BigNumber(reserves_pack[1]).div(BIG18).toNumber();
		let fpi_spot_price_reserves = (frax_is_token0 ? (reserve0 / reserve1) : (reserve1 / reserve0))
		console.log("frax_price:", new BigNumber(frax_price).div(BIG18).toNumber());
		console.log("fpi_price:", new BigNumber(fpi_price).div(BIG18).toNumber());
		console.log(`mint_fee: ${new BigNumber(mint_fee).div(BIG6).toNumber() * 100}%`);
		console.log(`redeem_fee: ${new BigNumber(redeem_fee).div(BIG6).toNumber() * 100}%`);
		console.log("peg_status_pack[0] [cpi_peg_price]:", cpi_peg_price);
		console.log("peg_status_pack[1] [diff_frac_abs]:", new BigNumber(peg_status_pack[1]).toNumber());
		console.log("peg_status_pack[2] [within_range]:", peg_status_pack[2]);
		console.log("price_info[0] [collat_imbalance]:", collat_imbalance);
		console.log("price_info[1] [cpi_peg_price]:", new BigNumber(price_info_pack[1]).div(BIG18).toNumber());
		console.log("price_info[2] [fpi_price]:", new BigNumber(price_info_pack[2]).div(BIG18).toNumber());
		console.log("price_info[3] [price_diff_frac_abs]:", new BigNumber(price_info_pack[3]).toNumber());
		console.log("num_twamm_intervals:", new BigNumber(num_twamm_intervals).toNumber());
		console.log("swap_period:", new BigNumber(swap_period).toNumber());
		console.log("reserves_pack[0] [reserve0]:", reserve0);
		console.log("reserves_pack[1] [reserve1]:", reserve1);
		console.log("reserves_pack[2] [blockTimestampLast]:", new BigNumber(reserves_pack[2]).toNumber());
		console.log("reserves_pack[3] [twammReserve0]:", new BigNumber(reserves_pack[3]).div(BIG18).toNumber());
		console.log("reserves_pack[4] [twammReserve1]:", new BigNumber(reserves_pack[4]).div(BIG18).toNumber());
		console.log("FPI spot price from reserves:", fpi_spot_price_reserves);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE 1 DAY TO INCREASE THE CPI PEG PRICE================"));
		// Advance 1 day
		// Execute virtual orders in the process
		console.log("Advance 1 days in 1 day increments, executingVirtualOrders along the way");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_ETH]
		});    
	
		for (let j = 0; j < 1; j++){
			const curr_timestamp = (await ethers.provider.getBlock("latest")).timestamp;
			await twamm_pair_instance.executeVirtualOrders(curr_timestamp, { from: ADDRESS_WITH_ETH });
			await time.increase(86400);
			await time.advanceBlock();
			console.log(`Day ${j} completed`);
		}

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_ETH]
		});


		// Print info
		const price_info_pack_post_ramp = await fpi_controller_pool_instance.price_info.call();
		const collat_imbalance_post_ramp = new BigNumber(price_info_pack_post_ramp[0]).div(BIG18).toNumber();
		console.log("price_info[0] [collat_imbalance]:", collat_imbalance_post_ramp);
		console.log("price_info[1] [cpi_peg_price]:", new BigNumber(price_info_pack_post_ramp[1]).div(BIG18).toNumber());
		console.log("price_info[2] [fpi_price]:", new BigNumber(price_info_pack_post_ramp[2]).div(BIG18).toNumber());
		console.log("price_info[3] [price_diff_frac_abs]:", new BigNumber(price_info_pack_post_ramp[3]).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMMANUAL TO SELL FPI [INTERVAL OVERRIDE]================"));
		console.log("Do the order");
		const manual_fpi_int_ovr_amt = new BigNumber("100e18");
		const manual_fpi_int_ovr_amt_dec = manual_fpi_int_ovr_amt.div(BIG18).toNumber();
		const manual_fpi_intervals = 50;
		const ttp_frax_before_manual_fpi_int_ovr = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_manual_fpi_int_ovr = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.twammManual(0, manual_fpi_int_ovr_amt, manual_fpi_intervals, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Advance some time");
		await time.increase(manual_fpi_intervals * 3600 * 0.5);
		await time.advanceBlock();

		console.log("Cancel the order")
		await fpi_controller_pool_instance.cancelCurrTWAMMOrder(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_fpi_int_ovr = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_manual_fpi_int_ovr = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_fpi_int_ovr - ttp_frax_before_manual_fpi_int_ovr);
		console.log("FPI change [remember, some is minted here]: ", ttp_fpi_after_manual_fpi_int_ovr - ttp_fpi_before_manual_fpi_int_ovr);
		expect(ttp_fpi_after_manual_fpi_int_ovr - ttp_fpi_before_manual_fpi_int_ovr).to.be.closeTo(manual_fpi_int_ovr_amt_dec * (0.5), manual_fpi_int_ovr_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMMANUAL TO SELL FRAX [INTERVAL OVERRIDE]================"));
		console.log("Do the order");
		const manual_frax_int_ovr_amt = new BigNumber("100e18");
		const manual_frax_int_ovr_amt_dec = manual_frax_int_ovr_amt.div(BIG18).toNumber();
		const manual_frax_intervals = 50;
		const ttp_frax_before_manual_frax_int_ovr = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_manual_frax_int_ovr = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.twammManual(manual_frax_int_ovr_amt, 0, manual_frax_intervals, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Advance some time");
		await time.increase(manual_frax_intervals * 3600 * 0.5);
		await time.advanceBlock();

		console.log("Cancel the order")
		await fpi_controller_pool_instance.cancelCurrTWAMMOrder(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_frax_int_ovr = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_manual_frax_int_ovr = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_frax_int_ovr - ttp_frax_before_manual_frax_int_ovr);
		console.log("FPI change: ", ttp_fpi_after_manual_frax_int_ovr - ttp_fpi_before_manual_frax_int_ovr);
		expect(ttp_frax_after_manual_frax_int_ovr - ttp_frax_before_manual_frax_int_ovr).to.be.closeTo(-1 * manual_frax_int_ovr_amt_dec * (0.5), manual_frax_int_ovr_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMMANUAL TO SELL FPI================"));
		console.log("Do the order");
		const manual_fpi_amt = new BigNumber("100e18");
		const manual_fpi_amt_dec = manual_fpi_amt.div(BIG18).toNumber();
		const ttp_frax_before_manual_fpi = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_manual_fpi = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.twammManual(0, manual_fpi_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Advance some time")
		await time.increase(ADVANCEMENT_DAYS * 86400);
		await time.advanceBlock();

		console.log("Cancel the order")
		await fpi_controller_pool_instance.cancelCurrTWAMMOrder(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_fpi = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_manual_fpi = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_fpi - ttp_frax_before_manual_fpi);
		console.log("FPI change [remember, some is minted here]: ", ttp_fpi_after_manual_fpi - ttp_fpi_before_manual_fpi);
		expect(ttp_fpi_after_manual_fpi - ttp_fpi_before_manual_fpi).to.be.closeTo(manual_fpi_amt_dec * (27 / 28), manual_fpi_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMMANUAL TO SELL FRAX================"));
		console.log("Do the order");
		const manual_frax_amt = new BigNumber("100e18");
		const manual_frax_amt_dec = manual_frax_amt.div(BIG18).toNumber();
		const ttp_frax_before_manual_frax = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_manual_frax = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.twammManual(manual_frax_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Advance some time")
		await time.increase(ADVANCEMENT_DAYS * 86400);
		await time.advanceBlock();
		
		console.log("Cancel the order")
		await fpi_controller_pool_instance.cancelCurrTWAMMOrder(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_manual_frax = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_manual_frax = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_manual_frax - ttp_frax_before_manual_frax);
		console.log("FPI change: ", ttp_fpi_after_manual_frax - ttp_fpi_before_manual_frax);
		expect(ttp_frax_after_manual_frax - ttp_frax_before_manual_frax).to.be.closeTo(-1 * manual_frax_amt_dec * (1 / 28), manual_frax_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMMANUAL TO SELL FRAX [AGAIN]================"));
		console.log("Do the order");
		const manual_frax_collect_amt = new BigNumber("100e18");
		const manual_frax_collect_amt_dec = manual_frax_collect_amt.div(BIG18).toNumber();
		const frax_before_collect = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const fpi_before_collect = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.twammManual(manual_frax_collect_amt, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("Advance some time")
		await time.increase(ADVANCEMENT_DAYS * 86400);
		await time.advanceBlock();

		console.log("Collect the order, NOT cancelling it")
		await fpi_controller_pool_instance.collectCurrTWAMMProceeds(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_after_collect = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const fpi_after_collect = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", frax_after_collect - frax_before_collect);
		console.log("FPI change: ", fpi_after_collect - fpi_before_collect);
		expect(frax_after_collect - frax_before_collect).to.be.closeTo(-1 * manual_frax_collect_amt_dec, manual_frax_collect_amt_dec * .01);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE TO END OF TWAMM================"));
		// Advance 7 days so the TWAMM order is done
		await time.increase(7 * 86400);
		await time.advanceBlock();

		// Final collect
		console.log("Final collect (should cancel too)");
		const pending_twamm_order_before_withdraw = await fpi_controller_pool_instance.pending_twamm_order.call();
		assert(pending_twamm_order_before_withdraw, 'Should have a pending order');
		const frax_before_withdraw = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const fpi_before_withdraw = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.collectCurrTWAMMProceeds(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const pending_twamm_order_after_withdraw = await fpi_controller_pool_instance.pending_twamm_order.call();
		assert(!pending_twamm_order_after_withdraw, 'Should not have a pending order');
		const frax_after_withdraw = new BigNumber(await frax_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const fpi_after_withdraw = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", frax_after_withdraw - frax_before_withdraw);
		console.log("FPI change: ", fpi_after_withdraw - fpi_before_withdraw);
		expect(frax_after_withdraw - frax_before_withdraw).to.be.closeTo(0, manual_frax_collect_amt_dec * .01);

		
		// console.log(chalk.hex("#ff8b3d").bold("=================MINT FPI [CPI-DELTA BASED FEE]================"));
		// const mint_amt_delta = new BigNumber("100e18");
		
		// // Approve FRAX
		// await frax_instance.approve(fpi_controller_pool_instance.address, mint_amt_delta, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// // Mint FPI
		// const mint_frax_before_delta = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// const mint_fpi_before_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// const mint_fee_delta = new BigNumber(await fpi_controller_pool_instance.mint_fee.call()).div(BIG6).toNumber();
		// await fpi_controller_pool_instance.mintFPI(mint_amt_delta, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// const mint_frax_after_delta = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// const mint_fpi_after_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// console.log("FRAX change: ", mint_frax_after_delta - mint_frax_before_delta);
		// console.log("FPI change: ", mint_fpi_after_delta - mint_fpi_before_delta);
		// console.log(`Mint fee: ${mint_fee_delta * 100}%`);


		// console.log(chalk.hex("#ff8b3d").bold("=================REDEEM FPI [CPI-DELTA BASED FEE]================"));
		// const redeem_amt_delta = new BigNumber("100e18");
		
		// // Approve FRAX
		// await fpi_instance.approve(fpi_controller_pool_instance.address, redeem_amt_delta, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Redeem FPI
		// const redeem_frax_before_delta = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// const redeem_fpi_before_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// const redeem_fee_delta = new BigNumber(await fpi_controller_pool_instance.redeem_fee.call()).div(BIG6).toNumber();
		// await fpi_controller_pool_instance.redeemFPI(redeem_amt_delta, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// const redeem_frax_after_delta = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// const redeem_fpi_after_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		// console.log("FRAX change: ", redeem_frax_after_delta - redeem_frax_before_delta);
		// console.log("FPI change: ", redeem_fpi_after_delta - redeem_fpi_before_delta);
		// console.log(`Redeem fee: ${redeem_fee_delta * 100}%`);


		console.log(chalk.hex("#ff8b3d").bold("=================TURN ON MANUAL FEES================"));
		await fpi_controller_pool_instance.setMintRedeemFees(
			true,
			3000,
			1000000,
			true,
			3000,
			1000000	
		, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.hex("#ff8b3d").bold("=================MINT FPI [MANUAL FEE]================"));
		const mint_amt_manual = new BigNumber("100e18");
		
		// Approve FRAX
		await frax_instance.approve(fpi_controller_pool_instance.address, mint_amt_manual, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Mint FPI
		const mint_frax_before_manual = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fpi_before_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fee_manual = new BigNumber(await fpi_controller_pool_instance.mint_fee.call()).div(BIG6).toNumber();
		await fpi_controller_pool_instance.mintFPI(mint_amt_manual, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const mint_frax_after_manual = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fpi_after_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", mint_frax_after_manual - mint_frax_before_manual);
		console.log("FPI change: ", mint_fpi_after_manual - mint_fpi_before_manual);
		console.log(`Mint fee: ${mint_fee_manual * 100}%`);


		console.log(chalk.hex("#ff8b3d").bold("=================REDEEM FPI [MANUAL FEE]================"));
		const redeem_amt = new BigNumber("100e18");
		
		// Approve FRAX
		await fpi_instance.approve(fpi_controller_pool_instance.address, redeem_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem FPI
		const redeem_frax_before_manual = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fpi_before_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fee_manual = new BigNumber(await fpi_controller_pool_instance.redeem_fee.call()).div(BIG6).toNumber();
		await fpi_controller_pool_instance.redeemFPI(redeem_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const redeem_frax_after_manual = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fpi_after_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", redeem_frax_after_manual - redeem_frax_before_manual);
		console.log("FPI change: ", redeem_fpi_after_manual - redeem_fpi_before_manual);
		console.log(`Redeem fee: ${redeem_fee_manual * 100}%`);


		console.log(chalk.hex("#ff8b3d").bold("=================TURN OFF MANUAL FEES================"));
		await fpi_controller_pool_instance.setMintRedeemFees(
			false,
			3000,
			1000000,
			false,
			3000,
			1000000	
		, { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.hex("#ff8b3d").bold("=================AMM SWAP FPI TO FRAX================"));
		// Approve FPI
		await fpi_instance.approve(fraxswap_router_instance.address, BIG18, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		// Do the swap
		const amm_frax_before_0_to_1 = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_before_0_to_1 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await fraxswap_router_instance.swapExactTokensForTokens(BIG18, 0, [fpi_instance.address, frax_instance.address], COLLATERAL_FRAX_AND_FXS_OWNER, 1947242944, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const amm_frax_after_0_to_1 = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_after_0_to_1 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", amm_frax_after_0_to_1 - amm_frax_before_0_to_1);
		console.log("FPI change: ", amm_fpi_after_0_to_1 - amm_fpi_before_0_to_1);

		
		console.log(chalk.hex("#ff8b3d").bold("=================AMM SWAP FRAX TO FPI================"));
		// Approve FRAX
		await frax_instance.approve(fraxswap_router_instance.address, BIG18, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		// Do the swap
		const amm_frax_before_1_to_0 = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_before_1_to_0 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await fraxswap_router_instance.swapExactTokensForTokens(BIG18, 0, [frax_instance.address, fpi_instance.address], COLLATERAL_FRAX_AND_FXS_OWNER, 1947242944, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const amm_frax_after_1_to_0 = new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_after_1_to_0 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", amm_frax_after_1_to_0 - amm_frax_before_1_to_0);
		console.log("FPI change: ", amm_fpi_after_1_to_0 - amm_fpi_before_1_to_0);
	});

	it("AMO Fail Tests", async () => {
		const lend_amount_small = new BigNumber ("1e18");

		console.log(chalk.blue("==================TEST AMO FAILS=================="));

		console.log("---------TRY TO LEND TO A NON-AMO---------");
		await expectRevert(
			fpi_controller_pool_instance.giveFRAXToAMO(STAKING_REWARDS_DISTRIBUTOR, lend_amount_small, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid AMO"
		);

		console.log(chalk.yellow("ADD GOVERNOR_GUARDIAN_ADDRESS AS AN AMO"));
		fpi_controller_pool_instance.addAMO(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),

		console.log("---------TRY TO LEND TO A NON-AMO---------");
		await expectRevert(
			fpi_controller_pool_instance.giveFRAXToAMO(STAKING_REWARDS_DISTRIBUTOR, lend_amount_small, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid AMO"
		);

		console.log("---------TRY TO LEND PAST THE BORROW CAP---------");
		// Lower the borrow cap
		await fpi_controller_pool_instance.setFraxBorrowCap(new BigNumber("1e17"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Try to borrow past the borrow cap
		await expectRevert(
			fpi_controller_pool_instance.giveFRAXToAMO(GOVERNOR_GUARDIAN_ADDRESS, lend_amount_small, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Borrow cap"
		);

		// Return the borrow cap to before
		await fpi_controller_pool_instance.setFraxBorrowCap(new BigNumber("10000000e18"),{ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY TO LEND WHILE NOT BEING GOVERNANCE---------");
		await expectRevert(
			fpi_controller_pool_instance.giveFRAXToAMO(GOVERNOR_GUARDIAN_ADDRESS, lend_amount_small, { from: STAKING_REWARDS_DISTRIBUTOR }),
			"Not owner or timelock"
		);

		console.log("---------TRY TO GIVE BACK FRAX AS A NON-AMO---------");
		// Approve FRAX
		await frax_instance.approve(fpi_controller_pool_instance.address, lend_amount_small, { from: STAKING_REWARDS_DISTRIBUTOR }); 

		await expectRevert(
			fpi_controller_pool_instance.receiveFRAXFromAMO(lend_amount_small, { from: STAKING_REWARDS_DISTRIBUTOR }),
			"Invalid AMO"
		);

		console.log(chalk.yellow("REMOVE GOVERNOR_GUARDIAN_ADDRESS AS AN AMO"));
		fpi_controller_pool_instance.removeAMO(GOVERNOR_GUARDIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY TO LEND TO A NOW-REMOVED AMO---------");
		await expectRevert(
			fpi_controller_pool_instance.giveFRAXToAMO(GOVERNOR_GUARDIAN_ADDRESS, lend_amount_small, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Invalid AMO"
		);
	});

	it("Mint Fail Tests", async () => {
		const test_amount_small = new BigNumber ("1e18");
		const test_amount_huge = new BigNumber ("1000e18");

		console.log(chalk.blue("==================TEST MINT FAILS=================="));
		console.log("---------TRY TO MINT WHILE PAUSED---------");
		// Pause mints
		await fpi_controller_pool_instance.toggleMints({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Try to mint while paused
		await expectRevert(
			fpi_controller_pool_instance.mintFPI(test_amount_huge, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Mints paused"
		);

		// Unpause mints
		await fpi_controller_pool_instance.toggleMints({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("---------TRY TO MINT ABOVE THE MINT CAP---------");
		// Approve FPI
		await fpi_instance.approve(fpi_controller_pool_instance.address, test_amount_huge, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		// Lower the mint cap
		await fpi_controller_pool_instance.setMintCap(test_amount_small, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		// Try to mint (should fail)
		await expectRevert(
			fpi_controller_pool_instance.mintFPI(test_amount_huge, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"FPI mint cap"
		);

		// Return the mint cap
		await fpi_controller_pool_instance.setMintCap(new BigNumber("101000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		console.log("---------TRY TO MINT OUTSIDE OF THE BAND---------");
		// Set low peg bands
		await fpi_controller_pool_instance.setPegBands(
			new BigNumber("100"), 
			new BigNumber("100"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Try to mint outside the band
		await expectRevert(
			fpi_controller_pool_instance.mintFPI(test_amount_huge, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Peg band [Mint]"
		);

		// Re-set the normal peg bands
		await fpi_controller_pool_instance.setPegBands(
			new BigNumber("50000"), 
			new BigNumber("100000"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("---------TRY TO MINT WITH NO SLIPPAGE---------");
		// Try to mint with no slippage
		await expectRevert(
			fpi_controller_pool_instance.mintFPI(test_amount_huge, test_amount_huge, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Slippage [Mint]"
		);
	});

	it("Redeem Fail Tests", async () => {
		const test_amount_small = new BigNumber ("1e18");
		const test_amount_huge = new BigNumber ("1000e18");
		const price_info_pack = await fpi_controller_pool_instance.price_info.call();
		const collat_imbalance = new BigNumber(price_info_pack[0]).div(BIG18).toNumber();
		const cpi_peg_price = new BigNumber(price_info_pack[1]).div(BIG18).toNumber();

		console.log(chalk.blue("==================TEST REDEEM FAILS=================="));
		console.log("---------TRY TO REDEEM WHILE PAUSED---------");
		// Pause redeems
		await fpi_controller_pool_instance.toggleRedeems({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Try to redeem while paused
		await expectRevert(
			fpi_controller_pool_instance.redeemFPI(test_amount_huge, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Redeems paused"
		);

		// Unpause redeems
		await fpi_controller_pool_instance.toggleRedeems({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Approve FRAX
		await frax_instance.approve(fpi_controller_pool_instance.address, test_amount_huge, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		console.log("---------TRY TO REDEEM OUTSIDE OF THE BAND---------");
		// Set low peg bands
		await fpi_controller_pool_instance.setPegBands(
			new BigNumber("100"), 
			new BigNumber("100"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Try to redeem outside the band
		await expectRevert(
			fpi_controller_pool_instance.redeemFPI(test_amount_huge, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Peg band [Redeem]"
		);

		// Re-set the normal peg bands
		await fpi_controller_pool_instance.setPegBands(
			new BigNumber("50000"), 
			new BigNumber("100000"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("---------TRY TO REDEEM WITH NO SLIPPAGE---------");
		// Try to redeem with no slippage
		await expectRevert(
			fpi_controller_pool_instance.redeemFPI(test_amount_huge, test_amount_huge.multipliedBy(100), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Slippage [Redeem]"
		);
	});

	it("TWAMM Fail Tests", async () => {
		const test_amount_small = new BigNumber ("1e18");
		const test_amount_huge = new BigNumber ("1000e18");

		console.log(chalk.blue("==================TEST TWAMMMANUAL SWAP FAILS=================="));
		console.log("---------TRY TO TWAMM SWAP MORE THAN THE MAX SWAP---------");
		// Set low max swaps
		await fpi_controller_pool_instance.setTWAMMMaxSwapIn(
			new BigNumber("1e18"), 
			new BigNumber("1e18"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Determine the route to take
		const price_info_pack_max_swap = await fpi_controller_pool_instance.price_info.call();
		const collat_imbalance_max_swap = new BigNumber(price_info_pack_max_swap[0]).div(BIG18).toNumber();
		if (collat_imbalance_max_swap > 0) {
			await expectRevert(
				fpi_controller_pool_instance.twammManual(0, new BigNumber("10e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
				"Too much FPI sold"
			);
		}
		else {
			await expectRevert(
				fpi_controller_pool_instance.twammManual(new BigNumber("10e18"), 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
				"Too much FRAX sold"
			);
		}

		// Re-set the normal swaps
		await fpi_controller_pool_instance.setTWAMMMaxSwapIn(
			new BigNumber("10000000e18"), 
			new BigNumber("10000000e18"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("---------TRY TO TWAMM SWAP OUTSIDE OF THE BAND---------");
		// Set low peg bands
		await fpi_controller_pool_instance.setPegBands(
			new BigNumber("100"), 
			new BigNumber("100"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		// Determine the route to take
			await expectRevert(
				fpi_controller_pool_instance.twammManual(new BigNumber("10e18"), 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
				"Peg band [TWAMM]"
			);

		// Re-set the normal peg bands
		await fpi_controller_pool_instance.setPegBands(
			new BigNumber("50000"), 
			new BigNumber("100000"), 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
	});

});