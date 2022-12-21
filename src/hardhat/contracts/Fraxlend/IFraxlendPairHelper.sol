// SPDX-License-Identifier: ISC
pragma solidity >=0.8.0;

interface IFraxlendPairHelper {
    struct ImmutablesAddressBool {
        bool _borrowerWhitelistActive;
        bool _lenderWhitelistActive;
        address _assetContract;
        address _collateralContract;
        address _oracleMultiply;
        address _oracleDivide;
        address _rateContract;
        address _DEPLOYER_CONTRACT;
        address _COMPTROLLER_ADDRESS;
        address _FRAXLEND_WHITELIST;
    }

    struct ImmutablesUint256 {
        uint256 _oracleNormalization;
        uint256 _maxLTV;
        uint256 _liquidationFee;
        uint256 _maturityDate;
        uint256 _penaltyRate;
    }

    struct VaultAccount {
        uint128 amount;
        uint128 shares;
    }

    function getImmutableAddressBool(address _fraxlendPairAddress) external view returns (ImmutablesAddressBool memory);

    function getImmutableUint256(address _fraxlendPairAddress) external view returns (ImmutablesUint256 memory);

    function getPairAccounting(address _fraxlendPairAddress)
        external
        view
        returns (
            uint128 _totalAssetAmount,
            uint128 _totalAssetShares,
            uint128 _totalBorrowAmount,
            uint128 _totalBorrowShares,
            uint256 _totalCollateral
        );

    function getUserSnapshot(address _fraxlendPairAddress, address _address)
        external
        view
        returns (
            uint256 _userAssetShares,
            uint256 _userBorrowShares,
            uint256 _userCollateralBalance
        );

    function previewLiquidatePure(
        address _fraxlendPairAddress,
        uint128 _sharesToLiquidate,
        address _borrower
    )
        external
        view
        returns (
            uint128 _amountLiquidatorToRepay,
            uint256 _collateralForLiquidator,
            uint128 _sharesToSocialize,
            uint128 _amountToSocialize
        );

    function previewRateInterest(
        address _fraxlendPairAddress,
        uint256 _timestamp,
        uint256 _blockNumber
    ) external view returns (uint256 _interestEarned, uint256 _newRate);

    function previewRateInterestFees(
        address _fraxlendPairAddress,
        uint256 _timestamp,
        uint256 _blockNumber
    )
        external
        view
        returns (
            uint256 _interestEarned,
            uint256 _feesAmount,
            uint256 _feesShare,
            uint256 _newRate
        );

    function previewTotalAsset(
        address _fraxlendPairAddress,
        uint256 _timestamp,
        uint256 _blockNumber
    ) external view returns (VaultAccount memory _previewTotalBorrow);

    function previewTotalBorrow(
        address _fraxlendPairAddress,
        uint256 _timestamp,
        uint256 _blockNumber
    ) external view returns (VaultAccount memory _previewTotalBorrow);

    function previewUpdateExchangeRate(address _fraxlendPairAddress) external view returns (uint256 _exchangeRate);

    function toAssetAmount(
        address _fraxlendPairAddress,
        uint256 _shares,
        uint256 _timestamp,
        uint256 _blockNumber,
        bool _roundUp
    )
        external
        view
        returns (
            uint256 _amount,
            uint256 _totalAmount,
            uint256 _totalShares
        );

    function toAssetShares(
        address _fraxlendPairAddress,
        uint256 _amount,
        uint256 _timestamp,
        uint256 _blockNumber,
        bool _roundUp
    )
        external
        view
        returns (
            uint256 _shares,
            uint256 _totalAmount,
            uint256 _totalShares
        );

    function toBorrowAmount(
        address _fraxlendPairAddress,
        uint256 _shares,
        uint256 _timestamp,
        uint256 _blockNumber,
        bool _roundUp
    )
        external
        view
        returns (
            uint256 _amount,
            uint256 _totalAmount,
            uint256 _totalShares
        );

    function toBorrowShares(
        address _fraxlendPairAddress,
        uint256 _amount,
        uint256 _timestamp,
        uint256 _blockNumber,
        bool _roundUp
    )
        external
        view
        returns (
            uint256 _shares,
            uint256 _totalAmount,
            uint256 _totalShares
        );

    function version() external view returns (string memory);
}