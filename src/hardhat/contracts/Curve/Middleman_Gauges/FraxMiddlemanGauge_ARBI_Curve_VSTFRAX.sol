// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../FraxMiddlemanGauge.sol";

contract FraxMiddlemanGauge_ARBI_Curve_VSTFRAX is FraxMiddlemanGauge {
    constructor (
        address _owner,
        address _timelock_address,
        address _rewards_distributor_address,
        address _bridge_address,
        uint256 _bridge_type,
        address _destination_address_override,
        string memory _non_evm_destination_address,
        string memory _name
    ) 
    FraxMiddlemanGauge(_owner, _timelock_address, _rewards_distributor_address, _bridge_address, _bridge_type, _destination_address_override, _non_evm_destination_address, _name)
    {}
}
