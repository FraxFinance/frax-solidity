// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxLiquidityBridger.sol";
import "../../Misc_AMOs/polygon/IRootChainManager.sol";

contract FraxLiquidityBridger_POLY_MaticBridge is FraxLiquidityBridger {
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

    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        // [Polygon]
        // Bridge is 0xA0c68C638235ee32657e8f720a23ceC1bFc77C77
        // Interesting info https://blog.cryption.network/cryption-network-launches-cross-chain-staking-6cf000c25477

        address bridgeable_token_address;
        if (token_type == 0){
            // L1 FRAX -> polyFRAX
            // Polygon Bridge
            bridgeable_token_address = address(FRAX);
        }
        else if (token_type == 1) {
            // L1 FXS -> polyFXS
            // Polygon Bridge
            bridgeable_token_address = address(FXS);
        }
        else {
            // L1 USDC -> polyUSDC
            // Polygon Bridge
            bridgeable_token_address = collateral_address;
        }

        // Approve
        IRootChainManager rootChainMgr = IRootChainManager(bridge_addresses[token_type]);
        bytes32 tokenType = rootChainMgr.tokenToType(bridgeable_token_address);
        address predicate = rootChainMgr.typeToPredicate(tokenType);
        ERC20(bridgeable_token_address).approve(predicate, token_amount);
        
        // DepositFor
        bytes memory depositData = abi.encode(token_amount);
        rootChainMgr.depositFor(address_to_send_to, bridgeable_token_address, depositData);
    }

}
