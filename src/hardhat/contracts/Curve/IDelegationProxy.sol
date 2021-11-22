// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IDelegationProxy {
  function adjusted_balance_of(address _account) external view returns (uint256);
  function kill_delegation() external;
  function set_delegation(address _delegation) external;
  function commit_set_admins(address _o_admin, address _e_admin) external;
  function apply_set_admins() external;
  function delegation() external view returns (address);
  function emergency_admin() external view returns (address);
  function ownership_admin() external view returns (address);
  function future_emergency_admin() external view returns (address);
  function future_ownership_admin() external view returns (address);
}
