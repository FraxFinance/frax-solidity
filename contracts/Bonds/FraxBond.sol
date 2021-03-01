//SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../Governance/AccessControl.sol";
import "../Math/SafeMath.sol";

contract FraxBond is ERC20Custom, AccessControl {
	using SafeMath for uint256;

	/* ========== STATE VARIABLES ========== */

	string public name = "Frax Bond";
	string public symbol = "FXB";

	address private frax_contract_address;
	address private owner_address;
	address private timelock_address; // Timelock address for the governance contract

	uint256 public numBonds;
	Bond[] public outstandingBonds;

	/* ========== MODIFIERS ========== */

	modifier onlyByOwnerOrGovernance() {
		require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
		_;
	}

	/* ========== CONSTRUCTOR ========== */

	constructor(
		address _frax_contract_address,
		address _owner_address,
		address _timelock_address
	) public {
		frax_contract_address = _frax_contract_address;
		owner_address = _owner_address;
		timelock_address = _timelock_address;
	}

	/* ========== VIEWS ========== */

	struct Bond {
		uint256 id;
		uint256 maturity;
		uint256 amount;
	}

	/* ========== PUBLIC FUNCTIONS ========== */

	function issueBond(uint256 maturity, uint256 amount) public onlyByOwnerOrGovernance {
		outstandingBonds.push(Bond(numBonds+1, maturity, amount));
		numBonds++;
	}

	function claimBond(uint256 _id) public onlyByOwnerOrGovernance {
		
	}

	/* ========== RESTRICTED FUNCTIONS ========== */



	/* ========== EVENTS ========== */

}