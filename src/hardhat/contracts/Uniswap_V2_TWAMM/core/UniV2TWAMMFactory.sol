// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= UniV2TWAMMFactory ========================
// ====================================================================
// TWAMM LP Pair Factory
// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian

import './interfaces/IUniswapV2FactoryV5.sol';
import './UniV2TWAMMPair.sol';

contract UniV2TWAMMFactory is IUniswapV2FactoryV5 {
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
        bytes memory bytecode = type(UniV2TWAMMPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        UniV2TWAMMPair(pair).initialize(token0, token1, twammWhitelistDisabled);
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
