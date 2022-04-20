// SPDX-License-Identifier: ISC

pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;


interface IFraxLendPairDeployer_Partial {
  function deploy(
      address _asset,
      address _collateral,
      address _oracleTop,
      address _oracleDiv,
      uint256 _oracleNormalization,
      address _rateContract,
      bytes calldata _rateInitCallData
  ) external returns (address cloneAddress);
}
