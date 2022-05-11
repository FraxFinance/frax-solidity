## Hardhat
**---Testing---**
cd ./src/hardhat
npx hardhat compile

ARBITRUM
npx hardhat test ./test/__ARBITRUM/CrossChainBridgeBacker_ARBI_AnySwap-Tests.js
npx hardhat test ./test/FraxCrossChainFarmV2-Tests.js
npx hardhat test ./test/__ARBITRUM/CurveAMO-ARBI-Tests.js

AURORA
npx hardhat test ./test/__AURORA/CrossChainBridgeBacker_AUR_Rainbow-Tests.js

AVALANCHE
npx hardhat test ./test/__AVALANCHE/CrossChainBridgeBacker_AVAX_AnySwap-Tests.js
npx hardhat test ./test/__AVALANCHE/PangolinLiquidityAMO-Tests.js
npx hardhat test ./test/__AVALANCHE/AxialAMO-Tests.js

BOBA
Todo

ETHEREUM
npx hardhat test --no-compile ./test/CommunalFarm-Tests.js
npx hardhat test --no-compile ./test/FraxPoolV3-Tests.js
npx hardhat test --no-compile ./test/Rari-AMO-Tests.js
npx hardhat test ./test/OHM-AMO.js
npx hardhat test ./test/FraxLendingAMO.js
npx hardhat test ./test/InvestorAMO_V3-Tests.js
npx hardhat test ./test/Curve-AMO-V4.js
npx hardhat test ./test/Convex-AMO.js
npx hardhat test ./test/StakeDAO-AMO.js
npx hardhat test ./test/UniV3LiquidityAMO-Tests.js
npx hardhat test ./test/UniV3LiquidityAMO_V2-Tests.js
npx hardhat test ./test/IFraxGaugeFXSRewardsDistributor-Tests.js
npx hardhat test ./test/FraxUniV3Farm_Stable_FRAX_USDC-Tests.js
npx hardhat test ./test/FraxUniV3Farm_Stable_FRAX_DAI-Tests.js
npx hardhat test ./test/FraxCrossChainLiquidityTracker-Tests.js
npx hardhat test ./test/PIDController-Tests.js
npx hardhat test ./test/MigratableFarmBSC_FRAX_FXS-Tests.js
npx hardhat test ./test/FraxFarmBSC_Dual_V5.js
npx hardhat test ./test/openzeppelin/ERC20.test.js
npx hardhat test ./test/CurveMetapoolLockerAMO-Tests.js
npx hardhat test ./test/AaveAMO-Tests.js
npx hardhat test ./test/FraxLiquidityBridger-Tests.js
npx hardhat test ./test/CrossChainCanonical-Tests.js
npx hardhat test ./test/TokenTrackerV2-Tests.js
npx hardhat test ./test/veFXSYieldDistributorV4-Tests.js
npx hardhat test ./test/MSIGHelper-Tests.js
npx hardhat test ./test/FXS1559AMO-Tests.js
npx hardhat test ./test/MIM-Convex-AMO-Tests.js
npx hardhat test ./test/ComboOracle_SLP_UniV2_UniV3-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_ERC20-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_PosRebase-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_UniV3-Tests.js
npx hardhat test ./test/Fraxswap/fraxswap-twamm-test.js
npx hardhat test ./test/Fraxswap/fraxswap-uniV2-test.js
npx hardhat test ./test/CPITrackerOracle-Tests.js
npx hardhat test ./test/FPI-FPIS-Tests.js
npx hardhat test ./test/FraxMiddlemanGauge-Tests.js
npx hardhat test ./test/FraxGaugeController-Tests.js
npx hardhat test ./test/UniV3TWAPOracle-Tests.js
npx hardhat test ./test/FPIControllerPool-Tests.js
npx hardhat test ./test/veFPIS-Tests.js

FANTOM
npx hardhat test ./test/__FANTOM/CrossChainBridgeBacker_FTM_AnySwap-Tests.js
npx hardhat test ./test/__FANTOM/CurveAMO-FTM-Tests.js
npx hardhat test ./test/__FANTOM/FPIControllerPool-Tests.js
npx hardhat test ./test/__FANTOM/SpiritSwapAMO-Tests.js
npx hardhat test ./test/__FANTOM/ScreamAMO-Tests.js

HARMONY
npx hardhat test ./test/__HARMONY/CrossChainBridgeBacker_HARM_Horizon-Tests.js

MOONBEAM
npx hardhat test ./test/__MOONBEAM/CrossChainBridgeBacker_MNBM_Nomad-Tests.js

MOONRIVER
npx hardhat test ./test/__MOONRIVER/CCFrax1to1AMM-Tests.js

OPTIMISM
npx hardhat test ./test/__OPTIMISM/CrossChainBridgeBacker_OPTI_Celer-Tests.js

POLYGON
npx hardhat test ./test/__POLYGON/CrossChainBridgeBacker_POLY_MaticBridge-Tests.js
npx hardhat test ./test/__POLYGON/SushiSwapLiquidityAMO_POLY-Tests.js

