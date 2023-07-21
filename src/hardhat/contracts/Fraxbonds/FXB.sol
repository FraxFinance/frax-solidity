//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract FXB is ERC20Permit {
   address constant public FRAX = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
   uint immutable public expiry;
   
   constructor(string memory _name, string memory _symbol, uint _expiry) ERC20(_name, _symbol) ERC20Permit(_name) {
      expiry = _expiry;
   }

   function mint(address to, uint256 amount) external {
      TransferHelper.safeTransferFrom(FRAX, msg.sender, address(this), amount);
      _mint(to, amount);
   }
   
   function redeem(address to, uint256 amount) external {
      if (block.timestamp<expiry) revert("Too soon");
      _burn(msg.sender, amount);
      TransferHelper.safeTransfer(FRAX, to, amount);
   }
}
