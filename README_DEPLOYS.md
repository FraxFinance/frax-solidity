## FORGE
**------Deploying------**

Evmos
```source .env && forge script ./src/foundry/deploy/deployEvmosToEthFraxferry.s.sol:Deploy --rpc-url $EVMOS_NETWORK_ENDPOINT --private-key $MAINTENANCE_PRIVATE_KEY --broadcast```

## HARDHAT
**---Deploying---**
cd ./src/hardhat


**---Gnosis Safe Stuff---**
npx hardhat run --network ethereum gnosis-safe-scripts/Frax_Comptroller_Routine/Sunday_Part_1.js
npx hardhat run --network ethereum gnosis-safe-scripts/Convex_Farm_Deployments/Step_1_Vault_Gauge_Proxy.js
npx hardhat run --network ethereum gnosis-safe-scripts/Convex_Farm_Deployments/Step_2_CRVCVXDistro_Contracts.js
npx hardhat run --network ethereum gnosis-safe-scripts/Convex_Farm_Deployments/Step_3_RewDist_Seeding_Sync.js
npx hardhat run --network bsc gnosis-safe-scripts/Bribe_Related/BSC/Reward_Collections.js

ARBITRUM
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_amo_minter.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_CrossChainBridgeBacker.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_CrossChainCanonicals.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_CrossChainOracle.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_CurveAMO_ARBI.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_FraxCrossChainFarm.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_HundredLendingAMO.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_SushiSwapLiquidityAMO_ARBI.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_combo_oracle.js
npx hardhat run --network arbitrum scripts/__ARBITRUM/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network arbitrum scripts/deploys/deploy_fraxswap.js

AURORA
npx hardhat run --network aurora scripts/__AURORA/deploy_CrossChainBridgeBacker.js
npx hardhat run --network aurora scripts/__AURORA/deploy_CrossChainCanonicals.js
npx hardhat run --network aurora scripts/__AURORA/deploy_CrossChainOracle.js
npx hardhat run --network aurora scripts/__AURORA/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network aurora scripts/__AURORA/deploy_combo_oracle.js
npx hardhat run --network aurora scripts/__AURORA/deploy_combo_oracle_univ2_univ3.js

AVALANCHE
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_AxialAMO.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_CrossChainBridgeBacker.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_CrossChainCanonicals.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_CrossChainOracle.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_FraxCrossChainFarm.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_FraxCrossChainRewarder.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_PangolinLiquidityAMO.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_combo_oracle.js
npx hardhat run --network avalanche scripts/__AVALANCHE/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network avalanche scripts/deploys/deploy_fraxswap.js

BOBA
npx hardhat run --network boba scripts/__BOBA/deploy_CrossChainBridgeBacker.js
npx hardhat run --network boba scripts/__BOBA/deploy_CrossChainCanonicals.js
npx hardhat run --network boba scripts/__BOBA/deploy_CrossChainOracle.js
npx hardhat run --network boba scripts/__BOBA/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network boba scripts/__BOBA/deploy_OolongSwapLiquidityAMO.js
npx hardhat run --network boba scripts/__BOBA/deploy_combo_oracle.js
npx hardhat run --network boba scripts/__BOBA/deploy_combo_oracle_univ2_univ3.js

BSC
npx hardhat run --network bsc scripts/__BSC/deploy_ApeSwapLiquidityAMO.js
npx hardhat run --network bsc scripts/__BSC/deploy_CrossChainBridgeBacker.js
npx hardhat run --network bsc scripts/__BSC/deploy_CrossChainCanonicals.js
npx hardhat run --network bsc scripts/__BSC/deploy_CrossChainOracle.js
npx hardhat run --network bsc scripts/__BSC/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network bsc scripts/__BSC/deploy_FraxCrossChainFarm.js
npx hardhat run --network bsc scripts/__BSC/deploy_FraxFarmBSC_Dual_FRAX_IF.js
npx hardhat run --network bsc scripts/__BSC/deploy_combo_oracle.js
npx hardhat run --network bsc scripts/__BSC/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network bsc scripts/__BSC/deploy_migratable_farm.js
npx hardhat run --network bsc scripts/deploys/deploy_fraxswap.js

