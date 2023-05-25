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
// ===================== Fraxswap Router Multihop =====================
// ====================================================================
// Fraxswap Router Multihop

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

/// @title Fraxswap Router Multihop
/// @dev Router for swapping across the majority of the FRAX liquidity
contract FraxswapRouterMultihop is ReentrancyGuard, Ownable {
    using SafeCast for uint256;
    using SafeCast for int256;

    IWETH WETH9;
    address FRAX;

    constructor(IWETH _WETH9, address _FRAX) {
        WETH9 = _WETH9;
        FRAX = _FRAX;
    }

    /// @notice modifier for checking deadline
    modifier checkDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction too old");
        _;
    }

    /// @notice only accept ETH via fallback from the WETH contract
    receive() external payable {
        assert(msg.sender == address(WETH9));
    }

    /// ---------------------------
    /// --------- Public ----------
    /// ---------------------------

    /// @notice Main external swap function
    /// @param params all parameters for this swap
    /// @return amountOut output amount from this swap
    function swap(FraxswapParams memory params)
        external
        payable
        nonReentrant
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        if (params.tokenIn == address(0)) {
            // ETH sent in via msg.value
            require(msg.value == params.amountIn, "FSR:II"); // Insufficient input ETH
        } else {
            if (params.v != 0) {
                // use permit instead of approval
                uint256 amount = params.approveMax
                    ? type(uint256).max
                    : params.amountIn;
                IERC20Permit(params.tokenIn).permit(
                    msg.sender,
                    address(this),
                    amount,
                    params.deadline,
                    params.v,
                    params.r,
                    params.s
                );
            }
            // Pull tokens into the Router Contract
            TransferHelper.safeTransferFrom(
                params.tokenIn,
                msg.sender,
                address(this),
                params.amountIn
            );
        }

        FraxswapRoute memory route = abi.decode(params.route, (FraxswapRoute));
        route.tokenOut = params.tokenIn;
        route.amountOut = params.amountIn;

        for (uint256 i; i < route.nextHops.length; ++i) {
            FraxswapRoute memory nextRoute = abi.decode(
                route.nextHops[i],
                (FraxswapRoute)
            );
            executeAllHops(route, nextRoute);
        }

        bool outputETH = params.tokenOut == address(0); // save gas

        amountOut = outputETH
            ? address(this).balance
            : IERC20(params.tokenOut).balanceOf(address(this));

        // Check output amounts and send to recipient (IMPORTANT CHECK)
        require(amountOut >= params.amountOutMinimum, "FSR:IO"); // Insufficient output

        if (outputETH) {
            // sending ETH
            (bool success, ) = payable(params.recipient).call{value: amountOut}(
                ""
            );
            require(success, "FSR:Invalid transfer");
        } else {
            TransferHelper.safeTransfer(
                params.tokenOut,
                params.recipient,
                amountOut
            );
        }

        emit Routed(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut
        );
    }

    /// @notice Uniswap V3 callback function
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        require(amount0Delta > 0 || amount1Delta > 0);
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        if (!data.directFundThisPool) {
            // it isn't directly funded we pay from the router address
            TransferHelper.safeTransfer(
                data.tokenIn,
                msg.sender,
                uint256(amount0Delta > 0 ? amount0Delta : amount1Delta)
            );
        }
    }

    /// ---------------------------
    /// --------- Internal --------
    /// ---------------------------

    /// @notice Function that will execute a particular swap step
    /// @param prevRoute previous hop of the route
    /// @param route current hop of the route
    /// @param step swap to execute
    /// @return amountOut actual output from this swap step
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
            if (step.swapType == 0) {
                // Execute virtual orders for Fraxswap
                PoolInterface(step.pool).executeVirtualOrders(block.timestamp);
            }
            if (step.extraParam1 == 1) {
                // Fraxswap V2 has getAmountOut in the pair (different fees)
                amountOut = PoolInterface(step.pool).getAmountOut(
                    amountIn,
                    prevRoute.tokenOut
                );
            } else {
                // use the reserves and helper function for Uniswap V2 and Fraxswap V1
                (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(
                    step.pool
                ).getReserves();
                amountOut = getAmountOut(
                    amountIn,
                    zeroForOne ? reserve0 : reserve1,
                    zeroForOne ? reserve1 : reserve0
                );
            }
            if (step.directFundThisPool == 0) {
                // this pool is funded by router
                TransferHelper.safeTransfer(
                    prevRoute.tokenOut,
                    step.pool,
                    amountIn
                );
            }
            IUniswapV2Pair(step.pool).swap(
                zeroForOne ? 0 : amountOut,
                zeroForOne ? amountOut : 0,
                step.directFundNextPool == 1
                    ? getNextDirectFundingPool(route)
                    : address(this),
                new bytes(0)
            );
        } else if (step.swapType == 2) {
            // Uni v3
            bool zeroForOne = prevRoute.tokenOut < step.tokenOut;
            (int256 amount0, int256 amount1) = IUniswapV3Pool(step.pool).swap(
                step.directFundNextPool == 1
                    ? getNextDirectFundingPool(route)
                    : address(this),
                zeroForOne,
                amountIn.toInt256(),
                zeroForOne
                    ? 4295128740
                    : 1461446703485210103287273052203988822378723970341, // Do not fail because of price
                abi.encode(
                    SwapCallbackData({
                        tokenIn: prevRoute.tokenOut,
                        directFundThisPool: step.directFundThisPool == 1
                    })
                )
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
                // WETH send as ETH
                WETH9.withdraw(amountIn);
                value = amountIn;
            } else {
                TransferHelper.safeApprove(
                    prevRoute.tokenOut,
                    step.pool,
                    amountIn
                );
            }
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
        } else if (step.swapType == 8) {
            // Fraxlend
            TransferHelper.safeApprove(prevRoute.tokenOut, step.pool, amountIn);
            amountOut = PoolInterface(step.pool).deposit(
                amountIn,
                address(this)
            );
        } else if (step.swapType == 9) {
            // FrxETHMinter
            if (step.extraParam1 == 0 && prevRoute.tokenOut == address(WETH9)) {
                // Unwrap WETH
                WETH9.withdraw(amountIn);
            }
            PoolInterface(step.pool).submitAndGive{value: amountIn}(
                step.directFundNextPool == 1
                    ? getNextDirectFundingPool(route)
                    : address(this)
            );
            amountOut = amountIn; // exchange 1 for 1
        } else if (step.swapType == 10) {
            // WETH
            if (prevRoute.tokenOut == address(WETH9)) {
                // Unwrap WETH
                WETH9.withdraw(amountIn);
            } else {
                // Wrap the ETH
                WETH9.deposit{value: amountIn}();
            }
            amountOut = amountIn; // exchange 1 for 1
        } else if (step.swapType == 999) {
            // Generic Pool
            if (step.directFundThisPool == 0) {
                // this pool is funded by router
                TransferHelper.safeTransfer(
                    prevRoute.tokenOut,
                    step.pool,
                    amountIn
                );
            }
            amountOut = PoolInterface(step.pool).swap(
                prevRoute.tokenOut,
                route.tokenOut,
                amountIn,
                step.directFundNextPool == 1
                    ? getNextDirectFundingPool(route)
                    : address(this)
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

    /// @notice Function that will loop through and execute swap steps
    /// @param prevRoute previous hop of the route
    /// @param route current hop of the route
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

    /// @notice Function that will loop through and execute route hops and execute all steps for each hop
    /// @param prevRoute previous hop of the route
    /// @param route current hop of the route
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

    /// ---------------------------
    /// ------ Views / Pure -------
    /// ---------------------------

    /// @notice Utility function to build an encoded hop of route
    /// @param tokenOut output token address
    /// @param percentOfHop amount of output tokens from the previous hop going into this hop
    /// @param steps list of swaps from the same input token to the same output token
    /// @param nextHops next hops from this one, the next hops' input token is the tokenOut
    /// @return out encoded FraxswapRoute
    function encodeRoute(
        address tokenOut,
        uint256 percentOfHop,
        bytes[] memory steps,
        bytes[] memory nextHops
    ) external pure returns (bytes memory out) {
        FraxswapRoute memory route;
        route.tokenOut = tokenOut;
        route.amountOut = 0;
        route.percentOfHop = percentOfHop;
        route.steps = steps;
        route.nextHops = nextHops;
        out = abi.encode(route);
    }

    /// @notice Utility function to build an encoded step
    /// @param swapType type of the swap performed (Uniswap V2, Fraxswap,Curve, etc)
    /// @param directFundNextPool 0 = funds go via router, 1 = fund are sent directly to pool
    /// @param directFundThisPool 0 = funds go via router, 1 = fund are sent directly to pool
    /// @param tokenOut the target token of the step. output token address
    /// @param pool address of the pool to use in the step
    /// @param extraParam1 extra data used in the step
    /// @param extraParam2 extra data used in the step
    /// @param percentOfHop percentage of all of the steps in this route (hop)
    /// @return out encoded FraxswapStepData
    function encodeStep(
        uint8 swapType,
        uint8 directFundNextPool,
        uint8 directFundThisPool,
        address tokenOut,
        address pool,
        uint256 extraParam1,
        uint256 extraParam2,
        uint256 percentOfHop
    ) external pure returns (bytes memory out) {
        FraxswapStepData memory step;
        step.swapType = swapType;
        step.directFundNextPool = directFundNextPool;
        step.directFundThisPool = directFundThisPool;
        step.tokenOut = tokenOut;
        step.pool = pool;
        step.extraParam1 = extraParam1;
        step.extraParam2 = extraParam2;
        step.percentOfHop = percentOfHop;
        out = abi.encode(step);
    }

    /// @notice Utility function to calculate the amount given the percentage of hop and route 10000 = 100%
    /// @return amountOut amount of input token
    function getAmountForPct(
        uint256 pctOfHop1,
        uint256 pctOfHop2,
        uint256 amountIn
    ) internal pure returns (uint256 amountOut) {
        return (pctOfHop1 * pctOfHop2 * amountIn) / 100_000_000;
    }

    /// @notice Utility function to get the next pool to directly fund
    /// @return nextPoolAddress address of the next pool
    function getNextDirectFundingPool(FraxswapRoute memory route)
        internal
        pure
        returns (address nextPoolAddress)
    {
        require(
            route.steps.length == 1 && route.nextHops.length == 1,
            "FSR: DFRoutes"
        ); // directFunding
        FraxswapRoute memory nextRoute = abi.decode(
            route.nextHops[0],
            (FraxswapRoute)
        );

        require(nextRoute.steps.length == 1, "FSR: DFSteps"); // directFunding
        FraxswapStepData memory nextStep = abi.decode(
            nextRoute.steps[0],
            (FraxswapStepData)
        );

        return nextStep.pool; // pool to send funds to
    }

    /// @notice given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    /// @return amountOut constant product curve expected output amount
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

    /// ---------------------------
    /// --------- Structs ---------
    /// ---------------------------

    /// @notice Input to the swap function
    /// @dev contains the top level info for the swap
    /// @param tokenIn input token address
    /// @param amountIn input token amount
    /// @param tokenOut output token address
    /// @param amountOutMinimum output token minimum amount (reverts if lower)
    /// @param recipient recipient of the output token
    /// @param deadline deadline for this swap transaction (reverts if exceeded)
    /// @param v v value for permit signature if supported
    /// @param r r value for permit signature if supported
    /// @param s s value for permit signature if supported
    /// @param route byte encoded
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

    /// @notice A hop along the swap route
    /// @dev a series of swaps (steps) containing the same input token and output token
    /// @param tokenOut output token address
    /// @param amountOut output token amount
    /// @param percentOfHop amount of output tokens from the previous hop going into this hop
    /// @param steps list of swaps from the same input token to the same output token
    /// @param nextHops next hops from this one, the next hops' input token is the tokenOut
    struct FraxswapRoute {
        address tokenOut;
        uint256 amountOut;
        uint256 percentOfHop;
        bytes[] steps;
        bytes[] nextHops;
    }

    /// @notice A swap step in a specific route. routes can have multiple swap steps
    /// @dev a single swap to a token from the token of the previous hop in the route
    /// @param swapType type of the swap performed (Uniswap V2, Fraxswap,Curve, etc)
    /// @param directFundNextPool 0 = funds go via router, 1 = fund are sent directly to pool
    /// @param directFundThisPool 0 = funds go via router, 1 = fund are sent directly to pool
    /// @param tokenOut the target token of the step. output token address
    /// @param pool address of the pool to use in the step
    /// @param extraParam1 extra data used in the step
    /// @param extraParam2 extra data used in the step
    /// @param percentOfHop percentage of all of the steps in this route (hop)
    struct FraxswapStepData {
        uint8 swapType;
        uint8 directFundNextPool;
        uint8 directFundThisPool;
        address tokenOut;
        address pool;
        uint256 extraParam1;
        uint256 extraParam2;
        uint256 percentOfHop;
    }

    /// @notice struct for Uniswap V3 callback
    /// @param tokenIn address of input token
    /// @param directFundThisPool this pool already been funded
    struct SwapCallbackData {
        address tokenIn;
        bool directFundThisPool;
    }

    /// ---------------------------
    /// --------- Events ----------
    /// ---------------------------

    /// @notice Swap event emitted every swap
    /// @param pool address of the pool to used in the step
    /// @param tokenIn token address of the input token
    /// @param tokenOut token address of the output token
    /// @param amountIn amount of input token
    /// @param amountOut amount of output token
    event Swapped(
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /// @notice Routing event emitted every swap
    /// @param tokenIn address of the original input token
    /// @param tokenOut address of the final output token
    /// @param amountIn input amount for original input token
    /// @param amountOut output amount for the final output token
    event Routed(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
}

// Interface for ERC20 Permit
interface IERC20Permit is IERC20 {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

// Interface used to call pool specific functions
interface PoolInterface {
    // Fraxswap
    function executeVirtualOrders(uint256 blockNumber) external;

    function getAmountOut(uint amountIn, address tokenIn)
        external
        view
        returns (uint);

    // Fraxlend
    function deposit(uint256 userId, address userAddress)
        external
        returns (uint256 _sharesReceived);

    // FrxETHMinter
    function submitAndGive(address recipient) external payable;

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
