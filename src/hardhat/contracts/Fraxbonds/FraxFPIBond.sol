//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./FraxFPIBondYield.sol";
import "./interface/IFPIControllerPool.sol";


contract FraxFPIBond is ERC20Permit {
   IERC20 constant public FRAX = IERC20(0x853d955aCEf822Db058eb8505911ED77F175b99e);
   IERC20 constant public FPI = IERC20(0x5Ca135cB8527d76e932f34B5145575F9d8cbE08E);
   uint immutable public expiry;
   FraxFPIBondYield immutable public yieldToken;
   IFPIControllerPool immutable public controllerPool;
   uint public fraxPerBond;
   uint public fraxPerYieldToken;
   
   constructor(string memory _name, string memory _symbol, uint _expiry,IFPIControllerPool _controllerPool) ERC20(_name, _symbol) ERC20Permit(_name) {
      expiry = _expiry;
      controllerPool = _controllerPool;
      yieldToken = new FraxFPIBondYield(string.concat(_name," Yield"), string.concat(_symbol,"Y"));
   }

   function mint(address to, uint256 amount) external {
      TransferHelper.safeTransferFrom(address(FPI), msg.sender, address(this), amount);
      _mint(to, amount);
      yieldToken.mint(to, amount);
   }
   
   function expirySwap() external {
      if (block.timestamp<expiry) revert("Too soon");
      uint fpiBalance = FPI.balanceOf(address(this));
      TransferHelper.safeApprove(address(FPI),address(controllerPool),fpiBalance);
      controllerPool.redeemFPI(fpiBalance,0); // min_frax_out is zero, the controllerPool only redeems when price is within peg bounds.
      uint fraxBalance = FRAX.balanceOf(address(this));
      if (fraxBalance>=totalSupply()) {
         fraxPerBond = 1e18;
         fraxPerYieldToken = fraxBalance/totalSupply();
      } else {
         fraxPerBond = fraxBalance/totalSupply();
      }
   }
   
   function redeem(address to, uint256 amount) external {
      if (fraxPerBond==0) revert("Too soon");
      _burn(msg.sender, amount);
      TransferHelper.safeTransfer(address(FRAX), to, amount*fraxPerBond/1e18);
   }
   
   function redeemYieldToken(address to, uint256 amount) external {
      if (fraxPerBond==0) revert("Too soon");
      yieldToken.burnFrom(msg.sender, amount);
      TransferHelper.safeTransfer(address(FRAX), to, amount*fraxPerYieldToken/1e18);
   }   
}
