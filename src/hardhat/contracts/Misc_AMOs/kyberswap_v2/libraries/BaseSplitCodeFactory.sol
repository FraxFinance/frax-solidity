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

import './CodeDeployer.sol';

/**
 * @dev Base factory for contracts whose creation code is so large that the factory cannot hold it. This happens when
 * the contract's creation code grows close to 24kB.
 *
 * Note that this factory cannot help with contracts that have a *runtime* (deployed) bytecode larger than 24kB.
 * Taken from BalancerV2. Only modification made was to add unchecked block for sol 0.8 compatibility
 */
abstract contract BaseSplitCodeFactory {
  // The contract's creation code is stored as code in two separate addresses, and retrieved via `extcodecopy`. This
  // means this factory supports contracts with creation code of up to 48kB.
  // We rely on inline-assembly to achieve this, both to make the entire operation highly gas efficient, and because
  // `extcodecopy` is not available in Solidity.

  // solhint-disable no-inline-assembly

  address private immutable _creationCodeContractA;
  uint256 private immutable _creationCodeSizeA;

  address private immutable _creationCodeContractB;
  uint256 private immutable _creationCodeSizeB;

  /**
   * @dev The creation code of a contract Foo can be obtained inside Solidity with `type(Foo).creationCode`.
   */
  constructor(bytes memory creationCode) {
    uint256 creationCodeSize = creationCode.length;

    // We are going to deploy two contracts: one with approximately the first half of `creationCode`'s contents
    // (A), and another with the remaining half (B).
    // We store the lengths in both immutable and stack variables, since immutable variables cannot be read during
    // construction.
    uint256 creationCodeSizeA = creationCodeSize / 2;
    _creationCodeSizeA = creationCodeSizeA;

    uint256 creationCodeSizeB = creationCodeSize - creationCodeSizeA;
    _creationCodeSizeB = creationCodeSizeB;

    // To deploy the contracts, we're going to use `CodeDeployer.deploy()`, which expects a memory array with
    // the code to deploy. Note that we cannot simply create arrays for A and B's code by copying or moving
    // `creationCode`'s contents as they are expected to be very large (> 24kB), so we must operate in-place.

    // Memory: [ code length ] [ A.data ] [ B.data ]

    // Creating A's array is simple: we simply replace `creationCode`'s length with A's length. We'll later restore
    // the original length.

    bytes memory creationCodeA;
    assembly {
      creationCodeA := creationCode
      mstore(creationCodeA, creationCodeSizeA)
    }

    // Memory: [ A.length ] [ A.data ] [ B.data ]
    //         ^ creationCodeA

    _creationCodeContractA = CodeDeployer.deploy(creationCodeA);

    // Creating B's array is a bit more involved: since we cannot move B's contents, we are going to create a 'new'
    // memory array starting at A's last 32 bytes, which will be replaced with B's length. We'll back-up this last
    // byte to later restore it.

    bytes memory creationCodeB;
    bytes32 lastByteA;

    assembly {
      // `creationCode` points to the array's length, not data, so by adding A's length to it we arrive at A's
      // last 32 bytes.
      creationCodeB := add(creationCode, creationCodeSizeA)
      lastByteA := mload(creationCodeB)
      mstore(creationCodeB, creationCodeSizeB)
    }

    // Memory: [ A.length ] [ A.data[ : -1] ] [ B.length ][ B.data ]
    //         ^ creationCodeA                ^ creationCodeB

    _creationCodeContractB = CodeDeployer.deploy(creationCodeB);

    // We now restore the original contents of `creationCode` by writing back the original length and A's last byte.
    assembly {
      mstore(creationCodeA, creationCodeSize)
      mstore(creationCodeB, lastByteA)
    }
  }

  /**
   * @dev Returns the two addresses where the creation code of the contract crated by this factory is stored.
   */
  function getCreationCodeContracts() public view returns (address contractA, address contractB) {
    return (_creationCodeContractA, _creationCodeContractB);
  }

  /**
   * @dev Returns the creation code of the contract this factory creates.
   */
  function getCreationCode() public view returns (bytes memory) {
    return _getCreationCodeWithArgs('');
  }

  /**
   * @dev Returns the creation code that will result in a contract being deployed with `constructorArgs`.
   */
  function _getCreationCodeWithArgs(bytes memory constructorArgs)
    private
    view
    returns (bytes memory code)
  {
    // This function exists because `abi.encode()` cannot be instructed to place its result at a specific address.
    // We need for the ABI-encoded constructor arguments to be located immediately after the creation code, but
    // cannot rely on `abi.encodePacked()` to perform concatenation as that would involve copying the creation code,
    // which would be prohibitively expensive.
    // Instead, we compute the creation code in a pre-allocated array that is large enough to hold *both* the
    // creation code and the constructor arguments, and then copy the ABI-encoded arguments (which should not be
    // overly long) right after the end of the creation code.

    // Immutable variables cannot be used in assembly, so we store them in the stack first.
    address creationCodeContractA = _creationCodeContractA;
    uint256 creationCodeSizeA = _creationCodeSizeA;
    address creationCodeContractB = _creationCodeContractB;
    uint256 creationCodeSizeB = _creationCodeSizeB;

    uint256 creationCodeSize = creationCodeSizeA + creationCodeSizeB;
    uint256 constructorArgsSize = constructorArgs.length;

    uint256 codeSize = creationCodeSize + constructorArgsSize;

    assembly {
      // First, we allocate memory for `code` by retrieving the free memory pointer and then moving it ahead of
      // `code` by the size of the creation code plus constructor arguments, and 32 bytes for the array length.
      code := mload(0x40)
      mstore(0x40, add(code, add(codeSize, 32)))

      // We now store the length of the code plus constructor arguments.
      mstore(code, codeSize)

      // Next, we concatenate the creation code stored in A and B.
      let dataStart := add(code, 32)
      extcodecopy(creationCodeContractA, dataStart, 0, creationCodeSizeA)
      extcodecopy(creationCodeContractB, add(dataStart, creationCodeSizeA), 0, creationCodeSizeB)
    }

    // Finally, we copy the constructorArgs to the end of the array. Unfortunately there is no way to avoid this
    // copy, as it is not possible to tell Solidity where to store the result of `abi.encode()`.
    uint256 constructorArgsDataPtr;
    uint256 constructorArgsCodeDataPtr;
    assembly {
      constructorArgsDataPtr := add(constructorArgs, 32)
      constructorArgsCodeDataPtr := add(add(code, 32), creationCodeSize)
    }

    _memcpy(constructorArgsCodeDataPtr, constructorArgsDataPtr, constructorArgsSize);
  }

  /**
   * @dev Deploys a contract with constructor arguments. To create `constructorArgs`, call `abi.encode()` with the
   * contract's constructor arguments, in order.
   */
  function _create(bytes memory constructorArgs, bytes32 salt) internal virtual returns (address) {
    bytes memory creationCode = _getCreationCodeWithArgs(constructorArgs);

    address destination;
    assembly {
      destination := create2(0, add(creationCode, 32), mload(creationCode), salt)
    }

    if (destination == address(0)) {
      // Bubble up inner revert reason
      // solhint-disable-next-line no-inline-assembly
      assembly {
        returndatacopy(0, 0, returndatasize())
        revert(0, returndatasize())
      }
    }

    return destination;
  }

  // From
  // https://github.com/Arachnid/solidity-stringutils/blob/b9a6f6615cf18a87a823cbc461ce9e140a61c305/src/strings.sol
  function _memcpy(
    uint256 dest,
    uint256 src,
    uint256 len
  ) private pure {
    // Copy word-length chunks while possible
    for (; len >= 32; len -= 32) {
      assembly {
        mstore(dest, mload(src))
      }
      dest += 32;
      src += 32;
    }

    // Copy remaining bytes
    uint256 mask;
    unchecked {
      mask = 256**(32 - len) - 1;
    }
    assembly {
      let srcpart := and(mload(src), not(mask))
      let destpart := and(mload(dest), mask)
      mstore(dest, or(destpart, srcpart))
    }
  }
}
