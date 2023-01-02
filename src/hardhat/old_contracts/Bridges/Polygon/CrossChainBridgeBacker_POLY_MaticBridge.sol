// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../CrossChainBridgeBacker.sol";
import "../../ERC20/__CROSSCHAIN/IUChildERC20.sol";

contract CrossChainBridgeBacker_POLY_MaticBridge is CrossChainBridgeBacker {
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
        // [Polygon]
        if (token_type == 0){
            // polyFRAX -> L1 FRAX
            // IUChildERC20 withdraw
            // MaticBridge Bridge
            IUChildERC20(address(anyFRAX)).withdraw(token_amount);
        }
        else if (token_type == 1) {
            // polyFXS -> L1 FXS
            // IUChildERC20 withdraw
            // MaticBridge Bridge
            IUChildERC20(address(anyFXS)).withdraw(token_amount);
        }
        else {
            // anyUSDC -> L1 USDC
            // IUChildERC20 withdraw
            // MaticBridge Bridge
            IUChildERC20(address(collateral_token)).withdraw(token_amount);
        }
    }
}
