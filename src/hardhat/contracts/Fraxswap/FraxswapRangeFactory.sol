pragma solidity ^0.8.4;

import './interfaces/IFraxswapRangePair.sol';
import './FraxswapRangePair.sol';
import "hardhat/console.sol";

contract FraxswapRangeFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address[])) public getPairs;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB, uint _centerPrice, uint _rangeSize, uint _fee) external returns (address pair) {
        require(tokenA != tokenB, 'UniswapV2: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2: ZERO_ADDRESS');
        //require(getPair[token0][token1] == address(0), 'UniswapV2: PAIR_EXISTS'); // No need to check for existing, because multiple are allowed
        bytes memory bytecode = type(FraxswapRangePair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1,_centerPrice,_rangeSize,_fee));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IFraxswapRangePair(pair).initialize(token0, token1,_centerPrice,_rangeSize,_fee);
        getPairs[token0][token1].push(pair);
        getPairs[token1][token0].push(pair); // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}