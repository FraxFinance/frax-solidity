//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

interface IFPI {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function fpi_pools(address ) external view returns (bool);
    function fpi_pools_array(uint256 ) external view returns (address);

    function pool_burn_from(address b_address, uint256 b_amount ) external;
    function pool_mint(address m_address, uint256 m_amount ) external;
}