const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const rnbwFRAX = artifacts.require("ERC20/__CROSSCHAIN/anyFRAX");
const rnbwFXS = artifacts.require("ERC20/__CROSSCHAIN/anyFXS");
const rnbwUSDC = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Bridges
const CrossChainBridgeBacker_AUR_Rainbow = artifacts.require("Bridges/aurora/CrossChainBridgeBacker_AUR_Rainbow");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking contracts

// AMOs

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;

    // Core
    let rnbwFRAX_instance;
    let rnbwFXS_instance;
    let rnbwUSDC_instance;
    let cross_chain_canonical_frax_instance;
    let cross_chain_canonical_fxs_instance;

    // Bridges
    let cross_chain_bridge_backer_instance;

    // Oracles
    let cross_chain_oracle_instance;
    
	// Staking
    
    // AMOs

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

    // Core
    rnbwFRAX_instance = await rnbwFRAX.at(CONTRACT_ADDRESSES.aurora.bridge_tokens.rnbwFRAX);
    rnbwFXS_instance = await rnbwFXS.at(CONTRACT_ADDRESSES.aurora.bridge_tokens.rnbwFXS);
    rnbwUSDC_instance = await rnbwUSDC.at(CONTRACT_ADDRESSES.aurora.collaterals.rnbwUSDC);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.aurora.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.aurora.canonicals.FXS);

    // Bridges
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_AUR_Rainbow.at(CONTRACT_ADDRESSES.aurora.bridge_backers.rainbow);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.aurora.oracles.cross_chain_oracle); 
    
    // Staking

    // AMOs

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    console.log(chalk.yellow('========== CrossChainBridgeBacker_AUR_Rainbow =========='));
    // CrossChainBridgeBacker_AUR_Rainbow
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_AUR_Rainbow.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        cross_chain_oracle_instance.address,
        [
            rnbwFRAX_instance.address, // rnbwFRAX
            cross_chain_canonical_frax_instance.address, // canFRAX
            rnbwFXS_instance.address, // rnbwFXS
            cross_chain_canonical_fxs_instance.address, // canFXS
            CONTRACT_ADDRESSES.aurora.collaterals.rnbwUSDC
        ],
        [
            rnbwFRAX_instance.address, // Swapout
            rnbwFXS_instance.address, // Swapout
            CONTRACT_ADDRESSES.aurora.collaterals.rnbwUSDC // DISABLED
        ],
        "0x0000000000000000000000000000000000000000", // Aurora goes to same address on other side
        "",
        "FRAX Aurora Rainbow CrossChainBridgeBacker",
    );
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.AURORA_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_AUR_Rainbow  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.AURORA_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.AURORA_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    rnbwFRAX.setAsDeployed(rnbwFRAX_instance);
    rnbwFXS.setAsDeployed(rnbwFXS_instance);
    rnbwUSDC.setAsDeployed(rnbwUSDC_instance);
    CrossChainBridgeBacker_AUR_Rainbow.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
}