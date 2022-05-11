// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================= ExecVirtualOrdersLib =======================
// ====================================================================
// TWAMM logic for executing the virtual orders
// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// Logic / Algorithm Ideas
// FrankieIsLost: https://github.com/FrankieIsLost

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian
// Drake Evans: https://github.com/DrakeEvans
// Jack Corddry: https://github.com/corddry
// Justin Moore: https://github.com/0xJM

import '../core/libraries/Math.sol';

///@notice This library handles the execution of long term orders.
library ExecVirtualOrdersLib {

    ///@notice computes the result of virtual trades by the token pools
    function computeVirtualBalances(
        uint256 token0Start,
        uint256 token1Start,
        uint256 token0In,
        uint256 token1In)
    internal pure returns (uint256 token0Out, uint256 token1Out)
    {
        token0Out = 0;
        token1Out = 0;
        //if no tokens are sold to the pool, we don't need to execute any orders
        if (token0In <= 1 && token1In <= 1) {
            // do nothing
        }
        //in the case where only one pool is selling, we just perform a normal swap
        else if (token0In <= 1) {
            //constant product formula
            uint token1InWithFee = token1In * 997;
            token0Out = token0Start * token1InWithFee / ((token1Start * 1000) + token1InWithFee);
        }
        else if (token1In <= 1) {
            //contant product formula
            uint token0InWithFee = token0In * 997;
            token1Out = token1Start * token0InWithFee / ((token0Start * 1000) + token0InWithFee);
        }
        //when both pools sell, we use the TWAMM formula
        else {
            uint256 newToken0 = token0Start + (token0In * 997 / 1000);
            uint256 newToken1 = token1Start + (token1In * 997 / 1000);
            token0Out = newToken0 - (token1Start * (newToken0) / (newToken1));
            token1Out = newToken1 - (token0Start * (newToken1) / (newToken0));
        }
    }
}