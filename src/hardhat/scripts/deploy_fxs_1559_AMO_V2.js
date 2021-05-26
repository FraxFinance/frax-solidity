const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const chalk = require('chalk');

async function main() {
	console.log("Compiling");
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

	// console.log("Getting contract");
	// const FXS1559_AMO_V2 = await hre.ethers.getContractFactory("FXS1559_AMO_V2");

	// ==================== PROXY DEPLOYMENT ====================
	const FXS1559_AMO_V2 = await ethers.getContractFactory("FXS1559_AMO_V2");
	const fxs1559_amo_v2_instance = await upgrades.deployProxy(FXS1559_AMO_V2, [
		CONTRACT_ADDRESSES.mainnet.main.FRAX, 
		CONTRACT_ADDRESSES.mainnet.main.FXS, 
		CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
		CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		INVESTOR_CUSTODIAN_ADDRESS, 
		CONTRACT_ADDRESSES.mainnet.misc.timelock,
		'0xEE5825d5185a1D512706f9068E69146A54B6e076',
		'0xB8315Af919729c823B2d996B1A6DDE381E7444f1',
		'0x19a0a70a68fbC604Bf20A03b787df8f7AC1d50f0'
	]);
	await fxs1559_amo_v2_instance.deployed();
	console.log("FXS1559 AMO V2 deployed to:", fxs1559_amo_v2_instance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
