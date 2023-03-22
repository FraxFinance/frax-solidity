// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

// import "lib/forge-std/src/console2.sol";

/// @notice This was converted from the Vyper version with the assistance of GPT-4 by ZrowGz at Pitch Foundation
/// @notice There may be issues, especially with the type conversions.

interface VotingEscrow {
    struct LockedBalance{
        int128 amount;
        uint256 end;
    }
    function balanceOf(address) external view returns (uint256);
    function get_last_user_slope(address) external view returns (int128);
    function locked__end(address) external view returns (uint256);
    function locked(address) external view returns (LockedBalance memory);
}

contract GaugeController is VotingEscrow{
    uint256 constant WEEK = 604800;
    uint256 constant WEIGHT_VOTE_DELAY = 10 * 86400;
    uint256 constant MULTIPLIER = 10 ** 18;

    struct Point {
        uint256 bias;
        uint256 slope;
    }

    struct CorrectedPoint {
        uint256 bias;
        uint256 slope;
        uint256 lock_end;
        uint256 fxs_amount;
    }

    struct VotedSlope {
        uint256 slope;
        uint256 power;
        uint256 end;
    }

    function balanceOf(address) external view virtual returns (uint256) {}
    function get_last_user_slope(address) external view virtual returns (int128) {}
    function locked__end(address) external view virtual returns (uint256) {}
    function locked(address) external view virtual returns (LockedBalance memory) {}
    // struct LockedBalance {
    //     int128 amount;
    //     uint256 end;
    // }

    address public admin;  // Can and will be a smart contract
    address public future_admin;  // Can and will be a smart contract
    address public token;  // CRV token
    address public voting_escrow;  // Voting escrow
    int128 public n_gauge_types;
    int128 public n_gauges;
    mapping(int128 => string) public gauge_type_names;
    address[1000000000] public gauges;
    mapping(address => int128) public gauge_types_;
    mapping(address => mapping(address => VotedSlope)) public vote_user_slopes;  // user -> gauge_addr -> VotedSlope
    mapping(address => uint256) public vote_user_power;
    mapping(address => mapping(address => uint256)) public last_user_vote;

    mapping(address => mapping(uint256 => Point)) public points_weight;
    mapping(address => mapping(uint256 => uint256)) public changes_weight;
    mapping(address => uint256) public time_weight;

    mapping(int128 => mapping(uint256 => Point)) public points_sum;
    mapping(int128 => mapping(uint256 => uint256)) public changes_sum;
    uint256[1000000000] public time_sum;
    uint256 public time_total;
    mapping(uint256 => uint256) public points_total;
    mapping(int128 => mapping(uint256 => uint256)) public points_type_weight;
    uint256[1000000000] public time_type_weight;
    uint256 public global_emission_rate;

    constructor(address _token, address _voting_escrow) {
        require(_token != address(0), "Invalid token address");
        require(_voting_escrow != address(0), "Invalid voting escrow address");
        admin = msg.sender;
        token = _token;
        voting_escrow = _voting_escrow;
        time_total = block.timestamp / WEEK * WEEK;
    }

    function _get_corrected_info(address addr) internal view returns (CorrectedPoint memory) {
        address escrow = voting_escrow;
        uint256 vefxs_balance = VotingEscrow(escrow).balanceOf(addr);
        LockedBalance memory locked_balance = VotingEscrow(escrow).locked(addr);
        uint256 locked_end = locked_balance.end;
        // uint128 locked = toUint128(locked_balance.amount);
        // uint256 locked_fxs = uint256(locked);
        uint256 locked_fxs = uint256(uint128(locked_balance.amount));
        uint256 corrected_slope = 0;
        if (locked_end > block.timestamp) {
            corrected_slope = vefxs_balance / (locked_end - block.timestamp);
        }
        return CorrectedPoint({
            bias: vefxs_balance,
            slope: corrected_slope,
            lock_end: locked_end,
            fxs_amount: locked_fxs
        });
    }

    function get_corrected_info(address addr) external view returns (CorrectedPoint memory) {
        return _get_corrected_info(addr);
    }
    
    function gauge_types(address addr) external view returns (int128) {
        int128 gauge_type = gauge_types_[addr];
        require(gauge_type != 0, "gauge 0");
        return gauge_type - 1;
    }

    function _get_type_weight(int128 gauge_type) internal returns (uint256) {
        uint256 t = time_type_weight[uint256(uint128(gauge_type))];
        if (t > 0) {
            uint256 w = points_type_weight[gauge_type][t];
            for (uint256 i = 0; i < 500; i++) {
                if (t > block.timestamp) {
                    break;
                }
                t += WEEK;
                points_type_weight[gauge_type][t] = w;
                if (t > block.timestamp) {
                    time_type_weight[uint256(uint128(gauge_type))] = t;
                }
            }
            return w;
        } else {
            return 0;
        }
    }
    
    function _get_sum(int128 gauge_type) internal returns (uint256) {
        uint256 t = time_sum[uint256(uint128(gauge_type))];
        if (t > 0) {
            Point memory pt = points_sum[gauge_type][t];
            for (uint256 i = 0; i < 500; i++) {
                if (t > block.timestamp) {
                    break;
                }
                t += WEEK;
                uint256 d_bias = pt.slope * WEEK;
                if (pt.bias > d_bias) {
                    pt.bias -= d_bias;
                    uint256 d_slope = changes_sum[gauge_type][t];
                    pt.slope -= d_slope;
                } else {
                    pt.bias = 0;
                    pt.slope = 0;
                }
                points_sum[gauge_type][t] = pt;
                if (t > block.timestamp) {
                    time_sum[uint256(uint128(gauge_type))] = t;
                }
            }
            return pt.bias;
        } else {
            return 0;
        }
    }

    // function _get_total() internal returns (uint256) {
    //     uint256 t = time_total;
    //     int128 _n_gauge_types = n_gauge_types;
    //     if (t > block.timestamp) {
    //         t -= WEEK;
    //     }
    //     uint256 pt = points_total[t];
    //     for (int128 gauge_type = 0; gauge_type < 100; gauge_type++) {
    //         if (gauge_type == _n_gauge_types) {
    //             break;
    //         }
    //         _get_sum(gauge_type);
    //         _get_type_weight(gauge_type

    function _get_total() internal returns (uint256) {
        uint256 t = time_total;
        int128 _n_gauge_types = n_gauge_types;
        if (t > block.timestamp) {
            t -= WEEK;
        }
        uint256 pt = points_total[t];
        for (uint256 gauge_type = 0; gauge_type < 100; gauge_type++) {
            if (gauge_type == uint256(uint128(_n_gauge_types))) {
                break;
            }
            _get_sum(int128(int256(gauge_type)));
            _get_type_weight(int128(int256(gauge_type)));
        }
        for (uint256 i = 0; i < 500; i++) {
            if (t > block.timestamp) {
                break;
            }
            t += WEEK;
            pt = 0;
            for (uint256 gauge_type = 0; gauge_type < 100; gauge_type++) {
                if (gauge_type == uint256(uint128(_n_gauge_types))) {
                    break;
                }
                uint256 type_sum = points_sum[int128(int256(gauge_type))][t].bias;
                uint256 type_weight = points_type_weight[int128(int256(gauge_type))][t];
                pt += type_sum * type_weight;
            }
            points_total[t] = pt;
            if (t > block.timestamp) {
                time_total = t;
            }
        }
        return pt;
    }

    function _get_weight(address gauge_addr) private returns (uint256) {
        uint256 t = time_weight[gauge_addr];
        if (t > 0) {
            Point memory pt = points_weight[gauge_addr][t];
            for (uint256 i = 0; i < 500; i++) {
                if (t > block.timestamp) {
                    break;
                }
                t += WEEK;
                uint256 d_bias = pt.slope * WEEK;
                if (pt.bias > d_bias) {
                    pt.bias -= d_bias;
                    uint256 d_slope = changes_weight[gauge_addr][t];
                    pt.slope -= d_slope;
                } else {
                    pt.bias = 0;
                    pt.slope = 0;
                }
                points_weight[gauge_addr][t] = pt;
                if (t > block.timestamp) {
                    time_weight[gauge_addr] = t;
                }
            }
            return pt.bias;
        } else {
            return 0;
        }
    }

    function add_gauge(address addr, int128 gauge_type, uint256 weight) external {
        require(msg.sender == admin, "Admin only");
        require(weight >= 0, "Weight must be non-negative");
        require(gauge_type >= 0 && gauge_type < n_gauge_types, "Invalid gauge type");
        require(gauge_types_[addr] == 0, "Cannot add the same gauge twice");

        int128 n = n_gauges;
        n_gauges = n + 1;
        gauges[uint256(uint128(n))] = addr;
        gauge_types_[addr] = gauge_type + 1;

        uint256 next_time = (block.timestamp + WEEK) / WEEK * WEEK;

        if (weight > 0) {
            uint256 _type_weight = _get_type_weight(gauge_type);
            uint256 _old_sum = _get_sum(gauge_type);
            uint256 _old_total = _get_total();
            points_sum[gauge_type][next_time].bias = weight + _old_sum;
            time_sum[uint256(uint128(gauge_type))] = next_time;
            points_total[next_time] = _old_total + _type_weight * weight;
            time_total = next_time;
            points_weight[addr][next_time].bias = weight;
        }

        if (time_sum[uint256(uint128(gauge_type))] == 0) {
            time_sum[uint256(uint128(gauge_type))] = next_time;
        }

        time_weight[addr] = next_time;
    }

    function checkpoint() external {
        _get_total();
    }

    function checkpoint_gauge(address gauge_addr) external {
        _get_weight(gauge_addr);
        _get_total();
    }

    function _gauge_relative_weight(address addr, uint256 time) internal view returns (uint256) {
        uint256 t = time / WEEK * WEEK;
        uint256 _total_weight = points_total[t];
        if (_total_weight > 0) {
            int128 gauge_type = gauge_types_[addr] - 1;
            uint256 _type_weight = points_type_weight[gauge_type][t];
            uint256 _gauge_weight = points_weight[addr][t].bias;
            return MULTIPLIER * _type_weight * _gauge_weight / _total_weight;
        } else { 
            return 0;
        }
    }

    function gauge_relative_weight(address addr, uint256 time) external view returns (uint256) {
        return _gauge_relative_weight(addr, block.timestamp);
    }

    function gauge_relative_weight_write(address addr) external returns (uint256) {
        _get_weight(addr);
        _get_total();
        return _gauge_relative_weight(addr, block.timestamp);    }

    function gauge_relative_weight_write(address addr, uint256 time) external returns (uint256) {
        _get_weight(addr);
        _get_total();
        return _gauge_relative_weight(addr, time);
    }

    function add_type(string memory _name, uint256 weight) external {
        require(msg.sender == admin, "Only admin can add gauge types");
        require(weight >= 0, "Weight must be non-negative");
        int128 type_id = n_gauge_types;
        gauge_type_names[type_id] = _name;
        n_gauge_types = type_id + 1;
        if (weight != 0) {
            _change_type_weight(type_id, weight);
        }
    }

    function change_type_weight(int128 type_id, uint256 weight) external {
        require(msg.sender == admin, "Admin only");
        require(type_id >= 0 && type_id < n_gauge_types, "Invalid gauge type");
        _change_type_weight(type_id, weight);
    }

    function _change_type_weight(int128 type_id, uint256 weight) internal {
        uint256 old_weight = _get_type_weight(type_id);
        uint256 old_sum = _get_sum(type_id);
        uint256 total_weight = _get_total();
        uint256 next_time = (block.timestamp + WEEK) / WEEK * WEEK;
        total_weight = total_weight + old_sum * weight - old_sum * old_weight;
        points_total[next_time] = total_weight;
        points_type_weight[type_id][next_time] = weight;
        time_total = next_time;
        time_type_weight[uint256(uint128(type_id))] = next_time;
    }

    function change_gauge_weight(address addr, uint256 weight) external {
        require(msg.sender == admin, "Admin only");
        _change_gauge_weight(addr, weight);
    }

    function _change_gauge_weight(address addr, uint256 weight) internal {
        int128 gauge_type = gauge_types_[addr] - 1;
        uint256 old_gauge_weight = _get_weight(addr);
        uint256 type_weight = _get_type_weight(gauge_type);
        uint256 old_sum = _get_sum(gauge_type);
        uint256 _total_weight = _get_total();
        uint256 next_time = (block.timestamp + WEEK) / WEEK * WEEK;
        points_weight[addr][next_time].bias = weight;
        time_weight[addr] = next_time;
        uint256 new_sum = old_sum + weight - old_gauge_weight;
        points_sum[gauge_type][next_time].bias = new_sum;
        time_sum[uint256(uint128(gauge_type))] = next_time;
        _total_weight = _total_weight + new_sum * type_weight - old_sum * type_weight;
        points_total[next_time] = _total_weight;
        time_total = next_time;
    }

    function vote_for_gauge_weights(address _gauge_addr, uint256 _user_weight) external {
        CorrectedPoint memory corrected_point = _get_corrected_info(msg.sender);
        uint256 slope = corrected_point.slope;
        uint256 lock_end = corrected_point.lock_end;
        int128 _n_gauges = n_gauges;
        uint256 next_time = (block.timestamp + WEEK) / WEEK * WEEK;
        require(lock_end > next_time, "!locked");
        require((_user_weight >= 0) && (_user_weight <= 10000), "!votes");
        require(block.timestamp >= last_user_vote[msg.sender][_gauge_addr] + WEIGHT_VOTE_DELAY, "!soon");
        int128 gauge_type = gauge_types_[_gauge_addr] - 1;
        require(gauge_type >= 0, "!Gauge");
        VotedSlope memory old_slope = vote_user_slopes[msg.sender][_gauge_addr];
        uint256 old_dt = 0;
        if (old_slope.end > next_time) {
            old_dt = old_slope.end - next_time;
        }
        uint256 old_bias = old_slope.slope * old_dt;
        VotedSlope memory new_slope = VotedSlope({
            slope: slope * _user_weight / 10000,
            power: _user_weight,
            end: lock_end
        });
        uint256 new_dt = lock_end - next_time;
        uint256 new_bias = new_slope.slope * new_dt;
        uint256 power_used = vote_user_power[msg.sender];
        power_used = power_used + new_slope.power - old_slope.power;
        vote_user_power[msg.sender] = power_used;
        require((power_used >= 0) && (power_used <= 10000), '!power');
        uint256 old_weight_bias = _get_weight(_gauge_addr);
        uint256 old_weight_slope = points_weight[_gauge_addr][next_time].slope;
        uint256 old_sum_bias = _get_sum(gauge_type);
        uint256 old_sum_slope = points_sum[gauge_type][next_time].slope;

        points_weight[_gauge_addr][next_time].bias = (old_weight_bias + new_bias > old_bias) ? old_weight_bias + new_bias - old_bias : 0;
        points_sum[gauge_type][next_time].bias = (old_sum_bias + new_bias > old_bias) ? old_sum_bias + new_bias - old_bias : 0;
        if (old_slope.end > next_time) {
            points_weight[_gauge_addr][next_time].slope = (old_weight_slope + new_slope.slope > old_slope.slope) ? old_weight_slope + new_slope.slope - old_slope.slope : 0;
            points_sum[gauge_type][next_time].slope = (old_sum_slope + new_slope.slope > old_slope.slope) ? old_sum_slope + new_slope.slope - old_slope.slope : 0;
        } else {
            points_weight[_gauge_addr][next_time].slope += new_slope.slope;
            points_sum[gauge_type][next_time].slope += new_slope.slope;
        }
        if (old_slope.end > block.timestamp) {
            changes_weight[_gauge_addr][old_slope.end] -= old_slope.slope;
            changes_sum[gauge_type][old_slope.end] -= old_slope.slope;
        }
        changes_weight[_gauge_addr][new_slope.end] += new_slope.slope;
        changes_sum[gauge_type][new_slope.end] += new_slope.slope;
        _get_total();
        vote_user_slopes[msg.sender][_gauge_addr] = new_slope;
        last_user_vote[msg.sender][_gauge_addr] = block.timestamp;
    }

    function get_gauge_weight(address addr) public view returns (uint256) {
        /**
        * @notice Get current gauge weight
        * @param addr Gauge address
        * @return Gauge weight
        */
        return points_weight[addr][time_weight[addr]].bias;
    }

    function get_type_weight(int128 type_id) external view returns (uint256) {
        /**
        * @notice Get current type weight
        * @param type_id Type id
        * @return Type weight
        */
        return points_type_weight[type_id][time_type_weight[uint256(uint128(type_id))]];
    }

    function get_total_weight() external view returns (uint256) {
        /**
        * @notice Get current total (type-weighted) weight
        * @return Total weight
        */
        return points_total[time_total];
    }

    function get_weights_sum_per_type(int128 type_id) external view returns (uint256) {
        /**
        * @notice Get sum of gauge weights per type
        * @param type_id Type id
        * @return Sum of gauge weights
        */
        return points_sum[type_id][time_sum[uint256(uint128(type_id))]].bias;
    }

    function change_global_emission_rate(uint256 new_rate) external {
        /**
        * @notice Change FXS emission rate
        * @param new_rate new emission rate (FXS per second)
        */
        require(msg.sender == admin, "Only admin can change global emission rate");
        global_emission_rate = new_rate;
    }

}