const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const oneFRAX = artifacts.require("ERC20/__CROSSCHAIN/oneFRAX");
const oneFXS = artifacts.require("ERC20/__CROSSCHAIN/oneFXS");
const oneUSDC = artifacts.require("ERC20/__CROSSCHAIN/oneUSDC");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Bridges
const CrossChainBridgeBacker_HARM_Horizon = artifacts.require("Bridges/Harmony/CrossChainBridgeBacker_HARM_Horizon");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking contracts

// AMOs
const SushiSwapLiquidityAMO_HARM = artifacts.require("Misc_AMOs/__CROSSCHAIN/Harmony/SushiSwapLiquidityAMO_HARM.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;

    throw 'THIS WILL HAVE CONNECTION ISSUES [TypeError: Only absolute URLs are supported] JUST FOR HARMONY';

    // Core
    let oneFRAX_instance;
    let oneFXS_instance;
    let oneUSDC_instance;
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
    oneFRAX_instance = await oneFRAX.at(CONTRACT_ADDRESSES.harmony.bridge_tokens["1FRAX"]);
    oneFXS_instance = await oneFXS.at(CONTRACT_ADDRESSES.harmony.bridge_tokens["1FXS"]);
    oneUSDC_instance = await oneUSDC.at(CONTRACT_ADDRESSES.harmony.collaterals["1USDC"]);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.harmony.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.harmony.canonicals.FXS);

    // Bridges
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_HARM_Horizon.at(CONTRACT_ADDRESSES.harmony.bridge_backers.harmony_bridge);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.harmony.oracles.cross_chain_oracle); 
    
    // Staking

    // AMOs

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // console.log(chalk.yellow('========== CrossChainCanonicalFRAX =========='));
    // // CrossChainCanonicalFRAX
    // cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.new(
	// 	"Frax", 
	// 	"FRAX",
	// 	THE_ACCOUNTS[1], 
	// 	"100000000000000000000000",
	// 	"0x36A87d1E3200225f881488E4AEedF25303FebcAe",
	// 	[
    //         oneFRAX_instance.address
    //     ]
    // );

    // console.log(chalk.yellow('========== CrossChainCanonicalFXS =========='));
    // // CrossChainCanonicalFXS
    // cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.new(
	// 	"Frax Share", 
	// 	"FXS",
	// 	THE_ACCOUNTS[1], 
	// 	"100000000000000000000000",
	// 	"0x36A87d1E3200225f881488E4AEedF25303FebcAe",
	// 	[
    //         oneFXS_instance.address
    //     ]
    // );

    // // Set some starting prices
    // await cross_chain_oracle_instance.setPrice(oneFRAX_instance.address, new BigNumber("1e6"), { from: THE_ACCOUNTS[1] });
    // await cross_chain_oracle_instance.setPrice(cross_chain_canonical_frax_instance.address, new BigNumber("1e6"), { from: THE_ACCOUNTS[1] });
    // await cross_chain_oracle_instance.setPrice(oneFXS_instance.address, new BigNumber("5110000"), { from: THE_ACCOUNTS[1] });
    // await cross_chain_oracle_instance.setPrice(cross_chain_canonical_fxs_instance.address, new BigNumber("5110000"), { from: THE_ACCOUNTS[1] });

    console.log(chalk.yellow('========== CrossChainBridgeBacker_HARM_Horizon =========='));
    // CrossChainBridgeBacker_HARM_Horizon
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_HARM_Horizon.new(
        THE_ACCOUNTS[1],
        CONTRACT_ADDRESSES.ethereum.misc.timelock,
        cross_chain_oracle_instance.address,
        [
            oneFRAX_instance.address, // oneFRAX
            cross_chain_canonical_frax_instance.address, // canFRAX
            oneFXS_instance.address, // oneFXS
            cross_chain_canonical_fxs_instance.address, // canFXS
            CONTRACT_ADDRESSES.harmony.collaterals["1USDC"]
        ],
        [
            oneFRAX_instance.address, // burnToken
            oneFXS_instance.address, // burnToken
            CONTRACT_ADDRESSES.harmony.collaterals["1USDC"] // burnToken
        ],
        "0x0000000000000000000000000000000000000000", // Harmony goes to same address on other side
        "",
        "FRAX Harmony Horizon CrossChainBridgeBacker",
    );

    // console.log(chalk.yellow("========== ScreamAMO =========="));
    // scream_amo_instance = await ScreamAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     "0x4E6854EA84884330207fB557D1555961D85Fc17E",
    //     cross_chain_bridge_backer_instance.address,
    // );

    console.log(chalk.yellow("========== SushiSwapLiquidityAMO_HARM =========="));
    SushiSwapLiquidityAMO_HARM_instance = await SushiSwapLiquidityAMO_HARM.new(
        THE_ACCOUNTS[1],
        THE_ACCOUNTS[10],
        cross_chain_canonical_frax_instance.address,
        cross_chain_canonical_fxs_instance.address,
        CONTRACT_ADDRESSES.harmony.collaterals["1USDC"],
        cross_chain_bridge_backer_instance.address,
        [
			CONTRACT_ADDRESSES.harmony.pair_tokens["Sushi canFRAX/canFXS"],
			CONTRACT_ADDRESSES.harmony.pair_tokens["Sushi canFRAX/1USDC"],
			CONTRACT_ADDRESSES.harmony.pair_tokens["Sushi canFXS/1USDC"],
		]
    );
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.HARMONY_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_HARM_Horizon  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.HARMONY_ONE_ADDRESS });
    await cross_chain_bridge_backer_instance.addAMO(SushiSwapLiquidityAMO_HARM_instance.address, false, { from: process.env.HARMONY_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.HARMONY_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    IanyFRAX.setAsDeployed(oneFRAX_instance);
    IanyFXS.setAsDeployed(oneFXS_instance);
    CrossChainBridgeBacker_HARM_Horizon.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
    FraxCrossChainFarm_FRAX_FXS_Spirit.setAsDeployed(staking_instance_frax_fxs_spirit);
    ScreamAMO.setAsDeployed(scream_amo_instance);
    SushiSwapLiquidityAMO_HARM.setAsDeployed(SushiSwapLiquidityAMO_HARM_instance);
}