// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IPoolFactory {
  function DEPRECATED__liquidationToken (  ) external view returns ( address );
  function addLegacyPool ( address legacyPool ) external;
  function allowAll (  ) external view returns ( bool );
  function allowToken ( address token, bool status ) external;
  function claimOwnership (  ) external;
  function createPool ( address token ) external;
  function createSingleBorrowerPool ( address token, string memory borrowerName, string memory borrowerSymbol ) external;
  function deprecatePool ( address legacyPool ) external;
  function initialize ( address _poolImplementationReference, address _trueLender2, address _safu ) external;
  function isAllowed ( address ) external view returns ( bool );
  function isBorrowerWhitelisted ( address ) external view returns ( bool );
  function isInitialized (  ) external view returns ( bool );
  function isPool ( address ) external view returns ( bool );
  function owner (  ) external view returns ( address );
  function pendingOwner (  ) external view returns ( address );
  function pool ( address ) external view returns ( address );
  function poolImplementationReference (  ) external view returns ( address );
  function removePool ( address legacyPool ) external;
  function safu (  ) external view returns ( address );
  function setAllowAll ( bool status ) external;
  function setSafuAddress ( address _safu ) external;
  function setTrueLender ( address _trueLender2 ) external;
  function singleBorrowerPool ( address, address ) external view returns ( address );
  function transferOwnership ( address newOwner ) external;
  function trueLender2 (  ) external view returns ( address );
  function whitelistBorrower ( address borrower, bool status ) external;
}
