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

	// // ==================== REGULAR DEPLOYMENT ====================
	// console.log("Getting contract");
	// const CurveAMO_V2 = await hre.ethers.getContractFactory("CurveAMO_V4");

	// console.log("Deploying contract");
	// const CurveAMO_V4_instance = await CurveAMO_V4.deploy(
	// 	CONTRACT_ADDRESSES.ethereum.main.FRAX, 
	// 	CONTRACT_ADDRESSES.ethereum.main.FXS, 
	// 	CONTRACT_ADDRESSES.ethereum.collateral.USDC_V2, 
	// 	COLLATERAL_FRAX_AND_FXS_OWNER, 
	// 	INVESTOR_CUSTODIAN_ADDRESS, 
	// 	CONTRACT_ADDRESSES.ethereum.misc.timelock,
	// 	CONTRACT_ADDRESSES.ethereum.pair_tokens['Curve FRAX3CRV-f-2'],
	// 	"0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // 3CRV pool
	// 	"0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // 3CRV token
	// 	CONTRACT_ADDRESSES.ethereum.pools.USDC_V2,
	// );
	// console.log("CurveAMO_V4 deployed to:", CurveAMO_V4_instance.address);

	// ==================== PROXY DEPLOYMENT ====================
  	const CurveAMO_V4 = await ethers.getContractFactory("CurveAMO_V4");
  	const curveProxy = await upgrades.deployProxy(CurveAMO_V4, [
		CONTRACT_ADDRESSES.ethereum.main.FRAX, 
		CONTRACT_ADDRESSES.ethereum.main.FXS, 
		CONTRACT_ADDRESSES.ethereum.collateral.USDC_V2, 
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		INVESTOR_CUSTODIAN_ADDRESS, 
		CONTRACT_ADDRESSES.ethereum.misc.timelock,
		CONTRACT_ADDRESSES.ethereum.pair_tokens['Curve FRAX3CRV-f-2'],
		"0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // 3CRV pool
		"0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // 3CRV token
		CONTRACT_ADDRESSES.ethereum.pools.USDC_V2,
	]);
  	await curveProxy.deployed();
  	console.log("Curve AMO V3 deployed to:", curveProxy.address);
}

main();