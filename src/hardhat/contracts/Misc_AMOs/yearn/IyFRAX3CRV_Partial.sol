// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
import '../../ERC20/IERC20.sol';

// Original at https://etherscan.io/address/0x2c7796c0590cc100d70af473993890d457cb2ac9#code
// Address [0x83D2944d5fC10A064451Dc5852f4F47759F249B6] used is a proxy

interface IyFRAX3CRV_Partial is IERC20 {
    function coins(uint256 i) external view returns (address);
    function get_virtual_price() external view returns (uint256);
    // def calc_token_amount(amounts: uint256[BASE_N_COINS], deposit: bool) -> uint256: view
    // def calc_withdraw_one_coin(_token_amount: uint256, i: int128) -> uint256: view
    // def fee() -> uint256: view
    // def get_dy(i: int128, j: int128, dx: uint256) -> uint256: view
    // def exchange(i: int128, j: int128, dx: uint256, min_dy: uint256): nonpayable
    // def add_liquidity(amounts: uint256[BASE_N_COINS], min_mint_amount: uint256): nonpayable
    // def remove_liquidity_one_coin(_token_amount: uint256, i: int128, min_amount: uint256): nonpayable
}
