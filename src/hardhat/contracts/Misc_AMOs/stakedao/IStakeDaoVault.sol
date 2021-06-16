// SPDX-License-Identifier: NONE
pragma solidity >=0.6.11;

import '../../ERC20/IERC20.sol';

// Part: IController

interface IStakeDaoVault is IERC20 {
    // Mutative
    function deposit(uint256 _amount) external;
    function depositAll() external;
    function withdraw(uint256 _shares) external; // No rebalance implementation for lower fees and faster swaps
    function withdrawAll() external;
    function earn(address, uint256) external;
    function harvest(address reserve, uint256 amount) external; // Used to swap any borrowed reserve over the debt limit to liquidate to 'token'

    // Views
    function controller() external view returns (address);
    function token() external view returns (address);
    function balance() external view returns (uint256);
    function balanceOf(address) external override view returns (uint256);
    function want(address) external view returns (address);
    function rewards() external view returns (address);
    function vaults(address) external view returns (address);
    function strategies(address) external view returns (address);
    function getPricePerFullShare() external view returns (uint256);
}
