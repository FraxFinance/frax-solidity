// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import '../../ERC20/IERC20.sol';

// Original at https://etherscan.io/address/0xfb772316a54dcd439964b561fc2c173697aeeb5b#code
// Address [0x32e4c68b3a4a813b710595aeba7f6b7604ab9c15] used is a proxy
// Some functions were omitted for brevity. See the contract for details

interface IBZXFulcrum_Partial is IERC20  {
    function mint(address receiver, uint256 depositAmount) external returns (uint256);
    function burn(address receiver, uint256 burnAmount) external returns (uint256 loanAmountPaid);
    function assetBalanceOf(address _owner) external returns (uint256);
}
