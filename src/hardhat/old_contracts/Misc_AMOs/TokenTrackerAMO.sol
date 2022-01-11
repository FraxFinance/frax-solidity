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
// ========================== TokenTrackerAMO =========================
// ====================================================================
// Tracks the value of protocol-owned ERC tokens (and ETH too) so they 
// can be added to the global collateral value.
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)

// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../Oracle/AggregatorV3Interface.sol";
import "../Frax/IFraxAMOMinter.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";

contract TokenTrackerAMO is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    IFraxAMOMinter private amo_minter;
    AggregatorV3Interface private priceFeedETHUSD;

    // Tracked addresses
    address[] public tracked_addresses;
    mapping(address => bool) public is_address_tracked; // tracked address => is tracked
    mapping(address => address[]) public tokens_for_address; // tracked address => tokens to track

    // Oracle related
    mapping(address => OracleInfo) public oracle_info; // token address => info
    uint256 public chainlink_eth_usd_decimals;

    address public timelock_address;
    address public custodian_address;

    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant EXTRA_PRECISION = 1e6;

    /* ========== STRUCTS ========== */
    
    struct OracleInfo {
        address token_address;
        string description;
        address aggregator_address;
        uint256 other_side_type; // 0: USD, 1: ETH
        uint256 decimals;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address,
        address[] memory _initial_tracked_addresses,
        OracleInfo[] memory _initial_oracle_infos
    ) Owned(_owner_address) {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Initialize ETH/USD
        priceFeedETHUSD = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
        chainlink_eth_usd_decimals = priceFeedETHUSD.decimals();

        // Set the initial oracle info
        for (uint256 i = 0; i < _initial_oracle_infos.length; i++){ 
            OracleInfo memory thisOracleInfo = _initial_oracle_infos[i];
            _setOracleInfo(thisOracleInfo.token_address, thisOracleInfo.aggregator_address, thisOracleInfo.other_side_type);
        }

        // Set the initial tracked addresses
        for (uint256 i = 0; i < _initial_tracked_addresses.length; i++){ 
            address tracked_addr = _initial_tracked_addresses[i];
            tracked_addresses.push(tracked_addr);
            is_address_tracked[tracked_addr] = true;

            // Add the initial tokens to each tracked_address
            for (uint256 j = 0; j < _initial_oracle_infos.length; j++){ 
                OracleInfo memory thisOracleInfo = _initial_oracle_infos[j];
                tokens_for_address[tracked_addr].push(thisOracleInfo.token_address);
            }
        }


    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    modifier onlyByMinter() {
        require(msg.sender == address(amo_minter), "Not minter");
        _;
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[1] memory allocations) {
        allocations[0] = getTotalValue(); // Total Value
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = getTotalValue();
        collat_val_e18 = frax_val_e18;
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    function allTrackedAddresses() public view returns (address[] memory) {
        return tracked_addresses;
    }

    function allTokensForAddress(address tracked_address) public view returns (address[] memory) {
        return tokens_for_address[tracked_address];
    }

    function getETHPrice() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedETHUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return uint256(price).mul(PRICE_PRECISION).div(10 ** chainlink_eth_usd_decimals);
    }

    // In USD
    function getPrice(address token_address) public view returns (uint256 raw_price, uint256 precise_price) {
        // Oracle info
        OracleInfo memory thisOracle = oracle_info[token_address];

        // Get the price
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = AggregatorV3Interface(thisOracle.aggregator_address).latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");
        
        uint256 price_u256 = uint256(price);

        // Convert to USD, if not already
        if (thisOracle.other_side_type == 1) price_u256 = (price_u256 * getETHPrice()) / PRICE_PRECISION;

        // E6
        raw_price = (price_u256 * PRICE_PRECISION) / (uint256(10) ** thisOracle.decimals);

        // E18
        precise_price = (price_u256 * PRICE_PRECISION * EXTRA_PRECISION) / (uint256(10) ** thisOracle.decimals);
    }

    // In USD
    function getValueInAddress(address tracked_address) public view returns (uint256 value_usd_e18) {
        require(is_address_tracked[tracked_address], "Address not being tracked");

        // Get ETH value first
        value_usd_e18 = (tracked_address.balance * getETHPrice()) / PRICE_PRECISION;

        // Get token values
        address[] memory tracked_token_arr = tokens_for_address[tracked_address];
        for (uint i = 0; i < tracked_token_arr.length; i++){ 
            address the_token_addr = tracked_token_arr[i];
            if (the_token_addr != address(0)) {
                ( , uint256 precise_price) = getPrice(the_token_addr);
                uint256 missing_decimals = uint256(18) - ERC20(the_token_addr).decimals();
                value_usd_e18 += (((ERC20(the_token_addr).balanceOf(tracked_address) * (10 ** missing_decimals)) * precise_price) / (PRICE_PRECISION * EXTRA_PRECISION));
            }
        }
    }

    // In USD
    function getTotalValue() public view returns (uint256 value_usd_e18) {
        // Initialize
        value_usd_e18 = 0;

        // Loop through all of the tracked addresses
        for (uint i = 0; i < tracked_addresses.length; i++){ 
            if (tracked_addresses[i] != address(0)) {
                value_usd_e18 += getValueInAddress(tracked_addresses[i]);
            }
        }
    }
   
    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setAMOMinter(address _amo_minter_address) external onlyByOwnGov {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Make sure the new addresses are not address(0)
        require(custodian_address != address(0) && timelock_address != address(0), "Invalid custodian or timelock");
    }

    // ---------------- Oracle Related ----------------

    // Sets oracle info for a token 
    // other_side_type: 0 = USD, 1 = ETH
    // https://docs.chain.link/docs/ethereum-addresses/
    function _setOracleInfo(address token_address, address aggregator_address, uint256 other_side_type) internal {
        oracle_info[token_address] = OracleInfo(
            token_address,
            AggregatorV3Interface(aggregator_address).description(),
            aggregator_address,
            other_side_type,
            uint256(AggregatorV3Interface(aggregator_address).decimals())
        );
    }

    function setOracleInfo(address token_address, address aggregator_address, uint256 other_side_type) public onlyByOwnGov {
        _setOracleInfo(token_address, aggregator_address, other_side_type);
    }

    // ---------------- Tracked Address Related ----------------

    function toggleTrackedAddress(address tracked_address) public onlyByOwnGov {
        is_address_tracked[tracked_address] = !is_address_tracked[tracked_address];
    }

    function addTrackedAddress(address tracked_address) public onlyByOwnGov {
        for (uint i = 0; i < tracked_addresses.length; i++){ 
            if (tracked_addresses[i] == tracked_address) {
                revert("Address already present");
            }
        }

        // Add in the address
        is_address_tracked[tracked_address] = true;
        tracked_addresses.push(tracked_address);
    }

    function removeTrackedAddress(address tracked_address) public onlyByOwnGov {
        is_address_tracked[tracked_address] = false;

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < tracked_addresses.length; i++){ 
            if (tracked_addresses[i] == tracked_address) {
                tracked_addresses[i] = address(0); // This will leave a null in the array and keep the indices the same

                // Remove the tracked token entries too
                delete tokens_for_address[tracked_address];
                break;
            }
        }
    }

    // ---------------- Token Related ----------------

    function addTokenForAddress(address tracked_address, address token_address) public onlyByOwnGov {
        // Make sure the oracle info is present already
        require(oracle_info[token_address].decimals > 0, "Add Oracle info first");

        address[] memory tracked_token_arr = tokens_for_address[tracked_address];
        for (uint i = 0; i < tracked_token_arr.length; i++){ 
            if (tracked_token_arr[i] == tracked_address) {
                revert("Token already present");
            }
        }

        tokens_for_address[tracked_address].push(token_address);
    }

    function removeTokenForAddress(address tracked_address, address token_address) public onlyByOwnGov {
        address[] memory tracked_token_arr = tokens_for_address[tracked_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < tracked_token_arr.length; i++){ 
            if (tracked_token_arr[i] == token_address) {
                tokens_for_address[tracked_address][i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // ---------------- Other ----------------

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
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

}