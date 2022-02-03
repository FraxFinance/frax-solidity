// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IL1StandardBridge {
  function depositERC20(address _l1Token, address _l2Token, uint256 _amount, uint32 _l2Gas, bytes memory _data) external;
  function depositERC20To(address _l1Token, address _l2Token, address _to, uint256 _amount, uint32 _l2Gas, bytes memory _data) external;
  function depositETH(uint32 _l2Gas, bytes memory _data) external;
  function depositETHTo(address _to, uint32 _l2Gas, bytes memory _data) external;
  function deposits(address, address) external view returns (uint256);
  function donateETH() external;
  function finalizeERC20Withdrawal(address _l1Token, address _l2Token, address _from, address _to, uint256 _amount, bytes memory _data) external;
  function finalizeETHWithdrawal(address _from, address _to, uint256 _amount, bytes memory _data) external;
  function initialize(address _l1messenger, address _l2TokenBridge) external;
  function l2TokenBridge() external view returns (address);
  function messenger() external view returns (address);
}
