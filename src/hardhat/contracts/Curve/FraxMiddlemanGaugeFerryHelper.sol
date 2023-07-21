// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ================== FraxMiddlemanGaugeFerryHelper ===================
// ====================================================================
// Helps a V1 FraxMiddlemanGauge that was deployed before Fraxferry

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian

import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import "./IFraxGaugeFXSRewardsDistributor.sol";
import "../Fraxferry/IFraxferry.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";
import "../Utils/ReentrancyGuard.sol";

contract FraxMiddlemanGaugeFerryHelper is Owned {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Admin addresses
    address public timelock_address;

    // Gauge-related
    IFraxferry public ferry;
    address public middleman_address;


    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }


    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address,
        address _ferry_address,
        address _middleman_address
    ) Owned(_owner) {
        timelock_address = _timelock_address;
        ferry = IFraxferry(_ferry_address);
        middleman_address = _middleman_address;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // Backwards compatibility to mock Harmony bridge's ABI
    function lockToken(address reward_token_address, uint256 reward_amount, address destination_address) external {
        require(msg.sender == middleman_address, "Only the middleman can call");

        // Pull in the rewards from the middleman
        TransferHelper.safeTransferFrom(reward_token_address, msg.sender, address(this), reward_amount);

        // Ferry logic here
        ERC20(reward_token_address).approve(address(ferry), reward_amount);
        ferry.embarkWithRecipient(reward_amount, destination_address);

    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */
    
    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    // Generic proxy
    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyByOwnGov returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value:_value}(_data);
        return (success, result);
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    function setMiddleman(address _new_middleman) external onlyByOwnGov {
        middleman_address = _new_middleman;
    }

    function setFerry(address _ferry_address) external onlyByOwnGov {
        ferry = IFraxferry(_ferry_address);

        emit FerryChanged(_ferry_address);
    }

    /* ========== EVENTS ========== */

    event RecoveredERC20(address token, uint256 amount);
    event FerryChanged(address ferry_address);
}
