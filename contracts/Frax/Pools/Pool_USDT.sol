// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "./FraxPool.sol";

contract Pool_USDT is FraxPool {
    address public USDT_address;
    constructor(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        uint256 _pool_ceiling
    ) 
    FraxPool(_frax_contract_address, _fxs_contract_address, _collateral_address, _creator_address, _timelock_address, _pool_ceiling)
    public {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        USDT_address = _collateral_address;
    }
}
