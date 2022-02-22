const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const anyFRAX = artifacts.require("ERC20/__CROSSCHAIN/anyFRAX");
const anyFXS = artifacts.require("ERC20/__CROSSCHAIN/anyFXS");
const arbiUSDC = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");
const arbiUSDT = artifacts.require("ERC20/__CROSSCHAIN/IArbFiatToken");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");

// Bridges
const CrossChainBridgeBacker_ARBI_AnySwap = artifacts.require("Bridges/Arbitrum/CrossChainBridgeBacker_ARBI_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking contracts
const FraxCCFarmV2_ArbiCurveVSTFRAX = artifacts.require("Staking/Variants/FraxCCFarmV2_ArbiCurveVSTFRAX");
const FraxCCFarmV2_SaddleArbUSDv2 = artifacts.require("Staking/Variants/FraxCCFarmV2_SaddleArbUSDv2");

// AMOs
const SushiSwapLiquidityAMO_ARBI = artifacts.require("Misc_AMOs/__CROSSCHAIN/Arbitrum/SushiSwapLiquidityAMO_ARBI.sol");
const CurveAMO_ARBI = artifacts.require("Misc_AMOs/__CROSSCHAIN/Arbitrum/CurveAMO_ARBI.sol");

module.exports = async (deployer) => {
    const THE_ACCOUNTS = await hre.web3.eth.getAccounts();
    console.log("THE_ACCOUNTS[0] in truffle-fixture: ", THE_ACCOUNTS[0]);

    // Get the necessary instances
	let CONTRACT_ADDRESSES;

    // Core
    let anyFRAX_instance;
    let anyFXS_instance;
    let arbiUSDC_instance;
    let arbiUSDT_instance;
    let cross_chain_canonical_frax_instance;
    let cross_chain_canonical_fxs_instance;

    // Bridges
    let cross_chain_bridge_backer_instance;

    // Oracles
    let cross_chain_oracle_instance;
    
	// Staking
    let FraxCCFarmV2_ArbiCurveVSTFRAX_instance;
    let fraxCCFarmV2_SaddleArbUSDv2_instance;
    
    // AMOs
    let curve_amo_arbi_instance;
    let sushiswap_liquidity_amo_arbi_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

    // Core
    anyFRAX_instance = await anyFRAX.at(CONTRACT_ADDRESSES.arbitrum.bridge_tokens.anyFRAX);
    anyFXS_instance = await anyFXS.at(CONTRACT_ADDRESSES.arbitrum.bridge_tokens.anyFXS);
    arbiUSDC_instance = await arbiUSDC.at(CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDC);
    arbiUSDT_instance = await arbiUSDT.at(CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDT);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.arbitrum.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.arbitrum.canonicals.FXS);

    // Bridges
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_ARBI_AnySwap.at(CONTRACT_ADDRESSES.arbitrum.bridge_backers.anySwap);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.arbitrum.oracles.cross_chain_oracle); 
    
    // Staking

    // AMOs
    sushiswap_liquidity_amo_arbi_instance = await SushiSwapLiquidityAMO_ARBI.at(CONTRACT_ADDRESSES.arbitrum.amos.sushiswap_liquidity);
    curve_amo_arbi_instance = await CurveAMO_ARBI.at(CONTRACT_ADDRESSES.arbitrum.amos.curve);

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

    // console.log(chalk.yellow('========== CrossChainBridgeBacker_ARBI_AnySwap =========='));
    // // CrossChainBridgeBacker_ARBI_AnySwap
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_ARBI_AnySwap.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     cross_chain_oracle_instance.address,
    //     [
    //         anyFRAX_instance.address, // anyFRAX
    //         cross_chain_canonical_frax_instance.address, // canFRAX
    //         anyFXS_instance.address, // anyFXS
    //         cross_chain_canonical_fxs_instance.address, // canFXS
    //         CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDC
    //     ],
    //     [
    //         anyFRAX_instance.address, // Swapout
    //         anyFXS_instance.address, // Swapout
    //         CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDC // DISABLED
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Arbitrum goes to same address on other side
    //     "",
    //     "FRAX Arbitrum AnySwap CrossChainBridgeBacker",
    // );

    // console.log(chalk.yellow("========== ScreamAMO =========="));
    // scream_amo_instance = await ScreamAMO.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     "0x4E6854EA84884330207fB557D1555961D85Fc17E",
    //     cross_chain_bridge_backer_instance.address,
    // );
    // console.log(CONTRACT_ADDRESSES.arbitrum.pair_tokens["Sushi canFRAX/canFXS"]);
    // console.log(CONTRACT_ADDRESSES.arbitrum.pair_tokens["Sushi canFRAX/arbiUSDC"]);
    // console.log(CONTRACT_ADDRESSES.arbitrum.pair_tokens["Sushi canFXS/arbiUSDC"]);

    // console.log(chalk.yellow("========== SushiSwapLiquidityAMO_ARBI =========="));
    // sushiswap_liquidity_amo_arbi_instance = await SushiSwapLiquidityAMO_ARBI.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     cross_chain_canonical_fxs_instance.address,
    //     CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDC,
    //     cross_chain_bridge_backer_instance.address,
    //     [
	// 		CONTRACT_ADDRESSES.arbitrum.pair_tokens["Sushi canFRAX/canFXS"],
	// 		CONTRACT_ADDRESSES.arbitrum.pair_tokens["Sushi canFRAX/arbiUSDC"],
	// 		CONTRACT_ADDRESSES.arbitrum.pair_tokens["Sushi canFXS/arbiUSDC"]
	// 	]
    // );

    console.log(chalk.yellow("========== FraxCCFarmV2_ArbiCurveVSTFRAX =========="));
    // FraxCCFarmV2_ArbiCurveVSTFRAX 
    FraxCCFarmV2_ArbiCurveVSTFRAX_instance = await FraxCCFarmV2_ArbiCurveVSTFRAX.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.arbitrum.bridge_tokens.anyFXS, // anyFXS
        CONTRACT_ADDRESSES.arbitrum.canonicals.FXS, // canFXS
        CONTRACT_ADDRESSES.arbitrum.reward_tokens.VSTA, 
        CONTRACT_ADDRESSES.arbitrum.pair_tokens["Curve VSTFRAX-f"],
        CONTRACT_ADDRESSES.arbitrum.canonicals.FRAX, // canFRAX
        "0x0000000000000000000000000000000000000000", // Timelock
        "0x0000000000000000000000000000000000000000", // Rewarder
    );

    console.log(chalk.yellow("========== FraxCCFarmV2_SaddleArbUSDv2 =========="));
    // FraxCCFarmV2_SaddleArbUSDv2 
    fraxCCFarmV2_SaddleArbUSDv2_instance = await FraxCCFarmV2_SaddleArbUSDv2.new(
        THE_ACCOUNTS[6], 
        CONTRACT_ADDRESSES.arbitrum.bridge_tokens.anyFXS, // anyFXS
        CONTRACT_ADDRESSES.arbitrum.canonicals.FXS, // canFXS
        CONTRACT_ADDRESSES.arbitrum.reward_tokens.SPELL, // Should be SDL, but run tests with SPELL
        CONTRACT_ADDRESSES.arbitrum.bearer_tokens.saddleArbUSDv2,
        CONTRACT_ADDRESSES.arbitrum.canonicals.FRAX, // canFRAX
        "0x0000000000000000000000000000000000000000", // Timelock
        "0x0000000000000000000000000000000000000000", // Rewarder
    );



    // console.log(chalk.yellow("========== CurveAMO_ARBI =========="));
    // curve_amo_arbi_instance = await CurveAMO_ARBI.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     [
    //         CONTRACT_ADDRESSES.arbitrum.canonicals.FRAX,
    //         CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDC,
    //         CONTRACT_ADDRESSES.arbitrum.collaterals.arbiUSDT,
    //         CONTRACT_ADDRESSES.arbitrum.bridge_backers.anySwap,
    //     ],
    //     [
    //         "0xf07d553B195080F84F582e88ecdD54bAa122b279",
    //         "0xbF7E49483881C76487b0989CD7d9A8239B20CA41",
    //         "0x7f90122BF0700F9E7e1F688fe926940E8839F353",
    //         "0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287"
    //     ]
    // );
    
    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [process.env.ARBITRUM_ONE_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_ARBI_AnySwap  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.ARBITRUM_ONE_ADDRESS });
    // await cross_chain_bridge_backer_instance.addAMO(sushiswap_liquidity_amo_arbi_instance.address, false, { from: process.env.ARBITRUM_ONE_ADDRESS });
    // await cross_chain_bridge_backer_instance.addAMO(curve_amo_arbi_instance.address, false, { from: process.env.ARBITRUM_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.ARBITRUM_ONE_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    anyFRAX.setAsDeployed(anyFRAX_instance);
    anyFXS.setAsDeployed(anyFXS_instance);
    arbiUSDC.setAsDeployed(arbiUSDC_instance);
    arbiUSDT.setAsDeployed(arbiUSDT_instance);
    CrossChainBridgeBacker_ARBI_AnySwap.setAsDeployed(cross_chain_bridge_backer_instance);
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance);
    FraxCCFarmV2_ArbiCurveVSTFRAX.setAsDeployed(FraxCCFarmV2_ArbiCurveVSTFRAX_instance);
    FraxCCFarmV2_SaddleArbUSDv2.setAsDeployed(fraxCCFarmV2_SaddleArbUSDv2_instance);
    SushiSwapLiquidityAMO_ARBI.setAsDeployed(sushiswap_liquidity_amo_arbi_instance);
    CurveAMO_ARBI.setAsDeployed(curve_amo_arbi_instance);
}