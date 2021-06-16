// SPDX-License-Identifier: NONE
pragma solidity >=0.6.11;

interface IStakingHelper {
  function OHM() external view returns (address);
  function stake(uint256 _amount) external;
  function staking() external view returns (address);
}