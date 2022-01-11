pragma solidity ^0.8.0;

import '../UniswapV2PairV8.sol';

contract ComputeUniswapV2PairInitHash{

    function getInitHash() public pure returns(bytes32){
        bytes memory bytecode = type(UniswapV2PairV8).creationCode;
        return keccak256(abi.encodePacked(bytecode));
    }

}