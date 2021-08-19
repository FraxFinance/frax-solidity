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
// =========================== ReserveTracker =========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import "../Math/SafeMath.sol";
import "../Math/Math.sol";
import "../Uniswap/Interfaces/IUniswapV2Pair.sol";
import "../Staking/Owned.sol";
import "./UniswapPairOracle.sol";
import "./ChainlinkETHUSDPriceConsumer.sol";
import "../Curve/IMetaImplementationUSD.sol";
import "./ChainlinkFXSUSDPriceConsumer.sol";

contract ReserveTracker is Owned {
    using SafeMath for uint256;

    // Various precisions
    uint256 public CONSULT_FXS_DEC;
    uint256 public CONSULT_FRAX_DEC;
    uint256 private PRICE_PRECISION = 1e6;

    // Contract addresses
    address private frax_contract_address;
    address private fxs_contract_address;
    address public timelock_address;

    // The pair of which to get FXS price from
    address public fxs_weth_oracle_address;
    address public weth_collat_oracle_address;
    address private weth_address;
    UniswapPairOracle private fxs_weth_oracle;
    UniswapPairOracle private weth_collat_oracle;
    uint256 public weth_collat_decimals;

    // Chainlink
    ChainlinkFXSUSDPriceConsumer private chainlink_fxs_oracle;
    uint256 public chainlink_fxs_oracle_decimals;

    // Array of pairs for FXS
    address[] public fxs_pairs_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public fxs_pairs; 

    uint256 public fxs_reserves;

    // The pair of which to get FRAX price from
    address public frax_price_oracle_address;
    address public frax_pair_collateral_address;
    uint256 public frax_pair_collateral_decimals;
    UniswapPairOracle private frax_price_oracle;
    address public frax_metapool_address;
    IMetaImplementationUSD private frax_metapool;

    // TWAP Related
    uint256 public last_timestamp;
    uint256[2] public old_twap;
    uint256 public frax_twap_price;
    uint256 public PERIOD = 3600; // 1-hour TWAP on deployment
    bool public twap_paused;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _creator_address,
        address _timelock_address
    ) Owned(_creator_address) {
        frax_contract_address = _frax_contract_address;
        fxs_contract_address = _fxs_contract_address;
        timelock_address = _timelock_address;
    }

    /* ========== VIEWS ========== */

    // // Returns FRAX price with 6 decimals of precision
    // function getFRAXPrice() public view returns (uint256) {
    //     return frax_price_oracle.consult(frax_contract_address, CONSULT_FRAX_DEC);
    // }

    // // Returns FXS price with 6 decimals of precision
    // function getFXSPrice() public view returns (uint256) {
    //     uint256 fxs_weth_price = fxs_weth_oracle.consult(fxs_contract_address, 1e6);
    //     return weth_collat_oracle.consult(weth_address, CONSULT_FXS_DEC).mul(fxs_weth_price).div(1e6);
    // }

    function getFRAXPrice() public view returns (uint256) {
        return frax_twap_price;
    }

    function getFXSPrice() public view returns (uint256) {
        return uint256(chainlink_fxs_oracle.getLatestPrice()).mul(PRICE_PRECISION).div(10 ** chainlink_fxs_oracle_decimals);
    }

    function getFXSReserves() public view returns (uint256) {
        uint256 total_fxs_reserves = 0; 

        for (uint i = 0; i < fxs_pairs_array.length; i++){ 
            // Exclude null addresses
            if (fxs_pairs_array[i] != address(0)){
                if(IUniswapV2Pair(fxs_pairs_array[i]).token0() == fxs_contract_address) {
                    (uint reserves0, , ) = IUniswapV2Pair(fxs_pairs_array[i]).getReserves();
                    total_fxs_reserves = total_fxs_reserves.add(reserves0);
                } else if (IUniswapV2Pair(fxs_pairs_array[i]).token1() == fxs_contract_address) {
                    ( , uint reserves1, ) = IUniswapV2Pair(fxs_pairs_array[i]).getReserves();
                    total_fxs_reserves = total_fxs_reserves.add(reserves1);
                }
            }
        }

        return total_fxs_reserves;
    }

    /* ========== PUBLIC MUTATIVE FUNCTIONS ========== */

    function refreshFRAXCurveTWAP() public returns (uint256) {
        require(twap_paused == false, "TWAP has been paused");
        uint256 time_elapsed = (block.timestamp).sub(last_timestamp);
        require(time_elapsed >= PERIOD, 'ReserveTracker: PERIOD_NOT_ELAPSED');
        uint256[2] memory new_twap = frax_metapool.get_price_cumulative_last();
        uint256[2] memory balances = frax_metapool.get_twap_balances(old_twap, new_twap, time_elapsed);
        last_timestamp = block.timestamp;
        old_twap = new_twap;
        frax_twap_price = frax_metapool.get_dy(1, 0, 1e18, balances).mul(1e6).div(frax_metapool.get_virtual_price());
        return frax_twap_price;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function toggleCurveTWAP(bool _state) external onlyByOwnGov {
        twap_paused = _state;
    }

    function setCurveTWAPPeriod(uint _period) external onlyByOwnGov {
        PERIOD = _period;
    }

    function setChainlinkFXSOracle(address _chainlink_fxs_oracle) external onlyByOwnGov {
        chainlink_fxs_oracle = ChainlinkFXSUSDPriceConsumer(_chainlink_fxs_oracle);
        chainlink_fxs_oracle_decimals = uint256(chainlink_fxs_oracle.getDecimals());
    }

    // Get the pair of which to price FRAX from
    function setFRAXPriceOracle(address _frax_price_oracle_address, address _frax_pair_collateral_address, uint256 _frax_pair_collateral_decimals) public onlyByOwnGov {
        frax_price_oracle_address = _frax_price_oracle_address;
        frax_pair_collateral_address = _frax_pair_collateral_address;
        frax_pair_collateral_decimals = _frax_pair_collateral_decimals;
        frax_price_oracle = UniswapPairOracle(frax_price_oracle_address);
        CONSULT_FRAX_DEC = 1e6 * (10 ** (uint256(18).sub(frax_pair_collateral_decimals)));
    }

    function setMetapool(address _frax_metapool_address) public onlyByOwnGov {
        frax_metapool_address = _frax_metapool_address;
        frax_metapool = IMetaImplementationUSD(_frax_metapool_address);
    }

    // Get the pair of which to price FXS from (using FXS-WETH)
    function setFXSETHOracle(address _fxs_weth_oracle_address, address _weth_address) public onlyByOwnGov {
        fxs_weth_oracle_address = _fxs_weth_oracle_address;
        weth_address = _weth_address;
        fxs_weth_oracle = UniswapPairOracle(fxs_weth_oracle_address);
    }

    function setETHCollateralOracle(address _weth_collateral_oracle_address, uint _collateral_decimals) public onlyByOwnGov {
        weth_collat_oracle_address = _weth_collateral_oracle_address;
        weth_collat_decimals = _collateral_decimals;
        weth_collat_oracle = UniswapPairOracle(_weth_collateral_oracle_address);
        CONSULT_FXS_DEC = 1e6 * (10 ** (uint256(18).sub(_collateral_decimals)));
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20 
    function addFXSPair(address pair_address) public onlyByOwnGov {
        require(fxs_pairs[pair_address] == false, "Address already exists");
        fxs_pairs[pair_address] = true; 
        fxs_pairs_array.push(pair_address);
    }

    // Remove a pool 
    function removeFXSPair(address pair_address) public onlyByOwnGov {
        require(fxs_pairs[pair_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete fxs_pairs[pair_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < fxs_pairs_array.length; i++){ 
            if (fxs_pairs_array[i] == pair_address) {
                fxs_pairs_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }
}