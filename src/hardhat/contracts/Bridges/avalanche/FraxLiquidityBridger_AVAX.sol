// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

import "../FraxLiquidityBridger.sol";

contract FraxLiquidityBridger_AVAX is FraxLiquidityBridger {
    constructor (
        address _owner,
        address _timelock_address,
        address _amo_minter_address,
        address _frax_fxs_bridge_address,
        address _collateral_bridge_address,
        uint256 _bridge_id,
        address _destination_address_override,
        string memory _non_evm_destination_address,
        string memory _name
    ) 
    FraxLiquidityBridger(_owner, _timelock_address, _amo_minter_address, _frax_fxs_bridge_address, _collateral_bridge_address, _bridge_id, _destination_address_override, _non_evm_destination_address, _name)
    {}
}
