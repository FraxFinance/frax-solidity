// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
import "../../ERC20/IERC20.sol";

// https://etherscan.io/address/0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9
// Some functions were omitted for brevity. See the contract for details

interface IyUSDC_V2_Partial is IERC20 {
    function balance() external returns (uint256);

    function available() external returns (uint256);

    function earn() external;

    function deposit(uint256 _amount) external;

    function withdraw(uint256 _shares) external;

    function pricePerShare() external view returns (uint256);
}
