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


const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const Babylonian = artifacts.require("Math/Babylonian");
const FixedPoint = artifacts.require("Math/FixedPoint");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

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
const StakingRewardsDual_FRAX3CRV = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX3CRV.sol");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const Comp = artifacts.require("ERC20/Variants/Comp");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Investor contract related
const FraxPoolInvestorForV2 = artifacts.require("Misc_AMOs/FraxPoolInvestorForV2.sol");
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

contract('FraxPoolInvestorForV2-Tests', async (accounts) => {
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
	let pool_instance_USDC;
	

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
	let fraxPoolInvestorForV2_instance;
	let yUSDC_instance;
    let aUSDC_pool_instance;
	let aUSDC_token_instance;
	let cUSDC_instance;
	let compController_instance;

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
		comp_instance = await Comp.deployed(); 

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		
		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_USDC_vAMM = await PoolvAMM_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed();


		

		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		mockFRAX3CRVInstance = await FRAX3CRV_Mock.deployed(); 

		

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();

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
		

		fraxPoolInvestorForV2_instance = await FraxPoolInvestorForV2.deployed();
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
		console.log("----------------------------");

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

	});

	// Pull in USDC via the mint method
	// ================================================================
	it('Main test', async () => {

		console.log("==============NOTE globalCollateralValue BEFORE===============");
		const global_col_val_before = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);

		console.log("=========================PULL IN USDC=========================");
		const fxs_balance_before = new BigNumber(await fxs_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG18);
		const usdc_balance_before = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("FXS before: ", fxs_balance_before.toNumber());
		console.log("USDC before: ", usdc_balance_before.toNumber());

		await fraxPoolInvestorForV2_instance.mintRedeemPart1(new BigNumber("15000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 2 blocks");
		// Advance 7 days so the reward can be claimed
		await time.increase((15 * 2) + 1);
		await time.advanceBlock();
		await time.advanceBlock();

		await fraxPoolInvestorForV2_instance.mintRedeemPart2({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_balance_after = new BigNumber(await fxs_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG18);
		const usdc_balance_after = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		const borrowed_balance = new BigNumber(await frax_amo_minter_instance.collat_borrowed_balances.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("FXS after: ", fxs_balance_after.toNumber());
		console.log("USDC after: ", usdc_balance_after.toNumber());
		console.log("borrowed_balance: ", borrowed_balance.toNumber());

		let the_allocations = await fraxPoolInvestorForV2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V1', the_allocations);

		console.log("===========================BURN FXS===========================");
		await fraxPoolInvestorForV2_instance.burnFXS(fxs_balance_after.multipliedBy(BIG18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_balance_after_burn = new BigNumber(await fxs_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG18);
		console.log("FXS after burn: ", fxs_balance_after_burn.toNumber());

		console.log("==============NOTE globalCollateralValue AFTER===============");
		const global_col_val_after = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		console.log("globalCollateralValue before: ", global_col_val_before.toNumber());
		console.log("globalCollateralValue after: ", global_col_val_after.toNumber());

		console.log("======================TRY A QUICK RECOLLAT=====================");
		// Makes sure the pool is working

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		const global_collateral_value = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		console.log("global_collateral_value", global_collateral_value.toNumber());
		
		
		const fxs_balance_before_recollat = new BigNumber(await fxs_instance.balanceOf.call(process.env.FRAX_ONE_ADDRESS)).div(BIG18);
		console.log("fxs_balance_before_recollat: ", fxs_balance_before_recollat.toNumber());

		await usdc_instance.approve(pool_instance_USDC.address, new BigNumber("100e6"), { from: process.env.FRAX_ONE_ADDRESS });
		await pool_instance_USDC.recollateralizeFRAX(new BigNumber("100e6"), 0, { from: process.env.FRAX_ONE_ADDRESS });
		
		const fxs_balance_after_recollat = new BigNumber(await fxs_instance.balanceOf.call(process.env.FRAX_ONE_ADDRESS)).div(BIG18);
		console.log("fxs_balance_after_recollat: ", fxs_balance_after_recollat.toNumber());

		console.log("======================INVEST INTO yVault======================");
		await fraxPoolInvestorForV2_instance.yDepositUSDC(usdc_balance_after.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 blocks");

		// Advance 10 blocks to earn some rewards
		await time.increase((1500 * 10) + 1);
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		
		the_allocations = await fraxPoolInvestorForV2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V1', the_allocations);

		const yUSD_balance = new BigNumber(await yUSDC_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("yUSDC balance: ", yUSD_balance.toNumber());
		await fraxPoolInvestorForV2_instance.yWithdrawUSDC(yUSD_balance.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_y = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("USDC balance after yUSDC withdrawal: ", usdc_balance_after_withdrawal_y.toNumber());

		console.log("==============TRY TO MINT TOO MUCH [SHOULD FAIL]==============");
		await expectRevert.unspecified(fraxPoolInvestorForV2_instance.mintRedeemPart1(new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("======================INVEST INTO aUSDC======================");
		await fraxPoolInvestorForV2_instance.aaveDepositUSDC(usdc_balance_after_withdrawal_y.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 blocks");

		// Advance 10 blocks to earn some rewards
		await time.increase((1500 * 10) + 1);
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();

		the_allocations = await fraxPoolInvestorForV2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V1', the_allocations);

		const aUSDC_balance = new BigNumber(await aUSDC_token_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("aUSDC balance: ", aUSDC_balance.toNumber());
		await fraxPoolInvestorForV2_instance.aaveWithdrawUSDC(aUSDC_balance.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_a = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("USDC balance after aUSDC withdrawal: ", usdc_balance_after_withdrawal_a.toNumber());

		console.log("======================INVEST INTO cUSDC======================");
		await fraxPoolInvestorForV2_instance.compoundMint_cUSDC(usdc_balance_after_withdrawal_a.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 blocks");

		// Advance 10 blocks to earn some rewards
		await time.increase((1500 * 10) + 1);
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();
		await time.advanceBlock();

		the_allocations = await fraxPoolInvestorForV2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V1', the_allocations);

		const cUSDC_balance = new BigNumber(await cUSDC_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG8);
		console.log("cUSDC balance: ", cUSDC_balance.toNumber());
		await fraxPoolInvestorForV2_instance.compoundRedeem_cUSDC(cUSDC_balance.multipliedBy(BIG8), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_c = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("USDC balance after cUSDC withdrawal: ", usdc_balance_after_withdrawal_c.toNumber());

		// Claim the COMP tokens
		await fraxPoolInvestorForV2_instance.compoundCollectCOMP({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("======================CHECK REWARD TOKENS=====================");

		let the_rewards = await fraxPoolInvestorForV2_instance.showRewards.call();
		utilities.printRewards('Investor_V1', the_rewards);

		console.log("==================CUSTODIAN PULL OUT REWARDS==================");
		await fraxPoolInvestorForV2_instance.withdrawRewards({ from: INVESTOR_CUSTODIAN_ADDRESS });
		console.log("DONE");

		console.log("==================CHECK REWARD TOKENS [AGAIN]==================");

		the_rewards = await fraxPoolInvestorForV2_instance.showRewards.call();
		utilities.printRewards('Investor_V1', the_rewards);

		console.log("================CHECK EMERGENCY ERC20 WITHDRAWAL===============");

		const usdc_balance_before_emergency = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("USDC balance before emergency: ", usdc_balance_before_emergency.toNumber());
		await fraxPoolInvestorForV2_instance.emergencyrecoverERC20(usdc_instance.address, new BigNumber("1e3"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_emergency = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("USDC balance after emergency: ", usdc_balance_after_emergency.toNumber());
		console.log("USDC withdrawn: ", usdc_balance_before_emergency.toNumber() - usdc_balance_after_emergency.toNumber());

		console.log("=====================GIVE COLLATERAL BACK=====================");
		
		const usdc_balance_before_giving_back = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		console.log("USDC balance before giving back: ", usdc_balance_before_giving_back.toNumber());
		await fraxPoolInvestorForV2_instance.giveCollatBack(usdc_balance_before_giving_back.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_giving_back = new BigNumber(await usdc_instance.balanceOf.call(fraxPoolInvestorForV2_instance.address)).div(BIG6);
		const borrowed_balance_after = new BigNumber(await fraxPoolInvestorForV2_instance.borrowed_balance.call()).div(BIG6);
		const borrowed_historical = new BigNumber(await fraxPoolInvestorForV2_instance.borrowed_historical.call()).div(BIG6);
		const paid_back_historical = new BigNumber(await fraxPoolInvestorForV2_instance.paid_back_historical.call()).div(BIG6);
		
		console.log("USDC balance after giving back: ", usdc_balance_after_giving_back.toNumber());
		console.log("borrowed_balance: ", borrowed_balance_after.toNumber());
		console.log("borrowed_historical: ", borrowed_historical.toNumber());
		console.log("paid_back_historical: ", paid_back_historical.toNumber());
		console.log("historical profit: ", paid_back_historical.minus(borrowed_historical).toNumber(), "USDC");

		console.log("=================CHECK EMERGENCY RECOVER ERC20================");

		// TODO:
	});
	
});