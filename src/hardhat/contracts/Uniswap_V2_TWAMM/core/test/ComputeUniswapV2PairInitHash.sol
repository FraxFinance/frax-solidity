pragma solidity ^0.8.0;

import '../UniV2TWAMMPair.sol';

contract ComputeUniswapV2PairInitHash{

    function getInitHash() public pure returns(bytes32){
        bytes memory bytecode = type(UniV2TWAMMPair).creationCode;
        return keccak256(abi.encodePacked(bytecode));
    }

}