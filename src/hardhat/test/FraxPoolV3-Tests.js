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
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

// Uniswap related
const IUniswapV2Factory = artifacts.require("Uniswap/Interfaces/IUniswapV2Factory");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const IUniswapV2Pair = artifacts.require("Uniswap/Interfaces/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");

// Uniswap V3 related
const IUniswapV3PositionsNFT = artifacts.require("Uniswap_V3/IUniswapV3PositionsNFT");

// Saddle related
const ISaddleD4_LP = artifacts.require("Misc_AMOs/saddle/ISaddleD4_LP");

// Collateral Pools
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");

// Chainlink-based. Eliminates the need for FRAX/WETH and FXS/WETH liquidity
const FXSOracleWrapper = artifacts.require("Oracle/FXSOracleWrapper");
const FRAXOracleWrapper = artifacts.require("Oracle/FRAXOracleWrapper");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

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
	const ADDRESS_WITH_FXS = '0x3C60DBCD24b49f7fbFE27b8ff6c49a37bb087d63';
	const ADDRESS_WITH_USDC = '0x68A99f89E475a078645f4BAC491360aFe255Dff1';
	const ADDRESS_WITH_LUSD = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_sUSD = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_USDP = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_DAI = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';
	const ADDRESS_WITH_FEI = '0x36A87d1E3200225f881488E4AEedF25303FebcAe';

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
	let dai_instance;
	let fei_instance;
	let mockFRAX3CRVInstance;

	// Initialize the AMO minter instance
	let amo_minter_instance;
	
	// Initialize the Uniswap Router instance
	let routerInstance; 

	// Initialize the Uniswap Factory instance
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
	const START_WITH_ORACLE_WRAPPERS = true;
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Chainlink oracle wrappers
	let frax_oracle_wrapper_instance;
	let fxs_oracle_wrapper_instance;

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
		dai_instance = await ERC20.at("0x6B175474E89094C44Da98b954EedeAC495271d0F");
		fei_instance = await ERC20.at("0x956F47F50A910163D8BF957Cf5846D573E7f87CA");

		// Fill the Uniswap Router Instance
		routerInstance = await IUniswapV2Router02.deployed(); 

		// Fill the AMO Minter Instance
		amo_minter_instance = await FraxAMOMinter.deployed();

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
		pool_instance_v3 = await FraxPoolV3.deployed();
		
		// Initialize the Uniswap Factory instance
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
		console.log("Give the minter some FRAX");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		await frax_instance.transfer(accounts[9], new BigNumber("50000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some FXS");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		await fxs_instance.transfer(accounts[9], new BigNumber("10000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some LUSD");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_LUSD]
		});

		await lusd_instance.transfer(accounts[9], new BigNumber("500e18"), { from: ADDRESS_WITH_LUSD });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_LUSD]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some sUSD");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_sUSD]
		});

		await susd_instance.transfer(accounts[9], new BigNumber("500e18"), { from: ADDRESS_WITH_sUSD });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_sUSD]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some USDP");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDP]
		});

		await usdp_instance.transfer(accounts[9], new BigNumber("500e18"), { from: ADDRESS_WITH_USDP });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDP]
		});


		console.log("------------------------------------------------");
		console.log("Give the minter some DAI");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_DAI]
		});

		await dai_instance.transfer(accounts[9], new BigNumber("500e18"), { from: ADDRESS_WITH_DAI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_DAI]
		});

		console.log("------------------------------------------------");
		console.log("Give the minter some FEI");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FEI]
		});

		await fei_instance.transfer(accounts[9], new BigNumber("500e18"), { from: ADDRESS_WITH_FEI });

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

		await usdc_instance.transfer(accounts[9], new BigNumber("500e6"), { from: ADDRESS_WITH_USDC });

		console.log("Give the pool some collateral to start");
		await usdc_instance.transfer(pool_instance_v3.address, new BigNumber("5000e6"), { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		// console.log("Adding pool_instance_v3 as a valid pool");
		// await frax_instance.addPool(pool_instance_v3.address, { from: ORIGINAL_FRAX_ONE_ADDRESS });

		console.log("Enable all of the collaterals");
		await pool_instance_v3.toggleCollateral(0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(4, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(5, { from: POOL_CREATOR });

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
			console.log(chalk.green("USING WRAPPED ORACLES EARLY"));
			console.log("Set FRAX.sol to use the FRAXOracleWrapper for FRAX pricing");
			await frax_instance.setFRAXEthOracle(frax_oracle_wrapper_instance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", { from: ORIGINAL_FRAX_ONE_ADDRESS });
			console.log("FRAX price (raw):", new BigNumber(await frax_instance.frax_price()).toNumber());
			console.log("FRAX price:", new BigNumber(await frax_instance.frax_price()).div(BIG6).toNumber());

			console.log("Set FRAX.sol to use the FXSOracleWrapper for FXS pricing");
			await frax_instance.setFXSEthOracle(fxs_oracle_wrapper_instance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", { from: ORIGINAL_FRAX_ONE_ADDRESS });
			console.log("FXS price (raw):", new BigNumber(await fxs_oracle_wrapper_instance.getFXSPrice()).toNumber());
			console.log("FXS price:", new BigNumber(await fxs_oracle_wrapper_instance.getFXSPrice()).div(BIG6).toNumber());
		}
		else {
			console.log(chalk.red.bold("USING WRAPPED ORACLES LATE"));
			// Do nothing
		}

		console.log("------------------------------------------------");
		console.log("Give the pool some collateral to start");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_sUSD]
		});

		await lusd_instance.transfer(pool_instance_v3.address, new BigNumber("200e18"), { from: ADDRESS_WITH_LUSD });
		await susd_instance.transfer(pool_instance_v3.address, new BigNumber("200e18"), { from: ADDRESS_WITH_sUSD });
		await usdp_instance.transfer(pool_instance_v3.address, new BigNumber("200e18"), { from: ADDRESS_WITH_USDP });
		await dai_instance.transfer(pool_instance_v3.address, new BigNumber("200e18"), { from: ADDRESS_WITH_DAI });
		await fei_instance.transfer(pool_instance_v3.address, new BigNumber("200e18"), { from: ADDRESS_WITH_FEI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_sUSD]
		});
	});

	it('Main tests', async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ MINTING TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("500e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("500e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("500e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("500e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("500e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("500e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("500e6"), { from: accounts[9] });

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log(chalk.hex('#ffa500')("---------- Prepare to mint ----------"));
		const SLIPPAGE_MULTIPLIER = .975;
		const FRAX_AMOUNT = new BigNumber("100e18");
		const FRAX_OUT_MIN = FRAX_AMOUNT.multipliedBy(SLIPPAGE_MULTIPLIER).integerValue(BigNumber.ROUND_FLOOR);
		const global_cr = new BigNumber(await frax_instance.global_collateral_ratio());
		const frax_price = new BigNumber(await pool_instance_v3.getFRAXPrice());
		const fxs_price = new BigNumber(await pool_instance_v3.getFXSPrice());

		console.log("global_cr:", global_cr.div(BIG6).toNumber());
		console.log("frax_price:", frax_price.div(BIG6).toNumber());
		console.log("fxs_price:", fxs_price.div(BIG6).toNumber());

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_dai = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		console.log("Set the mint threshold to $0.98 now so mints work");
		await pool_instance_v3.setPriceThresholds(980000, 970000, { from: POOL_CREATOR }); 
		
		console.log(chalk.hex('#ffa500')("---------- Print collateral info ----------"));
		// Print all of the collaterals
		console.log("allCollaterals: ", await pool_instance_v3.allCollaterals.call());

		await utilities.printCollateralInfo(pool_instance_v3, lusd_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, susd_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, usdp_instance.address);
		await utilities.printCollateralInfo(pool_instance_v3, dai_instance.address);
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

		console.log(chalk.hex('#ffbc01')("---------- Mint FRAX with DAI and FXS ----------"));
		const dai_price = (new BigNumber(await pool_instance_v3.collateral_prices.call(col_idx_dai))).div(BIG6);
		console.log("dai_price: ", dai_price.toNumber());

		let frax_balance_before_3 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let dai_balance_before_3 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_3 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Refresh oracle
		try {
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_dai, FRAX_AMOUNT)).div(BIG18).toNumber())
		const dai_mint_result_CALL = await pool_instance_v3.mintFrax.call(col_idx_dai, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_dai, FRAX_AMOUNT, FRAX_OUT_MIN, 0, { from: accounts[9] });

		let frax_balance_after_3 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let dai_balance_after_3 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_3 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(dai_mint_result_CALL[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(dai_mint_result_CALL[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(dai_mint_result_CALL[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_3.minus(frax_balance_before_3).div(BIG18).toNumber());
		console.log("DAI change: ", dai_balance_after_3.minus(dai_balance_before_3).div(BIG18).toNumber());
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
		
		// Print some data
		console.log("freeCollatBalance: ", (new BigNumber(await pool_instance_v3.freeCollatBalance.call(5))).div(BIG6).toNumber());
		console.log("pool ceiling: ", (new BigNumber(await pool_instance_v3.pool_ceilings.call(5))).div(BIG6).toNumber());

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

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ MINTING TESTS (1-TO-1 OVERRIDE) ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("100e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("100e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("100e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("100e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("100e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("100e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("100e6"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to mint 1-to-1 ----------"));
		const SLIPPAGE_MULTIPLIER_M1T1 = .975;
		const FRAX_AMOUNT_M1T1 = new BigNumber("100e18");
		const FRAX_OUT_MIN_M1T1 = FRAX_AMOUNT_M1T1.multipliedBy(SLIPPAGE_MULTIPLIER_M1T1).integerValue(BigNumber.ROUND_FLOOR);
		const global_cr_m1t1 = new BigNumber(await frax_instance.global_collateral_ratio());
		const fxs_price_m1t1 = new BigNumber(await fxs_oracle_wrapper_instance.getFXSPrice());
		const frax_price_m1t1 = new BigNumber(await frax_instance.frax_price());

		console.log("global_cr_m1t1:", global_cr_m1t1.div(BIG6).toNumber());
		console.log("fxs_price_m1t1:", fxs_price_m1t1.div(BIG6).toNumber());
		console.log("frax_price_m1t1:", frax_price_m1t1.div(BIG6).toNumber());

		console.log("Set the mint threshold to $0.98 now so mints work");
		await pool_instance_v3.setPriceThresholds(980000, 970000, { from: POOL_CREATOR }); 

		console.log(chalk.hex('#2eb6ea')("---------- Mint FRAX with LUSD (1-to-1 override) ----------"));
		let frax_balance_before_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let lusd_balance_before_m1t1 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_lusd, FRAX_AMOUNT_M1T1)).div(BIG18).toNumber())
		const lusd_mint_result_CALL_M1T1 = await pool_instance_v3.mintFrax.call(col_idx_lusd, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_lusd, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });

		let frax_balance_after_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let lusd_balance_after_m1t1 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("total_frax_mint: ", new BigNumber(lusd_mint_result_CALL_M1T1[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(lusd_mint_result_CALL_M1T1[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(lusd_mint_result_CALL_M1T1[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_m1t1.minus(frax_balance_before_m1t1).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_m1t1.minus(lusd_balance_before_m1t1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_m1t1.minus(fxs_balance_before_m1t1).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Mint FRAX with sUSD (1-to-1 override) ----------"));
		let frax_balance_before_1_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let susd_balance_before_1_m1t1 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_1_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_susd, FRAX_AMOUNT_M1T1)).div(BIG18).toNumber())
		const susd_mint_result_CALL_M1T1 = await pool_instance_v3.mintFrax.call(col_idx_susd, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_susd, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });

		let frax_balance_after_1_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let susd_balance_after_1_m1t1 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_1_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(susd_mint_result_CALL_M1T1[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(susd_mint_result_CALL_M1T1[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(susd_mint_result_CALL_M1T1[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_1_m1t1.minus(frax_balance_before_1_m1t1).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_1_m1t1.minus(susd_balance_before_1_m1t1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_1_m1t1.minus(fxs_balance_before_1_m1t1).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Mint FRAX with USDP (1-to-1 override) ----------"));
		let frax_balance_before_2_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdp_balance_before_2_m1t1 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_2_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdp, FRAX_AMOUNT_M1T1)).div(BIG18).toNumber())
		const usdp_mint_result_CALL_M1T1 = await pool_instance_v3.mintFrax.call(col_idx_usdp, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_usdp, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });

		let frax_balance_after_2_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdp_balance_after_2_m1t1 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_2_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(usdp_mint_result_CALL_M1T1[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(usdp_mint_result_CALL_M1T1[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(usdp_mint_result_CALL_M1T1[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_2_m1t1.minus(frax_balance_before_2_m1t1).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_2_m1t1.minus(usdp_balance_before_2_m1t1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_2_m1t1.minus(fxs_balance_before_2_m1t1).div(BIG18).toNumber());

		console.log(chalk.hex('#ffbc01')("---------- Mint FRAX with DAI (1-to-1 override) ----------"));
		let frax_balance_before_3_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let dai_balance_before_3_m1t1 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_3_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_dai, FRAX_AMOUNT_M1T1)).div(BIG18).toNumber())
		const dai_mint_result_CALL_M1T1 = await pool_instance_v3.mintFrax.call(col_idx_dai, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_dai, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });

		let frax_balance_after_3_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let dai_balance_after_3_m1t1 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_3_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(dai_mint_result_CALL_M1T1[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(dai_mint_result_CALL_M1T1[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(dai_mint_result_CALL_M1T1[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_3_m1t1.minus(frax_balance_before_3_m1t1).div(BIG18).toNumber());
		console.log("DAI change: ", dai_balance_after_3_m1t1.minus(dai_balance_before_3_m1t1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_3_m1t1.minus(fxs_balance_before_3_m1t1).div(BIG18).toNumber());

		console.log(chalk.hex('#22996e')("---------- Mint FRAX with FEI (1-to-1 override) ----------"));
		let frax_balance_before_4_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let fei_balance_before_4_m1t1 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_4_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_fei, FRAX_AMOUNT_M1T1)).div(BIG18).toNumber())
		const fei_mint_result_CALL_M1T1 = await pool_instance_v3.mintFrax.call(col_idx_fei, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_fei, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });

		let frax_balance_after_4_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let fei_balance_after_4_m1t1 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_4_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(fei_mint_result_CALL_M1T1[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(fei_mint_result_CALL_M1T1[1]).div(BIG18).toNumber());
		console.log("fxs_needed: ", new BigNumber(fei_mint_result_CALL_M1T1[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_4_m1t1.minus(frax_balance_before_4_m1t1).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_4_m1t1.minus(fei_balance_before_4_m1t1).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_4_m1t1.minus(fxs_balance_before_4_m1t1).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Mint FRAX with USDC (1-to-1 override) ----------"));
		let frax_balance_before_5_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdc_balance_before_5_m1t1 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		let fxs_balance_before_5_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		// Mint
		console.log("getFRAXInCollateral: ", new BigNumber(await pool_instance_v3.getFRAXInCollateral.call(col_idx_usdc, FRAX_AMOUNT_M1T1)).div(BIG6).toNumber())
		const usdc_mint_result_CALL_M1T1 = await pool_instance_v3.mintFrax.call(col_idx_usdc, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });
		await pool_instance_v3.mintFrax(col_idx_usdc, FRAX_AMOUNT_M1T1, FRAX_OUT_MIN_M1T1, 1, { from: accounts[9] });

		let frax_balance_after_5_m1t1 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		let usdc_balance_after_5_m1t1 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		let fxs_balance_after_5_m1t1 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		console.log("total_frax_mint: ", new BigNumber(usdc_mint_result_CALL_M1T1[0]).div(BIG18).toNumber());
		console.log("collat_needed: ", new BigNumber(usdc_mint_result_CALL_M1T1[1]).div(BIG6).toNumber());
		console.log("fxs_needed: ", new BigNumber(usdc_mint_result_CALL_M1T1[2]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_5_m1t1.minus(frax_balance_before_5_m1t1).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_5_m1t1.minus(usdc_balance_before_5_m1t1).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_5_m1t1.minus(fxs_balance_before_5_m1t1).div(BIG18).toNumber());
		
		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ REDEEM TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for redeems
		await frax_instance.approve(pool_instance_v3.address, new BigNumber("50000e18"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to redeem ----------"));
		const FRAX_AMOUNT_RDM = new BigNumber("100e18");
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

		console.log(chalk.hex('#ffbc01')("---------- Redeem FRAX for DAI and FXS ----------"));
		const COL_OUT_MIN_DAI = await pool_instance_v3.getFRAXInCollateral.call(col_idx_dai, FRAX_FOR_COLLAT_RDM);

		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		dai_balance_before_0 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const dai_redeem_result_CALL = await pool_instance_v3.redeemFrax.call(col_idx_dai, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_DAI, { from: accounts[9] });
		await pool_instance_v3.redeemFrax(col_idx_dai, FRAX_AMOUNT_RDM, FXS_OUT_MIN_RDM, COL_OUT_MIN_DAI, { from: accounts[9] });

		// Make sure an early redemption fails
		await expectRevert(
			pool_instance_v3.collectRedemption(col_idx_dai, { from: accounts[9] }),
			"Too soon"
		);

		// Advance two blocks
		await time.increase(15);
		await time.advanceBlock();
		await time.increase(15);
		await time.advanceBlock();

		await pool_instance_v3.collectRedemption(col_idx_dai, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		dai_balance_after_0 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(dai_redeem_result_CALL[0]).div(BIG18).toNumber());
		console.log("fxs_out: ", new BigNumber(dai_redeem_result_CALL[1]).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("DAI change: ", dai_balance_after_0.minus(dai_balance_before_0).div(BIG18).toNumber());
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

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ RECOLLAT TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for recollats
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("10e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("10e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("10e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("10e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("10e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("10e6"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to recollat ----------"));
		const COLLAT_AMT_RCLT = new BigNumber("10e18");
		const COLLAT_AMT_RCLT_SLIPPED = COLLAT_AMT_RCLT.multipliedBy(SLIPPAGE_MULTIPLIER);
		const COLLAT_AMT_RCLT_E6 = new BigNumber("10e6");
		const COLLAT_AMT_RCLT_E6_SLIPPED = COLLAT_AMT_RCLT_E6.multipliedBy(SLIPPAGE_MULTIPLIER);
		const COLLAT_AMT_LUSD_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(lusd_price);
		const COLLAT_AMT_sUSD_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(susd_price);
		const COLLAT_AMT_USDP_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(usdp_price);
		const COLLAT_AMT_DAI_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(dai_price);
		const COLLAT_AMT_FEI_RCLT_DV = COLLAT_AMT_RCLT_SLIPPED.multipliedBy(fei_price);
		const COLLAT_AMT_USDC_RCLT_DV = COLLAT_AMT_RCLT_E6_SLIPPED.multipliedBy(usdc_price);
		const FXS_OUT_MIN_LUSD_RCLT = COLLAT_AMT_LUSD_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_sUSD_RCLT = COLLAT_AMT_sUSD_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_USDP_RCLT = COLLAT_AMT_USDP_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_DAI_RCLT = COLLAT_AMT_DAI_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_FEI_RCLT = COLLAT_AMT_FEI_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		const FXS_OUT_MIN_USDC_RCLT = COLLAT_AMT_USDC_RCLT_DV.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);
		console.log("FXS_OUT_MIN_LUSD_RCLT: ", FXS_OUT_MIN_LUSD_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_sUSD_RCLT: ", FXS_OUT_MIN_sUSD_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_USDP_RCLT: ", FXS_OUT_MIN_USDP_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_DAI_RCLT: ", FXS_OUT_MIN_DAI_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_FEI_RCLT: ", FXS_OUT_MIN_FEI_RCLT.div(BIG18).toNumber());
		console.log("FXS_OUT_MIN_USDC_RCLT: ", FXS_OUT_MIN_USDC_RCLT.div(BIG6).toNumber());

		console.log("buybackAvailableCollat: ", new BigNumber(await pool_instance_v3.buybackAvailableCollat.call()).div(BIG18).toNumber());
		console.log("recollatTheoColAvailableE18: ", new BigNumber(await pool_instance_v3.recollatTheoColAvailableE18.call()).div(BIG18).toNumber());
		console.log("recollatAvailableFxs: ", new BigNumber(await pool_instance_v3.recollatAvailableFxs.call()).div(BIG18).toNumber());

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
		
		const lusd_recollat_result_CALL = await pool_instance_v3.recollateralize.call(col_idx_lusd, COLLAT_AMT_RCLT, FXS_OUT_MIN_LUSD_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralize(col_idx_lusd, COLLAT_AMT_RCLT, FXS_OUT_MIN_LUSD_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		lusd_balance_after_0 = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("fxs_out: ", new BigNumber(lusd_recollat_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("LUSD change: ", lusd_balance_after_0.minus(lusd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffffff')("---------- Recollat with sUSD for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_before_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const susd_recollat_result_CALL = await pool_instance_v3.recollateralize.call(col_idx_susd, COLLAT_AMT_RCLT, FXS_OUT_MIN_sUSD_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralize(col_idx_susd, COLLAT_AMT_RCLT, FXS_OUT_MIN_sUSD_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		susd_balance_after_0 = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("fxs_out: ", new BigNumber(susd_recollat_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("sUSD change: ", susd_balance_after_0.minus(susd_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#4460ef')("---------- Recollat with USDP for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_before_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdp_recollat_result_CALL = await pool_instance_v3.recollateralize.call(col_idx_usdp, COLLAT_AMT_RCLT, FXS_OUT_MIN_USDP_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralize(col_idx_usdp, COLLAT_AMT_RCLT, FXS_OUT_MIN_USDP_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdp_balance_after_0 = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("fxs_out: ", new BigNumber(usdp_recollat_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDP change: ", usdp_balance_after_0.minus(usdp_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#ffbc01')("---------- Recollat with DAI for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		dai_balance_before_0 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const dai_recollat_result_CALL = await pool_instance_v3.recollateralize.call(col_idx_dai, COLLAT_AMT_RCLT, FXS_OUT_MIN_DAI_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralize(col_idx_dai, COLLAT_AMT_RCLT, FXS_OUT_MIN_DAI_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		dai_balance_after_0 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("fxs_out: ", new BigNumber(dai_recollat_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("DAI change: ", dai_balance_after_0.minus(dai_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#22996e')("---------- Recollat with FEI for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_before_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const fei_recollat_result_CALL = await pool_instance_v3.recollateralize.call(col_idx_fei, COLLAT_AMT_RCLT, FXS_OUT_MIN_FEI_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralize(col_idx_fei, COLLAT_AMT_RCLT, FXS_OUT_MIN_FEI_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		fei_balance_after_0 = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("fxs_out: ", new BigNumber(fei_recollat_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("FEI change: ", fei_balance_after_0.minus(fei_balance_before_0).div(BIG18).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		console.log(chalk.hex('#2871c3')("---------- Recollat with USDC for FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_before_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const usdc_recollat_result_CALL = await pool_instance_v3.recollateralize.call(col_idx_usdc, COLLAT_AMT_RCLT_E6, FXS_OUT_MIN_USDC_RCLT, { from: accounts[9] });
		await pool_instance_v3.recollateralize(col_idx_usdc, COLLAT_AMT_RCLT_E6, FXS_OUT_MIN_USDC_RCLT, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		usdc_balance_after_0 = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("fxs_out: ", new BigNumber(usdc_recollat_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("USDC change: ", usdc_balance_after_0.minus(usdc_balance_before_0).div(BIG6).toNumber());
		console.log("FXS change: ", fxs_balance_after_0.minus(fxs_balance_before_0).div(BIG18).toNumber());

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });


		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ BUYBACK TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		// Do approvals for buybacks
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("1000e18"), { from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Prepare to buyback ----------"));
		const FXS_AMT_BBK = new BigNumber("10e18");
		const FXS_AMT_BBK_SLIPPED = FXS_AMT_BBK.multipliedBy(SLIPPAGE_MULTIPLIER);
		const FXS_AMT_BBK_DV = FXS_AMT_BBK_SLIPPED.multipliedBy(fxs_price).div(BIG6);
		const COL_OUT_MIN_LUSD_BBK = FXS_AMT_BBK_DV.div(lusd_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_sUSD_BBK = FXS_AMT_BBK_DV.div(susd_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_USDP_BBK = FXS_AMT_BBK_DV.div(usdp_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_DAI_BBK = FXS_AMT_BBK_DV.div(dai_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_FEI_BBK = FXS_AMT_BBK_DV.div(fei_price).integerValue(BigNumber.ROUND_FLOOR);
		const COL_OUT_MIN_USDC_BBK = FXS_AMT_BBK_DV.div(usdc_price).div(BIG12).integerValue(BigNumber.ROUND_FLOOR);
		console.log("COL_OUT_MIN_LUSD_BBK: ", COL_OUT_MIN_LUSD_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_sUSD_BBK: ", COL_OUT_MIN_sUSD_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_USDP_BBK: ", COL_OUT_MIN_USDP_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_DAI_BBK: ", COL_OUT_MIN_DAI_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_FEI_BBK: ", COL_OUT_MIN_FEI_BBK.div(BIG18).toNumber());
		console.log("COL_OUT_MIN_USDC_BBK: ", COL_OUT_MIN_USDC_BBK.div(BIG6).toNumber());

		const recollat_theo_collat_e18 = new BigNumber(await pool_instance_v3.recollatTheoColAvailableE18.call());
		const usdc_to_dump_in = recollat_theo_collat_e18.div(BIG12).plus("10000e6").integerValue(BigNumber.ROUND_CEIL);

		console.log("------------------------------------------------");
		console.log("Dump USDC into the old pool contract so a buyback opens up");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC]
		});
		console.log("------------------------------------------------");

		await usdc_instance.transfer("0x1864Ca3d47AaB98Ee78D11fc9DCC5E7bADdA1c0d", usdc_to_dump_in, { from: ADDRESS_WITH_USDC });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC]
		});

		console.log("buybackAvailableCollat: ", new BigNumber(await pool_instance_v3.buybackAvailableCollat.call()).div(BIG18).toNumber());
		console.log("recollatTheoColAvailableE18: ", new BigNumber(await pool_instance_v3.recollatTheoColAvailableE18.call()).div(BIG18).toNumber());
		console.log("recollatAvailableFxs: ", new BigNumber(await pool_instance_v3.recollatAvailableFxs.call()).div(BIG18).toNumber());

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

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

		console.log(chalk.hex('#ffbc01')("---------- Buyback DAI with FXS ----------"));
		frax_balance_before_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		dai_balance_before_0 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		fxs_balance_before_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		
		const dai_buyback_result_CALL = await pool_instance_v3.buyBackFxs.call(col_idx_dai, FXS_AMT_BBK, COL_OUT_MIN_DAI_BBK, { from: accounts[9] });
		await pool_instance_v3.buyBackFxs(col_idx_dai, FXS_AMT_BBK, COL_OUT_MIN_DAI_BBK, { from: accounts[9] });

		frax_balance_after_0 = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		dai_balance_after_0 = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		fxs_balance_after_0 = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));

		console.log("collat_out: ", new BigNumber(dai_buyback_result_CALL).div(BIG18).toNumber());

		console.log("FRAX change: ", frax_balance_after_0.minus(frax_balance_before_0).div(BIG18).toNumber());
		console.log("DAI change: ", dai_balance_after_0.minus(dai_balance_before_0).div(BIG18).toNumber());
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

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });
	});


	it("Mint Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ MINT FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_dai = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const dai_balance = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("DAI Balance: ", dai_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125e6"), { from: accounts[9] });

		console.log("Set the mint threshold to $0.98 now so mints work");
		await pool_instance_v3.setPriceThresholds(980000, 970000, { from: POOL_CREATOR }); 

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Try minting above pool ceilings ----------"));

		console.log("Lower pool ceilings");
		await pool_instance_v3.setPoolCeiling(0, new BigNumber("100e18"), { from: POOL_CREATOR }); 
		await pool_instance_v3.setPoolCeiling(1, new BigNumber("100e18"), { from: POOL_CREATOR }); 
		await pool_instance_v3.setPoolCeiling(2, new BigNumber("100e18"), { from: POOL_CREATOR }); 
		await pool_instance_v3.setPoolCeiling(3, new BigNumber("100e18"), { from: POOL_CREATOR }); 
		await pool_instance_v3.setPoolCeiling(4, new BigNumber("100e18"), { from: POOL_CREATOR }); 
		await pool_instance_v3.setPoolCeiling(5, new BigNumber("100e6"), { from: POOL_CREATOR }); 

		const OVERMINT_FRAX_AMT = new BigNumber("125e18");
		const OVERMINT_FRAX_AMT_E6 = new BigNumber("125e6");
		
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
			pool_instance_v3.mintFrax(col_idx_dai, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_fei, OVERMINT_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdc, OVERMINT_FRAX_AMT_E6, 0, 0, { from: accounts[9] }),
			"Pool ceiling"
		);

		console.log(chalk.hex('#ffa500')("---------- Try minting when paused ----------"));
		const PAUSED_FRAX_MINT_AMOUNT = new BigNumber("100e18");
		const PAUSED_FRAX_MINT_AMOUNT_E6 = new BigNumber("100e6");

		console.log("Pause mints");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 0, { from: POOL_CREATOR });

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
			pool_instance_v3.mintFrax(col_idx_dai, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_fei, PAUSED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdc, PAUSED_FRAX_MINT_AMOUNT_E6, 0, 0, { from: accounts[9] }),
			"Minting is paused"
		);

		console.log("Unpause mints");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 0, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 0, { from: POOL_CREATOR });
		
		console.log(chalk.hex('#ffa500')("---------- Try minting when collateral is disabled ----------"));
		const DISABLED_FRAX_MINT_AMOUNT = new BigNumber("100e18");
		const DISABLED_FRAX_MINT_AMOUNT_E6 = new BigNumber("100e6");

		console.log("Disable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });

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
			pool_instance_v3.mintFrax(col_idx_dai, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_fei, DISABLED_FRAX_MINT_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.mintFrax(col_idx_usdc, DISABLED_FRAX_MINT_AMOUNT_E6, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });
	});


	it("Redeem Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ REDEEM FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_dai = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const dai_balance = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("DAI Balance: ", dai_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125e6"), { from: accounts[9] });

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });

		console.log(chalk.hex('#ffa500')("---------- Try redeeming when paused ----------"));
		const PAUSED_REDEEM_FRAX_AMT = new BigNumber("100e18");
		const PAUSED_REDEEM_FRAX_AMT_E6 = new BigNumber("100e6");

		console.log("Pause redemptions");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 1, { from: POOL_CREATOR });

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
			pool_instance_v3.redeemFrax(col_idx_dai, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_fei, PAUSED_REDEEM_FRAX_AMT, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_usdc, PAUSED_REDEEM_FRAX_AMT_E6, 0, 0, { from: accounts[9] }),
			"Redeeming is paused"
		);
		
		console.log("Unpause redemptions");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 1, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 1, { from: POOL_CREATOR });

		console.log(chalk.hex('#ffa500')("---------- Try redeeming when collateral is disabled ----------"));
		const DISABLED_FRAX_REDEEM_AMOUNT = new BigNumber("100e18");
		const DISABLED_FRAX_REDEEM_AMOUNT_E6 = new BigNumber("100e6");

		console.log("Disable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });

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
			pool_instance_v3.redeemFrax(col_idx_dai, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_fei, DISABLED_FRAX_REDEEM_AMOUNT, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_usdc, DISABLED_FRAX_REDEEM_AMOUNT_E6, 0, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });
	});

	it("Buyback Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ BUYBACK FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_dai = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const dai_balance = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("DAI Balance: ", dai_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Do approvals for minting
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125e6"), { from: accounts[9] });

		// Wait one hour so you are in the next bbkHourlyCum array index
		await time.increase(3600);
		await time.advanceBlock();

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });

		console.log("buybackAvailableCollat: ", new BigNumber(await pool_instance_v3.buybackAvailableCollat.call()).div(BIG18).toNumber());
		console.log("recollatTheoColAvailableE18: ", new BigNumber(await pool_instance_v3.recollatTheoColAvailableE18.call()).div(BIG18).toNumber());
		console.log("recollatAvailableFxs: ", new BigNumber(await pool_instance_v3.recollatAvailableFxs.call()).div(BIG18).toNumber());

		console.log(chalk.hex('#ffa500')("---------- Try buying back too much, over the throttle limit ----------"));
		const OVERTHROTTLED_BUYBACK_FXS_AMT = new BigNumber("5e18");

		console.log("Set the throttle low");
		await pool_instance_v3.setBbkRctPerHour(new BigNumber("1e18"), new BigNumber("1000e18"), { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_susd, OVERTHROTTLED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Insuf Collat Avail For BBK"
		);

		console.log("Set the throttle back to normal");
		await pool_instance_v3.setBbkRctPerHour(new BigNumber("1000e18"), new BigNumber("1000e18"), { from: POOL_CREATOR });


		console.log(chalk.hex('#ffa500')("---------- Try buying back when paused ----------"));
		const PAUSED_BUYBACK_FXS_AMT = new BigNumber("100e18");
		const PAUSED_BUYBACK_FXS_AMT_E6 = new BigNumber("100e6");

		console.log("Pause buybacks");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 2, { from: POOL_CREATOR });

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
			pool_instance_v3.buyBackFxs(col_idx_dai, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_fei, PAUSED_BUYBACK_FXS_AMT, 0, { from: accounts[9] }),
			"Buyback is paused"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_usdc, PAUSED_BUYBACK_FXS_AMT_E6, 0, { from: accounts[9] }),
			"Buyback is paused"
		);

		console.log("Unpause buybacks");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 2, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 2, { from: POOL_CREATOR });
		
		console.log(chalk.hex('#ffa500')("---------- Try buying back when collateral is disabled ----------"));
		const DISABLED_BUYBACK_FXS_AMOUNT = new BigNumber("100e18");
		const DISABLED_BUYBACK_FXS_AMOUNT_E6 = new BigNumber("100e6");

		console.log("Disable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });

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
			pool_instance_v3.buyBackFxs(col_idx_dai, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_fei, DISABLED_BUYBACK_FXS_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.buyBackFxs(col_idx_usdc, DISABLED_BUYBACK_FXS_AMOUNT_E6, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });
	});

	it("Recollat Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ RECOLLAT FAIL TESTS ============"));
		console.log(chalk.yellow("===================================================================="));


		console.log(chalk.hex('#ffa500')("---------- Do a huge mint to open up a recollat ----------"));

		console.log("Add pool");
		await frax_instance.addPool(accounts[9], { from: ORIGINAL_FRAX_ONE_ADDRESS });

		console.log("Mint to a non-used address");
		await frax_instance.pool_mint(accounts[11], new BigNumber("5000000e18"), { from: accounts[9] });
		
		console.log("Remove pool");
		await frax_instance.removePool(accounts[9], { from: ORIGINAL_FRAX_ONE_ADDRESS });

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_dai = 3;
		const col_idx_fei = 4;
		const col_idx_usdc = 5;

		// User balances
		const frax_balance = new BigNumber(await frax_instance.balanceOf.call(accounts[9]));
		const fxs_balance = new BigNumber(await fxs_instance.balanceOf.call(accounts[9]));
		const lusd_balance = new BigNumber(await lusd_instance.balanceOf.call(accounts[9]));
		const susd_balance = new BigNumber(await susd_instance.balanceOf.call(accounts[9]));
		const usdp_balance = new BigNumber(await usdp_instance.balanceOf.call(accounts[9]));
		const dai_balance = new BigNumber(await dai_instance.balanceOf.call(accounts[9]));
		const fei_balance = new BigNumber(await fei_instance.balanceOf.call(accounts[9]));
		const usdc_balance = new BigNumber(await usdc_instance.balanceOf.call(accounts[9]));

		console.log("FRAX Balance: ", frax_balance.div(BIG18).toNumber());
		console.log("FXS Balance: ", fxs_balance.div(BIG18).toNumber());
		console.log("LUSD Balance: ", lusd_balance.div(BIG18).toNumber());
		console.log("sUSD Balance: ", susd_balance.div(BIG18).toNumber());
		console.log("USDP Balance: ", usdp_balance.div(BIG18).toNumber());
		console.log("DAI Balance: ", dai_balance.div(BIG18).toNumber());
		console.log("FEI Balance: ", fei_balance.div(BIG18).toNumber());
		console.log("USDC Balance: ", usdc_balance.div(BIG6).toNumber());

		// Pool balances
		const frax_balance_pool_rc = new BigNumber(await frax_instance.balanceOf.call(pool_instance_v3.address));
		const fxs_balance_pool_rc = new BigNumber(await fxs_instance.balanceOf.call(pool_instance_v3.address));
		const lusd_balance_pool_rc = new BigNumber(await lusd_instance.balanceOf.call(pool_instance_v3.address));
		const susd_balance_pool_rc = new BigNumber(await susd_instance.balanceOf.call(pool_instance_v3.address));
		const usdp_balance_pool_rc = new BigNumber(await usdp_instance.balanceOf.call(pool_instance_v3.address));
		const dai_balance_pool_rc = new BigNumber(await dai_instance.balanceOf.call(pool_instance_v3.address));
		const fei_balance_pool_rc = new BigNumber(await fei_instance.balanceOf.call(pool_instance_v3.address));
		const usdc_balance_pool_rc = new BigNumber(await usdc_instance.balanceOf.call(pool_instance_v3.address));

		console.log("FRAX Pool Balance : ", frax_balance_pool_rc.div(BIG18).toNumber());
		console.log("FXS Pool Balance : ", fxs_balance_pool_rc.div(BIG18).toNumber());
		console.log("LUSD Pool Balance : ", lusd_balance_pool_rc.div(BIG18).toNumber());
		console.log("sUSD Pool Balance : ", susd_balance_pool_rc.div(BIG18).toNumber());
		console.log("USDP Pool Balance : ", usdp_balance_pool_rc.div(BIG18).toNumber());
		console.log("DAI Pool Balance : ", dai_balance_pool_rc.div(BIG18).toNumber());
		console.log("FEI Pool Balance : ", fei_balance_pool_rc.div(BIG18).toNumber());
		console.log("USDC Pool Balance : ", usdc_balance_pool_rc.div(BIG6).toNumber());

		// Do approvals for recollats
		await fxs_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await lusd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await susd_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdp_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await dai_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await fei_instance.approve(pool_instance_v3.address, new BigNumber("125e18"), { from: accounts[9] });
		await usdc_instance.approve(pool_instance_v3.address, new BigNumber("125e6"), { from: accounts[9] });

		// Wait one hour so you are in the next rctHourlyCum array index
		await time.increase(3600);
		await time.advanceBlock();

		// Refresh oracle
		try{
			console.log("Refreshing FXS/WETH oracle");
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });

		console.log("allCollaterals: ", await pool_instance_v3.allCollaterals.call());

		console.log("Unclaimed LUSD: ", new BigNumber(await pool_instance_v3.unclaimedPoolCollateral.call(col_idx_lusd)).div(BIG18).toNumber());
		console.log("Unclaimed sUSD: ", new BigNumber(await pool_instance_v3.unclaimedPoolCollateral.call(col_idx_susd)).div(BIG18).toNumber());
		console.log("Unclaimed USDP: ", new BigNumber(await pool_instance_v3.unclaimedPoolCollateral.call(col_idx_usdp)).div(BIG18).toNumber());
		console.log("Unclaimed DAI: ", new BigNumber(await pool_instance_v3.unclaimedPoolCollateral.call(col_idx_dai)).div(BIG18).toNumber());
		console.log("Unclaimed FEI: ", new BigNumber(await pool_instance_v3.unclaimedPoolCollateral.call(col_idx_fei)).div(BIG18).toNumber());
		console.log("Unclaimed USDC: ", new BigNumber(await pool_instance_v3.unclaimedPoolCollateral.call(col_idx_usdc)).div(BIG6).toNumber());

		console.log("LUSD enabled?: ", await pool_instance_v3.enabled_collaterals.call(lusd_instance.address));
		console.log("sUSD enabled?: ", await pool_instance_v3.enabled_collaterals.call(susd_instance.address));
		console.log("USDP enabled?: ", await pool_instance_v3.enabled_collaterals.call(usdp_instance.address));
		console.log("DAI enabled?: ", await pool_instance_v3.enabled_collaterals.call(dai_instance.address));
		console.log("FEI enabled?: ", await pool_instance_v3.enabled_collaterals.call(fei_instance.address));
		console.log("USDC enabled?: ", await pool_instance_v3.enabled_collaterals.call(usdc_instance.address));

		console.log("globalCollateralValue: ", new BigNumber(await frax_instance.globalCollateralValue.call()).div(BIG18).toNumber());
		console.log("global_collateral_ratio: ", new BigNumber(await frax_instance.global_collateral_ratio.call()).div(BIG6).toNumber());
		console.log("collatDollarBalance: ", new BigNumber(await pool_instance_v3.collatDollarBalance.call()).div(BIG18).toNumber());

		console.log("buybackAvailableCollat: ", new BigNumber(await pool_instance_v3.buybackAvailableCollat.call()).div(BIG18).toNumber());
		console.log("recollatTheoColAvailableE18: ", new BigNumber(await pool_instance_v3.recollatTheoColAvailableE18.call()).div(BIG18).toNumber());
		console.log("recollatAvailableFxs: ", new BigNumber(await pool_instance_v3.recollatAvailableFxs.call()).div(BIG18).toNumber());

		console.log(chalk.hex('#ffa500')("---------- Try recollating too much, over the throttle limit ----------"));
		const OVERTHROTTLED_RECOLLAT_COLLAT_AMT = new BigNumber("5e18");

		console.log("Raise the pool ceiling temporarily");
		await pool_instance_v3.setPoolCeiling(col_idx_lusd, new BigNumber("1000000e18"), { from: POOL_CREATOR });

		console.log("Set the throttle low");
		await pool_instance_v3.setBbkRctPerHour(new BigNumber("1000e18"), new BigNumber("1e18"), { from: POOL_CREATOR });

		await pool_instance_v3.recollateralize(col_idx_lusd, OVERTHROTTLED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] });
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_lusd, OVERTHROTTLED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Insuf FXS Avail For RCT"
		);

		console.log("Set the throttle back to normal");
		await pool_instance_v3.setBbkRctPerHour(new BigNumber("1000e18"), new BigNumber("1000e18"), { from: POOL_CREATOR });

		console.log("Lower the pool ceiling back to normal");
		await pool_instance_v3.setPoolCeiling(col_idx_lusd, new BigNumber("50000e18"), { from: POOL_CREATOR });


		console.log(chalk.hex('#ffa500')("---------- Try recollating when paused ----------"));
		const PAUSED_RECOLLAT_COLLAT_AMT = new BigNumber("100e18");
		const PAUSED_RECOLLAT_COLLAT_AMT_E6 = new BigNumber("100e6");

		console.log("Pause recollats");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 3, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_lusd, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_susd, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_usdp, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_dai, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_fei, PAUSED_RECOLLAT_COLLAT_AMT, 0, { from: accounts[9] }),
			"Recollat is paused"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_usdc, PAUSED_RECOLLAT_COLLAT_AMT_E6, 0, { from: accounts[9] }),
			"Recollat is paused"
		);

		console.log("Unpause recollats");
		await pool_instance_v3.toggleMRBR(col_idx_lusd, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_susd, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdp, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_dai, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_fei, 3, { from: POOL_CREATOR });
		await pool_instance_v3.toggleMRBR(col_idx_usdc, 3, { from: POOL_CREATOR });
		
		console.log(chalk.hex('#ffa500')("---------- Try recollating when collateral is disabled ----------"));
		const DISABLED_RECOLLAT_COLLAT_AMOUNT = new BigNumber("100e18");
		const DISABLED_RECOLLAT_COLLAT_AMOUNT_E6 = new BigNumber("100e6");

		console.log("Disable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });

		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_lusd, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_susd, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_usdp, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_dai, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_fei, DISABLED_RECOLLAT_COLLAT_AMOUNT, 0, { from: accounts[9] }),
			"Collateral disabled"
		);
		await expectRevert(
			pool_instance_v3.recollateralize(col_idx_usdc, DISABLED_RECOLLAT_COLLAT_AMOUNT_E6, 0, { from: accounts[9] }),
			"Collateral disabled"
		);

		console.log("Re-enable pools");
		await pool_instance_v3.toggleCollateral(col_idx_lusd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_susd, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdp, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_dai, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_fei, { from: POOL_CREATOR });
		await pool_instance_v3.toggleCollateral(col_idx_usdc, { from: POOL_CREATOR });
	});

	

	
	it("Redeem Fail Tests ", async () => {
		console.log(chalk.yellow("===================================================================="));
		console.log(chalk.yellow("============ REDEEM FAIL TESTS [PART 2] ============"));
		console.log(chalk.yellow("===================================================================="));

		// Sync the AMO Minter
		await amo_minter_instance.syncDollarBalances({ from: accounts[9] });

		const SLIPPAGE_MULTIPLIER = .975;
		const global_cr = new BigNumber(await frax_instance.global_collateral_ratio());
		const fxs_price = new BigNumber(await fxs_oracle_wrapper_instance.getFXSPrice());

		console.log("global_cr:", global_cr.div(BIG6).toNumber());
		console.log("fxs_price:", fxs_price.div(BIG6).toNumber());

		const FRAX_AMOUNT_TEST_RDM = new BigNumber("100e18");
		const FRAX_AMOUNT_TEST_RDM_SLIPPED = FRAX_AMOUNT_TEST_RDM.multipliedBy(SLIPPAGE_MULTIPLIER);
		const FRAX_FOR_COLLAT_RDM = FRAX_AMOUNT_TEST_RDM_SLIPPED.multipliedBy(global_cr).div(BIG6).integerValue(BigNumber.ROUND_FLOOR);
		const FRAX_FOR_FXS_RDM = FRAX_AMOUNT_TEST_RDM_SLIPPED.minus(FRAX_FOR_COLLAT_RDM);
		const FXS_OUT_MIN_TEST_RDM = FRAX_FOR_FXS_RDM.multipliedBy(BIG6).div(fxs_price).integerValue(BigNumber.ROUND_FLOOR);

		const col_idx_lusd = 0;
		const col_idx_susd = 1;
		const col_idx_usdp = 2;
		const col_idx_dai = 3;
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
			console.log("FXS price (raw):", new BigNumber(await fxs_oracle_wrapper_instance.getFXSPrice()).toNumber());
			console.log("FXS price:", new BigNumber(await fxs_oracle_wrapper_instance.getFXSPrice()).div(BIG6).toNumber());
		}

		await expectRevert(
			pool_instance_v3.redeemFrax(col_idx_dai, FRAX_AMOUNT_TEST_RDM, FXS_OUT_MIN_TEST_RDM, 0, { from: accounts[9] }),
			"Frax price too high"
		);

	});

});