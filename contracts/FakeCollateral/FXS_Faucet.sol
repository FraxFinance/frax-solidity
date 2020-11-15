// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";

// To be used only on testnet
contract FXS_Faucet {

    ERC20 public fxs_contract;
    
    constructor(address FXS_token_address) public {
        fxs_contract = ERC20(FXS_token_address);
    }

    mapping (address => bool) used;

    function faucet() public {
    	if(used[msg.sender] == false){
    		fxs_contract.transfer(msg.sender, 100 * (10 ** 18));
    		used[msg.sender] = true;
    	}
    }
}