pragma solidity 0.6.11;
import '../../ERC20/IERC20.sol';

// https://etherscan.io/address/0x597aD1e0c13Bfe8025993D9e79C69E1c0233522e
interface IyUSDC_V1 is IERC20 {
    function balance() external returns (uint);
    function available() external returns (uint);
    function earn() external;
    function deposit(uint _amount) external;
    function withdraw(uint _shares) external;
    function getPricePerFullShare() external returns (uint);
}
