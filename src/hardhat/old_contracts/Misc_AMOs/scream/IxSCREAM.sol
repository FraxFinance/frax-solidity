// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IxSCREAM {

  struct Permit {
      address owner;
      address spender;
      uint256 amount;
      uint256 deadline;
      uint8 v;
      bytes32 r;
      bytes32 s;
  }

  function DOMAIN_SEPARATOR() external view returns (bytes32);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function collect(address _token) external;
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function deposit(uint256 _amount) external;
  function depositWithPermit(uint256 _amount, Permit calldata permit) external;
  function getShareValue() external view returns (uint256);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function name() external view returns (string memory);
  function nonces(address owner) external view returns (uint256);
  function owner() external view returns (address);
  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function renounceOwnership() external;
  function scream() external view returns (address);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership(address newOwner) external;
  function withdraw(uint256 _share) external;
}
