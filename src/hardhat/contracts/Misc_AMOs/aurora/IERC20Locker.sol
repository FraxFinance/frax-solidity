// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IERC20Locker {
  function admin() external view returns (address);
  function adminDelegatecall(address target, bytes memory data) external returns (bytes memory);
  function adminPause(uint256 flags) external;
  function adminReceiveEth() external;
  function adminSendEth(address destination, uint256 amount) external;
  function adminSstore(uint256 key, uint256 value) external;
  function adminTransfer(address token, address destination, uint256 amount) external;
  function lockToken(address ethToken, uint256 amount, string memory accountId) external;
  function minBlockAcceptanceHeight_() external view returns (uint64);
  function nearTokenFactory_() external view returns (bytes memory);
  function paused() external view returns (uint256);
  function prover_() external view returns (address);
  function tokenFallback(address _from, uint256 _value, bytes memory _data) external pure;
  function unlockToken(bytes memory proofData, uint64 proofBlockHeight) external;
  function usedProofs_(bytes32) external view returns (bool);
}