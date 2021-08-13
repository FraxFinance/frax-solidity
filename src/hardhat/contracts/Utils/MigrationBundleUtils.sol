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

	constructor(
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

	function checkParentHash(bytes32 _parent_hash) public view returns (bool) {
		if(blockhash(block.number - 1) == _parent_hash){
			return true;
		} else {
			return false;
		}
	}

	function payFlashbotsMiner(bytes32 _parent_hash, uint256 _amount_wei, address _staker, uint256 _token_id) public payable {
		require(checkParentHash(_parent_hash), "stale transaction");

		// cannot copy array directly into memory, can only access members
		uint256 array_size = frax_usdc_staking_contract.lockedNFTsOf(_staker).length; 

		for(uint256 i = 0; i < array_size; i++){
			if(frax_usdc_staking_contract.lockedNFTsOf(_staker)[i].token_id == _token_id){
				block.coinbase.transfer(_amount_wei);
				return;
			}
		}

		revert("did not find token_id NFT in UniV3 Frax Farm");
	}

}