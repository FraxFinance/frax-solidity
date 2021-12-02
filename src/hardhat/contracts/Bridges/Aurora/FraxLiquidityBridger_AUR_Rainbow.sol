// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxLiquidityBridger.sol";
import "../../Misc_AMOs/aurora/IERC20Locker.sol";

contract FraxLiquidityBridger_AUR_Rainbow is FraxLiquidityBridger {

    string public accountID = "";

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

    function setAccountID(string memory _accountID, bool override_tolower) external onlyByOwnGov {
        if (override_tolower){
            accountID = _accountID;
        }
        else {
            accountID = _toLower(_accountID);
        }
    }

    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character...
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                // So we add 32 to make it lowercase
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }


    // Override with logic specific to this chain
    function _bridgingLogic(uint256 token_type, address address_to_send_to, uint256 token_amount) internal override {
        require(bytes(accountID).length > 0, "Need to set accountID");

        // [Aurora]
        if (token_type == 0){
            // L1 FRAX -> rnbwFRAX
            // Rainbow Bridge

            // Approve
            ERC20(address(FRAX)).approve(bridge_addresses[token_type], token_amount);

            // Bridge / Lock
            IERC20Locker(bridge_addresses[token_type]).lockToken(address(FRAX), token_amount, accountID);
        }
        else if (token_type == 1) {
            // L1 FXS -> rnbwFXS
            // Rainbow Bridge

            // Approve
            ERC20(address(FXS)).approve(bridge_addresses[token_type], token_amount);

            // Bridge / Lock
            IERC20Locker(bridge_addresses[token_type]).lockToken(address(FXS), token_amount, accountID);
        }
        else {
            // L1 USDC -> rnbwUSDC
            // Rainbow Bridge

            // Approve
            ERC20(collateral_address).approve(bridge_addresses[token_type], token_amount);

            // Bridge / Lock
            IERC20Locker(bridge_addresses[token_type]).lockToken(collateral_address, token_amount, accountID);
        }
    }

}
