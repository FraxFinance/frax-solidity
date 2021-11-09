// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBeefyVaultV6 {
  function allowance(address owner, address spender) external view returns (uint256);
  function approvalDelay() external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function available() external view returns (uint256);
  function balance() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function deposit(uint256 _amount) external;
  function depositAll() external;
  function earn() external;
  function getPricePerFullShare() external view returns (uint256);
  function inCaseTokensGetStuck(address _token) external;
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function name() external view returns (string memory);
  function owner() external view returns (address);
  function proposeStrat(address _implementation) external;
  function renounceOwnership() external;
  function stratCandidate() external view returns (address implementation, uint256 proposedTime);
  function strategy() external view returns (address);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership(address newOwner) external;
  function upgradeStrat() external;
  function want() external view returns (address);
  function withdraw(uint256 _shares) external;
  function withdrawAll() external;
}