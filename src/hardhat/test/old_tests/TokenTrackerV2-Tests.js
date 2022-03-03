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

contract('TokenTrackerV2-Tests', async (accounts) => {
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

	// Initialize investor-related contract
	let investor_amo_v3_instance;
	let yUSDC_instance;
    let aUSDC_pool_instance;
	let aUSDC_token_instance;
	let cUSDC_instance;
	let compController_instance;

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

		// Refresh oracle
		try {
			await oracle_instance_FXS_WETH.update();
		}
		catch (err) {}

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

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");

		console.log("==============NOTE SOME INFO===============");
		let comptroller_token_addrs = await token_tracker_v2.allTokensForAddress.call(COMPTROLLER_ADDRESS);
		let investor_custodian_token_addrs = await token_tracker_v2.allTokensForAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS);
		let missing_dec_test_wallet_addrs = await token_tracker_v2.allTokensForAddress.call(MISSING_DEC_TEST_WALLET_ADDR);
		console.log("comptroller_token_addrs: ", comptroller_token_addrs);
		console.log("investor_custodian_token_addrs: ", investor_custodian_token_addrs);
		console.log("missing_dec_test_wallet_addrs: ", missing_dec_test_wallet_addrs);

		// console.log(chalk.hex("#ff8b3d").bold("======================MAKE SURE FRAX DIDN'T BRICK [TEST A REDEEM]====================="));
		// // Makes sure the pool is working

		// // Refresh oracle
		// try {
		// 	await oracle_instance_FXS_WETH.update();
		// }
		// catch (err) {}

		// const fxs_per_usd_exch_rate = (new BigNumber(await frax_instance.fxs_price()).div(BIG6).toNumber());
		// console.log("fxs_per_usd_exch_rate: ", fxs_per_usd_exch_rate);

		// // Note balances beforehand
		// const frax_balance_before_redeem = new BigNumber(await frax_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const fxs_balance_before_redeem = new BigNumber(await fxs_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
		// const usdc_balance_before_redeem = new BigNumber(await usdc_instance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG6);

		// // Redeem threshold
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [COMPTROLLER_ADDRESS]
		// });
	
		// console.log("Set the redeem threshold to $1.01 now so redeems work");
		// await pool_instance_V3.setPriceThresholds(1030000, 1010000, { from: COMPTROLLER_ADDRESS }); 
	
		// await hre.network.provider.request({
		// 	method: "hardhat_stopImpersonatingAccount",
		// 	params: [COMPTROLLER_ADDRESS]
		// });

		// // Do a redeem
		// const redeem_amount = new BigNumber("1000e18");
		// console.log(`Redeem amount: ${redeem_amount.div(BIG18)} FRAX`);
		// await frax_instance.approve(pool_instance_V3.address, redeem_amount, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
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

		console.log(chalk.hex("#ff8b3d").bold("=====================PRINT SOME INFO====================="));
		let all_token_addresses = await combo_oracle_instance.allTokenAddresses.call();
		console.log("all_token_addresses: ", all_token_addresses);

		let all_token_infos = await combo_oracle_instance.allTokenInfos.call();
		// console.log("all_token_infos: ", all_token_infos);


		console.log(chalk.hex("#ff8b3d").bold("=====================GET TOKEN PRICES====================="));
		for (let i = 0; i < all_token_addresses.length; i++){
			let token_price_BN = await combo_oracle_instance.getTokenPrice.call(all_token_addresses[i]);
			let token_price = new BigNumber(token_price_BN[0]).div(BIG18).toString();
			let token_symbol = all_token_infos[i].symbol;

			console.log(`${token_symbol} Price: $${token_price}`);
		}
		
		console.log(chalk.hex("#ff8b3d").bold("============CHECK BALANCES FOR DIFFERENT ADDRESSES [ETH + TOKENS] (FULL VALUE)============"));
		
		// Comptroller
		console.log(chalk.hex('#34baeb')("---------- Comptroller ----------"));
		let comptroller_tkn_addresses = await token_tracker_v2.allTokensForAddress.call(COMPTROLLER_ADDRESS);
		for (let i = 0; i < comptroller_tkn_addresses.length; i++){
			let the_value_BN = await token_tracker_v2.getTokenValueInAddress.call(COMPTROLLER_ADDRESS, comptroller_tkn_addresses[i], false);
			let the_value = new BigNumber(the_value_BN).div(BIG18).toString();
			let token_info = await combo_oracle_instance.token_info.call(comptroller_tkn_addresses[i]);
			let token_symbol = token_info.symbol;

			console.log(`${token_symbol}: $${the_value}`);
		}

		// Investor Custodian
		console.log(chalk.hex('#34baeb')("---------- Investor Custodian ----------"));
		let investor_custodian_tkn_addresses = await token_tracker_v2.allTokensForAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS);
		for (let i = 0; i < investor_custodian_tkn_addresses.length; i++){
			let the_value_BN = await token_tracker_v2.getTokenValueInAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, investor_custodian_tkn_addresses[i], false);
			let the_value = new BigNumber(the_value_BN).div(BIG18).toString();
			let token_info = await combo_oracle_instance.token_info.call(investor_custodian_tkn_addresses[i]);
			let token_symbol = token_info.symbol;

			console.log(`${token_symbol}: $${the_value}`);
		}

		// Totals
		console.log(chalk.hex('#34baeb')("---------- Totals ----------"));
		let comptroller_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(COMPTROLLER_ADDRESS, false)).div(BIG18);
		let investor_custodian_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, false)).div(BIG18);
		let total_value = new BigNumber(await token_tracker_v2.getTotalValue.call(false)).div(BIG18);
		console.log(`Comptroller [ETH + Tokens]: ${comptroller_value} USD`);
		console.log(`Investor Custodian [ETH + Tokens]: ${investor_custodian_value} USD`);
		console.log(`Total Value [ETH + Tokens]: ${total_value} USD`);


		console.log(chalk.hex("#ff8b3d").bold("============CHECK BALANCES FOR DIFFERENT ADDRESSES [ETH + TOKENS] (CR VALUE)============"));
		
		// Comptroller
		console.log(chalk.hex('#34baeb')("---------- Comptroller ----------"));
		comptroller_tkn_addresses = await token_tracker_v2.allTokensForAddress.call(COMPTROLLER_ADDRESS);
		for (let i = 0; i < comptroller_tkn_addresses.length; i++){
			let the_value_BN = await token_tracker_v2.getTokenValueInAddress.call(COMPTROLLER_ADDRESS, comptroller_tkn_addresses[i], true);
			let the_value = new BigNumber(the_value_BN).div(BIG18).toString();
			let token_info = await combo_oracle_instance.token_info.call(comptroller_tkn_addresses[i]);
			let token_symbol = token_info.symbol;

			console.log(`${token_symbol}: $${the_value}`);
		}

		// Investor Custodian
		console.log(chalk.hex('#34baeb')("---------- Investor Custodian ----------"));
		investor_custodian_tkn_addresses = await token_tracker_v2.allTokensForAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS);
		for (let i = 0; i < investor_custodian_tkn_addresses.length; i++){
			let the_value_BN = await token_tracker_v2.getTokenValueInAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, investor_custodian_tkn_addresses[i], true);
			let the_value = new BigNumber(the_value_BN).div(BIG18).toString();
			let token_info = await combo_oracle_instance.token_info.call(investor_custodian_tkn_addresses[i]);
			let token_symbol = token_info.symbol;

			console.log(`${token_symbol}: $${the_value}`);
		}

		// Totals
		console.log(chalk.hex('#34baeb')("---------- Totals ----------"));
		comptroller_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(COMPTROLLER_ADDRESS, true)).div(BIG18);
		investor_custodian_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, true)).div(BIG18);
		total_value = new BigNumber(await token_tracker_v2.getTotalValue.call(true)).div(BIG18);
		console.log(`Comptroller [ETH + Tokens]: ${comptroller_value} USD`);
		console.log(`Investor Custodian [ETH + Tokens]: ${investor_custodian_value} USD`);
		console.log(`Total Value [ETH + Tokens]: ${total_value} USD`);
		

		// console.log(chalk.hex("#ff8b3d").bold("=====================DISABLE THE TRACKED TOKENS====================="));
		// // Remove tokens for the comptroller
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.reward_tokens.tribe, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.reward_tokens.curve_dao, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.reward_tokens.comp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.bearer_tokens.stkAAVE, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.reward_tokens.ohm, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.reward_tokens.sdt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(COMPTROLLER_ADDRESS, ADDRS_ETH.bearer_tokens.yvUSDC, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Remove tokens for the investor custodian
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.reward_tokens.tribe, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.reward_tokens.curve_dao, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.reward_tokens.comp, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.bearer_tokens.stkAAVE, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.reward_tokens.ohm, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.reward_tokens.sdt, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
		// await token_tracker_v2.removeTokenForAddress(MAINNET_INVESTOR_CUSTODIAN_ADDRESS, ADDRS_ETH.bearer_tokens.yvUSDC, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// // Remove tokens for the investor custodian
		// await token_tracker_v2.removeTokenForAddress(MISSING_DEC_TEST_WALLET_ADDR, ADDRS_ETH.reward_tokens.ohm, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

		// console.log(chalk.hex("#ff8b3d").bold("==========CHECK BALANCES FOR DIFFERENT ADDRESSES [ETH ONLY]=========="));
		// comptroller_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(COMPTROLLER_ADDRESS)).div(BIG18);
		// investor_custodian_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(MAINNET_INVESTOR_CUSTODIAN_ADDRESS)).div(BIG18);
		// missing_dec_test_wallet_value = new BigNumber(await token_tracker_v2.getValueInAddress.call(MISSING_DEC_TEST_WALLET_ADDR)).div(BIG18);
		// total_value = new BigNumber(await token_tracker_v2.getTotalValue.call()).div(BIG18);
		// console.log(`Comptroller [ETH Only]: ${comptroller_value} USD`);
		// console.log(`Investor Custodian [ETH Only]: ${investor_custodian_value} USD`);
		// console.log(`Missing Decimals Test Wallet [ETH Only]: ${missing_dec_test_wallet_value} USD`);
		// console.log(`Total Value [ETH Only]: ${total_value} USD`);
	});
	
});