ETHEREUM
npx hardhat run --network ethereum scripts/deploys/deploy_FPI_and_FPIS.js
npx hardhat run --network ethereum scripts/deploys/deploy_FraxLiquidityBridger_XYZ.js
npx hardhat run --network ethereum scripts/deploys/deploy_FraxPoolV3.js
npx hardhat run --network ethereum scripts/deploys/deploy_UniV3Farm.js
npx hardhat run --network ethereum scripts/deploys/deploy_aave_AMO.js
npx hardhat run --network ethereum scripts/deploys/deploy_amo_minter.js
npx hardhat run --network ethereum scripts/deploys/deploy_combo_oracle.js
npx hardhat run --network ethereum scripts/deploys/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network ethereum scripts/deploys/deploy_curve_voter_proxy.js
npx hardhat run --network ethereum scripts/deploys/deploy_cpi_tracker_oracle.js
npx hardhat run --network ethereum scripts/deploys/deploy_curve_metapool_locker.js
npx hardhat run --network ethereum scripts/deploys/deploy_delegation_proxy.js
npx hardhat run --network ethereum scripts/deploys/deploy_dual_token_contract_v2.js
npx hardhat run --network ethereum scripts/deploys/deploy_fraxfarm_ragequitter.js
npx hardhat run --network ethereum scripts/deploys/deploy_fraxferry_crosschain_one_side.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_gauge_controller.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_middleman_gauge.js
npx hardhat run --network ethereum scripts/deploys/deploy_fraxswapRouterMultihop.js
npx hardhat run --network ethereum scripts/deploys/deploy_fraxswap.js
npx hardhat run --network ethereum scripts/deploys/deploy_fxs_1559_amo_v3.js
npx hardhat run --network ethereum scripts/deploys/deploy_gauge_rewards_distributor.js
npx hardhat run --network ethereum scripts/deploys/deploy_manual_token_tracker.js
npx hardhat run --network ethereum scripts/deploys/deploy_mim_amo.js
npx hardhat run --network ethereum scripts/deploys/deploy_multicall_oz.js
npx hardhat run --network ethereum scripts/deploys/deploy_msig_helper.js
npx hardhat run --network ethereum scripts/deploys/deploy_oracle_extra.js
npx hardhat run --network ethereum scripts/deploys/deploy_oracle_wrappers.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_convex_fraxbp.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_convex_frxeth.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_convex_fxbs.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_convex_generic.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_convex_ngs.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_factory_convex.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_fraxlend.js
npx hardhat run --network ethereum scripts/deploys/deploy_frax_unified_farms_kyberswap_elastic.js
npx hardhat run --network ethereum scripts/deploys/deploy_staking_rewards_multi_gauge.js
npx hardhat run --network ethereum scripts/deploys/deploy_token_tracker.js
npx hardhat run --network ethereum scripts/deploys/deploy_twamm_amo.js
npx hardhat run --network ethereum scripts/deploys/deploy_univ3_liquidity_amo.js
npx hardhat run --network ethereum scripts/deploys/deploy_univ3_twap_oracle.js
npx hardhat run --network ethereum scripts/deploys/deploy_veFPIS.js
npx hardhat run --network ethereum scripts/deploys/deploy_veFPISYieldDistributor.js
npx hardhat run --network ethereum scripts/deploys/deploy_veFXSYieldDistributor.js
npx hardhat run --network ethereum scripts/deploys/deploy_voting_escrow_delegation.js
npx hardhat run --network ethereum scripts/deploys/l1veFXS_proof_collector.js
npx hardhat run --network ethereum scripts/deploys/mass_contract_caller.js
npx hardhat run --network ethereum scripts/deploys/manual_farming_syncer.js
npx hardhat run --network ethereum scripts/deploys/miscellaneous_call.js
npx hardhat run --no-compile --network ethereum scripts/deploys/matic_polygon_recovery.mjs

EVMOS
npx hardhat run --network evmos scripts/__EVMOS/deploy_CrossChainBridgeBacker.js
npx hardhat run --network evmos scripts/__EVMOS/deploy_CrossChainCanonicals.js
npx hardhat run --network evmos scripts/__EVMOS/deploy_CrossChainOracle.js
npx hardhat run --network evmos scripts/__EVMOS/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network evmos scripts/__EVMOS/deploy_combo_oracle.js
npx hardhat run --network evmos scripts/__EVMOS/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network evmos scripts/__EVMOS/deploy_Evmos_Fraxferry.js

