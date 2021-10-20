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
// ========================== TokenTrackerV2 ==========================
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
import "../Oracle/ComboOracle.sol";
import "../Frax/IFraxAMOMinter.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";

contract TokenTrackerV2 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    IFraxAMOMinter public amo_minter;
    ComboOracle public ethUSDOracle;

    // Tracked addresses
    address[] public tracked_addresses;
    mapping(address => bool) public is_address_tracked; // tracked address => is tracked
    mapping(address => address[]) public tokens_for_address; // tracked address => tokens to track

    // Oracle related
    mapping(address => address) public oracle_addresses; // token address => oracle_address
    uint256 public chainlink_eth_usd_decimals;

    address public timelock_address;
    address public custodian_address;

    uint256 public PRICE_PRECISION = 1e6;
    uint256 public PRECISE_PRICE_PRECISION = 1e12;

    /* ========== STRUCTS ========== */

    struct TrackingTokenConstruct {
        address tracked_address;
        address[] token_addresses;
    }
    
    struct OracleInfo {
        address token_address;
        address oracle_address;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address,
        address _eth_oracle_address,
        address[] memory _initial_tracked_addresses,
        // TrackingTokenConstruct[] memory _initial_tracked_tokens,
        OracleInfo[] memory _initial_token_oracles
    ) Owned(_owner_address) {
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        ethUSDOracle = ComboOracle(_eth_oracle_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Set the initial tracked addresses
        for (uint256 i = 0; i < _initial_tracked_addresses.length; i++){ 
            address tracked_addr = _initial_tracked_addresses[i];
            tracked_addresses.push(tracked_addr);
            is_address_tracked[tracked_addr] = true;
        }

        // Add the oracle information for each token
        for (uint256 i = 0; i < _initial_token_oracles.length; i++){ 
            OracleInfo memory thisOracleInfo = _initial_token_oracles[i];
            oracle_addresses[thisOracleInfo.token_address] = thisOracleInfo.oracle_address;
        }

        // // Add the tracked tokens for each tracked address
        // for (uint256 i = 0; i < _initial_tracked_tokens.length; i++){ 
        //     TrackingTokenConstruct memory thisTrackingConstruct = _initial_tracked_tokens[i];
        //     for (uint256 j = 0; j < thisTrackingConstruct.token_addresses.length; j++){ 
        //         tokens_for_address[thisTrackingConstruct.tracked_address].push(thisTrackingConstruct.token_addresses[j]);
        //     }
        // }
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

    // In USD
    function getTokenValueInAddress(address tracked_address, address token_address) public view returns (uint256 value_usd_e18) {
        require(is_address_tracked[tracked_address], "Address not being tracked");

        // Get value of raw ETH first
        if (token_address == address(0)){
            value_usd_e18 = (tracked_address.balance * ethUSDOracle.getETHPricePrecise()) / PRECISE_PRICE_PRECISION;
        }
        else {
            ( uint256 precise_price, ) = ComboOracle(oracle_addresses[token_address]).getTokenPrice(token_address);
            uint256 missing_decimals = uint256(18) - ERC20(token_address).decimals();
            value_usd_e18 += (((ERC20(token_address).balanceOf(tracked_address) * (10 ** missing_decimals)) * precise_price) / (PRECISE_PRICE_PRECISION));
        }
    }

    // In USD
    function getValueInAddress(address tracked_address) public view returns (uint256 value_usd_e18) {
        require(is_address_tracked[tracked_address], "Address not being tracked");

        // Get value of raw ETH first
        value_usd_e18 = (tracked_address.balance * ethUSDOracle.getETHPricePrecise()) / PRECISE_PRICE_PRECISION;

        // Get token values
        address[] memory tracked_token_arr = tokens_for_address[tracked_address];
        for (uint i = 0; i < tracked_token_arr.length; i++){ 
            address the_token_addr = tracked_token_arr[i];
            if (the_token_addr != address(0)) {
                ( uint256 precise_price, ) = ComboOracle(oracle_addresses[the_token_addr]).getTokenPrice(the_token_addr);
                uint256 missing_decimals = uint256(18) - ERC20(the_token_addr).decimals();
                value_usd_e18 += (((ERC20(the_token_addr).balanceOf(tracked_address) * (10 ** missing_decimals)) * precise_price) / (PRECISE_PRICE_PRECISION));
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
        require(oracle_addresses[token_address] != address(0), "Add Oracle info first");

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