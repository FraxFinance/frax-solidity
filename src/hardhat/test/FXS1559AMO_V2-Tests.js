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
const e = require('express');

// Uniswap related
// const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02 = artifacts.require("Uniswap/UniswapV2Router02");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
// const PoolvAMM_USDC = artifacts.require("Frax/Pools/PoolvAMM_USDC");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_FXS = artifacts.require("Oracle/Variants/UniswapPairOracle_FRAX_FXS");

const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");

const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Staking contracts
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");
const StakingRewardsDual_FRAX_FXS_Sushi = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX_FXS_Sushi.sol");
const StakingRewardsDual_FXS_WETH_Sushi = artifacts.require("Staking/Variants/StakingRewardsDual_FXS_WETH_Sushi.sol");
// const StakingRewardsDual_FRAX3CRV = artifacts.require("Staking/Variants/StakingRewardsDual_FRAX3CRV.sol");

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const CRV_DAO_ERC20_Mock = artifacts.require("ERC20/Variants/CRV_DAO_ERC20_Mock");
// const Comp = artifacts.require("ERC20/Variants/Comp");
const FNX = artifacts.require("ERC20/Variants/FNX");

// veFXS related
const veFXS = artifacts.require("Curve/veFXS");
const veFXSYieldDistributor = artifacts.require("Staking/veFXSYieldDistributor");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Investor contract related
const FraxPoolInvestorForV2 = artifacts.require("Misc_AMOs/FraxPoolInvestorForV2.sol");
const FraxLendingAMO = artifacts.require("Misc_AMOs/FraxLendingAMO.sol");
const IyUSDC_V2_Partial = artifacts.require("Misc_AMOs/yearn/IyUSDC_V2_Partial.sol");
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial.sol");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial.sol");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial.sol");
const ICompComptrollerPartial = artifacts.require("Misc_AMOs/compound/ICompComptrollerPartial.sol");
const ICREAM_crFRAX = artifacts.require("Misc_AMOs/cream/ICREAM_crFRAX.sol");
const IFNX_CFNX = artifacts.require("Misc_AMOs/finnexus/IFNX_CFNX.sol");
const IFNX_FPT_FRAX = artifacts.require("Misc_AMOs/finnexus/IFNX_FPT_FRAX.sol");
const IFNX_FPT_B = artifacts.require("Misc_AMOs/finnexus/IFNX_FPT_B.sol");
const IFNX_IntegratedStake = artifacts.require("Misc_AMOs/finnexus/IFNX_IntegratedStake.sol");
const IFNX_MinePool = artifacts.require("Misc_AMOs/finnexus/IFNX_MinePool.sol");
const IFNX_TokenConverter = artifacts.require("Misc_AMOs/finnexus/IFNX_TokenConverter.sol");
const IFNX_ManagerProxy = artifacts.require("Misc_AMOs/finnexus/IFNX_ManagerProxy.sol");

