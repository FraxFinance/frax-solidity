// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IBunniMinter {
  function allowed_to_mint_for ( address minter, address user ) external view returns ( bool );
  function getGaugeController (  ) external view returns ( address );
  function getMinterApproval ( address minter, address user ) external view returns ( bool );
  function getToken (  ) external view returns ( address );
  function getTokenAdmin (  ) external view returns ( address );
  function mint ( address gauge ) external returns ( uint256 );
  function mintFor ( address gauge, address user ) external returns ( uint256 );
  function mintMany ( address[] memory gauges ) external returns ( uint256 );
  function mintManyFor ( address[] memory gauges, address user ) external returns ( uint256 );
  function mint_for ( address gauge, address user ) external;
  function mint_many ( address[8] memory gauges ) external;
  function minted ( address user, address gauge ) external view returns ( uint256 );
  function setMinterApproval ( address minter, bool approval ) external;
  function toggle_approve_mint ( address minter ) external;
}
