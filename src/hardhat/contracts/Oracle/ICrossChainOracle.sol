// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ICrossChainOracle {
    // Returns in USD E6
    function getPrice(address token_address) external view returns (uint256 token_price);
}
