// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IL1StandardBridge {
  function depositERC20To(address _l1Token, address _l2Token, address _to, uint256 _amount, uint32 _l2Gas, bytes calldata _data) external;
}
