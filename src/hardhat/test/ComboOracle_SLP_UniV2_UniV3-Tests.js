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
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Variants/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_USDC_WETH = artifacts.require("Oracle/Variants/UniswapPairOracle_USDC_WETH");
const UniswapPairOracleExtra_SDT_WETH = artifacts.require("Oracle/Variants/UniswapPairOracleExtra_SDT_WETH");
const ComboOracle = artifacts.require("Oracle/ComboOracle");
const ComboOracle_UniV2_UniV3 = artifacts.require("Oracle/ComboOracle_UniV2_UniV3");

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
const IAAVELendingPool_Partial = artifacts.require("Misc_AMOs/aave/IAAVELendingPool_Partial.sol");
const IAAVE_aUSDC_Partial = artifacts.require("Misc_AMOs/aave/IAAVE_aUSDC_Partial.sol");
const IcUSDC_Partial = artifacts.require("Misc_AMOs/compound/IcUSDC_Partial.sol");
const IComptroller = artifacts.require("Misc_AMOs/compound/IComptroller.sol");
const TokenTrackerV2 = artifacts.require("Misc_AMOs/TokenTrackerV2");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const Timelock = artifacts.require("Governance/Timelock");

const BIG6 = new BigNumber("1e6");
const BIG8 = new BigNumber("1e8");
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

