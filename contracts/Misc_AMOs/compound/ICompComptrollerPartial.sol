// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

// Original at https://etherscan.io/address/0xbe7616B06f71e363A310Aa8CE8aD99654401ead7#code
// Address [0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B] used is a proxy
// Some functions were omitted for brevity. See the contract for details


interface ICompComptrollerPartial {
    function claimComp(address holder) external;
    function claimComp(address holder, address[] memory cTokens) external;
}
