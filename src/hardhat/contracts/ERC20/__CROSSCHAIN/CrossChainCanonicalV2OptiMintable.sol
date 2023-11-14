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
// ================= CrossChainCanonicalV2OptiMintable ================
// ====================================================================
// Cross-chain / non mainnet canonical token contract.
// Does not include any spurious mainnet logic
// Does have authorized minters
// Uses

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: https://github.com/denett
// Drake Evans: https://github.com/DrakeEvans
// Justin Moore: https://github.com/0xJM

import { ERC20PermitPermissionedOptiMintable } from "../ERC20PermitPermissionedOptiMintable.sol";

contract CrossChainCanonicalV2OptiMintable is ERC20PermitPermissionedOptiMintable {
    /* ========== CONSTRUCTOR ========== */
    constructor(
        address _creator_address,
        address _timelock_address,
        address _bridge,
        address _remoteToken,
        string memory _name,
        string memory _symbol,
        uint256 _initial_mint_amt
    ) ERC20PermitPermissionedOptiMintable(_creator_address, _timelock_address, _bridge, _remoteToken, _name,  _symbol) 
    {
        // Mint some canonical tokens to the creator
        super._mint(_creator_address, _initial_mint_amt);
    }
}
