// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IChildLiquidityGaugeFactory {
  function mint (address _gauge) external;
  function mint_many (address[32] memory _gauges) external;
  function deploy_gauge (address _lp_token, bytes32 _salt, string memory _name) external returns (address);
  function deploy_gauge (address _lp_token, bytes32 _salt, string memory _name, address _manager) external returns (address);
  function set_voting_escrow (address _voting_escrow) external;
  function set_implementation (address _implementation) external;
  function set_mirrored (address _gauge, bool _mirrored) external;
  function set_call_proxy (address _new_call_proxy) external;
  function commit_transfer_ownership (address _future_owner) external;
  function accept_transfer_ownership () external;
  function is_valid_gauge (address _gauge) external view returns (bool);
  function is_mirrored (address _gauge) external view returns (bool);
  function last_request (address _gauge) external view returns (uint256);
  function get_implementation () external view returns (address);
  function voting_escrow () external view returns (address);
  function owner () external view returns (address);
  function future_owner () external view returns (address);
  function call_proxy () external view returns (address);
  function gauge_data (address arg0) external view returns (uint256);
  function minted (address arg0, address arg1) external view returns (uint256);
  function get_gauge_from_lp_token (address arg0) external view returns (address);
  function get_gauge_count () external view returns (uint256);
  function get_gauge (uint256 arg0) external view returns (address);
}
