// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
import '../../ERC20/IERC20.sol';
import './IKToken.sol';

// Original at https://etherscan.io/address/0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E#code
// Some functions were omitted for brevity. See the contract for details

interface IKEEPERLiquidityPool_V2 {
    function kToken(address _token) external view returns (IKToken);
    function register(IKToken _kToken) external;
    function renounceOperator() external;
    function deposit(address _token, uint256 _amount) external payable returns (uint256);
    function withdraw(address payable _to, IKToken _kToken, uint256 _kTokenAmount) external;
    function borrowableBalance(address _token) external view returns (uint256);
    function underlyingBalance(address _token, address _owner) external view returns (uint256);
}


