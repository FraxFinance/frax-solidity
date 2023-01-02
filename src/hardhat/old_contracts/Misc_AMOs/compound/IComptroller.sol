// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// Original at https://etherscan.io/address/0xbe7616B06f71e363A310Aa8CE8aD99654401ead7#code
// Address [0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B] used is a proxy
// Some functions were omitted for brevity. See the contract for details


interface IComptroller {
  function SingleAssetDynamicRainMakerContractHash() external view returns (bytes32);
  function _acceptAdmin() external returns (uint256);
  function _setDynamicCompSpeed(address cToken, uint256 compSupplySpeed, uint256 compBorrowSpeed) external;
  function _setDynamicCompSpeeds(address[] memory _cTokens, uint256[] memory _compSupplySpeeds, uint256[] memory _compBorrowSpeeds) external;
  function _setLnIncentiveToken(address incentiveTokenAddress) external;
  function _setPendingAdmin(address newPendingAdmin) external returns (uint256);
  function _supportMarket(address cToken) external;
  function admin() external view returns (address);
  function allMarkets(uint256) external view returns (address);
  function claimComp(address holder, address[] memory cTokens) external;
  function claimComp(address[] memory holders, address[] memory cTokens, bool borrowers, bool suppliers) external;
  function claimComp(address holder) external;
  function compAccrued(address) external view returns (uint256);
  function compBorrowSpeeds(address) external view returns (uint256);
  function compBorrowState(address) external view returns (uint224 index, uint32 block);
  function compBorrowerIndex(address, address) external view returns (uint256);
  function compInitialIndex() external view returns (uint224);
  function compSpeeds(address market) external view returns (uint256);
  function compSupplierIndex(address, address) external view returns (uint256);
  function compSupplySpeeds(address) external view returns (uint256);
  function compSupplyState(address) external view returns (uint224 index, uint32 block);
  function comptroller() external view returns (address);
  function connect(bytes memory params) external;
  function contractNameHash() external view returns (bytes32);
  function distributeBorrowerComp(address cToken, address borrower, uint256 marketBorrowIndex_) external;
  function distributeSupplierComp(address cToken, address supplier) external;
  function getBlockNumber() external view returns (uint256);
  function getLnIncentiveTokenAddress() external view returns (address);
  function isListed(address) external view returns (bool);
  function isRainMaker() external view returns (bool);
  function isRetired() external view returns (bool);
  function lnIncentiveTokenAddress() external view returns (address);
  function pendingAdmin() external view returns (address);
  function retire(bytes memory params) external;
  function retireRainMaker() external;
  function updateCompBorrowIndex(address cToken, uint256 marketBorrowIndex_) external;
  function updateCompSupplyIndex(address cToken) external;
}
