//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DummyToken is ERC20Permit, ERC20Burnable, Ownable {
    constructor() 
      Ownable(msg.sender)
      ERC20("DummyToken", "DUM") 
      ERC20Permit("DummyToken") {
    }

    function mint(address to, uint256 amount) external onlyOwner {
      _mint(to, amount);
    }
}
