// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

interface IRootChainManager {
  function depositFor (address user, address rootToken, bytes memory depositData) external;
  function tokenToType (address) external view returns (bytes32);
  function typeToPredicate (bytes32) external view returns (address);

}

// interface GeneratedInterface {
//   function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
//   function DEPOSIT (  ) external view returns ( bytes32 );
//   function ERC712_VERSION (  ) external view returns ( string );
//   function ETHER_ADDRESS (  ) external view returns ( address );
//   function MAPPER_ROLE (  ) external view returns ( bytes32 );
//   function MAP_TOKEN (  ) external view returns ( bytes32 );
//   function checkpointManagerAddress (  ) external view returns ( address );
//   function childChainManagerAddress (  ) external view returns ( address );
//   function childToRootToken ( address ) external view returns ( address );
//   function cleanMapToken ( address rootToken, address childToken ) external;
//   function depositEtherFor ( address user ) external;
//   function depositFor ( address user, address rootToken, bytes depositData ) external;
//   function executeMetaTransaction ( address userAddress, bytes functionSignature, bytes32 sigR, bytes32 sigS, uint8 sigV ) external returns ( bytes );
//   function exit ( bytes inputData ) external;
//   function getChainId (  ) external pure returns ( uint256 );
//   function getDomainSeperator (  ) external view returns ( bytes32 );
//   function getNonce ( address user ) external view returns ( uint256 nonce );
//   function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
//   function getRoleMember ( bytes32 role, uint256 index ) external view returns ( address );
//   function getRoleMemberCount ( bytes32 role ) external view returns ( uint256 );
//   function grantRole ( bytes32 role, address account ) external;
//   function hasRole ( bytes32 role, address account ) external view returns ( bool );
//   function initialize ( address _owner ) external;
//   function initializeEIP712 (  ) external;
//   function mapToken ( address rootToken, address childToken, bytes32 tokenType ) external;
//   function processedExits ( bytes32 ) external view returns ( bool );
//   function registerPredicate ( bytes32 tokenType, address predicateAddress ) external;
//   function remapToken ( address rootToken, address childToken, bytes32 tokenType ) external;
//   function renounceRole ( bytes32 role, address account ) external;
//   function revokeRole ( bytes32 role, address account ) external;
//   function rootToChildToken ( address ) external view returns ( address );
//   function setCheckpointManager ( address newCheckpointManager ) external;
//   function setChildChainManagerAddress ( address newChildChainManager ) external;
//   function setStateSender ( address newStateSender ) external;
//   function setupContractId (  ) external;
//   function stateSenderAddress (  ) external view returns ( address );
//   function tokenToType ( address ) external view returns ( bytes32 );
//   function typeToPredicate ( bytes32 ) external view returns ( address );
// }
