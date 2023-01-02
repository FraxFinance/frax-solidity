// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBridgeRouter {
  function PRE_FILL_FEE_DENOMINATOR() external view returns (uint256);
  function PRE_FILL_FEE_NUMERATOR() external view returns (uint256);
  function VERSION() external view returns (uint8);
  function enrollCustom(uint32 _domain, bytes32 _id, address _custom) external;
  function enrollRemoteRouter(uint32 _domain, bytes32 _router) external;
  function handle(uint32 _origin, uint32 _nonce, bytes32 _sender, bytes memory _message) external;
  function initialize(address _tokenRegistry, address _xAppConnectionManager) external;
  function liquidityProvider(bytes32) external view returns (address);
  function migrate(address _oldRepr) external;
  function owner() external view returns (address);
  function preFill(uint32 _origin, uint32 _nonce, bytes memory _message) external;
  function remotes(uint32) external view returns (bytes32);
  function renounceOwnership() external;
  function send(address _token, uint256 _amount, uint32 _destination, bytes32 _recipient, bool _enableFast) external;
  function setXAppConnectionManager(address _xAppConnectionManager) external;
  function tokenRegistry() external view returns (address);
  function transferOwnership(address newOwner) external;
  function xAppConnectionManager() external view returns (address);
}
