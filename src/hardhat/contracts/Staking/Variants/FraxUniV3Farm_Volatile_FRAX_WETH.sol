// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../FraxUniV3Farm_Volatile.sol";

contract FraxUniV3Farm_Volatile_FRAX_WETH is FraxUniV3Farm_Volatile {
    constructor(
        address _owner,
        address _lp_pool_address,
        address _timelock_address,
        address _gauge_controller_address,
        address _rewards_distributor_address,
        int24 _uni_tick_lower,
        int24 _uni_tick_upper,
        int24 _uni_ideal_tick,
        int24 _min_tick_range_width
    ) 
    FraxUniV3Farm_Volatile(_owner, _lp_pool_address, _timelock_address, _gauge_controller_address, _rewards_distributor_address, _uni_tick_lower, _uni_tick_upper, _uni_ideal_tick, _min_tick_range_width)
    {}
}
