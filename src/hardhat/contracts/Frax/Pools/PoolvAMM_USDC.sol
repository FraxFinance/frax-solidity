// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

import "./FraxPoolvAMM.sol";

contract PoolvAMM_USDC is FraxPoolvAMM {
    address public USDC_address;
    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        address _uniswap_factory_address,
        address _fxs_usdc_oracle_addr,
        uint256 _pool_ceiling
    ) 
    FraxPoolvAMM(_frax_contract_address, _fxs_contract_address, _collateral_address, _creator_address, _timelock_address, _uniswap_factory_address, _fxs_usdc_oracle_addr, _pool_ceiling)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        USDC_address = _collateral_address;
    }
}
