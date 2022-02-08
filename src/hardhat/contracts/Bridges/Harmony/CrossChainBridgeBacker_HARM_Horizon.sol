// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.6;

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
    uint256 public bridge_one_deposit_amt = uint256(999e18); // E18

    // ESTIMATE IS HERE: https://be1.bridge.hmny.io/deposit-amount/ETHEREUM
    function setBridgeDepositONE(uint256 _one_amount) external onlyByOwnGov {
        bridge_one_deposit_amt = _one_amount;
    }

    // For receiving ONE
    function receive() external payable {
        // Do nothing
    }

    // For withdrawing ONE
    function withdraw(uint256 amount) external onlyByOwnGov {
        require(amount < address(this).balance);
        payable(msg.sender).transfer(amount);
    }

    // For withdrawing ONE from the the Harmony Bridge
    function withdrawFromHarmonyBridge(uint256 amount) external onlyByOwnGov {
        deposit_contract.withdraw(payable(msg.sender), amount);
    }

    // For depositing ONE direct to the Harmony Bridge
    function depositToHarmonyBridge(uint256 amount) payable external onlyByOwnGov {
        deposit_contract.deposit{value: amount}(amount);
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {

        // 1) Deposit
        // https://explorer.harmony.one/tx/0xaff9511a43e99e0fcfd182a8a7cd752f89a14b336bae9ab48f0341d047d3b8e5
        // 1FRAX: https://explorer.harmony.one/tx/0x18c78cf34414e27b5dcecbdb7f2f89738c423ee6c7d1908a103f1a89674de46e

        // 2) Approve
        // https://explorer.harmony.one/tx/0xa7ca11f30353bf690c1bcc0cae19939624844ffe9f9f20244586e76ee568e63b
        // 1FRAX: https://explorer.harmony.one/tx/0xad05431e9a3ac6b3179a852af1e9bca8b66758c0d7d31bd7fb7c49fd0472e92a

        // 3) Burn
        // https://explorer.harmony.one/tx/0x8192de938fbd76008992665961fb7c8a4cef0cec103c2093fc3cc06e0230f51d
        // 1FRAX: https://explorer.harmony.one/tx/0x13faa47e0915dcfd9603f1f1332052e7fe4fac57c9667a1ac612d68eea8d14d7

        // [Harmony]
        // Make sure you deposit first from above
        // deposit_contract.deposit{value: bridge_one_deposit_amt}(bridge_one_deposit_amt);

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
            anyFXS.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IERC20HmyManager(bridge_addresses[token_type]).burnToken(address(anyFXS), token_amount, address_to_send_to);
        }
        else {
            // 1USDC -> L1 USDC
            // Approve
            collateral_token.approve(bridge_addresses[token_type], token_amount);

            // Burn
            IERC20HmyManager(bridge_addresses[token_type]).burnToken(address(collateral_token), token_amount, address_to_send_to);
        }
    }
}
