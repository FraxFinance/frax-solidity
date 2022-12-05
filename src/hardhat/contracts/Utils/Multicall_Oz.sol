// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (utils/Multicall.sol)

pragma solidity ^0.8.0;

import "./Address_8.sol";

/**
 * @dev Provides a function to batch together multiple calls in a single external call.
 *
 * _Available since v4.1._
 */
contract Multicall_Oz {
    /**
     * @dev Receives and executes a batch of function calls on the target contract.
     */
    function multicall(address target_address, bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = Address_8.functionDelegateCall(target_address, data[i]);
        }
        return results;
    }

    /**
     * @dev Receives and executes a batch of function calls on the target contract(s).
     */
    function multicallMany(address[] memory target_addresses, bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = Address_8.functionDelegateCall(target_addresses[i], data[i]);
        }
        return results;
    }

    /**
     * @dev Receives and executes a batch of function calls on this contract.
     */
    function multicallThis(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = Address_8.functionDelegateCall(address(this), data[i]);
        }
        return results;
    }
}