// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


interface IFraxswapRouterMultihop {

    struct FraxswapParams {
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        uint256 amountOutMinimum;
        address recipient;
        uint256 deadline;
        bool approveMax;
        uint8 v;
        bytes32 r;
        bytes32 s;
        bytes route;
    }

    function encodeRoute ( address tokenOut, uint256 percentOfHop, bytes[] memory steps, bytes[] memory nextHops ) external pure returns ( bytes memory out );
    function encodeStep ( uint8 swapType, uint8 directFundNextPool, uint8 directFundThisPool, address tokenOut, address pool, uint256 extraParam1, uint256 extraParam2, uint256 percentOfHop ) external pure returns ( bytes memory out );
    function owner (  ) external view returns ( address );
    function renounceOwnership (  ) external;
    function swap ( FraxswapParams memory params ) external returns ( uint256 amountOut );
    function transferOwnership ( address newOwner ) external;
    function uniswapV3SwapCallback ( int256 amount0Delta, int256 amount1Delta, bytes memory _data ) external;
}
