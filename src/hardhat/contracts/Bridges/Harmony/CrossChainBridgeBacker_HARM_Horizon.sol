// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../CrossChainBridgeBacker.sol";
import "../../ERC20/__CROSSCHAIN/IAnyswapV4ERC20.sol";
import "../../Misc_AMOs/harmony/IDeposit.sol";
import "../../Misc_AMOs/harmony/IERC20HmyManager.sol";

contract CrossChainBridgeBacker_HARM_Horizon is CrossChainBridgeBacker {
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

    IDeposit public deposit_contract = IDeposit(0x8139d578f11638C78E16685EB2804c2a34482E41);

    // The Horizon bridge requires some ONE to cover ETHEREUM gas costs for the HARMONY -> ETHEREUM bridge
    uint256 public bridge_one_deposit_amt = uint256(750e18); // E18

    // ESTIMATE IS HERE: https://be1.bridge.hmny.io/deposit-amount/ETHEREUM
    function setBridgeDepositONE(uint256 _one_amount) external onlyByOwnGov {
        bridge_one_deposit_amt = _one_amount;
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {

        // 1) Deposit
        // https://explorer.harmony.one/tx/0xaff9511a43e99e0fcfd182a8a7cd752f89a14b336bae9ab48f0341d047d3b8e5

        // 2) Approve
        // https://explorer.harmony.one/tx/0xa7ca11f30353bf690c1bcc0cae19939624844ffe9f9f20244586e76ee568e63b

        // 3) Burn
        // https://explorer.harmony.one/tx/0x8192de938fbd76008992665961fb7c8a4cef0cec103c2093fc3cc06e0230f51d

        // [Harmony]
        // Deposit first
        deposit_contract.deposit(bridge_one_deposit_amt);

        if (token_type == 0){
            // 1FRAX -> L1 FRAX

            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IERC20HmyManager(bridge_addresses[token_type]).burnToken(address(anyFRAX), token_amount, address_to_send_to);
        }
        else if (token_type == 1) {
            // 1FXS -> L1 FXS
            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IERC20HmyManager(bridge_addresses[token_type]).burnToken(address(anyFXS), token_amount, address_to_send_to);
        }
        else {
            // 1USDC -> L1 USDC

            // Approve
            anyFRAX.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IERC20HmyManager(bridge_addresses[token_type]).burnToken(address(collateral_token), token_amount, address_to_send_to);
        }
    }
}
