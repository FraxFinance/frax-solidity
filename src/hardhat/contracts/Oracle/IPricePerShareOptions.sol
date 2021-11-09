// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IPricePerShareOptions {
    // Compound-style [Comp, Cream, Rari, Scream]
    // Multiplied by 1e18
    function exchangeRateStored() external view returns (uint256);

    // Curve-style [Curve, Convex, NOT StakeDAO]
    // In 1e18
    function get_virtual_price() external view returns (uint256);

    // SaddleD4Pool (SwapFlashLoan)
    function getVirtualPrice() external view returns (uint256);

    // StakeDAO
    function getPricePerFullShare() external view returns (uint256);

    // Yearn Vault
    function pricePerShare() external view returns (uint256);
}
