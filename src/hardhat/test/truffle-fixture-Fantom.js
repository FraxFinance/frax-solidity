const { ethers, upgrades } = require("hardhat");
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const { BIG6, BIG18, bigNumberify, expandTo18Decimals, sleep } = require('../test/Fraxswap/utilities');
const chalk = require('chalk');
const constants = require(path.join(__dirname, '../../../dist/types/constants'));

// Core
const IanyFRAX = artifacts.require("ERC20/__CROSSCHAIN/IanyFRAX");
const IanyFXS = artifacts.require("ERC20/__CROSSCHAIN/IanyFXS");
const CrossChainCanonicalFRAX = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX");
const CrossChainCanonicalFXS = artifacts.require("ERC20/__CROSSCHAIN/CrossChainCanonicalFXS");
const anyUSDC = artifacts.require("ERC20/__CROSSCHAIN/anyUSDC");

// FPI
const FPI = artifacts.require("FPI/FPI");
const FPIS = artifacts.require("FPI/FPIS");
const FPIControllerPool = artifacts.require("FPI/FPIControllerPool.sol");

// Bridges
const CrossChainBridgeBacker_FTM_AnySwap = artifacts.require("Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap");

// Oracles
const CPITrackerOracle = artifacts.require("Oracle/CPITrackerOracle");
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// Staking contracts
const FraxCrossChainFarm_FRAX_FXS_Spirit = artifacts.require("Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit");

