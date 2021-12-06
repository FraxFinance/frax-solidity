const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const constants = require(path.join(__dirname, '../../../dist/types/constants'));

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
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const ERC20 = artifacts.require("ERC20/ERC20.sol");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");

// Oracles
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

// Staking contracts

// Rewards token related
const SushiToken = artifacts.require("ERC20/Variants/SushiToken");
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const FRAX3CRV_V2_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_V2_Mock");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
const CurveFactory = artifacts.require("Curve/Factory");
const MetaImplementationUSD = artifacts.require("Curve/IMetaImplementationUSD");
const StableSwap3Pool = artifacts.require("Curve/IStableSwap3Pool");

// veFXS related
const veFXS = artifacts.require("Curve/IveFXS");
const veFXSYieldDistributorV3 = artifacts.require("Staking/veFXSYieldDistributorV4V3");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('PIDController-Tests', async (accounts) => {
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
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_CRV_DAO = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
	const ADDRESS_WITH_FRAX3CRV_V2 = '0x36a87d1e3200225f881488e4aeedf25303febcae';

	const ADDRESS_WITH_ETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';

	const ADDRESS_WITH_3CRV = '0x5c00977a2002a3C9925dFDfb6815765F578a804f';
	const ADDRESS_WITH_DAI = '0x5a16552f59ea34e44ec81e58b3817833e9fd5436';
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';
	// Curve Metapool
	let crv3Instance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_real_instance;
	let usdt_real_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;

	// Initialize core contract instances
	let frax_instance;
	let fxs_instance;

	// Initialize collateral instances
	let wethInstance;
	let usdc_instance;
	let sushi_instance;
	let mockFRAX3CRVInstance;
	let mockFRAX3CRV_V2Instance;

	// Initialize oracle instances
	
	let oracle_instance_FXS_WETH;
	let oracle_instance_FXS_USDC;

	let pid_controller_instance
	let reserve_tracker_instance;

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
	// let stakingInstanceDual_FRAX3CRV;
	let stakingInstanceDualV2_FRAX3CRV_V2;

	// Initialize veFXS related instances
	let veFXS_instance;
	let veFXSYieldDistributorV3_instance;

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

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		//usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		//usdt_real_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		//curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		frax_3crv_metapool_instance = await MetaImplementationUSD.at(CONTRACT_ADDRESSES.ethereum.pair_tokens["Curve FRAX3CRV-f-2"]);
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');

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

		// Initialize pool instances
		pool_instance_USDC = await Pool_USDC.deployed();
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed();


		

		

		

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		// stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();
		stakingInstanceDualV2_FRAX3CRV_V2 = await StakingRewardsDualV2_FRAX3CRV_V2.deployed();

		// Initialize veFXS related instances
		veFXS_instance = await veFXS.deployed();
		veFXSYieldDistributorV3_instance = await veFXSYieldDistributorV3.deployed();
	}); 
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})

	// INITIALIZATION
	// ================================================================
	it('Check up on the oracles and make sure the prices are set', async () => {

		// Refresh FXS / WETH oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}


		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("5000000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]
		});

		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [ADDRESS_WITH_ETH]}
		// );

		// // Give the ADDRESS_WITH_FRAX address some ETH
		// await hre.web3.eth.sendTransaction({ to: ADDRESS_WITH_FRAX, from: ADDRESS_WITH_ETH, value: hre.web3.utils.toWei("1", "ether")});

		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [ADDRESS_WITH_ETH]}
		// );

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]
		});

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000e18"), { from: ADDRESS_WITH_FRAX });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);



		// Transfer some 3CRV
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_3CRV]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some 3CRV
		//await crv3Instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10100e18"), { from: ADDRESS_WITH_3CRV });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_3CRV]
		});
		

		// Transfer some DAI
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_DAI]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some DAI
		await daiInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("50e18"), { from: ADDRESS_WITH_DAI });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_DAI]
		});

		// Transfer a lot of USDC
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC_2]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: ADDRESS_WITH_USDC_2 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC_2]
		});

		// Transfer a lot of USDC
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC_3]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: ADDRESS_WITH_USDC_3 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC_3]
		});


		// Transfer a lot of USDC
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']}
		);

		await web3.eth.sendTransaction({ from: COLLATERAL_FRAX_AND_FXS_OWNER, to: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', value: 99600000000000000})
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("84000000e6"), { from: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503' });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']
		});


		// Transfer a lot of USDT
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40']}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDT
		//await usdt_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: '0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40' });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40']
		});



		// Transfer a lot of DAI
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca']}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real DAI
		await daiInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("20000000e18"), { from: '0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca' });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca']
		});

	});

	it("Tests CCR FRAX amount", async () => {
		await usdc_instance.approve(stableswap3pool_instance.address, new BigNumber("200000000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		//await usdt_real_instance.approve(stableswap3pool_instance.address, new BigNumber("200000000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		//await daiInstance.approve(stableswap3pool_instance.address, new BigNumber("20000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER USDC balance:", new BigNumber(await usdc_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6).toNumber());
		await stableswap3pool_instance.add_liquidity([0, new BigNumber("20000000e6"), 0], 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0xb39e2041b042f39b8572B6F84dEba99BbB589c8d']}
		);

		await pool_instance_USDC.setPoolParameters(new BigNumber("1000000000e18"), 0, 0, 0, 0, 0, 0, { from: '0xb39e2041b042f39b8572B6F84dEba99BbB589c8d' });

		// Set CR to 100%
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0x234D953a9404Bf9DbC3b526271d440cD2870bCd2']}
		);
		console.log("frax_price:", new BigNumber(await frax_instance.frax_price()).div(BIG6).toNumber());
        await frax_instance.setPriceTarget(new BigNumber("2e6"), { from: '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2' });
        await frax_instance.setFraxStep(1000000, { from: '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2' });
        await frax_instance.toggleCollateralRatio({ from: '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2' });
        await frax_instance.refreshCollateralRatio();
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ['0x234D953a9404Bf9DbC3b526271d440cD2870bCd2']
		});

		console.log("Frax CR:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());

		console.log("accounts[1] fake USDC balance:", new BigNumber(await usdc_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6).toNumber());
		await usdc_instance.approve(pool_instance_USDC.address, new BigNumber("170000000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pool_instance_USDC.mint1t1FRAX(new BigNumber("170000000e6"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] FRAX balance:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		console.log("accounts[1] add liquidity: 15m FRAX and 15m 3CRV to FRAX3CRV-f Metapool")
		const crv3Amount_metaliq = new BigNumber("15000000e18");
		const fraxAmount_metaliq = new BigNumber("15000000e18");
		await crv3Instance.approve(frax_3crv_metapool_instance.address, crv3Amount_metaliq, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(frax_3crv_metapool_instance.address, fraxAmount_metaliq, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const addliq_metapool = [fraxAmount_metaliq, crv3Amount_metaliq];
		await frax_3crv_metapool_instance.add_liquidity(addliq_metapool, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] FRAX3CRV-f metapool LP token balance:", new BigNumber(await frax_3crv_metapool_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());		

		await frax_instance.approve(frax_3crv_metapool_instance.address, new BigNumber("10000000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		let amountOut = 1e6;
		let amountSwapped = 0;

		// // attempt to find a numerical solution to a 1% price impact of FRAX-3CRV, i.e. how much can we swap before FRAX goes to $0.99
		// while(amountOut >= 990000){

		// 	// this line is throwing an error for some reason
		// 	await frax_3crv_metapool_instance.exchange_underlying(0, 2, new BigNumber("100000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// 	amountOut = await frax_3crv_metapool_instance.get_dy_underlying(0, 2, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// 	console.log("amountOut:", amountOut.toNumber());
		// 	amountSwapped += 100000e18
		// }
		// console.log("amountSwapped:", amountSwapped / BIG18);
/*
		await usdc_instance.approve(frax_3crv_metapool_instance.address, new BigNumber("1000000000000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_3crv_metapool_instance.exchange_underlying(2, 0, new BigNumber("8800000e6"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await frax_instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());		

		console.log("accounts[1] add liquidity: 90m FRAX and 90m 3CRV to FRAX3CRV-f Metapool")
		const crv3Amount_metaliq2 = new BigNumber("90000000e18");
		const fraxAmount_metaliq2 = new BigNumber("90000000e18");
		await crv3Instance.approve(frax_3crv_metapool_instance.address, crv3Amount_metaliq2, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(frax_3crv_metapool_instance.address, fraxAmount_metaliq2, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const addliq_metapool2 = [fraxAmount_metaliq2, crv3Amount_metaliq2];
		await frax_3crv_metapool_instance.add_liquidity(addliq_metapool2, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] FRAX3CRV-f metapool LP token balance:", new BigNumber(await frax_3crv_metapool_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());


		amountOut = 1e6;
		amountSwapped = 0;

		// attempt to find a numerical solution to a 1% price impact of FRAX-3CRV, i.e. how much can we swap before FRAX goes to $0.99
		while(amountOut >= 990000){

			// this line is throwing an error for some reason
			await frax_3crv_metapool_instance.exchange_underlying(0, 2, new BigNumber("250000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

			amountOut = await frax_3crv_metapool_instance.get_dy_underlying(0, 2, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
			console.log("amountOut:", amountOut.toNumber());
			amountSwapped += 250000e18
		}
		console.log("amountSwapped:", amountSwapped / BIG18);
*/
	})

	it("Tests the Curve TWAP", async () => {
		console.log("=========================Curve Metapool TWAP=========================");
		console.log("accounts[1] 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] FRAX balance:", new BigNumber(await frax_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		console.log("FRAX3CRV-f token address in index 0:", await frax_3crv_metapool_instance.coins.call(0));
		console.log("FRAX3CRV-f token address in index 1:", await frax_3crv_metapool_instance.coins.call(1));

		//console.log("swappable coins in FRAX3CRV-f pool:", await curve_factory_instance.get_underlying_coins(frax_3crv_metapool_instance.address));

		console.log("accounts[1] add liquidity: 10,000 FRAX and 10,000 3CRV to FRAX3CRV-f Metapool")
		const crv3Amount_metaliq = new BigNumber("10000e18");
		const fraxAmount_metaliq = new BigNumber("10000e18");
		await crv3Instance.approve(frax_3crv_metapool_instance.address, crv3Amount_metaliq, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_instance.approve(frax_3crv_metapool_instance.address, fraxAmount_metaliq, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		//console.log(frax_3crv_metapool_instance);

		console.log("admin fee:", new BigNumber(await frax_3crv_metapool_instance.admin_fee()).toNumber());
		//console.log("get_virtual_price:", new BigNumber(await frax_3crv_metapool_instance.get_virtual_price()).toNumber()); //div-by-zero if pool is empty

		const addliq_metapool = [fraxAmount_metaliq, crv3Amount_metaliq];
		await frax_3crv_metapool_instance.add_liquidity(addliq_metapool, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("accounts[1] FRAX3CRV-f metapool LP token balance:", new BigNumber(await frax_3crv_metapool_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());

		// get the exchange rate of (1) 3CRV for (dy) FRAX
		console.log("\nspot price of (1) 3CRV for (dy) FRAX using get_dy():",  new BigNumber(await frax_3crv_metapool_instance.get_dy(1, 0, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber());

		console.log("\nmetapool get_dy_underlying() amounts:");
		//await daiInstance.approve(frax_3crv_metapool_instance.address, new BigNumber("50e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// get_dy_underlying(1, 2) swaps DAI for USDC
		console.log("Swap 1 DAI for X USDC:", new BigNumber(await frax_3crv_metapool_instance.get_dy_underlying(1, 2, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6).toNumber());
		// get_dy_underlying(2, 3) swaps USDC for USDT
		console.log("Swap 1 USDC for X USDT:", new BigNumber(await frax_3crv_metapool_instance.get_dy_underlying(2, 3, new BigNumber("1e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6).toNumber());
		// get_dy_underlying(3, 1) swaps USDT for DAI
		console.log("Swap 1 USDT for X DAI:", new BigNumber(await frax_3crv_metapool_instance.get_dy_underlying(3, 1, new BigNumber("1e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber());

		// get_dy_underlying(0, 2) swaps FRAX for COINS[1]
		console.log("Swap 1 FRAX for X USDC:", new BigNumber(await frax_3crv_metapool_instance.get_dy_underlying(0, 2, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG6).toNumber());
		// get_dy_underlying(2, 0) swaps COINS[1] for FRAX
		console.log("Swap 1 USDC for X FRAX:", new BigNumber(await frax_3crv_metapool_instance.get_dy_underlying(2, 0, new BigNumber("1e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER })).div(BIG18).toNumber());


		console.log("\nTWAP tests:");
		console.log("metapool FRAX balance:", new BigNumber(await frax_3crv_metapool_instance.balances.call(0)).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await frax_3crv_metapool_instance.balances.call(1)).div(BIG18).toNumber());
		const cum_price_1 = await frax_3crv_metapool_instance.get_price_cumulative_last();
		//console.log("cumulative_price_1:", new BigNumber(cum_price_1[0]).div(BIG18).toNumber(), new BigNumber(cum_price_1[1]).div(BIG18).toNumber());
		const timestamp_1 = await frax_3crv_metapool_instance.block_timestamp_last();

		console.log("\nadvancing 1 hr\n");
		await time.increase(3600);
		await time.advanceBlock();

		// swap 100 FRAX for 100 3CRV
		await frax_instance.approve(frax_3crv_metapool_instance.address, new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_3crv_metapool_instance.exchange(0, 1, new BigNumber("100e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("metapool FRAX balance:", new BigNumber(await frax_3crv_metapool_instance.balances.call(0)).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await frax_3crv_metapool_instance.balances.call(1)).div(BIG18).toNumber());

		const cum_price_2 = await frax_3crv_metapool_instance.get_price_cumulative_last();
		//console.log("cumulative_price_2:", new BigNumber(cum_price_2[0]).div(BIG18).toNumber(), new BigNumber(cum_price_2[1]).div(BIG18).toNumber());		
		const timestamp_2 = await frax_3crv_metapool_instance.block_timestamp_last();
		//console.log("timestamp_2:", timestamp_2.toNumber());

		const twap_balances = await frax_3crv_metapool_instance.get_twap_balances(cum_price_1, cum_price_2, timestamp_2 - timestamp_1, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("twap_balances:", new BigNumber(twap_balances[0]).div(BIG18).toNumber(), new BigNumber(twap_balances[1]).div(BIG18).toNumber());
		
		const virtual_price = new BigNumber(await frax_3crv_metapool_instance.get_virtual_price());
		const twap_dy = new BigNumber(await frax_3crv_metapool_instance.get_dy(0, 1, new BigNumber("1e18"), twap_balances, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		console.log("TWAP rate of (1) FRAX for (dy) 3CRV using get_dy():", twap_dy.div(BIG18).toNumber());
		console.log("FRAX TWAP:", twap_dy.div(virtual_price).toNumber());
		console.log("ReserveTracker refreshFRAXCurveTWAP():", new BigNumber(await reserve_tracker_instance.refreshFRAXCurveTWAP.call()).div(BIG6).toNumber());
		await reserve_tracker_instance.refreshFRAXCurveTWAP();


		console.log("\nadvancing 1 hr\n");
		await time.increase(3600);
		await time.advanceBlock();

		// swap 100 FRAX for 100 3CRV
		await frax_instance.approve(frax_3crv_metapool_instance.address, new BigNumber("100e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await frax_3crv_metapool_instance.exchange(0, 1, new BigNumber("100e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("metapool FRAX balance:", new BigNumber(await frax_3crv_metapool_instance.balances.call(0)).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await frax_3crv_metapool_instance.balances.call(1)).div(BIG18).toNumber());

		const cum_price_3 = await frax_3crv_metapool_instance.get_price_cumulative_last();
		//console.log("cumulative_price_3:", new BigNumber(cum_price_3[0]).div(BIG18).toNumber(), new BigNumber(cum_price_3[1]).div(BIG18).toNumber());		
		const timestamp_3 = await frax_3crv_metapool_instance.block_timestamp_last();
		//console.log("timestamp_2:", timestamp_2.toNumber());

		const twap_balances_2 = await frax_3crv_metapool_instance.get_twap_balances(cum_price_2, cum_price_3, timestamp_3 - timestamp_2, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("twap_balances:", new BigNumber(twap_balances_2[0]).div(BIG18).toNumber(), new BigNumber(twap_balances_2[1]).div(BIG18).toNumber());
		
		const virtual_price_2 = new BigNumber(await frax_3crv_metapool_instance.get_virtual_price());
		const twap_dy_2 = new BigNumber(await frax_3crv_metapool_instance.get_dy(0, 1, new BigNumber("1e18"), twap_balances_2, { from: COLLATERAL_FRAX_AND_FXS_OWNER }));
		console.log("TWAP rate of (1) FRAX for (dy) 3CRV using get_dy():", twap_dy_2.div(BIG18).toNumber());
		console.log("FRAX TWAP:", twap_dy_2.div(virtual_price_2).toNumber());
		console.log("ReserveTracker refreshFRAXCurveTWAP():", new BigNumber(await reserve_tracker_instance.refreshFRAXCurveTWAP.call()).div(BIG6).toNumber());

		await crv3Instance.approve(frax_3crv_metapool_instance.address, new BigNumber("1e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const amt_received = await frax_3crv_metapool_instance.exchange(1, 0, new BigNumber("1e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	});

	it("Checks the PIDController", async () => {
		console.log("=========================PIDController=========================");
		console.log("accounts[1] FXS balance:", new BigNumber(await fxs_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18).toNumber());
		console.log("accounts[1] USDC balance:", new BigNumber(await usdc_instance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6).toNumber());
		console.log("FRAX price:", new BigNumber(await reserve_tracker_instance.getFRAXPrice()).div(BIG6).toNumber());
		console.log("FRAX supply:", new BigNumber(await frax_instance.totalSupply()).div(BIG18).toNumber());
		console.log("FXS reserves:", new BigNumber(await reserve_tracker_instance.getFXSReserves()).div(BIG18).toNumber())
		
		//await reserve_tracker_instance.refreshFRAXCurveTWAP();
		console.log("FXS price:", new BigNumber(await reserve_tracker_instance.getFXSPrice()).div(BIG6).toNumber());
		//console.log("fxs_usd_pricer_decimals:", new BigNumber(await reserve_tracker_instance.chainlink_fxs_oracle_decimals()).toNumber());

		const oldCR = new BigNumber(await frax_instance.global_collateral_ratio()).toNumber();
		console.log("old collateral ratio:", oldCR);

		const isCRpaused = await frax_instance.collateral_ratio_paused();
		if(isCRpaused) {
			await frax_instance.toggleCollateralRatio({ from: ORIGINAL_FRAX_ONE_ADDRESS });
		}
		await frax_instance.setController(pid_controller_instance.address, { from: ORIGINAL_FRAX_ONE_ADDRESS });
		console.log("PIDController owner:", await pid_controller_instance.owner());
		console.log("COLLATERAL_FRAX_AND_FXS_OWNER:", COLLATERAL_FRAX_AND_FXS_OWNER);
		await pid_controller_instance.refreshCollateralRatio({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("growth ratio:", new BigNumber(await pid_controller_instance.growth_ratio()).div(BIG6).toNumber());
		console.log("collateral ratio:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());

		console.log("\nsetting CR again [should not change]");
		await pid_controller_instance.refreshCollateralRatio({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await time.increase(3600);
		await time.advanceBlock();
		await oracle_instance_FRAX_FXS.update();
		console.log("growth ratio:", new BigNumber(await pid_controller_instance.growth_ratio()).div(BIG6).toNumber());
		console.log("collateral ratio:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());

		// // Swap the FXS price up
		// await fxs_instance.approve(swapToPriceInstance.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await frax_instance.approve(swapToPriceInstance.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await swapToPriceInstance.swapToPrice(
		// 	fxs_instance.address,
		// 	frax_instance.address,
		// 	new BigNumber(1),
		// 	new BigNumber(10000),
		// 	new BigNumber(1),
		// 	new BigNumber(10000),
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	new BigNumber(2105300114),
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )
		// console.log("\nincreasing FXS price");
		await time.increase(3600);
		await time.advanceBlock();
		await oracle_instance_FRAX_FXS.update();

		await pid_controller_instance.refreshCollateralRatio({ from: COLLATERAL_FRAX_AND_FXS_OWNER });;
		const finalCR = new BigNumber(await frax_instance.global_collateral_ratio()).toNumber();
		console.log("final collateral ratio:", finalCR);
		console.log("growth ratio:", new BigNumber(await pid_controller_instance.growth_ratio()).div(BIG6).toNumber());
		console.log("FXS reserves:", new BigNumber(await reserve_tracker_instance.getFXSReserves()).div(BIG18).toNumber())
		console.log("FXS price:", new BigNumber(await reserve_tracker_instance.getFXSPrice()).div(BIG6).toNumber());

		console.log("changing FRAX price: check below price band");
		console.log("pair FRAX balance:", new BigNumber(await frax_instance.balanceOf(pair_instance_FRAX_USDC.address)).div(BIG18).toNumber());
		await frax_instance.transfer(pair_instance_FRAX_USDC.address, new BigNumber("10000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		//await usdc_instance.approve(swapToPriceInstance.address, new BigNumber("100000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		//force an _update() by swapping, so that cumulative reserves in the pair (and thus oracle price) will also be updated
		//await swapToPriceInstance.swapToPrice(frax_instance.address, usdc_instance.address, 1, 1, 1, 1, COLLATERAL_FRAX_AND_FXS_OWNER, 2105300114, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		
		console.log("pair FRAX balance:", new BigNumber(await frax_instance.balanceOf(pair_instance_FRAX_USDC.address)).div(BIG18).toNumber());
		console.log("[FRAX-USDC] FRAX price:", new BigNumber(await oracle_instance_FRAX_USDC.consult(frax_instance.address, new BigNumber("1e18"))).div(BIG6).toNumber());
		await time.increase(3600 + 1);
		await time.advanceBlock();
		await time.advanceBlock();
		await reserve_tracker_instance.refreshFRAXCurveTWAP();
		await oracle_instance_FRAX_USDC.update();
		await oracle_instance_FRAX_FXS.update();
		await oracle_instance_FXS_USDC.update();
		await oracle_instance_FXS_WETH.update();
		await oracle_instance_FRAX_WETH.update();

		console.log("FRAX price:", new BigNumber(await reserve_tracker_instance.getFRAXPrice()).div(BIG6).toNumber());
		console.log("[FRAX-USDC] FRAX price:", new BigNumber(await oracle_instance_FRAX_USDC.consult(frax_instance.address, new BigNumber("1e18"))).div(BIG6).toNumber());
		await console.log("");
		await pid_controller_instance.refreshCollateralRatio({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("collateral ratio:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());
		console.log("growth ratio:", new BigNumber(await pid_controller_instance.growth_ratio()).div(BIG6).toNumber());


		console.log("\nadding FXS liquidity");
		await fxs_instance.transfer(pair_instance_FXS_WETH.address, new BigNumber("100000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// do a quick swap
		// await wethInstance.approve(swapToPriceInstance.address, new BigNumber("10000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await fxs_instance.approve(swapToPriceInstance.address, new BigNumber("10000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await swapToPriceInstance.swapToPrice(
		// 	fxs_instance.address,
		// 	wethInstance.address,
		// 	1,
		// 	1,
		// 	1,
		// 	1,
		// 	COLLATERAL_FRAX_AND_FXS_OWNER,
		// 	2105300114,
		// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
		// )
		await time.increase(3600);
		await time.advanceBlock();
		await oracle_instance_FXS_WETH.update();
		console.log("activating growth ratio");
		await pid_controller_instance.useGrowthRatio(true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pid_controller_instance.refreshCollateralRatio({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		console.log("collateral ratio:", new BigNumber(await frax_instance.global_collateral_ratio()).toNumber());
		console.log("growth ratio:", new BigNumber(await pid_controller_instance.growth_ratio()).div(BIG6).toNumber());
	})

});