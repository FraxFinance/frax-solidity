const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

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

  	// const InvestorAMO_V2 = await ethers.getContractFactory("InvestorAMO_V2");
  	// const investorProxy = await upgrades.deployProxy(InvestorAMO_V2, [
  	// 	CONTRACT_ADDRESSES.mainnet.main.FRAX, 
	// 	CONTRACT_ADDRESSES.mainnet.main.FXS, 
	// 	CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
	// 	CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
	// 	COLLATERAL_FRAX_AND_FXS_OWNER, 
	// 	INVESTOR_CUSTODIAN_ADDRESS,
	// 	CONTRACT_ADDRESSES.mainnet.misc.timelock, 
	// ]);
  	// await investorProxy.deployed();
  	// console.log("Investor Proxy deployed to:", investorProxy.address);

	const InvestorAMO_V2_upgrade = await ethers.getContractFactory("InvestorAMO_V2_upgrade");
  	const investorUpgradeProxy = await upgrades.deployProxy(InvestorAMO_V2_upgrade, [
  		CONTRACT_ADDRESSES.mainnet.main.FRAX, 
		CONTRACT_ADDRESSES.mainnet.main.FXS, 
		CONTRACT_ADDRESSES.mainnet.pools.USDC_V2, 
		CONTRACT_ADDRESSES.mainnet.collateral.USDC_V2, 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		INVESTOR_CUSTODIAN_ADDRESS,
		CONTRACT_ADDRESSES.mainnet.misc.timelock, 
	]);
  	await investorUpgradeProxy.deployed();
  	console.log("Investor Proxy [Upgraded] deployed to:", investorUpgradeProxy.address);
}

main();