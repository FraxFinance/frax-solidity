// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBalancerOracle {
  function ago (  ) external view returns ( uint56 );
  function balancerTwapOracle (  ) external view returns ( address );
  function getPrice (  ) external view returns ( uint256 price );
  function minPrice (  ) external view returns ( uint128 );
  function multiplier (  ) external view returns ( uint16 );
  function owner (  ) external view returns ( address );
  function secs (  ) external view returns ( uint56 );
  function setParams ( uint16 multiplier_, uint56 secs_, uint56 ago_, uint128 minPrice_ ) external;
  function transferOwnership ( address newOwner ) external;
}
