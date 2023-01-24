// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPoolRegistry {
    /* Structs */

    struct PoolInputData {
        address poolAddress;
        uint8 typeOfAsset;
        bytes32 poolName;
        address targetAddress;
        address metaSwapDepositAddress;
        bool isSaddleApproved;
        bool isRemoved;
        bool isGuarded;
    }

    struct PoolData {
        address poolAddress;
        address lpToken;
        uint8 typeOfAsset;
        bytes32 poolName;
        address targetAddress;
        IERC20[] tokens;
        IERC20[] underlyingTokens;
        address basePoolAddress;
        address metaSwapDepositAddress;
        bool isSaddleApproved;
        bool isRemoved;
        bool isGuarded;
    }

    struct SwapStorageData {
        uint256 initialA;
        uint256 futureA;
        uint256 initialATime;
        uint256 futureATime;
        uint256 swapFee;
        uint256 adminFee;
        address lpToken;
    }

    /* Public Variables */

    /**
     * @notice Returns the index + 1 of the pool address in the registry
     * @param poolAddress address to look for
     */
    function poolsIndexOfPlusOne(address poolAddress)
        external
        returns (uint256);

    /**
     * @notice Returns the index + 1 of the pool name in the registry
     * @param poolName pool name in bytes32 format to look for
     */
    function poolsIndexOfNamePlusOne(bytes32 poolName)
        external
        returns (uint256);

    /* Functions */

    /**
     * @notice Add a new pool to the registry
     * @param inputData PoolInputData struct for the new pool
     * @dev Before adding a meta pool, the user must first add the underlying base pool.
     * Only Swap and MetaSwap contracts need to be added.
     */
    function addPool(PoolInputData memory inputData) external payable;

    /**
     * @notice Add a new pool to the registry
     * @param data PoolInputData struct for the new pool
     * @dev Before adding a meta pool, the user must first add the underlying base pool.
     * Only Swap and MetaSwap contracts need to be added.
     */
    function addCommunityPool(PoolData memory data) external payable;

    /**
     * @notice Approve community deployed pools to be upgraded as Saddle owned
     * @dev since array entries are difficult to remove, we modify the entry to mark it
     * as a Saddle owned pool.
     * @param poolAddress address of the community pool
     */
    function approvePool(address poolAddress) external payable;

    /**
     * @notice Overwrite existing entry with new PoolData
     * @param poolData new PoolData struct to store
     */
    function updatePool(PoolData memory poolData) external payable;

    /**
     * @notice Remove pool from the registry
     * @dev Since arrays are not easily reducable, the entry will be marked as removed.
     * @param poolAddress address of the pool to remove
     */
    function removePool(address poolAddress) external payable;

    /**
     * @notice Returns PoolData for given pool address
     * @param poolAddress address of the pool to read
     */
    function getPoolData(address poolAddress)
        external
        view
        returns (PoolData memory);

    /**
     * @notice Returns PoolData at given index
     * @param index index of the pool to read
     */
    function getPoolDataAtIndex(uint256 index)
        external
        view
        returns (PoolData memory);

    /**
     * @notice Returns PoolData with given name
     * @param poolName name of the pool to read
     */
    function getPoolDataByName(bytes32 poolName)
        external
        view
        returns (PoolData memory);

    /**
     * @notice Returns virtual price of the given pool address
     * @param poolAddress address of the pool to read
     */
    function getVirtualPrice(address poolAddress)
        external
        view
        returns (uint256);

    /**
     * @notice Returns A of the given pool address
     * @param poolAddress address of the pool to read
     */
    function getA(address poolAddress) external view returns (uint256);

    /**
     * @notice Returns the paused status of the given pool address
     * @param poolAddress address of the pool to read
     */
    function getPaused(address poolAddress) external view returns (bool);

    /**
     * @notice Returns the SwapStorage struct of the given pool address
     * @param poolAddress address of the pool to read
     */
    function getSwapStorage(address poolAddress)
        external
        view
        returns (SwapStorageData memory swapStorageData);

    /**
     * @notice Returns the tokens of the given pool address
     * @param poolAddress address of the pool to read
     */
    function getTokens(address poolAddress)
        external
        view
        returns (IERC20[] memory);

    /**
     * @notice Returns the underlying tokens of the given pool address. Base pools will return an empty array.
     * @param poolAddress address of the pool to read
     */
    function getUnderlyingTokens(address poolAddress)
        external
        view
        returns (IERC20[] memory);

    /**
     * @notice Returns number of entries in the registry. Includes removed pools
     * in the list as well.
     */
    function getPoolsLength() external view returns (uint256);

    /**
     * @notice Returns an array of pool addresses that can swap between from and to
     * @param from address of the token to swap from
     * @param to address of the token to swap to
     * @return eligiblePools array of pool addresses that can swap between from and to
     */
    function getEligiblePools(address from, address to)
        external
        view
        returns (address[] memory eligiblePools);

    /**
     * @notice Returns an array of balances of the tokens
     * @param poolAddress address of the pool to look up the token balances for
     * @return balances array of token balances
     */
    function getTokenBalances(address poolAddress)
        external
        view
        returns (uint256[] memory balances);

    /**
     * @notice Returns an array of balances of the tokens
     * @param poolAddress address of the pool to look up the token balances for
     * @return balances array of token balances
     */
    function getUnderlyingTokenBalances(address poolAddress)
        external
        view
        returns (uint256[] memory balances);
}