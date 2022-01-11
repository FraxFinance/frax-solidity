pragma solidity >=0.5.16;

import '../UniswapV2ERC20V8.sol';

contract ERC20CoreTest is UniswapV2ERC20V8 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
