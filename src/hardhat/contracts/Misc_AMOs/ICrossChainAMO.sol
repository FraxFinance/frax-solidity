// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface ICrossChainAMO {
    function allDollarBalances() external view returns (uint256 frax_val_e18, uint256 fxs_val_e18, uint256 collat_val_e18, uint256 total_val_e18);
}
