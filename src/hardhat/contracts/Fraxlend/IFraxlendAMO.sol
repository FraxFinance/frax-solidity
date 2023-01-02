//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


interface IFraxlendAMO {
  function FRAX (  ) external view returns ( address );
  function PRICE_PRECISION (  ) external view returns ( uint256 );
  function accrueInterestAllFraxlendPair (  ) external;
  function accrueInterestFraxlendPair ( address _pairAddress ) external;
  function addCollateralToPair ( address _pairAddress, uint256 _fraxAmount ) external;
  function amoMinter (  ) external view returns ( address );
  function borrowPairsArray ( uint256 ) external view returns ( address );
  function borrowPairsCollateralFrax ( address ) external view returns ( uint256 );
  function borrowPairsInitialized ( address ) external view returns ( bool );
  function borrowPairsMaxCollateral ( address ) external view returns ( uint256 );
  function borrowPairsMaxLTV ( address ) external view returns ( uint256 );
  function burnFRAX ( uint256 _fraxAmount ) external;
  function depositToPair ( address _pairAddress, uint256 _fraxAmount ) external;
  function dollarBalances (  ) external view returns ( uint256 fraxValE18, uint256 collatValE18 );
  function execute ( address _to, uint256 _value, bytes memory _data ) external returns ( bool, bytes memory );
  function fraxlendPairDeployer (  ) external view returns ( address );
  function fraxlendPairHelper (  ) external view returns ( address );
  function mintedBalance (  ) external view returns ( int256 );
  function openBorrowPosition ( address _pairAddress, uint256 _fraxAmount, uint256 _borrowAmount ) external;
  function operatorAddress (  ) external view returns ( address );
  function owner (  ) external view returns ( address );
  function pairsArray ( uint256 ) external view returns ( address );
  function pairsInitialized ( address ) external view returns ( bool );
  function pairsMaxAllocation ( address ) external view returns ( uint256 );
  function pairsMintedFrax ( address ) external view returns ( uint256 );
  function pairsProfitTaken ( address ) external view returns ( uint256 );
  function recoverERC20 ( address _tokenAddress, uint256 _tokenAmount ) external;
  function removeCollateralFromPair ( address _pairAddress, uint256 _fraxAmount ) external;
  function renounceOwnership (  ) external;
  function repayBorrowPosition ( address _pairAddress, uint256 _shares ) external;
  function repayBorrowPositionWithCollateral ( address _pairAddress, address _swapperAddress, uint256 _collateralToSwap, uint256 _amountAssetOutMin, address[] memory _path ) external returns ( uint256 _amountAssetOut );
  function setAMOMinter ( address _newAmoMinterAddress ) external;
  function setBorrowPair ( address _pairAddress, uint256 _maxCollateral, uint256 _maxLTV ) external;
  function setFraxlendPairDeployer ( address _newFraxlendPairDeployerAddress ) external;
  function setFraxlendPairHelper ( address _newFraxlendPairHelperAddress ) external;
  function setOperatorAddress ( address _newOperatorAddress ) external;
  function setPair ( address _pairAddress, uint256 _maxAllocation ) external;
  function showAllocations (  ) external view returns ( uint256[4] memory _allocations );
  function showBorrowPairAccounting ( address _pairAddress ) external view returns ( uint256[4] memory _allocations );
  function showPairAccounting ( address _pairAddress ) external view returns ( uint256[5] memory _allocations );
  function transferOwnership ( address newOwner ) external;
  function withdrawFromPair ( address _pairAddress, uint256 _shares ) external returns ( uint256 _amountWithdrawn );
  function withdrawMaxFromAllPairs (  ) external;
  function withdrawMaxFromPair ( address _pairAddress ) external returns ( uint256 _amountWithdrawn );
}
