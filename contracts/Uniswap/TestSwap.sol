// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../FakeCollateral/FakeCollateral_USDT.sol";
import "../FakeCollateral/FakeCollateral_WETH.sol";
import "./UniswapV2Router02_Modified.sol";

contract TestSwap {
	address public USDT_address;
	address public WETH_address;
	UniswapV2Router02_Modified public router;

	constructor( 
		address _USDT_address, 
		address _WETH_address,
		UniswapV2Router02_Modified _router
	) public {
		USDT_address = _USDT_address;
		WETH_address = _WETH_address;
		router = _router;
	}

	function getPath() public returns (address[] memory) {
		address[] memory path = new address[](2);
		path[0] = USDT_address;
		path[1] = WETH_address;
		return path;
	}
/*
	function swapUSDTforETH(uint256 amountIn, uint256 amountOutMin) public payable {
		address[] memory path = new address[](2);
		path[0] = USDT_address;
		path[1] = WETH_address;
		UniswapV2Router02_Modified.swapExactTokensForETH(amountIn, amountOutMin, path, address(this), block.timestamp);
	}
*/
}