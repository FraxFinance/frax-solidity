// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface ICPITrackerOracle {
  function acceptOwnership (  ) external;
  function bot_address (  ) external view returns ( address );
  function cancelRequest ( bytes32 _requestId, uint256 _payment, bytes4 _callbackFunc, uint256 _expiration ) external;
  function cpi_last (  ) external view returns ( uint256 );
  function cpi_observations ( uint256 ) external view returns ( uint256 result_year, uint256 result_month, uint256 cpi_target, uint256 peg_price_target, uint256 timestamp );
  function cpi_target (  ) external view returns ( uint256 );
  function currDeltaFracAbsE6 (  ) external view returns ( uint256 );
  function currDeltaFracE6 (  ) external view returns ( int256 );
  function currPegPrice (  ) external view returns ( uint256 );
  function fee (  ) external view returns ( uint256 );
  function fulfill ( bytes32 _requestId, uint256 result ) external;
  function fulfill_ready_day (  ) external view returns ( uint256 );
  function future_ramp_period (  ) external view returns ( uint256 );
  function jobId (  ) external view returns ( bytes32 );
  function lastUpdateTime (  ) external view returns ( uint256 );
  function max_delta_frac (  ) external view returns ( uint256 );
  function month_names ( uint256 ) external view returns ( string memory );
  function nominateNewOwner ( address _owner ) external;
  function nominatedOwner (  ) external view returns ( address );
  function oracle (  ) external view returns ( address );
  function owner (  ) external view returns ( address );
  function peg_price_last (  ) external view returns ( uint256 );
  function peg_price_target (  ) external view returns ( uint256 );
  function ramp_period (  ) external view returns ( uint256 );
  function recoverERC20 ( address tokenAddress, uint256 tokenAmount ) external;
  function requestCPIData (  ) external returns ( bytes32 requestId );
  function setBot ( address _new_bot_address ) external;
  function setFulfillReadyDay ( uint256 _fulfill_ready_day ) external;
  function setFutureRampPeriod ( uint256 _future_ramp_period ) external;
  function setMaxDeltaFrac ( uint256 _max_delta_frac ) external;
  function setOracleInfo ( address _oracle, bytes32 _jobId, uint256 _fee ) external;
  function setTimelock ( address _new_timelock_address ) external;
  function stored_month (  ) external view returns ( uint256 );
  function stored_year (  ) external view returns ( uint256 );
  function time_contract (  ) external view returns ( address );
  function timelock_address (  ) external view returns ( address );
  function upcomingCPIParams (  ) external view returns ( uint256 upcoming_year, uint256 upcoming_month, uint256 upcoming_timestamp );
  function upcomingSerie (  ) external view returns ( string memory serie_name );
}
