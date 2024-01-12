//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract FraxFPIBondYield is ERC20Permit {
   address immutable bond;
   
   constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) ERC20Permit(_name) {
      bond = msg.sender;
   }

   function mint(address to, uint256 amount) external {
      if (msg.sender!=bond) revert("Can not mint");
      _mint(to, amount);
   }
   
   function burnFrom(address from, uint256 amount) external {
      if (msg.sender!=bond) revert("Can not burn");
      _burn(from, amount);
   }
}
