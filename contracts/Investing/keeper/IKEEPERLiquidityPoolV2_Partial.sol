// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import '../../ERC20/IERC20.sol';
import './IKToken.sol';

// Original at https://etherscan.io/address/0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E#code
// Some functions were omitted for brevity. See the contract for details

interface IKEEPERLiquidityPoolV2_Partial is IERC20  {
    function deposit(address _token, uint256 _amount) external payable returns (uint256);
    function withdraw(address payable _to, IKToken _kToken, uint256 _kTokenAmount) external;
}
