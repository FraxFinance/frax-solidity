// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IL2GatewayRouter {
  function calculateL2TokenAddress(address l1ERC20) external view returns (address);
  function counterpartGateway() external view returns (address);
  function defaultGateway() external view returns (address);
  function finalizeInboundTransfer(address, address, address, uint256, bytes calldata) external;
  function getGateway(address _token) external view returns (address gateway);
  function getOutboundCalldata(address _token, address _from, address _to, uint256 _amount, bytes calldata _data) external view returns (bytes memory);
  function initialize(address _counterpartGateway, address _defaultGateway) external;
  function l1TokenToGateway(address) external view returns (address);
  function outboundTransfer(address _l1Token, address _to, uint256 _amount, bytes calldata _data) external returns (bytes calldata);
  function outboundTransfer(address _token, address _to, uint256 _amount, uint256 _maxGas, uint256 _gasPriceBid, bytes calldata _data) external returns (bytes memory);
  function postUpgradeInit() external;
  function router() external view returns (address);
  function setDefaultGateway(address newL2DefaultGateway) external;
  function setGateway(address[] memory _l1Token, address[] memory _gateway) external;
}
