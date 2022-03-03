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
// =============================== FPIS ===============================
// ====================================================================
// Frax Price Index Share
// FPI Utility Token

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jack Corddry: https://github.com/corddry

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

import "../ERC20/ERC20PermissionedMint.sol";

contract FPIS is ERC20PermissionedMint {

    // Core
    ERC20PermissionedMint public FPI_TKN;

    /* ========== CONSTRUCTOR ========== */

    constructor(
      address _creator_address,
      address _timelock_address,
      address _fpi_address
    ) 
    ERC20PermissionedMint(_creator_address, _timelock_address, "Frax Price Index Share", "FPIS") 
    {
      FPI_TKN = ERC20PermissionedMint(_fpi_address);
      
      _mint(_creator_address, 100000000e18); // Genesis mint
    }


    /* ========== RESTRICTED FUNCTIONS ========== */

    function setFPIAddress(address fpi_contract_address) external onlyByOwnGov {
        require(fpi_contract_address != address(0), "Zero address detected");

        FPI_TKN = ERC20PermissionedMint(fpi_contract_address);

        emit FPIAddressSet(fpi_contract_address);
    }

    /* ========== EVENTS ========== */
    event FPIAddressSet(address addr);
}