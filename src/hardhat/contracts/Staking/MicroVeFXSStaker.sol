// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= MicroVeFXSStaker =========================
// ====================================================================
// Used to test the veFXS Smart Contract Whitelist

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../Curve/IveFXS.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/SafeERC20.sol";

// Inheritance
import "./Owned.sol";

contract MicroVeFXSStaker is Owned {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances
    IveFXS private veFXS = IveFXS(0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0);
    ERC20 private FXS = ERC20(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);

    /* ========== MODIFIERS ========== */

    modifier onlyByOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }    
    /* ========== CONSTRUCTOR ========== */

    constructor (address _owner) Owned(_owner){}

    function vefxs_create_lock(uint256 fxs_amount, uint256 timestamp) external onlyByOwner {
        FXS.approve(address(veFXS), fxs_amount);
        veFXS.create_lock(fxs_amount, timestamp);
    }

    function vefxs_increase_amount(uint256 fxs_amount) external onlyByOwner {
        FXS.approve(address(veFXS), fxs_amount);
        veFXS.increase_amount(fxs_amount);
    }

    function vefxs_increase_unlock_time(uint256 timestamp) external onlyByOwner {
        veFXS.increase_unlock_time(timestamp);
    }

    function vefxs_withdraw() external onlyByOwner {
        veFXS.withdraw();
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwner {
        ERC20(tokenAddress).transfer(owner, tokenAmount);
    }

}
