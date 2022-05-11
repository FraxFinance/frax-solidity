pragma solidity >=0.5.16;

import '../FraxswapERC20.sol';

contract ERC20CoreTest is FraxswapERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
