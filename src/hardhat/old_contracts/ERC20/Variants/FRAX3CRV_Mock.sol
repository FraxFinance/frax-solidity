// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

import "../ERC20.sol";

contract FRAX3CRV_Mock is ERC20 {
    constructor () 
    ERC20("Curve.fi Factory USD Metapool: Frax", "FRAX3CRV-f")
    {}
}