const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const constants = require(path.join(__dirname, '../../../../dist/types/constants'));

async function main() {

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

	// ==================== PROXY DEPLOYMENT ====================
	const Convex_AMO_V2 = await ethers.getContractFactory("Convex_AMO_V2");
	const convexAMO_proxy = await upgrades.deployProxy(Convex_AMO_V2, [
		CONTRACT_ADDRESSES.ethereum.main.FRAX, 
		CONTRACT_ADDRESSES.ethereum.main.FXS, 
		CONTRACT_ADDRESSES.ethereum.collateral.USDC_V2, 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		INVESTOR_CUSTODIAN_ADDRESS, 
		CONTRACT_ADDRESSES.ethereum.misc.timelock,
		CONTRACT_ADDRESSES.ethereum.pair_tokens['Curve FRAX3CRV-f-2'],
		CONTRACT_ADDRESSES.ethereum.pools.USDC_V2,
  	]);
	await convexAMO_proxy.deployed();
	console.log("Convex AMO deployed to:", convexAMO_proxy.address);
}

main();