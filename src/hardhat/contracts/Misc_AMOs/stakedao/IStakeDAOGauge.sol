// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IStakeDAOGauge {
  function initialize (address _staking_token, address _admin, address _SDT, address _voting_escrow, address _veBoost_proxy, address _distributor, address _vault, string memory symbol) external;
  function decimals () external view returns (uint256);
  function user_checkpoint (address addr) external returns (bool);
  function claimed_reward (address _addr, address _token) external view returns (uint256);
  function claimable_reward (address _user, address _reward_token) external view returns (uint256);
  function set_rewards_receiver (address _receiver) external;
  function set_vault (address _vault) external;
  function claim_rewards () external;
  function claim_rewards (address _addr) external;
  function claim_rewards (address _addr, address _receiver) external;
  function claim_rewards_for (address _addr, address _receiver) external;
  function kick (address addr) external;
  function deposit (uint256 _value) external;
  function deposit (uint256 _value, address _addr) external;
  function deposit (uint256 _value, address _addr, bool _claim_rewards) external;
  function withdraw (uint256 _value, address _addr) external;
  function withdraw (uint256 _value, address _addr, bool _claim_rewards) external;
  function transfer (address _to, uint256 _value) external returns (bool);
  function transferFrom (address _from, address _to, uint256 _value) external returns (bool);
  function approve (address _spender, uint256 _value) external returns (bool);
  function increaseAllowance (address _spender, uint256 _added_value) external returns (bool);
  function decreaseAllowance (address _spender, uint256 _subtracted_value) external returns (bool);
  function add_reward (address _reward_token, address _distributor) external;
  function set_reward_distributor (address _reward_token, address _distributor) external;
  function set_claimer (address _claimer) external;
  function deposit_reward_token (address _reward_token, uint256 _amount) external;
  function commit_transfer_ownership (address addr) external;
  function accept_transfer_ownership () external;
  function SDT () external view returns (address);
  function voting_escrow () external view returns (address);
  function veBoost_proxy () external view returns (address);
  function staking_token () external view returns (address);
  function decimal_staking_token () external view returns (uint256);
  function balanceOf (address arg0) external view returns (uint256);
  function totalSupply () external view returns (uint256);
  function allowance (address arg0, address arg1) external view returns (uint256);
  function name () external view returns (string memory);
  function symbol () external view returns (string memory);
  function working_balances (address arg0) external view returns (uint256);
  function working_supply () external view returns (uint256);
  function integrate_checkpoint_of (address arg0) external view returns (uint256);
  function reward_count () external view returns (uint256);
  function reward_tokens (uint256 arg0) external view returns (address);
  function reward_data (address arg0) external view returns (address token, address distributor, uint256 period_finish, uint256 rate, uint256 last_update, uint256 integral);
  function rewards_receiver (address arg0) external view returns (address);
  function reward_integral_for (address arg0, address arg1) external view returns (uint256);
  function admin () external view returns (address);
  function future_admin () external view returns (address);
  function claimer () external view returns (address);
  function initialized () external view returns (bool);
  function vault () external view returns (address);
}
