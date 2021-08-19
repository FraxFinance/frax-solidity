const path = require('path');
const envPath = path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
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
	
	console.log(chalk.red.bold("MAKE SURE TOKEN0 AND TOKEN1 ARE CORRECT BASED ON THE ACTUAL NFT"));
	console.log(chalk.red.bold("THE TICKS CAN ALSO BE AN ISSUE!"));
	console.log(chalk.red.bold("DO A TEST NFT FIRST"));

	// // FRAX-USDC
	// const FraxUniV3Farm_Stable_FRAX_USDC = await hre.ethers.getContractFactory("FraxUniV3Farm_Stable_FRAX_USDC");
	// const instanceFraxUniV3Farm_Stable_FRAX_USDC = await FraxUniV3Farm_Stable_FRAX_USDC.deploy(
	// 	STAKING_OWNER, 
	// 	CONTRACT_ADDRESSES.ethereum.main.FXS, 
	// 	CONTRACT_ADDRESSES.ethereum.uniswap_v3.NonfungiblePositionManager, 
	// 	CONTRACT_ADDRESSES.ethereum.uni_v3_pools['Uniswap V3 FRAX/USDC'],
	// 	CONTRACT_ADDRESSES.ethereum.misc.timelock, 
	// 	CONTRACT_ADDRESSES.ethereum.main.veFXS, 
	// 	"0x0000000000000000000000000000000000000000", // CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_controller,
	// 	"0x853d955aCEf822Db058eb8505911ED77F175b99e", 
	// 	"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	// 	-276380,
	// 	-276270,
	// 	-276325
	// )
	// console.log("FraxUniV3Farm_Stable_FRAX_USDC deployed to:", instanceFraxUniV3Farm_Stable_FRAX_USDC.address);

	const FraxUniV3Farm_Stable_FRAX_DAI = await hre.ethers.getContractFactory("FraxUniV3Farm_Stable_FRAX_DAI");
	const instanceFraxUniV3Farm_Stable_FRAX_DAI = await FraxUniV3Farm_Stable_FRAX_DAI.deploy(
		STAKING_OWNER, 
		CONTRACT_ADDRESSES.ethereum.uni_v3_pools['Uniswap V3 FRAX/DAI'], 
		CONTRACT_ADDRESSES.ethereum.misc.timelock, 
		CONTRACT_ADDRESSES.ethereum.misc.frax_gauge_rewards_distributor,
		-50,
		50,
		0
	)

	console.log("FraxUniV3Farm_Stable_FRAX_DAI deployed to:", instanceFraxUniV3Farm_Stable_FRAX_DAI.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
