// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

import "./FraxPool.sol";

contract Pool_USDC is FraxPool {
    address public USDC_address;
    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        uint256 _pool_ceiling
    ) 
    FraxPool(_frax_contract_address, _fxs_contract_address, _collateral_address, _creator_address, _timelock_address, _pool_ceiling)
    public {
        require(_collateral_address != address(0), "Zero address detected");

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        USDC_address = _collateral_address;
    }
}
