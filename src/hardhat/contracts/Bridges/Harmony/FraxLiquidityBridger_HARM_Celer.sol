// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxLiquidityBridger.sol";
import "../../Misc_AMOs/celer/IBridge.sol";
import "../../Misc_AMOs/celer/IOriginalTokenVault.sol";
import "../../Misc_AMOs/optimism/IL1StandardBridge.sol";

contract FraxLiquidityBridger_HARM_Celer is FraxLiquidityBridger {

    uint32 public max_slippage = 50000;
    uint32 public l2_gas = 2000000;

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

    function setMaxSlippage(uint32 _max_slippage) external onlyByOwnGov {
        max_slippage = _max_slippage;
    }

    function setL2Gas(uint32 _l2_gas) external onlyByOwnGov {
        l2_gas = _l2_gas;
    }

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Harmony]
        if (token_type == 0){
            // L1 FRAX -> celrFRAX --(autoswap)-> canFRAX
            // Celer Bridge
            // Approve
            ERC20(address(FRAX)).approve(bridge_addresses[token_type], token_amount);

            // Deposit
            IOriginalTokenVault(bridge_addresses[token_type]).deposit(
                address(FRAX),
                token_amount,
                1666600000,
                address_to_send_to,
                uint64(block.timestamp)
            );
        }
        else if (token_type == 1) {
            // L1 FXS -> celrFXS --(autoswap)-> canFXS
            // Celer Bridge
            // Approve
            ERC20(address(FXS)).approve(bridge_addresses[token_type], token_amount);
            
            // Deposit
            IOriginalTokenVault(bridge_addresses[token_type]).deposit(
                address(FXS),
                token_amount,
                1666600000,
                address_to_send_to,
                uint64(block.timestamp)
            );
        }
        else {
            revert("Collateral bridging disabled");
            // // L1 USDC -> optiUSDC
            // // Optimism Gateway
            // // Approve
            // collateral_token.approve(bridge_addresses[token_type], token_amount);

            // // DepositERC20
            // IL1StandardBridge(bridge_addresses[token_type]).depositERC20To(
            //     address(collateral_token),
            //     0x7F5c764cBc14f9669B88837ca1490cCa17c31607,
            //     address_to_send_to,
            //     token_amount,
            //     l2_gas,
            //     ""
            // );
        }
    }
}