FANTOM
npx hardhat run --network fantom scripts/__FANTOM/deploy_CrossChainBridgeBacker.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_CrossChainCanonicals.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_CrossChainOracle.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_CurveAMO_FTM.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_FraxCrossChainFarm.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_FraxCrossChainRewarder.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_ScreamAMO.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_SolidlySingleLPOracle.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_SpiritSwapLiquidityAMO.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_combo_oracle.js
npx hardhat run --network fantom scripts/__FANTOM/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network fantom scripts/deploys/deploy_fraxswap.js

FRAXCHAIN DEVNET L1
npx hardhat run --network fraxchain_devnet_l1 scripts/__FRAXCHAIN_DEVNET_L1/deploy_CrossChainCanonicals.js
npx hardhat run --network fraxchain_devnet_l1 scripts/__FRAXCHAIN_DEVNET_L1/deploy_FraxchainPortal.js

FRAXCHAIN DEVNET L2
npx hardhat run --network fraxchain_devnet_l2 scripts/__FRAXCHAIN_DEVNET_L2/deploy_CrossChainCanonicals.js

FRAXTAL
npx hardhat run --network fraxtal scripts/deploys/deploy_fraxferry_crosschain_one_side.js
npx hardhat run --network fraxtal scripts/deploys/fraxtal_yield_distributor_mass_checkpointer.js
npx hardhat run --network fraxtal scripts/__FRAXTAL/deploy_FraxCrossChainFarm.js

HARMONY
npx hardhat run --network harmony scripts/__HARMONY/deploy_CrossChainBridgeBacker.js
npx hardhat run --network harmony scripts/__HARMONY/deploy_CrossChainCanonicals.js
npx hardhat run --network harmony scripts/__HARMONY/deploy_CrossChainOracle.js
npx hardhat run --network harmony scripts/__HARMONY/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network harmony scripts/__HARMONY/deploy_combo_oracle.js
npx hardhat run --network harmony scripts/__HARMONY/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network harmony scripts/deploys/deploy_fraxswap.js

HOLESKY
npx hardhat run --network holesky scripts/__HOLESKY/deploy_frxETHMinter.js
npx hardhat run --network holesky scripts/__HOLESKY/deploy_MainERC20s.js

MOONBEAM
npx hardhat run --network moonbeam scripts/__MOONBEAM/deploy_CrossChainBridgeBacker.js
npx hardhat run --network moonbeam scripts/__MOONBEAM/deploy_CrossChainCanonicals.js
npx hardhat run --network moonbeam scripts/__MOONBEAM/deploy_CrossChainOracle.js
npx hardhat run --network moonbeam scripts/__MOONBEAM/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network moonbeam scripts/__MOONBEAM/deploy_combo_oracle.js
npx hardhat run --network moonbeam scripts/__MOONBEAM/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network moonbeam scripts/deploys/deploy_fraxswap.js

MOONRIVER
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_CCFrax1to1AMM.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_CrossChainBridgeBacker.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_CrossChainCanonicals.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_CrossChainOracle.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_SushiSwapLiquidityAMO_MOON.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_combo_oracle.js
npx hardhat run --network moonriver scripts/__MOONRIVER/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network moonriver scripts/deploys/deploy_fraxswap.js

OPTIMISM
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_CrossChainBridgeBacker.js
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_CrossChainCanonicals.js
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_CrossChainOracle.js
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_combo_oracle.js
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network optimism scripts/__OPTIMISM/deploy_FraxCrossChainFarm.js

POLYGON
npx hardhat run --network polygon scripts/__POLYGON/deploy_CrossChainBridgeBacker.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_CrossChainCanonicals.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_CrossChainOracle.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_CrossChainOracleSingleAsset.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_CurveAMO_POLY.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_FraxCrossChainFarm.js
npx hardhat run --network polygon scripts/deploys/deploy_fraxfarm_ragequitter.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_MarketXYZLendingAMO.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_SolidlySingleLPOracle.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_SushiSwapLiquidityAMO_POLY.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_combo_oracle.js
npx hardhat run --network polygon scripts/__POLYGON/deploy_combo_oracle_univ2_univ3.js
npx hardhat run --network polygon scripts/deploys/deploy_fraxferry_crosschain_one_side.js
npx hardhat run --network polygon scripts/deploys/deploy_fraxswap.js

