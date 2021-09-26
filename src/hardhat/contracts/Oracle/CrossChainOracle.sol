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
// ========================= CrossChainOracle =========================
// ====================================================================
// Prices manually set by a bot

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Staking/Owned.sol";

contract CrossChainOracle is Owned {
    // Core
    address public timelock_address;
    address public bot_address;

    // Prices
    mapping(address => uint256) public prices;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovBot() {
        require(msg.sender == owner || msg.sender == timelock_address || msg.sender == bot_address, "Not owner, tlck, or bot");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _timelock_address,
        address _bot_address
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;
        bot_address = _bot_address;

    }

    /* ========== VIEWS ========== */

    function getPrice(address token_address) public view returns (uint256) {
        return prices[token_address];
    }

    /* ========== RESTRICTED FUNCTIONS, BUT BOT CAN SET ========== */

    // Set the price for a token
    function setPrice(address token_address, uint256 price_e6) public onlyByOwnGovBot {
        
        prices[token_address] = price_e6;
    }

    // Batch set prices for multiple tokens
    function setMultiplePrices(address[] memory token_addresses, uint256[] memory prices_e6) public onlyByOwnGovBot {
        for (uint i = 0; i < token_addresses.length; i++){ 
            prices[token_addresses[i]] = prices_e6[i];
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    function setBot(address _new_bot_address) external onlyByOwnGov {
        bot_address = _new_bot_address;
    }

}