// TWAMM
const UniV2TWAMMFactory = artifacts.require("Fraxswap/core/FraxswapFactory");
const UniV2TWAMMPair = artifacts.require("Fraxswap/core/FraxswapPair");
const UniV2TWAMMRouter = artifacts.require("Fraxswap/periphery/FraxswapRouter");

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

    // FPI
    let fpi_instance;
    let fpis_instance;
    let fpi_controller_pool_instance;

    // Bridges
    let cross_chain_bridge_backer_instance;

    // Oracles
    let cpi_tracker_oracle_instance;
    let cross_chain_oracle_instance;
    
	// Staking
    let staking_instance_frax_fxs_spirit;
    
    // TWAMM
    let fraxswap_factory_instance;
    let twamm_pair_instance;
    let fraxswap_router_instance;

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

    // FPI
    fpi_instance = await FPI.at(CONTRACT_ADDRESSES.fantom.canonicals.FPI);
    fpis_instance = await FPIS.at(CONTRACT_ADDRESSES.fantom.canonicals.FPIS);
    // fpi_controller_pool_instance = await FPIControllerPool.at(CONTRACT_ADDRESSES.fantom.amos.fpi_controller_amo);

    // Bridges
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_FTM_AnySwap.at(CONTRACT_ADDRESSES.fantom.bridge_backers.anySwap);

    // Oracles
    cpi_tracker_oracle_instance = await CPITrackerOracle.at(CONTRACT_ADDRESSES.fantom.oracles_other.cpi_tracker_oracle); 
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.fantom.oracles.cross_chain_oracle); 
    
    // Staking
    staking_instance_frax_fxs_spirit = await FraxCrossChainFarm_FRAX_FXS_Spirit.at(CONTRACT_ADDRESSES.fantom.staking_contracts["SpiritSwap FRAX/FXS"]);

    // TWAMM
    // fraxswap_factory_instance = await UniV2TWAMMFactory.at(CONTRACT_ADDRESSES.fantom.uniswap.fraxswap_factory);
    // twamm_pair_instance = await UniV2TWAMMPair.at(CONTRACT_ADDRESSES.fantom.pair_tokens["Fraxswap FRAX/FPI"]);
    // fraxswap_router_instance = await UniV2TWAMMRouter.at(CONTRACT_ADDRESSES.fantom.uniswap.fraxswap_router);

    // AMOs
    // fpi_controller_pool_instance = await FPIControllerPool.at(CONTRACT_ADDRESSES.fantom.amos.fpi_controller_amo);
    spiritSwapLiquidityAMO_instance = await SpiritSwapLiquidityAMO.at(CONTRACT_ADDRESSES.fantom.amos.spiritswap_liquidity);
    scream_amo_instance = await ScreamAMO.at(CONTRACT_ADDRESSES.fantom.amos.scream);
    // curve_amo_ftm_instance = await CurveAMO_FTM.at(CONTRACT_ADDRESSES.fantom.amos.curve);

    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    console.log(chalk.yellow("========== FraxswapFactory =========="));
    fraxswap_factory_instance = await UniV2TWAMMFactory.new( 
        THE_ACCOUNTS[1],
    );

    console.log(chalk.yellow("========== FraxswapRouter =========="));
    fraxswap_router_instance = await UniV2TWAMMRouter.new( 
        fraxswap_factory_instance.address,
        CONTRACT_ADDRESSES.fantom.reward_tokens.wftm
    );

    console.log(chalk.yellow("========== CPITrackerOracle =========="));
    cpi_tracker_oracle_instance = await CPITrackerOracle.new( 
        THE_ACCOUNTS[1],
        "0x0000000000000000000000000000000000000000"
    );

    // Create the FRAX/FPI LP Pair
    const seed_amt = BIG18;
    await fpi_instance.approve(fraxswap_router_instance.address, seed_amt, { from: THE_ACCOUNTS[1] });
    await cross_chain_canonical_frax_instance.approve(fraxswap_router_instance.address, seed_amt, { from: THE_ACCOUNTS[1] });
    await fraxswap_router_instance.addLiquidity(
        fpi_instance.address, 
        cross_chain_canonical_frax_instance.address, 
        seed_amt, 
        seed_amt, 
        0, 
        0, 
        THE_ACCOUNTS[1], 
        1999999999
    , { from: THE_ACCOUNTS[1] });

    console.log(chalk.yellow("========== FraxswapPair =========="));
    const lpAddress = await fraxswap_factory_instance.getPair(fpi_instance.address, cross_chain_canonical_frax_instance.address);
    console.log("FRAX/FPI LP deployed to: ", lpAddress)
    twamm_pair_instance = await UniV2TWAMMPair.at(lpAddress);

    console.log(chalk.yellow("========== FPIControllerPool =========="));
    fpi_controller_pool_instance = await FPIControllerPool.new( 
        THE_ACCOUNTS[1], 
        "0x0000000000000000000000000000000000000000",
        [
            cross_chain_canonical_frax_instance.address,
            fpi_instance.address,
            lpAddress,
            "0xBaC409D670d996Ef852056f6d45eCA41A8D57FbD", // fantom CHAINLINK FRAX
            "0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c", // fantom CHAINLINK USDC [PLACEHOLDER UNTIL FPI ORACLE IS UP]
            cpi_tracker_oracle_instance.address,
        ]
    );

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

    console.log(chalk.yellow('========== WHITELIST AMOS FOR CrossChainBridgeBacker_FTM_AnySwap =========='));
    // await cross_chain_bridge_backer_instance.addAMO(scream_amo_instance.address, false, { from: process.env.FANTOM_ONE_ADDRESS });
    // await cross_chain_bridge_backer_instance.addAMO(spiritSwapLiquidityAMO_instance.address, false, { from: process.env.FANTOM_ONE_ADDRESS });
    // await cross_chain_bridge_backer_instance.addAMO(curve_amo_ftm_instance.address, false, { from: process.env.FANTOM_ONE_ADDRESS });

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [process.env.FANTOM_ONE_ADDRESS]
    });


    // ----------------------------------------------
    console.log(chalk.yellow('========== DEPLOY CONTRACTS =========='));

    console.log(chalk.yellow("--------DEPLOYING CORE CONTRACTS--------"));
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    IanyFRAX.setAsDeployed(anyFRAX_instance);
    IanyFXS.setAsDeployed(anyFXS_instance);
    anyUSDC.setAsDeployed(anyUSDC_instance);

    console.log(chalk.yellow("--------DEPLOYING FPI CONTRACTS--------"));
    FPI.setAsDeployed(fpi_instance);
    FPIS.setAsDeployed(fpis_instance);
    FPIControllerPool.setAsDeployed(fpi_controller_pool_instance);

    console.log(chalk.yellow("--------DEPLOYING BRIDGE CONTRACTS--------"));
    CrossChainBridgeBacker_FTM_AnySwap.setAsDeployed(cross_chain_bridge_backer_instance);

    console.log(chalk.yellow("--------DEPLOYING ORACLE CONTRACTS--------"));
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance);
    CPITrackerOracle.setAsDeployed(cpi_tracker_oracle_instance);

    console.log(chalk.yellow("--------DEPLOYING STAKING CONTRACTS--------"));
    FraxCrossChainFarm_FRAX_FXS_Spirit.setAsDeployed(staking_instance_frax_fxs_spirit);

    console.log(chalk.yellow("--------DEPLOYING TWAMM CONTRACTS--------"));
    UniV2TWAMMFactory.setAsDeployed(fraxswap_factory_instance);
    UniV2TWAMMPair.setAsDeployed(twamm_pair_instance);
    UniV2TWAMMRouter.setAsDeployed(fraxswap_router_instance);

    console.log(chalk.yellow("--------DEPLOYING AMO CONTRACTS--------"));
    CurveAMO_FTM.setAsDeployed(curve_amo_ftm_instance);
    FPIControllerPool.setAsDeployed(fpi_controller_pool_instance);
    ScreamAMO.setAsDeployed(scream_amo_instance);
    SpiritSwapLiquidityAMO.setAsDeployed(spiritSwapLiquidityAMO_instance);

    console.log(chalk.yellow("--------DEPLOYING MISC CONTRACTS--------"));

}