// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ITempleFraxAMMOps {
  function ammRouter() external view returns (address);
  function deepenLiquidity(uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin) external;
  function fraxToken() external view returns (address);
  function manager() external view returns (address);
  function owner() external view returns (address);
  function raiseIV(uint256 amount) external;
  function removeLiquidity(uint256 liquidity, uint256 amountAMin, uint256 amountBMin) external;
  function renounceOwnership() external;
  function setManager(address _manager) external;
  function templeToken() external view returns (address);
  function templeTreasury() external view returns (address);
  function templeUniswapV2Pair() external view returns (address);
  function transferOwnership(address newOwner) external;
  function treasuryManagementProxy() external view returns (address);
  function withdraw(address token, address to, uint256 amount) external;
}
