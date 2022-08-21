// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IFraxswapFactory {
  function allPairs ( uint256 ) external view returns ( address );
  function allPairsLength (  ) external view returns ( uint256 );
  function createPair ( address tokenA, address tokenB, uint256 fee ) external returns ( address pair );
  function createPair ( address tokenA, address tokenB ) external returns ( address pair );
  function feeTo (  ) external view returns ( address );
  function feeToSetter (  ) external view returns ( address );
  function getPair ( address, address ) external view returns ( address );
  function globalPause (  ) external view returns ( bool );
  function setFeeTo ( address _feeTo ) external;
  function setFeeToSetter ( address _feeToSetter ) external;
  function toggleGlobalPause (  ) external;
}