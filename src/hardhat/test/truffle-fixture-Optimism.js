const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const celrFRAX = artifacts.require("ERC20/__CROSSCHAIN/celrFRAX");
const celrFXS = artifacts.require("ERC20/__CROSSCHAIN/celrFXS");
const optiUSDC = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Bridges
const CrossChainBridgeBacker_OPTI_Celer = artifacts.require("Bridges/optimism/CrossChainBridgeBacker_OPTI_Celer");

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
    let celrFRAX_instance;
    let celrFXS_instance;
    let optiUSDC_instance;
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
    celrFRAX_instance = await celrFRAX.at(CONTRACT_ADDRESSES.optimism.bridge_tokens.celrFRAX);
    celrFXS_instance = await celrFXS.at(CONTRACT_ADDRESSES.optimism.bridge_tokens.celrFXS);
    optiUSDC_instance = await optiUSDC.at(CONTRACT_ADDRESSES.optimism.collaterals.optiUSDC);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.optimism.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.optimism.canonicals.FXS);

    // Bridges
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_OPTI_Celer.at(CONTRACT_ADDRESSES.optimism.bridge_backers.nomad);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.optimism.oracles.cross_chain_oracle); 
    
    // Staking

    // AMOs

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    console.log(chalk.yellow('========== CrossChainBridgeBacker_OPTI_Celer =========='));
    // CrossChainBridgeBacker_OPTI_Celer
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_OPTI_Celer.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        cross_chain_oracle_instance.address,
        [
            celrFRAX_instance.address, // celrFRAX
            cross_chain_canonical_frax_instance.address, // canFRAX
            celrFXS_instance.address, // celrFXS
            cross_chain_canonical_fxs_instance.address, // canFXS
            CONTRACT_ADDRESSES.optimism.collaterals.optiUSDC
        ],
        [
            CONTRACT_ADDRESSES.optimism.bridges.celrFRAX, // burn
            CONTRACT_ADDRESSES.optimism.bridges.celrFXS, // burn
            CONTRACT_ADDRESSES.optimism.bridges.optiUSDC // withdraw
        ],
        "0x0000000000000000000000000000000000000000", // Optimism goes to same address on other side
        "",
        "FRAX Optimism Celer CrossChainBridgeBacker",
    );
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.OPTIMISM_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_OPTI_Celer  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.OPTIMISM_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.OPTIMISM_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    celrFRAX.setAsDeployed(celrFRAX_instance);
    celrFXS.setAsDeployed(celrFXS_instance);
    optiUSDC.setAsDeployed(optiUSDC_instance);
    CrossChainBridgeBacker_OPTI_Celer.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
}