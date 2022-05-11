// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================== FraxswapFactory =========================
// ====================================================================
// TWAMM LP Pair Factory
// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// Logic / Algorithm Ideas
// FrankieIsLost: https://github.com/FrankieIsLost

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian
// Drake Evans: https://github.com/DrakeEvans
// Jack Corddry: https://github.com/corddry
// Justin Moore: https://github.com/0xJM

import './interfaces/IUniswapV2FactoryV5.sol';
import './FraxswapPair.sol';

contract FraxswapFactory is IUniswapV2FactoryV5 {
    address public override feeTo;
    address public override feeToSetter;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    ///@notice Throws if called by any account other than the feeToSetter.
    modifier onlyFTS() {
        require(msg.sender == feeToSetter); // FORBIDDEN
        _;
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES"); // IDENTICAL_ADDRESSES
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS"); // ZERO_ADDRESS
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS"); // PAIR_EXISTS // single check is sufficient
        bytes memory bytecode = type(FraxswapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        FraxswapPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override onlyFTS {
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override onlyFTS {
        feeToSetter = _feeToSetter;
    }
}
