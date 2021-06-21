// SPDX-License-Identifier: GPL-3
pragma solidity >=0.6.11;

import './IImpossibleERC20.sol';

interface IImpossiblePair is IImpossibleERC20 {
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint256 reserve0, uint256 reserve1);
    event changeInvariant(bool _isXybk, uint256 _ratioStart, uint256 _ratioEnd);
    event updatedTradeFees(uint256 _prevFee, uint256 _newFee);
    event updatedDelay(uint256 _oldDelay, uint256 _newDelay);
    event updatedHardstops(uint8 _ratioStart, uint8 _ratioEnd);
    event updatedBoost(
        uint32 _prevBoost0,
        uint32 _prevBoost1,
        uint32 _newBoost0,
        uint32 _newBoost1,
        uint256 _start,
        uint256 _end
    );

    function MINIMUM_LIQUIDITY() external pure returns (uint256);

    function factory() external view returns (address);

    function token0() external view returns (address); // address of token0

    function token1() external view returns (address); // address of token1

    function router() external view returns (address); // address of token1

    function getReserves() external view returns (uint256, uint256); // reserves of token0/token1

    function calcBoost() external view returns (uint256, uint256);

    function mint(address) external returns (uint256);

    function burn(address) external returns (uint256, uint256);

    function swap(
        uint256,
        uint256,
        address,
        bytes calldata
    ) external;

    function cheapSwap(
        uint256,
        uint256,
        address,
        bytes calldata
    ) external;

    function skim(address to) external;

    function sync() external;

    function getFeeAndXybk() external view returns (uint256, bool); // Uses single storage slot, save gas

    function delay() external view returns (uint256); // Amount of time delay required before any change to boost etc, denoted in seconds

    function initialize(
        address,
        address,
        address
    ) external;
}