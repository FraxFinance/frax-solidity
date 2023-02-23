// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ISaddlePermissionlessSwap {
  function FEE_COLLECTOR_NAME () external view returns (bytes32);
  function MASTER_REGISTRY () external view returns (address);
  function addLiquidity (uint256[] memory amounts, uint256 minToMint, uint256 deadline) external returns (uint256);
  function calculateRemoveLiquidity (uint256 amount) external view returns (uint256[] memory);
  function calculateRemoveLiquidityOneToken (uint256 tokenAmount, uint8 tokenIndex) external view returns (uint256 availableTokenAmount);
  function calculateSwap (uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx) external view returns (uint256);
  function calculateTokenAmount (uint256[] memory amounts, bool deposit) external view returns (uint256);
  function feeCollector () external view returns (address);
  function getA () external view returns (uint256);
  function getAPrecise () external view returns (uint256);
  function getAdminBalance (uint256 index) external view returns (uint256);
  function getToken (uint8 index) external view returns (address);
  function getTokenBalance (uint8 index) external view returns (uint256);
  function getTokenIndex (address tokenAddress) external view returns (uint8);
  function getVirtualPrice () external view returns (uint256);
  function initialize (address[] memory _pooledTokens, uint8[] memory decimals, string memory lpTokenName, string memory lpTokenSymbol, uint256 _a, uint256 _fee, uint256 _adminFee, address lpTokenTargetAddress) external;
  function owner () external view returns (address);
  function pause () external;
  function paused () external view returns (bool);
  function rampA (uint256 futureA, uint256 futureTime) external;
  function removeLiquidity (uint256 amount, uint256[] memory minAmounts, uint256 deadline) external returns (uint256[] memory);
  function removeLiquidityImbalance (uint256[] memory amounts, uint256 maxBurnAmount, uint256 deadline) external returns (uint256);
  function removeLiquidityOneToken (uint256 tokenAmount, uint8 tokenIndex, uint256 minAmount, uint256 deadline) external returns (uint256);
  function renounceOwnership () external;
  function setAdminFee (uint256 newAdminFee) external;
  function setSwapFee (uint256 newSwapFee) external;
  function stopRampA () external;
  function swap (uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx, uint256 minDy, uint256 deadline) external returns (uint256);
  function swapStorage () external view returns (uint256 initialA, uint256 futureA, uint256 initialATime, uint256 futureATime, uint256 swapFee, uint256 adminFee, address lpToken);
  function transferOwnership (address newOwner) external;
  function unpause () external;
  function updateFeeCollectorCache () external;
  function withdrawAdminFees () external;
}
