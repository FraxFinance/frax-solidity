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
const IUniswapV2Pair = artifacts.require("contracts/Uniswap/Interfaces/IUniswapV2Pair.sol:IUniswapV2Pair");
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
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/Lending_AMOs/aave/IAAVELendingPool_Partial.sol");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/Lending_AMOs/aave/IAAVE_aUSDC_Partial.sol");
const IAAVE_aFRAX = artifacts.require("Misc_AMOs/Lending_AMOs/aave/IAAVE_aFRAX.sol");
const IAaveIncentivesControllerPartial = artifacts.require("Misc_AMOs/Lending_AMOs/aave/IAaveIncentivesControllerPartial.sol");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial.sol");
const IComptroller = artifacts.require("Misc_AMOs/compound/IComptroller.sol");
// const IBZXFulcrum_Partial = artifacts.require("Misc_AMOs/bzx/IBZXFulcrum_Partial.sol");
// const IkUSDC_Partial = artifacts.require("Misc_AMOs/compound/IkUSDC_Partial.sol");
// const IHARVEST_fUSDC = artifacts.require("Misc_AMOs/harvest/IHARVEST_fUSDC.sol");
// const IHARVESTNoMintRewardPool_Partial = artifacts.require("Misc_AMOs/harvest/IHARVESTNoMintRewardPool_Partial.sol");
const AaveAMO = artifacts.require("Misc_AMOs/Lending_AMOs/AaveAMO_V2.sol");

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

