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
const CrossChainBridgeBacker_MOON_AnySwap = artifacts.require("Bridges/Moonriver/CrossChainBridgeBacker_MOON_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");
const ComboOracle = artifacts.require("Oracle/ComboOracle");
const ComboOracle_UniV2_UniV3 = artifacts.require("Oracle/ComboOracle_UniV2_UniV3");

// Staking contracts
// const FraxCrossChainFarm_FRAX_FXS_Spirit = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit");

// AMOs
// const ScreamAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/Moonriver/ScreamAMO.sol");
const CCFrax1to1AMM = artifacts.require("Misc_AMOs/__CROSSCHAIN/Moonriver/CCFrax1to1AMM.sol");
const SushiSwapLiquidityAMO_MOON = artifacts.require("Misc_AMOs/__CROSSCHAIN/Moonriver/SushiSwapLiquidityAMO_MOON.sol");

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
    let combo_oracle_instance;
    let combo_oracle_univ2_univ3_instance;
    
	// Staking
    let staking_instance_frax_fxs_spirit;
    
    // AMOs
    let ccfrax_1to1_amm_instance;
    let SushiSwapLiquidityAMO_MOON_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    const MULTISIG_ADDRESS = CONTRACT_ADDRESSES.moonriver.multisigs["Comptrollers"];
    
    // Core
    anyFRAX_instance = await IanyFRAX.at(CONTRACT_ADDRESSES.moonriver.bridge_tokens.anyFRAX);
    anyFXS_instance = await IanyFXS.at(CONTRACT_ADDRESSES.moonriver.bridge_tokens.anyFXS);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.moonriver.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.moonriver.canonicals.FXS);
    anyUSDC_instance = await anyUSDC.at(CONTRACT_ADDRESSES.moonriver.collaterals.anyUSDC);

    // Bridges
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_MOON_AnySwap.at(CONTRACT_ADDRESSES.moonriver.bridge_backers.anySwap);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.moonriver.oracles.cross_chain_oracle);
    combo_oracle_instance = await ComboOracle.at(CONTRACT_ADDRESSES.moonriver.oracles_other.combo_oracle); 
    combo_oracle_univ2_univ3_instance = await ComboOracle_UniV2_UniV3.at(CONTRACT_ADDRESSES.moonriver.oracles_other.combo_oracle_univ2_univ3); 

    // Staking
    // staking_instance_frax_fxs_spirit = await FraxCrossChainFarm_FRAX_FXS_Spirit.at(CONTRACT_ADDRESSES.moonriver.staking_contracts["SpiritSwap FRAX/FXS"]);

    // AMOs
    // SushiSwapLiquidityAMO_MOON_instance = await SushiSwapLiquidityAMO_MOON.at(CONTRACT_ADDRESSES.moonriver.amos.sushiswap_liquidity);

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

    // console.log(chalk.yellow('========== CrossChainBridgeBacker_MOON_AnySwap =========='));
    // // CrossChainBridgeBacker_MOON_AnySwap
    // cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_MOON_AnySwap.new(
    //     THE_ACCOUNTS[1],
    //     CONTRACT_ADDRESSES.ethereum.misc.timelock,
    //     cross_chain_oracle_instance.address,
    //     [
    //         anyFRAX_instance.address, // anyFRAX
    //         cross_chain_canonical_frax_instance.address, // canFRAX
    //         anyFXS_instance.address, // anyFXS
    //         cross_chain_canonical_fxs_instance.address, // canFXS
    //         CONTRACT_ADDRESSES.moonriver.collaterals.anyUSDC
    //     ],
    //     [
    //         anyFRAX_instance.address, // Swapout
    //         anyFXS_instance.address, // Swapout
    //         CONTRACT_ADDRESSES.moonriver.collaterals.anyUSDC // Unwrap
    //     ],
    //     "0x0000000000000000000000000000000000000000", // Avalanche goes to same address on other side
    //     "",
    //     "FRAX Avalanche AnySwap CrossChainBridgeBacker",
    // );


    // // console.log(chalk.yellow("========== SushiSwapLiquidityAMO_MOON =========="));
    // SushiSwapLiquidityAMO_MOON_instance = await SushiSwapLiquidityAMO_MOON.new(
    //     THE_ACCOUNTS[1],
    //     THE_ACCOUNTS[10],
    //     cross_chain_canonical_frax_instance.address,
    //     cross_chain_canonical_fxs_instance.address,
    //     CONTRACT_ADDRESSES.moonriver.collaterals.anyUSDC,
    //     cross_chain_bridge_backer_instance.address,
    //     [
	// 		CONTRACT_ADDRESSES.moonriver.pair_tokens["Sushi canFRAX/canFXS"],
	// 		CONTRACT_ADDRESSES.moonriver.pair_tokens["Sushi canFRAX/anyUSDC"],
    //         CONTRACT_ADDRESSES.moonriver.pair_tokens["Sushi canFRAX/MOVR"],
	// 		CONTRACT_ADDRESSES.moonriver.pair_tokens["Sushi canFXS/anyUSDC"],
	// 	]
    // );

    // console.log(chalk.yellow("========== CCFrax1to1AMM =========="));
    ccfrax_1to1_amm_instance = await CCFrax1to1AMM.new(
        THE_ACCOUNTS[1],
        THE_ACCOUNTS[10],
        cross_chain_canonical_frax_instance.address,
        combo_oracle_instance.address,
        cross_chain_bridge_backer_instance.address,
        [
            // CONTRACT_ADDRESSES.moonriver.collaterals.MIM,
            // CONTRACT_ADDRESSES.moonriver.collaterals.anyUSDC,
            CONTRACT_ADDRESSES.moonriver.collaterals.USDT,
        ],
        [
            // "100000000000000000000000",
            // "100000000000",
            "100000000000",
        ]
    );

    // ----------------------------------------------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [MULTISIG_ADDRESS]
    });    

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_MOON_AnySwap  =========='));
    // await cross_chain_bridge_backer_instance.addAMO(SushiSwapLiquidityAMO_MOON_instance.address, false, { from: MULTISIG_ADDRESS });
    await cross_chain_bridge_backer_instance.addAMO(ccfrax_1to1_amm_instance.address, false, { from: MULTISIG_ADDRESS });


    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [MULTISIG_ADDRESS]
    });

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    IanyFRAX.setAsDeployed(anyFRAX_instance);
    IanyFXS.setAsDeployed(anyFXS_instance);
    anyUSDC.setAsDeployed(anyUSDC_instance);
    CrossChainBridgeBacker_MOON_AnySwap.setAsDeployed(cross_chain_bridge_backer_instance);
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance);
    ComboOracle.setAsDeployed(combo_oracle_instance);
    ComboOracle_UniV2_UniV3.setAsDeployed(combo_oracle_univ2_univ3_instance);
    SushiSwapLiquidityAMO_MOON.setAsDeployed(SushiSwapLiquidityAMO_MOON_instance);
    CCFrax1to1AMM.setAsDeployed(ccfrax_1to1_amm_instance);
}