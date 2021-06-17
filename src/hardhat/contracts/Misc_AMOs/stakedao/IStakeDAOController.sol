// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IStakeDAOController {
  function approveStrategy(address _token, address _strategy) external;
  function approvedStrategies(address, address) external view returns (bool);
  function balanceOf(address _token) external view returns (uint256);
  function converters(address, address) external view returns (address);
  function earn(address _token, uint256 _amount) external;
  function getExpectedReturn(address _strategy, address _token, uint256 parts) external view returns (uint256 expected);
  function governance() external view returns (address);
  function inCaseStrategyTokenGetStuck(address _strategy, address _token) external;
  function inCaseTokensGetStuck(address _token, uint256 _amount) external;
  function max() external view returns (uint256);
  function onesplit() external view returns (address);
  function revokeStrategy(address _token, address _strategy) external;
  function rewards() external view returns (address);
  function setConverter(address _input, address _output, address _converter) external;
  function setGovernance(address _governance) external;
  function setOneSplit(address _onesplit) external;
  function setRewards(address _rewards) external;
  function setSplit(uint256 _split) external;
  function setStrategist(address _strategist) external;
  function setStrategy(address _token, address _strategy) external;
  function setVault(address _token, address _vault) external;
  function split() external view returns (uint256);
  function strategies(address) external view returns (address);
  function strategist() external view returns (address);
  function vaults(address) external view returns (address);
  function withdraw(address _token, uint256 _amount) external;
  function withdrawAll(address _token) external;
  function yearn(address _strategy, address _token, uint256 parts) external;
}

