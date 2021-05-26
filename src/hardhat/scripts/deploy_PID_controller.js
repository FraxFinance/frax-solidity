const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const chalk = require('chalk');

async function main() {
	await hre.run('compile');

	const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

	const accounts = await hre.web3.eth.getAccounts();
	const DEPLOYER_ADDRESS = accounts[0];
	const COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
	const ORACLE_ADDRESS = accounts[2];
	const POOL_CREATOR = accounts[3];
	const TIMELOCK_ADMIN = accounts[4];
	const GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
	const STAKING_OWNER = accounts[6];
	const STAKING_REWARDS_DISTRIBUTOR = accounts[7];
	const INVESTOR_CUSTODIAN_ADDRESS = accounts[8];

	let provider = hre.ethers.provider;
	
	// Get the signers; accounts 0 through 2
	let signer0 = provider.getSigner(0);
	let signer1 = provider.getSigner(1);
	let signer2 = provider.getSigner(2);


	// console.log(chalk.yellow('========== ChainlinkFXSUSDPriceConsumer =========='));
	// const ChainlinkFXSUSDPriceConsumer = await hre.ethers.getContractFactory("ChainlinkFXSUSDPriceConsumer", signer1); // Connect to ReserveTracker contract as accounts[1]
	
	// const chainlinkFXSUSDPriceConsumerInstance = await ChainlinkFXSUSDPriceConsumer.deploy();
	// console.log("ChainlinkFXSUSDPriceConsumer address:", chainlinkFXSUSDPriceConsumerInstance.address);

	// // Initialize ChainlinkFXSUSDPriceConsumer
    // chainlinkFXSUSDPriceConsumerInstance.functions.setFXSUSDOracle(chainlinkFXSUSDPriceConsumerInstance.address);
    

	console.log(chalk.yellow('========== Reserve Tracker =========='));
	const ReserveTracker = await hre.ethers.getContractFactory("ReserveTracker", signer1); // Connect to ReserveTracker contract as accounts[1]

	const reserveTrackerInstance = await ReserveTracker.deploy(
		CONTRACT_ADDRESSES.mainnet.main.FRAX,
		CONTRACT_ADDRESSES.mainnet.main.FXS,
		COLLATERAL_FRAX_AND_FXS_OWNER,
		CONTRACT_ADDRESSES.mainnet.misc.timelock
	);
	console.log("ReserveTracker deployed to:", reserveTrackerInstance.address);

	// "from" is already signer1 here
    // Initialize ReserveTracker
    await reserveTrackerInstance.functions.setMetapool("0xd632f22692fac7611d2aa1c0d552930d43caed3b");
    await reserveTrackerInstance.functions.setFRAXPriceOracle("0x2E45C589A9F301A2061f6567B9F432690368E3C6", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6);
    await reserveTrackerInstance.functions.addFXSPair("0xE1573B9D29e2183B1AF0e743Dc2754979A40D237"); // Uni FRAX-FXS


	console.log(chalk.yellow('========== PID Controller =========='));
	const PIDController = await hre.ethers.getContractFactory("PIDController", signer1);

	const PIDControllerInstance = await PIDController.deploy(
		CONTRACT_ADDRESSES.mainnet.main.FRAX,
		CONTRACT_ADDRESSES.mainnet.main.FXS,
		COLLATERAL_FRAX_AND_FXS_OWNER,
		CONTRACT_ADDRESSES.mainnet.misc.timelock,
		reserveTrackerInstance.address
	);
	console.log("PIDController deployed to:", PIDControllerInstance.address);

	// Initialize PIDController
	await PIDControllerInstance.functions.setMetapool("0xd632f22692fac7611d2aa1c0d552930d43caed3b");
	await PIDControllerInstance.functions.setChainlinkFXSOracle("0x679a15fe8B2108fdA30f292C92abCDE3a1246324");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
