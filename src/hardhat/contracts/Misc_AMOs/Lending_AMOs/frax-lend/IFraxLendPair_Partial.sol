// SPDX-License-Identifier: ISC

pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import '../../../ERC20/IERC20.sol';

interface IFraxLendPair_Partial is IERC20{
  
  // View Functions
  function assetContract () external view returns (address);
  function collateralContract () external view returns (address);

  function userCollateralBalance (address) external view returns (uint256); // amount of collateral each user is backed
  function userBorrowShares (address) external view returns (uint256); // represents the shares held by individuals

  function totalAsset () external view returns (uint128 amount, uint128 shares); // amount = total amount of assets, shares = total shares outstanding
  function totalBorrow () external view returns (uint128 amount, uint128 shares); // amount = amounts with interest accrued, shares = total shares outstanding
  function totalCollateral () external view returns (uint256);  // total amount of collateral in facontract
  
  function addInterest() external returns (uint256 _interestEarned);

  // Lending related Functions
  function deposit(uint256 _amount, address _receiver) external returns (uint256 _sharesReceived);
  function mint(uint256 _shares, address _receiver) external returns (uint256 _amountReceived);
  
  function redeem(uint256 _shares, address _receiver, address _owner) external returns (uint256 _amountToReturn);
  function withdraw(uint256 _amount, address _receiver, address _owner) external returns (uint256 _shares);
  
  // Borrowing related Functions
  function borrowAsset(uint256 _borrowAmount, uint256 _collateralAmount, address _recipient) external returns (uint256 _shares);
  function repayAsset(address _borrower, uint256 _shares) external returns (uint256 _amountToRepay);
  function removeCollateral(uint256 _collateralAmount, address _recipient) external;

  function setApprovedLenders(address[] calldata _lenders, bool _approval) external;
  function setApprovedBorrowers(address[] calldata _borrowers, bool _approval) external;

}
