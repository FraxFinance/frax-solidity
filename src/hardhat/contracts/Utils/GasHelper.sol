// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract GasHelper {
    string private checkpointLabel;
    uint256 private checkpointGasLeft = 1; // Start the slot warm.

    function startMeasuringGas(string memory label) internal virtual {
        checkpointLabel = label;

        checkpointGasLeft = gasleft();
    }

    function stopMeasuringGas() internal virtual returns (uint256 gasDelta) {
        uint256 checkpointGasLeft2 = gasleft();

        // Subtract 100 to account for the warm SLOAD in startMeasuringGas.
        gasDelta = checkpointGasLeft - checkpointGasLeft2 - 100;

        emit GasUsed(string(abi.encodePacked(checkpointLabel, " Gas")), gasDelta);
    }

    event GasUsed(string key, uint val);
}