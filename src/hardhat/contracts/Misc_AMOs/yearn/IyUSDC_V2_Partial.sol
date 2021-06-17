// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
import '../../ERC20/IERC20.sol';

// https://etherscan.io/address/0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9
// Some functions were omitted for brevity. See the contract for details

interface IyUSDC_V2_Partial is IERC20 {
    function balance() external returns (uint);
    function available() external returns (uint);
    function earn() external;
    function deposit(uint _amount) external;
    function withdraw(uint _shares) external;
    function pricePerShare() external view returns (uint);
}
