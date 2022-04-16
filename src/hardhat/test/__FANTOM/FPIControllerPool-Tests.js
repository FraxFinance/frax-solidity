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

// FPI
const FPI = artifacts.require("FPI/FPI");
const FPIS = artifacts.require("FPI/FPIS");
const FPIControllerPool = artifacts.require("FPI/FPIControllerPool.sol");

// Collateral
const IAnyswapV4ERC20 = artifacts.require("ERC20/__CROSSCHAIN/IAnyswapV4ERC20");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Bridges
const CrossChainBridgeBacker_FTM_AnySwap = artifacts.require("Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap");

// Oracles
const CPITrackerOracle = artifacts.require("Oracle/CPITrackerOracle");
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking
const FraxCrossChainFarm_FRAX_FXS_Spirit = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit");

// TWAMM
const UniV2TWAMMFactory = artifacts.require("Uniswap_V2_TWAMM/core/UniV2TWAMMFactory");
const UniV2TWAMMPair = artifacts.require("Uniswap_V2_TWAMM/core/UniV2TWAMMPair");
const UniV2TWAMMRouter = artifacts.require("Uniswap_V2_TWAMM/periphery/UniV2TWAMMRouter");

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

contract('FPIControllerPool-Tests', async (accounts) => {
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
	let ADDRESS_WITH_FRAX = "0x5180db0237291A6449DdA9ed33aD90a38787621c";
	let ADDRESS_WITH_FPI = "0x5B5BeBc47c9C97D209fa8B6858B2b6d83F51F423";

	// Initialize core instances
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize FPI instances
	let fpi_instance;
    let fpis_instance;
    let fpi_controller_pool_instance;

	// Initialize oracle instances
	let cpi_tracker_oracle_instance;

	// Initialize TWAMM instances
	let twamm_factory_instance;
	let twamm_pair_instance;
	let twamm_router_instance;

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
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Fill FPI contract instances
		fpi_instance = await FPI.deployed();
		fpis_instance = await FPIS.deployed();
		fpi_controller_pool_instance = await FPIControllerPool.deployed();
	
		// Fill oracle instances
		cpi_tracker_oracle_instance = await CPITrackerOracle.deployed();

		// Fill TWAMM instances
		twamm_factory_instance = await UniV2TWAMMFactory.deployed();
		twamm_pair_instance = await UniV2TWAMMPair.deployed();
		twamm_router_instance = await UniV2TWAMMRouter.deployed();
	
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
			params: [ORIGINAL_FANTOM_ONE_ADDRESS]
		});    
	
		console.log(chalk.yellow('========== ADD THE FPI CONTROLLER AS A FPI MINTER =========='));
		await fpi_instance.addMinter(fpi_controller_pool_instance.address, { from: ORIGINAL_FANTOM_ONE_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ORIGINAL_FANTOM_ONE_ADDRESS]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});    

		console.log(chalk.yellow('========== GIVE THE TWAMM PAIR SOME FRAX =========='));
		await canFRAX_instance.transfer(twamm_pair_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FRAX });
		
		console.log(chalk.yellow('========== GIVE THE FPI CONTROLLER SOME FRAX =========='));
		await canFRAX_instance.transfer(fpi_controller_pool_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FRAX });
		
		console.log(chalk.yellow('========== GIVE ADDRESS[1] SOME FRAX =========='));
		await canFRAX_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000e18"), { from: ADDRESS_WITH_FRAX });

		console.log(chalk.yellow('========== GIVE STAKING_REWARDS_DISTRIBUTOR SOME FRAX =========='));
		await canFRAX_instance.transfer(STAKING_REWARDS_DISTRIBUTOR, new BigNumber("100e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		// ====================================================
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FPI]
		});    

		console.log(chalk.yellow('========== GIVE THE TWAMM PAIR SOME FPI =========='));
		await fpi_instance.transfer(twamm_pair_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FPI });
	
		console.log(chalk.yellow('========== GIVE THE FPI CONTROLLER SOME FPI =========='));
		await fpi_instance.transfer(fpi_controller_pool_instance.address, new BigNumber("10000e18"), { from: ADDRESS_WITH_FPI });
		
		console.log(chalk.yellow('========== GIVE ADDRESS[1] SOME FPI =========='));
		await fpi_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000e18"), { from: ADDRESS_WITH_FPI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FPI]
		});

		// Sync the balances in the pair
		await twamm_pair_instance.mint(COLLATERAL_FRAX_AND_FXS_OWNER, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

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
		const mint_fee = await fpi_controller_pool_instance.mint_fee.call();
		const redeem_fee = await fpi_controller_pool_instance.redeem_fee.call();
		const peg_status_pack = await fpi_controller_pool_instance.pegStatusMntRdm.call();
		const price_info_pack = await fpi_controller_pool_instance.price_info.call();
		const collat_imbalance = new BigNumber(price_info_pack[0]).div(BIG18).toNumber();
		const num_twamm_intervals = await fpi_controller_pool_instance.num_twamm_intervals.call();
		const swap_period = await fpi_controller_pool_instance.swap_period.call();
		const reserves_pack = await twamm_pair_instance.getTwammReserves.call();
		console.log("frax_price:", new BigNumber(frax_price).div(BIG18).toNumber());
		console.log("fpi_price:", new BigNumber(fpi_price).div(BIG18).toNumber());
		console.log("mint_fee:", new BigNumber(mint_fee).div(BIG6).toNumber());
		console.log("redeem_fee:", new BigNumber(redeem_fee).div(BIG6).toNumber());
		console.log("peg_status_pack[0] [cpi_peg_price]:", new BigNumber(peg_status_pack[0]).div(BIG18).toNumber());
		console.log("peg_status_pack[1] [diff_frac_abs]:", new BigNumber(peg_status_pack[1]).toNumber());
		console.log("peg_status_pack[2] [within_range]:", peg_status_pack[2]);
		console.log("price_info[0] [collat_imbalance]:", collat_imbalance);
		console.log("price_info[1] [cpi_peg_price]:", new BigNumber(price_info_pack[1]).div(BIG18).toNumber());
		console.log("price_info[2] [fpi_price]:", new BigNumber(price_info_pack[2]).div(BIG18).toNumber());
		console.log("price_info[3] [price_diff_frac_abs]:", new BigNumber(price_info_pack[3]).toNumber());
		console.log("num_twamm_intervals:", new BigNumber(num_twamm_intervals).toNumber());
		console.log("swap_period:", new BigNumber(swap_period).toNumber());
		console.log("reserves_pack[0] [reserve0]:", new BigNumber(reserves_pack[0]).div(BIG18).toNumber());
		console.log("reserves_pack[1] [reserve1]:", new BigNumber(reserves_pack[1]).div(BIG18).toNumber());
		console.log("reserves_pack[2] [blockTimestampLast]:", new BigNumber(reserves_pack[2]).toNumber());
		console.log("reserves_pack[3] [twammReserve0]:", new BigNumber(reserves_pack[3]).div(BIG18).toNumber());
		console.log("reserves_pack[4] [twammReserve1]:", new BigNumber(reserves_pack[4]).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=================MINT FPI [CPI-DELTA BASED FEE]================"));
		const mint_amt_delta = new BigNumber("100e18");
		
		// Approve FRAX
		await canFRAX_instance.approve(fpi_controller_pool_instance.address, mint_amt_delta, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Mint FPI
		const mint_frax_before_delta = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fpi_before_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.mintFPI(mint_amt_delta, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const mint_frax_after_delta = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fpi_after_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", mint_frax_after_delta - mint_frax_before_delta);
		console.log("FPI change: ", mint_fpi_after_delta - mint_fpi_before_delta);


		console.log(chalk.hex("#ff8b3d").bold("=================REDEEM FPI [CPI-DELTA BASED FEE]================"));
		const redeem_amt_delta = new BigNumber("100e18");
		
		// Approve FRAX
		await fpi_instance.approve(fpi_controller_pool_instance.address, redeem_amt_delta, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem FPI
		const redeem_frax_before_delta = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fpi_before_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.redeemFPI(redeem_amt_delta, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const redeem_frax_after_delta = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fpi_after_delta = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", redeem_frax_after_delta - redeem_frax_before_delta);
		console.log("FPI change: ", redeem_fpi_after_delta - redeem_fpi_before_delta);


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
		await canFRAX_instance.approve(fpi_controller_pool_instance.address, mint_amt_manual, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		// Mint FPI
		const mint_frax_before_manual = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fpi_before_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.mintFPI(mint_amt_manual, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const mint_frax_after_manual = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const mint_fpi_after_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", mint_frax_after_manual - mint_frax_before_manual);
		console.log("FPI change: ", mint_fpi_after_manual - mint_fpi_before_manual);


		console.log(chalk.hex("#ff8b3d").bold("=================REDEEM FPI [MANUAL FEE]================"));
		const redeem_amt = new BigNumber("100e18");
		
		// Approve FRAX
		await fpi_instance.approve(fpi_controller_pool_instance.address, redeem_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Redeem FPI
		const redeem_frax_before_manual = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fpi_before_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.redeemFPI(redeem_amt, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const redeem_frax_after_manual = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const redeem_fpi_after_manual = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", redeem_frax_after_manual - redeem_frax_before_manual);
		console.log("FPI change: ", redeem_fpi_after_manual - redeem_fpi_before_manual);


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
		await fpi_instance.approve(twamm_router_instance.address, BIG18, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		// Do the swap
		const amm_frax_before_0_to_1 = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_before_0_to_1 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await twamm_router_instance.swapExactTokensForTokens(BIG18, 0, [fpi_instance.address, canFRAX_instance.address], COLLATERAL_FRAX_AND_FXS_OWNER, 1947242944, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const amm_frax_after_0_to_1 = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_after_0_to_1 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", amm_frax_after_0_to_1 - amm_frax_before_0_to_1);
		console.log("FPI change: ", amm_fpi_after_0_to_1 - amm_fpi_before_0_to_1);

		
		console.log(chalk.hex("#ff8b3d").bold("=================AMM SWAP FRAX TO FPI================"));
		// Approve FRAX
		await canFRAX_instance.approve(twamm_router_instance.address, BIG18, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

		// Do the swap
		const amm_frax_before_1_to_0 = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_before_1_to_0 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		await twamm_router_instance.swapExactTokensForTokens(BIG18, 0, [canFRAX_instance.address, fpi_instance.address], COLLATERAL_FRAX_AND_FXS_OWNER, 1947242944, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const amm_frax_after_1_to_0 = new BigNumber(await canFRAX_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		const amm_fpi_after_1_to_0 = new BigNumber(await fpi_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber();
		console.log("FRAX change: ", amm_frax_after_1_to_0 - amm_frax_before_1_to_0);
		console.log("FPI change: ", amm_fpi_after_1_to_0 - amm_fpi_before_1_to_0);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE TO FULL CPI PRICE================"));
		// Advance 28 days so the CPI price ramp is done
		await time.increase(28 * 86400);
		await time.advanceBlock();

		// Print info
		const price_info_pack_post_ramp = await fpi_controller_pool_instance.price_info.call();
		const collat_imbalance_post_ramp = new BigNumber(price_info_pack_post_ramp[0]).div(BIG18).toNumber();
		console.log("price_info[0] [collat_imbalance]:", collat_imbalance_post_ramp);
		console.log("price_info[1] [cpi_peg_price]:", new BigNumber(price_info_pack_post_ramp[1]).div(BIG18).toNumber());
		console.log("price_info[2] [fpi_price]:", new BigNumber(price_info_pack_post_ramp[2]).div(BIG18).toNumber());
		console.log("price_info[3] [price_diff_frac_abs]:", new BigNumber(price_info_pack_post_ramp[3]).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMTOPEG [OVERRIDE]================"));
		// twammToPeg override
		const override_amt = new BigNumber("1e15");
		const ttp_frax_before_override = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_override = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.twammToPeg(override_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_override = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_override = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_override - ttp_frax_before_override);
		console.log("FPI change: ", ttp_fpi_after_override - ttp_fpi_before_override);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE HALFWAY THROUGH TWAMM, THEN CANCEL================"));
		// Advance 3.5 days so the TWAMM order is halfway done
		await time.increase(3.5 * 86400);
		await time.advanceBlock();

		// Cancel
		const ttp_frax_before_cancel = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_cancel = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.cancelCurrTWAMMOrder(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_cancel = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_cancel = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_cancel - ttp_frax_before_cancel);
		console.log("FPI change: ", ttp_fpi_after_cancel - ttp_fpi_before_cancel);
		

		console.log(chalk.hex("#ff8b3d").bold("=================DO TWAMMTOPEG [AUTO]================"));
		// twammToPeg auto
		const ttp_frax_before_auto = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_auto = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		let ttp_predict_amt;
		if (collat_imbalance_post_ramp > 0) {
			ttp_predict_amt = await fpi_controller_pool_instance.getTwammToPegAmt(true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
			console.log("Predicted FPI usage: ", new BigNumber(ttp_predict_amt).div(BIG18).toNumber());
		}
		else {
			ttp_predict_amt = await fpi_controller_pool_instance.getTwammToPegAmt(false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
			console.log("Predicted FRAX usage: ", new BigNumber(ttp_predict_amt).div(BIG18).toNumber());
		}
		await fpi_controller_pool_instance.twammToPeg(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_auto = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_auto = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_auto - ttp_frax_before_auto);
		console.log("FPI change: ", ttp_fpi_after_auto - ttp_fpi_before_auto);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE HALFWAY THROUGH TWAMM, THEN COLLECT================"));
		// Advance 3.5 days so the TWAMM order is halfway done
		await time.increase(3.5 * 86400);
		await time.advanceBlock();

		// Collect
		const ttp_frax_before_collect = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_collect = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.collectCurrTWAMMProceeds(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_collect = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_collect = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_collect - ttp_frax_before_collect);
		console.log("FPI change: ", ttp_fpi_after_collect - ttp_fpi_before_collect);


		console.log(chalk.hex("#ff8b3d").bold("=================ADVANCE TO END OF TWAMM================"));
		// Advance 4 days so the TWAMM order is done is done
		await time.increase(4 * 86400);
		await time.advanceBlock();

		// Final collect
		const ttp_frax_before_withdraw = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_before_withdraw = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		await fpi_controller_pool_instance.collectCurrTWAMMProceeds(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const ttp_frax_after_withdraw = new BigNumber(await canFRAX_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		const ttp_fpi_after_withdraw = new BigNumber(await fpi_instance.balanceOf(fpi_controller_pool_instance.address)).div(BIG18).toNumber();
		console.log("FRAX change: ", ttp_frax_after_withdraw - ttp_frax_before_withdraw);
		console.log("FPI change: ", ttp_fpi_after_withdraw - ttp_fpi_before_withdraw);



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
		await canFRAX_instance.approve(fpi_controller_pool_instance.address, lend_amount_small, { from: STAKING_REWARDS_DISTRIBUTOR }); 

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
		await canFRAX_instance.approve(fpi_controller_pool_instance.address, test_amount_huge, { from: COLLATERAL_FRAX_AND_FXS_OWNER }); 

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
			fpi_controller_pool_instance.redeemFPI(test_amount_huge, test_amount_huge, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Slippage [Redeem]"
		);
	});

	it("TWAMM Fail Tests", async () => {
		const test_amount_small = new BigNumber ("1e18");
		const test_amount_huge = new BigNumber ("1000e18");

		console.log(chalk.blue("==================TEST TWAMMTOPEG SWAP FAILS=================="));
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
				fpi_controller_pool_instance.twammToPeg(new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
				"Too much FPI sold"
			);
		}
		else {
			await expectRevert(
				fpi_controller_pool_instance.twammToPeg(new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
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
				fpi_controller_pool_instance.twammToPeg(new BigNumber("10e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
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