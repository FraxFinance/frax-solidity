// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ItAsset {
  function _eventSend() external view returns(bool);
  function allowance(address owner, address spender) external view returns(uint256);
  function approve(address spender, uint256 amount) external returns(bool);
  function approveManager(uint256 amount) external;
  function balanceOf(address account) external view returns(uint256);
  function decimals() external view returns(uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns(bool);
  function deposit(uint256 amount) external;
  function depositFor(address account, uint256 amount) external;
  function destinations() external view returns(address fxStateSender, address destinationOnL2);
  function increaseAllowance(address spender, uint256 addedValue) external returns(bool);
  function initialize(address _underlyer, address _manager, string memory _name, string memory _symbol) external;
  function manager() external view returns(address);
  function name() external view returns(string memory);
  function owner() external view returns(address);
  function pause() external;
  function paused() external view returns(bool);
  function renounceOwnership() external;
  function requestWithdrawal(uint256 amount) external;
  function requestedWithdrawals(address) external view returns(uint256 minCycle, uint256 amount);
  function setDestinations(address _fxStateSender, address _destinationOnL2) external;
  function setEventSend(bool _eventSendSet) external;
  function symbol() external view returns(string memory);
  function totalSupply() external view returns(uint256);
  function transfer(address recipient, uint256 amount) external returns(bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns(bool);
  function transferOwnership(address newOwner) external;
  function underlyer() external view returns(address);
  function unpause() external;
  function withdraw(uint256 requestedAmount) external;
  function withheldLiquidity() external view returns(uint256);
}