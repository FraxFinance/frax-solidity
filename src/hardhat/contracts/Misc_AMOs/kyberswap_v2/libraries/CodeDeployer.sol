// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
pragma solidity >=0.8.0;

// Taken from BalancerV2. Only modification made is changing the require statement
// for a failed deployment to an assert statement
library CodeDeployer {
  // During contract construction, the full code supplied exists as code, and can be accessed via `codesize` and
  // `codecopy`. This is not the contract's final code however: whatever the constructor returns is what will be
  // stored as its code.
  //
  // We use this mechanism to have a simple constructor that stores whatever is appended to it. The following opcode
  // sequence corresponds to the creation code of the following equivalent Solidity contract, plus padding to make the
  // full code 32 bytes long:
  //
  // contract CodeDeployer {
  //     constructor() payable {
  //         uint256 size;
  //         assembly {
  //             size := sub(codesize(), 32) // size of appended data, as constructor is 32 bytes long
  //             codecopy(0, 32, size) // copy all appended data to memory at position 0
  //             return(0, size) // return appended data for it to be stored as code
  //         }
  //     }
  // }
  //
  // More specifically, it is composed of the following opcodes (plus padding):
  //
  // [1] PUSH1 0x20
  // [2] CODESIZE
  // [3] SUB
  // [4] DUP1
  // [6] PUSH1 0x20
  // [8] PUSH1 0x00
  // [9] CODECOPY
  // [11] PUSH1 0x00
  // [12] RETURN
  //
  // The padding is just the 0xfe sequence (invalid opcode).
  bytes32 private constant _DEPLOYER_CREATION_CODE =
    0x602038038060206000396000f3fefefefefefefefefefefefefefefefefefefe;

  /**
   * @dev Deploys a contract with `code` as its code, returning the destination address.
   * Asserts that contract deployment is successful
   */
  function deploy(bytes memory code) internal returns (address destination) {
    bytes32 deployerCreationCode = _DEPLOYER_CREATION_CODE;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      let codeLength := mload(code)

      // `code` is composed of length and data. We've already stored its length in `codeLength`, so we simply
      // replace it with the deployer creation code (which is exactly 32 bytes long).
      mstore(code, deployerCreationCode)

      // At this point, `code` now points to the deployer creation code immediately followed by `code`'s data
      // contents. This is exactly what the deployer expects to receive when created.
      destination := create(0, code, add(codeLength, 32))

      // Finally, we restore the original length in order to not mutate `code`.
      mstore(code, codeLength)
    }

    // create opcode returns null address for failed contract creation instances
    // hence, assert that the resulting address is not null
    assert(destination != address(0));
  }
}
