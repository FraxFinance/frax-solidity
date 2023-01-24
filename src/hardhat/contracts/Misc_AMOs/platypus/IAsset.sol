// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IAsset {
  function addCash (uint256 amount) external;
  function addLiability (uint256 amount) external;
  function aggregateAccount () external view returns (address);
  function allowance (address owner, address spender) external view returns (uint256);
  function approve (address spender, uint256 amount) external returns (bool);
  function balanceOf (address account) external view returns (uint256);
  function burn (address to, uint256 amount) external;
  function cash () external view returns (uint256);
  function decimals () external view returns (uint8);
  function decreaseAllowance (address spender, uint256 subtractedValue) external returns (bool);
  function increaseAllowance (address spender, uint256 addedValue) external returns (bool);
  function initialize (address underlyingToken_, string memory name_, string memory symbol_, address aggregateAccount_) external;
  function liability () external view returns (uint256);
  function maxSupply () external view returns (uint256);
  function mint (address to, uint256 amount) external;
  function name () external view returns (string memory);
  function owner () external view returns (address);
  function pool () external view returns (address);
  function removeCash (uint256 amount) external;
  function removeLiability (uint256 amount) external;
  function renounceOwnership () external;
  function setAggregateAccount (address aggregateAccount_) external;
  function setMaxSupply (uint256 maxSupply_) external;
  function setPool (address pool_) external;
  function symbol () external view returns (string memory);
  function totalSupply () external view returns (uint256);
  function transfer (address recipient, uint256 amount) external returns (bool);
  function transferFrom (address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership (address newOwner) external;
  function transferUnderlyingToken (address to, uint256 amount) external;
  function underlyingToken () external view returns (address);
  function underlyingTokenBalance () external view returns (uint256);
}
