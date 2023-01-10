// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../CrossChainBridgeBacker.sol";
import "./IDiscretionaryExitBurn.sol";

contract CrossChainBridgeBacker_BOBA_BobaGateway is CrossChainBridgeBacker {
    constructor (
        address _owner,
        address _timelock_address,
        address _cross_chain_oracle_address,
        address[5] memory _token_addresses,
        address[3] memory _bridge_addresses,
        address _destination_address_override,
        string memory _non_evm_destination_address,
        string memory _name
    ) 
    CrossChainBridgeBacker(_owner, _timelock_address, _cross_chain_oracle_address, _token_addresses, _bridge_addresses, _destination_address_override, _non_evm_destination_address, _name)
    {}

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Boba]
        // https://github.com/omgnetwork/optimism-v2/blob/develop/packages/boba/gateway/src/services/networkService.js
        if (token_type == 0){
            // bobaFRAX -> L1 FRAX

            // Approve
            ERC20(address(anyFRAX)).approve(bridge_addresses[token_type], token_amount);

            // Burn and bridge
            IDiscretionaryExitBurn(bridge_addresses[token_type]).burnAndWithdraw(
                address(anyFRAX), 
                token_amount, 
                9999999, 
                ""
            );
        }
        else if (token_type == 1) {
            // bobaFXS -> L1 FXS

            // Approve
            ERC20(address(anyFXS)).approve(bridge_addresses[token_type], token_amount);

            // Burn and bridge
            IDiscretionaryExitBurn(bridge_addresses[token_type]).burnAndWithdraw(
                address(anyFXS), 
                token_amount, 
                9999999, 
                ""
            );
        }
        else {
            // bobaUSDC -> L1 USDC
            
            // Approve
            ERC20(address(collateral_token)).approve(bridge_addresses[token_type], token_amount);

            // Burn and bridge
            IDiscretionaryExitBurn(bridge_addresses[token_type]).burnAndWithdraw(
                address(collateral_token), 
                token_amount, 
                9999999, 
                ""
            );
        }
    }
}
