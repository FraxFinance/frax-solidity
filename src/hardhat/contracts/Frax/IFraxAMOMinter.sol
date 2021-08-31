// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IFraxAMOMinter {
    function mintFraxForAMO(address destination_amo, uint256 frax_amount) external;
    function custodian_address() external view returns (address);
    function timelock_address() external view returns (address);
    function mint_balances(address amo_address) external view returns (int256);
    function collat_borrowed_balances(address amo_address) external view returns (int256);
    function unspentProfitGlobal() external view returns (uint256);
    function receiveCollatFromAMO(uint256 usdc_amount) external;
    function burnFraxFromAMO(uint256 frax_amount) external;
    function burnFxsFromAMO(uint256 fxs_amount) external;
}