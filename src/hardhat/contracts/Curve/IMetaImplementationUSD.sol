// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

interface IMetaImplementationUSD {

	// Deployment
	function __init__() external;
	function initialize(string memory _name, string memory _symbol, address _coin, uint _decimals, uint _A, uint _fee, address _admin) external;

	// ERC20 Standard
	function decimals() external view returns (uint);
	function transfer(address _to, uint _value) external returns (uint256);
	function transferFrom(address _from, address _to, uint _value) external returns (bool);
	function approve(address _spender, uint _value) external returns (bool);
	function balanceOf(address _owner) external view returns (uint256);
	function totalSupply() external view returns (uint256);


	// StableSwap Functionality
	function get_previous_balances() external view returns (uint[2] memory);
	function get_twap_balances(uint[2] memory _first_balances, uint[2] memory _last_balances, uint _time_elapsed) external view returns (uint[2] memory);
	function get_price_cumulative_last() external view returns (uint[2] memory);
	function admin_fee() external view returns (uint);
	function A() external view returns (uint);
	function A_precise() external view returns (uint);
	function get_virtual_price() external view returns (uint);
	function calc_token_amount(uint[2] memory _amounts, bool _is_deposit) external view returns (uint);
	function calc_token_amount(uint[2] memory _amounts, bool _is_deposit, bool _previous) external view returns (uint);
	function add_liquidity(uint[2] memory _amounts, uint _min_mint_amount) external returns (uint);
	function add_liquidity(uint[2] memory _amounts, uint _min_mint_amount, address _receiver) external returns (uint);
	function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
	function get_dy(int128 i, int128 j, uint256 dx, uint256[2] memory _balances) external view returns (uint256);
	function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256);
	function get_dy_underlying(int128 i, int128 j, uint256 dx, uint256[2] memory _balances) external view returns (uint256);
	function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
	function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy, address _receiver) external returns (uint256);
	function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
	function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy, address _receiver) external returns (uint256);
	function remove_liquidity(uint256 _burn_amount, uint256[2] memory _min_amounts) external returns (uint256[2] memory);
	function remove_liquidity(uint256 _burn_amount, uint256[2] memory _min_amounts, address _receiver) external returns (uint256[2] memory);
	function remove_liquidity_imbalance(uint256[2] memory _amounts, uint256 _max_burn_amount) external returns (uint256);
	function remove_liquidity_imbalance(uint256[2] memory _amounts, uint256 _max_burn_amount, address _receiver) external returns (uint256);
	function calc_withdraw_one_coin(uint256 _burn_amount, int128 i) external view returns (uint256);
	function calc_withdraw_one_coin(uint256 _burn_amount, int128 i, bool _previous) external view returns (uint256);
	function remove_liquidity_one_coin(uint256 _burn_amount, int128 i, uint256 _min_received) external returns (uint256);
	function remove_liquidity_one_coin(uint256 _burn_amount, int128 i, uint256 _min_received, address _receiver) external returns (uint256);
	function ramp_A(uint256 _future_A, uint256 _future_time) external;
	function stop_ramp_A() external;
	function admin_balances(uint256 i) external view returns (uint256);
	function withdraw_admin_fees() external;
}