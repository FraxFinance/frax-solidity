// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface ILockReceiver {
    function beforeLockTransfer(
        address _sender,
        address _receiver,
<<<<<<< HEAD
        uint256 _lockId,
=======
        bytes32 _lockId,
>>>>>>> 93e23e7 (basic transferLocked erc20 (#165))
        bytes calldata _data
    ) external returns (bytes4);

    function onLockReceived(
        address _sender,
        address _receiver,
<<<<<<< HEAD
        uint256 _lockId,
=======
        bytes32 _lockId,
>>>>>>> 93e23e7 (basic transferLocked erc20 (#165))
        bytes calldata _data
    ) external returns (bytes4);
}