// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

// https://ethereum.stackexchange.com/a/69590
library MagnitudesAndPowers {
    
    function magnitude (uint x) public pure returns (uint) {
        require (x > 0);

        uint a = 0;
        uint b = 77;

        while (b > a) {
            uint m = a + b + 1 >> 1;
            if (x >= pow10 (m)) a = m;
            else b = m - 1;
        }

        return a;
    }

    function pow10 (uint x) private pure returns (uint) {
        uint result = 1;
        uint y = 10;
        while (x > 0) {
            if (x % 2 == 1) {
                result *= y;
                x -= 1;
            } else {
                y *= y;
                x >>= 1;
            }
        }
        return result;
    }

}