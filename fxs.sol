pragma solidity ^0.6.0;

import "./Context.sol";
import "./IERC20.sol";
import "./frax.sol";
import "./SafeMath.sol";


contract FRAXShares is ERC20 {
    using SafeMath for uint256;
    string public symbol;
    uint8 public decimals = 18;
    address public FRAXStablecoinAdd;
//    address[] public owners;
    uint256 genesis_supply;
//    uint256 ownerCount; //number of different addresses that hold FXS
//    mapping(address => uint256) public balances;
//    mapping(address => mapping (address => uint256)) allowed;
    address owner_address;
    mapping(address => bool) public frax_pools; 
    address oracle_address;
    
    FRAXStablecoin FRAX;

    constructor(
    string memory _symbol, 
    uint256 _genesis_supply,
    address _owner_address,
    address _oracle_address,
    address _FRAXStablecoinAdd) 
    public 
    {
    symbol = _symbol;
    genesis_supply = _genesis_supply;
    owner_address = _owner_address;
    FRAXStablecoinAdd = _FRAXStablecoinAdd;
    oracle_address = _oracle_address;
    
    _mint(owner_address, genesis_supply);


}

function mint(address to, uint256 amount) public {
        require(msg.sender == FRAXStablecoinAdd);
        _mint(to, amount);
    }

    modifier onlyPools() {
       require(frax_pools[msg.sender] == true, "only frax pools can mint new FRAX");
        _;
    } 
    
    modifier onlyByOracle() {
        require(msg.sender == oracle_address, "you're not the oracle :p");
        _;
    }
    
    //this function is what other frax pools will call to mint new FXS (similar to the FRAX mint) 
    function pool_mint(address m_address, uint256 m_amount) public onlyPools {
        super._mint(m_address, m_amount);
    }
    
}
