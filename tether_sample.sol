pragma solidity ^0.6.0;

import "./Context.sol";
import "./IERC20.sol";
import "./SafeMath.sol";



contract tether is ERC20 {
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

    constructor(
    string memory _symbol, 
    uint256 _genesis_supply,
    address _owner_address) 
    public 
    {
    symbol = _symbol;
    genesis_supply = _genesis_supply;
    owner_address = _owner_address;

    _mint(owner_address, genesis_supply);


}

function mint(address to, uint256 amount) public {
        require(msg.sender == FRAXStablecoinAdd);
        _mint(to, amount);
    }

    
}
