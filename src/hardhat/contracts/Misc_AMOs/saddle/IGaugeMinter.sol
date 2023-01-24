// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IGaugeMinter {
  function update_mining_parameters () external;
  function start_epoch_time_write () external returns (uint256);
  function future_epoch_time_write () external returns (uint256);
  function mint (address gauge_addr) external;
  function mint_many (address[8] memory gauge_addrs) external;
  function mint_for (address gauge_addr, address _for) external;
  function toggle_approve_mint (address minting_user) external;
  function recover_balance (address _coin) external returns (bool);
  function commit_next_emission (uint256 _rate_per_week) external;
  function commit_transfer_emergency_return (address addr) external;
  function apply_transfer_emergency_return () external;
  function commit_transfer_ownership (address addr) external;
  function apply_transfer_ownership () external;
  function mining_epoch () external view returns (int128);
  function start_epoch_time () external view returns (uint256);
  function rate () external view returns (uint256);
  function committed_rate () external view returns (uint256);
  function is_start () external view returns (bool);
  function token () external view returns (address);
  function controller () external view returns (address);
  function minted (address arg0, address arg1) external view returns (uint256);
  function allowed_to_mint_for (address arg0, address arg1) external view returns (bool);
  function future_emergency_return () external view returns (address);
  function emergency_return () external view returns (address);
  function admin () external view returns (address);
  function future_admin () external view returns (address);
}
