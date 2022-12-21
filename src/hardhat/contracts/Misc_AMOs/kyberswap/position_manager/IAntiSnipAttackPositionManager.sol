// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IAntiSnipAttackPositionManager {
    struct Position {
        // the nonce for permits
        uint96 nonce;
        // the address that is approved for spending this token
        address operator;
        // the ID of the pool with which this token is connected
        uint80 poolId;
        // the tick range of the position
        int24 tickLower;
        int24 tickUpper;
        // the liquidity of the position
        uint128 liquidity;
        // the current rToken that the position owed
        uint256 rTokenOwed;
        // fee growth per unit of liquidity as of the last update to liquidity
        uint256 feeGrowthInsideLast;
    }

    struct PoolInfo {
        address token0;
        uint24 fee;
        address token1;
    }

    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        int24[2] ticksPrevious;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /// @notice Params for remove liquidity from the existing position
    /// @param tokenId id of the position to remove its liquidity
    /// @param amount0Min min amount of token 0 to receive
    /// @param amount1Min min amount of token 1 to receive
    /// @param deadline time that the transaction will be expired
    struct RemoveLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /// @notice Burn the rTokens to get back token0 + token1 as fees
    /// @param tokenId id of the position to burn r token
    /// @param amount0Min min amount of token 0 to receive
    /// @param amount1Min min amount of token 1 to receive
    /// @param deadline time that the transaction will be expired
    struct BurnRTokenParams {
        uint256 tokenId;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

  function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
  function PERMIT_TYPEHASH (  ) external view returns ( bytes32 );
  function WETH (  ) external view returns ( address );
  function addLiquidity ( IncreaseLiquidityParams memory params ) external returns ( uint128 liquidity, uint256 amount0, uint256 amount1, uint256 additionalRTokenOwed );
  function addressToPoolId ( address ) external view returns ( uint80 );
  function antiSnipAttackData ( uint256 ) external view returns ( uint32 lastActionTime, uint32 lockTime, uint32 unlockTime, uint256 feesLocked );
  function approve ( address to, uint256 tokenId ) external;
  function balanceOf ( address owner ) external view returns ( uint256 );
  function burn ( uint256 tokenId ) external;
  function burnRTokens ( BurnRTokenParams memory params ) external returns ( uint256 rTokenQty, uint256 amount0, uint256 amount1 );
  function createAndUnlockPoolIfNecessary ( address token0, address token1, uint24 fee, uint160 currentSqrtP ) external returns ( address pool );
  function factory (  ) external view returns ( address );
  function getApproved ( uint256 tokenId ) external view returns ( address );
  function isApprovedForAll ( address owner, address operator ) external view returns ( bool );
  function isRToken ( address ) external view returns ( bool );
  function mint ( MintParams memory params ) external returns ( uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1 );
  function mintCallback ( uint256 deltaQty0, uint256 deltaQty1, bytes memory data ) external;
  function multicall ( bytes[] memory data ) external returns ( bytes[] memory results );
  function name (  ) external view returns ( string memory );
  function nextPoolId (  ) external view returns ( uint80 );
  function nextTokenId (  ) external view returns ( uint256 );
  function ownerOf ( uint256 tokenId ) external view returns ( address );
  function permit ( address spender, uint256 tokenId, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
  function positions ( uint256 tokenId ) external view returns ( Position memory pos, PoolInfo memory info );
  function refundEth (  ) external;
  function removeLiquidity ( RemoveLiquidityParams memory params ) external returns ( uint256 amount0, uint256 amount1, uint256 additionalRTokenOwed );
  function safeTransferFrom ( address from, address to, uint256 tokenId ) external;
  function safeTransferFrom ( address from, address to, uint256 tokenId, bytes memory _data ) external;
  function setApprovalForAll ( address operator, bool approved ) external;
  function supportsInterface ( bytes4 interfaceId ) external view returns ( bool );
  function symbol (  ) external view returns ( string memory );
  function tokenByIndex ( uint256 index ) external view returns ( uint256 );
  function tokenOfOwnerByIndex ( address owner, uint256 index ) external view returns ( uint256 );
  function tokenURI ( uint256 tokenId ) external view returns ( string memory );
  function totalSupply (  ) external view returns ( uint256 );
  function transferAllTokens ( address token, uint256 minAmount, address recipient ) external;
  function transferFrom ( address from, address to, uint256 tokenId ) external;
  function unwrapWeth ( uint256 minAmount, address recipient ) external;
}
