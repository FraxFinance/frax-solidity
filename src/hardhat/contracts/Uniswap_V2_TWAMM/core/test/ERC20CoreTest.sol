pragma solidity >=0.5.16;

import '../UniV2TWAMMERC20.sol';

contract ERC20CoreTest is UniV2TWAMMERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
