// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IL2StandardBridge {
  function finalizeDeposit(address _l1Token, address _l2Token, address _from, address _to, uint256 _amount, bytes memory _data) external;
  function l1TokenBridge() external view returns (address);
  function messenger() external view returns (address);
  function withdraw(address _l2Token, uint256 _amount, uint32 _l1Gas, bytes memory _data) external;
  function withdrawTo(address _l2Token, address _to, uint256 _amount, uint32 _l1Gas, bytes memory _data) external;
}
