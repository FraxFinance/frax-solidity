pragma solidity ^0.8.0;

import './interfaces/IUniswapV2FactoryV5.sol';
import './UniswapV2PairV8.sol';

contract UniswapV2FactoryV8 is IUniswapV2FactoryV5 {
    address public override feeTo;
    address public override feeToSetter;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        //ECF1: UniswapV2: IDENTICAL_ADDRESSES
        require(tokenA != tokenB);
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        //ECF2: UniswapV2: ZERO_ADDRESS
        require(token0 != address(0));
        //ECF3: UniswapV2: PAIR_EXISTS
        require(getPair[token0][token1] == address(0)); // single check is sufficient
        bytes memory bytecode = type(UniswapV2PairV8).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IUniswapV2PairV5(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override {
        //ECF4: FORBIDDEN
        require(msg.sender == feeToSetter);
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        //ECF4: FORBIDDEN
        require(msg.sender == feeToSetter);
        feeToSetter = _feeToSetter;
    }
}
