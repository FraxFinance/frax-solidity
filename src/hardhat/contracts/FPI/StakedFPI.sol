//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Created and owned by the staking contract. 
 *
 * It mints and burns OGTemple as users stake/unstake
 */
contract StakedFPI is ERC20, ERC20Burnable, Ownable {
    constructor() ERC20("StakedFPI", "sFPI") {}

    function mint(address to, uint256 amount) external onlyOwner {
      _mint(to, amount);
    }
}