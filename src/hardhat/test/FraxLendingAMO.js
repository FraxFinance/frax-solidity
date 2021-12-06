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

// Collateral
const WETH = artifacts.require("ERC20/WETH");

// Collateral Pools
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
// const StakingRewardsDual_FRAX3CRV = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX3CRV.sol");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Investor contract related
// const FraxPoolInvestorForV2 = artifacts.require("Misc_AMOs/FraxPoolInvestorForV2.sol");
const FraxLendingAMO_V2 = artifacts.require("Misc_AMOs/FraxLendingAMO_V2.sol");
const IyUSDC_V2_Partial = artifacts.require("Misc_AMOs/yearn/IyUSDC_V2_Partial.sol");
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial.sol");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial.sol");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial.sol");
const IComptroller = artifacts.require("Misc_AMOs/compound/IComptroller.sol");
const ICREAM_crFRAX = artifacts.require("Misc_AMOs/cream/ICREAM_crFRAX.sol");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const BIG6 = new BigNumber("1e6");
const BIG8 = new BigNumber("1e8");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FraxLendingAMO-Tests', async (accounts) => {
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
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_FRAX3CRV = '0x7939f2d7e0ae5C26d4dD86859807749f87E5B5Dd';
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;

	// Initialize oracle instances
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Initialize pool instances
	let pool_instance_V3;

	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FXS_WETH;

	// Initialize Uniswap pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FXS_WETH;

	// Initialize Sushi pair contracts
	let pair_instance_FRAX_FXS_Sushi;
	let pair_instance_FXS_WETH_Sushi;

	// Initialize pair orders
	let isToken0Frax_FRAX_WETH;
	let isToken0Frax_FRAX_USDC;
	let isToken0Fxs_FXS_WETH;

	// Initialize staking instances
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FXS_WETH;

    // let stakingInstanceDual_FRAX_FXS_Sushi;
	// let stakingInstanceDual_FXS_WETH_Sushi;
	let stakingInstanceDual_FRAX3CRV;

	// Initialize investor-related contracts
	// let fraxPoolInvestorForV2_instance;
	let lending_amo_instance;
	let yUSDC_instance;
    let aUSDC_pool_instance;
	let aUSDC_token_instance;
	let cUSDC_instance;
	let compController_instance;
	let crFRAX_instance;
	let frax_amo_minter_instance;

    // let iUSDC_instance;
	// let hUSDC_instance;
	// let fUSDC_instance;
	// let fUSDC_reward_pool_instance;

	// Initialize running balances
	let bal_frax = 0;
	let bal_fxs = 0;
	let col_bal_usdc = 0;
	let col_rat = 1;
	let pool_bal_usdc = 0;
	let global_collateral_value = 0;

	const USE_CALLS = false;
	const MAX_SLIPPAGE = .025;

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

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		
		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_V3 = await FraxPoolV3.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();
		
		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// mockFRAX3CRVInstance = await FRAX3CRV_Mock.deployed(); 

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		// stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();

		// Investor related
		yUSDC_instance = await IyUSDC_V2_Partial.deployed();
		aUSDC_pool_instance = await IAAVELendingPool_Partial.deployed();
		aUSDC_token_instance = await IAAVE_aUSDC_Partial.deployed();
		cUSDC_instance = await IcUSDC_Partial.deployed();
		compController_instance = await IComptroller.deployed();
		crFRAX_instance = await ICREAM_crFRAX.deployed();

		// fraxPoolInvestorForV2_instance = await FraxPoolInvestorForV2.deployed();
		lending_amo_instance = await FraxLendingAMO_V2.deployed();
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
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));
		console.log("----------------------------");

		// console.log("Set COLLATERAL_FRAX_AND_FXS_OWNER as the Lending AMO 'timelock' for testing purposes ");
		// await lending_amo_instance.setTimelock(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FRAX_ONE_ADDRESS });

		// console.log("Set custodian as the test custodian");
		// await lending_amo_instance.setCustodian(INVESTOR_CUSTODIAN_ADDRESS, { from: process.env.FRAX_ONE_ADDRESS });

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

	});

	// ================================================================
	it('Main test', async () => {

		console.log("==============NOTE globalCollateralValue BEFORE===============");
		const global_col_val_before = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);

		console.log(chalk.hex("#ff8b3d").bold("=========================PULL IN FRAX========================="));
		const frax_balance_before = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		console.log("FRAX before: ", frax_balance_before.toNumber());

		console.log("Get some FRAX from the minter");
		await frax_amo_minter_instance.mintFraxForAMO(lending_amo_instance.address, new BigNumber("20000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const frax_balance_after = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		const borrowed_balance = new BigNumber(await frax_amo_minter_instance.collat_borrowed_balances.call(lending_amo_instance.address)).div(BIG6);
		console.log("FRAX after: ", frax_balance_after.toNumber());
		console.log("borrowed_balance: ", borrowed_balance.toNumber());

		let the_allocations = await lending_amo_instance.showAllocations.call();

		utilities.printAllocations("Lending_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================BURN SOME FRAX==========================="));
		await lending_amo_instance.burnFRAX(new BigNumber("10000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const frax_balance_after_burn = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		console.log("FRAX after burn: ", frax_balance_after_burn.toNumber());


		console.log("==============NOTE globalCollateralValue AFTER===============");
		const global_col_val_after = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		console.log("globalCollateralValue before: ", global_col_val_before.toNumber());
		console.log("globalCollateralValue after: ", global_col_val_after.toNumber());


		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("gcv_bal_start: ", gcv_bal_start);

		// Note the FraxPoolV3 Balance too
		const pool_usdc_bal_start = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		console.log("pool_usdc_bal_start: ", pool_usdc_bal_start);


		console.log(chalk.hex("#ff8b3d").bold("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]====================="));
		// Makes sure the pool is working

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		const fxs_per_usd_exch_rate = (new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// Note balances beforehand
		const frax_balance_before_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_before_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_before_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// Redeem threshold
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.POOL_OWNER_ADDRESS]
		});
	
		console.log("Set the redeem threshold to $1.01 now so redeems work");
		await pool_instance_V3.setPriceThresholds(1030000, 1010000, { from: process.env.POOL_OWNER_ADDRESS }); 
	
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.POOL_OWNER_ADDRESS]
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

		// Note balances afterwards
		const frax_balance_after_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_after_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_after_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		
		// Print the changes
		console.log(`FRAX Change: ${frax_balance_after_redeem - frax_balance_before_redeem} FRAX`);
		console.log(`FXS Change: ${fxs_balance_after_redeem - fxs_balance_before_redeem} FXS`);
		console.log(`USDC Change: ${usdc_balance_after_redeem - usdc_balance_before_redeem} USDC`);

		console.log(chalk.hex("#ff8b3d").bold("======================PROVIDE LIQUIDITY FOR CREAM======================"));
		// Deposit FRAX for crFRAX
		const cr_liq_amt = new BigNumber("10000e18");
		console.log(`Deposit ${cr_liq_amt.div(BIG18).toNumber()} FRAX`);
		await lending_amo_instance.creamDeposit_FRAX(cr_liq_amt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Advance 100 blocks to earn some rewards");
		for (let j = 0; j < 100; j++){
			await time.increase(15);
			await time.advanceBlock();
		}
		
		the_allocations = await lending_amo_instance.showAllocations.call();
		utilities.printAllocations("Lending_AMO", the_allocations);

		const crFRAX_balance = new BigNumber(await crFRAX_instance.balanceOf.call(lending_amo_instance.address)).div(BIG8);
		console.log("crFRAX balance: ", crFRAX_balance.toNumber());

		// Withdraw the crFRAX (will auto convert back to FRAX)
		await lending_amo_instance.creamWithdraw_crFRAX(crFRAX_balance.multipliedBy(BIG8), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_balance_after_withdrawal_cr = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		console.log("FRAX balance after crFRAX withdrawal: ", frax_balance_after_withdrawal_cr.toNumber());

		console.log("====================CHECK ERC20 RECOVER===================");
		const frax_balance_before_emergency = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		console.log("FRAX balance before emergency: ", frax_balance_before_emergency.toNumber());
		await lending_amo_instance.recoverERC20(frax_instance.address, new BigNumber("1e15"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_balance_after_emergency = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		console.log("FRAX balance after emergency: ", frax_balance_after_emergency.toNumber());
		console.log("FRAX withdrawn: ", frax_balance_before_emergency.toNumber() - frax_balance_after_emergency.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE BALANCES====================="));
		const frax_balance_before_giving_back = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		console.log("FRAX balance before giving back: ", frax_balance_before_giving_back.toNumber());
		await lending_amo_instance.burnFRAX(frax_balance_before_giving_back.multipliedBy(BIG18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_balance_after_giving_back = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address)).div(BIG18);
		const minted_balance = new BigNumber(await frax_amo_minter_instance.mint_balances.call(lending_amo_instance.address)).div(BIG18);
		const amo_profit = new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(lending_amo_instance.address)).div(BIG18);

		console.log("FRAX balance after giving back: ", frax_balance_after_giving_back.toNumber());
		console.log("minted_balance: ", minted_balance.toNumber());
		console.log("amo_profit: ", amo_profit.toNumber(), "FRAX");

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await lending_amo_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const investor_usdc_bal_after = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));

		// Make sure tokens were actually transferred
		const investor_usdc_balance_change = investor_usdc_bal_after.minus(investor_usdc_bal_before).div(BIG6).toNumber();
		console.log("Investor USDC balance change:", investor_usdc_balance_change);
		assert(investor_usdc_bal_after > investor_usdc_bal_before, 'Should have transferred');

		console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(lending_amo_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give all the FRAX BACK");
		const amo_frax_bal = new BigNumber(await frax_instance.balanceOf.call(lending_amo_instance.address));
		await lending_amo_instance.burnFRAX(amo_frax_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FraxPoolV3 balance and collatDollarBalance after
		const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(lending_amo_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK FINAL ALLOCATIONS ====================="));
		the_allocations = await lending_amo_instance.showAllocations.call();
		utilities.printAllocations("Lending_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);
		console.log("FraxPoolV3 USDC Balance Change:", pool_usdc_bal_end - pool_usdc_bal_start);
	});
	
});