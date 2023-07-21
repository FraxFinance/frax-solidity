//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IFPIControllerPool {
  function redeemFPI(uint256 fpi_in, uint256 min_frax_out) external returns (uint256 frax_out);
}

