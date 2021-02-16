// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../FakeCollateral/FakeCollateral_USDT.sol";
import "../FakeCollateral/FakeCollateral_WETH.sol";
import "./UniswapV2Router02_Modified.sol";

/* IGNORE THIS CONTRACT, ONLY USED FOR TESTING PURPOSES */

contract TestSwap {
	address public USDT_address;
	address public WETH_address;
	UniswapV2Router02_Modified public router;
	FakeCollateral_USDT USDT = FakeCollateral_USDT(USDT);
	FakeCollateral_WETH WETH = FakeCollateral_WETH(WETH);

	constructor( 
		address _USDT_address, 
		address _WETH_address,
		UniswapV2Router02_Modified _router_address
	) public {
		USDT_address = _USDT_address;
		WETH_address = _WETH_address;
		router = UniswapV2Router02_Modified(_router_address);
	}

	function getPath() public returns (address[] memory) {
		address[] memory path = new address[](2);
		path[0] = USDT_address;
		path[1] = WETH_address;
		return path;
	}

	function swapUSDTforETH(uint256 amountIn, uint256 amountOutMin) public payable {
		require(USDT.transferFrom(msg.sender, address(this), amountIn), "transferFrom failed.");
		require(USDT.approve(address(router), amountIn), "approve failed.");

		address[] memory path = new address[](2);
		path[0] = USDT_address;
		path[1] = WETH_address;

		router.swapExactTokensForETH(amountIn, amountOutMin, path, msg.sender, block.timestamp);
	}

}