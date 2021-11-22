// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
import { IERC20 } from "../../ERC20/IERC20.sol";
import { IUniswapV3Pool } from "../../Uniswap_V3/IUniswapV3Pool.sol";

interface IGUniPool {
    function mint(uint256 mintAmount, address receiver)
        external
        returns (
            uint256 amount0,
            uint256 amount1,
            uint128 liquidityMinted
        );

    function burn(uint256 burnAmount, address receiver)
        external
        returns (
            uint256 amount0,
            uint256 amount1,
            uint128 liquidityBurned
        );
        
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function token0() external view returns (IERC20);
    function token1() external view returns (IERC20);
    function upperTick() external view returns (int24);
    function lowerTick() external view returns (int24);
    function pool() external view returns (IUniswapV3Pool);
    function decimals() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);

    function getMintAmounts(uint256 amount0Max, uint256 amount1Max)
        external
        view
        returns (
            uint256 amount0,
            uint256 amount1,
            uint256 mintAmount
        );

    function getUnderlyingBalances()
        external
        view
        returns (uint256 amount0, uint256 amount1);

    function getPositionID() external view returns (bytes32 positionID);
}