contract('ComboOracle_UniV2_UniV3-Tests', async (accounts) => {
	const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
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
	const COMPTROLLER_ADDRESS = ADDRS_ETH.multisigs["Comptrollers"];
	const MISSING_DEC_TEST_WALLET_ADDR = "0x66A3bF55E5Aa23b1ea0078Cc9C0CFD5e52D5F82e";
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';

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
	let oracle_instance_SDT_WETH;
	let combo_oracle_instance;
	let combo_oracle_instance_univ2_univ3;

	// Misc AMO related
	let frax_amo_minter_instance;
	let token_tracker_v2;

	// Initialize other instances
	let usdc_real_instance;

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
		MAINNET_INVESTOR_CUSTODIAN_ADDRESS = "0x5180db0237291A6449DdA9ed33aD90a38787621c";

		// Fill core contract instances
		frax_instance = await FRAXStablecoin.deployed();
		fxs_instance = await FRAXShares.deployed();
		wethInstance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		comp_instance = await ERC20.at("0xc00e94Cb662C3520282E6f5717214004A7f26888"); 

		// Fill oracle instances
		oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
		// oracle_instance_SDT_WETH = await UniswapPairOracleExtra_SDT_WETH.deployed();
		combo_oracle_instance = await ComboOracle.deployed();
		combo_oracle_instance_univ2_univ3 = await ComboOracle_UniV2_UniV3.deployed();
		
		// Initialize pool instances
		pool_instance_V3 = await FraxPoolV3.deployed();

		// AMO minter
		frax_amo_minter_instance = await FraxAMOMinter.deployed();

		// Misc AMOs
		token_tracker_v2 = await TokenTrackerV2.deployed();
		
		// Other instances
		usdc_real_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");

	
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});
	})


	// MAIN TEST
	// ================================================================
	it('Main test', async () => {

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("***********************Initialization*************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		console.log(chalk.hex("#ff8b3d").bold("=====================GET CONSTITUENT TOKEN PRICES====================="));
		const tokens_to_price = [
			ADDRS_ETH.main.FRAX, 
			ADDRS_ETH.main.FXS, 
			ADDRS_ETH.collaterals.DAI,
			ADDRS_ETH.collaterals.GUSD,
			ADDRS_ETH.collaterals.RAI,
			ADDRS_ETH.collaterals.sUSD,
			ADDRS_ETH.collaterals.USDC,
			ADDRS_ETH.collaterals.wUST,
			ADDRS_ETH.reward_tokens.ohm, 
			ADDRS_ETH.reward_tokens.ohm_v2, 
			ADDRS_ETH.reward_tokens.sushi,
			ADDRS_ETH.reward_tokens.weth, 
		];

		for (let i = 0; i < tokens_to_price.length; i++){
			let token_price_pack = await combo_oracle_instance.getTokenPrice.call(tokens_to_price[i]);
			let precise_price = new BigNumber(token_price_pack[0]).div(BIG18).toString();
			let eth_price = new BigNumber(token_price_pack[2]).div(BIG18).toString();
			let token_symbol = utilities.rewardTokenSymbolFromAddress(tokens_to_price[i]);

			console.log(`${token_symbol} USD Price: $${precise_price}`);
			console.log(`${token_symbol} ETH Price: Ξ${eth_price}`);
		}

		console.log(chalk.hex("#ff8b3d").bold("=====================GET UNIV2 LP TOKEN PRICES====================="));
		const univ2_test_token_addresses = [
			"0xe1573b9d29e2183b1af0e743dc2754979a40d237", // Uniswap FRAX/FXS, $9.820
			"0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d", // Uniswap FRAX/USDC, $2,200,001.120
			"0xB612c37688861f1f90761DC7F382C2aF3a50Cc39", // Uniswap FRAX/OHM, $1,302,004.19
			// "0xd6c783b257e662ca949b441a4fcb08a53fc49914", // Uniswap FRAX/IQ, $0.236 [AVOID FOR TESTS: NO CHAINLINK ORACLE!]
			"0xecBa967D84fCF0405F6b32Bc45F4d36BfDBB2E81", // Uniswap FXS/WETH, $1378.592
			"0x691C010aDaA0c1a1bfE172b3af9f63e3836E190b", // Uniswap FRAX/GUSD, $200,000,000.000
			"0x34d7d7Aaf50AD4944B70B320aCB24C95fa2def7c", // SushiSwap OHM/DAI, $1,613,441.886
			"0x800930A57c28845026d18514ce29aAf644dC343E", // SushiSwap OHM/USDT, $1,322,388,120,807.666
			"0xeC8C342bc3E07F05B9a782bc34e7f04fB9B44502", // SushiSwap FRAX/WETH, $136.166
			"0xe06f8d30ac334c857fc8c380c85969c150f38a6a", // SushiSwap FRAX/SUSHI, $5.222
		];

		// Reserves method
		console.log(chalk.yellow.bold(`--------- Reserves Method ---------`));
		for (let i = 0; i < univ2_test_token_addresses.length; i++){
			let token_price_pack = await combo_oracle_instance_univ2_univ3.uniV2LPPriceInfoViaReserves.call(univ2_test_token_addresses[i]);
			let token_price = new BigNumber(token_price_pack[0]).div(BIG18).toString();
			let token_symbol = token_price_pack[2];
			let token0_symbol = token_price_pack[4];
			let token1_symbol = token_price_pack[5];

			console.log(`${token_symbol} [${token0_symbol}/${token1_symbol}] Price: $${token_price}`);
		}

		// Alpha Homora method
		console.log(chalk.yellow.bold(`--------- Alpha Homora Method ---------`));
		for (let i = 0; i < univ2_test_token_addresses.length; i++){
			let token_price_pack = await combo_oracle_instance_univ2_univ3.uniV2LPPriceInfo.call(univ2_test_token_addresses[i]);
			let token_price = new BigNumber(token_price_pack[0]).div(BIG18).toString();
			let token_symbol = token_price_pack[2];
			let token0_symbol = token_price_pack[4];
			let token1_symbol = token_price_pack[5];

			console.log(`${token_symbol} [${token0_symbol}/${token1_symbol}] Price: $${token_price}`);
		}

		console.log(chalk.hex("#ff8b3d").bold("=====================GET UNIV3 NFT VALUES====================="));
		const univ3_test_nft_ids = [
			85702, // FRAX/USDC, $502.30
			101161, // FRAX/DAI, $679.86
			176496, // FXS/ETH, $2,786,844.35
			165457, // RAI/FRAX, $2,031,969.10
			112294, // FRAX/sUSD, $2,024,191.12
			116265, // FRAX/USDT, $3,364,581.38
			169575, // FRAX/wUST, $1,087,971.56
			170868, // GUSD/USDT, $10
		];

		for (let i = 0; i < univ3_test_nft_ids.length; i++){
			const the_token_id = univ3_test_nft_ids[i];
			let nft_pack = await combo_oracle_instance_univ2_univ3.getUniV3NFTValueInfo.call(the_token_id);
			let token_0_value = new BigNumber(nft_pack[0]).div(BIG18).toString();;
			let token_1_value = new BigNumber(nft_pack[1]).div(BIG18).toString();;
			let token_ttl_value = new BigNumber(nft_pack[2]).div(BIG18).toString();
			let token_0_symbol = nft_pack[3];
			let token_1_symbol = nft_pack[4];
			let liquidity_price = new BigNumber(nft_pack[5]).div(BIG18).toString();
	
			console.log(`UniV3 #${the_token_id} ${token_0_symbol}/${token_1_symbol} Total Value: $${token_ttl_value} [${token_0_value}/${token_1_value}] {Liq price: ${liquidity_price}}`);
		}

		
		
		
	});
	
});