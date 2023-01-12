// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================= CrossChainCanonicalV2 ======================
// ====================================================================
// Cross-chain / non mainnet canonical token contract.
// Does not include any spurious mainnet logic
// Does have authorized minters

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jack Corddry: https://github.com/corddry

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: https://github.com/denett

import { ERC20PermitPermissionedMint } from "../ERC20PermitPermissionedMint.sol";

contract CrossChainCanonicalV2 is ERC20PermitPermissionedMint {
    /* ========== CONSTRUCTOR ========== */
    constructor(
        address _creator_address,
        address _timelock_address,
        string memory _name,
        string memory _symbol,
        uint256 _initial_mint_amt
    ) ERC20PermitPermissionedMint(_creator_address, _timelock_address, _name,  _symbol) 
    {
        // Mint some canonical tokens to the creator
        super._mint(_creator_address, _initial_mint_amt);
    }
}
