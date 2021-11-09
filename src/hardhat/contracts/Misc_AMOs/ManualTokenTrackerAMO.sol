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
// ======================= ManualTokenTrackerAMO ======================
// ====================================================================
// Balances manually set by a bot. Calculations done off chain to lower gas.
// Calculating collatDollarBalance on-chain can be extremely gassy.
// Sum of misc token balances in various addresses;
// Has dollarBalances(), so it can be added to an AMOMinter

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

contract ManualTokenTrackerAMO is Owned {
    // Core
    address public timelock_address;
    address public bot_address;

    // Balances
    uint256 public fraxDollarBalanceStored;
    uint256 public collatDollarBalanceStored;

    // Safeguards
    uint256 public change_tolerance = 75000; // E6

    // Price constants
    uint256 public constant PRICE_PRECISION = 1e6;

    // Misc
    uint256 public last_timestamp;
    uint256 public min_cooldown_secs = 14400; // 4 hours

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

    // Check if setDollarBalances() can be called by the bot instead of wasting gas calling it
    function canUpdate() public view returns (bool) {
        uint256 timeElapsed = block.timestamp - last_timestamp;
        return (timeElapsed >= min_cooldown_secs);
    }

    function collatDollarBalance() external view returns (uint256) {
        (, uint256 collat_val_e18) = dollarBalances();
        return collat_val_e18;
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = fraxDollarBalanceStored;
        collat_val_e18 = collatDollarBalanceStored;
    }

    /* ========== RESTRICTED FUNCTIONS, BUT BOT CAN SET ========== */

    // Set the dollar balances for tracked tokens.
    // These balances are calculated off-chain due to extensive gas.
    // The very first set should be done manually
    function setDollarBalances(
        uint256 _new_frax_dollar_balance, 
        uint256 _new_collat_dollar_balance, 
        bool bypass_checks
    ) public onlyByOwnGovBot {
        // The bot cannot bypass the checks or update too fast
        if (msg.sender == bot_address) {
            require(!bypass_checks, "Only owner or governance can bypass checks");
            require(block.timestamp >= (last_timestamp + min_cooldown_secs), "Too soon");
        }

        // Calculate the max change in either direction
        uint256 frax_db_change = (fraxDollarBalanceStored * change_tolerance) / PRICE_PRECISION;
        uint256 collat_db_change = (collatDollarBalanceStored * change_tolerance) / PRICE_PRECISION;

        // Do the checks
        if (!bypass_checks){
            // FRAX Dollar Balance
            if (_new_frax_dollar_balance >= fraxDollarBalanceStored) {
                require(
                    _new_frax_dollar_balance <= (fraxDollarBalanceStored + frax_db_change), 
                    "_new_frax_dollar_balance too high"
                );
            }
            else {
                // Prevent underflow
                uint256 lower_frax_db_bound = 0;
                if (frax_db_change < fraxDollarBalanceStored){
                    lower_frax_db_bound = fraxDollarBalanceStored - frax_db_change;
                }
                require(
                    _new_frax_dollar_balance >= lower_frax_db_bound, 
                    "_new_frax_dollar_balance too low"
                );
            }

            // Collat Dollar Balance
            if (_new_collat_dollar_balance >= collatDollarBalanceStored) {
                require(
                    _new_collat_dollar_balance <= (collatDollarBalanceStored + collat_db_change), 
                    "_new_collat_dollar_balance too high"
                );
            }
            else {
                // Prevent underflow
                uint256 lower_collat_db_bound = 0;
                if (collat_db_change < collatDollarBalanceStored){
                    lower_collat_db_bound = collatDollarBalanceStored - collat_db_change;
                }
                require(
                    _new_collat_dollar_balance >= lower_collat_db_bound, 
                    "_new_collat_dollar_balance too low"
                );
            }
        }

        // Set the values
        fraxDollarBalanceStored = _new_frax_dollar_balance;
        collatDollarBalanceStored = _new_collat_dollar_balance;
        last_timestamp = block.timestamp;
    }


    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    function setBot(address _new_bot_address) external onlyByOwnGov {
        bot_address = _new_bot_address;
    }

    // Used to block fat-finger balance changes, or balanceOf/pricing errors
    // In E6. 50000 = +/- 5% tolerance 
    function setChangeTolerance(uint256 _change_tolerance) external onlyByOwnGov {
        change_tolerance = _change_tolerance;
    }

    // Used as a further safety feature
    function setMinCooldownSecs(uint256 _min_cooldown_secs) external onlyByOwnGov {
        min_cooldown_secs = _min_cooldown_secs;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
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

    /* ========== EVENTS ========== */

    event RecoveredERC20(address token, uint256 amount);
}