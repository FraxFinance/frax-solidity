// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IFXB {
    struct BondInfo {
        string symbol;
        string name;
        uint256 maturityTimestamp;
    }

    function DOMAIN_SEPARATOR (  ) external view returns ( bytes32 );
    function FRAX (  ) external view returns ( address );
    function MATURITY_TIMESTAMP (  ) external view returns ( uint256 );
    function allowance ( address owner, address spender ) external view returns ( uint256 );
    function approve ( address spender, uint256 value ) external returns ( bool );
    function balanceOf ( address account ) external view returns ( uint256 );
    function bondInfo (  ) external view returns ( BondInfo memory );
    function burn ( address to, uint256 value ) external;
    function decimals (  ) external view returns ( uint8 );
    function eip712Domain (  ) external view returns ( bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions );
    function isRedeemable (  ) external view returns ( bool _isRedeemable );
    function mint ( address account, uint256 value ) external;
    function name (  ) external view returns ( string memory );
    function nonces ( address owner ) external view returns ( uint256 );
    function permit ( address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s ) external;
    function symbol (  ) external view returns ( string memory );
    function totalFxbMinted (  ) external view returns ( uint256 );
    function totalFxbRedeemed (  ) external view returns ( uint256 );
    function totalSupply (  ) external view returns ( uint256 );
    function transfer ( address to, uint256 value ) external returns ( bool );
    function transferFrom ( address from, address to, uint256 value ) external returns ( bool );
    function version (  ) external pure returns ( uint256 _major, uint256 _minor, uint256 _patch );
}
