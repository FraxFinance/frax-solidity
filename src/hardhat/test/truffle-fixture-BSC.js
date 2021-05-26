const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// PancakeSwap related
const IPancakePair = artifacts.require("__BSC/PancakeSwap/IPancakePair");

// FRAX core
const FraxMock = artifacts.require("__BSC/BEP20/Mocks/FraxMock.sol");
const FxsMock = artifacts.require("__BSC/BEP20/Mocks/FxsMock.sol");

// Reward tokens
const Cake = artifacts.require("__BSC/BEP20/Mocks/Cake.sol");

// // Governance related
// const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
// const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const MigratableFarmBSC_FRAX_FXS = artifacts.require("__BSC/Staking/Variants/MigratableFarmBSC_FRAX_FXS.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;
	let timelockInstance;
	let migrationHelperInstance;
	let fraxInstance;
	let fxsInstance;
    let cakeInstance;
	
    let migratableFarmBSC_FRAX_FXS_instance;


    // For mainnet
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    fraxInstance = await FraxMock.at(CONTRACT_ADDRESSES.bsc.main.FRAX);
    fxsInstance = await FxsMock.at(CONTRACT_ADDRESSES.bsc.main.FXS);
    cakeInstance = await Cake.at(CONTRACT_ADDRESSES.bsc.reward_tokens.cake);

    // timelockInstance = await Timelock.at(CONTRACT_ADDRESSES.mainnet.misc.timelock);
    // governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES.mainnet.governance);
    
    // migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.at(CONTRACT_ADDRESSES.bsc.staking_contracts['PancakeSwap FRAX/FXS'])
    

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // MigratableFarmBSC_FRAX_FXS
    console.log(chalk.yellow('========== MigratableFarmBSC_FRAX_FXS =========='));
    migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.new(
		THE_ACCOUNTS[6], 
		CONTRACT_ADDRESSES.bsc.main.FXS, 
		CONTRACT_ADDRESSES.bsc.reward_tokens.cake, 
		CONTRACT_ADDRESSES.bsc.pair_tokens['PancakeSwap FRAX/FXS'], 
		THE_ACCOUNTS[1]
    );

    // console.log("Curve AMO address:", curve_amo_instance.address);

    FraxMock.setAsDeployed(fraxInstance);
    FxsMock.setAsDeployed(fxsInstance);
    Cake.setAsDeployed(cakeInstance);
    // Timelock.setAsDeployed(timelockInstance);
    // GovernorAlpha.setAsDeployed(governanceInstance);
    
    MigratableFarmBSC_FRAX_FXS.setAsDeployed(migratableFarmBSC_FRAX_FXS_instance);

}