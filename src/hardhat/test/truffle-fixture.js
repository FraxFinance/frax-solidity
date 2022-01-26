const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const madFRAX = artifacts.require("ERC20/__CROSSCHAIN/anyFRAX");
const madFXS = artifacts.require("ERC20/__CROSSCHAIN/anyFXS");
const madUSDC = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Bridges
const CrossChainBridgeBacker_MNBM_Nomad = artifacts.require("Bridges/moonbeam/CrossChainBridgeBacker_MNBM_Nomad");

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
    let madFRAX_instance;
    let madFXS_instance;
    let madUSDC_instance;
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
    madFRAX_instance = await madFRAX.at(CONTRACT_ADDRESSES.moonbeam.bridge_tokens.madFRAX);
    madFXS_instance = await madFXS.at(CONTRACT_ADDRESSES.moonbeam.bridge_tokens.madFXS);
    madUSDC_instance = await madUSDC.at(CONTRACT_ADDRESSES.moonbeam.collaterals.madUSDC);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.moonbeam.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.moonbeam.canonicals.FXS);

    // Bridges
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_MNBM_Nomad.at(CONTRACT_ADDRESSES.moonbeam.bridge_backers.nomad);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.moonbeam.oracles.cross_chain_oracle); 
    
    // Staking

    // AMOs

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    console.log(chalk.yellow('========== CrossChainBridgeBacker_MNBM_Nomad =========='));
    // CrossChainBridgeBacker_MNBM_Nomad
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_MNBM_Nomad.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        cross_chain_oracle_instance.address,
        [
            madFRAX_instance.address, // madFRAX
            cross_chain_canonical_frax_instance.address, // canFRAX
            madFXS_instance.address, // madFXS
            cross_chain_canonical_fxs_instance.address, // canFXS
            CONTRACT_ADDRESSES.moonbeam.collaterals.madUSDC
        ],
        [
            CONTRACT_ADDRESSES.moonbeam.bridges.madFRAX, // send
            CONTRACT_ADDRESSES.moonbeam.bridges.madFXS, // send
            CONTRACT_ADDRESSES.moonbeam.bridges.madUSDC // send
        ],
        "0x0000000000000000000000000000000000000000", // Moonbeam goes to same address on other side
        "",
        "FRAX Moonbeam Nomad CrossChainBridgeBacker",
    );
    let recipient = (`${cross_chain_bridge_backer_instance.address.replace("0x", "0x000000000000000000000000")}`).toLowerCase();
    console.log("address: ", cross_chain_bridge_backer_instance.address);
    console.log("recipient desired: ", recipient);
    await cross_chain_bridge_backer_instance.setRecipient(recipient, { from: THE_ACCOUNTS[1] });
    const actual_recipient = await cross_chain_bridge_backer_instance.recipient.call();
    console.log("recipient actual: ", actual_recipient);
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.MOONBEAM_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_MNBM_Nomad  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.MOONBEAM_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.MOONBEAM_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    madFRAX.setAsDeployed(madFRAX_instance);
    madFXS.setAsDeployed(madFXS_instance);
    madUSDC.setAsDeployed(madUSDC_instance);
    CrossChainBridgeBacker_MNBM_Nomad.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
}