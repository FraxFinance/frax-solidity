// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IChildChainManager {
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function DEPOSIT (  ) external view returns ( bytes32 );
  function MAPPER_ROLE (  ) external view returns ( bytes32 );
  function MAP_TOKEN (  ) external view returns ( bytes32 );
  function STATE_SYNCER_ROLE (  ) external view returns ( bytes32 );
  function childToRootToken ( address ) external view returns ( address );
  function cleanMapToken ( address rootToken, address childToken ) external;
  function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
  function getRoleMember ( bytes32 role, uint256 index ) external view returns ( address );
  function getRoleMemberCount ( bytes32 role ) external view returns ( uint256 );
  function grantRole ( bytes32 role, address account ) external;
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function initialize ( address _owner ) external;
  function mapToken ( address rootToken, address childToken ) external;
  function onStateReceive ( uint256, bytes calldata data ) external;
  function renounceRole ( bytes32 role, address account ) external;
  function revokeRole ( bytes32 role, address account ) external;
  function rootToChildToken ( address ) external view returns ( address );
}
