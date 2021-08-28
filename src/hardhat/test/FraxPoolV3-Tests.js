const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require("chai");

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");
const e = require('express');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const ERC20 = artifacts.require("ERC20/ERC20");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Saddle related
const ISaddleD4_LP = artifacts.require("Misc_AMOs/saddle/ISaddleD4_LP");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles

const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");

const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink-based. Eliminates the need for FRAX/WETH and FXS/WETH liquidity
const FXSOracleWrapper = artifacts.require("Oracle/FXSOracleWrapper");
const FRAXOracleWrapper = artifacts.require("Oracle/FRAXOracleWrapper");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const StakingRewardsDualV5_FRAX_OHM = artifacts.require("Staking/Variants/StakingRewardsDualV5_FRAX_OHM");
const CommunalFarm_SaddleD4 = artifacts.require("Staking/Variants/CommunalFarm_SaddleD4");
const FraxUniV3Farm_Stable_FRAX_USDC = artifacts.require("Staking/Variants/FraxUniV3Farm_Stable_FRAX_USDC");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
const IQToken = artifacts.require("ERC20/Variants/IQToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// veFXS related
const veFXS = artifacts.require("Curve/IveFXS");

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const COLLATERAL_SEED_DEC6 = new BigNumber(508500e6);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
const THREE_THOUSAND_DEC6 = new BigNumber(3000e6);
const BIG6 = new BigNumber("1e6");
const BIG12 = new BigNumber("1e12");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FraxPoolV3-Tests', async (accounts) => {
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
	let MIGRATOR_ADDRESS;

	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_USDC = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_LUSD1 = '0x6914FC70fAC4caB20a8922E900C4BA57fEECf8E1';
	const ADDRESS_WITH_LUSD2 = '0x6914FC70fAC4caB20a8922E900C4BA57fEECf8E1';
	const ADDRESS_WITH_sUSD = '0xa5f7a39E55D7878bC5bd754eE5d6BD7a7662355b';
	const ADDRESS_WITH_USDP1 = '0x2cD9e6e76725739208F5Cc7b4B2d7629BF006c0d';
	const ADDRESS_WITH_USDP2 = '0xf0c5ed4e9c62fd017681edc576cd5e0dcc5cab52';
	const ADDRESS_WITH_wUST = '0xeB2629a2734e272Bcc07BDA959863f316F4bD4Cf';
	const ADDRESS_WITH_FEI = '0xc803698a4BE31F0B9035B6eBA17623698f3E2F82';

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;
	let iq_instance;
	let lusd_instance;
	let susd_instance;
	let usdp_instance;
	let wust_instance;
	let fei_instance;
	let mockFRAX3CRVInstance;
	
	// Initialize the Uniswap Router Instance
	let routerInstance; 

	// Initialize the Uniswap Factory Instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;

	// Initialize the Uniswap V3 Positions NFT
	let uniswapV3PositionsNFTInstance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	// Initialize oracle instances
	const START_WITH_ORACLE_WRAPPERS = false;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Chainlink oracle wrappers
	let frax_oracle_wrapper_instance;
	let fxs_oracle_wrapper_instance;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_v3;
	
	// Initialize pair addresses
	let pair_addr_FRAX_WETH;
	let pair_addr_FRAX_USDC;
	let pair_addr_FXS_WETH;

	// Initialize Uniswap pair contracts
	let pair_instance_FRAX_WETH;
	let pair_instance_FRAX_USDC;
	let pair_instance_FXS_WETH;
	let pair_instance_FRAX_IQ;

	// Initialize Sushi pair contracts
	let pair_instance_FRAX_FXS_Sushi;
	let pair_instance_FXS_WETH_Sushi;

	// Initialize Saddle pair contracts
	let pair_instance_Saddle_D4;

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
	// let stakingInstanceDual_FRAX3CRV;
	// let stakingInstanceDualV2_FRAX3CRV_V2;
	// let stakingInstanceDualV5_FRAX_OHM;
	let communalFarmInstance_Saddle_D4; 
	// let fraxFarmInstance_FRAX_USDC;

	// Initialize veFXS instance
	let veFXS_instance;
	

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
		MIGRATOR_ADDRESS = accounts[10];

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		iq_instance = await IQToken.deployed();
		lusd_instance = await ERC20.at("0x5f98805A4E8be255a32880FDeC7F6728C6568bA0");
		susd_instance = await ERC20.at("0x57ab1ec28d129707052df4df418d58a2d46d5f51");
		usdp_instance = await ERC20.at("0x1456688345527bE1f37E9e627DA0837D6f08C925");
		wust_instance = await ERC20.at("0xa47c8bf37f92abed4a126bda807a7b7498661acd");
		fei_instance = await ERC20.at("0x956F47F50A910163D8BF957Cf5846D573E7f87CA");

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();

		// Chainlink oracles
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();
		frax_oracle_wrapper_instance = await FRAXOracleWrapper.deployed();
		fxs_oracle_wrapper_instance = await FXSOracleWrapper.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		pool_instance_v3 = await FraxPoolV3.deployed();
		
		// Initialize the Uniswap Factory Instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Fill the Uniswap V3 Instances
		uniswapV3PositionsNFTInstance = await IUniswapV3PositionsNFT.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		// pair_instance_FXS_USDC = await IUniswapV2Pair.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Uniswap FXS/USDC"]);

		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// uniswapV3PositionsNFTInstance = await FRAX3CRV_Mock.deployed(); 

		// Fill the staking rewards instances
		// stakingInstanceDualV5_FRAX_OHM = await StakingRewardsDualV5_FRAX_OHM.deployed();
		communalFarmInstance_Saddle_D4 = await CommunalFarm_SaddleD4.deployed();
		// fraxFarmInstance_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deployed();

		// veFXS_instance = await veFXS.deployed();

		
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	it('Initialization related', async () => {
		console.log("=========================Initialization=========================")

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("------------------------------------------------");
		console.log("Give the minter some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(accounts[9], new BigNumber("125000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some LUSD [Address #1]");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LUSD1]
		});

		await lusd_instance.transfer(accounts[9], new BigNumber("60000e18"), { from: ADDRESS_WITH_LUSD1 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LUSD1]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some LUSD [Address #2]");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LUSD2]
		});

		await lusd_instance.transfer(accounts[9], new BigNumber("80000e18"), { from: ADDRESS_WITH_LUSD2 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LUSD2]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some sUSD");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_sUSD]
		});

		await susd_instance.transfer(accounts[9], new BigNumber("125000e18"), { from: ADDRESS_WITH_sUSD });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_sUSD]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some USDP [Address #1]");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDP1]
		});

		await usdp_instance.transfer(accounts[9], new BigNumber("50000e18"), { from: ADDRESS_WITH_USDP1 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDP1]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some USDP [Address #2]");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDP2]
		});

		await usdp_instance.transfer(accounts[9], new BigNumber("40000e18"), { from: ADDRESS_WITH_USDP2 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDP2]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some wUST");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_wUST]
		});

		await wust_instance.transfer(accounts[9], new BigNumber("125000e18"), { from: ADDRESS_WITH_wUST });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_wUST]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some FEI");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FEI]
		});

		await fei_instance.transfer(accounts[9], new BigNumber("125000e18"), { from: ADDRESS_WITH_FEI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FEI]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some USDC");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});

		await usdc_instance.transfer(accounts[9], new BigNumber("125000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		console.log("Adding pool_instance_v3 as a valid pool");
		await frax_instance.addPool(pool_instance_v3.address, { from: ORIGINAL_FRAX_ONE_ADDRESS });


		console.log(chalk.hex('#ffa500')("---------- Do a huge mint to open up a recollat for later ----------"));

		console.log("Add pool");
		await frax_instance.addPool(accounts[9], { from: ORIGINAL_FRAX_ONE_ADDRESS });

		console.log("Mint to a non-used address");
		await frax_instance.pool_mint(accounts[11], new BigNumber("1000000e18"), { from: accounts[9] });
		
		console.log("Remove pool");
		await frax_instance.removePool(accounts[9], { from: ORIGINAL_FRAX_ONE_ADDRESS });

		console.log(chalk.hex('#ffa500')("--------------------"));

		console.log("Setting pool parameters");
		await pool_instance_v3.setPoolParameters(0, 2, { from: POOL_CREATOR });

		console.log("Set LUSD price to $1.01");
		await pool_instance_v3.setCollateralPrice(0, new BigNumber("1010000"), { from: POOL_CREATOR });

		console.log("Set sUSD price to $1.005");
		await pool_instance_v3.setCollateralPrice(1, new BigNumber("1005000"), { from: POOL_CREATOR });

		console.log("Set specific fees for LUSD");
		await pool_instance_v3.setFees(0, 4500, 6250, 7500, 7500,  { from: POOL_CREATOR });


		console.log(chalk.hex('#ffa500')("---------- Optionally set the the oracle to the wrappers ----------"));
		if(START_WITH_ORACLE_WRAPPERS){
			console.log(chalk.hex.green("USING WRAPPED ORACLES EARLY"));
			console.log("Set FRAX.sol to use the FRAXOracleWrapper for FRAX pricing");
			await frax_instance.setFRAXEthOracle(frax_oracle_wrapper_instance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", { from: ORIGINAL_FRAX_ONE_ADDRESS });
			console.log("FRAX price (raw):", new BigNumber(await frax_instance.frax_price()).toNumber());
			console.log("FRAX price:", new BigNumber(await frax_instance.frax_price()).div(BIG6).toNumber());

			console.log("Set FRAX.sol to use the FXSOracleWrapper for FXS pricing");
			await frax_instance.setFXSEthOracle(fxs_oracle_wrapper_instance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", { from: ORIGINAL_FRAX_ONE_ADDRESS });
			console.log("FXS price (raw):", new BigNumber(await frax_instance.fxs_price()).toNumber());
			console.log("FXS price:", new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		}
		else {
			console.log(chalk.red.bold("USING WRAPPED ORACLES LATE"));
			// Do nothing
		}
	});

	it('Main tests', async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ MINTING TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125000e6"), { from: accounts[9] });

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#ffa500')("---------- Prepare to mint ----------"));
		const SLIPPAGE_MULTIPLIER = .975;
		const FRAX_AMOUNT = new BigNumber("10000e18");
		const FRAX_OUT_MIN = FRAX_AMOUNT.multipliedBy(SLIPPAGE_MULTIPLIER).integerValue(BigNumber.ROUND_FLOOR);
		const global_cr = new BigNumber(await frax_instance.global_collateral_ratio());
		const fxs_price = new BigNumber(await frax_instance.fxs_price());
		const frax_price = new BigNumber(await frax_instance.frax_price());

		console.log("global_cr:", global_cr.div(BIG6).toNumber());
		console.log("fxs_price:", fxs_price.div(BIG6).toNumber());
		console.log("frax_price:", frax_price.div(BIG6).toNumber());

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		console.log("Set the mint threshold to $0.99 now so mints work");
		await pool_instance_v3.setPriceThresholds(990000, 980000, { from: POOL_CREATOR }); 
		
		console.log(chalk.hex('#ffa500')("---------- Print collateral info ----------"));
		await utilities.printCollateralInfo(pool_instance_v3, lusd_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, susd_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, usdp_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, wust_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, fei_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, usdc_instance.address);

		console.log(chalk.hex('#2eb6ea')("---------- Mint FRAX with LUSD and FXS ----------"));
		const lusd_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_lusd))).div(BIG6);
		console.log("lusd_price: ", lusd_price.toNumber());

		let frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let lusd_balance_before_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_lusd, FRAX_AMOUNT)).div(BIG18).toNumber())
		const lusd_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_lusd, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_lusd, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let lusd_balance_after_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("total_frax_mint: ", new BigNumber(lusd_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(lusd_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(lusd_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_0.minus(lusd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Mint FRAX with sUSD and FXS ----------"));
		const susd_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_susd))).div(BIG6);
		console.log("susd_price: ", susd_price.toNumber());

		let frax_balance_before_1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let susd_balance_before_1 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_susd, FRAX_AMOUNT)).div(BIG18).toNumber())
		const susd_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_susd, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_susd, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let susd_balance_after_1 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(susd_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(susd_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(susd_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_1.minus(frax_balance_before_1).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_1.minus(susd_balance_before_1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_1.minus(fxs_balance_before_1).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Mint FRAX with USDP and FXS ----------"));
		const usdp_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_usdp))).div(BIG6);
		console.log("usdp_price: ", usdp_price.toNumber());

		let frax_balance_before_2 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdp_balance_before_2 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_2 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdp, FRAX_AMOUNT)).div(BIG18).toNumber())
		const usdp_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_usdp, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_usdp, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_2 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdp_balance_after_2 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_2 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(usdp_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(usdp_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(usdp_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_2.minus(frax_balance_before_2).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_2.minus(usdp_balance_before_2).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_2.minus(fxs_balance_before_2).div(BIG18).toNumber());

		console.log(chalk.hex('#5493f7')("---------- Mint FRAX with wUST and FXS ----------"));
		const wust_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_wust))).div(BIG6);
		console.log("wust_price: ", wust_price.toNumber());

		let frax_balance_before_3 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let wust_balance_before_3 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_3 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Refresh oracle
		try {
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_wust, FRAX_AMOUNT)).div(BIG18).toNumber())
		const wust_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_wust, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_wust, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_3 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let wust_balance_after_3 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_3 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(wust_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(wust_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(wust_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_3.minus(frax_balance_before_3).div(BIG18).toNumber());
		console.log("wUST change: ", wust_balance_after_3.minus(wust_balance_before_3).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_3.minus(fxs_balance_before_3).div(BIG18).toNumber());

		console.log(chalk.hex('#22996e')("---------- Mint FRAX with FEI and FXS ----------"));
		const fei_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_fei))).div(BIG6);
		console.log("fei_price: ", fei_price.toNumber());

		let frax_balance_before_4 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let fei_balance_before_4 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_4 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_fei, FRAX_AMOUNT)).div(BIG18).toNumber())
		const fei_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_fei, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_fei, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_4 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let fei_balance_after_4 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_4 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(fei_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(fei_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(fei_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_4.minus(frax_balance_before_4).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_4.minus(fei_balance_before_4).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_4.minus(fxs_balance_before_4).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Mint FRAX with USDC and FXS ----------"));
		const usdc_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_usdc))).div(BIG6);
		console.log("usdc_price: ", usdc_price.toNumber());

		let frax_balance_before_5 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdc_balance_before_5 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_5 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdc, FRAX_AMOUNT)).div(BIG6).toNumber())
		const usdc_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_usdc, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_usdc, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_5 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdc_balance_after_5 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_5 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(usdc_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(usdc_mint_result_CALL[1]).div(BIG6).toNumber());
		console.log("fxs_needed: ", new BigNumber(usdc_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_5.minus(frax_balance_before_5).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_5.minus(usdc_balance_before_5).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_5.minus(fxs_balance_before_5).div(BIG18).toNumber());


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ REDEEM TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for redeems
		await frax_instance.approve(pool_instance_v3.address, new BigNumber("50000e18"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to redeem ----------"));
		const FRAX_AMOUNT_RDM = new BigNumber("1000e18");
		const FRAX_AMOUNT_RDM_SLIPPED = FRAX_AMOUNT_RDM.multipliedBy(SLIPPAGE_MULTIPLIER);
		const FRAX_FOR_COLLAT_RDM = FRAX_AMOUNT_RDM_SLIPPED.multipliedBy(global_cr).div(BIG6).integerValue(BigNumber.ROUND_FLOOR);
		const FRAX_FOR_FXS_RDM = FRAX_AMOUNT_RDM_SLIPPED.minus(FRAX_FOR_COLLAT_RDM);
		const FXS_OUT_MIN_RDM = FRAX_FOR_FXS_RDM.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);

		console.log(chalk.hex('#2eb6ea')("---------- Redeem FRAX for LUSD and FXS ----------"));
		const COL_OUT_MIN_LUSD = await pool_instance_v3.getFRAXInCollateral.call(col_idx_lusd, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_before_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		

		console.log(chalk.hex('#ffa500')("--- Try redeeming with too high a FRAX price [SHOULD FAIL] ---"));
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_lusd, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_LUSD, { from: accounts[9] }),
			"Frax price too high"
		);

		console.log("Set the redeem threshold to $1.01 now so redeems work");
		await pool_instance_v3.setPriceThresholds(1030000, 1010000, { from: POOL_CREATOR }); 
		const lusd_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_lusd, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_LUSD, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_lusd, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_LUSD, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_lusd, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_lusd, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_after_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(lusd_redeem_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_out: ", new BigNumber(lusd_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_0.minus(lusd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Redeem FRAX for sUSD and FXS ----------"));
		const COL_OUT_MIN_sUSD = await pool_instance_v3.getFRAXInCollateral.call(col_idx_susd, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_before_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const susd_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_susd, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_sUSD, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_susd, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_sUSD, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_susd, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_susd, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_after_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(susd_redeem_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_out: ", new BigNumber(susd_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_0.minus(susd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Redeem FRAX for USDP and FXS ----------"));
		const COL_OUT_MIN_USDP = await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdp, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_before_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdp_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_usdp, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_USDP, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_usdp, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_USDP, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_usdp, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_usdp, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_after_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(usdp_redeem_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_out: ", new BigNumber(usdp_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_0.minus(usdp_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#5493f7')("---------- Redeem FRAX for wUST and FXS ----------"));
		const COL_OUT_MIN_wUST = await pool_instance_v3.getFRAXInCollateral.call(col_idx_wust, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		wust_balance_before_0 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const wust_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_wust, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_wUST, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_wust, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_wUST, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_wust, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_wust, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		wust_balance_after_0 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(wust_redeem_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_out: ", new BigNumber(wust_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("wUST change: ", wust_balance_after_0.minus(wust_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		// Refresh oracle
		try {
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#22996e')("---------- Redeem FRAX for FEI and FXS ----------"));
		const COL_OUT_MIN_FEI = await pool_instance_v3.getFRAXInCollateral.call(col_idx_fei, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_before_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const fei_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_fei, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_FEI, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_fei, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_FEI, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_fei, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_fei, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_after_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(fei_redeem_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_out: ", new BigNumber(fei_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_0.minus(fei_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Redeem FRAX for USDC and FXS ----------"));
		const COL_OUT_MIN_USDC = await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdc, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_before_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdc_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_usdc, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_USDC, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_usdc, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_USDC, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_usdc, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_usdc, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_after_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(usdc_redeem_result_CALL[0]).div(BIG6).toNumber());
		console.log("fxs_out: ", new BigNumber(usdc_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_0.minus(usdc_balance_before_0).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ RECOLLAT TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for recollats
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("1000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("1000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("1000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("1000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("1000e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("1000e6"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to recollat ----------"));
		const COLLAT_AMT_RCLT = new BigNumber("1000e18");
		const COLLAT_AMT_RCLT_SLIPPED = COLLAT_AMT_RCLT.multipliedBy(SLIPPAGE_MULTIPLIER);
		const COLLAT_AMT_RCLT_E6 = new BigNumber("1000e6");
		const COLLAT_AMT_RCLT_E6_SLIPPED = COLLAT_AMT_RCLT_E6.multipliedBy(SLIPPAGE_MULTIPLIER);
		const COLLAT_AMT_LUSD_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(lusd_price);
		const COLLAT_AMT_sUSD_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(susd_price);
		const COLLAT_AMT_USDP_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(usdp_price);
		const COLLAT_AMT_wUST_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(wust_price);
		const COLLAT_AMT_FEI_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(fei_price);
		const COLLAT_AMT_USDC_RCLT_DV = COLLAT_AMT_RCLT_E6_SLIPPED.multipliedBy(usdc_price);
		const FXS_OUT_MIN_LUSD_RCLT = COLLAT_AMT_LUSD_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_sUSD_RCLT = COLLAT_AMT_sUSD_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_USDP_RCLT = COLLAT_AMT_USDP_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_wUST_RCLT = COLLAT_AMT_wUST_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_FEI_RCLT = COLLAT_AMT_FEI_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_USDC_RCLT = COLLAT_AMT_USDC_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		console.log("FXS_OUT_MIN_LUSD_RCLT: ", FXS_OUT_MIN_LUSD_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_sUSD_RCLT: ", FXS_OUT_MIN_sUSD_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_USDP_RCLT: ", FXS_OUT_MIN_USDP_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_wUST_RCLT: ", FXS_OUT_MIN_wUST_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_FEI_RCLT: ", FXS_OUT_MIN_FEI_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_USDC_RCLT: ", FXS_OUT_MIN_USDC_RCLT.div(BIG6).toNumber());

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#2eb6ea')("---------- Recollat with LUSD for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_before_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const lusd_recollat_result_CALL = await pool_instance_v3.recollateralizeFrax.call(col_idx_lusd, COLLAT_AMT_RCLT, FXS_OUT_MIN_LUSD_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralizeFrax(col_idx_lusd, COLLAT_AMT_RCLT, FXS_OUT_MIN_LUSD_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_after_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collateral_units_precision: ", new BigNumber(lusd_recollat_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_paid_back: ", new BigNumber(lusd_recollat_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_0.minus(lusd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Recollat with sUSD for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_before_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const susd_recollat_result_CALL = await pool_instance_v3.recollateralizeFrax.call(col_idx_susd, COLLAT_AMT_RCLT, FXS_OUT_MIN_sUSD_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralizeFrax(col_idx_susd, COLLAT_AMT_RCLT, FXS_OUT_MIN_sUSD_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_after_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collateral_units_precision: ", new BigNumber(susd_recollat_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_paid_back: ", new BigNumber(susd_recollat_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_0.minus(susd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Recollat with USDP for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_before_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdp_recollat_result_CALL = await pool_instance_v3.recollateralizeFrax.call(col_idx_usdp, COLLAT_AMT_RCLT, FXS_OUT_MIN_USDP_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralizeFrax(col_idx_usdp, COLLAT_AMT_RCLT, FXS_OUT_MIN_USDP_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_after_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collateral_units_precision: ", new BigNumber(usdp_recollat_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_paid_back: ", new BigNumber(usdp_recollat_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_0.minus(usdp_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#5493f7')("---------- Recollat with wUST for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		wust_balance_before_0 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const wust_recollat_result_CALL = await pool_instance_v3.recollateralizeFrax.call(col_idx_wust, COLLAT_AMT_RCLT, FXS_OUT_MIN_wUST_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralizeFrax(col_idx_wust, COLLAT_AMT_RCLT, FXS_OUT_MIN_wUST_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		wust_balance_after_0 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collateral_units_precision: ", new BigNumber(wust_recollat_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_paid_back: ", new BigNumber(wust_recollat_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("wUST change: ", wust_balance_after_0.minus(wust_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#22996e')("---------- Recollat with FEI for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_before_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const fei_recollat_result_CALL = await pool_instance_v3.recollateralizeFrax.call(col_idx_fei, COLLAT_AMT_RCLT, FXS_OUT_MIN_FEI_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralizeFrax(col_idx_fei, COLLAT_AMT_RCLT, FXS_OUT_MIN_FEI_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_after_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collateral_units_precision: ", new BigNumber(fei_recollat_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_paid_back: ", new BigNumber(fei_recollat_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_0.minus(fei_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Recollat with USDC for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_before_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdc_recollat_result_CALL = await pool_instance_v3.recollateralizeFrax.call(col_idx_usdc, COLLAT_AMT_RCLT_E6, FXS_OUT_MIN_USDC_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralizeFrax(col_idx_usdc, COLLAT_AMT_RCLT_E6, FXS_OUT_MIN_USDC_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_after_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collateral_units_precision: ", new BigNumber(usdc_recollat_result_CALL[0]).div(BIG6).toNumber());
		console.log("fxs_paid_back: ", new BigNumber(usdc_recollat_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_0.minus(usdc_balance_before_0).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ BUYBACK TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for buybacks
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("10000e18"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to buyback ----------"));
		const FXS_AMT_BBK = new BigNumber("1000e18");
		const FXS_AMT_BBK_SLIPPED = FXS_AMT_BBK.multipliedBy(SLIPPAGE_MULTIPLIER);
		const FXS_AMT_BBK_DV = FXS_AMT_BBK_SLIPPED.multipliedBy(fxs_price).div(BIG6);
		const COL_OUT_MIN_LUSD_BBK = FXS_AMT_BBK_DV.div(lusd_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_sUSD_BBK = FXS_AMT_BBK_DV.div(susd_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_USDP_BBK = FXS_AMT_BBK_DV.div(usdp_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_wUST_BBK = FXS_AMT_BBK_DV.div(wust_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_FEI_BBK = FXS_AMT_BBK_DV.div(fei_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_USDC_BBK = FXS_AMT_BBK_DV.div(usdc_price).div(BIG12).integerValue(BigNumber.ROUND_FLOOR);
		console.log("COL_OUT_MIN_LUSD_BBK: ", COL_OUT_MIN_LUSD_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_sUSD_BBK: ", COL_OUT_MIN_sUSD_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_USDP_BBK: ", COL_OUT_MIN_USDP_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_wUST_BBK: ", COL_OUT_MIN_wUST_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_FEI_BBK: ", COL_OUT_MIN_FEI_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_USDC_BBK: ", COL_OUT_MIN_USDC_BBK.div(BIG6).toNumber());

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("------------------------------------------------");
		console.log("Dump USDC into the old pool contract so a buyback opens up");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});

		await usdc_instance.transfer(pool_instance_USDC.address, new BigNumber("5000000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		console.log(chalk.hex('#2eb6ea')("---------- Buyback LUSD with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_before_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const lusd_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_lusd, FXS_AMT_BBK, COL_OUT_MIN_LUSD_BBK, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_lusd, FXS_AMT_BBK, COL_OUT_MIN_LUSD_BBK, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_after_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(lusd_buyback_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_0.minus(lusd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Buyback sUSD with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_before_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const susd_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_susd, FXS_AMT_BBK, COL_OUT_MIN_sUSD_BBK, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_susd, FXS_AMT_BBK, COL_OUT_MIN_sUSD_BBK, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_after_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(susd_buyback_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_0.minus(susd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Buyback USDP with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_before_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdp_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_usdp, FXS_AMT_BBK, COL_OUT_MIN_USDP_BBK, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_usdp, FXS_AMT_BBK, COL_OUT_MIN_USDP_BBK, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_after_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(usdp_buyback_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_0.minus(usdp_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#5493f7')("---------- Buyback wUST with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		wust_balance_before_0 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const wust_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_wust, FXS_AMT_BBK, COL_OUT_MIN_wUST_BBK, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_wust, FXS_AMT_BBK, COL_OUT_MIN_wUST_BBK, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		wust_balance_after_0 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(wust_buyback_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("wUST change: ", wust_balance_after_0.minus(wust_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#22996e')("---------- Buyback FEI with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_before_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const fei_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_fei, FXS_AMT_BBK, COL_OUT_MIN_FEI_BBK, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_fei, FXS_AMT_BBK, COL_OUT_MIN_FEI_BBK, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_after_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(fei_buyback_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_0.minus(fei_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Buyback USDC with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_before_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdc_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_usdc, FXS_AMT_BBK, 0, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_usdc, FXS_AMT_BBK, 0, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_after_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(usdc_buyback_result_CALL).div(BIG6).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_0.minus(usdc_balance_before_0).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

	});

	it('Mint 1-to-1 override tests', async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ MINTING TESTS (1-TO-1 OVERRIDE) ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125000e6"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to mint 1-to-1 ----------"));
		const SLIPPAGE_MULTIPLIER = .975;
		const FRAX_AMOUNT = new BigNumber("10000e18");
		const FRAX_OUT_MIN = FRAX_AMOUNT.multipliedBy(SLIPPAGE_MULTIPLIER).integerValue(BigNumber.ROUND_FLOOR);
		const global_cr = new BigNumber(await frax_instance.global_collateral_ratio());
		const fxs_price = new BigNumber(await frax_instance.fxs_price());
		const frax_price = new BigNumber(await frax_instance.frax_price());

		console.log("global_cr:", global_cr.div(BIG6).toNumber());
		console.log("fxs_price:", fxs_price.div(BIG6).toNumber());
		console.log("frax_price:", frax_price.div(BIG6).toNumber());

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		console.log("Set the mint threshold to $0.99 now so mints work");
		await pool_instance_v3.setPriceThresholds(990000, 980000, { from: POOL_CREATOR }); 

		console.log(chalk.hex('#2eb6ea')("---------- Mint FRAX with LUSD (1-to-1 override) ----------"));
		let frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let lusd_balance_before_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_lusd, FRAX_AMOUNT)).div(BIG18).toNumber())
		const lusd_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_lusd, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_lusd, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });

		let frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let lusd_balance_after_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("total_frax_mint: ", new BigNumber(lusd_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(lusd_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(lusd_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_0.minus(lusd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Mint FRAX with sUSD (1-to-1 override) ----------"));
		let frax_balance_before_1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let susd_balance_before_1 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_susd, FRAX_AMOUNT)).div(BIG18).toNumber())
		const susd_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_susd, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_susd, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });

		let frax_balance_after_1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let susd_balance_after_1 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(susd_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(susd_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(susd_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_1.minus(frax_balance_before_1).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_1.minus(susd_balance_before_1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_1.minus(fxs_balance_before_1).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Mint FRAX with USDP (1-to-1 override) ----------"));
		let frax_balance_before_2 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdp_balance_before_2 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_2 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdp, FRAX_AMOUNT)).div(BIG18).toNumber())
		const usdp_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_usdp, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_usdp, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });

		let frax_balance_after_2 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdp_balance_after_2 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_2 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(usdp_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(usdp_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(usdp_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_2.minus(frax_balance_before_2).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_2.minus(usdp_balance_before_2).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_2.minus(fxs_balance_before_2).div(BIG18).toNumber());

		console.log(chalk.hex('#5493f7')("---------- Mint FRAX with wUST (1-to-1 override) ----------"));
		let frax_balance_before_3 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let wust_balance_before_3 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_3 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_wust, FRAX_AMOUNT)).div(BIG18).toNumber())
		const wust_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_wust, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_wust, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });

		let frax_balance_after_3 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let wust_balance_after_3 = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_3 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(wust_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(wust_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(wust_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_3.minus(frax_balance_before_3).div(BIG18).toNumber());
		console.log("wUST change: ", wust_balance_after_3.minus(wust_balance_before_3).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_3.minus(fxs_balance_before_3).div(BIG18).toNumber());

		console.log(chalk.hex('#22996e')("---------- Mint FRAX with FEI (1-to-1 override) ----------"));
		let frax_balance_before_4 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let fei_balance_before_4 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_4 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_fei, FRAX_AMOUNT)).div(BIG18).toNumber())
		const fei_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_fei, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_fei, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });

		let frax_balance_after_4 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let fei_balance_after_4 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_4 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(fei_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(fei_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(fei_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_4.minus(frax_balance_before_4).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_4.minus(fei_balance_before_4).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_4.minus(fxs_balance_before_4).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Mint FRAX with USDC (1-to-1 override) ----------"));
		let frax_balance_before_5 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdc_balance_before_5 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_5 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdc, FRAX_AMOUNT)).div(BIG6).toNumber())
		const usdc_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_usdc, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_usdc, FRAX_AMOUNT, FRAX_OUT_MIN, 1, { from: accounts[9] });

		let frax_balance_after_5 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdc_balance_after_5 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_5 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(usdc_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(usdc_mint_result_CALL[1]).div(BIG6).toNumber());
		console.log("fxs_needed: ", new BigNumber(usdc_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_5.minus(frax_balance_before_5).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_5.minus(usdc_balance_before_5).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_5.minus(fxs_balance_before_5).div(BIG18).toNumber());
	});

	it("Mint Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ MINT FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const wust_balance = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("wUST Balance: ", wust_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125000e6"), { from: accounts[9] });

		console.log("Set the mint threshold to $0.99 now so mints work");
		await pool_instance_v3.setPriceThresholds(990000, 980000, { from: POOL_CREATOR }); 

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#ffa500')("---------- Try minting above pool ceilings ----------"));
		const OVERMINT_FRAX_AMT = new BigNumber("110000e18");
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_lusd, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_susd, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdp, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_wust, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_fei, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdc, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);

		console.log(chalk.hex('#ffa500')("---------- Try minting when paused ----------"));
		const PAUSED_FRAX_MINT_AMOUNT = new BigNumber("100e18");

		console.log("Pause mints");
		await pool_instance_v3.toggleMinting(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_usdc, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_lusd, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_susd, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdp, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_wust, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_fei, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdc, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);

		console.log("Unpause mints");
		await pool_instance_v3.toggleMinting(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMinting(col_idx_usdc, { from: POOL_CREATOR });
		
		console.log(chalk.hex('#ffa500')("---------- Try minting when collateral is disabled ----------"));
		const DISABLED_FRAX_MINT_AMOUNT = new BigNumber("100e18");

		console.log("Disable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdc, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_lusd, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_susd, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdp, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_wust, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_fei, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdc, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdc, { from: POOL_CREATOR });
	});


	it("Redeem Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ REDEEM FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const wust_balance = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("wUST Balance: ", wust_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#ffa500')("---------- Try redeeming when paused ----------"));
		const PAUSED_REDEEM_FRAX_AMT = new BigNumber("100e18");

		console.log("Pause redemptions");
		await pool_instance_v3.toggleRedeeming(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_fei, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_lusd, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_susd, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_usdp, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_wust, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_fei, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);

		console.log("Unpause redemptions");
		await pool_instance_v3.toggleRedeeming(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRedeeming(col_idx_fei, { from: POOL_CREATOR });

		console.log(chalk.hex('#ffa500')("---------- Try redeeming when collateral is disabled ----------"));
		const DISABLED_FRAX_REDEEM_AMOUNT = new BigNumber("100e18");

		console.log("Disable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_lusd, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_susd, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_usdp, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_wust, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_fei, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });
	});

	it("Recollat Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ RECOLLAT FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const wust_balance = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("wUST Balance: ", wust_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#ffa500')("---------- Try recollating when paused ----------"));
		const PAUSED_RECOLLAT_COLLAT_AMT = new BigNumber("100e18");

		console.log("Pause recollats");
		await pool_instance_v3.toggleRecollateralize(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_fei, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_lusd, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_susd, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_usdp, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_wust, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_fei, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);

		console.log("Unpause recollats");
		await pool_instance_v3.toggleRecollateralize(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleRecollateralize(col_idx_fei, { from: POOL_CREATOR });
		
		console.log(chalk.hex('#ffa500')("---------- Try recollating when collateral is disabled ----------"));
		const DISABLED_RECOLLAT_COLLAT_AMOUNT = new BigNumber("100e18");

		console.log("Disable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_lusd, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_susd, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_usdp, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_wust, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralizeFrax(col_idx_fei, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });
	});
	
	it("Buyback Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ BUYBACK FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const wust_balance = new BigNumber(await wust_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("wUST Balance: ", wust_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await wust_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125000e18"), { from: accounts[9] });

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#ffa500')("---------- Try buying back when paused ----------"));
		const PAUSED_BUYBACK_FXS_AMT = new BigNumber("100e18");

		console.log("Pause buybacks");
		await pool_instance_v3.toggleBuyBack(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_fei, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_lusd, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_susd, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_usdp, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_wust, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_fei, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);

		console.log("Unpause buybacks");
		await pool_instance_v3.toggleBuyBack(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.toggleBuyBack(col_idx_fei, { from: POOL_CREATOR });
		
		console.log(chalk.hex('#ffa500')("---------- Try buying back when collateral is disabled ----------"));
		const DISABLED_BUYBACK_FXS_AMOUNT = new BigNumber("100e18");

		console.log("Disable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_lusd, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_susd, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_usdp, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_wust, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_fei, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.togglePool(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_wust, { from: POOL_CREATOR });
		await pool_instance_v3.togglePool(col_idx_fei, { from: POOL_CREATOR });
	});

	it("Redeem Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ REDEEM FAIL TESTS [PART 2] ============"));
		console.log(chalk.yellow("===================================================================="));

		const SLIPPAGE_MULTIPLIER = .975;
		const global_cr = new BigNumber(await frax_instance.global_collateral_ratio());
		const fxs_price = new BigNumber(await frax_instance.fxs_price());

		console.log("global_cr:", global_cr.div(BIG6).toNumber());
		console.log("fxs_price:", fxs_price.div(BIG6).toNumber());

		const FRAX_AMOUNT_TEST_RDM = new BigNumber("1000e18");
		const FRAX_AMOUNT_TEST_RDM_SLIPPED = FRAX_AMOUNT_TEST_RDM.multipliedBy(SLIPPAGE_MULTIPLIER);
		const FRAX_FOR_COLLAT_RDM = FRAX_AMOUNT_TEST_RDM_SLIPPED.multipliedBy(global_cr).div(BIG6).integerValue(BigNumber.ROUND_FLOOR);
		const FRAX_FOR_FXS_RDM = FRAX_AMOUNT_TEST_RDM_SLIPPED.minus(FRAX_FOR_COLLAT_RDM);
		const FXS_OUT_MIN_TEST_RDM = FRAX_FOR_FXS_RDM.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_wust = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 4;

		console.log(chalk.hex('#ffa500')("---------- Optionally set the the oracle to the wrappers ----------"));
		if(START_WITH_ORACLE_WRAPPERS){
			// Do nothing, as it was already done before
		}
		else {
			console.log(chalk.green("USING WRAPPED ORACLES LATE"));
			console.log("Set FRAX.sol to use the FRAXOracleWrapper for FRAX pricing");
			await frax_instance.setFRAXEthOracle(frax_oracle_wrapper_instance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", { from: ORIGINAL_FRAX_ONE_ADDRESS });
			console.log("FRAX price (raw):", new BigNumber(await frax_instance.frax_price()).toNumber());
			console.log("FRAX price:", new BigNumber(await frax_instance.frax_price()).div(BIG6).toNumber());

			console.log("Set FRAX.sol to use the FXSOracleWrapper for FXS pricing");
			await frax_instance.setFXSEthOracle(fxs_oracle_wrapper_instance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", { from: ORIGINAL_FRAX_ONE_ADDRESS });
			console.log("FXS price (raw):", new BigNumber(await frax_instance.fxs_price()).toNumber());
			console.log("FXS price:", new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		}

		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_wust, FRAX_AMOUNT_TEST_RDM, FXS_OUT_MIN_TEST_RDM, 0, { from: accounts[9] }),
			"Frax price too high"
		);

	});

});