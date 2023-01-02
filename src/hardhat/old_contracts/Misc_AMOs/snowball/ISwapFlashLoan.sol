// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface ISwapFlashLoan {
  function MAX_BPS() external view returns(uint256);
  function addLiquidity(uint256[] memory amounts, uint256 minToMint, uint256 deadline) external returns(uint256);
  function calculateRemoveLiquidity(uint256 amount) external view returns(uint256[] memory);
  function calculateRemoveLiquidityOneToken(uint256 tokenAmount, uint8 tokenIndex) external view returns(uint256 availableTokenAmount);
  function calculateSwap(uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx) external view returns(uint256);
  function calculateTokenAmount(uint256[] memory amounts, bool deposit) external view returns(uint256);
  function getA() external view returns(uint256);
  function getAPrecise() external view returns(uint256);
  function getAdminBalance(uint256 index) external view returns(uint256);
  function getToken(uint8 index) external view returns(address);
  function getTokenBalance(uint8 index) external view returns(uint256);
  function getTokenIndex(address tokenAddress) external view returns(uint8);
  function getVirtualPrice() external view returns(uint256);
  function owner() external view returns(address);
  function pause() external;
  function paused() external view returns(bool);
  function protocolFeeShareBPS() external view returns(uint256);
  function rampA(uint256 futureA, uint256 futureTime) external;
  function removeLiquidityOneToken(uint256 tokenAmount, uint8 tokenIndex, uint256 minAmount, uint256 deadline) external returns(uint256);
  function renounceOwnership() external;
  function setAdminFee(uint256 newAdminFee) external;
  function setFlashLoanFees(uint256 newFlashLoanFeeBPS, uint256 newProtocolFeeShareBPS) external;
  function setSwapFee(uint256 newSwapFee) external;
  function stopRampA() external;
  function swap(uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx, uint256 minDy, uint256 deadline) external returns(uint256);
  function swapStorage() external view returns(uint256 initialA, uint256 futureA, uint256 initialATime, uint256 futureATime, uint256 swapFee, uint256 adminFee, address lpToken);
  function transferOwnership(address newOwner) external;
  function unpause() external;
  function withdrawAdminFees() external;
}
