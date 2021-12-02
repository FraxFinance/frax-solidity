// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxLiquidityBridger.sol";
import "./IL1StandardBridge.sol";

contract FraxLiquidityBridger_BOBA_BobaGateway is FraxLiquidityBridger {
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

    uint32 public maxGas = 2000000;

    function setMaxGas(uint32 _maxGas) external onlyByOwnGov {
        maxGas = _maxGas;
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Boba]
        // https://github.com/omgnetwork/optimism-v2/blob/develop/packages/boba/gateway/src/services/networkService.js
        if (token_type == 0){
            // L1 FRAX -> bobaFRAX
            // Boba Gateway

            // Approve
            ERC20(address(FRAX)).approve(bridge_addresses[token_type], token_amount);

            // Deposit
            //https://github.com/omgnetwork/optimism-v2/blob/82c575a34a90fa89e29200be744c486c57c02536/packages/contracts/contracts/L1/messaging/L1StandardBridge.sol
            IL1StandardBridge(bridge_addresses[token_type]).depositERC20To(
                address(FRAX), 
                0xAb2AF3A98D229b7dAeD7305Bb88aD0BA2c42f9cA, 
                address_to_send_to, 
                token_amount, 
                maxGas, 
                ""
            );
        }
        else if (token_type == 1) {
            // L1 FXS -> bobaFXS
            // Boba Gateway

            // Approve
            ERC20(address(FXS)).approve(bridge_addresses[token_type], token_amount);

            // Deposit
            IL1StandardBridge(bridge_addresses[token_type]).depositERC20To(
                address(FXS), 
                0xdc1664458d2f0B6090bEa60A8793A4E66c2F1c00, 
                address_to_send_to, 
                token_amount, 
                maxGas, 
                ""
            );
        }
        else {
            // L1 USDC -> bobaUSDC
            // Boba Gateway

            // Approve
            ERC20(collateral_address).approve(bridge_addresses[token_type], token_amount);

            // Deposit
            IL1StandardBridge(bridge_addresses[token_type]).depositERC20To(
                collateral_address, 
                0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc, 
                address_to_send_to, 
                token_amount, 
                maxGas, 
                ""
            );
        }
    }

}
