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
const CrossChainBridgeBacker_BSC_AnySwap = artifacts.require("Bridges/BSC/CrossChainBridgeBacker_BSC_AnySwap");

// Oracles
const CrossChainOracle = artifacts.require("Oracle/CrossChainOracle");

// AMOs
const ApeSwapLiquidityAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/BSC/ApeSwapLiquidityAMO.sol");
const PlanetFinanceLendingAMO = artifacts.require("Misc_AMOs/__CROSSCHAIN/BSC/PlanetFinanceLendingAMO.sol");

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
    let apeswap_liquidity_amo_instance;
    let planet_finance_lending_amo_instance;

    // Assign live contract addresses
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

    // Core
    anyFRAX_instance = await IanyFRAX.at(CONTRACT_ADDRESSES.bsc.bridge_tokens.anyFRAX);
    anyFXS_instance = await IanyFXS.at(CONTRACT_ADDRESSES.bsc.bridge_tokens.anyFXS);
    cross_chain_canonical_frax_instance = await CrossChainCanonicalFRAX.at(CONTRACT_ADDRESSES.bsc.canonicals.FRAX);
    cross_chain_canonical_fxs_instance = await CrossChainCanonicalFXS.at(CONTRACT_ADDRESSES.bsc.canonicals.FXS);

    // Bridges
    cross_chain_bridge_backer_instance = await CrossChainBridgeBacker_BSC_AnySwap.at(CONTRACT_ADDRESSES.bsc.bridge_backers.anySwap);

    // Oracles
    cross_chain_oracle_instance = await CrossChainOracle.at(CONTRACT_ADDRESSES.bsc.oracles.cross_chain_oracle); 
    
    // Staking

    // AMOs
    // apeswap_liquidity_amo_instance = await ApeSwapLiquidityAMO.at(CONTRACT_ADDRESSES.bsc.amos.apeswap_liquidity);
    // planet_finance_lending_amo_instance = await PlanetFinanceLendingAMO.at(CONTRACT_ADDRESSES.bsc.amos.planet_finance_lending);


    // ANY NEW CONTRACTS, PUT BELOW HERE
    // .new() calls and deployments
    // ==========================================================================

    // // MigratableFarmBSC_FRAX_FXS
    // console.log(chalk.yellow('========== MigratableFarmBSC_FRAX_FXS =========='));
    // migratableFarmBSC_FRAX_FXS_instance = await MigratableFarmBSC_FRAX_FXS.new(
	// 	THE_ACCOUNTS[6], 
	// 	CONTRACT_ADDRESSES.bsc.main.FXS, 
	// 	CONTRACT_ADDRESSES.bsc.reward_tokens.CAKE, 
	// 	CONTRACT_ADDRESSES.bsc.pair_tokens['Impossible FRAX/IF'], 
	// 	THE_ACCOUNTS[1]
    // );

    // // FraxFarmBSC_Dual_FRAX_IF_instance
    // console.log(chalk.yellow('========== FraxFarmBSC_Dual_FRAX_IF_instance =========='));
    // fraxFarmBSC_Dual_FRAX_IF_instance = await FraxFarmBSC_Dual_FRAX_IF.new(
	// 	THE_ACCOUNTS[6], 
	// 	CONTRACT_ADDRESSES.bsc.main.FXS, 
	// 	CONTRACT_ADDRESSES.bsc.reward_tokens.IF, 
	// 	CONTRACT_ADDRESSES.bsc.pair_tokens['Impossible FRAX/IF'], 
	// 	THE_ACCOUNTS[1]
    // );

    console.log(chalk.yellow("========== ApeSwapLiquidityAMO =========="));
    apeswap_liquidity_amo_instance = await ApeSwapLiquidityAMO.new(
        THE_ACCOUNTS[1],
        THE_ACCOUNTS[10],
        cross_chain_canonical_frax_instance.address,
        cross_chain_canonical_fxs_instance.address,
        CONTRACT_ADDRESSES.bsc.collaterals.USDC,
        cross_chain_bridge_backer_instance.address,
        [
			CONTRACT_ADDRESSES.bsc.pair_tokens["ApeSwap canFRAX/canFXS"],
            CONTRACT_ADDRESSES.bsc.pair_tokens["ApeSwap canFRAX/WBNB"],
			CONTRACT_ADDRESSES.bsc.pair_tokens["ApeSwap canFRAX/USDC"],
			CONTRACT_ADDRESSES.bsc.pair_tokens["ApeSwap canFXS/USDC"],
		]
    );

    // ----------------------------------------------
    CrossChainCanonicalFRAX.setAsDeployed(cross_chain_canonical_frax_instance);
    CrossChainCanonicalFXS.setAsDeployed(cross_chain_canonical_fxs_instance);
    IanyFRAX.setAsDeployed(anyFRAX_instance);
    IanyFXS.setAsDeployed(anyFXS_instance);
    CrossChainBridgeBacker_FTM_AnySwap.setAsDeployed(cross_chain_bridge_backer_instance)
    CrossChainOracle.setAsDeployed(cross_chain_oracle_instance)
    PlanetFinanceLendingAMO.setAsDeployed(planet_finance_lending_amo_instance);
    ApeSwapLiquidityAMO.setAsDeployed(apeswap_liquidity_amo_instance);
}