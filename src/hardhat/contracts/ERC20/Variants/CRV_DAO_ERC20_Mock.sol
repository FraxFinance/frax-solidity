// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

import "../ERC20.sol";

contract CRV_DAO_ERC20_Mock is ERC20 {
    constructor () 
    ERC20("Curve DAO Token", "CRV")
    {}
}