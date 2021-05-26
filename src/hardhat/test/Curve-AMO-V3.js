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


// const Address = artifacts.require("Utils/Address");
// const BlockMiner = artifacts.require("Utils/BlockMiner");
// const Math = artifacts.require("Math/Math");
// const SafeMath = artifacts.require("Math/SafeMath");
// const Babylonian = artifacts.require("Math/Babylonian");
// const FixedPoint = artifacts.require("Math/FixedPoint");
// const UQ112x112 = artifacts.require("Math/UQ112x112");
// const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("ERC20/ERC20");
// const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
// const SafeERC20 = artifacts.require("ERC20/SafeERC20");
const CRV_DAO_ERC20_Mock = artifacts.require("ERC20/Variants/CRV_DAO_ERC20_Mock");

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
const PoolvAMM_USDC = artifacts.require("Frax/Pools/PoolvAMM_USDC");

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
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const StakingRewards_FRAX_WETH = artifacts.require("Staking/Variants/Stake_FRAX_WETH.sol");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC.sol");
const StakingRewards_FRAX_FXS = artifacts.require("Staking/Variants/Stake_FRAX_FXS.sol");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");
// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

// Curve Metapool
const CurveFactory = artifacts.require("Curve/Factory");
const MetaImplementationUSD = artifacts.require("Curve/MetaImplementationUSD");
const StableSwap3Pool = artifacts.require("Curve/StableSwap3Pool");
const CurveAMO_V3 = artifacts.require("Curve/CurveAMO_V3.sol");

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
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";
const METAPOOL_ADDRESS = "0xC7E0ABfe4e0278af66F69C93CD3fD6810198b15B"; // hard-coded from deployment, can break

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('Curve AMO V3 Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	
	// console.log("accounts[0] in vAMM-Tests: ", accounts[0]);
	console.log("All accounts", accounts);



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
	const ADDRESS_WITH_ETH = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik's Vb
	const ADDRESS_WITH_FRAX = '0xeb7AE9d125442A5b4ed57FE7C4Cbc87512B02ADA';
	const ADDRESS_WITH_FXS = '0x8a97a178408d7027355a7ef144fdf13277cea776';
	const ADDRESS_WITH_3CRV = '0x89515406c15a277f8906090553366219b3639834';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';


	// Curve Metapool
	let crv3Instance;
	let mockCRVDAOInstance;
	let frax_3crv_metapool_instance;
	let daiInstance
	let usdc_real_instance;
	let usdt_real_instance;
	let curve_factory_instance;
	let stableswap3pool_instance;
	let curve_amo_v3_instance;

	// Initialize core contract instances
	let fraxInstance;
	let fxsInstance;

	// Initialize vesting instances
	let vestingInstance;

	// Initialize collateral instances
	let wethInstance;
	let col_instance_USDC;
	
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

	let pid_controller_instance;
    let reserve_tracker_instance;

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
			params: [process.env.FRAX_DEPLOYER_ADDRESS]}
		);

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

		crv3Instance = await ERC20.at("0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
		daiInstance = await ERC20.at("0x6b175474e89094c44da98b954eedeac495271d0f");
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		usdt_real_instance = await ERC20.at('0xdac17f958d2ee523a2206206994597c13d831ec7');
		// curve_factory_instance = await CurveFactory.at("0x0E94F085368949B2d85CA3740Ac2A9662FAE4942");
		// frax_3crv_metapool_instance = await MetaImplementationUSD.at(METAPOOL_ADDRESS); // can break if deployment order changes
		frax_3crv_metapool_instance = await MetaImplementationUSD.deployed();
		stableswap3pool_instance = await StableSwap3Pool.at('0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7');
		mockCRVDAOInstance = await CRV_DAO_ERC20_Mock.deployed();
	
		// Fill core contract instances
		fraxInstance = await FRAXStablecoin.deployed();
		fxsInstance = await FRAXShares.deployed();

		// vestingInstance = await TokenVesting.deployed();

		// Fill collateral instances
		wethInstance = await WETH.deployed();
		col_instance_USDC = await FakeCollateral_USDC.deployed(); 

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

		pid_controller_instance = await PIDController.deployed(); 
		reserve_tracker_instance = await ReserveTracker.deployed();

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
		swapToPriceInstance = await SwapToPrice.deployed(); 

		// Get instances of the Uniswap pairs
		pair_instance_FRAX_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/WETH"]);
		pair_instance_FRAX_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FRAX/USDC"]);
		pair_instance_FXS_WETH = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FXS/WETH"]);
		//pair_instance_FXS_USDC = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Uniswap FXS/USDC"]);

		// Get instances of the Sushi pairs
		pair_instance_FRAX_FXS_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FRAX/FXS"]);
		pair_instance_FXS_WETH_Sushi = await UniswapV2Pair.at(CONTRACT_ADDRESSES.mainnet.pair_tokens["Sushi FXS/WETH"]);

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

		// console.log("=========================Proxy Deployments=========================");

		// console.log(chalk.yellow('========== Curve AMO V3 =========='));
		// const CurveAMO_V3_Implementation = await hre.ethers.getContractFactory("CurveAMO_V3");
		// const proxy_obj = await hre.upgrades.deployProxy(CurveAMO_V3_Implementation, [
		// 	fraxInstance.address, 
		// 	fxsInstance.address, 
		// 	col_instance_USDC.address, 
		// 	COLLATERAL_FRAX_AND_FXS_OWNER, 
		// 	INVESTOR_CUSTODIAN_ADDRESS, 
		// 	timelockInstance.address,
		// 	frax_3crv_metapool_instance.address,
		// 	"0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // 3CRV pool
		// 	"0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // 3CRV token
		// 	pool_instance_USDC.address
		// ]);
		// const proxy_instance = await proxy_obj.deployed();
		// console.log("CurveAMO_V3 proxy deployed at: ", proxy_instance.address);

		// // Get out of ethers and back to web3. It gives a signer-related error
		// curve_amo_v3_instance = await CurveAMO_V3.at(proxy_instance.address);

		// If truffle-fixture is used
		curve_amo_v3_instance = await CurveAMO_V3.deployed();

	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_DEPLOYER_ADDRESS]}
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
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxsInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("5000000e18"), { from: ADDRESS_WITH_FXS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await fraxInstance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });

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
		await crv3Instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10100e18"), { from: ADDRESS_WITH_3CRV });

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

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_USDC_2]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("10000000e6"), { from: ADDRESS_WITH_USDC_2 });

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
		await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: ADDRESS_WITH_USDC_3 });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_USDC_3]
		});

		// Transfer a lot of ETH
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ['0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503']}
		);

		await web3.eth.sendTransaction({ from: COLLATERAL_FRAX_AND_FXS_OWNER, to: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', value: 76000000000000000})
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address a lot of real USDC
		// await usdc_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("84000000e6"), { from: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503' });

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
		await usdt_real_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("120000000e6"), { from: '0x89e51fA8CA5D66cd220bAed62ED01e8951aa7c40' });

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





		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log("=================SET VARIABLES================");
		// Set the owner to COLLATERAL_FRAX_AND_FXS_OWNER as well as changing some other important addresses
		// to their mainnet equivalents.
		// Used when testing on live
		await curve_amo_v3_instance.setOwner(COLLATERAL_FRAX_AND_FXS_OWNER, { from: process.env.FRAX_DEPLOYER_ADDRESS });
		await curve_amo_v3_instance.setCustodian(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await curve_amo_v3_instance.setVoterContract(INVESTOR_CUSTODIAN_ADDRESS, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Set some variables on the Curve AMO");
		await curve_amo_v3_instance.setCollatBorrowCap(new BigNumber("1000000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });


		console.log("Advance a block");
		await time.increase(15);
		await time.advanceBlock();

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ["0x40907540d8a6C65c637785e8f8B742ae6b0b9968"]
		});

		console.log("Advance a block");
		await time.increase(15);
		await time.advanceBlock();

		console.log("Set the pools on the FRAX instance");
		try {

			await fraxInstance.addPool(curve_amo_v3_instance.address, { from: '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2' });
		}
		catch(err){
			console.log("CurveAMO_V3 Pool already attached")
		}

		// console.log("Remove old pools");
        // await fraxInstance.removePool("0x3C2982CA260e870eee70c423818010DfeF212659", { from: '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2' });
        // await fraxInstance.removePool("0x77746DC37Deae008c7149EDc1b1A8D6d63e08Be5", { from: '0x234D953a9404Bf9DbC3b526271d440cD2870bCd2' });


		console.log("Advance a block");
		await time.increase(15);
		await time.advanceBlock();

		console.log("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]=====================");
		// Makes sure the pool is working

		// Refresh oracle
		try{
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		const frax_info = await fraxInstance.frax_info();
        const fxs_per_usd_exch_rate =  (new BigNumber(frax_info[1]).div(BIG6).toNumber());
		console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// Note balances beforehand
		const frax_balance_before_redeem = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_before_redeem = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_before_redeem = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// Do a redeem
		const redeem_amount = new BigNumber("1000e18");
		console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		await fraxInstance.approve(pool_instance_USDC.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		await pool_instance_USDC.redeemFractionalFRAX(redeem_amount, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Advance two blocks
		await time.increase(20);
		await time.advanceBlock();
		await time.increase(20);
		await time.advanceBlock();

		// Collect the redemption
		await pool_instance_USDC.collectRedemption({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// Note balances afterwards
		const frax_balance_after_redeem = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_after_redeem = new BigNumber(await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_after_redeem = new BigNumber(await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);
		
		// Print the changes
		console.log(`FRAX Change: ${frax_balance_after_redeem - frax_balance_before_redeem} FRAX`);
		console.log(`FXS Change: ${fxs_balance_after_redeem - fxs_balance_before_redeem} FXS`);
		console.log(`USDC Change: ${usdc_balance_after_redeem - usdc_balance_before_redeem} USDC`);

		console.log("=====================GET USDC=====================");
		console.log("Get some USDC via the mint method [Part 1]");
		await curve_amo_v3_instance.mintRedeemPart1(new BigNumber("580000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Get some USDC via the mint method [Part 2]");
		await time.increase(20);
		await time.advanceBlock();
		await time.advanceBlock();
		await curve_amo_v3_instance.mintRedeemPart2({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		let the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================DEPOSIT [USDC ONLY]=====================");
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_usdc_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_usdc_only);
		const pre_deposit_3pool_usdc_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_usdc_only);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await col_instance_USDC.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 10k USDC into the metapool");
		await curve_amo_v3_instance.metapoolDeposit(0, new BigNumber("10000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_usdc_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_usdc_only);
		const post_deposit_3pool_usdc_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_usdc_only);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await col_instance_USDC.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await fraxInstance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================DEPOSIT [FRAX ONLY]=====================");
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_frax_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_frax_only);
		const pre_deposit_3pool_frax_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_frax_only);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await col_instance_USDC.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 100k FRAX into the metapool")
		await curve_amo_v3_instance.metapoolDeposit(new BigNumber("100000e18"), 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_frax_only = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_frax_only);
		const post_deposit_3pool_frax_only = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_frax_only);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await col_instance_USDC.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await fraxInstance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================DEPOSIT [FRAX AND USDC]=====================");
		console.log("Deposit into the metapool");
		const pre_deposit_metapool_both = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO metapool LP balance:", pre_deposit_metapool_both);
		const pre_deposit_3pool_both = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("pre-deposit Curve AMO 3pool LP balance:", pre_deposit_3pool_both);
		console.log("pre-deposit Curve AMO USDC balance:", new BigNumber(await col_instance_USDC.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());
		console.log("");

		console.log("Depositing 5k FRAX and 5k USDC into the metapool")
		await curve_amo_v3_instance.metapoolDeposit(new BigNumber("5000e18"), new BigNumber("5000e6"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("");
		const post_deposit_metapool_both = new BigNumber(await frax_3crv_metapool_instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO metapool LP balance:", post_deposit_metapool_both);
		const post_deposit_3pool_both = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address)).div(BIG18).toNumber();
		console.log("post-deposit Curve AMO 3pool LP balance:", post_deposit_3pool_both);
		console.log("post-deposit Curve AMO USDC balance:", new BigNumber(await col_instance_USDC.balanceOf(curve_amo_v3_instance.address)).div(BIG6).toNumber());

		console.log("");
		console.log("metapool LP total supply:", new BigNumber(await frax_3crv_metapool_instance.totalSupply()).div(BIG18).toNumber());
		console.log("metapool 3CRV balance:", new BigNumber(await crv3Instance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());
		console.log("metapool FRAX balance:", new BigNumber(await fraxInstance.balanceOf(frax_3crv_metapool_instance.address)).div(BIG18).toNumber());

		console.log("");
		console.log("Curve AMO collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================WITHDRAW FRAX FROM THE METAPOOL=====================");
		const test_amt_frax = new BigNumber("7000e18");
		console.log(`Withdraw ${test_amt_frax.div(BIG18).toNumber()} FRAX from the metapool. Don't burn the FRAX`);
		await curve_amo_v3_instance.metapoolWithdrawFrax(test_amt_frax, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================WITHDRAW 3POOL FROM THE METAPOOL=====================");
		const test_amt_3pool = new BigNumber("3000e18");
		console.log(`Withdraw ${test_amt_3pool.div(BIG18).toNumber()} 3pool from the metapool.`);
		await curve_amo_v3_instance.metapoolWithdraw3pool(test_amt_3pool, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);


		console.log("=====================CONVERT 3POOL TO USDC=====================");
		const bal_3pool = new BigNumber(await crv3Instance.balanceOf(curve_amo_v3_instance.address));
		console.log(`Convert ${bal_3pool.div(BIG18).toNumber()} 3pool to USDC.`);
		await curve_amo_v3_instance.three_pool_to_collateral(bal_3pool, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================WITHDRAW 3POOL AND USDC FROM THE METAPOOL AT THE SAME TIME=====================");
		const test_amt_3pool_both = new BigNumber("5000e18");
		console.log(`Withdraw ${test_amt_3pool_both.div(BIG18).toNumber()} FRAX3CRV from the metapool and convert.`);
		await curve_amo_v3_instance.metapoolWithdrawAndConvert3pool(test_amt_3pool_both, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		console.log("=====================WITHDRAW 3POOL AND FRAX FROM THE METAPOOL AT THE CURRENT BALANCE=====================");
		const test_amt_frax_usdc = new BigNumber("5000e18");
		console.log(`Withdraw ${test_amt_frax_usdc.div(BIG18).toNumber()} FRAX3CRV from the metapool and convert.`);
		await curve_amo_v3_instance.metapoolWithdrawAtCurRatio(test_amt_frax_usdc, 0, 0, 0, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);


		console.log("=====================DEPOSIT TO VAULT=====================");
		const deposit_amount_e18 = new BigNumber("5000e18");
		const deposit_amount = deposit_amount_e18.div(BIG18).toNumber();
		console.log(`Deposit ${deposit_amount} LP to the vault`);
		await curve_amo_v3_instance.depositToVault(deposit_amount_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		const amount_in_vault_0 = new BigNumber(await curve_amo_v3_instance.yvCurveFRAXBalance.call()).div(BIG18).toNumber();
		const usd_value_in_vault_0 = new BigNumber(await curve_amo_v3_instance.usdValueInVault.call()).div(BIG18).toNumber();
    	console.log("yvCurveFRAXBalance amount_in_vault_0: ", amount_in_vault_0);
		console.log("usd_value_in_vault_0: ", usd_value_in_vault_0);

		console.log("=====================ADVANCE SOME TIME AND SEE GROWTH=====================");
		// Advance a few weeks
		for (let j = 0; j < 10; j++){
			await time.increase(7 * 86400);
			await time.advanceBlock();
		}

		const amount_in_vault_1_E18 = await curve_amo_v3_instance.yvCurveFRAXBalance.call();
		const amount_in_vault_1 = (new BigNumber(amount_in_vault_1_E18)).div(BIG18).toNumber();
		const usd_value_in_vault_1 = (new BigNumber(await curve_amo_v3_instance.usdValueInVault.call())).div(BIG18).toNumber();
    	console.log("yvCurveFRAXBalance amount_in_vault_1: ", amount_in_vault_1);
		console.log("usd_value_in_vault_1: ", usd_value_in_vault_1);
		
		console.log("=====================WITHDRAW FROM THE VAULT=====================");
		const withdrawal_amount_e18 = amount_in_vault_1_E18;
		const withdrawal_amount = (new BigNumber(withdrawal_amount_e18)).div(BIG18).toNumber();
		console.log(`Redeem ${withdrawal_amount} yVault tokens for FRAX3CRV`);
		await curve_amo_v3_instance.withdrawFromVault(withdrawal_amount_e18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Print some info");
		the_allocations = await curve_amo_v3_instance.showAllocations.call();
    	utilities.printAllocations('CurveAMO_V3', the_allocations);

		const fxs_balance_after = new BigNumber(await fxsInstance.balanceOf.call(curve_amo_v3_instance.address)).div(BIG18);
		const usdc_balance_after = new BigNumber(await col_instance_USDC.balanceOf.call(curve_amo_v3_instance.address)).div(BIG6);
		const borrowed_balance = new BigNumber(await curve_amo_v3_instance.collateralBalance.call()).div(BIG6);
		console.log("FXS after: ", fxs_balance_after.toNumber());
		console.log("USDC after: ", usdc_balance_after.toNumber());
		console.log("collateral balance: ", borrowed_balance.toNumber());
		//console.log("Frax CR:", new BigNumber(await fraxInstance.global_collateral_ratio()).toNumber());
	    console.log("CurveAMO_V3 collatDollarBalance():", new BigNumber(await curve_amo_v3_instance.collatDollarBalance()).div(BIG18).toNumber());
		
	});

});