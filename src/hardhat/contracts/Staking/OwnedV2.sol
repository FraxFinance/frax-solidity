// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.4;

// https://docs.synthetix.io/contracts/Owned
contract OwnedV2 {
    error OwnerCannotBeZero();
    error InvalidOwnershipAcceptance();
    error OnlyOwner();

    address public owner;
    address public nominatedOwner;

    constructor (address _owner) {
        // require(_owner != address(0), "Owner address cannot be 0");
        if(_owner == address(0)) revert OwnerCannotBeZero();
        owner = _owner;
        emit OwnerChanged(address(0), _owner);
    }

    function nominateNewOwner(address _owner) external onlyOwner {
        nominatedOwner = _owner;
        emit OwnerNominated(_owner);
    }

    function acceptOwnership() external {
        // require(msg.sender == nominatedOwner, "You must be nominated before you can accept ownership");
        if(msg.sender != nominatedOwner) revert InvalidOwnershipAcceptance();
        emit OwnerChanged(owner, nominatedOwner);
        owner = nominatedOwner;
        nominatedOwner = address(0);
    }

    modifier onlyOwner {
        // require(msg.sender == owner, "Only the contract owner may perform this action");
        if(msg.sender != owner) revert OnlyOwner();
        _;
    }

    event OwnerNominated(address newOwner);
    event OwnerChanged(address oldOwner, address newOwner);
}