POLYGON ZKEVM
npx hardhat run --network polygon_zkevm scripts/__POLYGON_ZKEVM/deploy_CrossChainCanonicals.js
npx hardhat run --network polygon_zkevm scripts/deploys/deploy_fraxferry_crosschain_one_side.js

POLYGON MUMBAI
npx hardhat run --network polygon_mumbai scripts/deploys/deploy_cpi_tracker_oracle.js

ZKSYNC
npx hardhat run --network zksync scripts/__ZKSYNC/deploy_CrossChainCanonicals.js


**---Verifying---**
cd ./src/hardhat
npx hardhat verify --network ethereum 0x35302f77e5bd7a93cbec05d585e414e14b2a84a8 
npx hardhat verify --network ethereum 0xc0dC493cE1b5908Dd95b768c397dD581Ef4FCAEb "Constructor argument 1"
may need to use truffle: copy paste the contracts and compile
truffle run verify StakingRewardsDual_FRAX_FXS_Sushi@0x35302f77E5Bd7A93cbec05d585e414e14B2A84a8 --network ethereum --debug
truffle run verify StakingRewardsDual_FRAX3CRV@0xB88107bFB7aa9b6A5eC8784374018073e76d4DF0 --network ethereum --debug

npx hardhat verify --network ethereum --contract contracts/Staking/Variants/FraxUniV3Farm_Stable_FRAX_USDC.sol:FraxUniV3Farm_Stable_FRAX_USDC --constructor-args ./scripts/deploys/arguments/UniV3Farm_arguments.js 0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0
npx hardhat verify --network ethereum --contract contracts/Staking/Variants/FraxUniV3Farm_Stable_FRAX_DAI.sol:FraxUniV3Farm_Stable_FRAX_DAI --constructor-args ./scripts/deploys/arguments/UniV3Farm_arguments.js 0x4E3EdfE5ADD243154f1A3C49b15968EF9e0AE6ca
npx hardhat verify --network ethereum --contract contracts/Curve/IFraxGaugeFXSRewardsDistributor.sol:FraxGaugeFXSRewardsDistributor --constructor-args ./scripts/deploys/arguments/frax_gauge_rewards_distributor_arguments.js 0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34
npx hardhat verify --network ethereum --contract contracts/Curve/Middleman_Gauges/FraxMiddlemanGauge_FRAX_mUSD.sol:FraxMiddlemanGauge_FRAX_mUSD --constructor-args ./scripts/deploys/arguments/frax_middleman_gauge_arguments.js 0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC
npx hardhat verify --network ethereum --contract contracts/Curve/FraxMiddlemanGauge.sol:FraxMiddlemanGauge --constructor-args ./scripts/deploys/arguments/frax_middleman_gauge_arguments.js 0x66fD216bCBeb566EF038A116B7270f241005e186
npx hardhat verify --network ethereum --contract contracts/Staking/Variants/StakingRewardsMultiGauge_FRAX_SUSHI.sol:StakingRewardsMultiGauge_FRAX_SUSHI --constructor-args ./scripts/deploys/arguments/staking_rewards_multi_gauge_arguments.js 0xb4Ab0dE6581FBD3A02cF8f9f265138691c3A7d5D
npx hardhat verify --network ethereum --contract contracts/Curve/IFraxGaugeController.vy:FraxGaugeController --constructor-args ./scripts/deploys/arguments/frax_gauge_controller_arguments.js 0x44ade9AA409B0C29463fF7fcf07c9d3c939166ce
npx hardhat verify --network ethereum --contract contracts/Misc_AMOs/RariFuseLendingAMO_V2.sol:RariFuseLendingAMO_V2 --constructor-args ./scripts/deploys/arguments/rari_amo_arguments.js 0x843df6229C1B8fc41c1D74bcddC7E17788ddb0A2
npx hardhat verify --network ethereum --contract contracts/Misc_AMOs/UniV3LiquidityAMO.sol:UniV3LiquidityAMO --constructor-args ./scripts/deploys/arguments/univ3_liquidity_amo_arguments.js 0xef2b0895f986Afd7Eb7939B65E2883C5e199751f
npx hardhat verify --network ethereum --contract contracts/Frax/Pools/FraxPoolV3.sol:FraxPoolV3 --constructor-args ./scripts/deploys/arguments/frax_pool_v3_arguments.js 0x80c72d42846EFf15Cb1BDEE8FeC9A57594F17960
npx hardhat verify --network ethereum --contract contracts/Frax/FraxAMOMinter.sol:FraxAMOMinter --constructor-args ./scripts/deploys/arguments/amo_minter_arguments.js 0x36a0B6a5F7b318A2B4Af75FFFb1b51a5C78dEB8C
npx hardhat verify --network ethereum --contract contracts/Misc_AMOs/CurveMetapoolLockerAMO.sol:CurveMetapoolLockerAMO --constructor-args ./scripts/deploys/arguments/curve_metapool_locker_arguments.js 0x70F55767B11c047C8397285E852919F5f6c8DC60

