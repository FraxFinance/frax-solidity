// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ICurveVault {
  function MAX () external view returns (uint256);
  function accumulatedFee () external view returns (uint256);
  function allowance (address owner, address spender) external view returns (uint256);
  function approve (address spender, uint256 amount) external returns (bool);
  function available () external view returns (uint256);
  function balanceOf (address account) external view returns (uint256);
  function curveStrategy () external view returns (address);
  function decimals () external view returns (uint8);
  function decreaseAllowance (address spender, uint256 subtractedValue) external returns (bool);
  function deposit (address _staker, uint256 _amount, bool _earn) external;
  function governance () external view returns (address);
  function increaseAllowance (address spender, uint256 addedValue) external returns (bool);
  function init (address _token, address _governance, string memory name_, string memory symbol_, address _curveStrategy) external;
  function keeperFee () external view returns (uint256);
  function liquidityGauge () external view returns (address);
  function min () external view returns (uint256);
  function name () external view returns (string memory);
  function setCurveStrategy (address _newStrat) external;
  function setGovernance (address _governance) external;
  function setKeeperFee (uint256 _newFee) external;
  function setLiquidityGauge (address _liquidityGauge) external;
  function setMin (uint256 _min) external;
  function setWithdrawnFee (uint256 _newFee) external;
  function symbol () external view returns (string memory);
  function token () external view returns (address);
  function totalSupply () external view returns (uint256);
  function transfer (address to, uint256 amount) external returns (bool);
  function transferFrom (address from, address to, uint256 amount) external returns (bool);
  function withdraw (uint256 _shares) external;
  function withdrawAll () external;
  function withdrawalFee () external view returns (uint256);
}
