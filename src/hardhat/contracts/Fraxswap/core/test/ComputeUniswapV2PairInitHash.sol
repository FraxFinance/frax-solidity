pragma solidity ^0.8.0;

import '../FraxswapPair.sol';

contract ComputeUniswapV2PairInitHash{

    function getInitHash() public pure returns(bytes32){
        bytes memory bytecode = type(FraxswapPair).creationCode;
        return keccak256(abi.encodePacked(bytecode));
    }

}