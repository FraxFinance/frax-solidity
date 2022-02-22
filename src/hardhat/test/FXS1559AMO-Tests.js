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

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// Collateral Pools
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
// const StakingRewardsDual_FRAX3CRV = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX3CRV.sol");

// veFXS related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSYieldDistributor = artifacts.require("Staking/veFXSYieldDistributorV4");

// Misc AMOs
const FXS1559_AMO_V3 = artifacts.require("Misc_AMOs/FXS1559_AMO_V3.sol");
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

contract('FXS1559AMO-Tests', async (accounts) => {
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
	const COMPTROLLER_ADDRESS = CONTRACT_ADDRESSES.ethereum.multisigs["Comptrollers"];
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_USDC = '0x68A99f89E475a078645f4BAC491360aFe255Dff1';
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_FRAX3CRV = '0x7939f2d7e0ae5C26d4dD86859807749f87E5B5Dd';
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize oracle instances	
	let oracle_instance_FXS_WETH;

	// Initialize pool instances
	let pool_instance_V3;

	// Misc AMOs
	let fxs1559_amo_instance;
	let frax_amo_minter_instance;

	// Initialize veFXS related instances
	let veFXS_instance;
	let veFXSYieldDistributor_instance;

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
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); 

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

		// Get instances of the Uniswap pairs
		pair_instance_FXS_WETH = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FRAX/FXS"]);

		// Misc AMOs
		fxs1559_amo_instance = await FXS1559_AMO_V3.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Initialize veFXS related instances
		veFXS_instance = await veFXS.deployed();
		veFXSYieldDistributor_instance = await veFXSYieldDistributor.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// ================================================================
	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Initialization========================="));
		console.log("----------------------------");

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("==============NOTE INFO BEFORE===============");

		// Note the collatDollarBalances
		console.log("FXS1559 AMO collatDollarBalance:", new BigNumber((await fxs1559_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("=====================NOTE SOME STARTING BALANCES====================="));
		// Note the collatDollarBalance before
		const gcv_bal_start = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();
		console.log("gcv_bal_start: ", gcv_bal_start);

		// Note the FraxPoolV3 Balance too
		const pool_usdc_bal_start = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		console.log("pool_usdc_bal_start: ", pool_usdc_bal_start);


		console.log(chalk.hex("#ff8b3d").bold("=========================RUN A MANUAL SWAP BURN========================="));

		const the_owner = await fxs1559_amo_instance.owner.call();
		console.log("the_owner: ", the_owner);
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER: ", COLLATERAL_FRAX_AND_FXS_OWNER);
		console.log("Get some FRAX from the minter");

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await frax_amo_minter_instance.mintFraxForAMO(fxs1559_amo_instance.address, new BigNumber("5000000e18"), { from: COMPTROLLER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await fxs1559_amo_instance.swapBurn(new BigNumber('25000e6') , true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("==============NOTE INFO AFTER===============");

		// Note the collatDollarBalances
		console.log("FXS1559 AMO collatDollarBalance:", new BigNumber((await fxs1559_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log(chalk.blue("****************************************"));

		console.log("==============NOTE CR INFO BEFORE===============");
		console.log(chalk.hex("#ff8b3d").bold("-------DUMP IN SOME USDC TO INCREASE THE EXCESS COLLATERAL-------"));
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});

		await usdc_instance.transfer(pool_instance_V3.address, new BigNumber("1000000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		const fxs_supply_before = new BigNumber(await fxs_instance.totalSupply()).div(BIG18).toNumber();
		const yield_distributor_FXS_before = new BigNumber(await fxs_instance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("fxs_supply before: ", fxs_supply_before);
		console.log("yield_distributor_FXS_before: ", yield_distributor_FXS_before);

		// console.log(chalk.hex("#ff8b3d").bold("=========================RUN A MINT_SWAP_BURN CYCLE [NO OVERRIDE]========================="));

		// console.log(chalk.hex("#ff8b3d").bold("-------------DUMP IN SOME FRAX-------------"));
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_FRAX]
		// });

		// await frax_instance.transfer(fxs1559_amo_instance.address, new BigNumber("600000e18"), { from: ADDRESS_WITH_FRAX });

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_FRAX]
		// });

		// // 1st parameter doesn't matter here
		// await fxs1559_amo_instance.swapBurn(0, false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("==============NOTE INFO===============");

		// // Note the collatDollarBalances
		// console.log("FXS1559 AMO collatDollarBalance:", new BigNumber((await fxs1559_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		// console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		// console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());

		// console.log(chalk.blue("****************************************"));

		console.log("====================CHECK ERC20 RECOVER===================");
		const frax_balance_before_emergency = new BigNumber(await frax_instance.balanceOf.call(fxs1559_amo_instance.address)).div(BIG18);
		console.log("FRAX balance before emergency: ", frax_balance_before_emergency.toNumber());
		await fxs1559_amo_instance.recoverERC20(frax_instance.address, new BigNumber("1e15"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_balance_after_emergency = new BigNumber(await frax_instance.balanceOf.call(fxs1559_amo_instance.address)).div(BIG18);
		console.log("FRAX balance after emergency: ", frax_balance_after_emergency.toNumber());
		console.log("FRAX withdrawn: ", frax_balance_before_emergency.toNumber() - frax_balance_after_emergency.toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await fxs1559_amo_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const investor_usdc_bal_after = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));


		// console.log(chalk.hex("#ff8b3d").bold("===================== SEE AND GIVE BACK PROFITS ====================="));

		// // Sync
		// await frax_amo_minter_instance.syncDollarBalances({ from: COMPTROLLER_ADDRESS });

		// console.log("FXS1559 AMO collatDollarBalance:", new BigNumber((await fxs1559_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		// console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		// console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		// console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		// console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(fxs1559_amo_instance.address)).div(BIG18).toNumber());
		// console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		// console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		// console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		// console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		// console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		// console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		// console.log(chalk.hex("#ff8b3d")("-----------------------"));
		// console.log("Give all FRAX back");
		// const amo_frax_bal = new BigNumber(await frax_instance.balanceOf.call(fxs1559_amo_instance.address));
		// await fxs1559_amo_instance.burnFRAX(amo_frax_bal, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// console.log(chalk.hex("#ff8b3d")("-----------------------"));

		// // Sync
		// await frax_amo_minter_instance.syncDollarBalances({ from: COMPTROLLER_ADDRESS });

		// // Note the FraxPoolV3 balance and collatDollarBalance after
		// const pool_usdc_bal_end = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_V3.address)).div(BIG6).toNumber();
		// const gcv_bal_end = new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber();

		// console.log("FXS1559 AMO collatDollarBalance:", new BigNumber((await fxs1559_amo_instance.dollarBalances.call())[1]).div(BIG18).toNumber());
		// console.log("FraxPoolV3 collatDollarBalance:", new BigNumber(await pool_instance_V3.collatDollarBalance.call()).div(BIG18).toNumber());
		// console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		// console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		// console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(fxs1559_amo_instance.address)).div(BIG18).toNumber());
		// console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		// console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		// console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		// console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		// console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		// console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK SANITY VALUES ====================="));
		console.log("gcv_bal_end: ", gcv_bal_end);
		console.log("pool_usdc_bal_end: ", pool_usdc_bal_end);
		console.log("globalCollateralValue Total Change [includes Rari, etc profits!]:", gcv_bal_end - gcv_bal_start);
		console.log("FraxPoolV3 USDC Balance Change:", pool_usdc_bal_end - pool_usdc_bal_start);
	});

	it("Fail Tests ", async () => {

	});
	
});