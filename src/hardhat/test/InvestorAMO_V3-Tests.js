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
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Investor contract related
const InvestorAMO_V3 = artifacts.require("Misc_AMOs/InvestorAMO_V3.sol");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");
const IyUSDC_V2_Partial = artifacts.require("Misc_AMOs/yearn/IyUSDC_V2_Partial.sol");
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial.sol");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial.sol");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial.sol");
const IComptroller = artifacts.require("Misc_AMOs/compound/IComptroller.sol");
// const IBZXFulcrum_Partial = artifacts.require("Misc_AMOs/bzx/IBZXFulcrum_Partial.sol");
// const IkUSDC_Partial = artifacts.require("Misc_AMOs/compound/IkUSDC_Partial.sol");
// const IHARVEST_fUSDC = artifacts.require("Misc_AMOs/harvest/IHARVEST_fUSDC.sol");
// const IHARVESTNoMintRewardPool_Partial = artifacts.require("Misc_AMOs/harvest/IHARVESTNoMintRewardPool_Partial.sol");

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

contract('InvestorAMO_V3-Tests', async (accounts) => {
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
	const ADDRESS_WITH_ETH = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik's Vb
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_FXS = '0x28C6c06298d514Db089934071355E5743bf21d60';
	const ADDRESS_WITH_3CRV = '0x99739fa525c0a98384430235d278fd08938997f9';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';

	console.log(chalk.hex("#ff8b3d").bold("=========================Instance Declarations========================="));

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;
	let mockFRAX3CRVInstance;

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

	// Initialize investor-related contract
	let investor_amo_v3_instance;
	let yUSDC_instance;
    let aUSDC_pool_instance;
	let aUSDC_token_instance;
	let cUSDC_instance;
	let compController_instance;

	// Misc AMO related
	let frax_amo_minter_instance;

    // let iUSDC_instance;
	// let hUSDC_instance;
	// let fUSDC_instance;
	// let fUSDC_reward_pool_instance;

	// Initialize other instances
	let usdc_real_instance;

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
		comp_instance = await ERC20.at("0xc00e94Cb662C3520282E6f5717214004A7f26888"); 

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
		// iUSDC_instance = await IBZXFulcrum_Partial.deployed();
		// kUSDC_instance = await IkUSDC_Partial.deployed();
		// fUSDC_instance = await IHARVEST_fUSDC.deployed();
		// fUSDC_instance = await IHARVEST_fUSDC.deployed();
		// fUSDC_reward_pool_instance = await IHARVESTNoMintRewardPool_Partial.deployed();
		// investor_amo_v3_instance = await InvestorAMO_V3.deployed();

		// Other instances
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");


		console.log(chalk.hex("#ff8b3d").bold("=========================Proxy Deployments========================="));

		// console.log(chalk.yellow('========== Investor AMO =========='));
		// const InvestorAMO_V3_Implementation = await hre.ethers.getContractFactory("InvestorAMO_V3");
		// const proxy_obj = await hre.upgrades.deployProxy(InvestorAMO_V3_Implementation, [
		// 	frax_instance.address, 
		// 	fxs_instance.address, 
		// 	pool_instance_V3.address, 
		// 	usdc_instance.address, 
		// 	COLLATERAL_FRAX_AND_FXS_OWNER, 
		// 	INVESTOR_CUSTODIAN_ADDRESS, 
		// 	timelockInstance.address,
		// ]);
		// const proxy_instance = await proxy_obj.deployed();
		// console.log("InvestorAMO_V3 proxy deployed at: ", proxy_instance.address);

		// // Get out of ethers and back to web3. It gives a signer-related error
		// investor_amo_v3_instance = await InvestorAMO_V3.at(proxy_instance.address);
		investor_amo_v3_instance = await InvestorAMO_V3.deployed();

		// const the_admin = await investor_amo_v3_instance.admin();
		// const the_implementation = await investor_amo_v3_instance.implementation();

		// console.log("the_admin: ", the_admin);
		// console.log("the_implementation: ", the_implementation);

		// return false;

	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	// MAIN TEST
	// ================================================================
	it('Main test', async () => {

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("100000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC_2]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000000e6"), { from: ADDRESS_WITH_USDC_2 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC_2]
		});

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		console.log("==============NOTE globalCollateralValue BEFORE===============");
		const global_col_val_before = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);

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


		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("gcv_bal_start: ", gcv_bal_start);

		// Note the FraxPoolV3 Balance too
		const pool_usdc_bal_start = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		console.log("pool_usdc_bal_start: ", pool_usdc_bal_start);


		console.log(chalk.hex("#ff8b3d").bold("=========================PULL IN USDC========================="));

		const fxs_balance_before = new BigNumber(await fxs_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG18);
		const usdc_balance_before = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("FXS before: ", fxs_balance_before.toNumber());
		console.log("USDC before: ", usdc_balance_before.toNumber());

		console.log("Get some USDC from the AMO Minter");
		await frax_amo_minter_instance.giveCollatToAMO(investor_amo_v3_instance.address, new BigNumber("15000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_balance_after = new BigNumber(await fxs_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG18);
		const usdc_balance_after = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		const borrowed_balance = new BigNumber(await frax_amo_minter_instance.collat_borrowed_balances.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("FXS after: ", fxs_balance_after.toNumber());
		console.log("USDC after: ", usdc_balance_after.toNumber());
		console.log("borrowed_balance: ", borrowed_balance.toNumber());

		let the_allocations = await investor_amo_v3_instance.showAllocations.call();
		utilities.printAllocations('Investor_AMO_V3', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===========================BURN FXS==========================="));
		await investor_amo_v3_instance.burnFXS(fxs_balance_after.multipliedBy(BIG18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_balance_after_burn = new BigNumber(await fxs_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG18);
		console.log("FXS after burn: ", fxs_balance_after_burn.toNumber());

		console.log("==============NOTE globalCollateralValues===============");
		const global_col_val_after = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		console.log("globalCollateralValue before: ", global_col_val_before.toNumber());
		console.log("globalCollateralValue after: ", global_col_val_after.toNumber());
		console.log("globalCollateralValue change after pull and test redeem: ", global_col_val_after.toNumber() - global_col_val_before.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("======================INVEST INTO yVault======================"));
		await investor_amo_v3_instance.yDepositUSDC(usdc_balance_after.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 days");
		// Advance 10 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}
		
		the_allocations = await investor_amo_v3_instance.showAllocations.call();
		utilities.printAllocations('Investor_AMO_V3', the_allocations);

		const yUSD_balance = new BigNumber(await yUSDC_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("yUSDC balance: ", yUSD_balance.toNumber());
		await investor_amo_v3_instance.yWithdrawUSDC(yUSD_balance.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_y = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("USDC balance after yUSDC withdrawal: ", usdc_balance_after_withdrawal_y.toNumber());

		// Note midpoint GCV
		const gcv_midpoint_1 = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("globalCollateralValue Midpoint Change [includes Rari, etc profits!]:", gcv_midpoint_1 - gcv_bal_start);

		// Note the collatDollarBalances
		console.log("InvestorAMO collatDollarBalance:", new BigNumber((await investor_amo_v3_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log("==============TRY TO MINT TOO MUCH [SHOULD FAIL]==============");
		await expectRevert.unspecified(frax_amo_minter_instance.mintFraxForAMO(investor_amo_v3_instance.address, new BigNumber("1000000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log(chalk.hex("#ff8b3d").bold("======================INVEST INTO aUSDC======================"));
		await investor_amo_v3_instance.aaveDepositUSDC(usdc_balance_after_withdrawal_y.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 days");
		// Advance 10 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}

		the_allocations = await investor_amo_v3_instance.showAllocations.call();
		utilities.printAllocations('Investor_AMO_V3', the_allocations);

		const aUSDC_balance = new BigNumber(await aUSDC_token_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("aUSDC balance: ", aUSDC_balance.toNumber());
		await investor_amo_v3_instance.aaveWithdrawUSDC(aUSDC_balance.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_a = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("USDC balance after aUSDC withdrawal: ", usdc_balance_after_withdrawal_a.toNumber());

		// Claim the stkAAVE tokens
		await investor_amo_v3_instance.aaveCollect_stkAAVE({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note midpoint GCV
		const gcv_midpoint_2 = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("globalCollateralValue Midpoint Change [includes Rari, etc profits!]:", gcv_midpoint_2 - gcv_bal_start);

		// Note the collatDollarBalances
		console.log("InvestorAMO collatDollarBalance:", new BigNumber((await investor_amo_v3_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("======================CHECK REWARD TOKENS====================="));

		let the_rewards = await investor_amo_v3_instance.showRewards.call();
		utilities.printRewards('Investor_AMO_V3', the_rewards);

		console.log(chalk.hex("#ff8b3d").bold("======================INVEST INTO cUSDC======================"));
		await investor_amo_v3_instance.compoundMint_cUSDC(usdc_balance_after_withdrawal_a.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 days");
		// Advance 10 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}

		the_allocations = await investor_amo_v3_instance.showAllocations.call();
		utilities.printAllocations('Investor_AMO_V3', the_allocations);

		const cUSDC_balance = new BigNumber(await cUSDC_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG8);
		console.log("cUSDC balance: ", cUSDC_balance.toNumber());
		await investor_amo_v3_instance.compoundRedeem_cUSDC(cUSDC_balance.multipliedBy(BIG8), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_c = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("USDC balance after cUSDC withdrawal: ", usdc_balance_after_withdrawal_c.toNumber());

		// Claim the COMP tokens
		await investor_amo_v3_instance.compoundCollectCOMP({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note midpoint GCV
		const gcv_midpoint_3 = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("globalCollateralValue Midpoint Change [includes Rari, etc profits!]:", gcv_midpoint_3 - gcv_bal_start);

		// Note the collatDollarBalances
		console.log("InvestorAMO collatDollarBalance:", new BigNumber((await investor_amo_v3_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("======================CHECK REWARD TOKENS====================="));

		let the_rewards_post_comp = await investor_amo_v3_instance.showRewards.call();
		utilities.printRewards('Investor_AMO_V3', the_rewards_post_comp);

		console.log("==================CUSTODIAN PULL OUT REWARDS==================");
		await investor_amo_v3_instance.withdrawRewards({ from: INVESTOR_CUSTODIAN_ADDRESS });
		console.log("DONE");

		console.log("==================CHECK REWARD TOKENS [AGAIN]==================");

		let the_rewards_post_pullout = await investor_amo_v3_instance.showRewards.call();
		utilities.printRewards('Investor_AMO_V3', the_rewards_post_pullout);

		console.log("================CHECK ERC20 RECOVERY===============");

		const usdc_balance_before_recovery = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("USDC balance before recovery: ", usdc_balance_before_recovery.toNumber());
		await investor_amo_v3_instance.recoverERC20(usdc_instance.address, new BigNumber("1e3"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_recovery = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v3_instance.address)).div(BIG6);
		console.log("USDC balance after recovery: ", usdc_balance_after_recovery.toNumber());
		console.log("USDC withdrawn: ", usdc_balance_before_recovery.toNumber() - usdc_balance_after_recovery.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await investor_amo_v3_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const investor_usdc_bal_after = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));

		// Make sure tokens were actually transferred
		const investor_usdc_balance_change = investor_usdc_bal_after.minus(investor_usdc_bal_before).div(BIG6).toNumber();
		console.log("Investor USDC balance change:", investor_usdc_balance_change);
		assert(investor_usdc_bal_after > investor_usdc_bal_before, 'Should have transferred');

		console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("InvestorAMO collatDollarBalance:", new BigNumber((await investor_amo_v3_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(investor_amo_v3_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give all the USDC BACK");
		const final_usdc_bal = await usdc_instance.balanceOf.call(investor_amo_v3_instance.address);
		await investor_amo_v3_instance.giveCollatBack(final_usdc_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FraxPoolV3 balance and collatDollarBalance after
		const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		console.log("InvestorAMO collatDollarBalance:", new BigNumber((await investor_amo_v3_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(investor_amo_v3_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK FINAL ALLOCATIONS ====================="));
		the_allocations = await investor_amo_v3_instance.showAllocations.call();
		utilities.printAllocations("Investor_AMO_V3", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);
		console.log("FraxPoolV3 USDC Balance Change:", pool_usdc_bal_end - pool_usdc_bal_start);
	});
	
});