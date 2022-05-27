// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IManagedPortfolioFactory {
  function bulletLoans (  ) external view returns ( address );
  function claimManagement (  ) external;
  function createPortfolio ( string memory name, string memory symbol, address _underlyingToken, address _lenderVerifier, uint256 _duration, uint256 _maxSize, uint256 _managerFee ) external;
  function getPortfolios (  ) external view returns ( address[] memory );
  function initialize ( address _bulletLoans, address _protocolConfig, address _portfolioImplementation ) external;
  function isWhitelisted ( address ) external view returns ( bool );
  function manager (  ) external view returns ( address );
  function pendingManager (  ) external view returns ( address );
  function portfolioImplementation (  ) external view returns ( address );
  function portfolios ( uint256 ) external view returns ( address );
  function protocolConfig (  ) external view returns ( address );
  function setIsWhitelisted ( address account, bool _isWhitelisted ) external;
  function setPortfolioImplementation ( address newImplementation ) external;
  function transferManagement ( address newManager ) external;
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes memory data ) external;
}
