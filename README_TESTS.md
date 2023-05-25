## FORGE
**------Testing------**
Do first
```tsc```

Build (may take some time and appear to hang)
```forge build --via-ir```

Most cases
```source .env.forge && forge test -vv```

If you need to fork mainnet
```source .env.forge && forge test --fork-url $MAINNET_RPC_URL -vv```

If you need to fork mainnet, single test contract
```source .env.forge && forge test --fork-url $MAINNET_RPC_URL -vv --match-path ./src/foundry/test/FXS/FXSDisableVoteTracking.t.sol```

Verbosely test a single contract while forking mainnet
or ```source .env && forge test --fork-url $MAINNET_RPC_URL -vvvvv --match-path ./src/foundry/test/XYZ/XYZ.t.sol``` for single test verbosity level 5

## Hardhat
**------Testing------**
tsc
cd ./src/hardhat
npx hardhat compile

ARBITRUM
npx hardhat test ./test/__ARBITRUM/CrossChainBridgeBacker_ARBI_AnySwap-Tests.js
npx hardhat test ./test/__ARBITRUM/FraxCrossChainFarmV2-Tests.js
npx hardhat test ./test/__ARBITRUM/FraxCrossChainFarmV3_ERC20-Tests.js
npx hardhat test ./test/__ARBITRUM/CurveAMO-ARBI-Tests.js

AURORA
npx hardhat test ./test/__AURORA/CrossChainBridgeBacker_AUR_Rainbow-Tests.js

AVALANCHE
npx hardhat test ./test/__AVALANCHE/AxialAMO-Tests.js
npx hardhat test ./test/__AVALANCHE/CrossChainBridgeBacker_AVAX_AnySwap-Tests.js
npx hardhat test ./test/__AVALANCHE/PangolinLiquidityAMO-Tests.js

BOBA
Todo

ETHEREUM
npx hardhat test  ./test/TWAMM_AMO-Tests.js
npx hardhat test --no-compile ./test/AaveAMO-Tests.js
npx hardhat test ./test/BAMM/BAMM.js
npx hardhat test ./test/CPITrackerOracle-Tests.js
npx hardhat test ./test/ComboOracle_SLP_UniV2_UniV3-Tests.js
npx hardhat test ./test/CommunalFarm-Tests.js
npx hardhat test ./test/Convex-AMO.js
npx hardhat test ./test/CrossChainCanonical-Tests.js
npx hardhat test ./test/Curve-AMO-V4.js
npx hardhat test ./test/CurveMetapoolLockerAMO-Tests.js
npx hardhat test ./test/FPI-FPIS-Tests.js
npx hardhat test ./test/FPIControllerPool-Tests.js
npx hardhat test ./test/FXS1559AMO-Tests.js
npx hardhat test ./test/FraxCrossChainLiquidityTracker-Tests.js
npx hardhat test ./test/FraxFarmBSC_Dual_V5.js
npx hardhat test ./test/FraxFarmRageQuitter-Tests.js
npx hardhat test ./test/Fraxferry/Fraxferry-test.js
npx hardhat test ./test/FraxferryV2/FerryV2-test.js
npx hardhat test ./test/FraxGaugeController-Tests.js
npx hardhat test ./test/FraxLendingAMO.js
npx hardhat test ./test/FraxLiquidityBridger-Tests.js
npx hardhat test ./test/FraxMiddlemanGauge-Tests.js
npx hardhat test ./test/FraxPoolV3-Tests.js
npx hardhat test ./test/FraxUniV3Farm_Stable_FRAX_DAI-Tests.js
npx hardhat test ./test/FraxUniV3Farm_Stable_FRAX_USDC-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_ERC20-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_KyberSwapElastic-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_PosRebase-Tests.js
npx hardhat test ./test/FraxUnifiedFarm_UniV3-Tests.js
npx hardhat test ./test/Fraxswap/fraxswap-twamm-test.js
npx hardhat test ./test/Fraxswap/fraxswap-uniV2-test.js
npx hardhat test ./test/Governance_Slap_2.js
npx hardhat test ./test/IFraxGaugeFXSRewardsDistributor-Tests.js
npx hardhat test ./test/InvestorAMO_V3-Tests.js
npx hardhat test ./test/MIM-Convex-AMO-Tests.js
npx hardhat test ./test/MSIGHelper-Tests.js
npx hardhat test ./test/MigratableFarmBSC_FRAX_FXS-Tests.js
npx hardhat test ./test/OHM-AMO.js
npx hardhat test ./test/PIDController-Tests.js
npx hardhat test ./test/Rari-AMO-Tests.js
npx hardhat test ./test/StakeDAO-AMO.js
npx hardhat test ./test/TokenTrackerV2-Tests.js
npx hardhat test ./test/UniV3LiquidityAMO-Tests.js
npx hardhat test ./test/UniV3LiquidityAMO_V2-Tests.js
npx hardhat test ./test/UniV3TWAPOracle-Tests.js
npx hardhat test ./test/openzeppelin/ERC20.test.js
npx hardhat test ./test/veFPIS-Tests.js
npx hardhat test ./test/veFPISYieldDistributorV5-Tests.js
npx hardhat test ./test/veFXSYieldDistributorV4-Tests.js

FANTOM
npx hardhat test ./test/__FANTOM/CrossChainBridgeBacker_FTM_AnySwap-Tests.js
npx hardhat test ./test/__FANTOM/CurveAMO-FTM-Tests.js
npx hardhat test ./test/__FANTOM/FPIControllerPool-Tests.js
npx hardhat test ./test/__FANTOM/ScreamAMO-Tests.js
npx hardhat test ./test/__FANTOM/SpiritSwapAMO-Tests.js

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