contract('AaveAMO-Tests', async (accounts) => {
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
	let aFRAX_pool_instance;
	let aFRAX_token_instance;
	let aWETH_token_instance;
	let variableDebtFRAX_token_instance;
	let variableDebtWETH_token_instance;
	let aave_lending_pool_instance;
	let cUSDC_instance;
	let compController_instance;
	let aaveAMO_instance;

	// Misc AMO related
	let frax_amo_minter_instance;
	let aaveIncentivesControllerPartial_instance;

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
		// oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		
		// Initialize the governance contract
		// governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_V3 = await FraxPoolV3.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Aave Incentive Controller
		aaveIncentivesControllerPartial_instance = await IAaveIncentivesControllerPartial.at("0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5");
		
		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// mockFRAX3CRVInstance = await FRAX3CRV_Mock.deployed(); 

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		// stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();

		// Investor related
		// yUSDC_instance = await IyUSDC_V2_Partial.deployed();
		// aUSDC_pool_instance = await IAAVELendingPool_Partial.deployed();
		// aUSDC_token_instance = await IAAVE_aUSDC_Partial.deployed();
		// aFRAX_pool_instance = aUSDC_pool_instance; // same contract
		// aFRAX_token_instance = await IAAVE_aFRAX.deployed();
		aave_lending_pool_instance = await IAAVELendingPool_Partial.at("0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9");
		aFRAX_token_instance = await IAAVE_aFRAX.at("0xd4937682df3C8aEF4FE912A96A74121C0829E664");
		aWETH_token_instance = await IAAVE_aFRAX.at("0x030bA81f1c18d280636F32af80b9AAd02Cf0854e");
		

		variableDebtFRAX_token_instance = await ERC20.at("0xfE8F19B17fFeF0fDbfe2671F248903055AFAA8Ca");
		variableDebtWETH_token_instance = await ERC20.at("0xF63B34710400CAd3e044cFfDcAb00a0f32E33eCf");
		// cUSDC_instance = await IcUSDC_Partial.deployed();
		// compController_instance = await IComptroller.deployed();
		// iUSDC_instance = await IBZXFulcrum_Partial.deployed();
		// kUSDC_instance = await IkUSDC_Partial.deployed();
		// fUSDC_instance = await IHARVEST_fUSDC.deployed();
		// fUSDC_instance = await IHARVEST_fUSDC.deployed();
		// fUSDC_reward_pool_instance = await IHARVESTNoMintRewardPool_Partial.deployed();
		// investor_amo_v3_instance = await InvestorAMO_V3.deployed();

		// Aave AMO Instance 
		aaveAMO_instance = await AaveAMO.new(DEPLOYER_ADDRESS,frax_amo_minter_instance.address);
		// aaveAMO_instance = await AaveAMO.deployed();

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
		// investor_amo_v3_instance = await InvestorAMO_V3.deployed();
		investor_amo_v3_instance = await InvestorAMO_V3.new(DEPLOYER_ADDRESS,frax_amo_minter_instance.address);

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
		
		console.log("Aave AMO Address: ", await aaveAMO_instance.address);
		console.log("==============NOTE globalCollateralValue BEFORE===============");
		const global_col_val_before = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		// console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// // Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		// console.log("gcv_bal_start: ", gcv_bal_start);

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
		// console.log(chalk.hex("#ff8b3d").bold("=========================SEND SOME FRAX INTO AAVE AMO========================="));
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_FRAX]}
		// );

		// // Give the AMO address some FRAX
		// await frax_instance.transfer(aaveAMO_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_FRAX]}
		// );

		console.log(chalk.hex("#ff8b3d").bold("=========================MINTED SOME FRAX INTO AAVE AMO========================="));
		const frax_balance_before = new BigNumber(await frax_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("Aave_AMO FRAX before: ", frax_balance_before.toNumber());

		let the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]}
		);
		console.log("add Aave_AMO to AMO Minter");
		await frax_amo_minter_instance.addAMO(aaveAMO_instance.address, true, { from: process.env.COMPTROLLER_MSIG_ADDRESS });
		// console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		// console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());
		
		console.log("mint 1k FRAX from the AMO Minter");
		await frax_amo_minter_instance.mintFraxForAMO(aaveAMO_instance.address, new BigNumber("1000e18"), { from: process.env.COMPTROLLER_MSIG_ADDRESS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.COMPTROLLER_MSIG_ADDRESS]
		});
		
		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);



		console.log("==============NOTE globalCollateralValues===============");
		const global_col_val_after = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		console.log("globalCollateralValue before: ", global_col_val_before.toNumber());
		console.log("globalCollateralValue after: ", global_col_val_after.toNumber());
		console.log("globalCollateralValue change after FRAX minting: ", global_col_val_after.toNumber() - global_col_val_before.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("======================LEND FRAX INTO AAVE======================"));
		console.log("lending 1k FRAX into AAVE")
		await aaveAMO_instance.aaveDepositFRAX(new BigNumber("1000e18"), { from:  DEPLOYER_ADDRESS});
		
		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);
		
		console.log("advance 1 year");
		// Advance 365 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 365; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}
		
		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);

		// Note the collatDollarBalances
		console.log("AaveAMO collatDollarBalance:", new BigNumber((await aaveAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log("aFRAX_token_instance:", aFRAX_token_instance.address);
		const aFRAX_balance = new BigNumber(await aFRAX_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("aFRAX balance: ", aFRAX_balance.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("======================CHECK REWARD TOKENS====================="));
		
		const rewards_balance_before = new BigNumber(await aaveIncentivesControllerPartial_instance.getRewardsBalance.call([aFRAX_token_instance.address], aaveAMO_instance.address)).div(BIG18);
		console.log("Rewards in aave before collection: ", rewards_balance_before.toNumber());
		
		// Claim the stkAAVE tokens
		await aaveAMO_instance.aaveCollect_stkAAVE(1, { from: DEPLOYER_ADDRESS });

		const rewards_balance_after = new BigNumber(await aaveIncentivesControllerPartial_instance.getRewardsBalance.call([aFRAX_token_instance.address], aaveAMO_instance.address)).div(BIG18);
		console.log("Rewards in aave after collection: ", rewards_balance_after.toNumber());

		// the_allocations = await aaveAMO_instance.showAllocations.call();
		// utilities.printAllocations('Aave_AMO', the_allocations);
		
		// Note midpoint GCV
		const gcv_midpoint_2 = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("globalCollateralValue Midpoint Change [includes Rari, etc profits!]:", gcv_midpoint_2 - gcv_bal_start);

		console.log("==================CUSTODIAN PULL OUT REWARDS (execute)==================");
		await aaveAMO_instance.execute("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", 0, "0xa9059cbb000000000000000000005180db0237291A6449DdA9ed33aD90a38787621c0000000000000000000000000000000000000000000000000000000000000000", { from: DEPLOYER_ADDRESS });
		console.log("DONE");
		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("======================REDEEM FRAX FROM AAVE======================"));
		
		const aFRAX_current = new BigNumber(await aFRAX_token_instance.balanceOf.call(aaveAMO_instance.address))
		await aaveAMO_instance.aaveWithdrawFRAX(aFRAX_current, { from: DEPLOYER_ADDRESS });
		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);
		// Note the collatDollarBalances
		console.log("AaveAMO collatDollarBalance:", new BigNumber((await aaveAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		
		console.log("================CHECK ERC20 RECOVERY===============");

		const frax_balance_before_recovery = new BigNumber(await frax_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("FRAX balance before recovery: ", frax_balance_before_recovery.toNumber());
		await aaveAMO_instance.recoverERC20(frax_instance.address, new BigNumber("1e18"), { from: DEPLOYER_ADDRESS });
		const frax_balance_after_recovery = new BigNumber(await frax_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("FRAX balance after recovery: ", frax_balance_after_recovery.toNumber());
		console.log("FRAX withdrawn: ", frax_balance_before_recovery.toNumber() - frax_balance_after_recovery.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Aave AMO collatDollarBalance:", new BigNumber((await aaveAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give all the FRAX BACK");
		const final_frax_bal = await frax_instance.balanceOf.call(aaveAMO_instance.address);

		await aaveAMO_instance.burnFRAX(final_frax_bal, { from: DEPLOYER_ADDRESS });

		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);

		// Note the collatDollarBalances
		console.log("AaveAMO collatDollarBalance:", new BigNumber((await aaveAMO_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		
		console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note the FraxPoolV3 balance and collatDollarBalance after
		const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		console.log("InvestorAMO collatDollarBalance:", new BigNumber((await investor_amo_v3_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK FINAL ALLOCATIONS ====================="));
		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		//console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);


		console.log(chalk.hex("#ff8b3d").bold("===================== BORROW FROM AAVE ====================="));
		let AMO_weth_balance = new BigNumber(await wethInstance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO WETH balance before transfer: ", AMO_weth_balance.toNumber());
		console.log("Transfer WETH to AMO");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_WETH]}
		);
		// Give the AMO address some WETH
		await wethInstance.transfer(aaveAMO_instance.address, new BigNumber("1e18"), { from: ADDRESS_WITH_WETH });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_WETH]}
		);

		AMO_weth_balance = new BigNumber(await wethInstance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO WETH balance after transfer: ", AMO_weth_balance.toNumber());
		
		let AMO_aweth_balance = new BigNumber(await aWETH_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO aWETH balance: ", AMO_aweth_balance.toNumber());
		
		console.log("Deposit WETH as collateral to Aave");
		await aaveAMO_instance.aaveDepositCollateral(wethInstance.address, new BigNumber("1e18"), { from:  DEPLOYER_ADDRESS});
		
		AMO_aweth_balance = new BigNumber(await aWETH_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO aWETH balance: ", AMO_aweth_balance.toNumber());
		
		let values = await aave_lending_pool_instance.getUserAccountData(aaveAMO_instance.address);
		console.log("AMO totalCollateralETH: ", BigNumber(values[0]).div(BIG18).toNumber());
		console.log("AMO totalDebtETH: ", BigNumber(values[1]).div(BIG18).toNumber());
		console.log("AMO availableBorrowsETH: ", BigNumber(values[2]).div(BIG18).toNumber());
		console.log("AMO currentLiquidationThreshold: ", BigNumber(values[3]).div(BIG18).toNumber());
		console.log("AMO ltv: ", BigNumber(values[4]).div(BIG18).toNumber());
		console.log("AMO healthFactor: ", BigNumber(values[5]).div(BIG18).toNumber());
		
		let AMO_variableDebtFRAX_balance = new BigNumber(await variableDebtFRAX_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO variableDebtFRAX balance: ", AMO_variableDebtFRAX_balance.toNumber());
		
		console.log("Borrow FRAX from Aave");
		await aaveAMO_instance.aaveBorrow(frax_instance.address, new BigNumber("1000e18"), 2, { from:  DEPLOYER_ADDRESS});
		
		AMO_variableDebtFRAX_balance = new BigNumber(await variableDebtFRAX_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO variableDebtFRAX balance: ", AMO_variableDebtFRAX_balance.toNumber());

		the_allocations = await aaveAMO_instance.showAllocations.call();
		utilities.printAllocations('Aave_AMO', the_allocations);
		
		AMO_aweth_balance = new BigNumber(await aWETH_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO aWETH balance: ", AMO_aweth_balance.toNumber());
		
		console.log("advance 1 year");
		// Advance 365 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 365; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}
		
		values = await aave_lending_pool_instance.getUserAccountData(aaveAMO_instance.address);
		console.log("AMO totalCollateralETH: ", BigNumber(values[0]).div(BIG18).toNumber());
		console.log("AMO totalDebtETH: ", BigNumber(values[1]).div(BIG18).toNumber());
		console.log("AMO availableBorrowsETH: ", BigNumber(values[2]).div(BIG18).toNumber());
		console.log("AMO currentLiquidationThreshold: ", BigNumber(values[3]).div(BIG18).toNumber());
		console.log("AMO ltv: ", BigNumber(values[4]).div(BIG18).toNumber());
		console.log("AMO healthFactor: ", BigNumber(values[5]).div(BIG18).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== REPAY BORROWED FRAX TO AAVE ====================="));
		AMO_variableDebtFRAX_balance = new BigNumber(await variableDebtFRAX_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO variableDebtFRAX balance: ", AMO_variableDebtFRAX_balance.toNumber());
		
		console.log("Transfer 1k Frax to AMO for loan interest");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// Give the AMO address some FRAX
		await frax_instance.transfer(aaveAMO_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		
		console.log("Repay FRAX to Aave");
		let repay_amount = await aaveAMO_instance.aaveRepay(frax_instance.address, new BigNumber(await variableDebtFRAX_token_instance.balanceOf.call(aaveAMO_instance.address)), 2, { from:  DEPLOYER_ADDRESS});
		
		AMO_aweth_balance = new BigNumber(await aWETH_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO aWETH balance: ", AMO_aweth_balance.toNumber());
		AMO_variableDebtFRAX_balance = new BigNumber(await variableDebtFRAX_token_instance.balanceOf.call(aaveAMO_instance.address)).div(BIG18);
		console.log("AMO variableDebtFRAX balance: ", AMO_variableDebtFRAX_balance.toNumber());
		values = await aave_lending_pool_instance.getUserAccountData(aaveAMO_instance.address);
		console.log("AMO totalCollateralETH: ", BigNumber(values[0]).div(BIG18).toNumber());
		console.log("AMO totalDebtETH: ", BigNumber(values[1]).div(BIG18).toNumber());
		console.log("AMO availableBorrowsETH: ", BigNumber(values[2]).div(BIG18).toNumber());
		console.log("AMO currentLiquidationThreshold: ", BigNumber(values[3]).div(BIG18).toNumber());
		console.log("AMO ltv: ", BigNumber(values[4]).div(BIG18).toNumber());
		console.log("AMO healthFactor: ", BigNumber(values[5]).div(BIG18).toNumber());
	});
	
});