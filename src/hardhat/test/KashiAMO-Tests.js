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


// loading Constants


global.artifacts = artifacts;
global.web3 = web3;

const BIG6 = new BigNumber("1e6");
const BIG8 = new BigNumber("1e8");
const BIG18 = new BigNumber("1e18");
const BASE_TEN = 10;
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6666666666666666666666666666666666666666";

const hre = require("hardhat");
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");
const FraxAMOMinter = artifacts.require("Frax/FraxAMOMinter");

const KashiAMO = artifacts.require("contracts/Kashi/KashiAMO.sol");
const BentoBoxAMO = artifacts.require("contracts/Kashi/BentoBoxAMO.sol");

const KashiPairMediumRiskV1 = artifacts.require("contracts/Kashi/KashiPairMediumRiskV1.sol");
const IBentoBoxV1 = artifacts.require("contracts/Kashi/BentoBoxV1.sol");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");




contract('KashiAMO-Tests', async (accounts) => {
	let kasiAMO_instance;
	let usdc_instance;
	let sushi_instance;
	let wEthFraxKashiPair_instance;
	let bentobox_instance;
	let frax_instance;
	let weth_instance;
	let NewKashiPair_instance;
	let frax_amo_minter_instance;

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
	let CONTRACT_ADDRESSES;
	const ADDRESS_WITH_ETH = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik's Vb
	const ADDRESS_WITH_FRAX = '0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE';
	const ADDRESS_WITH_FXS = '0x28C6c06298d514Db089934071355E5743bf21d60';
	const ADDRESS_WITH_3CRV = '0x99739fa525c0a98384430235d278fd08938997f9';
	const ADDRESS_WITH_DAI = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC = '0xf977814e90da44bfa03b6295a0616a897441acec';
	const ADDRESS_WITH_USDC_2 = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';
	const ADDRESS_WITH_USDC_3 = '0x55FE002aefF02F77364de339a1292923A15844B8';

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
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
	

	

    beforeEach(async() => {
		
		// Fill core contract instances
        usdc_instance = await ERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
		weth_instance = await ERC20.at("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
		sushi_instance = await ERC20.at("0x6b3595068778dd592e39a122f4f5a5cf09c90fe2");
		frax_instance = await ERC20.at("0x853d955acef822db058eb8505911ed77f175b99e");
		
		
		wEthFraxKashiPair_instance = await KashiPairMediumRiskV1.at("0x9f357F839d8bB4EcC179A20eb10bB77B888686ff");
		frax_amo_minter_instance = await FraxAMOMinter.at(CONTRACT_ADDRESSES.ethereum.misc.amo_minter);

		kasiAMO_instance = await KashiAMO.new(DEPLOYER_ADDRESS,frax_amo_minter_instance.address);
		
    });

    it('Kashipair testing', async () => {
		const symbol_ = await wEthFraxKashiPair_instance.symbol();
		console.log("Kashipair Symbol:", symbol_);
    });

	it('Construct test', async () => {
		const owner = await kasiAMO_instance.owner();
		assert.equal(accounts[0], owner);
    });

	it('VIEWS Functions test', async () => {
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(kasiAMO_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Deposit FRAX to kashipair
        await kasiAMO_instance.depositToPair.call(wEthFraxKashiPair_instance.address ,new BigNumber("150e18"),false);
		const allocations = await kasiAMO_instance.showAllocations.call();
		console.log("Allocation: Unallocated FRAX: ", BigNumber(allocations[0]).toNumber());
		console.log("Allocation: Allocated FRAX: ", BigNumber(allocations[1]).toNumber());
		console.log("Allocation: Total FRAX: ", BigNumber(allocations[2]).toNumber());
		
		const total_dollar_balance = await kasiAMO_instance.dollarBalances.call();
		console.log("dollarBalances: frax_val_e18: ", BigNumber(total_dollar_balance[0]).toNumber());
		console.log("dollarBalances: collat_val_e18: ", BigNumber(total_dollar_balance[1]).toNumber());
		
		const reward = await kasiAMO_instance.showRewards.call();
		console.log("showRewards: SUSHI Balance: ", BigNumber(reward).toNumber());

		const minted_balance = await kasiAMO_instance.mintedBalance.call();
		console.log("mintedBalance: Frax minted balance of the KashiAMO: ", BigNumber(minted_balance).toNumber());

    });

	it('Kashi pair general info test', async () => {
        await kasiAMO_instance.getPairGeneralInfo.call(wEthFraxKashiPair_instance.address);
    });

	it('Kashi pair financial info test', async () => {
        await kasiAMO_instance.getPairFinancialInfo.call(wEthFraxKashiPair_instance.address);
    });

	it('Kashi pair deposit test', async () => {
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(kasiAMO_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Deposit FRAX to kashipair
        await kasiAMO_instance.depositToPair.call(wEthFraxKashiPair_instance.address ,new BigNumber("150e18"),true);
    });
	
	it('Kashi pair withdraw test', async () => {
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(kasiAMO_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Deposit FRAX to kashipair
        await kasiAMO_instance.depositToPair.call(wEthFraxKashiPair_instance.address ,new BigNumber("150e18"),false);
		await kasiAMO_instance.withdrawFromPair.call(wEthFraxKashiPair_instance.address ,new BigNumber("140e18"),true);
    });
	
	it('Kashi new pair creation', async () => {
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [ADDRESS_WITH_FRAX]}
		);
		// Give the COLLATERAL_FRAX_AND_FXS_OWNER address some FRAX
		await frax_instance.transfer(kasiAMO_instance.address, new BigNumber("1000e18"), { from: ADDRESS_WITH_FRAX });
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [ADDRESS_WITH_FRAX]}
		);

		const SUSHI_TOKEN_ADDRESS = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2';
		const SUSHI_ETH_CHAINLINK_ADDRESS = '0xe572cef69f43c2e488b33924af04bdace19079cf';
		// Deposit FRAX to kashipair
		// console.log(await wEthFraxKashiPair_instance.oracleData.call());
        const cloneAddress = await kasiAMO_instance.createNewPair.call(SUSHI_TOKEN_ADDRESS,SUSHI_ETH_CHAINLINK_ADDRESS,new BigNumber("1e18"));
    });


});