// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IStablePool {
  function DOMAIN_SEPARATOR () external view returns (bytes32);
  function allowance (address owner, address spender) external view returns (uint256);
  function approve (address spender, uint256 amount) external returns (bool);
  function balanceOf (address account) external view returns (uint256);
  function decimals () external view returns (uint8);
  function decreaseAllowance (address spender, uint256 amount) external returns (bool);
  function disableRecoveryMode () external;
  function enableRecoveryMode () external;
  function getActionId (bytes4 selector) external view returns (bytes32);
  function getAmplificationParameter () external view returns (uint256 value, bool isUpdating, uint256 precision);
  function getAuthorizer () external view returns (address);
  function getLastInvariant () external view returns (uint256 lastInvariant, uint256 lastInvariantAmp);
  function getOwner () external view returns (address);
  function getPausedState () external view returns (bool paused, uint256 pauseWindowEndTime, uint256 bufferPeriodEndTime);
  function getPoolId () external view returns (bytes32);
  function getRate () external view returns (uint256);
  function getScalingFactors () external view returns (uint256[] memory);
  function getSwapFeePercentage () external view returns (uint256);
  function getVault () external view returns (address);
  function inRecoveryMode () external view returns (bool);
  function increaseAllowance (address spender, uint256 addedValue) external returns (bool);
  function name () external view returns (string memory);
  function nonces (address owner) external view returns (uint256);
  function onExitPool (bytes32 poolId, address sender, address recipient, uint256[] memory balances, uint256 lastChangeBlock, uint256 protocolSwapFeePercentage, bytes memory userData) external returns (uint256[] memory, uint256[] memory);
  function onJoinPool (bytes32 poolId, address sender, address recipient, uint256[] memory balances, uint256 lastChangeBlock, uint256 protocolSwapFeePercentage, bytes memory userData) external returns (uint256[] memory, uint256[] memory);
//   function onSwap (tuple swapRequest, uint256[] balances, uint256 indexIn, uint256 indexOut) external returns (uint256);
//   function onSwap (tuple request, uint256 balanceTokenIn, uint256 balanceTokenOut) external returns (uint256);
  function pause () external;
  function permit (address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function queryExit (bytes32 poolId, address sender, address recipient, uint256[] memory balances, uint256 lastChangeBlock, uint256 protocolSwapFeePercentage, bytes memory userData) external returns (uint256 bptIn, uint256[] memory amountsOut);
  function queryJoin (bytes32 poolId, address sender, address recipient, uint256[] memory balances, uint256 lastChangeBlock, uint256 protocolSwapFeePercentage, bytes memory userData) external returns (uint256 bptOut, uint256[] memory amountsIn);
  function setAssetManagerPoolConfig (address token, bytes memory poolConfig) external;
  function setSwapFeePercentage (uint256 swapFeePercentage) external;
  function startAmplificationParameterUpdate (uint256 rawEndValue, uint256 endTime) external;
  function stopAmplificationParameterUpdate () external;
  function symbol () external view returns (string memory);
  function totalSupply () external view returns (uint256);
  function transfer (address recipient, uint256 amount) external returns (bool);
  function transferFrom (address sender, address recipient, uint256 amount) external returns (bool);
  function unpause () external;
}
