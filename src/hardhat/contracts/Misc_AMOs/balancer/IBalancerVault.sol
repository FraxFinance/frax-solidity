// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;



interface IBalancerVault {
  function WETH () external view returns (address);
//   function batchSwap (uint8 kind, tuple[] swaps, address[] assets, tuple funds, int256[] limits, uint256 deadline) external returns (int256[] assetDeltas);
  function deregisterTokens (bytes32 poolId, address[] memory tokens) external;
//   function exitPool (bytes32 poolId, address sender, address recipient, tuple request) external;
  function flashLoan (address recipient, address[] memory tokens, uint256[] memory amounts, bytes memory userData) external;
  function getActionId (bytes4 selector) external view returns (bytes32);
  function getAuthorizer () external view returns (address);
  function getDomainSeparator () external view returns (bytes32);
  function getInternalBalance (address user, address[] memory tokens) external view returns (uint256[] memory balances);
  function getNextNonce (address user) external view returns (uint256);
  function getPausedState () external view returns (bool paused, uint256 pauseWindowEndTime, uint256 bufferPeriodEndTime);
  function getPool (bytes32 poolId) external view returns (address, uint8);
  function getPoolTokenInfo (bytes32 poolId, address token) external view returns (uint256 cash, uint256 managed, uint256 lastChangeBlock, address assetManager);
  function getPoolTokens (bytes32 poolId) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock);
  function getProtocolFeesCollector () external view returns (address);
  function hasApprovedRelayer (address user, address relayer) external view returns (bool);
//   function joinPool (bytes32 poolId, address sender, address recipient, tuple request) external;
//   function managePoolBalance (tuple[] ops) external;
//   function manageUserBalance (tuple[] ops) external;
//   function queryBatchSwap (uint8 kind, tuple[] swaps, address[] assets, tuple funds) external returns (int256[]);
  function registerPool (uint8 specialization) external returns (bytes32);
  function registerTokens (bytes32 poolId, address[] memory tokens, address[] memory assetManagers) external;
  function setAuthorizer (address newAuthorizer) external;
  function setPaused (bool paused) external;
  function setRelayerApproval (address sender, address relayer, bool approved) external;
//   function swap (tuple singleSwap, tuple funds, uint256 limit, uint256 deadline) external returns (uint256 amountCalculated);
}
