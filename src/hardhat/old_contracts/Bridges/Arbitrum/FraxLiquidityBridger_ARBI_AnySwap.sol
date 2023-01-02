// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxLiquidityBridger.sol";
import "./IL1CustomGateway.sol";

contract FraxLiquidityBridger_ARBI_AnySwap is FraxLiquidityBridger {
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

    // The Arbitrum One Bridge needs _maxGas and _gasPriceBid parameters
    uint256 public maxGas = 275000;
    uint256 public gasPriceBid = 1632346222;

    function setGasVariables(uint256 _maxGas, uint256 _gasPriceBid) external onlyByOwnGov {
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Arbitrum]
        if (token_type == 0){
            // L1 FRAX -> anyFRAX
            // Simple dump in / CREATE2
            // AnySwap Bridge
            TransferHelper.safeTransfer(address(FRAX), bridge_addresses[token_type], token_amount);
        }
        else if (token_type == 1) {
            // L1 FXS -> anyFXS
            // Simple dump in / CREATE2
            // AnySwap Bridge
            TransferHelper.safeTransfer(address(FXS), bridge_addresses[token_type], token_amount);
        }
        else {
            revert("COLLATERAL TRANSFERS ARE DISABLED FOR NOW");
            // // L1 USDC -> arbiUSDC
            // // outboundTransfer
            // // Arbitrum One Bridge
            // // https://etherscan.io/tx/0x00835e1352b991ad9bfdb214628d58a9f1efe3af0436feaac31a404cfc402be5

            // // INPUT
            // // https://github.com/OffchainLabs/arbitrum/blob/3340b1919c2b0ed26f2b4c0298fb31dcbc075919/packages/arb-bridge-peripherals/test/customGateway.e2e.ts

            // revert("MAKE SURE TO TEST THIS CAREFULLY BEFORE DEPLOYING");

            // // Approve
            // collateral_token.approve(bridge_addresses[token_type], token_amount);

            // // Get the calldata
            // uint256 maxSubmissionCost = 1;
            // bytes memory the_calldata = abi.encode(['uint256', 'bytes'], maxSubmissionCost, '0x');

            // // Transfer
            // IL1CustomGateway(bridge_addresses[token_type]).outboundTransfer{ value: maxSubmissionCost + (maxGas * gasPriceBid) }(
            //     collateral_address,
            //     address_to_send_to,
            //     token_amount,
            //     maxGas,
            //     gasPriceBid,
            //     the_calldata
            // );
            
            // revert("finalizeInboundTransfer needs to be called somewhere too");
        }
    }

}
