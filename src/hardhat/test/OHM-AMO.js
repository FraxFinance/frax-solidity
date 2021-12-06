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

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");
// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");

// Misc AMOs
const OHM_AMO = artifacts.require("Misc_AMOs/OHM_AMO_V3.sol");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

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

contract('OHM AMO Tests', async (accounts) => {
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
	const ADDRESS_WITH_OHM = '0x1b9524b0F0b9F2e16b5F9e4baD331e01c2267981';
	// Curve Metapool
	let crv3Instance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_real_instance;
	let usdt_real_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let curve_amo_v3_instance;

	// AMO
	let stakedao_amo_instance;
	let ohm_amo_instance;
	let frax_amo_minter_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let ohmInstance;

	// Initialize oracle instances
	let oracle_instance_FXS_WETH;

	let pid_controller_instance;
    let reserve_tracker_instance;

	// Initialize pool instances
	let pool_instance_V3;
	
	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FXS_WETH;

	// Initialize pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FXS_WETH;
	let pair_instance_FXS_USDC;

	// Initialize pair orders
	let isToken0Frax_FRAX_WETH;
	let isToken0Frax_FRAX_USDC;
	let isToken0Fxs_FXS_WETH;

	// Initialize staking instances
	let stakingInstance_FRAX_WETH;
	let stakingInstance_FRAX_USDC;
	let stakingInstance_FXS_WETH;

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

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_real_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		// curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		// frax_3crv_metapool_instance = await MetaImplementationUSD.at(METAPOOL_ADDRESS); // can break if deployment order changes
		frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
		ohmInstance = await ERC20.at(CONTRACT_ADDRESSES.ethereum.reward_tokens.ohm);
	
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

		pid_controller_instance = await PIDController.deployed(); 
		reserve_tracker_instance = await ReserveTracker.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Initialize pool instances
		pool_instance_V3 = await FraxPoolV3.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/WETH"]);
		//pair_instance_FXS_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/USDC"]);

		// If truffle-fixture is used
		ohm_amo_instance = await OHM_AMO.deployed();

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
			params: [ADDRESS_WITH_OHM]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some OHM
		await ohmInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("300e9"), { from: ADDRESS_WITH_OHM });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_OHM]}
		);

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

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		console.log(chalk.hex("#ff8b3d").bold("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]====================="));
		// Makes sure the pool is working

		// Refresh oracle
		try{
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

		console.log(chalk.hex("#ff8b3d").bold("=========================PULL IN FRAX========================="));
		console.log("Get some FRAX from the minter");
		await frax_amo_minter_instance.mintFraxForAMO(ohm_amo_instance.address, new BigNumber("20250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const minted_balance = new BigNumber(await ohm_amo_instance.mintedBalance.call()).div(BIG18);
		console.log("minted_balance: ", minted_balance.toNumber());

		let the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================BURN SOME FRAX==========================="));
		// Test burn some FRAX
		await ohm_amo_instance.burnFRAX(new BigNumber("250e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================GET SOME OHM (SWAP FRAX FOR OHM)==========================="));
		// Note the spot price of OHM
		const spotPriceOHM = (new BigNumber((await ohm_amo_instance.spotPriceOHM.call())[1]).div(BIG6).toNumber());
		console.log(`spotPriceOHM: ${spotPriceOHM} FRAX`);

		// Convert some FRAX to OHM
		await ohm_amo_instance.swapFRAXforOHM(new BigNumber("10000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);

		
		console.log(chalk.hex("#ff8b3d").bold("=====================BOND FRAX====================="));
		// Get the FRAX and OHM balance
		const ohm_balance_bonding_before = await ohmInstance.balanceOf.call(ohm_amo_instance.address);
		const frax_balance_bonding_before = new BigNumber(await frax_instance.balanceOf.call(ohm_amo_instance.address)).div(BIG18);

		// Bond some FRAX
		await ohm_amo_instance.bondFRAX(new BigNumber("1000e18"),  { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Get the FRAX and OHM balances after
		const ohm_balance_bonding_after = await ohmInstance.balanceOf.call(ohm_amo_instance.address);
		const frax_balance_bonding_after = new BigNumber(await frax_instance.balanceOf.call(ohm_amo_instance.address)).div(BIG18);
		
		console.log(`OHM Change: ${ohm_balance_bonding_after - ohm_balance_bonding_before} OHM`);
		console.log(`FRAX Change: ${frax_balance_bonding_after - frax_balance_bonding_before} FRAX`);

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);
		
		const bondInfo = await ohm_amo_instance.bondInfo.call();
		const pendingPayout = (new BigNumber(bondInfo[0])).div(BIG9).toNumber();
		const percentVested = (new BigNumber(bondInfo[1])).div(BIG2).toNumber();
		console.log(`pendingPayout: ${pendingPayout} OHM`);
		console.log(`percentVested: ${percentVested}%`);

		
		console.log(chalk.hex("#ff8b3d").bold("===========================WAIT 5 DAYS FOR THE BOND TO MATURE==========================="));
		// Advance 5 days to mature the bond
		// Need to use blocks here
		// Assume 5760 blocks a day
		console.log("Advance 5 days");
		for (let j = 0; j < (5 * 5760); j++){
			await time.increase(15);
			await time.advanceBlock();
			if (j % 5000 == 0) console.log(`Block loop: ${j}`);
		}
		
		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);

		const bondInfo_1 = await ohm_amo_instance.bondInfo.call();
		const pendingPayout_1 = (new BigNumber(bondInfo_1[0])).div(BIG9).toNumber();
		const percentVested_1 = (new BigNumber(bondInfo_1[1])).div(BIG2).toNumber();
		console.log(`pendingPayout_1: ${pendingPayout_1} OHM`);
		console.log(`percentVested_1: ${percentVested_1}%`);


		console.log(chalk.hex("#ff8b3d").bold("=====================UNBOND / REDEEM FRAX====================="));
		// Get the FRAX and OHM balance
		const ohm_balance_redeeming_before = await ohmInstance.balanceOf.call(ohm_amo_instance.address);
		const frax_balance_redeeming_before = new BigNumber(await frax_instance.balanceOf.call(ohm_amo_instance.address)).div(BIG18);

		// Bond some FRAX
		await ohm_amo_instance.redeemBondedFRAX(0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Get the FRAX and OHM balances after
		const ohm_balance_redeeming_after = await ohmInstance.balanceOf.call(ohm_amo_instance.address);
		const frax_balance_redeeming_after = new BigNumber(await frax_instance.balanceOf.call(ohm_amo_instance.address)).div(BIG18);
		
		console.log(`OHM Change: ${ohm_balance_redeeming_after - ohm_balance_redeeming_before} OHM`);
		console.log(`FRAX Change: ${frax_balance_redeeming_after - frax_balance_redeeming_before} FRAX`);

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("=====================STAKE OHM (WITH HELPER) FOR sOHM====================="));
		// Stake OHM for sOHM
		await ohm_amo_instance.stakeOHM_WithHelper(new BigNumber("5e9"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================STAKE OHM (NO HELPER) FOR sOHM====================="));
		// Stake OHM for sOHM
		await ohm_amo_instance.stakeOHM_NoHelper(new BigNumber("5e9"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================WAIT 5 DAYS TO MATURE THE STAKE==========================="));
		// Advance 5 days to mature the stake
		// Need to use blocks here
		// Assume 5760 blocks a day
		console.log("Advance 5 days");
		for (let j = 0; j < (5 * 5760); j++){
			await time.increase(15);
			await time.advanceBlock();
			if (j % 5000 == 0) console.log(`Block loop: ${j}`);
		}

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("=====================CLAIM SOME OHM====================="));
		await ohm_amo_instance.claimOHM({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("=====================UNSTAKE sOHM FOR OHM====================="));
		// Get the sOHM balance
		const sOHM_balance_half = Math.floor((new BigNumber(await ohm_amo_instance.showSOHMRewards.call())).div(2));

		// Unstake sOHM for OHM
		await ohm_amo_instance.unstakeOHM(sOHM_balance_half, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("=====================FORFEIT SOME OHM====================="));
		await ohm_amo_instance.forfeitOHM({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("=====================TOGGLE DEPOSIT LOCK====================="));
		await ohm_amo_instance.toggleDepositLock({ from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log(chalk.hex("#ff8b3d").bold("=====================TRY TO STAKE (SHOULD FAIL)====================="));
		// Test the deposit lock
		await expectRevert.unspecified(ohm_amo_instance.stakeOHM_WithHelper(new BigNumber("1e9"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }));


		console.log(chalk.hex("#ff8b3d").bold("=====================CLAIM SOME OHM AGAIN====================="));
		await ohm_amo_instance.claimOHM({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("===========================SELL OHM FOR FRAX==========================="));
		// Get the OHM balance
		const ohm_balance_selling = await ohmInstance.balanceOf.call(ohm_amo_instance.address);

		// Convert some OHM to FRAX
		await ohm_amo_instance.swapOHMforFRAX(ohm_balance_selling, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await ohm_amo_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
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
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(ohm_amo_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d")("-----------------------"));
		console.log("Give some FRAX BACK");
		await ohm_amo_instance.burnFRAX(new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(ohm_amo_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		the_allocations = await ohm_amo_instance.showAllocations.call();
		utilities.printAllocations('OHM_AMO', the_allocations);

	});

});