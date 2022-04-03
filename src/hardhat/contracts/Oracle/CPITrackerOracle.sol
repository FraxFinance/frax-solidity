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
// ========================= CPITrackerOracle =========================
// ====================================================================
// Pull in CPI data and track it in Dec 2021 dollars

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// References
// https://docs.chain.link/docs/make-a-http-get-request/#api-consumer-example

import "@openzeppelin/contracts/utils/Strings.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/vendor/ENSResolver.sol";
import "../Math/BokkyPooBahsDateTimeContract.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';

contract CPITrackerOracle is Owned, ChainlinkClient {
    using Chainlink for Chainlink.Request;
  
    // Core
    BokkyPooBahsDateTimeContract public time_contract;
    address public timelock_address;
    address public bot_address;

    // Data
    uint256 public cpi_last = 28012600000; // Dec 2021 CPI-U, 280.126 * 100000000
    uint256 public cpi_target = 28193300000; // Jan 2022 CPI-U, 281.933 * 100000000
    uint256 public peg_price_last = 1e18; // Use currPegPrice(). Will always be in Dec 2021 dollars
    uint256 public peg_price_target = 1006450668627688968; // Will always be in Dec 2021 dollars

    // Chainlink
    address public oracle; // Chainlink CPI oracle address
    bytes32 public jobId; // Job ID for the CPI-U date
    uint256 public fee; // LINK token fee

    // Tracking
    uint256 public stored_year = 2022; // Last time (year) the stored CPI data was updated
    uint256 public stored_month = 1; // Last time (month) the stored CPI data was updated
    uint256 public lastUpdateTime = 1644886800; // Last time the stored CPI data was updated.
    uint256 public ramp_period = 28 * 86400; // Apply the CPI delta to the peg price over a set period
    uint256 public future_ramp_period = 28 * 86400;
    CPIObservation[] public cpi_observations; // Historical tracking of CPI data

    // Safety
    uint256 public max_delta_frac = 25000; // 2.5%. Max month-to-month CPI delta. 

    // Misc
    string[13] public month_names; // English names of the 12 months
    uint256 public fulfill_ready_day = 15; // Date of the month that CPI data is expected to by ready by


    /* ========== STRUCTS ========== */
    
    struct CPIObservation {
        uint256 result_year;
        uint256 result_month;
        uint256 cpi_target;
        uint256 peg_price_target;
        uint256 timestamp;
    }

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
        address _timelock_address
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;

        // Initialize the array. Cannot be done in the declaration
        month_names = [
            '',
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ];

        // CPI [Ethereum]
        // =================================
        // setPublicChainlinkToken();
        // time_contract = BokkyPooBahsDateTimeContract(0x90503D86E120B3B309CEBf00C2CA013aB3624736);
        // oracle = 0x049Bd8C3adC3fE7d3Fc2a44541d955A537c2A484;
        // jobId = "1c309d42c7084b34b1acf1a89e7b51fc";
        // fee = 50e18; // 50 LINK

        // CPI [Polygon Mainnet]
        // =================================
        // setChainlinkToken(0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39);
        // time_contract = BokkyPooBahsDateTimeContract(0x998da4fCB229Db1AA84395ef6f0c6be6Ef3dbE58);
        // oracle = 0x9B44870bcc35734c08e40F847cC068c0bA618194;
        // jobId = "8107f18343a24980b2fe7d3c8f32630f";
        // fee = 1e17; // 0.1 LINK

        // CPI [Polygon Mumbai]
        // =================================
        setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
        time_contract = BokkyPooBahsDateTimeContract(0x2Dd1B4D4548aCCeA497050619965f91f78b3b532);
        oracle = 0x3c30c5c415B2410326297F0f65f5Cbb32f3aefCc;
        jobId = "32c3e7b12fe44665a4e2bb87aa9779af";
        fee = 1e17; // 0.1 LINK

        // Add the first observation
        cpi_observations.push(CPIObservation(
            2021,
            12,
            cpi_last,
            peg_price_last,
            1642208400 // Dec data observed on Jan 15 2021
        ));

        // Add the second observation
        cpi_observations.push(CPIObservation(
            2022,
            1,
            cpi_target,
            peg_price_target,
            1644886800 // Jan data observed on Feb 15 2022
        ));
    }

    /* ========== VIEWS ========== */
    function upcomingCPIParams() public view returns (
        uint256 upcoming_year,
        uint256 upcoming_month, 
        uint256 upcoming_timestamp
    ) {
        if (stored_month == 12) {
            upcoming_year = stored_year + 1;
            upcoming_month = 1;
        }
        else {
            upcoming_year = stored_year;
            upcoming_month = stored_month + 1;
        }

        // Data is usually released by the 15th day of the next month (fulfill_ready_day)
        // https://www.usinflationcalculator.com/inflation/consumer-price-index-release-schedule/
        upcoming_timestamp = time_contract.timestampFromDate(upcoming_year, upcoming_month, fulfill_ready_day);
    }

    // Display the upcoming CPI month
    function upcomingSerie() external view returns (string memory serie_name) {
        // Get the upcoming CPI params
        (uint256 upcoming_year, uint256 upcoming_month, ) = upcomingCPIParams();

        // Convert to a string
        return string(abi.encodePacked("CUSR0000SA0", " ", month_names[upcoming_month], " ", Strings.toString(upcoming_year)));
    }

    // Delta between the current and previous peg prices
    function currDeltaFracE6() public view returns (int256) {
        return int256(((peg_price_target - peg_price_last) * 1e6) / peg_price_last);
    }

    // Absolute value of the delta between the current and previous peg prices
    function currDeltaFracAbsE6() public view returns (uint256) {
        int256 curr_delta_frac = currDeltaFracE6();
        if (curr_delta_frac > 0) return uint256(curr_delta_frac);
        else return uint256(-curr_delta_frac);
    }

    // Current peg price in E18, accounting for the ramping
    function currPegPrice() external view returns (uint256) {
        uint256 elapsed_time = block.timestamp - lastUpdateTime;
        if (elapsed_time >= ramp_period) {
            return peg_price_target;
        }
        else {
            // Calculate the fraction of the delta to use, based on the elapsed time
            // Can be negative in case of deflation (that never happens right :])
            int256 fractional_price_delta = (int256(peg_price_target - peg_price_last) * int256(elapsed_time)) / int256(ramp_period);
            return uint256(int256(peg_price_last) + int256(fractional_price_delta));
        }
    }

    /* ========== MUTATIVE ========== */

    // Fetch the CPI data from the Chainlink oracle
    function requestCPIData() external onlyByOwnGovBot returns (bytes32 requestId) 
    {
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);

        // Get the upcoming CPI params
        (uint256 upcoming_year, uint256 upcoming_month, uint256 upcoming_timestamp) = upcomingCPIParams();

        // Don't update too fast
        require(block.timestamp >= upcoming_timestamp, "Too early");

        request.add("serie", "CUSR0000SA0"); // CPI-U: https://data.bls.gov/timeseries/CUSR0000SA0
        request.add("month", month_names[upcoming_month]);
        request.add("year", Strings.toString(upcoming_year)); 
        return sendChainlinkRequestTo(oracle, request, fee);
    }

    /**
     * Callback function
     */
    //  Called by the Chainlink oracle
    function fulfill(bytes32 _requestId, uint256 result) public recordChainlinkFulfillment(_requestId)
    {
        // Set the stored CPI and price to the old targets
        cpi_last = cpi_target;
        peg_price_last = peg_price_target;

        // Set the target CPI and price based on the results
        cpi_target = result;
        peg_price_target = (peg_price_last * cpi_target) / cpi_last;

        // Make sure the delta isn't too large
        require(currDeltaFracAbsE6() <= max_delta_frac, "Delta too high");

        // Update the timestamp
        lastUpdateTime = block.timestamp;

        // Update the year and month
        (uint256 result_year, uint256 result_month, ) = upcomingCPIParams();
        stored_year = result_year;
        stored_month = result_month;

        // Update the future ramp period, if applicable
        // A ramp cannot be updated mid-month as it will mess up the last_price math;
        ramp_period = future_ramp_period;

        // Add the observation
        cpi_observations.push(CPIObservation(
            result_year,
            result_month,
            cpi_target,
            peg_price_target,
            block.timestamp
        ));

        emit CPIUpdated(result_year, result_month, result, peg_price_target, ramp_period);
    }

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunc,
        uint256 _expiration
    ) external onlyByOwnGovBot {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunc, _expiration);
    }
    
    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    function setBot(address _new_bot_address) external onlyByOwnGov {
        bot_address = _new_bot_address;
    }

    function setOracleInfo(address _oracle, bytes32 _jobId, uint256 _fee) external onlyByOwnGov {
        oracle = _oracle;
        jobId = _jobId;
        fee = _fee;
    }

    function setMaxDeltaFrac(uint256 _max_delta_frac) external onlyByOwnGov {
        max_delta_frac = _max_delta_frac; 
    }

    function setFulfillReadyDay(uint256 _fulfill_ready_day) external onlyByOwnGov {
        fulfill_ready_day = _fulfill_ready_day; 
    }

    function setFutureRampPeriod(uint256 _future_ramp_period) external onlyByOwnGov {
        future_ramp_period = _future_ramp_period; // In sec
    }

    // Mainly for recovering LINK
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
    }

    /* ========== EVENTS ========== */
    
    event CPIUpdated(uint256 year, uint256 month, uint256 result, uint256 peg_price_target, uint256 ramp_period);
}