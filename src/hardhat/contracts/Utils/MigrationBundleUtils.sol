//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

//import "../Staking/StakingRewards.sol";
import "../Staking/FraxUniV3Farm_Stable.sol";

contract MigrationBundleUtils {

	FraxUniV3Farm_Stable frax_usdc_staking_contract;
	address owner_address;

    // Struct for the stake
    struct LockedNFT {
        uint256 token_id; // for Uniswap V3 LPs
        uint256 liquidity;
        uint256 start_timestamp;
        uint256 ending_timestamp;
        uint256 lock_multiplier; // 6 decimals of precision. 1x = 1000000
        int24 tick_lower;
        int24 tick_upper;
    }

	constructor (
		address creator_address,
		address _v3_frax_usdc_staking_contract_address
	) {
		owner_address = creator_address;
		frax_usdc_staking_contract = FraxUniV3Farm_Stable(_v3_frax_usdc_staking_contract_address);
	}

	modifier onlyByOwner {
		require(msg.sender == owner_address);
		_;
	}

	function changeOwner(address _new_owner) public onlyByOwner {
		owner_address = _new_owner;
	}

	function changeStakingAddress(address _new_staking_address) external onlyByOwner {
		frax_usdc_staking_contract = FraxUniV3Farm_Stable(_new_staking_address);
	}

	function checkParentHash(bytes32 _parent_hash, uint256 _n) public view returns (bool) {
		if(blockhash(block.number - _n) == _parent_hash){
			return true;
		} else {
			return false;
		}
	}

	// _num_valid_blocks > 0
	function payFlashbotsMiner(bytes32 _parent_hash, uint256 _num_valid_blocks, uint256 _amount_wei) public payable {
		for(uint256 i = 0; i < _num_valid_blocks; i++){
			if(checkParentHash(_parent_hash, _num_valid_blocks)){
				return;
			}
		}
		revert("stale chain");
	}

}