npx hardhat verify --network ethereum 0x97e7d56A0408570bA1a7852De36350f7713906ec 

BSC
npx hardhat verify --network bsc --contract contracts/__BSC/Staking/Variants/FraxFarmBSC_Dual_FRAX_IF.sol:FraxFarmBSC_Dual_FRAX_IF --constructor-args ./scripts/deploys/arguments/fraxfarm_bsc_dual_frax_if_arguments.js 0x45dD6e5f65A5a526c09A50D612e3516ed6AB47d2
npx hardhat verify --network bsc --contract contracts/Staking/Variants/FraxCrossChainFarm_FRAX_IF_Impossible.sol:FraxCrossChainFarm_FRAX_IF_Impossible --constructor-args ./scripts/deploys/arguments/frax_cross_chain_farm.js 0x5e1F728C0123f7e8B237F61D0105bf9CBd8867B5

POLYGON
npx hardhat verify --network polygon --contract contracts/Staking/Variants/FraxCrossChainFarm_FRAX_mUSD.sol:FraxCrossChainFarm_FRAX_mUSD --constructor-args ./scripts/deploys/arguments/frax_cross_chain_farm.js 0xCc112B11bDd419859FbA88d842CEE660C1Ee277d

npx hardhat verify --network polygon --contract contracts/Staking/FraxCrossChainFarmSushi.sol:FraxCrossChainFarmSushi --constructor-args ./scripts/deploys/arguments/frax_cross_chain_farm.js 0xc9C731aa0fA61Cfe6D32508CCA932e2715bCaE00

FANTOM
npx hardhat verify --network fantom --contract contracts/Curve/FraxCrossChainRewarder.sol:FraxCrossChainRewarder --constructor-args ./scripts/deploys/arguments/frax_cross_chain_rewarder.js 0xebF993690F65B23862E10F489656529ac06A27B8
npx hardhat verify --network fantom --contract contracts/Staking/Variants/FraxCrossChainFarm_FRAX_FXS_Spirit.sol:FraxCrossChainFarm_FRAX_FXS_Spirit --constructor-args ./scripts/deploys/arguments/frax_cross_chain_farm.js 0x365fb1636316EB7DC298b8dC1F2ca0bB2F7C51A9
npx hardhat verify --network fantom --contract contracts/Frax/CrossChainCanonical.sol:CrossChainCanonical --constructor-args ./scripts/deploys/arguments/cross_chain_canonical_arguments.js 0x8E81F4DA11Dad4427CD4D106Fab77873DDC94d00

