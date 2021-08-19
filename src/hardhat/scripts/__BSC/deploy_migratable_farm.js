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
	
	const MigratableFarmBSC_FRAX_FXS = await hre.ethers.getContractFactory("MigratableFarmBSC_FRAX_FXS");

	const migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.deploy(
		STAKING_OWNER, 
		CONTRACT_ADDRESSES.bsc.main.FXS, 
		CONTRACT_ADDRESSES.bsc.reward_tokens.cake, 
		CONTRACT_ADDRESSES.bsc.pair_tokens['PancakeSwap FRAX/FXS'], 
		COLLATERAL_FRAX_AND_FXS_OWNER
	)

	// const staking_dual_fxs_weth = await StakingRewardsDual_FXS_WETH_Sushi.deploy(
	// 	STAKING_OWNER, 
	// 	CONTRACT_ADDRESSES.ethereum.main.FXS, 
	// 	CONTRACT_ADDRESSES.ethereum.reward_tokens.sushi, 
	// 	CONTRACT_ADDRESSES.ethereum.pair_tokens['Sushi FXS/WETH'], 
	// 	CONTRACT_ADDRESSES.ethereum.main.FRAX, 
	// 	CONTRACT_ADDRESSES.ethereum.misc.timelock, 
	// 	1000000, 
	// 	1000000
	// )

	console.log("MigratableFarmBSC_FRAX_FXS deployed to:", migratableFarmBSC_FRAX_FXS_instance.address);
	// console.log("StakingRewardsDual_FXS_WETH_Sushi deployed to:", staking_dual_fxs_weth.address);

	// WILL NEED TO CALL LATER
	// console.log(chalk.yellow.bold('======== Initialize the staking rewards ========'));
	// await Promise.all([
	// 	stakingInstance_FRAX_WETH.initializeDefault({ from: STAKING_OWNER }),
	// 	stakingInstance_FRAX_USDC.initializeDefault({ from: STAKING_OWNER }),
	// ])

	// Initial low values for testing (10 FXS / 10 token1) per year
	// console.log("Start allowing FXS rewards");
	// const test_rate = new BigNumber(10e18).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); // (uint256(10e18)).div(365 * 86400); // Base emission rate of 10 FXS per year
	// await staking_dual_FRAX3CRV_V2.setRewardRates(test_rate, test_rate, false, { from: STAKING_OWNER });

	// WILL NEED TO CALL LATER
	// console.log("Start allowing FXS rewards");
	// const new_fxs_rate = new BigNumber(1000000e18).div(3).div(365 * 86400).integerValue(BigNumber.ROUND_FLOOR); // (uint256(1000000e18)).div(365 * 86400); // Base emission rate of 1M FXS over 3 years
	// const curr_sushi_rate = await staking_dual_FRAX3CRV_V2.rewardRate1.call();
	// await staking_dual_FRAX3CRV_V2.setRewardRates(new_fxs_rate, curr_sushi_rate, false, { from: STAKING_OWNER });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
