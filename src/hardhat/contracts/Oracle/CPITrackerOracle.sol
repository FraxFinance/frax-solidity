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
// Pull in CPI data and track it in 2022 dollars

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
    uint256 public price_starting_dollars = 1e18;
    uint256 public stored_result = 27880200000; // Dec 2021 CPI-U, 278.802 * 100000000

    // Chainlink
    address public oracle;
    bytes32 public jobId;
    uint256 public fee;

    // Tracking
    uint256 public stored_year = 2021;
    uint256 public stored_month = 12;
    uint256 public lastUpdateTime;

    // Misc
    string[13] public month_names;
    
    // Constants
    uint256 public constant RESULT_MULTIPLIER = 100000000;


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
        setPublicChainlinkToken();
        time_contract = BokkyPooBahsDateTimeContract(0x90503D86E120B3B309CEBf00C2CA013aB3624736);
        oracle = 0x049Bd8C3adC3fE7d3Fc2a44541d955A537c2A484;
        jobId = "74295b9df3264781bf904d9e596a2e57";
        fee = 1e18; // 1 LINK

        // CPI [Polygon Mainnet]
        // =================================
        // setChainlinkToken(0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39);
        // time_contract = BokkyPooBahsDateTimeContract(0x998da4fCB229Db1AA84395ef6f0c6be6Ef3dbE58);
        // oracle = 0x9B44870bcc35734c08e40F847cC068c0bA618194;
        // jobId = "8107f18343a24980b2fe7d3c8f32630f";
        // fee = 1e17; // 0.1 LINK

        // CPI [Polygon Mumbai]
        // =================================
        // setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
        // time_contract = BokkyPooBahsDateTimeContract(0x0000000000000000000000000000000000000000);
        // oracle = 0x3c30c5c415B2410326297F0f65f5Cbb32f3aefCc;
        // jobId = "32c3e7b12fe44665a4e2bb87aa9779af";
        // fee = 1e17; // 0.1 LINK
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

        // Data is usually released by the 15th day of the next month
        // https://www.usinflationcalculator.com/inflation/consumer-price-index-release-schedule/
        upcoming_timestamp = time_contract.timestampFromDate(upcoming_year, upcoming_month, 15);
    }

    function lastPrice() public view returns (uint256) {
        return price_starting_dollars;
    }

    function lastIndex() public view returns (uint256) {
        return stored_result;
    }

    /* ========== MUTATIVE ========== */

    function requestCPIData() public onlyByOwnGovBot returns (bytes32 requestId) 
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
    function fulfill(bytes32 _requestId, uint256 result) public recordChainlinkFulfillment(_requestId)
    {
        // Update the starting dollars amount
        price_starting_dollars = (price_starting_dollars * result) / stored_result;

        // Update the raw result
        stored_result = result;

        // Update the timestamp
        lastUpdateTime = block.timestamp;

        // Update the year and month
        (uint256 result_year, uint256 result_month, ) = upcomingCPIParams();
        stored_year = result_year;
        stored_month = result_month;

        emit CPIUpdated(result_year, result_month, result, price_starting_dollars);
    }
    
    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    function setBot(address _new_bot_address) external onlyByOwnGov {
        bot_address = _new_bot_address;
    }

    // Mainly for recovering LINK
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
    }

    /* ========== EVENTS ========== */
    
    event CPIUpdated(uint256 year, uint256 month, uint256 result, uint256 price_starting_dollars);
}