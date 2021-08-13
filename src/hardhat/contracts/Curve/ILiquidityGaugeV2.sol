// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

// https://github.com/swervefi/swerve/blob/master/packages/swerve-contracts/interfaces/ILiquidityGauge.sol

interface ILiquidityGaugeV2 {
	// Public variables
    function minter() external view returns (address);
    function crv_token() external view returns (address);
    function lp_token() external view returns (address);
    function controller() external view returns (address);
    function voting_escrow() external view returns (address);
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function future_epoch_time() external view returns (uint256);
    function approved_to_deposit(address, address) external view returns (bool);
    function working_balances(address) external view returns (uint256);
    function working_supply() external view returns (uint256);
    function period() external view returns (int128);
    function period_timestamp(uint256) external view returns (uint256);
    function integrate_inv_supply(uint256) external view returns (uint256);
    function integrate_inv_supply_of(address) external view returns (uint256);
    function integrate_checkpoint_of(address) external view returns (uint256);
    function integrate_fraction(address) external view returns (uint256);
    function inflation_rate() external view returns (uint256);

    // Getter functions
    function integrate_checkpoint() external view returns (uint256);

    // External functions
    function user_checkpoint(address) external returns (bool);
    function claim_rewards(address) external;
    function claimable_tokens(address) external view returns (uint256); // function can be manually changed to "view" in the ABI
    function kick(address) external;
    function set_approve_deposit(address, bool) external;
	function deposit(uint256) external;
    function deposit(uint256, address) external;
    function withdraw(uint256) external;
}
