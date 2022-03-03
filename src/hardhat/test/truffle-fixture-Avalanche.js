const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const IanyFRAX = artifacts.require("ERC20/__CROSSCHAIN/IanyFRAX");
const IanyFXS = artifacts.require("ERC20/__CROSSCHAIN/IanyFXS");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Bridges
const CrossChainBridgeBacker_AVAX_AnySwap = artifacts.require("Bridges/Avalanche/CrossChainBridgeBacker_AVAX_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// AMOs
const AxialAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Avalanche/AxialAMO.sol");
const PangolinLiquidityAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Avalanche/PangolinLiquidityAMO.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;

    // Core
    let anyFRAX_instance;
    let anyFXS_instance;
    let cross_chain_canonical_frax_instance;
    let cross_chain_canonical_fxs_instance;

    // Bridges
    let cross_chain_bridge_backer_instance;

    // Oracles
    let cross_chain_oracle_instance;
    
    // AMOs
    let axial_amo_instance;
    let pangolin_liquidity_amo_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

    // Core
    anyFRAX_instance = await IanyFRAX.at(CONTRACT_ADDRESSES.avalanche.bridge_tokens.anyFRAX);
    anyFXS_instance = await IanyFXS.at(CONTRACT_ADDRESSES.avalanche.bridge_tokens.anyFXS);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.avalanche.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.avalanche.canonicals.FXS);

    // Bridges
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_AVAX_AnySwap.at(CONTRACT_ADDRESSES.avalanche.bridge_backers.anySwap);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.avalanche.oracles.cross_chain_oracle); 

    // AMOs
    pangolin_liquidity_amo_instance = await PangolinLiquidityAMO.at(CONTRACT_ADDRESSES.avalanche.amos.pangolin_liquidity);

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    console.log(chalk.yellow("========== AxialAMO =========="));
    axial_amo_instance = await AxialAMO.new(
        THE_ACCOUNTS[1],
        THE_ACCOUNTS[10],
        [
            CONTRACT_ADDRESSES.avalanche.collaterals.TSD,
            CONTRACT_ADDRESSES.avalanche.collaterals.MIM,
            CONTRACT_ADDRESSES.avalanche.canonicals.FRAX,
            CONTRACT_ADDRESSES.avalanche.collaterals.DAI,
            CONTRACT_ADDRESSES.avalanche.bridge_backers.anySwap,
        ],
        [
            "0xcF8419A615c57511807236751c0AF38Db4ba3351",
            "0x8c3c1C6F971C01481150CA7942bD2bbB9Bc27bC7",
            "0x4da067E13974A4d32D342d86fBBbE4fb0f95f382",
            "0x958C0d0baA8F220846d3966742D4Fb5edc5493D3"
        ]
    );

    // console.log(chalk.yellow("========== PangolinLiquidityAMO =========="));
    // pangolin_liquidity_amo_instance = await PangolinLiquidityAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     cross_chain_canonical_fxs_instance.address,
    //     CONTRACT_ADDRESSES.avalanche.collaterals["USDC.e"],
    //     cross_chain_bridge_backer_instance.address,
    //     [
	// 		CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFRAX/canFXS"],
	// 		CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFRAX/USDC.e"],
	// 		CONTRACT_ADDRESSES.avalanche.pair_tokens["Pangolin canFXS/USDC.e"],
	// 	]
    // );
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.AVALANCHE_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_AVAX_AnySwap  =========='));
    await cross_chain_bridge_backer_instance.addAMO(axial_amo_instance.address, false, { from: process.env.AVALANCHE_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.AVALANCHE_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    IanyFRAX.setAsDeployed(anyFRAX_instance);
    IanyFXS.setAsDeployed(anyFXS_instance);
    CrossChainBridgeBacker_AVAX_AnySwap.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
    AxialAMO.setAsDeployed(axial_amo_instance);
    PangolinLiquidityAMO.setAsDeployed(pangolin_liquidity_amo_instance);
}