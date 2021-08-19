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
	
	// const StakingRewardsDual_FRAX_FXS_Sushi = await hre.ethers.getContractFactory("StakingRewardsDual_FRAX_FXS_Sushi");
	// const StakingRewardsDual_FXS_WETH_Sushi = await hre.ethers.getContractFactory("StakingRewardsDual_FXS_WETH_Sushi");
	const RariFuseLendingAMO_V2 = await hre.ethers.getContractFactory("RariFuseLendingAMO_V2");

	const rariAMOInstance = await RariFuseLendingAMO_V2.deploy(
		COLLATERAL_FRAX_AND_FXS_OWNER, 
		INVESTOR_CUSTODIAN_ADDRESS,
        CONTRACT_ADDRESSES.ethereum.main.FRAX, 
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        [
            "0x814b02C1ebc9164972D888495927fe1697F0Fb4c", // Pool #6: [Unitroller] Tetranode's Locker.
            "0xfb558ecd2d24886e8d2956775c619deb22f154ef", // Pool #7: [Unitroller] ChainLinkGod's / Tetranode's Up Only Pool
            "0xd4bdcca1ca76ced6fc8bb1ba91c5d7c0ca4fe567", // Pool #9: [Unitroller] Frax & Reflexer Stable Asset Pool
            "0x621579dd26774022f33147d3852ef4e00024b763", // Pool #18: [Unitroller] Olympus Pool Party Frax
            "0x64858bac30f4cc223ea07adc09a51acdcd225998", // Pool #24: [Unitroller] Harvest FARMstead
        ],
        [
            "0x1531C1a63A169aC75A2dAAe399080745fa51dE44", // Pool #6: [CErc20Delegator] Tetranode's Locker.
            "0x6313c160b329db59086df28ed2bf172a82f0d9d1", // Pool #7: [CErc20Delegator] ChainLinkGod's / Tetranode's Up Only Pool
            "0x0f43a7e3f7b529015B0517D0D9Aa9b95701fd2Cb", // Pool #9: [CErc20Delegator] Frax & Reflexer Stable Asset Pool
            "0x3e5c122ffa75a9fe16ec0c69f7e9149203ea1a5d", // Pool #18: [CErc20Delegator] Olympus Pool Party Frax
            "0x0A6eAfaA84188A146749D7864bB20E63bD16ea2A", // Pool #24: [CErc20Delegator] Harvest FARMstead
        ]
	)

	console.log("RariFuseLendingAMO_V2 deployed to:", rariAMOInstance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
