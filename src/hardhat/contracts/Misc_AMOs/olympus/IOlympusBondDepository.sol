// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IOlympusBondDepository {
  function DAO() external view returns (address);
  function OHM() external view returns (address);
  function adjustment() external view returns (bool add, uint256 rate, uint256 target);
  function bondCalculator() external view returns (address);
  function bondInfo (address) external view returns (uint256 valueRemaining, uint256 payoutRemaining, uint256 vestingPeriod, uint256 lastBlock, uint256 pricePaid);
  function bondPrice() external view returns (uint256 price_);
  function bondPriceInUSD() external view returns (uint256 price_);
  function debtRatio() external view returns (uint256 debtRatio_);
  function deposit (uint256 _amount, uint256 _maxPrice, address _depositor) external returns (uint256);
  function initializeBondTerms (uint256 _controlVariable, uint256 _vestingTerm, uint256 _minimumPrice, uint256 _maxPayout, uint256 _fee, uint256 _maxDebt) external;
  function isLiquidityBond() external view returns (bool);
  function manager() external view returns (address);
  function maxPayout() external view returns (uint256);
  function payoutFor (uint256 _value) external view returns (uint256);
  function pendingPayoutFor (address _depositor) external view returns (uint256 pendingPayout_);
  function percentVestedFor (address _depositor) external view returns (uint256 percentVested_);
  function principle() external view returns (address);
  function pullManagement() external;
  function pushManagement (address newOwner_) external;
  function recoverLostToken (address _token) external returns (bool);
  function redeem (bool _stake) external returns (uint256);
  function renounceManagement() external;
  function setAdjustment (bool _addition, uint256 _increment, uint256 _target) external;
  function setBondTerms (uint8 _parameter, uint256 _input) external;
  function setStaking (address _staking) external;
  function staking() external view returns (address);
  function terms() external view returns (uint256 controlVariable, uint256 vestingTerm, uint256 minimumPrice, uint256 maxPayout, uint256 fee, uint256 maxDebt);
  function totalDebt() external view returns (uint256);
  function treasury() external view returns (address);
}