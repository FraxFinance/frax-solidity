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
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";

contract TokenTrackerV2 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    IFrax public IFRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFraxAMOMinter public amo_minter;
    ComboOracle public ethUSDOracle;

    // Tracked addresses
    address[] public tracked_addresses;
    mapping(address => bool) public is_address_tracked; // tracked address => is tracked
    mapping(address => address[]) public tokens_for_address; // tracked address => tokens to track

    // Oracle related
    mapping(address => OracleCRInfo) public oracle_cr_infos; // token address => oracle_address
    uint256 public chainlink_eth_usd_decimals;

    address public timelock_address;
    address public custodian_address;

    uint256 public PRICE_PRECISION = 1e6;
    uint256 public PRECISE_PRICE_PRECISION = 1e18;

    bool public use_stored_cr = true;
    uint256 public stored_cr;
    
    /* ========== STRUCTS ========== */

    struct TrackingTokensBatch {
        address tracked_address;
        address[] token_addresses;
    }
    
    struct OracleCRInfo {
        address token_address;
        address oracle_address;
        bool use_cr;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address,
        address _eth_oracle_address,
        address[] memory _initial_tracked_addresses
    ) Owned(_owner_address) {
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        ethUSDOracle = ComboOracle(_eth_oracle_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Refresh the stored CR
        stored_cr = IFRAX.global_collateral_ratio();

        // Set the initial tracked addresses
        for (uint256 i = 0; i < _initial_tracked_addresses.length; i++){ 
            address tracked_addr = _initial_tracked_addresses[i];
            tracked_addresses.push(tracked_addr);
            is_address_tracked[tracked_addr] = true;
        }

        // // Add the oracle information for each token
        // for (uint256 i = 0; i < _initial_token_oracles.length; i++){ 
        //     OracleCRInfo memory thisOracleCRInfo = _initial_token_oracles[i];
        //     oracle_cr_infos[thisOracleCRInfo.token_address] = thisOracleCRInfo;
        // }

        // // Add the tracked tokens for each tracked address
        // for (uint256 i = 0; i < _initial_tracked_tokens.length; i++){ 
        //     TrackingTokensBatch memory thisTrackingConstruct = _initial_tracked_tokens[i];
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
        allocations[0] = getTotalValue(false); // Total Value
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = getTotalValue(false); // Ignores CR logic
        collat_val_e18 = getTotalValue(true); // Uses CR logic
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

    function getCR() public view returns (uint256) {
        if (use_stored_cr) return stored_cr;
        else {
            return IFRAX.global_collateral_ratio();
        }
    }

    // In USD
    // Gets value of a single token in an address
    function getTokenValueInAddress(address tracked_address, address token_address, bool use_cr_logic) public view returns (uint256 value_usd_e18) {
        require(is_address_tracked[tracked_address], "Address not being tracked");
        OracleCRInfo memory thisOracleCRInfo = oracle_cr_infos[token_address];

        // Get value of raw ETH first
        if (token_address == address(0)){
            value_usd_e18 = (tracked_address.balance * ethUSDOracle.getETHPricePrecise()) / PRECISE_PRICE_PRECISION;
        }
        else {
            ( uint256 precise_price, , ) = ComboOracle(thisOracleCRInfo.oracle_address).getTokenPrice(token_address);
            uint256 missing_decimals = uint256(18) - ERC20(token_address).decimals();

            // Scale up to E18
            uint256 value_to_add = (((ERC20(token_address).balanceOf(tracked_address) * (10 ** missing_decimals)) * precise_price) / (PRECISE_PRICE_PRECISION));
            
            // If applicable, multiply by the CR. Used for dollarBalances and collatDollarBalance tracking
            if (use_cr_logic && thisOracleCRInfo.use_cr){
                value_to_add = (value_to_add * getCR()) / PRICE_PRECISION;
            }

            value_usd_e18 += value_to_add;
        }
    }

    // In USD
    // Gets value of all the ETH and tracked tokens in an address
    function getValueInAddress(address tracked_address, bool use_cr_logic) public view returns (uint256 value_usd_e18) {
        require(is_address_tracked[tracked_address], "Address not being tracked");

        // Get token values
        address[] memory tracked_token_arr = tokens_for_address[tracked_address];
        for (uint i = 0; i < tracked_token_arr.length; i++){ 
            address the_token_addr = tracked_token_arr[i];
            value_usd_e18 += getTokenValueInAddress(tracked_address, the_token_addr, use_cr_logic);
        }
    }

    // In USD
    function getTotalValue(bool use_cr_logic) public view returns (uint256 value_usd_e18) {
        // Initialize
        value_usd_e18 = 0;

        // Loop through all of the tracked addresses
        for (uint i = 0; i < tracked_addresses.length; i++){ 
            if (tracked_addresses[i] != address(0)) {
                value_usd_e18 += getValueInAddress(tracked_addresses[i], use_cr_logic);
            }
        }
    }

    /* ========== PUBLICALLY CALLABLE ========== */

    function refreshCR() public {
        stored_cr = IFRAX.global_collateral_ratio();
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

    function toggleUseStoredCR() external onlyByOwnGovCust {
        use_stored_cr = !use_stored_cr;
    }

    // ---------------- Oracle Related ----------------

    function setTokenOracleCRInfo(address token_address, address oracle_address, bool use_cr) public onlyByOwnGov {
        // Make sure the oracle is valid
        ( uint256 precise_price, , ) = ComboOracle(oracle_address).getTokenPrice(token_address);
        require(precise_price > 0, "Invalid Oracle");

        oracle_cr_infos[token_address].token_address = token_address;
        oracle_cr_infos[token_address].oracle_address = oracle_address;
        oracle_cr_infos[token_address].use_cr = use_cr;
    }

    function batchSetTokenOracleCRInfo(OracleCRInfo[] memory _oracle_cr_infos) public onlyByOwnGov {
        for (uint256 i = 0; i < _oracle_cr_infos.length; i++){ 
            OracleCRInfo memory thisOracle = _oracle_cr_infos[i];
            setTokenOracleCRInfo(thisOracle.token_address, thisOracle.oracle_address, thisOracle.use_cr);
        }
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

    function batchAddTokensForAddress(address tracked_address, address[] memory token_addresses) public onlyByOwnGov {
        for (uint i = 0; i < token_addresses.length; i++){ 
            addTokenForAddress(tracked_address, token_addresses[i]);
        }
    }

    function addTokenForAddress(address tracked_address, address token_address) public onlyByOwnGov {
        // Make sure the oracle info is present already
        require(oracle_cr_infos[token_address].oracle_address != address(0), "Add Oracle info first");

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