// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;


interface IVotingEscrowDelegation {
  function approve(address _approved, uint256 _token_id) external;
  function safeTransferFrom(address _from, address _to, uint256 _token_id) external;
  function safeTransferFrom(address _from, address _to, uint256 _token_id, bytes calldata _data) external;
  function setApprovalForAll(address _operator, bool _approved) external;
  function transferFrom(address _from, address _to, uint256 _token_id) external;
  function tokenURI(uint256 _token_id) external view returns (string memory);
  function burn(uint256 _token_id) external;
  function _mint_for_testing(address _to, uint256 _token_id) external;
  function _burn_for_testing(uint256 _token_id) external;
  function uint_to_string(uint256 _value) external view returns (string memory);
  function create_boost(address _delegator, address _receiver, int256 _percentage, uint256 _cancel_time, uint256 _expire_time, uint256 _id) external;
  function extend_boost(uint256 _token_id, int256 _percentage, uint256 _expire_time, uint256 _cancel_time) external;
  function cancel_boost(uint256 _token_id) external;
  function batch_cancel_boosts(uint256[256] memory _token_ids) external;
  function set_delegation_status(address _receiver, address _delegator, bool _status) external;
  function batch_set_delegation_status(address _receiver, address[256] memory _delegators, uint256[256] memory _status) external;
  function adjusted_balance_of(address _account) external view returns (uint256);
  function delegated_boost(address _account) external view returns (uint256);
  function received_boost(address _account) external view returns (uint256);
  function token_boost(uint256 _token_id) external view returns (int256);
  function token_expiry(uint256 _token_id) external view returns (uint256);
  function token_cancel_time(uint256 _token_id) external view returns (uint256);
  function calc_boost_bias_slope(address _delegator, int256 _percentage, int256 _expire_time) external view returns (int256, int256);
  function calc_boost_bias_slope(address _delegator, int256 _percentage, int256 _expire_time, uint256 _extend_token_id) external view returns (int256, int256);
  function get_token_id(address _delegator, uint256 _id) external pure returns (uint256);
  function commit_transfer_ownership(address _addr) external;
  function accept_transfer_ownership() external;
  function set_base_uri(string memory _base_uri) external;
  function balanceOf(address arg0) external view returns (uint256);
  function getApproved(uint256 arg0) external view returns (address);
  function isApprovedForAll(address arg0, address arg1) external view returns (bool);
  function ownerOf(uint256 arg0) external view returns (address);
  function name() external view returns (string memory);
  function symbol() external view returns (string memory);
  function base_uri() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function tokenByIndex(uint256 arg0) external view returns (uint256);
  function tokenOfOwnerByIndex(address arg0, uint256 arg1) external view returns (uint256);
  function token_of_delegator_by_index(address arg0, uint256 arg1) external view returns (uint256);
  function total_minted(address arg0) external view returns (uint256);
  function account_expiries(address arg0, uint256 arg1) external view returns (uint256);
  function admin() external view returns (address);
  function future_admin() external view returns (address);
  function grey_list(address arg0, address arg1) external view returns (bool);
}
