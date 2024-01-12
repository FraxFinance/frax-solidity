// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IAuraGauge {
    
    struct Reward {
        address token;
        address distributor;
        uint256 period_finish;
        uint256 rate;
        uint256 last_update;
        uint256 integral;
    }

    function deposit ( uint256 _value ) external;
    function deposit ( uint256 _value, address _addr ) external;
    function deposit ( uint256 _value, address _addr, bool _claim_rewards ) external;
    function withdraw ( uint256 _value ) external;
    function withdraw ( uint256 _value, bool _claim_rewards ) external;
    function claim_rewards (  ) external;
    function claim_rewards ( address _addr ) external;
    function claim_rewards ( address _addr, address _receiver ) external;
    function transferFrom ( address _from, address _to, uint256 _value ) external returns ( bool );
    function transfer ( address _to, uint256 _value ) external returns ( bool );
    function approve ( address _spender, uint256 _value ) external returns ( bool );
    function permit ( address _owner, address _spender, uint256 _value, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s ) external returns ( bool );
    function increaseAllowance ( address _spender, uint256 _added_value ) external returns ( bool );
    function decreaseAllowance ( address _spender, uint256 _subtracted_value ) external returns ( bool );
    function user_checkpoint ( address addr ) external returns ( bool );
    function set_rewards_receiver ( address _receiver ) external;
    function kick ( address addr ) external;
    function deposit_reward_token ( address _reward_token, uint256 _amount ) external;
    function add_reward ( address _reward_token, address _distributor ) external;
    function set_reward_distributor ( address _reward_token, address _distributor ) external;
    function killGauge (  ) external;
    function unkillGauge (  ) external;
    function claimed_reward ( address _addr, address _token ) external view returns ( uint256 );
    function claimable_reward ( address _user, address _reward_token ) external view returns ( uint256 );
    function claimable_tokens ( address addr ) external returns ( uint256 );
    function integrate_checkpoint (  ) external view returns ( uint256 );
    function future_epoch_time (  ) external view returns ( uint256 );
    function inflation_rate (  ) external view returns ( uint256 );
    function decimals (  ) external view returns ( uint256 );
    function version (  ) external view returns ( string memory );
    function allowance ( address owner, address spender ) external view returns ( uint256 );
    function initialize ( address _lp_token, uint256 relative_weight_cap ) external;
    function setRelativeWeightCap ( uint256 relative_weight_cap ) external;
    function getRelativeWeightCap (  ) external view returns ( uint256 );
    function getCappedRelativeWeight ( uint256 time ) external view returns ( uint256 );
    function getMaxRelativeWeightCap (  ) external pure returns ( uint256 );
    function balanceOf ( address arg0 ) external view returns ( uint256 );
    function totalSupply (  ) external view returns ( uint256 );
    function name (  ) external view returns ( string memory );
    function symbol (  ) external view returns ( string memory );
    function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
    function nonces ( address arg0 ) external view returns ( uint256 );
    function lp_token (  ) external view returns ( address );
    function is_killed (  ) external view returns ( bool );
    function reward_count (  ) external view returns ( uint256 );
    function reward_data ( address arg0 ) external view returns ( Reward memory );
    function rewards_receiver ( address arg0 ) external view returns ( address );
    function reward_integral_for ( address arg0, address arg1 ) external view returns ( uint256 );
    function working_balances ( address arg0 ) external view returns ( uint256 );
    function working_supply (  ) external view returns ( uint256 );
    function integrate_inv_supply_of ( address arg0 ) external view returns ( uint256 );
    function integrate_checkpoint_of ( address arg0 ) external view returns ( uint256 );
    function integrate_fraction ( address arg0 ) external view returns ( uint256 );
    function period (  ) external view returns ( int128 );
    function reward_tokens ( uint256 arg0 ) external view returns ( address );
    function period_timestamp ( uint256 arg0 ) external view returns ( uint256 );
    function integrate_inv_supply ( uint256 arg0 ) external view returns ( uint256 );
}
