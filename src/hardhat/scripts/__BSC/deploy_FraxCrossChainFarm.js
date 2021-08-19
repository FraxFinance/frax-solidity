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
	console.log("accounts: ", accounts);
	const DEPLOYER_ADDRESS = accounts[0];
	const COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
	const ORACLE_ADDRESS = accounts[2];
	const POOL_CREATOR = accounts[3];
	const TIMELOCK_ADMIN = accounts[4];
	const GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
	const STAKING_OWNER = accounts[6];
	const STAKING_REWARDS_DISTRIBUTOR = accounts[7];
	const INVESTOR_CUSTODIAN_ADDRESS = accounts[8];
	
	// Impossible FRAX/FXS
	const FraxCrossChainFarm_FRAX_IF_Impossible = await hre.ethers.getContractFactory("FraxCrossChainFarm_FRAX_IF_Impossible");
	const fraxCrossChainFarm_FRAX_IF_Impossible = await FraxCrossChainFarm_FRAX_IF_Impossible.deploy(
		STAKING_OWNER, 
		CONTRACT_ADDRESSES.bsc.main.FXS, 
		CONTRACT_ADDRESSES.bsc.reward_tokens.impossible_finance,
		CONTRACT_ADDRESSES.bsc.pair_tokens['Impossible FRAX/IF'], 
		CONTRACT_ADDRESSES.bsc.main.FRAX, 
		"0x0000000000000000000000000000000000000000",
		"0x0000000000000000000000000000000000000000"
	);
	console.log("FraxCrossChainFarm_FRAX_IF_Impossible deployed to:", fraxCrossChainFarm_FRAX_IF_Impossible.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
