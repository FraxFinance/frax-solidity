// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// sOHM
interface IsOlympus {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function INDEX() external view returns (uint256);
    function PERMIT_TYPEHASH() external view returns (bytes32);
    function allowance(address owner_, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceForGons(uint256 gons) external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function circulatingSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
    function gonsForBalance(uint256 amount) external view returns (uint256);
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function index() external view returns (uint256);
    function initialize(address stakingContract_) external returns (bool);
    function initializer() external view returns (address);
    function manager() external view returns (address);
    function name() external view returns (string memory);
    function nonces(address owner) external view returns (uint256);
    function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function pullManagement() external;
    function pushManagement(address newOwner_) external;
    function rebase(uint256 profit_, uint256 epoch_) external returns (uint256);
    function rebases(uint256) external view returns (uint256 epoch, uint256 rebase, uint256 totalStakedBefore, uint256 totalStakedAfter, uint256 amountRebased, uint256 index, uint256 blockNumberOccured);
    function renounceManagement() external;
    function setIndex(uint256 _INDEX) external returns (bool);
    function stakingContract() external view returns (address);
    function symbol() external view returns (string memory);
    function totalSupply() external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// sOHM
// OLD VERSION
// interface IsOlympus {
//   function DOMAIN_SEPARATOR() external view returns (bytes32);
//   function PERMIT_TYPEHASH() external view returns (bytes32);
//   function allowance(address owner_, address spender) external view returns (uint256);
//   function approve(address spender, uint256 value) external returns (bool);
//   function balanceOf(address who) external view returns (uint256);
//   function circulatingSupply() external view returns (uint256);
//   function decimals() external view returns (uint8);
//   function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
//   function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
//   function monetaryPolicy() external view returns (address);
//   function name() external view returns (string memory);
//   function nonces(address owner) external view returns (uint256);
//   function owner() external view returns (address);
//   function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
//   function rebase(uint256 olyProfit) external returns (uint256);
//   function renounceOwnership() external;
//   function setMonetaryPolicy(address monetaryPolicy_) external;
//   function setStakingContract(address newStakingContract_) external;
//   function stakingContract() external view returns (address);
//   function symbol() external view returns (string memory);
//   function totalSupply() external view returns (uint256);
//   function transfer(address to, uint256 value) external returns (bool);
//   function transferFrom(address from, address to, uint256 value) external returns (bool);
//   function transferOwnership(address newOwner_) external;
// }