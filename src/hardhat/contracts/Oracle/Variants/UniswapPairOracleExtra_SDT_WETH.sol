// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

import '../UniswapPairOracleExtra.sol';

// Fixed window oracle that recomputes the average price for the entire period once every period
// Note that the price average is only guaranteed to be over at least 1 period, but may be over a longer period
contract UniswapPairOracleExtra_SDT_WETH is UniswapPairOracleExtra {
    constructor (
        address pair_address, 
        address owner_address, 
        address timelock_address,
        string memory description,
        address address_to_consult
    ) 
    UniswapPairOracleExtra(pair_address, owner_address, timelock_address, description, address_to_consult) 
    {}
}