// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
import "./AnyswapV4ERC20.sol";

// Mock anyFRAX token
contract anyFRAX is AnyswapV4ERC20 {
    constructor (
        address _vault_address
    ) 
    AnyswapV4ERC20("anyFRAX", "anyFRAX", 18, 0x0000000000000000000000000000000000000000, _vault_address) 
    {}
}