// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IEvmErc20V2 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);

    function setMetadata(string memory metadata_name, string memory metadata_symbol, uint8 metadata_decimals) external;
    function mint(address account, uint256 amount) external;
    function withdrawToNear(bytes memory recipient, uint256 amount) external;
    function withdrawToEthereum(address recipient, uint256 amount) external;
}