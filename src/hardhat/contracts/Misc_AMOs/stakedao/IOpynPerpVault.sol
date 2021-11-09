// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IOpynPerpVault {
  function BASE() external view returns (uint256);
  function BASE_COINS(uint256) external view returns (address);
  function actions(uint256) external view returns (address);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function cap() external view returns (uint256);
  function closePositions() external;
  function curveLPToken() external view returns (address);
  function curveMetaZap() external view returns (address);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function depositCrvLP(uint256 amount) external;
  function depositUnderlying(uint256 amount, uint256 minCrvLPToken, uint256 indexOfAsset) external;
  function emergencyPause() external;
  function feeRecipient() external view returns (address);
  function getSharesByDepositAmount(uint256 _amount) external view returns (uint256);
  function getWithdrawAmountByShares(uint256 _shares) external view returns (uint256);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function name() external view returns (string memory);
  function owner() external view returns (address);
  function renounceOwnership() external;
  function resumeFromPause() external;
  function rollOver(uint256[] memory _allocationPercentages) external;
  function sdTokenAddress() external view returns (address);
  function setActions(address[] memory _actions) external;
  function setCap(uint256 _newCap) external;
  function setWithdrawReserve(uint256 _reserve) external;
  function setWithdrawalFeePercentage(uint256 _newWithdrawalFeePercentage) external;
  function setWithdrawalFeeRecipient(address _newWithdrawalFeeRecipient) external;
  function state() external view returns (uint8);
  function stateBeforePause() external view returns (uint8);
  function symbol() external view returns (string memory);
  function totalStakedaoAsset() external view returns (uint256);
  function totalSupply() external view returns (uint256);
  function totalUnderlyingControlled() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership(address newOwner) external;
  function wantedAsset() external view returns (address);
  function withdrawCrvLp(uint256 _share) external;
  function withdrawReserve() external view returns (uint256);
  function withdrawUnderlying(uint256 _share, uint256 _minUnderlying) external;
  function withdrawalFeePercentage() external view returns (uint256);
}
