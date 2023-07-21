const path = require('path');
const envPath = path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// Core
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Misc
const IAntiSnipAttackPositionManager = artifacts.require("Misc_AMOs/kyberswap/IAntiSnipAttackPositionManager");

// Oracles
const ComboOracle = artifacts.require("contracts/Oracle/ComboOracle");
const ComboOracle_KyberSwapElastic = artifacts.require("Oracle/ComboOracle_KyberSwapElastic");


// Staking

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

contract('CrossChainBridgeBacker_ARBI_AnySwap-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Account addresses
	let ORIGINAL_ARBITRUM_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADMIN;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	let CROSS_CHAIN_CUSTODIAN_ADDRESS;
	let AMO_CUSTODIAN_ADDRESS;

	// Useful addresses

	// Initialize core instances
	let canFRAX_instance;
	let canFXS_instance;

	// Initialize misc instances
	let kyberNFTPositionMgr;

	// Initialize oracle instances
	let combo_oracle_instance;
	let combo_oracle_kyberswap_elastic_instance;


    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.ARBITRUM_ONE_ADDRESS]}
		);

		// Constants
		ORIGINAL_ARBITRUM_ONE_ADDRESS = process.env.ARBITRUM_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADMIN = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		CROSS_CHAIN_CUSTODIAN_ADDRESS = accounts[9]; 
		AMO_CUSTODIAN_ADDRESS = accounts[10]; 

		// Fill core contract instances
		canFRAX_instance = await CrossChainCanonicalFRAX.deployed();
		canFXS_instance = await CrossChainCanonicalFXS.deployed();

		// Fill misc instances
		kyberNFTPositionMgr = await IAntiSnipAttackPositionManager.at("0xe222fBE074A436145b255442D919E4E3A6c6a480");

		// Fill oracle instances
		combo_oracle_instance = await ComboOracle.at("0xfD9FA9b80BFEc955bB042ea4D75A50537D8d54fe");
		combo_oracle_kyberswap_elastic_instance = await ComboOracle_KyberSwapElastic.new(
			COLLATERAL_FRAX_AND_FXS_OWNER, 
			[
				combo_oracle_instance.address,
				"0xC7a590291e07B9fe9E64b86c58fD8fC764308C4A",
				"0xe222fBE074A436145b255442D919E4E3A6c6a480",
				"0xF9c2b5746c946EF883ab2660BbbB1f10A5bdeAb4",
				"0x8Fd8Cb948965d9305999D767A02bf79833EADbB3"
			]
		);
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.ARBITRUM_ONE_ADDRESS]}
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

		console.log("------------------------------------------------");
		console.log("Add MAI to the ComboOracle");
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: ["0xe61D9ed1e5Dc261D1e90a99304fADCef2c76FD10"]
		});    

		await combo_oracle_instance.batchSetOracleInfoDirect(
			[
				[
					"0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
					"0x59644ec622243878d1464A9504F9e9a31294128a",
					0,
					"0x0000000000000000000000000000000000000000",
					"0x0000000000000000000000000000000000000000",
					"0x00000000",
					0
				]
			], 
			{ from: "0xe61D9ed1e5Dc261D1e90a99304fADCef2c76FD10" }
		);

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: ["0xe61D9ed1e5Dc261D1e90a99304fADCef2c76FD10"]
		});

		

		console.log("------------------------------------------------");
		console.log("Check the NFT info");

		const nft_basic_info = await combo_oracle_kyberswap_elastic_instance.getNFTBasicInfo.call(6946);
		console.log(nft_basic_info);

		const nft_value_info = await combo_oracle_kyberswap_elastic_instance.getNFTValueInfo.call(6946);
		console.log(nft_value_info);

		// ****************************************************************************************
		// ****************************************************************************************
		console.log(chalk.green("**************************MAIN CODE***************************"));
		// ****************************************************************************************
		// ****************************************************************************************
		console.log("----------------------------");


		console.log(chalk.hex("#ff8b3d").bold("=================INITIALIZE================"));
		


		console.log(chalk.hex("#ff8b3d").bold("=================MINT canFRAX AND canFXS================"));



	});

});