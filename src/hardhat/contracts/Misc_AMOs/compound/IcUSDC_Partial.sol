// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
import '../../ERC20/IERC20.sol';

// Original at https://etherscan.io/address/0x39aa39c021dfbae8fac545936693ac917d5e7563#code
// Some functions were omitted for brevity. See the contract for details
// https://compound.finance/docs/ctokens
interface IcUSDC_Partial is IERC20  {
    function mint(uint mintAmount) external returns (uint);

    // redeemAmount = # of cUSDC
    function redeem(uint redeemAmount) external returns (uint);

    // redeemAmount = # of USDC
    function redeemUnderlying(uint redeemAmount) external returns (uint);

    // Multiply this by the E8 balance of cUSDC, then divide the product by E16 
    function exchangeRateStored() external view returns (uint);
}
