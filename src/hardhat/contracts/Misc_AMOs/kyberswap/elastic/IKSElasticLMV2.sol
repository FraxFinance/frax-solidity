// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IKSElasticLMV2 {
    struct RangeInput {
        int24 tickLower;
        int24 tickUpper;
        uint32 weight;
    }

    struct RewardInput {
        address rewardToken;
        uint256 rewardAmount;
    }

    struct PhaseInput {
        uint32 startTime;
        uint32 endTime;
        RewardInput[] rewards;
    }

    struct RemoveLiquidityInput {
        uint256 nftId;
        uint128 liquidity;
    }

    struct RangeInfo {
        int24 tickLower;
        int24 tickUpper;
        uint32 weight;
        bool isRemoved;
    }

    struct PhaseInfo {
        uint32 startTime;
        uint32 endTime;
        bool isSettled;
        RewardInput[] rewards;
    }

    struct FarmInfo {
        address poolAddress;
        RangeInfo[] ranges;
        PhaseInfo phase;
        uint256 liquidity;
        address farmingToken;
        uint256[] sumRewardPerLiquidity;
        uint32 lastTouchedTime;
    }

    struct StakeInfo {
        address owner;
        uint256 fId;
        uint256 rangeId;
        uint256 liquidity;
        uint256[] lastSumRewardPerLiquidity;
        uint256[] rewardUnclaimed;
    }

    function addFarm ( address poolAddress, RangeInput[] memory ranges, PhaseInput memory phase, bool isUsingToken ) external returns ( uint256 fId );
    function addLiquidity ( uint256 fId, uint256 rangeId, uint256[] memory nftIds ) external;
    function addPhase ( uint256 fId, PhaseInput memory phaseInput ) external;
    function addRange ( uint256 fId, RangeInput memory range ) external;
    function admin (  ) external view returns ( address );
    function claimFee ( uint256 fId, uint256[] memory nftIds, uint256 amount0Min, uint256 amount1Min, uint256 deadline, bool isReceiveNative ) external;
    function claimReward ( uint256 fId, uint256[] memory nftIds ) external;
    function deposit ( uint256 fId, uint256 rangeId, uint256[] memory nftIds, address receiver ) external;
    function emergencyEnabled (  ) external view returns ( bool );
    function farmCount (  ) external view returns ( uint256 );
    function forceClosePhase ( uint256 fId ) external;
    function getDepositedNFTs ( address user ) external view returns ( uint256[] memory listNFTs );
    function getFarm ( uint256 fId ) external view returns ( address poolAddress, RangeInput[] memory ranges, PhaseInput memory phase, uint256 liquidity, address farmingToken, uint256[] memory sumRewardPerLiquidity, uint32 lastTouchedTime );
    function getNft (  ) external view returns ( address );
    function getStake ( uint256 nftId ) external view returns ( address owner, uint256 fId, uint256 rangeId, uint256 liquidity, uint256[] memory lastSumRewardPerLiquidity, uint256[] memory rewardUnclaimed );
    function operators ( address ) external view returns ( bool );
    function removeLiquidity ( uint256 nftId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline, bool isClaimFee, bool isReceiveNative ) external;
    function removeRange ( uint256 fId, uint256 rangeId ) external;
    function transferAdmin ( address _admin ) external;
    function updateEmergency ( bool enableOrDisable ) external;
    function updateHelper ( address _helper ) external;
    function updateOperator ( address user, bool grantOrRevoke ) external;
    function updateTokenCode ( bytes memory _farmingTokenCreationCode ) external;
    function weth (  ) external view returns ( address );
    function withdraw ( uint256 fId, uint256[] memory nftIds ) external;
    function withdrawEmergency ( uint256[] memory nftIds ) external;
    function withdrawUnusedRewards ( address[] memory tokens, uint256[] memory amounts ) external;
}
