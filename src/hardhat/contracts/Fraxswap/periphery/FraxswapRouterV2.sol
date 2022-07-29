// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0;
pragma abicoder v2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================== FraxswapRouter V2 =========================
// ====================================================================
// Fraxswap Router V2

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Rich: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian
// Drake Evans:  https://github.com/DrakeEvans
// Jack Corddry: https://github.com/corddry
// Justin Moore: https://github.com/0xJM

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-core/contracts/libraries/SafeCast.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract FraxswapRouterV2 is ReentrancyGuard, Ownable {
    using SafeCast for uint256;
    using SafeCast for int256;

    IWETH WETH9;
    address FRAX;

    modifier checkDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction too old");
        _;
    }

    constructor(
        IWETH _WETH9,
        address _FRAX
    ) {
        WETH9 = _WETH9;
        FRAX = _FRAX;
    }

    receive() external payable {
        assert(msg.sender == address(WETH9)); // only accept ETH via fallback from the WETH contract
    }

    // Utility funcion to build an encoded step
    function encodeStep(
        uint8 swapType,
        uint8 directFunding,
        address tokenOut,
        address pool,
        uint256 extraParam1,
        uint256 extraParam2,
        uint256 percentOfHop
    ) external pure returns (bytes memory out) {
        FraxswapStepData memory step;
        step.swapType = swapType;
        step.directFunding = directFunding;
        step.tokenOut = tokenOut;
        step.pool = pool;
        step.extraParam1 = extraParam1;
        step.extraParam2 = extraParam2;
        step.percentOfHop = percentOfHop;
        out = abi.encode(step);
    }

    // Utility funcion to build a route
    function encodeRoute(
        address tokenOut,
        uint256 amountOut,
        uint256 percentOfHop,
        bytes[] memory steps,
        bytes[] memory nextHops
    ) external pure returns (bytes memory out) {
        FraxswapRoute memory route;
        route.tokenOut = tokenOut;
        route.amountOut = amountOut;
        route.percentOfHop = percentOfHop;
        route.steps = steps;
        route.nextHops = nextHops;
        out = abi.encode(route);
    }

    // Calculate the amount given the percetage of hop and route 10000 = 100%
    function getAmountForPct(
        uint256 pctOfHop1,
        uint256 pctOfHop2,
        uint256 amountIn
    ) internal pure returns (uint256 amountOut) {
        return (pctOfHop1 * pctOfHop2 * amountIn) / 100_000_000;
    }

    function executeSwap(
        FraxswapRoute memory prevRoute,
        FraxswapRoute memory route,
        FraxswapStepData memory step
    ) internal returns (uint256 amountOut) {
        uint256 amountIn = getAmountForPct(
            step.percentOfHop,
            route.percentOfHop,
            prevRoute.amountOut
        );
        if (step.swapType < 2) {
            // Fraxswap/Uni v2
            bool zeroForOne = prevRoute.tokenOut < step.tokenOut;
            if (step.swapType == 0)
                PoolInterface(step.pool).executeVirtualOrders(block.timestamp);
            (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(step.pool)
                .getReserves();
            amountOut = getAmountOut(
                amountIn,
                zeroForOne ? reserve0 : reserve1,
                zeroForOne ? reserve1 : reserve0
            );
            TransferHelper.safeTransfer(
                prevRoute.tokenOut,
                step.pool,
                amountIn
            );
            IUniswapV2Pair(step.pool).swap(
                zeroForOne ? 0 : amountOut,
                zeroForOne ? amountOut : 0,
                address(this),
                new bytes(0)
            );
        } else if (step.swapType == 2) {
            // Uni v3
            bool zeroForOne = prevRoute.tokenOut < step.tokenOut;
            (int256 amount0, int256 amount1) = IUniswapV3Pool(step.pool).swap(
                address(this),
                zeroForOne,
                amountIn.toInt256(),
                zeroForOne
                    ? 4295128740
                    : 1461446703485210103287273052203988822378723970341, // Do not fail because of price
                abi.encode(SwapCallbackData({tokenIn: prevRoute.tokenOut}))
            );
            amountOut = uint256(zeroForOne ? -amount1 : -amount0);
        } else if (step.swapType == 3) {
            // Curve exchange V2
            TransferHelper.safeApprove(prevRoute.tokenOut, step.pool, amountIn);
            PoolInterface(step.pool).exchange(
                step.extraParam1,
                step.extraParam2,
                amountIn,
                0
            );
            amountOut = IERC20(step.tokenOut).balanceOf(address(this));
        } else if (step.swapType == 4) {
            // Curve exchange, with returns
            uint256 value = 0;
            if (prevRoute.tokenOut == address(WETH9)) {
                // WETH is send as ETH
                WETH9.withdraw(amountIn);
                value = amountIn;
            } else
                TransferHelper.safeApprove(
                    prevRoute.tokenOut,
                    step.pool,
                    amountIn
                );
            amountOut = PoolInterface(step.pool).exchange{value: value}(
                int128(int256(step.extraParam1)),
                int128(int256(step.extraParam2)),
                amountIn,
                0
            );
            if (route.tokenOut == address(WETH9)) {
                // Wrap the received ETH as WETH
                WETH9.deposit{value: amountOut}();
            }
        } else if (step.swapType == 5) {
            // Curve exchange_underlying
            TransferHelper.safeApprove(prevRoute.tokenOut, step.pool, amountIn);
            amountOut = PoolInterface(step.pool).exchange_underlying(
                int128(int256(step.extraParam1)),
                int128(int256(step.extraParam2)),
                amountIn,
                0
            );
        } else if (step.swapType == 6) {
            // Saddle
            TransferHelper.safeApprove(prevRoute.tokenOut, step.pool, amountIn);
            amountOut = PoolInterface(step.pool).swap(
                uint8(step.extraParam1),
                uint8(step.extraParam2),
                amountIn,
                0,
                block.timestamp
            );
        } else if (step.swapType == 7) {
            // FPIController
            TransferHelper.safeApprove(prevRoute.tokenOut, step.pool, amountIn);
            if (prevRoute.tokenOut == FRAX) {
                amountOut = PoolInterface(step.pool).mintFPI(amountIn, 0);
            } else {
                amountOut = PoolInterface(step.pool).redeemFPI(amountIn, 0);
            }
        } else if (step.swapType == 999) {
            // Generic Pool
            TransferHelper.safeTransfer(
                prevRoute.tokenOut,
                step.pool,
                amountIn
            );
            amountOut = PoolInterface(step.pool).swap(
                prevRoute.tokenOut,
                route.tokenOut,
                amountIn,
                address(this)
            );
        }

        emit Swapped(
            step.pool,
            prevRoute.tokenOut,
            step.tokenOut,
            amountIn,
            amountOut
        );
    }

    function executeAllStepsForRoute(
        FraxswapRoute memory prevRoute,
        FraxswapRoute memory route
    ) internal {
        for (uint256 j; j < route.steps.length; ++j) {
            FraxswapStepData memory step = abi.decode(
                route.steps[j],
                (FraxswapStepData)
            );
            route.amountOut += executeSwap(prevRoute, route, step);
        }
    }

    function executeAllHops(
        FraxswapRoute memory prevRoute,
        FraxswapRoute memory route
    ) internal {
        executeAllStepsForRoute(prevRoute, route);
        for (uint256 i; i < route.nextHops.length; ++i) {
            FraxswapRoute memory nextRoute = abi.decode(
                route.nextHops[i],
                (FraxswapRoute)
            );
            executeAllHops(route, nextRoute);
        }
    }

    function swap(FraxswapParams memory params)
        external
        payable
        nonReentrant
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {

        // Pull tokens into the Router Contract
        if (params.tokenIn == address(WETH9))
            WETH9.deposit{value: params.amountIn}();
        else
            TransferHelper.safeTransferFrom(
                params.tokenIn,
                msg.sender,
                address(this),
                params.amountIn
            );

        FraxswapRoute memory route = abi.decode(params.route, (FraxswapRoute));
        route.tokenOut = params.tokenIn;
        route.amountOut = params.amountIn;

        uint256 prevBalance = IERC20(params.tokenOut).balanceOf(address(this));

        for (uint256 i; i < route.nextHops.length; ++i) {
            FraxswapRoute memory nextRoute = abi.decode(
                route.nextHops[i],
                (FraxswapRoute)
            );
            executeAllHops(route, nextRoute);
        }

        amountOut =
            IERC20(params.tokenOut).balanceOf(address(this)) -
            prevBalance;

        // Check output amounts and send to recipient
        require(amountOut >= params.amountOutMinimum, "CSR:IO"); // Insufficient output
        if (params.tokenOut == address(WETH9)) {
            // Unwrap WETH and send to recipient
            WETH9.withdraw(params.amountIn);
            TransferHelper.safeTransferETH(params.recipient, params.amountIn);
        } else
            TransferHelper.safeTransfer(
                params.tokenOut,
                params.recipient,
                amountOut
            );
        emit Routed(params.amountIn, amountOut);
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        require(amount0Delta > 0 || amount1Delta > 0);
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        // No checking, we just pay from the router address.
        TransferHelper.safeTransfer(
            data.tokenIn,
            msg.sender,
            uint256(amount0Delta > 0 ? amount0Delta : amount1Delta)
        );
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountOut) {
        require(amountIn > 0, "UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
        );
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    struct FraxswapParams {
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        uint256 amountOutMinimum;
        address recipient;
        uint256 deadline;
        bytes route;
    }

    struct FraxswapRoute {
        address tokenOut;
        uint256 amountOut;
        uint256 percentOfHop;
        bytes[] steps; // same input token and same tokenOut
        bytes[] nextHops;
    }

    // swapType: Type of the swap performed
    // directFunding: 0 = funds go via router, 1 = fund are send directly to pool
    // tokenOut: the target token of the step.
    // pool: addres of the pool to use in the step
    // extraParam1: extra data used in the step
    // extraParam2: extra data used in the step
    // nextStep: next ABI encoded step
    struct FraxswapStepData {
        uint8 swapType;
        uint8 directFunding;
        address tokenOut;
        address pool;
        uint256 extraParam1;
        uint256 extraParam2;
        uint256 percentOfHop;
    }

    struct SwapCallbackData {
        address tokenIn;
    }

    event Swapped(
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event Routed(uint256 amountIn, uint256 amountOut);
}

// Interface used to call pool specific functions
interface PoolInterface {
    // Fraxswap
    function executeVirtualOrders(uint256 blockNumber) external;

    // Curve
    function exchange(
        uint256 i,
        uint256 j,
        uint256 dx,
        uint256 min_dy
    ) external;

    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external payable returns (uint256);

    function exchange_underlying(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    // Saddle
    function swap(
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 dx,
        uint256 minDy,
        uint256 deadline
    ) external returns (uint256);

    //FPI Mint/Redeem
    function mintFPI(uint256 frax_in, uint256 min_fpi_out)
        external
        returns (uint256 fpi_out);

    function redeemFPI(uint256 fpi_in, uint256 min_frax_out)
        external
        returns (uint256 frax_out);

    // generic swap wrapper
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address target
    ) external returns (uint256 amountOut);
}
