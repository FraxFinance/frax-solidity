// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IArbFiatToken {
  function DOMAIN_SEPARATOR() external view returns (bytes32);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function blacklist(address account) external;
  function blacklister() external view returns (address);
  function bridgeBurn(address account, uint256 amount) external;
  function bridgeInit(address _l1Address, bytes memory _data) external;
  function bridgeMint(address account, uint256 amount) external;
  function changeOwner(address account) external;
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function gatewayAddress() external view returns (address);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function initialize(string memory name, string memory symbol, uint8 decimals) external;
  function initialize(address _gatewayAddress, address _l1Address, address owner, string memory name, string memory symbol, uint8 decimals) external;
  function isBlacklisted(address account) external view returns (bool);
  function l1Address() external view returns (address);
  function name() external view returns (string memory);
  function nonces(address owner) external view returns (uint256);
  function owner() external view returns (address);
  function pause() external;
  function paused() external view returns (bool);
  function pauser() external view returns (address);
  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function setPauser(address account) external;
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferAndCall(address to, uint256 value, bytes memory data) external returns (bool success);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function unBlacklist(address account) external;
  function unpause() external;
  function updateBlacklister(address newBlacklister) external;
}
