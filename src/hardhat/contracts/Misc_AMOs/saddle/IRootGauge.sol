// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IRootGauge {
    struct InflationParams {
        uint256 rate;
        uint256 finish_time;
    }

    function transmit_emissions () external;
    function integrate_fraction (address _user) external view returns (uint256);
    function user_checkpoint (address _user) external returns (bool);
    function set_killed (bool _is_killed) external;
    function update_bridger () external;
    function initialize (address _bridger, uint256 _chain_id, string memory _name) external;
    function chain_id () external view returns (uint256);
    function bridger () external view returns (address);
    function factory () external view returns (address);
    function name () external view returns (string memory);
    function inflation_params () external view returns (InflationParams memory);
    function last_period () external view returns (uint256);
    function total_emissions () external view returns (uint256);
    function is_killed () external view returns (bool);
}
