const path = require('path');
const Table = require('cli-table');
const envPath = path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../dist/misc/utilities'));

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

// Staking
const FraxFarmRageQuitter_Temple = artifacts.require("Staking/FraxFarmRageQuitter_Temple");
const IOldMigratableFraxFarm = artifacts.require("Staking/Variants/IOldMigratableFraxFarm");

// Uniswap
const TempleLP = artifacts.require("contracts/Uniswap/Interfaces/IUniswapV2Pair.sol:IUniswapV2Pair");

const BIG6 = new BigNumber("1e6");
const BIG12 = new BigNumber("1e12");
const BIG18 = new BigNumber("1e18");
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";
const METAPOOL_ADDRESS = "0xC7E0ABfe4e0278af66F69C93CD3fD6810198b15B"; // hard-coded from deployment, can break

contract('FraxFarmRageQuitter Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// Constants
	let COMPTROLLER_ADDRESS;
	let ORIGINAL_FRAX_ONE_ADDRESS;
	let COLLATERAL_FRAX_AND_FXS_OWNER;
	let ORACLE_ADMIN;
	let POOL_CREATOR;
	let TIMELOCK_ADMIN;
	let GOVERNOR_GUARDIAN_ADDRESS;
	let STAKING_OWNER;
	let STAKING_REWARDS_DISTRIBUTOR;
	let INVESTOR_CUSTODIAN_ADDRESS;
	const FARMER_1_ADDRESS = '0x7c56fbd5780ccca74dedfef972b07c2ac0d50768';
	const FARMER_2_ADDRESS = '0x38f2944e482a050942e5fb1652af4690017cd141';
	const ADDRESS_WITH_ETHER = '0xF977814e90dA44bFA03b6295A0616a897441aceC';

	// Initialize staking related
	let ragequitter_instance;
	let staking_instance;

	// Initialize Uniswap related
	let temple_lp_instance;

    beforeEach(async() => {

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);

		// Constants
		COMPTROLLER_ADDRESS = process.env.COMPTROLLER_MSIG_ADDRESS;
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

		// Fill staking related
		ragequitter_instance = await FraxFarmRageQuitter_Temple.deployed();
		staking_instance = await IOldMigratableFraxFarm.at("0x10460d02226d6ef7B2419aE150E6377BdbB7Ef16");

		// Fill Uniswap related
		temple_lp_instance = await TempleLP.at("0x6021444f1706f15465bEe85463BCc7d7cC17Fc03");
	});
	
	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.FRAX_ONE_ADDRESS]}
		);
	})

	// INITIALIZATION
	// ================================================================
	it('Initialization', async () => {

		// Give ether to some addresses
		console.log("Hand out some ether for gas");
		const etherWhale = await hre.ethers.getImpersonatedSigner(ADDRESS_WITH_ETHER);
		await etherWhale.sendTransaction({ to: FARMER_1_ADDRESS, value: ethers.utils.parseEther("25.0") });
		await etherWhale.sendTransaction({ to: FARMER_2_ADDRESS, value: ethers.utils.parseEther("25.0") });

		// ----------------------------------

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]}
		);

		console.log("Comptroller turns migrations on");
		await staking_instance.toggleMigrations({ from: COMPTROLLER_ADDRESS });
		
		console.log("Comptroller adds the ragequitter as a migrator");
		await staking_instance.toggleMigrator(ragequitter_instance.address, { from: COMPTROLLER_ADDRESS });
		
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		// ----------------------------------

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FARMER_1_ADDRESS]}
		);
		console.log("Farmer 1 adds the ragequitter as a migrator");
		await staking_instance.stakerToggleMigrator(ragequitter_instance.address, { from: FARMER_1_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [FARMER_1_ADDRESS]
		});

		// ----------------------------------

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FARMER_2_ADDRESS]}
		);

		console.log("Farmer 2 adds the ragequitter as a migrator");
		await staking_instance.stakerToggleMigrator(ragequitter_instance.address, { from: FARMER_2_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [FARMER_2_ADDRESS]
		});

		// ----------------------------------

	});

	it("Print stakes", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=====================PRINT STAKES====================="));
		// Show the stake structs
		let locked_stake_structs_1 = await staking_instance.lockedStakesOf.call(FARMER_1_ADDRESS);
		let locked_stake_structs_2 = await staking_instance.lockedStakesOf.call(FARMER_2_ADDRESS);
		console.log("LOCKED STAKES [1]: ", utilities.cleanLockedStakes(locked_stake_structs_1));
		console.log("LOCKED STAKES [2]: ", utilities.cleanLockedStakes(locked_stake_structs_2));

		return;
	});

	it("Tests rage quitting one stake [FARMER 1]", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=====================RAGE QUIT ONE STAKE====================="));
		// Check balances before
		const staked_lp_farmer_1_before = new BigNumber(await staking_instance.lockedLiquidityOf(FARMER_1_ADDRESS)).div(BIG18);
		const temple_lp_farmer_1_before = new BigNumber(await temple_lp_instance.balanceOf(FARMER_1_ADDRESS)).div(BIG18);
		const temple_lp_comptroller_before = new BigNumber(await temple_lp_instance.balanceOf(COMPTROLLER_ADDRESS)).div(BIG18);
		console.log("Staked LP before [FARMER 1] : ", staked_lp_farmer_1_before.toNumber());
		console.log("TEMPLE LP balance before [FARMER 1] : ", temple_lp_farmer_1_before.toNumber());
		console.log("TEMPLE LP balance before [COMPTROLLER]: ", temple_lp_comptroller_before.toNumber());

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FARMER_1_ADDRESS]}
		);

		console.log("Farmer 1 rage quits one stake");
		await ragequitter_instance.ragequitOne("0xb0d1791e9a0ae3cf11a0d357b222573f7c9ec0210880f6b5764a665423a9e8cb", { from: FARMER_1_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [FARMER_1_ADDRESS]
		});

		// Check balances after
		const staked_lp_farmer_1_after = new BigNumber(await staking_instance.lockedLiquidityOf(FARMER_1_ADDRESS)).div(BIG18);
		const temple_lp_farmer_1_after = new BigNumber(await temple_lp_instance.balanceOf(FARMER_1_ADDRESS)).div(BIG18);
		const temple_lp_comptroller_after = new BigNumber(await temple_lp_instance.balanceOf(COMPTROLLER_ADDRESS)).div(BIG18);
		console.log("Staked LP after [FARMER 1] : ", staked_lp_farmer_1_after.toNumber());
		console.log("TEMPLE LP balance after [FARMER 1] : ", temple_lp_farmer_1_after.toNumber());
		console.log("TEMPLE LP balance after [COMPTROLLER]: ", temple_lp_comptroller_after.toNumber());
		const comptroller_bal_change = temple_lp_comptroller_after.minus(temple_lp_comptroller_before);
		expect(staked_lp_farmer_1_after.toNumber()).to.be.equal(0);
		expect(comptroller_bal_change.toNumber()).to.be.closeTo(staked_lp_farmer_1_before.multipliedBy(.20).toNumber(), staked_lp_farmer_1_before.multipliedBy(0.01).toNumber());
		expect(temple_lp_farmer_1_after.plus(comptroller_bal_change).toNumber()).to.be.closeTo(staked_lp_farmer_1_before.toNumber(), staked_lp_farmer_1_before.div(100).toNumber());

		// Print the stakes. Should be clear now.
		let locked_stake_structs_1_after = await staking_instance.lockedStakesOf.call(FARMER_1_ADDRESS);
		console.log("LOCKED STAKES [1] AFTER: ", utilities.cleanLockedStakes(locked_stake_structs_1_after));
		return;
	});

	it("Tests rage quitting one stake [FARMER 2]", async () => {
		console.log(chalk.hex("#ff8b3d").bold("=====================RAGE QUIT ALL STAKES====================="));
		// Check balances
		const staked_lp_farmer_2_before = new BigNumber(await staking_instance.lockedLiquidityOf(FARMER_2_ADDRESS)).div(BIG18);
		const temple_lp_farmer_2_before = new BigNumber(await temple_lp_instance.balanceOf(FARMER_2_ADDRESS)).div(BIG18);
		const temple_lp_comptroller_before = new BigNumber(await temple_lp_instance.balanceOf(COMPTROLLER_ADDRESS)).div(BIG18);
		console.log("Staked LP before [FARMER 2] : ", staked_lp_farmer_2_before.toNumber());
		console.log("TEMPLE LP balance before [FARMER 2] : ", temple_lp_farmer_2_before.toNumber());
		console.log("TEMPLE LP balance before [COMPTROLLER]: ", temple_lp_comptroller_before.toNumber());

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [FARMER_2_ADDRESS]}
		);

		console.log("Farmer 2 rage quits all stakes");
		await ragequitter_instance.ragequitAll({ from: FARMER_2_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [FARMER_2_ADDRESS]
		});

		// Check balances after
		const staked_lp_farmer_2_after = new BigNumber(await staking_instance.lockedLiquidityOf(FARMER_2_ADDRESS)).div(BIG18);
		const temple_lp_farmer_2_after = new BigNumber(await temple_lp_instance.balanceOf(FARMER_2_ADDRESS)).div(BIG18);
		const temple_lp_comptroller_after = new BigNumber(await temple_lp_instance.balanceOf(COMPTROLLER_ADDRESS)).div(BIG18);
		console.log("Staked LP after [FARMER 2] : ", staked_lp_farmer_2_after.toNumber());
		console.log("TEMPLE LP balance after [FARMER 2] : ", temple_lp_farmer_2_after.toNumber());
		console.log("TEMPLE LP balance after [COMPTROLLER]: ", temple_lp_comptroller_after.toNumber());
		const comptroller_bal_change = temple_lp_comptroller_after.minus(temple_lp_comptroller_before);
		expect(staked_lp_farmer_2_after.toNumber()).to.be.equal(0);
		expect(comptroller_bal_change.toNumber()).to.be.closeTo(staked_lp_farmer_2_before.multipliedBy(.20).toNumber(), staked_lp_farmer_2_before.multipliedBy(0.01).toNumber());
		expect(temple_lp_farmer_2_after.plus(comptroller_bal_change).toNumber()).to.be.closeTo(staked_lp_farmer_2_before.toNumber(), staked_lp_farmer_2_before.div(100).toNumber());

		// Print the stakes. Should be clear now.
		let locked_stake_structs_2_after = await staking_instance.lockedStakesOf.call(FARMER_2_ADDRESS);
		console.log("LOCKED STAKES [2] AFTER: ", utilities.cleanLockedStakes(locked_stake_structs_2_after));

		return;
	});

});