// Misc AMOs
const FXS1559_AMO_V2 = artifacts.require("Misc_AMOs/FXS1559_AMO_V2.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const COLLATERAL_SEED_DEC6 = new BigNumber(508500e6);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
const THREE_THOUSAND_DEC6 = new BigNumber(3000e6);
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

contract('FXS1559AMO_V2-Tests', async (accounts) => {
	let CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let ALLOCATIONS = constants.ALLOCATIONS;

	// Constants
	let ORIGINAL_FRAX_DEPLOYER_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADDRESS;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	const ADDRESS_WITH_FXS = '0x8a97a178408d7027355a7ef144fdf13277cea776';
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_FRAX3CRV = '0x7939f2d7e0ae5C26d4dD86859807749f87E5B5Dd';
	const ADDRESS_WITH_FRAX = '0xeb7AE9d125442A5b4ed57FE7C4Cbc87512B02ADA';

	// Initialize core contract instances
	let fraxInstance;
	let fxsInstance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let col_instance_USDC;
	let sushi_instance;
	let mockFRAX3CRVInstance;
	let mockCRVDAOInstance;
	let fnx_instance;
	
	// Initialize the Uniswap Router Instance
	let routerInstance; 

	// Initialize the Uniswap Factory Instance
	let factoryInstance; 

	// Initialize the Uniswap Libraries
	let uniswapLibraryInstance;
	let uniswapOracleLibraryInstance;

	// Initialize the Timelock instance
	let timelockInstance; 

	// Initialize the swap to price contract
	let swapToPriceInstance;

	// Initialize oracle instances
	let oracle_instance_FRAX_WETH;
	let oracle_instance_FRAX_USDC;
	let oracle_instance_FRAX_FXS;
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	// Initialize ETH-USD Chainlink Oracle too
	let oracle_chainlink_ETH_USD;

	// Initialize the governance contract
	let governanceInstance;

	// Initialize pool instances
	let pool_instance_USDC;
	let pool_instance_USDC_vAMM;
	

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
	let fraxLendingAMO_instance;
	let yUSDC_instance;
    let aUSDC_pool_instance;
	let aUSDC_token_instance;
	let cUSDC_instance;
	let compController_instance;
	let crFRAX_instance;
    let CFNX_instance;
    let IFNX_FPT_FRAX_instance;
    let IFNX_FPT_B_instance;
    let IFNX_IntegratedStake_instance;
    let IFNX_MinePool_instance;
    let IFNX_TokenConverter_instance;
	let IFNX_ManagerProxy_instance;

	// Misc AMOs
	let fxs1559_amo_v2_instance;

	// Initialize veFXS related instances
	let veFXS_instance;
	let veFXSYieldDistributor_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_DEPLOYER_ADDRESS]
		});

		// Constants
		ORIGINAL_FRAX_DEPLOYER_ADDRESS = process.env.FRAX_DEPLOYER_ADDRESS;
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
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();

		// vestingInstance = await TokenVesting.deployed();

		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 
		sushi_instance = await SushiToken.deployed(); 
		// comp_instance = await Comp.deployed(); 
		fnx_instance = await FNX.deployed(); 

		// Fill the Uniswap Router Instance
		routerInstance = await UniswapV2Router02.deployed(); 

		// Fill the Timelock instance
		timelockInstance = await Timelock.deployed(); 

		// Fill oracle instances
		oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
		oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed(); 
		oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.deployed(); 
		 
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed();
		
		oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
		
		// Initialize ETH-USD Chainlink Oracle too
		oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();

		// Initialize the governance contract
		governanceInstance = await GovernorAlpha.deployed();

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		// pool_instance_USDC_vAMM = await PoolvAMM_USDC.deployed();
		
		// Initialize the Uniswap Factory Instance
		uniswapFactoryInstance = await UniswapV2Factory.deployed(); 

		// Initialize the Uniswap Libraries
		// uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed(); 
		// uniswapOracleLibraryInstance = await UniswapV2Library.deployed(); 

		// Initialize the swap to price contract
		// swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/FXS"]);
		pair_instance_FXS_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.oracles_other.FXS_USDC_PAIR);

		// Get instances of the Sushi pairs
		pair_instance_FRAX_FXS_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FRAX/FXS"]);
		pair_instance_FXS_WETH_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FXS/WETH"]);

		// Get the mock CRVDAO Instance
		mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.deployed();

		// Get the mock FRAX3CRV Instance
		// mockFRAX3CRVInstance = await FRAX3CRV_Mock.deployed(); 

		// Get the pair order results
		isToken0Frax_FRAX_WETH = await oracle_instance_FRAX_WETH.token0();
		isToken0Frax_FRAX_USDC = await oracle_instance_FRAX_USDC.token0();
		isToken0Fxs_FXS_WETH = await oracle_instance_FXS_WETH.token0();
		isToken0Fxs_FXS_USDC = await oracle_instance_FXS_USDC.token0();

		isToken0Frax_FRAX_WETH = fraxInstance.address == isToken0Frax_FRAX_WETH;
		isToken0Frax_FRAX_USDC = fraxInstance.address == isToken0Frax_FRAX_USDC;
		isToken0Fxs_FXS_WETH = fxsInstance.address == isToken0Fxs_FXS_WETH;
		isToken0Fxs_FXS_USDC = fxsInstance.address == isToken0Fxs_FXS_USDC;

		// Fill the staking rewards instances
		stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
		stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		// stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();

		// Investor related
		yUSDC_instance = await IyUSDC_V2_Partial.deployed();
		aUSDC_pool_instance = await IAAVELendingPool_Partial.deployed();
		aUSDC_token_instance = await IAAVE_aUSDC_Partial.deployed();
		cUSDC_instance = await IcUSDC_Partial.deployed();
		compController_instance = await ICompComptrollerPartial.deployed();
		crFRAX_instance = await ICREAM_crFRAX.deployed();
		CFNX_instance = await IFNX_CFNX.deployed();
		IFNX_FPT_FRAX_instance = await IFNX_FPT_FRAX.deployed();
		IFNX_FPT_B_instance = await IFNX_FPT_B.deployed();
		IFNX_IntegratedStake_instance = await IFNX_IntegratedStake.deployed();
		IFNX_MinePool_instance = await IFNX_MinePool.deployed();
		IFNX_TokenConverter_instance = await IFNX_TokenConverter.deployed();
		IFNX_ManagerProxy_instance = await IFNX_ManagerProxy.deployed();

		// Misc AMOs
		fraxPoolInvestorForV2_instance = await FraxPoolInvestorForV2.deployed();
		fraxLendingAMO_instance = await FraxLendingAMO.deployed();

		// Initialize veFXS related instances
		veFXS_instance = await veFXS.deployed();
		veFXSYieldDistributor_instance = await veFXSYieldDistributor.deployed();

		// console.log("=========================Proxy Deployments=========================");

		// console.log(chalk.yellow('========== FXS1559_AMO_V2 =========='));
		const FXS1559_AMO_V2_Implementation = await hre.ethers.getContractFactory("FXS1559_AMO_V2");
		const proxy_obj = await hre.upgrades.deployProxy(FXS1559_AMO_V2_Implementation, [
			fraxInstance.address, 
			fxsInstance.address, 
			pool_instance_USDC.address, 
			col_instance_USDC.address,
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			INVESTOR_CUSTODIAN_ADDRESS, 
			timelockInstance.address,
			fraxPoolInvestorForV2_instance.address,
			"0xB8315Af919729c823B2d996B1A6DDE381E7444f1", // Investor AMO V2
			veFXSYieldDistributor_instance.address
		]);
		const proxy_instance = await proxy_obj.deployed();
		console.log("FXS1559_AMO_V2 proxy deployed at: ", proxy_instance.address);

		// Get out of ethers and back to web3. It gives a signer-related error
		fxs1559_amo_v2_instance = await FXS1559_AMO_V2.at(proxy_instance.address);

		// If truffle-fixture is used
		// fxs1559_amo_v2_instance = await FXS1559_AMO_V2.deployed();
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_DEPLOYER_ADDRESS]
		});
	})

	// // INITIALIZATION
	// // ================================================================
	// it('Initialization related', async () => {
	// 	console.log("=========================Initialization=========================");
	// 	console.log("----------------------------");

	// 	console.log("Add the FXS-1559 V2 AMO contract as a 'pool'");
	// 	await fraxInstance.addPool(fxs1559_amo_v2_instance.address, { from: process.env.FRAX_DEPLOYER_ADDRESS });

	// 	// Refresh oracle
	// 	try{
	// 		await oracle_instance_FXS_WETH.update();
	// 	}
	// 	catch (err) {}

	// 	// Get the prices
	// 	// Price is in collateral needed for 1 FRAX
	// 	let frax_price_from_FRAX_WETH = (new BigNumber(await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	// 	let frax_price_from_FRAX_USDC = (new BigNumber(await oracle_instance_FRAX_USDC.consult.call(fraxInstance.address, new BigNumber("1e18")))).div(BIG6);

	// 	let fxs_price_from_FXS_WETH = (new BigNumber(await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6))).div(BIG6).toNumber();
	// 	let fxs_price_from_FXS_USDC = (new BigNumber(await oracle_instance_FXS_USDC.consult.call(fxsInstance.address, new BigNumber("1e18")))).div(BIG6);
		
	// 	let USDC_price_from_USDC_WETH = (new BigNumber(await oracle_instance_USDC_WETH.consult.call(wethInstance.address, new BigNumber("1e18")))).div(BIG6);


	// 	console.log(chalk.blue("==================PRICES=================="));
	// 	// Print the new prices
	// 	console.log("ETH-USD price from Chainlink:", (new BigNumber((await fraxInstance.frax_info.call())['7'])).div(1e6).toString() , "USD = 1 ETH");
	// 	console.log("frax_price_from_FRAX_WETH: ", frax_price_from_FRAX_WETH.toString(), "FRAX = 1 WETH");
	// 	console.log("FRAX-USD price from Chainlink, Uniswap:", (new BigNumber(await fraxInstance.frax_price.call())).div(1e6).toString(), "FRAX = 1 USD",);
	// 	console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), "USDC = 1 FRAX");
	// 	console.log("fxs_price_from_FXS_WETH: ", fxs_price_from_FXS_WETH.toString(), "FXS = 1 WETH");
	// 	console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), "USDC = 1 FXS");
	// 	console.log("USDC_price_from_USDC_WETH: ", USDC_price_from_USDC_WETH.toString(), "USDC = 1 WETH");
	// 	console.log("USDC_price_from_pool: ", (new BigNumber (await pool_instance_USDC.getCollateralPrice.call())).div(1e6).toString(), "USDC = 1 USD");

	// 	let fxs_usdc_reserves = (await pair_instance_FXS_USDC.getReserves());
	// 	let fxs_current_reserves = (new BigNumber(fxs_usdc_reserves[0])).toNumber();
	// 	let usdc_current_reserves = (new BigNumber(fxs_usdc_reserves[1])).toNumber();
	// 	console.log("FXS-USDC reserves:", fxs_current_reserves, "FXS to", usdc_current_reserves, "USDC");
	// 	console.log(`[vAMM]: 1 FXS = ${(usdc_current_reserves * 1e12 / fxs_current_reserves).toFixed(4)} USDC`);
	// 	console.log("[oracle]: 1 FXS = ", fxs_price_from_FXS_USDC.toString(), "USDC");

	// });

	// ================================================================
	it('Main test', async () => {
		console.log("=========================Initialization=========================");
		console.log("----------------------------");

		console.log("Add the FXS-1559 V2 AMO contract as a 'pool'");
		await fraxInstance.addPool(fxs1559_amo_v2_instance.address, { from: process.env.FRAX_DEPLOYER_ADDRESS });

		// Refresh oracle
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		console.log("==============NOTE INFO BEFORE===============");
		const cr_info_before_0 = await fxs1559_amo_v2_instance.cr_info();
		const fxs_supply_before_0 = new BigNumber(await fxsInstance.totalSupply()).div(BIG18).toNumber();
		const unspentInvestorAMOProfit_E18_before_0 = new BigNumber(await fxs1559_amo_v2_instance.unspentInvestorAMOProfit_E18()).div(BIG18).toNumber();
		const yield_distributor_FXS_before_0 = new BigNumber(await fxsInstance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("effective_collateral_ratio before: ", new BigNumber(cr_info_before_0[0]).div(BIG6).toNumber());
		console.log("global_collateral_ratio before: ", new BigNumber(cr_info_before_0[1]).div(BIG6).toNumber());
		console.log("excess_collateral_e18 before: ", new BigNumber(cr_info_before_0[2]).div(BIG18).toNumber());
		console.log("frax_mintable before: ", new BigNumber(cr_info_before_0[3]).div(BIG18).toNumber());
		console.log("fxs_supply before: ", fxs_supply_before_0);
		console.log("unspentInvestorAMOProfit_E18 before: ", unspentInvestorAMOProfit_E18_before_0);
		console.log("yield_distributor_FXS_before_0: ", yield_distributor_FXS_before_0);

		console.log("=========================RUN A SMALL, MANUAL MINT_SWAP_BURN CYCLE=========================");

		await fxs1559_amo_v2_instance.mintSwapBurn(new BigNumber('25000e6') , true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("==============NOTE INFO AFTER===============");
		const cr_info_after_0 = await fxs1559_amo_v2_instance.cr_info();
		const fxs_supply_after_0 = new BigNumber(await fxsInstance.totalSupply()).div(BIG18).toNumber();
		const unspentInvestorAMOProfit_E18_after_0 = new BigNumber(await fxs1559_amo_v2_instance.unspentInvestorAMOProfit_E18()).div(BIG18).toNumber();
		const yield_distributor_FXS_after_0 = new BigNumber(await fxsInstance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("effective_collateral_ratio after: ", new BigNumber(cr_info_after_0[0]).div(BIG6).toNumber());
		console.log("global_collateral_ratio after: ", new BigNumber(cr_info_after_0[1]).div(BIG6).toNumber());
		console.log("excess_collateral_e18 after: ", new BigNumber(cr_info_after_0[2]).div(BIG18).toNumber());
		console.log("frax_mintable after: ", new BigNumber(cr_info_after_0[3]).div(BIG18).toNumber());
		console.log("fxs_supply after: ", fxs_supply_after_0);
		console.log("fxs_supply_change after: ", fxs_supply_after_0 - fxs_supply_before_0);
		console.log("unspentInvestorAMOProfit_E18 after: ", unspentInvestorAMOProfit_E18_after_0);
		console.log("yield_distributor_FXS_after_0: ", yield_distributor_FXS_after_0);

		console.log(chalk.blue("****************************************"));

		console.log("==============NOTE CR INFO BEFORE===============");
		const cr_info_before = await fxs1559_amo_v2_instance.cr_info();
		const fxs_supply_before = new BigNumber(await fxsInstance.totalSupply()).div(BIG18).toNumber();
		const unspentInvestorAMOProfit_E18_before = new BigNumber(await fxs1559_amo_v2_instance.unspentInvestorAMOProfit_E18()).div(BIG18).toNumber();
		const yield_distributor_FXS_before = new BigNumber(await fxsInstance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("effective_collateral_ratio before: ", new BigNumber(cr_info_before[0]).div(BIG6).toNumber());
		console.log("global_collateral_ratio before: ", new BigNumber(cr_info_before[1]).div(BIG6).toNumber());
		console.log("excess_collateral_e18 before: ", new BigNumber(cr_info_before[2]).div(BIG18).toNumber());
		console.log("frax_mintable before: ", new BigNumber(cr_info_before[3]).div(BIG18).toNumber());
		console.log("fxs_supply before: ", fxs_supply_before);
		console.log("unspentInvestorAMOProfit_E18 before: ", unspentInvestorAMOProfit_E18_before);
		console.log("yield_distributor_FXS_before: ", yield_distributor_FXS_before);

		console.log("=========================RUN A MINT_SWAP_BURN CYCLE=========================");

		await fxs1559_amo_v2_instance.mintSwapBurn(0 , false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("==============NOTE CR INFO AFTER===============");
		const cr_info_after = await fxs1559_amo_v2_instance.cr_info();
		const fxs_supply_after = new BigNumber(await fxsInstance.totalSupply()).div(BIG18).toNumber();
		const unspentInvestorAMOProfit_E18_after = new BigNumber(await fxs1559_amo_v2_instance.unspentInvestorAMOProfit_E18()).div(BIG18).toNumber();
		const yield_distributor_FXS_after = new BigNumber(await fxsInstance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("effective_collateral_ratio after: ", new BigNumber(cr_info_after[0]).div(BIG6).toNumber());
		console.log("global_collateral_ratio after: ", new BigNumber(cr_info_after[1]).div(BIG6).toNumber());
		console.log("excess_collateral_e18 after: ", new BigNumber(cr_info_after[2]).div(BIG18).toNumber());
		console.log("frax_mintable after: ", new BigNumber(cr_info_after[3]).div(BIG18).toNumber());
		console.log("fxs_supply after: ", fxs_supply_after);
		console.log("fxs_supply_change after: ", fxs_supply_after - fxs_supply_before);
		console.log("unspentInvestorAMOProfit_E18 after: ", unspentInvestorAMOProfit_E18_after);
		console.log("yield_distributor_FXS_after: ", yield_distributor_FXS_after);

		console.log(chalk.blue("****************************************"));

		console.log("==============MANUALLY SET THE UNSPENT PROFIT===============");
		await fxs1559_amo_v2_instance.setAMOProfits(new BigNumber("1000000e18"), true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("==============NOTE CR INFO BEFORE===============");
		const cr_info_before_2 = await fxs1559_amo_v2_instance.cr_info();
		const fxs_supply_before_2 = new BigNumber(await fxsInstance.totalSupply()).div(BIG18).toNumber();
		const unspentInvestorAMOProfit_E18_before_2 = new BigNumber(await fxs1559_amo_v2_instance.unspentInvestorAMOProfit_E18()).div(BIG18).toNumber();
		const yield_distributor_FXS_before_2 = new BigNumber(await fxsInstance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("effective_collateral_ratio before: ", new BigNumber(cr_info_before_2[0]).div(BIG6).toNumber());
		console.log("global_collateral_ratio before: ", new BigNumber(cr_info_before_2[1]).div(BIG6).toNumber());
		console.log("excess_collateral_e18 before: ", new BigNumber(cr_info_before_2[2]).div(BIG18).toNumber());
		console.log("frax_mintable before: ", new BigNumber(cr_info_before_2[3]).div(BIG18).toNumber());
		console.log("fxs_supply before: ", fxs_supply_before_2);
		console.log("unspentInvestorAMOProfit_E18 before: ", unspentInvestorAMOProfit_E18_before_2);
		console.log("yield_distributor_FXS_before_2: ", yield_distributor_FXS_before_2);

		console.log("=========================RUN A MINT_SWAP_BURN CYCLE AGAIN=========================");

		await fxs1559_amo_v2_instance.mintSwapBurn(0 , false, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("==============NOTE CR INFO AFTER===============");
		const cr_info_after_2 = await fxs1559_amo_v2_instance.cr_info();
		const fxs_supply_after_2 = new BigNumber(await fxsInstance.totalSupply()).div(BIG18).toNumber();
		const unspentInvestorAMOProfit_E18_after_2 = new BigNumber(await fxs1559_amo_v2_instance.unspentInvestorAMOProfit_E18()).div(BIG18).toNumber();
		const yield_distributor_FXS_after_2 = new BigNumber(await fxsInstance.balanceOf(veFXSYieldDistributor_instance.address)).div(BIG18).toNumber();
		
		console.log("effective_collateral_ratio after: ", new BigNumber(cr_info_after_2[0]).div(BIG6).toNumber());
		console.log("global_collateral_ratio after: ", new BigNumber(cr_info_after_2[1]).div(BIG6).toNumber());
		console.log("excess_collateral_e18 after: ", new BigNumber(cr_info_after_2[2]).div(BIG18).toNumber());
		console.log("frax_mintable after: ", new BigNumber(cr_info_after_2[3]).div(BIG18).toNumber());
		console.log("fxs_supply after: ", fxs_supply_after_2);
		console.log("fxs_supply_change after: ", fxs_supply_after_2 - fxs_supply_before_2);
		console.log("unspentInvestorAMOProfit_E18 after: ", unspentInvestorAMOProfit_E18_after_2);
		console.log("yield_distributor_FXS_after_2: ", yield_distributor_FXS_after_2);

		return;

		console.log("====================CHECK ERC20 RECOVER===================");
		const frax_balance_before_emergency = new BigNumber(await fraxInstance.balanceOf.call(fraxLendingAMO_instance.address)).div(BIG18);
		console.log("FRAX balance before emergency: ", frax_balance_before_emergency.toNumber());
		await fraxLendingAMO_instance.recoverERC20(fraxInstance.address, new BigNumber("1000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const frax_balance_after_emergency = new BigNumber(await fraxInstance.balanceOf.call(fraxLendingAMO_instance.address)).div(BIG18);
		console.log("FRAX balance after emergency: ", frax_balance_after_emergency.toNumber());
		console.log("FRAX withdrawn: ", frax_balance_before_emergency.toNumber() - frax_balance_after_emergency.toNumber());



		// TODO:
	});

	it("Fail Tests ", async () => {

		console.log("---------TRY TO MANUALLY MINTSWAPBURN A LOT OF USDC---------");
		await expectRevert(
			fxs1559_amo_v2_instance.mintSwapBurn(new BigNumber('1000000000e6') , true, { from: COLLATERAL_FRAX_AND_FXS_OWNER }),
			"Minting would cause collateral ratio to be too low"
		);


	});
	
});