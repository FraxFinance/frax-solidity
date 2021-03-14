// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

// Original at https://etherscan.io/address/0xF8ce90c2710713552fb564869694B2505Bfc0846#code
// Some functions were omitted for brevity. See the contract for details

interface IHARVESTDepositHelper_Partial {
    function depositAll(uint256[] memory amounts, address[] memory vaultAddresses) external;
}
