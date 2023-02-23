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
// ======================= FraxMiddlemanGaugeV2 =======================
// ====================================================================
// Looks at the gauge controller contract and pushes out FXS rewards once
// a week to the gauges (farms).
// This contract is what gets added to the gauge as a 'slice'
// V2: Uses Fraxferry instead of miscellaneous 3rd-party bridges

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

contract FraxMiddlemanGaugeV2 is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    address public reward_token_address = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0; // FXS
    address public rewards_distributor_address;

    // Informational
    string public name;

    // Admin addresses
    address public timelock_address;

    // Gauge-related
    IFraxferry public ferry;
    address public destination_address;


    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier onlyRewardsDistributor() {
        require(msg.sender == rewards_distributor_address, "Not rewards distributor");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner,
        address _timelock_address,
        address _rewards_distributor_address,
        address _ferry_address,
        address _destination_address,
        string memory _name
    ) Owned(_owner) {
        timelock_address = _timelock_address;

        rewards_distributor_address = _rewards_distributor_address;

        ferry = IFraxferry(_ferry_address);
        destination_address = _destination_address;

        name = _name;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // Callable only by the rewards distributor
    function pullAndBridge(uint256 reward_amount) external onlyRewardsDistributor nonReentrant {
        require(address(ferry) != address(0), "Invalid bridge address");

        // Pull in the rewards from the rewards distributor
        TransferHelper.safeTransferFrom(reward_token_address, rewards_distributor_address, address(this), reward_amount);

        // Logic here
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

    function setBridgeInfo(address _ferry_address, address _destination_address) external onlyByOwnGov {
        ferry = IFraxferry(_ferry_address);
        
        // Overridden cross-chain destination address
        destination_address = _destination_address;

        
        emit BridgeInfoChanged(_ferry_address, _destination_address);
    }

    function setRewardsDistributor(address _rewards_distributor_address) external onlyByOwnGov {
        rewards_distributor_address = _rewards_distributor_address;
    }

    /* ========== EVENTS ========== */

    event RecoveredERC20(address token, uint256 amount);
    event BridgeInfoChanged(address ferry_address, address destination_address);
}
