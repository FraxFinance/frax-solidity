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
const anyUSDC = artifacts.require("ERC20/__CROSSCHAIN/anyUSDC");

// Bridges
const CrossChainBridgeBacker_FTM_AnySwap = artifacts.require("Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking contracts
const FraxCrossChainFarm_FRAX_FXS_Spirit = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit");

// AMOs
const ScreamAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/ScreamAMO.sol");
const SpiritSwapLiquidityAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/SpiritSwapLiquidityAMO.sol");
const CurveAMO_FTM = artifacts.require("Misc_AMOs/__CROSSCHAIN/Fantom/CurveAMO_FTM.sol");

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
    
	// Staking
    let staking_instance_frax_fxs_spirit;
    
    // AMOs
    let spiritSwapLiquidityAMO_instance;
    let scream_amo_instance;
    let curve_amo_ftm_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

    // Core
    anyFRAX_instance = await IanyFRAX.at(CONTRACT_ADDRESSES.fantom.bridge_tokens.anyFRAX);
    anyFXS_instance = await IanyFXS.at(CONTRACT_ADDRESSES.fantom.bridge_tokens.anyFXS);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.fantom.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.fantom.canonicals.FXS);
    anyUSDC_instance = await anyUSDC.at(CONTRACT_ADDRESSES.fantom.collaterals.anyUSDC);

    // Bridges
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_FTM_AnySwap.at(CONTRACT_ADDRESSES.fantom.bridge_backers.anySwap);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.fantom.oracles.cross_chain_oracle); 
    
    // Staking
    staking_instance_frax_fxs_spirit = await FraxCrossChainFarm_FRAX_FXS_Spirit.at(CONTRACT_ADDRESSES.fantom.staking_contracts["SpiritSwap FRAX/FXS"]);

    // AMOs
    spiritSwapLiquidityAMO_instance = await SpiritSwapLiquidityAMO.at(CONTRACT_ADDRESSES.fantom.amos.spiritswap_liquidity);
    scream_amo_instance = await ScreamAMO.at(CONTRACT_ADDRESSES.fantom.amos.scream);
    // curve_amo_ftm_instance = await CurveAMO_FTM.at(CONTRACT_ADDRESSES.fantom.amos.curve);

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
    //         anyFRAX_instance.address
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
    //         anyFXS_instance.address
    //     ]
    // );

    // // Set some starting prices
    // await cross_chain_oracle_instance.setPrice(anyFRAX_instance.address, new BigNumber("1e6"), { from: THE_ACCOUNTS[1] });
    // await cross_chain_oracle_instance.setPrice(cross_chain_canonical_frax_instance.address, new BigNumber("1e6"), { from: THE_ACCOUNTS[1] });
    // await cross_chain_oracle_instance.setPrice(anyFXS_instance.address, new BigNumber("5110000"), { from: THE_ACCOUNTS[1] });
    // await cross_chain_oracle_instance.setPrice(cross_chain_canonical_fxs_instance.address, new BigNumber("5110000"), { from: THE_ACCOUNTS[1] });

    // console.log(chalk.yellow('========== CrossChainBridgeBacker_FTM_AnySwap =========='));
    // // CrossChainBridgeBacker_FTM_AnySwap
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_FTM_AnySwap.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     cross_chain_oracle_instance.address,
    //     [
    //         anyFRAX_instance.address, // anyFRAX
    //         cross_chain_canonical_frax_instance.address, // canFRAX
    //         anyFXS_instance.address, // anyFXS
    //         cross_chain_canonical_fxs_instance.address, // canFXS
    //         CONTRACT_ADDRESSES.fantom.collaterals.anyUSDC
    //     ],
    //     [
    //         anyFRAX_instance.address, // Swapout
    //         anyFXS_instance.address, // Swapout
    //         CONTRACT_ADDRESSES.fantom.collaterals.anyUSDC // Unwrap
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Avalanche goes to same address on other side
    //     "",
    //     "FRAX Avalanche AnySwap CrossChainBridgeBacker",
    // );

    // console.log(chalk.yellow("========== ScreamAMO =========="));
    // scream_amo_instance = await ScreamAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     "0x4E6854EA84884330207fB557D1555961D85Fc17E",
    //     cross_chain_bridge_backer_instance.address,
    // );

    console.log(chalk.yellow("========== CurveAMO_FTM =========="));
    curve_amo_ftm_instance = await CurveAMO_FTM.new(
        THE_ACCOUNTS[1],
        THE_ACCOUNTS[10],
        [
            CONTRACT_ADDRESSES.fantom.canonicals.FRAX,
            CONTRACT_ADDRESSES.fantom.collaterals.DAI,
            CONTRACT_ADDRESSES.fantom.collaterals.anyUSDC,
            CONTRACT_ADDRESSES.fantom.bridge_backers.anySwap,
        ],
        [
            "0x7a656B342E14F745e2B164890E88017e27AE7320",
            "0x8866414733F22295b7563f9C5299715D2D76CAf4",
            "0x27E611FD27b276ACbd5Ffd632E5eAEBEC9761E40",
            "0x78D51EB71a62c081550EfcC0a9F9Ea94B2Ef081c"
        ]
    );

    // console.log(chalk.yellow("========== SpiritSwapLiquidityAMO =========="));
    // spiritSwapLiquidityAMO_instance = await SpiritSwapLiquidityAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     cross_chain_canonical_fxs_instance.address,
    //     CONTRACT_ADDRESSES.fantom.collaterals.anyUSDC,
    //     cross_chain_bridge_backer_instance.address,
    //     [
	// 		CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFRAX/canFXS"],
	// 		CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFRAX/anyUSDC"],
	// 		CONTRACT_ADDRESSES.fantom.pair_tokens["SpiritSwap canFXS/anyUSDC"],
	// 	]
    // );
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.FANTOM_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_FTM_AnySwap  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.FANTOM_ONE_ADDRESS });
    // await cross_chain_bridge_backer_instance.addAMO(spiritSwapLiquidityAMO_instance.address, false, { from: process.env.FANTOM_ONE_ADDRESS });
    await cross_chain_bridge_backer_instance.addAMO(curve_amo_ftm_instance.address, false, { from: process.env.FANTOM_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.FANTOM_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    IanyFRAX.setAsDeployed(anyFRAX_instance);
    IanyFXS.setAsDeployed(anyFXS_instance);
    anyUSDC.setAsDeployed(anyUSDC_instance);
    CrossChainBridgeBacker_FTM_AnySwap.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
    FraxCrossChainFarm_FRAX_FXS_Spirit.setAsDeployed(staking_instance_frax_fxs_spirit);
    ScreamAMO.setAsDeployed(scream_amo_instance);
    SpiritSwapLiquidityAMO.setAsDeployed(spiritSwapLiquidityAMO_instance);
    CurveAMO_FTM.setAsDeployed(curve_amo_ftm_instance);
}