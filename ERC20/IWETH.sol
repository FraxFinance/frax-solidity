// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address src, address dst, uint wad) external returns (bool);
    function withdraw(uint) external;
}