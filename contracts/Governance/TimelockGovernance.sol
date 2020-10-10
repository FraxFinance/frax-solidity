// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;

import "./Timelock.sol";

contract TimelockGovernance is Timelock {
    constructor (address admin_, uint delay_) 
    Timelock(admin_, delay_)
    public {}
}