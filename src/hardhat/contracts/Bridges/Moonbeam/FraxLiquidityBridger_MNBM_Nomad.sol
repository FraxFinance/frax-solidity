// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxLiquidityBridger.sol";
import "../../Misc_AMOs/moonbeam/IBridgeRouter.sol";

contract FraxLiquidityBridger_MNBM_Nomad is FraxLiquidityBridger {

    uint32 public destination = 1650811245;
    bytes32 public recipient; // Format: 0x000000000000000000000000a5924D9baA4fed0fbd100CB47CBCb61eA5E33219 for 0xa5924D9baA4fed0fbd100CB47CBCb61eA5E33219

    constructor (
        address _owner,
        address _timelock_address,
        address _amo_minter_address,
        address[3] memory _bridge_addresses,
        address _destination_address_override,
        string memory _non_evm_destination_address,
        string memory _name
    ) 
    FraxLiquidityBridger(_owner, _timelock_address, _amo_minter_address, _bridge_addresses, _destination_address_override, _non_evm_destination_address, _name)
    {}

    function setDestination(uint32 _destination) external onlyByOwnGov {
        destination = _destination;
    }

    function setRecipient(bytes32 _recipient) external onlyByOwnGov {
        recipient = _recipient;
    }

    // NOTE: To collect tokens bridged from MOONBEAM, you must go here
    // https://app.nomad.xyz/tx/nomad/moonbeam/<MOONBEAM TX ID>

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Moonbeam]
        // Mainnet and Moonbeam side both use IBridgeRouter
        if (token_type == 0){
            // L1 FRAX -> madFRAX
            // Nomad Bridge

            // Approve
            ERC20(address(FRAX)).approve(bridge_addresses[token_type], token_amount);

            // Send
            IBridgeRouter(bridge_addresses[token_type]).send(address(FRAX), token_amount, destination, recipient, false);
        }
        else if (token_type == 1) {
            // L1 FXS -> madFXS
            // Nomad Bridge

            // Approve
            ERC20(address(FXS)).approve(bridge_addresses[token_type], token_amount);

            // Send
            IBridgeRouter(bridge_addresses[token_type]).send(address(FXS), token_amount, destination, recipient, false);
        }
        else {
            // L1 USDC -> madUSDC
            // Nomad Bridge

            // Approve
            ERC20(collateral_address).approve(bridge_addresses[token_type], token_amount);

            // Send
            IBridgeRouter(bridge_addresses[token_type]).send(collateral_address, token_amount, destination, recipient, false);
        }
    }

}
