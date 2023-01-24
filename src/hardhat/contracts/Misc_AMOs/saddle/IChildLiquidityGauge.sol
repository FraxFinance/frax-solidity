// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IChildLiquidityGauge {
  struct Reward {
    address distributor;
    uint256 period_finish;
    uint256 rate;
    uint256 last_update;
    uint256 integral;
  }

  function deposit (uint256 _value) external;
  function deposit (uint256 _value, address _user) external;
  function deposit (uint256 _value, address _user, bool _claim_rewards) external;
  function withdraw (uint256 _value) external;
  function withdraw (uint256 _value, address _user) external;
  function withdraw (uint256 _value, address _user, bool _claim_rewards) external;
  function transferFrom (address _from, address _to, uint256 _value) external returns (bool);
  function approve (address _spender, uint256 _value) external returns (bool);
  function permit (address _owner, address _spender, uint256 _value, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s) external returns (bool);
  function transfer (address _to, uint256 _value) external returns (bool);
  function increaseAllowance (address _spender, uint256 _added_value) external returns (bool);
  function decreaseAllowance (address _spender, uint256 _subtracted_value) external returns (bool);
  function user_checkpoint (address addr) external returns (bool);
  function claimable_tokens (address addr) external returns (uint256);
  function claimed_reward (address _addr, address _token) external view returns (uint256);
  function claimable_reward (address _user, address _reward_token) external view returns (uint256);
  function set_rewards_receiver (address _receiver) external;
  function claim_rewards () external;
  function claim_rewards (address _addr) external;
  function claim_rewards (address _addr, address _receiver) external;
  function add_reward (address _reward_token, address _distributor) external;
  function set_reward_distributor (address _reward_token, address _distributor) external;
  function deposit_reward_token (address _reward_token, uint256 _amount) external;
  function set_manager (address _manager) external;
  function update_voting_escrow () external;
  function set_killed (bool _is_killed) external;
  function decimals () external view returns (uint256);
  function integrate_checkpoint () external view returns (uint256);
  function version () external view returns (string memory);
  function factory () external view returns (address);
  function initialize (address _lp_token, address _manager, string memory _name) external;
  function DOMAIN_SEPARATOR () external view returns (bytes32);
  function nonces (address arg0) external view returns (uint256);
  function name () external view returns (string memory);
  function symbol () external view returns (string memory);
  function allowance (address arg0, address arg1) external view returns (uint256);
  function balanceOf (address arg0) external view returns (uint256);
  function totalSupply () external view returns (uint256);
  function lp_token () external view returns (address);
  function manager () external view returns (address);
  function voting_escrow () external view returns (address);
  function working_balances (address arg0) external view returns (uint256);
  function working_supply () external view returns (uint256);
  function period () external view returns (uint256);
  function period_timestamp (uint256 arg0) external view returns (uint256);
  function integrate_checkpoint_of (address arg0) external view returns (uint256);
  function integrate_fraction (address arg0) external view returns (uint256);
  function integrate_inv_supply (uint256 arg0) external view returns (uint256);
  function integrate_inv_supply_of (address arg0) external view returns (uint256);
  function reward_count () external view returns (uint256);
  function reward_tokens (uint256 arg0) external view returns (address);
  function reward_data (address arg0) external view returns (Reward memory);
  function rewards_receiver (address arg0) external view returns (address);
  function reward_integral_for (address arg0, address arg1) external view returns (uint256);
  function is_killed () external view returns (bool);
  function inflation_rate (uint256 arg0) external view returns (uint256);
}
