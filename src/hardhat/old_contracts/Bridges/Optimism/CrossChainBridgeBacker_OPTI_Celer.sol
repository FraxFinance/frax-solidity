// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >= 0.8.0;

import "../CrossChainBridgeBacker.sol";
import "../../Misc_AMOs/celer/IBridge.sol";
import "../../Misc_AMOs/celer/IPeggedTokenBridge.sol";
import "../../Misc_AMOs/optimism/IL2StandardBridge.sol";

contract CrossChainBridgeBacker_OPTI_Celer is CrossChainBridgeBacker {

    uint32 public max_slippage = 50000;

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

    function setMaxSlippage(uint32 _max_slippage) external onlyByOwnGov {
        max_slippage = _max_slippage;
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Optimism]
        if (token_type == 0){
            // celrFRAX -> L1 FRAX
            // Celer Bridge
            // Celer requires a weird loop whereby the IPeggedTokenBridge only takes in canFRAX apparently

            // Check fee-exemptness first
            require(canFRAX.fee_exempt_list(address(this)), "Needs to be fee exempt");

            // Approve celrFRAX back for canFRAX
            anyFRAX.approve(address(canFRAX), token_amount);

            // Swap celrFRAX for canFRAX
            canFRAX.exchangeOldForCanonical(address(anyFRAX), token_amount);

            // Approve canFRAX on anyFRAX, not the IPeggedTokenBridge (weird, but Celer specific)
            canFRAX.approve(address(anyFRAX), token_amount);

            // Burn using the IPeggedTokenBridge address
            IPeggedTokenBridge(bridge_addresses[token_type]).burn(
                address(anyFRAX),
                token_amount,
                address_to_send_to,
                uint64(block.timestamp)
            );
        }
        else if (token_type == 1) {
            // celrFXS -> L1 FXS
            // Celer Bridge
            // Celer requires a weird loop whereby the IPeggedTokenBridge only takes in canFXS apparently

            // Check fee-exemptness first
            require(canFXS.fee_exempt_list(address(this)), "Needs to be fee exempt");

            // Approve celrFXS back for canFXS
            anyFXS.approve(address(canFXS), token_amount);

            // Swap celrFXS for canFXS
            canFXS.exchangeOldForCanonical(address(anyFXS), token_amount);

            // Approve canFXS on anyFXS, not the IPeggedTokenBridge (weird, but Celer specific)
            canFXS.approve(address(anyFXS), token_amount);

            // Burn using the IPeggedTokenBridge address
            IPeggedTokenBridge(bridge_addresses[token_type]).burn(
                address(anyFXS),
                token_amount,
                address_to_send_to,
                uint64(block.timestamp)
            );
        }
        else {
            // optiUSDC -> L1 USDC
            // Optimism Gateway
            // Approve
            collateral_token.approve(bridge_addresses[token_type], token_amount);

            // Withdraw
            IL2StandardBridge(bridge_addresses[token_type]).withdraw(
                address(collateral_token),
                token_amount,
                0,
                ""
            );
        }
    }
}
