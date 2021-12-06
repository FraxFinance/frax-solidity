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
// const FRAX3CRV_Mock = artifacts.require("ERC20/Variants/FRAX3CRV_Mock");
const Comp = artifacts.require("ERC20/Variants/Comp");

// Token vesting
const TokenVesting = artifacts.require("FXS/TokenVesting.sol");

// Proxy
const AdminUpgradeabilityProxy = artifacts.require("Proxy/AdminUpgradeabilityProxy.sol");

// Investor contract related
const InvestorAMO_V3 = artifacts.require("Misc_AMOs/InvestorAMO_V3.sol");
const InvestorAMO_V3_upgrade = artifacts.require("Misc_AMOs/InvestorAMO_V3_upgrade.sol");
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

contract('InvestorAMO_V3-Tests', async (accounts) => {
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
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_FXS = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
	const ADDRESS_WITH_3CRV = '0x99739fa525c0a98384430235d278fd08938997f9';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';

	console.log("=========================Instance Declarations=========================");

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
	let investor_amo_v2_instance;
	let yUSDC_instance;
    let aUSDC_pool_instance;
	let aUSDC_token_instance;
	let cUSDC_instance;
	let compController_instance;

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

    	// mainnet accounts[1]
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// mainnet accounts[0]
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ["0xa448833bece66fd8803ac0c390936c79b5fd6edf"]
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
		
		// Initialize the Uniswap Factory instance
		uniswapFactoryInstance = await IUniswapV2Factory.deployed();


		

		// Get the mock CRVDAO Instance

		// Get the mock FRAX3CRV Instance
		// mockFRAX3CRVInstance = await FRAX3CRV_Mock.deployed(); 

		

		// Fill the staking rewards instances
		// stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
		// stakingInstanceDual_FRAX_FXS_Sushi = await StakingRewardsDual_FRAX_FXS_Sushi.deployed();
		// stakingInstanceDual_FXS_WETH_Sushi = await StakingRewardsDual_FXS_WETH_Sushi.deployed();
		// stakingInstanceDual_FRAX3CRV = await StakingRewardsDual_FRAX3CRV.deployed();

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
		// investor_amo_v2_instance = await InvestorAMO_V3.deployed();

		// Other instances
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
	});



	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ["0xa448833bece66fd8803ac0c390936c79b5fd6edf"]
		});
	})


	// MAIN TEST
	// ================================================================
	it('Main test', async () => {


		console.log("help");
		//const slot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc".repeat(64);  // hex uint256 representation of 0
        // const key = "0x123456";  // hex representation of the key


		await web3.eth.getStorageAt(
            '0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4',  // address of the contract to read from
            '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',  // storage slot to read at: bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
            function (err, result) {
                console.log(result);  // 00...0 for false, 00...1 for true, both 32 bytes wide
            }
        );

		// console.log("this will work");
		// const manual_proxy = new web3.eth.Contract([{"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"address","name":"_admin","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newAdmin","type":"address"}],"name":"changeAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}],"0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4");
		// console.log("ADMIN:", await manual_proxy.methods.admin().call({ from: ORIGINAL_FRAX_ONE_ADDRESS }));

		// console.log("test proxy contract");
		// const admin_instance = AdminUpgradeabilityProxy.at("0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4");
		// console.log("ADMIN:", await admin_instance.admin({ from: ORIGINAL_FRAX_ONE_ADDRESS }));


		console.log("=========================Local Proxy Upgrade=========================");

		// Deploy a proxy contract
		console.log(chalk.yellow('========== Investor AMO Proxy =========='));
		const InvestorAMO_V3_Implementation = await hre.ethers.getContractFactory("InvestorAMO_V3");
		const proxy_obj = await hre.upgrades.deployProxy(InvestorAMO_V3_Implementation, [
			frax_instance.address, 
			fxs_instance.address, 
			pool_instance_USDC.address, 
			usdc_instance.address, 
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			INVESTOR_CUSTODIAN_ADDRESS, 
			timelockInstance.address,
		]);
		const proxy_instance = await proxy_obj.deployed();
		console.log("InvestorAMO_V3 proxy deployed at: ", proxy_instance.address);

		// Upgrade the proxy contract
		console.log(chalk.yellow('========== Investor AMO Upgrade =========='));
		const InvestorAMO_V3_upgrade_hre = await hre.ethers.getContractFactory("InvestorAMO_V3_upgrade");
		const upgraded = await hre.upgrades.upgradeProxy(proxy_instance.address, InvestorAMO_V3_upgrade_hre);

		const upgraded_instance = await upgraded.deployed();
		console.log("upgraded address:", upgraded_instance.address);

		// Get out of ethers and back to web3. It gives a signer-related error
		investor_amo_v2_instance = await InvestorAMO_V3_upgrade.at(upgraded_instance.address);

		// Test the locally deployed proxy upgrade
		console.log("test upgraded function:", new BigNumber(await investor_amo_v2_instance.test_upgrade()).toNumber());








		console.log("=========================Mainnet Proxy Upgrade=========================");

		// mainnet contract of upgraded Investor_AMO_V2 implementation
		const deployed_investor_v2_proxy_target = new web3.eth.Contract([{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Recovered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_UINT256","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCollect_Cooldowned_AAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"aaveCollect_stkAAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"aaveCooldown_Show_Cooldowns","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCooldown_Time_Left","outputs":[{"internalType":"int128","name":"","type":"int128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCooldown_stkAAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"aaveDepositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"aUSDC_amount","type":"uint256"}],"name":"aaveWithdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allow_aave","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allow_compound","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allow_yearn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrow_cap","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrowed_balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrowed_historical","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnFXS","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"collatDollarBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"collateral_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"compoundCollectCOMP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"compoundMint_cUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"cUSDC_amount","type":"uint256"}],"name":"compoundRedeem_cUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"custodian_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"emergencyRecoverERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getRoleMember","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleMemberCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"giveCollatBack","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_frax_contract_address","type":"address"},{"internalType":"address","name":"_fxs_contract_address","type":"address"},{"internalType":"address","name":"_pool_address","type":"address"},{"internalType":"address","name":"_collateral_address","type":"address"},{"internalType":"address","name":"_owner_address","type":"address"},{"internalType":"address","name":"_custodian_address","type":"address"},{"internalType":"address","name":"_timelock_address","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"frax_amount","type":"uint256"}],"name":"mintRedeemPart1","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"mintRedeemPart2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"missing_decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paid_back_historical","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pool_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_yearn","type":"bool"},{"internalType":"bool","name":"_aave","type":"bool"},{"internalType":"bool","name":"_compound","type":"bool"}],"name":"setAllowedStrategies","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_borrow_cap","type":"uint256"}],"name":"setBorrowCap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_custodian_address","type":"address"}],"name":"setCustodian","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_owner_address","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_pool_address","type":"address"}],"name":"setPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"new_timelock","type":"address"}],"name":"setTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_weth_address","type":"address"}],"name":"setWethAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"showAllocations","outputs":[{"internalType":"uint256[5]","name":"allocations","type":"uint256[5]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"showRewards","outputs":[{"internalType":"uint256[3]","name":"rewards","type":"uint256[3]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"test_upgrade","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"timelock_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"toggleAllocsForCollatDB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"weth_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"yDepositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"yUSDC_amount","type":"uint256"}],"name":"yWithdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"}],"0x9b6c44168f7a29a44949429ca55f411acd8391d0");

		// instantiate admin contract of proxy contract
		const admin_of_proxy = new web3.eth.Contract([{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"contract AdminUpgradeabilityProxy","name":"proxy","type":"address"},{"internalType":"address","name":"newAdmin","type":"address"}],"name":"changeProxyAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract AdminUpgradeabilityProxy","name":"proxy","type":"address"}],"name":"getProxyAdmin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract AdminUpgradeabilityProxy","name":"proxy","type":"address"}],"name":"getProxyImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract AdminUpgradeabilityProxy","name":"proxy","type":"address"},{"internalType":"address","name":"implementation","type":"address"}],"name":"upgrade","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract AdminUpgradeabilityProxy","name":"proxy","type":"address"},{"internalType":"address","name":"implementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeAndCall","outputs":[],"stateMutability":"payable","type":"function"}], "0x069c24600c2A03147D4E1D9b04d193151676F577");
		
		// upgrade proxy's implementation [params: (ProxyAddress, Implementation Address)]
		await admin_of_proxy.methods.upgrade("0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4", "0x9b6c44168f7a29a44949429ca55f411acd8391d0").send({ from: "0xa448833bece66fd8803ac0c390936c79b5fd6edf" });
		
		// instantiate upgraded proxy with implementation ABI and proxy address
		const proxy_upgraded = new web3.eth.Contract([{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Recovered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_UINT256","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCollect_Cooldowned_AAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"aaveCollect_stkAAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"aaveCooldown_Show_Cooldowns","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCooldown_Time_Left","outputs":[{"internalType":"int128","name":"","type":"int128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCooldown_stkAAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"aaveDepositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"aUSDC_amount","type":"uint256"}],"name":"aaveWithdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allow_aave","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allow_compound","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allow_yearn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrow_cap","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrowed_balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrowed_historical","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnFXS","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"collatDollarBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"collateral_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"compoundCollectCOMP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"compoundMint_cUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"cUSDC_amount","type":"uint256"}],"name":"compoundRedeem_cUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"custodian_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"emergencyRecoverERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getRoleMember","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleMemberCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"giveCollatBack","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_frax_contract_address","type":"address"},{"internalType":"address","name":"_fxs_contract_address","type":"address"},{"internalType":"address","name":"_pool_address","type":"address"},{"internalType":"address","name":"_collateral_address","type":"address"},{"internalType":"address","name":"_owner_address","type":"address"},{"internalType":"address","name":"_custodian_address","type":"address"},{"internalType":"address","name":"_timelock_address","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"frax_amount","type":"uint256"}],"name":"mintRedeemPart1","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"mintRedeemPart2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"missing_decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paid_back_historical","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pool_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_yearn","type":"bool"},{"internalType":"bool","name":"_aave","type":"bool"},{"internalType":"bool","name":"_compound","type":"bool"}],"name":"setAllowedStrategies","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_borrow_cap","type":"uint256"}],"name":"setBorrowCap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_custodian_address","type":"address"}],"name":"setCustodian","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_owner_address","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_pool_address","type":"address"}],"name":"setPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"new_timelock","type":"address"}],"name":"setTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_weth_address","type":"address"}],"name":"setWethAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"showAllocations","outputs":[{"internalType":"uint256[5]","name":"allocations","type":"uint256[5]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"showRewards","outputs":[{"internalType":"uint256[3]","name":"rewards","type":"uint256[3]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"test_upgrade","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"timelock_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"toggleAllocsForCollatDB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"weth_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"yDepositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"yUSDC_amount","type":"uint256"}],"name":"yWithdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"}],"0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4");
		console.log("test upgraded proxy admin function:", new BigNumber(await proxy_upgraded.methods.test_upgrade().call()).toNumber());

		// set it back to original implementation
		await admin_of_proxy.methods.upgrade("0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4", "0xEccA5a27B4f8f92a2bFFd006F20168A7188C0A0C").send({ from: "0xa448833bece66fd8803ac0c390936c79b5fd6edf" });

		// instantiate proxy contract with original implementation
		const proxy_original = new web3.eth.Contract([{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Recovered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_UINT256","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCollect_Cooldowned_AAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"aaveCollect_stkAAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"aaveCooldown_Show_Cooldowns","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCooldown_Time_Left","outputs":[{"internalType":"int128","name":"","type":"int128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aaveCooldown_stkAAVE","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"aaveDepositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"aUSDC_amount","type":"uint256"}],"name":"aaveWithdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allow_aave","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allow_compound","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allow_yearn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrow_cap","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrowed_balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"borrowed_historical","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnFXS","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"collatDollarBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"collateral_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"compoundCollectCOMP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"compoundMint_cUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"cUSDC_amount","type":"uint256"}],"name":"compoundRedeem_cUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"custodian_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"emergencyRecoverERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getRoleMember","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleMemberCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"giveCollatBack","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_frax_contract_address","type":"address"},{"internalType":"address","name":"_fxs_contract_address","type":"address"},{"internalType":"address","name":"_pool_address","type":"address"},{"internalType":"address","name":"_collateral_address","type":"address"},{"internalType":"address","name":"_owner_address","type":"address"},{"internalType":"address","name":"_custodian_address","type":"address"},{"internalType":"address","name":"_timelock_address","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"frax_amount","type":"uint256"}],"name":"mintRedeemPart1","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"mintRedeemPart2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"missing_decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paid_back_historical","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pool_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_yearn","type":"bool"},{"internalType":"bool","name":"_aave","type":"bool"},{"internalType":"bool","name":"_compound","type":"bool"}],"name":"setAllowedStrategies","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_borrow_cap","type":"uint256"}],"name":"setBorrowCap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_custodian_address","type":"address"}],"name":"setCustodian","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_owner_address","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_pool_address","type":"address"}],"name":"setPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"new_timelock","type":"address"}],"name":"setTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_weth_address","type":"address"}],"name":"setWethAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"showAllocations","outputs":[{"internalType":"uint256[5]","name":"allocations","type":"uint256[5]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"showRewards","outputs":[{"internalType":"uint256[3]","name":"rewards","type":"uint256[3]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"timelock_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"toggleAllocsForCollatDB","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"weth_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"USDC_amount","type":"uint256"}],"name":"yDepositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"yUSDC_amount","type":"uint256"}],"name":"yWithdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"}],"0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4");

		// call a function on the original implementation ABI
		console.log("proxy on original implementation collatDollarBalance:", new BigNumber(await proxy_original.methods.collatDollarBalance().call()).div(BIG18).toNumber());

		// try to call a function using upgraded ABI [SHOULD FAIL]
		await expectRevert.unspecified(proxy_upgraded.methods.test_upgrade().call());

/*
		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		console.log("Add the investor contract as a 'pool'");
		await frax_instance.addPool(investor_amo_v2_instance.address, { from: process.env.FRAX_ONE_ADDRESS });

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FXS]}
		);

		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FXS
		await fxs_instance.transfer(COLLATERAL_FRAX_AND_FXS_OWNER, new BigNumber("5000000e18"), { from: ADDRESS_WITH_FXS });

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




		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		console.log("==============NOTE globalCollateralValue BEFORE===============");
		const global_col_val_before = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);

		console.log("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]=====================");
		// Makes sure the pool is working

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

		const frax_info = await frax_instance.frax_info();
        const fxs_per_usd_exch_rate =  (new BigNumber(frax_info[1]).div(BIG6).toNumber());
		console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// Note balances beforehand
		const frax_balance_before_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const fxs_balance_before_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		const usdc_balance_before_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// Do a redeem
		const redeem_amount = new BigNumber("1000e18");
		console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		await frax_instance.approve(pool_instance_USDC.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
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

		console.log("=========================PULL IN USDC=========================");
		const fxs_balance_before = new BigNumber(await fxs_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG18);
		const usdc_balance_before = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("FXS before: ", fxs_balance_before.toNumber());
		console.log("USDC before: ", usdc_balance_before.toNumber());

		await investor_amo_v2_instance.mintRedeemPart1(new BigNumber("15000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 2 blocks");
		// Advance 7 days so the reward can be claimed
		await time.increase((15 * 2) + 1);
		await time.advanceBlock();
		await time.advanceBlock();

		await investor_amo_v2_instance.mintRedeemPart2({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_balance_after = new BigNumber(await fxs_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG18);
		const usdc_balance_after = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		const borrowed_balance = new BigNumber(await investor_amo_v2_instance.borrowed_balance.call()).div(BIG6);
		console.log("FXS after: ", fxs_balance_after.toNumber());
		console.log("USDC after: ", usdc_balance_after.toNumber());
		console.log("borrowed_balance: ", borrowed_balance.toNumber());

		let the_allocations = await investor_amo_v2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V2', the_allocations);

		console.log("===========================BURN FXS===========================");
		await investor_amo_v2_instance.burnFXS(fxs_balance_after.multipliedBy(BIG18), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		const fxs_balance_after_burn = new BigNumber(await fxs_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG18);
		console.log("FXS after burn: ", fxs_balance_after_burn.toNumber());

		console.log("==============NOTE globalCollateralValue AFTER===============");
		const global_col_val_after = new BigNumber(await frax_instance.globalCollateralValue()).div(BIG18);
		console.log("globalCollateralValue before: ", global_col_val_before.toNumber());
		console.log("globalCollateralValue after: ", global_col_val_after.toNumber());

		console.log("======================INVEST INTO yVault======================");
		await investor_amo_v2_instance.yDepositUSDC(usdc_balance_after.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 days");
		// Advance 10 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}
		
		the_allocations = await investor_amo_v2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V2', the_allocations);

		const yUSD_balance = new BigNumber(await yUSDC_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("yUSDC balance: ", yUSD_balance.toNumber());
		await investor_amo_v2_instance.yWithdrawUSDC(yUSD_balance.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_y = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("USDC balance after yUSDC withdrawal: ", usdc_balance_after_withdrawal_y.toNumber());

		console.log("==============TRY TO MINT TOO MUCH [SHOULD FAIL]==============");
		await expectRevert.unspecified(investor_amo_v2_instance.mintRedeemPart1(new BigNumber("10000000e18"), { from: COLLATERAL_FRAX_AND_FXS_OWNER }));

		console.log("======================INVEST INTO aUSDC======================");
		await investor_amo_v2_instance.aaveDepositUSDC(usdc_balance_after_withdrawal_y.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 days");
		// Advance 10 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}

		the_allocations = await investor_amo_v2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V2', the_allocations);

		const aUSDC_balance = new BigNumber(await aUSDC_token_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("aUSDC balance: ", aUSDC_balance.toNumber());
		await investor_amo_v2_instance.aaveWithdrawUSDC(aUSDC_balance.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_a = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("USDC balance after aUSDC withdrawal: ", usdc_balance_after_withdrawal_a.toNumber());

		// Claim the stkAAVE tokens
		await investor_amo_v2_instance.aaveCollect_stkAAVE({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("======================CHECK REWARD TOKENS=====================");

		let the_rewards = await investor_amo_v2_instance.showRewards.call();
		utilities.printRewards('Investor_V2', the_rewards);

		console.log("======================COOLDOWN THE stkAAVE, THEN COLLECT THE AAVE=====================");

		// Start the cooldown
		await investor_amo_v2_instance.aaveCooldown_stkAAVE({ from: COLLATERAL_FRAX_AND_FXS_OWNER });
		

		console.log("Wait 10 days");
		// Advance 10 days to earn some rewards
		// stkAAVE needs to be claimed within two days after the cooldown ends
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase((1 * 86400) + 1);
			await time.advanceBlock();
			let cooldown_time_left = (new BigNumber(await investor_amo_v2_instance.aaveCooldown_Time_Left())).toNumber();
			console.log("Time left: ", cooldown_time_left);
		}

		// Collect the AAVE
		await investor_amo_v2_instance.aaveCollect_Cooldowned_AAVE({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("======================CHECK REWARD TOKENS=====================");

		let the_rewards_post_aave = await investor_amo_v2_instance.showRewards.call();
		utilities.printRewards('Investor_V2', the_rewards_post_aave);

		console.log("======================INVEST INTO cUSDC======================");
		await investor_amo_v2_instance.compoundMint_cUSDC(usdc_balance_after_withdrawal_a.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("advance 10 days");
		// Advance 10 days to earn some rewards
		// Do in 1 day increments
		for (let j = 0; j < 10; j++){
			await time.increase(1 * 86400);
			await time.advanceBlock();
		}

		the_allocations = await investor_amo_v2_instance.showAllocations.call();
		utilities.printAllocations('Investor_V2', the_allocations);

		const cUSDC_balance = new BigNumber(await cUSDC_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG8);
		console.log("cUSDC balance: ", cUSDC_balance.toNumber());
		await investor_amo_v2_instance.compoundRedeem_cUSDC(cUSDC_balance.multipliedBy(BIG8), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_withdrawal_c = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("USDC balance after cUSDC withdrawal: ", usdc_balance_after_withdrawal_c.toNumber());

		// Claim the COMP tokens
		await investor_amo_v2_instance.compoundCollectCOMP({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("======================CHECK REWARD TOKENS=====================");

		let the_rewards_post_comp = await investor_amo_v2_instance.showRewards.call();
		utilities.printRewards('Investor_V2', the_rewards_post_comp);

		console.log("==================CUSTODIAN PULL OUT REWARDS==================");
		await investor_amo_v2_instance.withdrawRewards({ from: INVESTOR_CUSTODIAN_ADDRESS });
		console.log("DONE");

		console.log("==================CHECK REWARD TOKENS [AGAIN]==================");

		let the_rewards_post_pullout = await investor_amo_v2_instance.showRewards.call();
		utilities.printRewards('Investor_V2', the_rewards_post_pullout);

		console.log("================CHECK EMERGENCY ERC20 WITHDRAWAL===============");

		const usdc_balance_before_emergency = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("USDC balance before emergency: ", usdc_balance_before_emergency.toNumber());
		await investor_amo_v2_instance.emergencyrecoverERC20(usdc_instance.address, new BigNumber("1e3"), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_emergency = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("USDC balance after emergency: ", usdc_balance_after_emergency.toNumber());
		console.log("USDC withdrawn: ", usdc_balance_before_emergency.toNumber() - usdc_balance_after_emergency.toNumber());

		console.log("=====================GIVE COLLATERAL BACK=====================");
		
		const usdc_balance_before_giving_back = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		console.log("USDC balance before giving back: ", usdc_balance_before_giving_back.toNumber());
		await investor_amo_v2_instance.giveCollatBack(usdc_balance_before_giving_back.multipliedBy(BIG6), { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		const usdc_balance_after_giving_back = new BigNumber(await usdc_instance.balanceOf.call(investor_amo_v2_instance.address)).div(BIG6);
		const borrowed_balance_after = new BigNumber(await investor_amo_v2_instance.borrowed_balance.call()).div(BIG6);
		const borrowed_historical = new BigNumber(await investor_amo_v2_instance.borrowed_historical.call()).div(BIG6);
		const paid_back_historical = new BigNumber(await investor_amo_v2_instance.paid_back_historical.call()).div(BIG6);
		
		console.log("USDC balance after giving back: ", usdc_balance_after_giving_back.toNumber());
		console.log("borrowed_balance: ", borrowed_balance_after.toNumber());
		console.log("borrowed_historical: ", borrowed_historical.toNumber());
		console.log("paid_back_historical: ", paid_back_historical.toNumber());
		console.log("historical profit: ", paid_back_historical.minus(borrowed_historical).toNumber(), "USDC");

		console.log("=================CHECK EMERGENCY RECOVER ERC20================");
*/
		// TODO:
	});
	
});