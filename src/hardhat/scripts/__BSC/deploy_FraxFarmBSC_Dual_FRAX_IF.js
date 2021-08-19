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
	
	const FraxFarmBSC_Dual_FRAX_IF = await hre.ethers.getContractFactory("FraxFarmBSC_Dual_FRAX_IF");

	const fraxFarmBSC_Dual_FRAX_IF_instance = await FraxFarmBSC_Dual_FRAX_IF.deploy(
		STAKING_OWNER, 
		CONTRACT_ADDRESSES.bsc.main.FXS, 
		CONTRACT_ADDRESSES.bsc.reward_tokens.impossible_finance, 
		CONTRACT_ADDRESSES.bsc.pair_tokens['Impossible FRAX/IF'], 
		COLLATERAL_FRAX_AND_FXS_OWNER
	);

	console.log("FraxFarmBSC_Dual_FRAX_IF deployed to:", fraxFarmBSC_Dual_FRAX_IF_instance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
