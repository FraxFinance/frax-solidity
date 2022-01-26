// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >= 0.8.0;

import "../CrossChainBridgeBacker.sol";
import "../../Misc_AMOs/moonbeam/IBridgeRouter.sol";

contract CrossChainBridgeBacker_MNBM_Nomad is CrossChainBridgeBacker {
    
    uint32 public destination = 6648936;
    bytes32 public recipient; // Format: 0x00000000000000000000000036a87d1e3200225f881488e4aeedf25303febcae for 0x36A87d1E3200225f881488E4AEedF25303FebcAe

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

    function setDestination(uint32 _destination) external onlyByOwnGov {
        destination = _destination;
    }

    function setRecipient(bytes32 _recipient) external onlyByOwnGov {
        recipient = _recipient;
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Moonbeam]
        // Mainnet and Moonbeam side both use IBridgeRouter
        if (token_type == 0){
            // madFRAX -> L1 FRAX

            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IBridgeRouter(bridge_addresses[token_type]).send(address(anyFRAX), token_amount, destination, recipient, false);
        }
        else if (token_type == 1) {
            // madFXS -> L1 FXS
            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IBridgeRouter(bridge_addresses[token_type]).send(address(anyFXS), token_amount, destination, recipient, false);
        }
        else {
            // madUSDC -> L1 USDC

            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IBridgeRouter(bridge_addresses[token_type]).send(address(collateral_token), token_amount, destination, recipient, false);
        }
    }
}
