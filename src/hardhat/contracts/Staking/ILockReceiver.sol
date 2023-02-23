// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface ILockReceiver {
    function beforeLockTransfer(
        address _sender,
        address _receiver,
        uint256 _lockId,
        bytes calldata _data
    ) external returns (bytes4);

    function onLockReceived(
        address _sender,
        address _receiver,
        uint256 _lockId,
        bytes calldata _data
    ) external returns (bytes4);
}