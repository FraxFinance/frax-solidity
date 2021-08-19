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
// ================= Frax Bond Series A ¤10000 3 Month ================
// ====================================================================

import "../FraxBond_NFT.sol";

contract FXBA10000M3 is FraxBond_NFT {
    constructor (
        address _controller_address,
        address _timelock_address,
        string memory _series,
        uint256 _face_value,
        uint256 _maturity_months,
        uint256 _discount,
        uint256 _min_early_redeem_secs,
        uint256 _max_early_redemption_penalty_pct
    ) 
    FraxBond_NFT(_controller_address, _timelock_address,_series, _face_value, _maturity_months,_discount,_min_early_redeem_secs,_max_early_redemption_penalty_pct)
    {}
}

        