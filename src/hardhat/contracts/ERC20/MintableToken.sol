// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

import "../Common/Ownable.sol";
import "./ERC20.sol";


contract MintableToken is ERC20, Ownable {
    constructor (string memory __name, string memory __symbol) public ERC20(__name, __symbol) {}

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }
}
