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

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");
const INonfungiblePositionManager = artifacts.require("Uniswap_V3/periphery/interfaces/INonfungiblePositionManager");
const ISwapRouter = artifacts.require("Uniswap_V3/ISwapRouter");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const PIDController = artifacts.require("Oracle/PIDController.sol");
const ReserveTracker = artifacts.require("Oracle/ReserveTracker.sol");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");
// const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
// const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
// const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
// const CurveFactory = artifacts.require("Curve/Factory");
// const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");

// Misc AMOs
const UniV3LiquidityAMO_V2 = artifacts.require("Misc_AMOs/UniV3LiquidityAMO_V2");
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

contract('UniV3LiquidityAMO_V2 Tests', async (accounts) => {
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
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDT = '0xF977814e90dA44bFA03b6295A0616a897441aceC';

	// Curve Metapool
	let crv3Instance;
	let mockCRVDAOInstance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_instance;
	let usdt_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let curve_amo_v3_instance;

	// AMO
	let stakedao_amo_instance;
	let ohm_amo_instance;
	let rari_amo_instance;
	let univ3_liquidity_amo_v2_instance;

	// AMO minter
	let frax_amo_minter_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let ohmInstance;
	
	// Initialize the Uniswap Router instance
	let routerInstance; 

	// Initialize the Uniswap Factory instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;
    let uniswapV3PositionsNFTInstance;
    let univ3_position_manager_instance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	let swapRouterInstance;

	// Initialize oracle instances
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_FXS;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	let pid_controller_instance;
    let reserve_tracker_instance;

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Initialize the governance contract
	let governanceInstance;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_V3;

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
		// frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
	
		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');

		// Fill the Uniswap Router Instance
		//routerInstance = await UniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();

		pid_controller_instance = await PIDController.deployed(); 
		reserve_tracker_instance = await ReserveTracker.deployed();

		// Initialize ETH-USD Chainlink Oracle too
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();
			
		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_v3 = await FraxPoolV3.deployed();

		swapRouterInstance = await ISwapRouter.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.SwapRouter);

		univ3_liquidity_amo_v2_instance = await UniV3LiquidityAMO_V2.deployed();
		uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed();
		univ3_position_manager_instance = await INonfungiblePositionManager.at(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager);

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
			params: [ADDRESS_WITH_FRAX]}
		);

		console.log("Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX");
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("150000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		console.log("Give the COLLATERAL_FRAX_AND_FXS_OWNER address some USDC");
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("150000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]}
		);

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************


		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// const fxs_per_usd_exch_rate = (new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		// console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// // Note balances beforehand
		// const frax_balance_before_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const fxs_balance_before_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const usdc_balance_before_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// console.log(pool_instance_V3);

		// // Redeem threshold
		// console.log("Set the redeem threshold to $1.01 now so redeems work");
		// await pool_instance_V3.setPriceThresholds(1030000, 1010000, { from: POOL_CREATOR }); 

		// // Do a redeem
		// const redeem_amount = new BigNumber("1000e18");
		// console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		// await frax_instance.approve(pool_instance_USDC.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await pool_instance_V3.redeemFrax(5, redeem_amount, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Advance two blocks
		// await time.increase(20);
		// await time.advanceBlock();
		// await time.increase(20);
		// await time.advanceBlock();

		// // Collect the redemption
		// await pool_instance_V3.collectRedemption(5, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Note balances afterwards
		// const frax_balance_after_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const fxs_balance_after_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const usdc_balance_after_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		
		// // Print the changes
		// console.log(`FRAX Change: ${frax_balance_after_redeem - frax_balance_before_redeem} FRAX`);
		// console.log(`FXS Change: ${fxs_balance_after_redeem - fxs_balance_before_redeem} FXS`);
		// console.log(`USDC Change: ${usdc_balance_after_redeem - usdc_balance_before_redeem} USDC`);


		// console.log(chalk.hex("#ff8b3d").bold("====================== MINT FRAX ====================="));
		// console.log("Get some USDC from the AMO Minter");
		// await frax_amo_minter_instance.mintRedeemPart1(univ3_liquidity_amo_v2_instance.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("Get some USDC via the mint method [Part 2]");
		// await time.increase(20);
		// await time.advanceBlock();
		// await time.advanceBlock();
		// await frax_amo_minter_instance.mintRedeemPart2(univ3_liquidity_amo_v2_instance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log("");
		// console.log("UniV3 AMO dollarBalances [FRAX]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[0])).div(BIG18).toNumber());
		// console.log("UniV3 AMO dollarBalances [COLLAT]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[1])).div(BIG18).toNumber());

		// console.log("Print some info");
		// let the_allocations = await univ3_liquidity_amo_v2_instance.showAllocations.call();
  		// utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("====================== CHECK ACCOUNTING ====================="));
		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());
		

		console.log(chalk.hex("#ff8b3d").bold("====================== TEST Uni v3 NonfungiblePositionManager ====================="));
		await frax_instance.approve(univ3_position_manager_instance.address, new BigNumber("1e42"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await usdc_instance.approve(univ3_position_manager_instance.address, new BigNumber("1e30"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("accounts[1] [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6).toNumber());
		console.log("accounts[1] [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).div(BIG6).toNumber());
		console.log("(IF THIS IS ZERO, THIS IS CAUSING THE ERROR) Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());

		console.log("\n>Mint a Uni v3 position with EOA using NonfungiblePositionManager");
		const amountFRAX = "1000000000000000000000";
		const amountUSDC = "1000000000";

		await univ3_position_manager_instance.mint(
			{
				token0: frax_instance.address,
				token1: usdc_instance.address,
				fee: 500,
				tickLower: -276380,
				tickUpper: -276270,
				amount0Desired: amountFRAX,
				amount1Desired: amountUSDC,
				amount0Min: 0,
				amount1Min: 0,
				recipient: COLLATERAL_FRAX_AND_FXS_OWNER,
				deadline: 2105300114
			}, {from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("\n>mint 10k/10k Uni v3 FRAX-USDC Position");
		await univ3_liquidity_amo_v2_instance.mint(
			usdc_instance.address,
			new BigNumber("10000e6"),
			new BigNumber("10000e18"),
			500,
			-276380,
			-276270,
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_v2_instance.numPositions()).toNumber());

		const token_id_0 = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_v2_instance.address, 0)).toNumber();
		const position_0 = await univ3_position_manager_instance.positions(token_id_0);
		const liquidity_0 = new BigNumber(position_0.liquidity).toNumber();

		console.log("token_id", token_id_0);
		console.log("liquidity:", liquidity_0);
		//console.log("positions_mapping[token_id]:", await univ3_liquidity_amo_v2_instance.positions_mapping(token_id_0));
		console.log("positions_mapping[token_id].liquidity:", new BigNumber((await univ3_liquidity_amo_v2_instance.positions_mapping(token_id_0)).liquidity).toNumber());

		console.log("");
		console.log("UniV3 AMO dollarBalances [FRAX]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("UniV3 AMO dollarBalances [COLLAT]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_v2_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== WITHDRAW LIQUIDITY FROM THE NFT ====================="));
		await univ3_liquidity_amo_v2_instance.withdraw(token_id_0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_v2_instance.numPositions()).toNumber());
		
		console.log("");
		console.log("UniV3 AMO dollarBalances [FRAX]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("UniV3 AMO dollarBalances [COLLAT]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[1])).div(BIG18).toNumber());

		const token_id_0_after = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_v2_instance.address, 0)).toNumber();
		const position_0_after = await univ3_position_manager_instance.positions(token_id_0_after);
		const liquidity_0_after = new BigNumber(position_0.liquidity).toNumber();
		console.log("token_id", token_id_0_after);
		console.log("liquidity:", liquidity_0_after);


		console.log(chalk.hex("#ff8b3d").bold("====================== START USING DAI ====================="));
		console.log("\n>AMO swap 10k USDC for DAI");
		await univ3_liquidity_amo_v2_instance.swap(usdc_instance.address, daiInstance.address, 500, new BigNumber("10000e6"), 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("\n>Add DAI as a collateral")
		await univ3_liquidity_amo_instance.addCollateral(daiInstance.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		console.log("UniV3 AMO dollarBalances [FRAX]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("UniV3 AMO dollarBalances [COLLAT]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("Uni v3 AMO [USDC balance]:", new BigNumber(await usdc_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).div(BIG6).toNumber());
		console.log("Uni v3 AMO [DAI balance]:", new BigNumber(await daiInstance.balanceOf(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());

		console.log("\n>Mint 5k/5k Uni v3 FRAX-DAI Position");
		await univ3_liquidity_amo_v2_instance.mint(
			daiInstance.address,
			new BigNumber("5000e18"),
			new BigNumber("5000e18"),
			500,
			0,
			20,
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_v2_instance.numPositions()).toNumber());
		const token_id_1 = (await univ3_position_manager_instance.tokenOfOwnerByIndex(univ3_liquidity_amo_v2_instance.address, 1)).toNumber();
		const position_1 = await univ3_position_manager_instance.positions(token_id_1);
		const liquidity_1 = new BigNumber(position_1.liquidity).toNumber();
		
		console.log("token_id", token_id_1);
		console.log("liquidity:", liquidity_1);
		console.log("positions_mapping[token_id].liquidity:", new BigNumber((await univ3_liquidity_amo_v2_instance.positions_mapping(token_id_1)).liquidity).toNumber());
		
		console.log("");
		console.log("UniV3 AMO dollarBalances [FRAX]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("UniV3 AMO dollarBalances [COLLAT]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("Uni v3 AMO [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());
		console.log("Uni v3 AMO [DAI balance]:", new BigNumber(await daiInstance.balanceOf(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());
		console.log("Custodian # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(accounts[8])).toNumber());
		
		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_v2_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== Recover empty FRAX-USDC NFT ====================="));
		await univ3_liquidity_amo_v2_instance.recoverERC721(CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager, token_id_0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("");
		console.log("UniV3 AMO dollarBalances [FRAX]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[0])).div(BIG18).toNumber());
		console.log("UniV3 AMO dollarBalances [COLLAT]:", (new BigNumber((await univ3_liquidity_amo_v2_instance.dollarBalances())[1])).div(BIG18).toNumber());

		console.log("AMO # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(univ3_liquidity_amo_v2_instance.address)).toNumber());
		console.log("AMO numPositions():", new BigNumber(await univ3_liquidity_amo_v2_instance.numPositions()).toNumber());
		console.log("Custodian # of Uni v3 Positions:", new BigNumber(await univ3_position_manager_instance.balanceOf(accounts[8])).toNumber());


		console.log(chalk.hex("#ff8b3d").bold("====================== DAI APPROVAL AND ROUTING ====================="));
		console.log("\n>Approve router");
		console.log("accounts[1] [DAI balance]:", new BigNumber(await daiInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		await daiInstance.approve(swapRouterInstance.address, new BigNumber("1e42"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(swapRouterInstance.address, new BigNumber("1e42"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("\n>Swap 2k FRAX for DAI to accrue some fees to LPs");
		const amountSwapped = "2000000000000000000000";
		await swapRouterInstance.exactInputSingle({
			tokenIn: frax_instance.address,
			tokenOut: daiInstance.address,
			fee: 500,
			recipient: COLLATERAL_FRAX_AND_FXS_OWNER,
			deadline: 2105300114,
			amountIn: amountSwapped,
			amountOutMinimum: 0,
			sqrtPriceLimitX96: 0
			},
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);

		console.log(">Swap 1k DAI for FRAX to accrue some fees to LPs");
		const amountSwapped2 = "1000000000000000000000";
		await swapRouterInstance.exactInputSingle({
			tokenIn: daiInstance.address,
			tokenOut: frax_instance.address,
			fee: 500,
			recipient: COLLATERAL_FRAX_AND_FXS_OWNER,
			deadline: 2105300114,
			amountIn: amountSwapped2,
			amountOutMinimum: 0,
			sqrtPriceLimitX96: 0
			},
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);


		console.log("accounts[1] [DAI balance]:", new BigNumber(await daiInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		console.log("custodian [DAI balance]:", new BigNumber(await daiInstance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("custodian [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());

		console.log("\n>collect fees from Uni v3 AMO to investor custodian")
		await univ3_liquidity_amo_v2_instance.collectFees({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("custodian [DAI balance]:", new BigNumber(await daiInstance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());
		console.log("custodian [FRAX balance]:", new BigNumber(await frax_instance.balanceOf(INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_v2_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);

		console.log(chalk.hex("#ff8b3d").bold("===================== CHECK PROXY EXECUTE ====================="));
		// Proxy execute a token transfer
		const investor_usdc_bal_before = new BigNumber(await usdc_instance.balanceOf.call(INVESTOR_CUSTODIAN_ADDRESS));
		let calldata = hre.web3.eth.abi.encodeFunctionCall({
			name: 'transfer',
			type: 'function',
			inputs: [{ type: 'address', name: 'recipient' },{ type: 'uint256', name: 'amount'}]
		}, [INVESTOR_CUSTODIAN_ADDRESS, new BigNumber("1e0")]);

		await univ3_liquidity_amo_v2_instance.execute(usdc_instance.address, 0, calldata, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
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
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log("Give some FRAX BACK");
		await univ3_liquidity_amo_v2_instance.burnFRAX(new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		console.log("Give some USDC BACK");
		await univ3_liquidity_amo_v2_instance.giveCollatBack(new BigNumber("1000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// Sync
		await frax_amo_minter_instance.syncDollarBalances({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Minter collatDollarBalance:", new BigNumber(await frax_amo_minter_instance.collatDollarBalance.call()).div(BIG18).toNumber());
		console.log("Global Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedGlobal.call()).div(BIG18).toNumber());
		console.log("AMO Profit:", new BigNumber(await frax_amo_minter_instance.fraxTrackedAMO.call(univ3_liquidity_amo_v2_instance.address)).div(BIG18).toNumber());
		console.log("fraxDollarBalanceStored:", new BigNumber(await frax_amo_minter_instance.fraxDollarBalanceStored.call()).div(BIG18).toNumber());
		console.log("frax_mint_sum:", new BigNumber(await frax_amo_minter_instance.frax_mint_sum.call()).div(BIG18).toNumber());
		console.log("fxs_mint_sum:", new BigNumber(await frax_amo_minter_instance.fxs_mint_sum.call()).div(BIG18).toNumber());
		console.log("collat_borrowed_sum:", new BigNumber(await frax_amo_minter_instance.collat_borrowed_sum.call()).div(BIG6).toNumber());
		console.log("allAMOAddresses:", await frax_amo_minter_instance.allAMOAddresses.call());
		console.log("allAMOsLength:", new BigNumber(await frax_amo_minter_instance.allAMOsLength.call()).toNumber());

		console.log("Print some info");
		the_allocations = await univ3_liquidity_amo_v2_instance.showAllocations.call();
    	utilities.printAllocations("UniV3_Liquidity_AMO", the_allocations);


		console.log(chalk.hex("#ff8b3d").bold("====================== TEST USDT safeApprove PROBLEM ====================="));
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDT]}
		);

		console.log("Drop in some USDT into the AMO");
		await usdt_instance.transfer(univ3_liquidity_amo_instance.address, new BigNumber("10000e6"), { from: ADDRESS_WITH_USDT });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDT]}
		);

		// Do the safeApprove first for USDT
		await univ3_liquidity_amo_instance.approveTarget(swapRouterInstance.address, usdt_instance.address, 0, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER })

		// Do a test swap
		await univ3_liquidity_amo_instance.swap(
			usdt_instance.address, 
			daiInstance.address, 
			500, 
			new BigNumber("10000e6"), 
			0, 
			0, 
			{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		);
	});

});