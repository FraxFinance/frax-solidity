// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IZap {
  function estimateZapInToken(address _from, address _to, address _router, uint256 _amt) external view returns (uint256, uint256);
  function isFeeOnTransfer(address) external view returns (bool);
  function owner() external view returns (address);
  function renounceOwnership() external;
  function setIsFeeOnTransfer(address token) external;
  function setTokenBridgeForRouter(address token, address router, address bridgeToken) external;
  function setUseNativeRouter(address router) external;
  function swapToNative(address _from, uint256 amount, address routerAddr, address _recipient) external;
  function swapToken(address _from, uint256 amount, address _to, address routerAddr, address _recipient) external;
  function transferOwnership(address newOwner) external;
  function useNativeRouter(address) external view returns (bool);
  function withdraw(address token) external;
  function zapAcross(address _from, uint256 amount, address _toRouter, address _recipient) external;
  function zapIn(address _to, address routerAddr, address _recipient) external;
  function zapInToken(address _from, uint256 amount, address _to, address routerAddr, address _recipient) external;
  function zapOut(address _from, uint256 amount, address routerAddr, address _recipient) external;
  function zapOutToken(address _from, uint256 amount, address _to, address routerAddr, address _recipient) external;
}
