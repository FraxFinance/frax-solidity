// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../CrossChainBridgeBacker.sol";
import "./IBridgeToken.sol";

contract CrossChainBridgeBacker_AVAX_AnySwap is CrossChainBridgeBacker {
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
        // [Avalanche]
        if (token_type == 0){
            // anyFRAX -> L1 FRAX
            // Swapout
            // AnySwap Bridge
            anyFRAX.Swapout(token_amount, address_to_send_to);
        }
        else if (token_type == 1) {
            // anyFXS -> L1 FXS
            // Swapout
            // AnySwap Bridge
            anyFXS.Swapout(token_amount, address_to_send_to);
        }
        else {
            // USDC.e -> L1 USDC
            // Unwrap
            // AEB / Official Avalanche Bridge
            // NOTE: THIS WILL FAIL. THE AEB DOES NOT SUPPORT CONTRACT ADDRESSES
            IBridgeToken(address(collateral_token)).unwrap(token_amount, 0);
        }
    }
}