**---Flat File Compiling (Used as a backup for manual source code verification)---**
cd ./src/hardhat
<!-- npx hardhat flatten ./contracts/Bridges/Arbitrum/CrossChainBridgeBacker_ARBI_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Aurora/CrossChainBridgeBacker_AUR_Rainbow.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Aurora/FraxLiquidityBridger_AUR_Rainbow.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Avalanche/CrossChainBridgeBacker_AVAX_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Avalanche/FraxLiquidityBridger_AVAX_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/BSC/CrossChainBridgeBacker_BSC_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/BSC/FraxLiquidityBridger_BSC_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Boba/CrossChainBridgeBacker_BOBA_BobaGateway.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Boba/FraxLiquidityBridger_BOBA_BobaGateway.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Evmos/CrossChainBridgeBacker_EVMOS_Nomad.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Evmos/FraxLiquidityBridger_EVMOS_Nomad.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Fantom/FraxLiquidityBridger_FTM_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Fraxchain/FraxchainPortal.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Fraxchain/FraxchainFrxEthMinter.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Harmony/CrossChainBridgeBacker_HARM_Celer.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Harmony/CrossChainBridgeBacker_HARM_Horizon.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Harmony/FraxLiquidityBridger_HARM_Celer.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Moonbeam/CrossChainBridgeBacker_MNBM_Nomad.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Moonbeam/FraxLiquidityBridger_MNBM_Nomad.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Moonriver/CrossChainBridgeBacker_MOON_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Moonriver/FraxLiquidityBridger_MOON_AnySwap.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Optimism/CrossChainBridgeBacker_OPTI_Celer.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Optimism/FraxLiquidityBridger_OPTI_Celer.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Polygon/CrossChainBridgeBacker_POLY_MaticBridge.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Polygon/FraxLiquidityBridger_POLY_MaticBridge.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Bridges/Solana/FraxLiquidityBridger_SOL_WormholeV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/CurveVoterProxy.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/FraxMiddlemanGaugeFerryHelper.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/FraxMiddlemanGaugeV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/FraxMiddlemanGaugeV3.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/Middleman_Gauges/FraxMiddlemanGauge_ARBI_Curve_VSTFRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/NoopRewardsDistributor.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Curve/SmartWalletWhitelist.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/ERC20PermissionedMint.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/ERC20PermitPermissionedMint.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/__CROSSCHAIN/CrossChainCanonicalFXS.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/__CROSSCHAIN/CrossChainCanonicalV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/__CROSSCHAIN/CrossChainCanonicalV2OptiMintable.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/ERC20/wfrxETH.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/FraxETH/sfrxETH.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/FPI/FPI.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/FPI/FPIControllerPool.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/FPI/FPIS.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Frax/FraxAMOMinter.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Frax/FraxAMOMinterLayer2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Fraxferry/DummyToken.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Fraxferry/Fraxferry.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Fraxswap/core/FraxswapFactory.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Fraxswap/core/FraxswapPair.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Fraxswap/periphery/FraxswapRouter.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Fraxswap/periphery/FraxswapRouterMultihop.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Math/BokkyPooBahsDateTimeContract.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/FXS1559_AMO_V3.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/TWAMM_AMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/MIM_Convex_AMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/MSIGHelper.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/ManualTokenTrackerAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/TokenTrackerAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/TokenTrackerV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Arbitrum/CurveAMO_ARBI.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Arbitrum/HundredLendingAMO_ARBI.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Arbitrum/SushiSwapLiquidityAMO_ARBI.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Avalanche/AxialAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Avalanche/PangolinLiquidityAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/BSC/ApeSwapLiquidityAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Boba/OolongSwapLiquidityAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Fantom/CurveAMO_FTM.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Fantom/ScreamAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Fantom/SpiritOlaLendingAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Fantom/SpiritSwapLiquidityAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Moonriver/CCFrax1to1AMM.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Moonriver/SushiSwapLiquidityAMO_MOON.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Polygon/CurveAMO_POLY.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Polygon/MarketXYZLendingAMO.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Misc_AMOs/__CROSSCHAIN/Polygon/SushiSwapLiquidityAMO_POLY.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/CPITrackerOracle.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/ComboOracle.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/ComboOracle_KyberSwapElastic.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/ComboOracle_KyberSwapElasticV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/ComboOracle_UniV2_UniV3.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/CrossChainOracle.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/CrossChainOracleSingleAsset.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/CrossChainOracleSingleAssetV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/SolidlySingleLPOracle.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/UniV3TWAPOracle.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Oracle/Variants/UniswapPairOracleExtra_SDT_WETH.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FLETwammGauge.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxFarmRageQuitter_Gelato_FRAX_DAI.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxFarmRageQuitter_mStable.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxFarmRageQuitter_Saddle_L2D4.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxFarmRageQuitter_StakeDAO_FraxPut.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxFarmRageQuitter_Temple.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxFarmRageQuitter_VSTFRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/FraxCrossChainFarmV3_ERC20.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxCCFarmV2_ArbiCurveVSTFRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxCCFarmV3_ArbiSaddleL2D4.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxCCFarmV4_cvxLP.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUniV3Farm_Stable_FRAX_agEUR.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_FRAXBP_Stable.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_FRAXBP_Stable_Factory.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_FRAXBP_Volatile.sol > ./flattened.sol --
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_frxETH.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_Generic.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_stkcvxFPIFRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Convex_stkcvxFRAXBP.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_FraxswapV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxlend.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_FXS.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_FPIS.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_pitchFXS.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_OHM.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_ZZ.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_SDL.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Fraxswap_FRAX_SYN.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_KyberSwapElasticV2.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Other.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Other_Oracled.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Temple_FRAX_TEMPLE.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_ERC20_Vesper_Orbit_FRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/FraxUnifiedFarm_PosRebase_aFRAX.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/Variants/StakingRewardsMultiGauge_StakeDAO_FRAX_Put.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/veFXSYieldDistributorV4.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Staking/veFPISYieldDistributorV5.sol > ./flattened.sol -->
<!-- npx hardhat flatten ./contracts/Utils/Multicall_Oz.sol > ./flattened.sol -->
sed -i '/SPDX-License-Identifier/d' ./flattened.sol &&
sed -i '/pragma solidity/d' ./flattened.sol &&
sed -i '1s/^/\/\/ SPDX-License-Identifier: GPL-2.0-or-later\npragma solidity >=0.8.0;\n\n/' flattened.sol 
OPTIONAL [REMOVE "//" COMMENTS]: sed -i -E 's:(\s+(//|#)|^\s*(//|#)).*$::; /^$/d' flattened.sol
OPTIONAL [REMOVE "/*" COMMENTS]: sed -i -r ':a; s%(.*)/\*.*\*/%\1%; ta; /\/\*/ !b; N; ba' flattened.sol
OPTIONAL [REMOVE NEWLINES]: sed -i ':a;$!{N;s/\n/ /;ba;}' flattened.sol
OPTIONAL [REMOVE WHITESPACE]: sed -i -r 's/\s+//g' flattened.sol

