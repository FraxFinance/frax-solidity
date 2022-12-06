// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "forge-std/Test.sol";
// internal contracts
import "@staking/FraxUnifiedFarm_ERC20.sol";
// external mocks
import "@mocks/MockConvexVault.sol";
import "@mocks/MockConvexRegistry.sol";


contract FraxFarmERC20TransfersTest is Test, FraxUnifiedFarm_ERC20 {
    FraxUnifiedFarm_ERC20 public fraxFarm;
    MockConvexVault public mockVault;
    MockConvexRegistry public mockRegistry;
    
    // convex addresses
    address public frxEth = 0x5E8422345238F34275888049021821E8E08CAa1f;
    address public frxETHCRV = 0xf43211935C781D5ca1a41d2041F397B8A7366C7A;
    address public cvxStkFrxEthLp = 0x4659d5fF63A1E1EDD6D5DD9CC315e063c95947d0;
    address public frxFarm = 0xa537d64881b84faffb9Ae43c951EEbF368b71cdA; // frxEthFraxFarm
}
