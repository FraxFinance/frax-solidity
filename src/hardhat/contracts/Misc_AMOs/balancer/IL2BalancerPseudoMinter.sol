// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IL2BalancerPseudoMinter {
  function addGaugeFactory (address factory) external;
  function allowed_to_mint_for (address minter, address user) external view returns (bool);
  function getActionId (bytes4 selector) external view returns (bytes32);
  function getAuthorizer () external view returns (address);
  function getBalancerToken () external view returns (address);
  function getDomainSeparator () external view returns (bytes32);
  function getMinterApproval (address minter, address user) external view returns (bool);
  function getNextNonce (address account) external view returns (uint256);
  function getVault () external view returns (address);
  function isValidGaugeFactory (address factory) external view returns (bool);
  function mint (address gauge) external returns (uint256);
  function mintFor (address gauge, address user) external returns (uint256);
  function mintMany (address[] memory gauges) external returns (uint256);
  function mintManyFor (address[] memory gauges, address user) external returns (uint256);
  function mint_for (address gauge, address user) external;
  function mint_many (address[8] memory gauges) external;
  function minted (address user, address gauge) external view returns (uint256);
  function removeGaugeFactory (address factory) external;
  function setMinterApproval (address minter, bool approval) external;
  function setMinterApprovalWithSignature (address minter, bool approval, address user, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
  function toggle_approve_mint (address minter) external;
}
