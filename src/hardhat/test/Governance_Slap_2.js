const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
require('@openzeppelin/test-helpers/configure')({
	provider: process.env.ETHEREUM_NETWORK_ENDPOINT,
});

const { expectRevert, time } = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const chalk = require('chalk');

// Misc
const ERC20 = artifacts.require("contracts/ERC20/ERC20.sol:ERC20");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const FRAXShares = artifacts.require("FXS/FRAXShares");

// Governance related
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const GovernorAlpha_For_Ethers = require('../artifacts/contracts/Governance/Governance.sol/GovernorAlpha');
const Timelock = artifacts.require("Governance/Timelock");
const Timelock_For_Ethers = require('../artifacts/contracts/Governance/Timelock.sol/Timelock');

contract('Governance-Tests', async (accounts) => {
	CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	// ======== Set the addresses ========
	console.log(chalk.yellow('===== SET THE ADDRESSES ====='));
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
	let COMPTROLLER_ADDRESS;

	// Get the necessary instances
	let frax_instance;
	let fxs_instance;
	let governance_instance;
	let timelock_instance;

	beforeEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [process.env.TIMELOCK_ADMIN]
		});

		// Constants
		ORIGINAL_FRAX_DEPLOYER_ADDRESS = process.env.FRAX_DEPLOYER_ADDRESS;
		ORIGINAL_FRAX_ONE_ADDRESS = process.env.FRAX_ONE_ADDRESS;
		DEPLOYER_ADDRESS = accounts[0];
		COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
		ORACLE_ADDRESS = accounts[2];
		POOL_CREATOR = accounts[3];
		TIMELOCK_ADMIN = process.env.TIMELOCK_ADMIN; // accounts[4];
		GOVERNOR_GUARDIAN_ADDRESS = process.env.GOVERNOR_GUARDIAN_ADDRESS; // accounts[5];
		STAKING_OWNER = accounts[6];
		STAKING_REWARDS_DISTRIBUTOR = accounts[7];
		INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
		MIGRATOR_ADDRESS = accounts[10];
		COMPTROLLER_ADDRESS = "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27";

		// Instantiate
		frax_instance = await FRAXStablecoin.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FRAX);
		fxs_instance = await FRAXShares.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FXS);
		governance_instance = await GovernorAlpha.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].governance);
		timelock_instance = await Timelock.at(CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.timelock);
	});

	afterEach(async() => {
		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [process.env.TIMELOCK_ADMIN]
		});
	})

	it('Main test', async () => {
		console.log(chalk.hex("#ff8b3d").bold("=========================Uniform Tests========================="));


		console.log(chalk.hex('#8a9cf5')("---------- Change the timelock admin ----------"));
		console.log("Print info"); 
		const admin_before = await timelock_instance.admin.call();
		const pending_admin_before = await timelock_instance.pendingAdmin.call();
		console.log("ADMIN BEFORE: ", admin_before);
		console.log("PENDING ADMIN BEFORE: ", pending_admin_before);

		console.log("Prepare changing the timelock admin"); 
		const current_timestamp_0 = (new BigNumber(await time.latest())).toNumber();
		const eta_0 = current_timestamp_0 + 172800 + 300; // 2 days (minimum) and 5 minutes (buffer)
		console.log("CURRENT TIME: ", current_timestamp_0);
		console.log("ETA END TIME: ", eta_0);
		const calldata_1 = [
			timelock_instance.address,
			0,
			'setPendingAdmin(address)',
			web3.eth.abi.encodeParameters(['address'], [COMPTROLLER_ADDRESS]),
			eta_0
		];
		console.log("calldata_1: ", calldata_1);

		const TimelockInterface = new ethers.utils.Interface(Timelock_For_Ethers.abi);
		console.log("calldata_1 with function signature: ", TimelockInterface.encodeFunctionData("queueTransaction", calldata_1));

		console.log("Queue changing the timelock admin"); 
		await timelock_instance.queueTransaction(
			...calldata_1,
			{ from: TIMELOCK_ADMIN }
		);
		


		console.log(chalk.hex('#8a9cf5')("---------- Advance time ----------"));
		console.log("Increase the time until the queue is over"); 
		await ethers.provider.send("evm_increaseTime", [172800 + 86400]); // 2 days (minimum) and 10 minutes (buffer)
		await ethers.provider.send("evm_mine"); // mine the next block
		const current_timestamp_1 = (new BigNumber(await time.latest())).toNumber();
		console.log("CURRENT TIME: ", current_timestamp_1);


		console.log(chalk.hex('#8a9cf5')("---------- Execute the timelock admin change ----------"));
		console.log("Execute the transaction"); 
		await timelock_instance.executeTransaction(
			...calldata_1,
			{ from: TIMELOCK_ADMIN }
		);

		console.log("Print info"); 
		const admin_after = await timelock_instance.admin.call();
		const pending_admin_after = await timelock_instance.pendingAdmin.call();
		console.log("ADMIN AFTER: ", admin_after);
		console.log("PENDING ADMIN AFTER: ", pending_admin_after);


		console.log(chalk.hex('#8a9cf5')("---------- Have the msig accept ownership ----------"));
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		await timelock_instance.acceptAdmin({ from: COMPTROLLER_ADDRESS });

		await hre.network.provider.request({
			method: "hardhat_stopImpersonatingAccount",
			params: [COMPTROLLER_ADDRESS]
		});

		console.log("ADMIN AFTER MSIG CALL: ", admin_after);
		console.log("PENDING ADMIN AFTER MSIG CALL: ", pending_admin_after);


	// // ======== Advance a block and 24 hours to catch things up ========
	// await time.increase(86400 + 1);
	// await time.advanceBlock();


	// ======== Make some governance proposals ========

	// // Minting fee 0.04% -> 0.1%
	// await governance_instance.propose(
	// 	[frax_instance.address],
	// 	[0],
	// 	['setMintingFee(uint256)'],
	// 	[web3.eth.abi.encodeParameters(['uint256'], [1000])], // 0.1%
	// 	"Minting fee increase",
	// 	"I hereby propose to increase the minting fee from 0.04% to 0.1%",
	// 	{ from: COLLATERAL_FRAX_AND_FXS_OWNER }
	// );
	
	// // Redemption fee 0.04% -> 0.08%
	// await governance_instance.propose(
	// 	[frax_instance.address],
	// 	[0],
	// 	['setMintingFee(uint256)'],
	// 	[web3.eth.abi.encodeParameters(['uint256'], [800])], // 0.1%
	// 	"Redemption fee increase",
	// 	"I want to increase the redemption fee from 0.04% to 0.08%",
	// 	{ from: GOVERNOR_GUARDIAN_ADDRESS }
	// );

	// // Increase the USDC pool ceiling from 10M to 15M
	// // This mini hack is needed
	// const num = 15000000 * (10 ** 18);
	// const numAsHex = "0x" + num.toString(16);
	// await governance_instance.propose(
	// 	[pool_instance_USDC.address],
	// 	[0],
	// 	['setPoolCeiling(uint256)'],
	// 	[web3.eth.abi.encodeParameters(['uint256'], [numAsHex])], // 15M
	// 	"USDC Pool ceiling raise",
	// 	"Raise the USDC pool ceiling to 15M",
	// 	{ from: STAKING_REWARDS_DISTRIBUTOR }
	// );

	// // Advance one block so voting can begin
	// await time.increase(15);
	// await time.advanceBlock();

	// await governance_instance.castVote(1, true, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
	// await governance_instance.castVote(2, true, { from: GOVERNOR_GUARDIAN_ADDRESS });
	// await governance_instance.castVote(3, true, { from: STAKING_REWARDS_DISTRIBUTOR });

	// // ======== Advance a block and 24 hours to catch things up ========
	// await time.increase(86400 + 1);
	// await time.advanceBlock();

	});

});
