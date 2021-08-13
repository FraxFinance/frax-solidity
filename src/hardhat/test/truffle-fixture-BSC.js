const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// PancakeSwap related
const IPancakePair = artifacts.require("__BSC/PancakeSwap/IPancakePair");
const IImpossiblePair = artifacts.require("__BSC/Impossible/IImpossiblePair");

// FRAX core
const FraxMock = artifacts.require("__BSC/BEP20/Mocks/FraxMock.sol");
const FxsMock = artifacts.require("__BSC/BEP20/Mocks/FxsMock.sol");

// Reward tokens
const Cake = artifacts.require("__BSC/BEP20/Mocks/Cake.sol");
const ImpossibleFinance = artifacts.require("__BSC/BEP20/Mocks/ImpossibleFinance.sol");

// // Governance related
// const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
// const Timelock = artifacts.require("Governance/Timelock");

// Staking contracts
const MigratableFarmBSC_FRAX_FXS = artifacts.require("__BSC/Staking/Variants/MigratableFarmBSC_FRAX_FXS.sol");
const FraxFarmBSC_Dual_FRAX_IF = artifacts.require("__BSC/Staking/Variants/FraxFarmBSC_Dual_FRAX_IF.sol");
const FraxFarmBSC_Dual_FXS_IF = artifacts.require("__BSC/Staking/Variants/FraxFarmBSC_Dual_FXS_IF.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;
	let timelockInstance;
	let migrationHelperInstance;
	let frax_instance;
	let fxs_instance;
    let cakeInstance;
	
    // Staking
    let migratableFarmBSC_FRAX_FXS_instance;
    let fraxFarmBSC_Dual_FRAX_IF_instance;
    let fraxFarmBSC_Dual_FXS_IF_instance;

    // For mainnet
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    frax_instance = await FraxMock.at(CONTRACT_ADDRESSES.bsc.main.FRAX);
    fxs_instance = await FxsMock.at(CONTRACT_ADDRESSES.bsc.main.FXS);
    cakeInstance = await Cake.at(CONTRACT_ADDRESSES.bsc.reward_tokens.cake);
    impossibleFinanceInstance = await ImpossibleFinance.at(CONTRACT_ADDRESSES.bsc.reward_tokens.impossible_finance);

    // timelockInstance = await Timelock.at(CONTRACT_ADDRESSES.mainnet.misc.timelock);
    // governanceInstance = await GovernorAlpha.at(CONTRACT_ADDRESSES.mainnet.governance);
    
    // migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.at(CONTRACT_ADDRESSES.bsc.staking_contracts['PancakeSwap FRAX/FXS'])
    // migratableFarmBSC_FRAX_FXS_instance = await FraxFarmBSC_Dual_FRAX_IF.at(CONTRACT_ADDRESSES.bsc.staking_contracts['Impossible FRAX/IF'])
    

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // // MigratableFarmBSC_FRAX_FXS
    // console.log(chalk.yellow('========== MigratableFarmBSC_FRAX_FXS =========='));
    // migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.new(
	// 	THE_ACCOUNTS[6], 
	// 	CONTRACT_ADDRESSES.bsc.main.FXS, 
	// 	CONTRACT_ADDRESSES.bsc.reward_tokens.cake, 
	// 	CONTRACT_ADDRESSES.bsc.pair_tokens['Impossible FRAX/IF'], 
	// 	THE_ACCOUNTS[1]
    // );

    // FraxFarmBSC_Dual_FRAX_IF_instance
    console.log(chalk.yellow('========== FraxFarmBSC_Dual_FRAX_IF_instance =========='));
    fraxFarmBSC_Dual_FRAX_IF_instance = await FraxFarmBSC_Dual_FRAX_IF.new(
		THE_ACCOUNTS[6], 
		CONTRACT_ADDRESSES.bsc.main.FXS, 
		CONTRACT_ADDRESSES.bsc.reward_tokens.impossible_finance, 
		CONTRACT_ADDRESSES.bsc.pair_tokens['Impossible FRAX/IF'], 
		THE_ACCOUNTS[1]
    );

    // console.log("Curve AMO address:", curve_amo_instance.address);

    FraxMock.setAsDeployed(frax_instance);
    FxsMock.setAsDeployed(fxs_instance);
    Cake.setAsDeployed(cakeInstance);
    ImpossibleFinance.setAsDeployed(impossibleFinanceInstance);
    // Timelock.setAsDeployed(timelockInstance);
    // GovernorAlpha.setAsDeployed(governanceInstance);
    
    // MigratableFarmBSC_FRAX_FXS.setAsDeployed(migratableFarmBSC_FRAX_FXS_instance);
    FraxFarmBSC_Dual_FRAX_IF.setAsDeployed(fraxFarmBSC_Dual_FRAX_IF_instance);
}