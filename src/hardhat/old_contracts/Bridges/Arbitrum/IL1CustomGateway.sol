// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IL1CustomGateway {
  function calculateL2TokenAddress(address l1ERC20) external view returns (address);
  function counterpartGateway() external view returns (address);
  function encodeWithdrawal(uint256 _exitNum, address _initialDestination) external pure returns (bytes32);
  function finalizeInboundTransfer(address _token, address _from, address _to, uint256 _amount, bytes calldata _data) external;
  function forceRegisterTokenToL2(address[] memory _l1Addresses, address[] memory _l2Addresses, uint256 _maxGas, uint256 _gasPriceBid, uint256 _maxSubmissionCost) external returns (uint256);
  function getExternalCall(uint256 _exitNum, address _initialDestination, bytes calldata _initialData) external view returns (address target, bytes calldata data);
  function getOutboundCalldata(address _l1Token, address _from, address _to, uint256 _amount, bytes calldata _data) external view returns (bytes calldata outboundCalldata);
  function inbox() external view returns (address);
  function initialize(address _l1Counterpart, address _l1Router, address _inbox, address _owner) external;
  function l1ToL2Token(address) external view returns (address);
  function outboundTransfer(address _l1Token, address _to, uint256 _amount, uint256 _maxGas, uint256 _gasPriceBid, bytes calldata _data) external payable returns (bytes calldata res);
  function owner() external view returns (address);
  function postUpgradeInit() external;
  function redirectedExits(bytes32) external view returns (bool isExit, address _newTo, bytes calldata _newData);
  function registerTokenToL2(address, uint256, uint256, uint256, address) external returns (uint256);
  function registerTokenToL2(address _l2Address, uint256 _maxGas, uint256 _gasPriceBid, uint256 _maxSubmissionCost) external returns (uint256);
  function router() external view returns (address);
  function transferExitAndCall(uint256 _exitNum, address _initialDestination, address _newDestination, bytes calldata _newData, bytes calldata _data) external;
  function whitelist() external view returns (address);
}
