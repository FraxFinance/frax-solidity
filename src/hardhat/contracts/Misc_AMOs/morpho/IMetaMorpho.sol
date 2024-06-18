// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IMetaMorpho {

    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    struct MarketAllocation {
        /// @notice The market to allocate.
        MarketParams marketParams;
        /// @notice The amount of assets to allocate.
        uint256 assets;
    }

    function DECIMALS_OFFSET (  ) external view returns ( uint8 );
    function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
    function MORPHO (  ) external view returns ( address );
    function acceptCap ( MarketParams memory marketParams ) external;
    function acceptGuardian (  ) external;
    function acceptOwnership (  ) external;
    function acceptTimelock (  ) external;
    function allowance ( address owner, address spender ) external view returns ( uint256 );
    function approve ( address spender, uint256 value ) external returns ( bool );
    function asset (  ) external view returns ( address );
    function balanceOf ( address account ) external view returns ( uint256 );
    function config ( bytes32 ) external view returns ( uint184 cap, bool enabled, uint64 removableAt );
    function convertToAssets ( uint256 shares ) external view returns ( uint256 );
    function convertToShares ( uint256 assets ) external view returns ( uint256 );
    function curator (  ) external view returns ( address );
    function decimals (  ) external view returns ( uint8 );
    function deposit ( uint256 assets, address receiver ) external returns ( uint256 shares );
    function eip712Domain (  ) external view returns ( bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions );
    function fee (  ) external view returns ( uint96 );
    function feeRecipient (  ) external view returns ( address );
    function guardian (  ) external view returns ( address );
    function isAllocator ( address ) external view returns ( bool );
    function lastTotalAssets (  ) external view returns ( uint256 );
    function maxDeposit ( address ) external view returns ( uint256 );
    function maxMint ( address ) external view returns ( uint256 );
    function maxRedeem ( address owner ) external view returns ( uint256 );
    function maxWithdraw ( address owner ) external view returns ( uint256 assets );
    function mint ( uint256 shares, address receiver ) external returns ( uint256 assets );
    function multicall ( bytes[] memory data ) external returns ( bytes[] memory results );
    function name (  ) external view returns ( string memory );
    function nonces ( address owner ) external view returns ( uint256 );
    function owner (  ) external view returns ( address );
    function pendingCap ( bytes32 ) external view returns ( uint192 value, uint64 validAt );
    function pendingGuardian (  ) external view returns ( address value, uint64 validAt );
    function pendingOwner (  ) external view returns ( address );
    function pendingTimelock (  ) external view returns ( uint192 value, uint64 validAt );
    function permit ( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
    function previewDeposit ( uint256 assets ) external view returns ( uint256 );
    function previewMint ( uint256 shares ) external view returns ( uint256 );
    function previewRedeem ( uint256 shares ) external view returns ( uint256 );
    function previewWithdraw ( uint256 assets ) external view returns ( uint256 );
    function reallocate ( MarketAllocation[] memory allocations ) external;
    function redeem ( uint256 shares, address receiver, address owner ) external returns ( uint256 assets );
    function renounceOwnership (  ) external;
    function revokePendingCap ( bytes32 id ) external;
    function revokePendingGuardian (  ) external;
    function revokePendingMarketRemoval ( bytes32 id ) external;
    function revokePendingTimelock (  ) external;
    function setCurator ( address newCurator ) external;
    function setFee ( uint256 newFee ) external;
    function setFeeRecipient ( address newFeeRecipient ) external;
    function setIsAllocator ( address newAllocator, bool newIsAllocator ) external;
    function setSkimRecipient ( address newSkimRecipient ) external;
    function setSupplyQueue ( bytes32[] memory newSupplyQueue ) external;
    function skim ( address token ) external;
    function skimRecipient (  ) external view returns ( address );
    function submitCap ( MarketParams memory marketParams, uint256 newSupplyCap ) external;
    function submitGuardian ( address newGuardian ) external;
    function submitMarketRemoval ( MarketParams memory marketParams ) external;
    function submitTimelock ( uint256 newTimelock ) external;
    function supplyQueue ( uint256 ) external view returns ( bytes32 );
    function supplyQueueLength (  ) external view returns ( uint256 );
    function symbol (  ) external view returns ( string memory );
    function timelock (  ) external view returns ( uint256 );
    function totalAssets (  ) external view returns ( uint256 assets );
    function totalSupply (  ) external view returns ( uint256 );
    function transfer ( address to, uint256 value ) external returns ( bool );
    function transferFrom ( address from, address to, uint256 value ) external returns ( bool );
    function transferOwnership ( address newOwner ) external;
    function updateWithdrawQueue ( uint256[] memory indexes ) external;
    function withdraw ( uint256 assets, address receiver, address owner ) external returns ( uint256 shares );
    function withdrawQueue ( uint256 ) external view returns ( bytes32 );
    function withdrawQueueLength (  ) external view returns ( uint256 );
}
