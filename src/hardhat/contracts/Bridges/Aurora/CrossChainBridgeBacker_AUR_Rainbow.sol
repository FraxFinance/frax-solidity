// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >= 0.8.0;

import "../CrossChainBridgeBacker.sol";
import "../../Misc_AMOs/aurora/IEvmErc20V2.sol";

contract CrossChainBridgeBacker_AUR_Rainbow is CrossChainBridgeBacker {
    
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
        // [Aurora]
        // To claim on mainnet, use https://rainbowbridge.app/restore
        if (token_type == 0){
            // https://explorer.mainnet.aurora.dev/tx/0x80f263c57867558a61a575821a0a913c00d7b7a2a72482dbceee97c297bfe476/token-transfers
            // rnbwFRAX -> L1 FRAX

            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // withdrawToEthereum
            IEvmErc20V2(bridge_addresses[token_type]).withdrawToEthereum(address_to_send_to, token_amount);
        }
        else if (token_type == 1) {
            // https://explorer.mainnet.aurora.dev/tx/0x139779a291c4c20f6e420c84faf2d280f28d85882fc40333a57aec0093674787/token-transfers
            // rnbwFXS -> L1 FXS
            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // withdrawToEthereum
            IEvmErc20V2(bridge_addresses[token_type]).withdrawToEthereum(address_to_send_to, token_amount);
        }
        else {
            // https://explorer.mainnet.aurora.dev/tx/0xc7ca80ff924b3e5fdd63e8f9aa2c734ab9f6c09b8de4a5b7726849c6bf48f470/token-transfers
            // rnbwUSDC -> L1 USDC
            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // withdrawToEthereum
            IEvmErc20V2(bridge_addresses[token_type]).withdrawToEthereum(address_to_send_to, token_amount);
        }
    }
}
