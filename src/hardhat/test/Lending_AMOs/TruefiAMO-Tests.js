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
// const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
// const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
// const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
// const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Token vesting
// const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Investor contract related
const InvestorAMO_V3 = artifacts.require("Misc_AMOs/InvestorAMO_V3.sol");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

// Truefi Contracts
const TruefiAMO = artifacts.require("Misc_AMOs/Lending_AMOs/TruefiAMO.sol");
const IManagedPortfolio = artifacts.require("Misc_AMOs/Lending_AMOs/truefi/IManagedPortfolio.sol");
const IManagedPortfolioFactory = artifacts.require("Misc_AMOs/Lending_AMOs/truefi/IManagedPortfolioFactory.sol");
const IPoolFactory = artifacts.require("Misc_AMOs/Lending_AMOs/truefi/IPoolFactory.sol");
const ITrueFiPool2 = artifacts.require("Misc_AMOs/Lending_AMOs/truefi/ITrueFiPool2.sol");
const IStkTruToken = artifacts.require("Misc_AMOs/Lending_AMOs/truefi/IStkTruToken.sol");

// Governance related
// const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
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

contract('TruefiAMO-Tests', async (accounts) => {
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
	const ADDRESS_WITH_WETH = '0xfdEf54b592130774F8A9892e43954D8eAE474649';
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_FXS = '0x28C6c06298d514Db089934071355E5743bf21d60';
	const ADDRESS_WITH_3CRV = '0x99739fa525c0a98384430235d278fd08938997f9';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';

	console.log(chalk.hex("#ff8b3d").bold("=========================Instance Declarations========================="));

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let tru_instance;
	let stktru_instance;

	// Misc AMO related
	let frax_amo_minter_instance;
	let truefiAMO_instance;
	let truefi_b2b_fintech_portfolio_instance;
	let truefi_portfolio_factory_instance;
	let truefi_usdc_core_pool_instance;
	let truefi_core_pool_factory_instance;

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
		tru_instance = await ERC20.at("0x4C19596f5aAfF459fA38B0f7eD92F11AE6543784");
		stktru_instance = await IStkTruToken.at("0x23696914Ca9737466D8553a2d619948f548Ee424");
		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Truefi related
		truefi_b2b_fintech_portfolio_instance = await IManagedPortfolio.at("0xA62CAfd41676613E3723fF966a0f2e3f6DDffEE2");
		truefi_portfolio_factory_instance = await IManagedPortfolioFactory.at("0x17b7b75FD4288197cFd99D20e13B0dD9da1FF3E7");
		truefi_usdc_core_pool_instance = await ITrueFiPool2.at("0xA991356d261fbaF194463aF6DF8f0464F8f1c742");
		truefi_core_pool_factory_instance = await IPoolFactory.at("0x1391D9223E08845e536157995085fE0Cef8Bd393");

		// Truefi AMO Instance 
		truefiAMO_instance = await TruefiAMO.new(DEPLOYER_ADDRESS,frax_amo_minter_instance.address,[],["0xA62CAfd41676613E3723fF966a0f2e3f6DDffEE2"]);

	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// MAIN TEST
	// ================================================================
	it('Main Test', async () => {
		console.log(chalk.green("***********************Initialization*************************"));
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FXS });

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

		console.log(chalk.green("**************************MAIN CODE***************************"));
		
		console.log("Truefi AMO Address: ", await truefiAMO_instance.address);
		console.log("==============NOTE globalCollateralValue BEFORE===============");
		const global_col_val_before = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18).toNumber();
		console.log("Global Collateral Value: ", global_col_val_before);

		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE AMO MINTER INFO====================="));
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());
		console.log("AMO Minter Owner:", await frax_amo_minter_instance.owner.call());
		console.log("AMO Minter timelock_address:", await frax_amo_minter_instance.timelock_address.call());
		
		console.log(chalk.hex("#ff8b3d").bold("=========================SEND SOME USDC INTO TRUEFI AMO========================="));
		let usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(truefiAMO_instance.address)).div(BIG6);
		console.log("Truefi AMO USDC balance: ", usdc_balance.toNumber());
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		// Give the AMO address some FRAX
		await usdc_instance.transfer(truefiAMO_instance.address, new BigNumber("1000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(truefiAMO_instance.address)).div(BIG6);
		console.log("Truefi AMO USDC balance: ", usdc_balance.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("=========================MINT SOME FRAX INTO TRUEFI AMO========================="));
		const frax_balance_before = new BigNumber(await frax_instance.balanceOf.call(truefiAMO_instance.address)).div(BIG18);
		console.log("Truefi AMO FRAX before: ", frax_balance_before.toNumber());

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]}
		);
		console.log("add Truefi AMO to AMO Minter");
		await frax_amo_minter_instance.addAMO(truefiAMO_instance.address, true, { from: process.env.COMPTROLLER_MSIG_ADDRESS });
		
		console.log("mint 1k FRAX from the AMO Minter");
		await frax_amo_minter_instance.mintFraxForAMO(truefiAMO_instance.address, new BigNumber("1000e18"), { from: process.env.COMPTROLLER_MSIG_ADDRESS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});
		
		frax_balance = new BigNumber(await frax_instance.balanceOf.call(truefiAMO_instance.address)).div(BIG18);
		console.log("Truefi AMO FRAX before: ", frax_balance.toNumber());
		
		
		let the_allocations = await truefiAMO_instance.showAllocations.call();
		utilities.printAllocations('Truefi_AMO', the_allocations);


		
		// // console.log("==============NOTE globalCollateralValues===============");
		// // const global_col_val_after = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		// // console.log("globalCollateralValue before: ", global_col_val_before.toNumber());
		// // console.log("globalCollateralValue after: ", global_col_val_after.toNumber());
		// // console.log("globalCollateralValue change after FRAX minting: ", global_col_val_after.toNumber() - global_col_val_before.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================LEND USDC INTO TRUEFI CORE POOL==================="));
		console.log("lending 500 USDC into TRUEFI Core Pool")
		await truefiAMO_instance.truefiDepositUSDC(new BigNumber("500e6"), { from:  DEPLOYER_ADDRESS});
		
		the_allocations = await truefiAMO_instance.showAllocations.call();
		utilities.printAllocations('Truefi_AMO', the_allocations);
		
		console.log("advance 1 year");
		// Advance 365 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 365; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}
		
		the_allocations = await truefiAMO_instance.showAllocations.call();
		utilities.printAllocations('Truefi_AMO', the_allocations);

		// Note the collatDollarBalances
		console.log("TruefiAMO collatDollarBalance:", new BigNumber((await truefiAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("======================CHECK REWARD TOKENS====================="));
		
		let reward_balances = await truefiAMO_instance.showRewards.call();
		console.log("Rewards in stkTRU before collection: ", new BigNumber(reward_balances[0]).div(BIG18).toNumber());
		console.log("Rewards in TRU before collection: ", new BigNumber(reward_balances[1]).div(BIG18).toNumber());
		
		await truefiAMO_instance.truefiCollect_TRU(false, { from:  DEPLOYER_ADDRESS});

		console.log("Rewards in stkTRU after collection: ", new BigNumber(reward_balances[0]).div(BIG18).toNumber());
		console.log("Rewards in TRU after collection: ", new BigNumber(reward_balances[1]).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("======================REDEEM USDC FROM TRUEFI CORE POOL======================"));
		
		const truUSDC_current = new BigNumber(await truefi_usdc_core_pool_instance.balanceOf.call(truefiAMO_instance.address))
		await truefiAMO_instance.truefiWithdrawUSDC(truUSDC_current, { from: DEPLOYER_ADDRESS });
		
		the_allocations = await truefiAMO_instance.showAllocations.call();
		utilities.printAllocations('Truefi_AMO', the_allocations);

		// Note the collatDollarBalances
		console.log("TruefiAMO collatDollarBalance:", new BigNumber((await truefiAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		
		// console.log(chalk.hex("#ff8b3d").bold("===================LEND USDC INTO TRUEFI MANAGED PORTFOLIOS==================="));
		// const ADDRESS_Cauris_Fund_1_MP = '0xAad6363c442BC79b05E0f43D67333236d518fF3E';
		// const ADDRESS_Blockchain_com_MP = '0x29a6D3a261B658d4B55Ced032723A4cF1931FEb6';
		
		// console.log("Add new ManagedPortfolio into AMO");
		// await truefiAMO_instance.addUSDCManagedPortfolio(ADDRESS_Cauris_Fund_1_MP, { from:  DEPLOYER_ADDRESS});
		// await truefiAMO_instance.addUSDCManagedPortfolio(ADDRESS_Blockchain_com_MP, { from:  DEPLOYER_ADDRESS});
		
		// console.log("White listing AMO in MP pools");

		
		// console.log("lending 500 USDC into Managed Portfolio");
		// await truefiAMO_instance.truefiDepositManagedPortfolioUSDC(new BigNumber("500e6"), ADDRESS_Blockchain_com_MP, { from:  DEPLOYER_ADDRESS});
		
		// the_allocations = await truefiAMO_instance.showAllocations.call();
		// utilities.printAllocations('Truefi_AMO', the_allocations);
		
		// console.log("advance 1 year");
		// // Advance 365 days to earn some rewards
		// // Do in 1 day increments
		// for (let j = 0; j < 365; j++){
		// 	await time.increase(1 * 86400);
		// 	await time.advanceBlock();
		// }
		
		// the_allocations = await truefiAMO_instance.showAllocations.call();
		// utilities.printAllocations('Truefi_AMO', the_allocations);

		// // Note the collatDollarBalances
		// console.log("TruefiAMO collatDollarBalance:", new BigNumber((await truefiAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		// console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());


	});
	
});