// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../../Uniswap_V3/IUniswapV3Pool.sol";

interface IBunniLens {
    struct BunniKey {
        IUniswapV3Pool pool;
        int24 tickLower;
        int24 tickUpper;
    }

    function getReserves (BunniKey calldata key) external view returns (uint112 reserve0, uint112 reserve1);
    function hub () external view returns (address);
    function pricePerFullShare (BunniKey calldata key) external view returns (uint128 liquidity, uint256 amount0, uint256 amount1);
}
