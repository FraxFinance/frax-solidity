// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

library QuadMath {
  // our equation is ax^2 - 2bx + c = 0, where a, b and c > 0
  // the qudratic formula to obtain the smaller root is (2b - sqrt((2*b)^2 - 4ac)) / 2a
  // which can be simplified to (b - sqrt(b^2 - ac)) / a
  function getSmallerRootOfQuadEqn(
    uint256 a,
    uint256 b,
    uint256 c
  ) internal pure returns (uint256 smallerRoot) {
    smallerRoot = (b - sqrt(b * b - a * c)) / a;
  }

  // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
  function sqrt(uint256 y) internal pure returns (uint256 z) {
    unchecked {
      if (y > 3) {
        z = y;
        uint256 x = y / 2 + 1;
        while (x < z) {
          z = x;
          x = (y / x + x) / 2;
        }
      } else if (y != 0) {
        z = 1;
      }
    }
  }
}
