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

// Collateral Pools
const FraxPoolV3 = artifacts.require("Frax/Pools/FraxPoolV3");

// Oracles
const UniV3TWAPOracle = artifacts.require("Oracle/UniV3TWAPOracle"); 


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

contract('UniV3TWAPOracle-Tests', async (accounts) => {
	const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	let ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
	let ALLOCATIONS = constants.ALLOCATIONS;

	// Constants
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADMIN;
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

	// Initialize oracle instances
	let univ3_twap_oracle_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]
		});

		// Constants
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADMIN = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		MAINNET_INVESTOR_CUSTODIAN_ADDRESS = "0x5180db0237291A6449DdA9ed33aD90a38787621c";

		// Fill oracle instances
		univ3_twap_oracle_instance = await UniV3TWAPOracle.deployed();

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

		console.log("Get the first price");
		const curr_precise_price = new BigNumber(await univ3_twap_oracle_instance.getPrecisePrice.call()).div(BIG18).toNumber();
		const pricing_token_symbols = await univ3_twap_oracle_instance.token_symbols.call();
		console.log(`Current price for 1 ${pricing_token_symbols[0]}: ${curr_precise_price} ${pricing_token_symbols[1]}`);
		
		console.log("Flip the tokens");
		await univ3_twap_oracle_instance.toggleTokenForPricing({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

		console.log("Get the second price");
		const curr_precise_price_post_flip = new BigNumber(await univ3_twap_oracle_instance.getPrecisePrice.call()).div(BIG18).toNumber();
		const pricing_token_symbols_post_flip = await univ3_twap_oracle_instance.token_symbols.call();
		console.log(`Current price for 1 ${pricing_token_symbols_post_flip[0]}: ${curr_precise_price_post_flip} ${pricing_token_symbols_post_flip[1]}`);
		
	});
	
});