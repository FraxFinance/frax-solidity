// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import './interfaces/IUniswapV2PairPartialV5.sol';

contract GlobalPauseHelper {

    function globalPause(address[] calldata pairAddresses)
        external
        returns (bool[] memory successful)
    {
        address pairAddress;
        successful = new bool[](pairAddresses.length);
        for (uint i = 0; i < pairAddresses.length; ++i) {
            pairAddress = pairAddresses[i];
            try IUniswapV2PairPartialV5(pairAddress).togglePauseNewSwaps() {
                successful[i] = true;
            } catch {}
        }
    }
    
}
