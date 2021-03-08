// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "./Frax.sol";
import "../Governance/AccessControl.sol";

contract FraxBridge is AccessControl {
	
	/* ========== STATE VARIABLES ========== */

	FRAXStablecoin private FRAX;
	address public timelock_address;
	address public owner_address;

	uint256 public cumulative_deposits;
	uint256 public cumulative_withdrawals;

	/* ========== MODIFIERS ========== */

	modifier onlyByOwnerOrGovernance() {
		require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
		_;
	}

	/* ========== CONSTRUCTOR ========== */

	constructor(
		address _frax_contract_address,
		address _creator_address,
		address _timelock_address
	) public {
		FRAX = FRAXStablecoin(_frax_contract_address);
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        _setupRole(DEFAULT_ADMIN_ROLE, owner_address);
	}

	/* ========== VIEWS ========== */

	// Needed for compatibility to use pool_mint()
	function collatDollarBalance() public view returns (uint256) {
		return 0;
	}

	/* ========== PUBLIC FUNCTIONS ========== */

	function depositFrax(uint256 _chain_id, string memory _to, uint256 _amount_d18) external {
		FRAX.transferFrom(msg.sender, address(this), _amount_d18);
		cumulative_deposits += _amount_d18;
		FRAX.pool_burn_from(address(this), _amount_d18);
		emit receivedDeposit(_chain_id, _to, _amount_d18);
	}


	/* ========== RESTRICTED FUNCTIONS ========== */

	function withdrawFrax(address _to, uint256 _amount_d18) external onlyByOwnerOrGovernance {
		cumulative_withdrawals += _amount_d18;
		FRAX.pool_mint(_to, _amount_d18);
	}


	/* ========== EVENTS ========== */

	// Deposit _amount_d18 to address _to on chain specified by _chain_id
	event receivedDeposit(uint256 _chain_id, string _to, uint256 _amount_d18);

}