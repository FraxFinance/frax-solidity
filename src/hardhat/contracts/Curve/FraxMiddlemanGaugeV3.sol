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
// V3: Adds Fraxtal's L1StandardBridge

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
import "../Misc_AMOs/optimism/IL1StandardBridge.sol";


contract FraxMiddlemanGaugeV3 is Owned, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Instances and addresses
    address public reward_token_address = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0; // FXS
    address public fraxtal_reward_token_address = 0xFc00000000000000000000000000000000000002; // FXS
    address public rewards_distributor_address;

    // Informational
    string public name;

    // Admin addresses
    address public timelock_address;

    // Gauge-related
    IFraxferry public ferry;
    IL1StandardBridge public l1StandardBridge;
    uint32 public bridgeL2GasLimit = 200000;
    bytes public bridgeExtraData;
    address public destination_address;

    // Routing
    bool public useL1StandardBridge;


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
        address _l1_standard_bridge_address,
        address _destination_address,
        string memory _name
    ) Owned(_owner) {
        timelock_address = _timelock_address;

        rewards_distributor_address = _rewards_distributor_address;

        ferry = IFraxferry(_ferry_address);
        l1StandardBridge = IL1StandardBridge(_l1_standard_bridge_address);
        destination_address = _destination_address;

        name = _name;

        useL1StandardBridge = true;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // Callable only by the rewards distributor
    function pullAndBridge(uint256 reward_amount) external onlyRewardsDistributor nonReentrant {
        // Check the address
        if (useL1StandardBridge) {
            require(address(l1StandardBridge) != address(0), "Invalid bridge address");
        } else {
            require(address(ferry) != address(0), "Invalid ferry address");
        }
        
        // Pull in the rewards from the rewards distributor
        TransferHelper.safeTransferFrom(reward_token_address, rewards_distributor_address, address(this), reward_amount);

        // Logic here
        if (useL1StandardBridge) { 
            // Use the standard bridge
            ERC20(reward_token_address).approve(address(l1StandardBridge), reward_amount);
            l1StandardBridge.depositERC20To(reward_token_address, fraxtal_reward_token_address, destination_address, reward_amount, bridgeL2GasLimit, bridgeExtraData);

        } else {
            // Use the ferry
            ERC20(reward_token_address).approve(address(ferry), reward_amount);
            ferry.embarkWithRecipient(reward_amount, destination_address);
        }

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


    function setBridgeInfo(address _bridge_address, address _destination_address, uint32 _bridgeL2GasLimit, bytes calldata _bridgeExtraData) external onlyByOwnGov {
        // Set the new bridge
        l1StandardBridge = IL1StandardBridge(_bridge_address);

        // Set the cross-chain destination address
        destination_address = _destination_address;

        // Set other bridge info
        bridgeL2GasLimit = _bridgeL2GasLimit;
        bridgeExtraData = _bridgeExtraData;
        
        emit BridgeInfoChanged(_bridge_address, _destination_address, _bridgeL2GasLimit, _bridgeExtraData);
    }

    function setFerryInfo(address _ferry_address, address _destination_address) external onlyByOwnGov {
        // Set the new ferry
        ferry = IFraxferry(_ferry_address);
        
        // Set the cross-chain destination address
        destination_address = _destination_address;

        emit FerryInfoChanged(_ferry_address, _destination_address);
    }

    function setRewardsDistributor(address _rewards_distributor_address) external onlyByOwnGov {
        rewards_distributor_address = _rewards_distributor_address;
    }

    function setUseL1StandardBridge(bool _useL1StandardBridge) external onlyByOwnGov {
        useL1StandardBridge = _useL1StandardBridge;
    }

    function setTimelock(address _new_timelock) external onlyByOwnGov {
        timelock_address = _new_timelock;
    }

    /* ========== EVENTS ========== */

    event BridgeInfoChanged(address bridge_address, address destination_address, uint32 _bridgeL2GasLimit, bytes _bridgeExtraData);
    event FerryInfoChanged(address ferry_address, address destination_address);
    event RecoveredERC20(address token, uint256 amount);
}
