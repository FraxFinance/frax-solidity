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
// ============================ veFPISProxy ===========================
// ====================================================================
// Intermediates between veFPIS.vy and FPIS-using apps
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jack Corddry: https://github.com/corddry
// Travis Moore: https://github.com/FortisFortuna

import "../Staking/Owned.sol";
import "./IveFPIS.sol";
import "../ERC20/IERC20.sol";

/// @title Manages other smart contracts which can use a user's locked FPIS (as part of their veFPIS poistion) as a sort of collateral
/// @dev Is given special permissions in veFPIS.vy to transfer FPIS to itself and whitelisted apps, and also to slash / lock additional FPIS for a user
/// @dev Users cannot withdraw their veFPIS while they have a balance in the proxy
contract veFPISProxy is Owned { 
    uint256 private constant PRECISION = 1e6;

    IveFPIS immutable veFPIS;
    IERC20 immutable FPIS;
    address public timelock;

    mapping(address => bool) public isApp; // True if an app has been whitelisted to use the proxy
    mapping(address => App) public addrToApp; // Maps an app address to a struct containing its parameters
    address[] public allApps; // All apps which have ever been whitelisted

    /* ========== STRUCTS ========== */

    struct App {
        bool allowUserSlashes;
        uint256 maxUsageAllowedPct; // What percent of a user's locked FPIS an app is able to control at max, 1e6 precision
        mapping (address => uint256) userMaxFPISAppCanUse; // Set by user as a cap. In FPIS #, not %
        mapping (address => uint256) userFPISUsed; // The amount of a user's FPIS which is currently custodied in the app
    }

    struct AppViewRtn {
        address app_address;
        uint256 maxUsageAllowedPct; // What percent of a user's locked FPIS an app is able to control at max, 1e6 precision
        bool allowUserSlashes;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(address _owner, address _timelock, address _veFPIS) Owned(_owner) {
        veFPIS = IveFPIS(_veFPIS);
        FPIS = IERC20(veFPIS.token());
        timelock = _timelock;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyApp() {
        require(isApp[msg.sender], "Only callable by app");
        _;
    }

    /* ============= VIEWS ============= */
    function getUserAppUsages(address userAddr, bool give_maxes_too) external view returns (
        uint256[] memory curr_fpis_usages, 
        uint256[] memory max_fpis_usages_app,
        uint256[] memory max_fpis_usages_user,
        uint256[] memory max_fpis_usages_actual
    ) {
        uint256 curr_locked_fpis;
        if (give_maxes_too) curr_locked_fpis = uint256(uint128(veFPIS.locked__amount(userAddr))); // Only needs to be fetched once
        
        // Instantiate the return arrays
        curr_fpis_usages = new uint256[](allApps.length);
        max_fpis_usages_app = new uint256[](allApps.length);
        max_fpis_usages_user = new uint256[](allApps.length);
        max_fpis_usages_actual = new uint256[](allApps.length);

        // Loop
        for(uint i = 0; i < allApps.length; i++) {
            // Get the app-specific usage for this user
            curr_fpis_usages[i] = addrToApp[allApps[i]].userFPISUsed[userAddr];

            // Gas saving option if you don't care about the maxes
            if (give_maxes_too) {
                (uint256 app_max, uint256 user_max, uint256 actual_max) = getUserAppMaxUsages(userAddr, allApps[i]);
                max_fpis_usages_app[i] = app_max;
                max_fpis_usages_user[i] = user_max;
                max_fpis_usages_actual[i] = actual_max;
            }
            else {
                max_fpis_usages_app[i] = 0; // Push zeroes if you don't care
                max_fpis_usages_user[i] = 0; // Push zeroes if you don't care
                max_fpis_usages_actual[i] = 0; // Push zeroes if you don't care
            }

        }
    }

    function getAllApps() external view returns (AppViewRtn[] memory apps) {
        // Instantiate the return array
        apps = new AppViewRtn[](allApps.length);

        // Loop
        for(uint i = 0; i < allApps.length; i++){
            apps[i] = AppViewRtn(allApps[i], addrToApp[allApps[i]].maxUsageAllowedPct, addrToApp[allApps[i]].allowUserSlashes);
        }
    }

    function getUserAppUsage(address userAddr, address appAddr) external view returns (uint256) {
        return addrToApp[appAddr].userFPISUsed[userAddr];
    }

    function getAppMaxUsagePct(address appAddr) public view returns (uint256) {
        return (addrToApp[appAddr].maxUsageAllowedPct);
    }

    /// @notice Returns the max number of a specific user's locked FPIS that a specific app may control
    function getUserAppMaxUsages(address userAddr, address appAddr) public view returns (
        uint256 app_set_max, 
        uint256 user_set_max,
        uint256 actual_max
    ) {
        // Default / set at app-level
        app_set_max = ((addrToApp[appAddr].maxUsageAllowedPct * uint256(uint128(veFPIS.locked__amount(userAddr)))) / PRECISION);
        
        // Set by the user
        user_set_max = addrToApp[appAddr].userMaxFPISAppCanUse[userAddr];

        // The lesser of the two above
        actual_max = ((user_set_max < app_set_max) ? user_set_max : app_set_max);
    }

    /* =============== MUTATIVE FUNCTIONS, APP ONLY =============== */

    /// @notice Moves funds from an app to veFPIS.vy 
    /// @dev App must first approve the veFPIS contract to spend the amount of FPIS to payback
    function transferFromAppToVeFPIS(address userAddr, uint256 amountFPIS) external onlyApp {
        App storage app = addrToApp[msg.sender];
        require (amountFPIS <= app.userFPISUsed[userAddr], "Payback amount exceeds usage");

        // Account for the change beforehand, for CEI
        app.userFPISUsed[userAddr] -= amountFPIS;

        // Make sure the app approved to this contract first, or this entire function will revert
        veFPIS.transfer_from_app(userAddr, msg.sender, int128(int256(amountFPIS)));

        emit TransferredFromAppToVeFPIS(msg.sender, userAddr, amountFPIS);
    }

    /// @notice Moves funds from veFPIS.vy to an app and increases usage
    function transferFromVeFPISToApp(address userAddr, uint256 amountFPIS) external onlyApp {
        App storage app = addrToApp[msg.sender];
        
        // Pull in the funds from veFPIS.vy, then give them to the app
        veFPIS.transfer_to_app(userAddr, msg.sender, int128(int256(amountFPIS)));

        // Account for the change
        app.userFPISUsed[userAddr] += amountFPIS;

        // Do the check at the end for safety
        (, , uint256 max_usage_to_use) = getUserAppMaxUsages(userAddr, msg.sender);
        require(app.userFPISUsed[userAddr]<= max_usage_to_use, "max_usage_to_use limit");

        emit TransferredFromVeFPISToApp(msg.sender, userAddr, amountFPIS);
    }

    /// @dev App must first approve the veFPIS contract to spend the surplus amount of FPIS to payback
    function appAdd(address userAddr, uint256 amountFPIS) external onlyApp {
        App storage app = addrToApp[msg.sender];

        // Find the max the app is allowed to use.
        (, , uint256 max_usage_to_use) = getUserAppMaxUsages(userAddr, msg.sender);

        // Add the entire amountFPIS amount first
        veFPIS.proxy_add(userAddr, amountFPIS);

        // Initialize variable
        uint256 surplus_amt;

        // If the user above app max usage limit (e.g. due to profits), you need to push the surplus back to veFPIS.vy
        if (app.userFPISUsed[userAddr] + amountFPIS > max_usage_to_use) {
            // User is over the app usage limit
            // ==========================

            // Calculate the surplus amount over the limit
            surplus_amt = app.userFPISUsed[userAddr] + amountFPIS - max_usage_to_use; 

            // Transfer the surplus FPIS back to the user
            // Make sure app approves first
            veFPIS.transfer_from_app(userAddr, msg.sender, int128(int256(surplus_amt)));

            // Max out the user at the new app cap
            app.userFPISUsed[userAddr] = max_usage_to_use;
        }
        else {
            // User is under the app usage limit
            // ==========================

            // Account for the change
            app.userFPISUsed[userAddr] += amountFPIS;
        }

        // Final redundancy check
        require(app.userFPISUsed[userAddr] <= max_usage_to_use, "Usage exceeds limit");

        emit AppAdds(msg.sender, userAddr, amountFPIS, surplus_amt);
    }

    function _slash(address userAddr, address appAddr, uint256 amountFPIS) internal {
        require(isApp[appAddr], "App nonexistent");
        App storage app = addrToApp[appAddr];
        
        require (amountFPIS <= app.userFPISUsed[userAddr], "Slash amount exceeds usage");

        // Slash the user's veFPIS position
        veFPIS.proxy_slash(userAddr, amountFPIS);

        // Account for the change
        app.userFPISUsed[userAddr] -= amountFPIS;
    }

    function appSlash(address userAddr, uint256 amountFPIS) external onlyApp {
        _slash(userAddr, msg.sender, amountFPIS);
        emit AppSlashes(msg.sender, userAddr, amountFPIS);
    }

    /* =============== MUTATIVE FUNCTIONS, USER ONLY =============== */

    /// @notice User sets the max FPIS usage allowed for an app. 
    /// @notice Overrides the setAppMaxUsagePct if this number ends up being lower
    function userSetAppMaxFPISUsage(address appAddr, uint256 max_fpis) external {
        require(isApp[appAddr], "App nonexistent");
        addrToApp[appAddr].userMaxFPISAppCanUse[msg.sender] = max_fpis;

        emit UserSetAppMaxFPISUsage(appAddr, max_fpis);
    }

    /// @notice Allows a user to slash themselves if Owner has enabled it
    /// @dev useful in the case of a bug in the app which would otherwise prevent user from withdrawing from veFPIS
    function userSlash(address appAddr, uint256 amountFPIS) external {
        require(addrToApp[appAddr].allowUserSlashes, "User slashes not allowed"); 
        _slash(msg.sender, appAddr, amountFPIS);
        emit UserSlashes(appAddr, msg.sender, amountFPIS);
    }

    /* ========== RESTRICTED FUNCTIONS - Owner or timelock only ========== */

    /// @notice Whitelists an app to use the proxy and sets the max usage and max slash 
    function addNewApp(address appAddr, uint256 newMaxUsageAllowedPct, bool allowUserSlashes) external onlyOwner {
        require(!isApp[appAddr], "App already added");
        require(newMaxUsageAllowedPct <= PRECISION, "Must be <= PRECISION");
        isApp[appAddr] = true;
        addrToApp[appAddr].maxUsageAllowedPct = newMaxUsageAllowedPct;
        addrToApp[appAddr].allowUserSlashes = allowUserSlashes;
        
        // Add the new app address to the array
        allApps.push(appAddr);

        emit AddNewApp(appAddr, newMaxUsageAllowedPct);
    }

    /// @notice Sets the max usage allowed for an app. Individual users can set lower than this with 
    /// @notice E.g. a lending app could prevent a user from using more than, say, 10% of their locked FPIS in it.
    function setAppMaxUsagePct(address appAddr, uint256 newMaxUsageAllowedPct) external onlyOwner {
        require(isApp[appAddr], "App nonexistent");
        addrToApp[appAddr].maxUsageAllowedPct = newMaxUsageAllowedPct;

        emit SetAppMaxUsagePct(appAddr, newMaxUsageAllowedPct);
    }

    function setAppAllowUserSlashes(address appAddr, bool allowUserSlashes) external onlyOwner {
        require(isApp[appAddr], "App nonexistent");
        addrToApp[appAddr].allowUserSlashes = allowUserSlashes;

        emit SetAppAllowUserSlashes(appAddr, allowUserSlashes);
    }

    function setTimelock(address _timelock) external onlyOwner {
        timelock = _timelock;

    }

    /* ========== EVENTS ========== */
    event TransferredFromAppToVeFPIS(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event TransferredFromVeFPISToApp(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event AppAdds(address indexed app_address, address indexed user_address, uint256 fpis_amount, uint256 surplus_amt);
    event AppSlashes(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event UserSlashes(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event AddNewApp(address indexed app_address, uint256 newMaxUsageAllowedPct);
    event SetAppMaxUsagePct(address indexed app_address, uint256 newMaxUsageAllowedPct);
    event SetAppAllowUserSlashes(address indexed appAddr, bool allowUserSlashes);
    event UserSetAppMaxFPISUsage(address indexed app_address, uint256 max_fpis);
}