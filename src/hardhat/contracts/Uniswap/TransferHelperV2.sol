// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

// helper methods for interacting with ERC20 tokens and sending ETH that do not consistently return true/false
library TransferHelperV2 {
    error TransferHelperApproveFailed();
    error TransferHelperTransferFailed();
    error TransferHelperTransferFromFailed();
    error TransferHelperTransferETHFailed();
    function safeApprove(address token, address to, uint value) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        // require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: APPROVE_FAILED');
        if(!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferHelperApproveFailed();
    }

    function safeTransfer(address token, address to, uint value) internal {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        // require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FAILED');
        if(!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferHelperTransferFailed();
    }

    function safeTransferFrom(address token, address from, address to, uint value) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        // require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FROM_FAILED');
        if(!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferHelperTransferFromFailed();
    }

    function safeTransferETH(address to, uint value) internal {
        (bool success,) = to.call{value:value}(new bytes(0));
        // require(success, 'TransferHelper: ETH_TRANSFER_FAILED');
        if(!success) revert TransferHelperTransferETHFailed();
    }
}