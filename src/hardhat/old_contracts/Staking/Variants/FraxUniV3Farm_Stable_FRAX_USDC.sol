// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../FraxUniV3Farm_Stable.sol";

contract FraxUniV3Farm_Stable_FRAX_USDC is FraxUniV3Farm_Stable {
    constructor (
        address _owner,
        address _lp_pool_address,
        address _timelock_address,
        address _rewards_distributor_address,
        int24 _uni_tick_lower,
        int24 _uni_tick_upper,
        int24 _uni_ideal_tick
    ) 
    FraxUniV3Farm_Stable(_owner, _lp_pool_address, _timelock_address, _rewards_distributor_address, _uni_tick_lower, _uni_tick_upper, _uni_ideal_tick)
    {}
}