BACKUP VERIFICATION #1 (NPX HARDHAT VERIFY THE flattened.sol)
1) Make sure the etherscan option in hardhat config is on the right chain
2a) npx hardhat verify --network optimism --contract contracts/flattened2.sol:ComboOracle 0xE7d6CB15aBE01c681b81f46e6c289aD492c04f5c
2b) npx hardhat verify --network optimism --contract contracts/flattened2.sol:ComboOracle --constructor-args ./scripts/deploys/arguments/frax_middleman_gauge_arguments.js 0xE7d6CB15aBE01c681b81f46e6c289aD492c04f5c

BACKUP VERIFICATION #2 (SOURCIFY)
1) Paste the flattened.sol file in the saddle-contract file
2) Edit Boba 007_deploy_MiscTest
3) do a 'deploy'
4) npx hardhat --network boba sourcify

BACKUP VERIFICATION #3 (STANDARD INPUT JSON)
https://medium.com/coinmonks/how-to-verify-your-kcc-smart-contract-via-standard-input-json-db712176dbc4

BACKUP VERIFICATION #4 (SOL-MERGER) [Works like a flattener]
npx sol-merger ./src/hardhat/contracts/Fraxswap/core/FraxswapPair.sol ./src/hardhat/flattened2.sol

FORGE FLATTENING
forge flatten --output src/flattened-pair.sol src/contracts/core/FraxswapPair.sol
forge flatten --output src/flattened-router.sol src/contracts/periphery/FraxswapRouter.sol
forge flatten --output src/flattened-factory.sol src/contracts/core/FraxswapFactory.sol
sed -i '/SPDX-License-Identifier/d' ./src/flattened-pair.sol &&
sed -i '/pragma solidity/d' ./src/flattened-pair.sol &&
sed -i '1s/^/\/\/ SPDX-License-Identifier: GPL-2.0-or-later\npragma solidity >=0.8.0;\n\n/' ./src/flattened-pair.sol 
sed -i '/SPDX-License-Identifier/d' ./src/flattened-factory.sol &&
sed -i '/pragma solidity/d' ./src/flattened-factory.sol &&
sed -i '1s/^/\/\/ SPDX-License-Identifier: GPL-2.0-or-later\npragma solidity >=0.8.0;\n\n/' ./src/flattened-factory.sol 
sed -i '/SPDX-License-Identifier/d' ./src/flattened-router.sol &&
sed -i '/pragma solidity/d' ./src/flattened-router.sol &&
sed -i '1s/^/\/\/ SPDX-License-Identifier: GPL-2.0-or-later\npragma solidity >=0.8.0;\n\n/' ./src/flattened-router.sol 

# Truffle Size Estimator
truffle run contract-size

