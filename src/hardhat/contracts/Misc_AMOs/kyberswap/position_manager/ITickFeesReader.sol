// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ITickFeesReader {
  function getAllTicks ( address pool ) external view returns ( int24[] memory allTicks );
  function getNearestInitializedTicks ( address pool, int24 tick ) external view returns ( int24 previous, int24 next );
  function getTicksInRange ( address pool, int24 startTick, uint32 length ) external view returns ( int24[] memory allTicks );
  function getTotalFeesOwedToPosition ( address posManager, address pool, uint256 tokenId ) external view returns ( uint256 token0Owed, uint256 token1Owed );
  function getTotalRTokensOwedToPosition ( address posManager, address pool, uint256 tokenId ) external view returns ( uint256 rTokenOwed );
}
