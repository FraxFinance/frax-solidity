pragma solidity ^0.8.0;

import './interfaces/IUniswapV2FactoryV5.sol';
import './UniswapV2PairV8.sol';

contract UniswapV2FactoryV8 is IUniswapV2FactoryV5 {
    address public override feeTo;
    address public override feeToSetter;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    bool public override twammWhitelistDisabled = false;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    ///@notice Throws if called by any account other than the feeToSetter.
    modifier onlyFTS() {
        require(msg.sender == feeToSetter, "Not feeToSetter");
        _;
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
        IUniswapV2PairV5(pair).initialize(token0, token1, twammWhitelistDisabled);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setTwammWhitelistDisabled(bool _twammWhitelistDisabled) external override onlyFTS {
        //ECF4: FORBIDDEN
        twammWhitelistDisabled = _twammWhitelistDisabled;
    }

    function setFeeTo(address _feeTo) external override onlyFTS {
        //ECF4: FORBIDDEN
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override onlyFTS {
        //ECF4: FORBIDDEN
        feeToSetter = _feeToSetter;
    }

    function getFactorySettings() public view  returns (address, bool){
        return (feeTo, twammWhitelistDisabled);
    }
}
