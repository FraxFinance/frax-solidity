// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma abicoder v2;

interface IveFPIS {

    struct Point {
        int128 bias;
        int128 slope;
        uint256 ts;
        uint256 blk;
        uint256 fpis_amt;
    }

    struct LockedBalance {
        int128 amount;
        uint256 end;
    }

  function commit_transfer_ownership ( address addr ) external;
  function apply_transfer_ownership (  ) external;
  function commit_smart_wallet_checker ( address addr ) external;
  function apply_smart_wallet_checker (  ) external;
  function recoverERC20 ( address token_addr, uint256 amount ) external;
  function get_last_user_slope ( address addr ) external view returns ( int128 );
  function get_last_user_bias ( address addr ) external view returns ( int128 );
  function get_last_user_point ( address addr ) external view returns ( Point memory);
  function user_point_history__ts ( address _addr, uint256 _idx ) external view returns ( uint256 );
  function get_last_point (  ) external view returns ( Point memory);
  function locked__end ( address _addr ) external view returns ( uint256 );
  function locked__amount ( address _addr ) external view returns ( int128 );
  function curr_period_start (  ) external view returns ( uint256 );
  function next_period_start (  ) external view returns ( uint256 );
  function checkpoint (  ) external;
  function create_lock ( uint256 _value, uint256 _unlock_time ) external;
  function increase_amount ( uint256 _value ) external;
  function app_increase_amount_for ( address _staker_addr, address _app_addr, uint256 _value ) external;
  function increase_unlock_time ( uint256 _unlock_time ) external;
  function proxy_add ( address _staker_addr, uint256 _add_amt ) external;
  function proxy_slash ( address _staker_addr, uint256 _slash_amt ) external;
  function withdraw (  ) external;
  function transfer_from_app ( address _staker_addr, address _app_addr, int128 _transfer_amt ) external;
  function transfer_to_app ( address _staker_addr, address _app_addr, int128 _transfer_amt ) external;
  function balanceOf ( address addr ) external view returns ( uint256 );
  function balanceOf ( address addr, uint256 _t ) external view returns ( uint256 );
  function balanceOfAt ( address addr, uint256 _block ) external view returns ( uint256 );
  function totalSupply (  ) external view returns ( uint256 );
  function totalSupply ( uint256 t ) external view returns ( uint256 );
  function totalSupplyAt ( uint256 _block ) external view returns ( uint256 );
  function totalFPISSupply (  ) external view returns ( uint256 );
  function totalFPISSupplyAt ( uint256 _block ) external view returns ( uint256 );
  function toggleEmergencyUnlock (  ) external;
  function toggleAppIncreaseAmountFors (  ) external;
  function toggleTransferFromApp (  ) external;
  function toggleTransferToApp (  ) external;
  function toggleProxyAdds (  ) external;
  function toggleProxySlashes (  ) external;
  function adminSetProxy ( address _proxy ) external;
  function adminToggleHistoricalProxy ( address _proxy ) external;
  function stakerSetProxy ( address _proxy ) external;
  function token (  ) external view returns ( address );
  function supply (  ) external view returns ( uint256 );
  function locked ( address arg0 ) external view returns ( LockedBalance memory );
  function epoch (  ) external view returns ( uint256 );
  function point_history ( uint256 arg0 ) external view returns ( Point memory );
  function user_point_history ( address arg0, uint256 arg1 ) external view returns ( Point memory );
  function user_point_epoch ( address arg0 ) external view returns ( uint256 );
  function slope_changes ( uint256 arg0 ) external view returns ( int128 );
  function appIncreaseAmountForsEnabled (  ) external view returns ( bool );
  function appTransferFromsEnabled (  ) external view returns ( bool );
  function appTransferTosEnabled (  ) external view returns ( bool );
  function proxyAddsEnabled (  ) external view returns ( bool );
  function proxySlashesEnabled (  ) external view returns ( bool );
  function emergencyUnlockActive (  ) external view returns ( bool );
  function current_proxy (  ) external view returns ( address );
  function historical_proxies ( address arg0 ) external view returns ( bool );
  function staker_whitelisted_proxy ( address arg0 ) external view returns ( address );
  function user_proxy_balance ( address arg0 ) external view returns ( uint256 );
  function name (  ) external view returns ( string memory);
  function symbol (  ) external view returns ( string memory);
  function version (  ) external view returns ( string memory);
  function decimals (  ) external view returns ( uint256 );
  function future_smart_wallet_checker (  ) external view returns ( address );
  function smart_wallet_checker (  ) external view returns ( address );
  function admin (  ) external view returns ( address );
  function future_admin (  ) external view returns ( address );
}