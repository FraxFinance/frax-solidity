pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
// Original at https://etherscan.io/address/0x39aa39c021dfbae8fac545936693ac917d5e7563#code
// Some functions were omitted for brevity. See the contract for details

interface IcUSDC_Partial  {
    function mint(uint mintAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
}
