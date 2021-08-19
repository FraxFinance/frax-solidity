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
// =========================== PIDController ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import '../Frax/Frax.sol';
import "../Math/SafeMath.sol";
import "./ReserveTracker.sol";
import "../Curve/IMetaImplementationUSD.sol";


contract PIDController is Owned {
    using SafeMath for uint256;

    // Instances
    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    ReserveTracker private reserve_tracker;
    IMetaImplementationUSD private frax_metapool;

    // FRAX and FXS addresses
    address private frax_contract_address;
    address private fxs_contract_address;

    // Misc addresses
    address public timelock_address;
    address public reserve_tracker_address;
    address private frax_metapool_address;

    // 6 decimals of precision
    uint256 public growth_ratio;
    uint256 public frax_step;
    uint256 public GR_top_band;
    uint256 public GR_bottom_band;

    // Bands
    uint256 public FRAX_top_band;
    uint256 public FRAX_bottom_band;

    // Time-related
    uint256 public internal_cooldown;
    uint256 public last_update;
    
    // Booleans
    bool public is_active;
    bool public use_growth_ratio;
    bool public collateral_ratio_paused;
    bool public FIP_6;

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
        address _timelock_address,
        address _reserve_tracker_address
    ) Owned(_creator_address) {
        frax_contract_address = _frax_contract_address;
        fxs_contract_address = _fxs_contract_address;
        timelock_address = _timelock_address;
        reserve_tracker_address = _reserve_tracker_address;
        reserve_tracker = ReserveTracker(reserve_tracker_address);
        frax_step = 2500;
        FRAX = FRAXStablecoin(frax_contract_address);
        FXS = FRAXShares(fxs_contract_address);

        // Upon genesis, if GR changes by more than 1% percent, enable change of collateral ratio
        GR_top_band = 1000;
        GR_bottom_band = 1000; 
        is_active = false;
    }

    
    /* ========== PUBLIC MUTATIVE FUNCTIONS ========== */
    
    function refreshCollateralRatio() public {
    	require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
        uint256 time_elapsed = (block.timestamp).sub(last_update);
        require(time_elapsed >= internal_cooldown, "internal cooldown not passed");
        uint256 fxs_reserves = reserve_tracker.getFXSReserves();
        uint256 fxs_price = reserve_tracker.getFXSPrice();
        
        uint256 fxs_liquidity = (fxs_reserves.mul(fxs_price)); // Has 6 decimals of precision

        uint256 frax_supply = FRAX.totalSupply();
        
        // Get the FRAX TWAP on Curve Metapool
        uint256 frax_price = reserve_tracker.frax_twap_price();

        uint256 new_growth_ratio = fxs_liquidity.div(frax_supply); // (E18 + E6) / E18

        uint256 last_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 new_collateral_ratio = last_collateral_ratio;

        if(FIP_6){
            require(frax_price > FRAX_top_band || frax_price < FRAX_bottom_band, "Use PIDController when FRAX is outside of peg");
        }

        // First, check if the price is out of the band
        if(frax_price > FRAX_top_band){
            new_collateral_ratio = last_collateral_ratio.sub(frax_step);
        } else if (frax_price < FRAX_bottom_band){
            new_collateral_ratio = last_collateral_ratio.add(frax_step);

        // Else, check if the growth ratio has increased or decreased since last update
        } else if(use_growth_ratio){
            if(new_growth_ratio > growth_ratio.mul(1e6 + GR_top_band).div(1e6)){
                new_collateral_ratio = last_collateral_ratio.sub(frax_step);
            } else if (new_growth_ratio < growth_ratio.mul(1e6 - GR_bottom_band).div(1e6)){
                new_collateral_ratio = last_collateral_ratio.add(frax_step);
            }
        }

        growth_ratio = new_growth_ratio;
        last_update = block.timestamp;

        // No need for checking CR under 0 as the last_collateral_ratio.sub(frax_step) will throw 
        // an error above in that case
        if(new_collateral_ratio > 1e6){
            new_collateral_ratio = 1e6;
        }

        if(is_active){
            uint256 delta_collateral_ratio;
            if(new_collateral_ratio > last_collateral_ratio){
                delta_collateral_ratio = new_collateral_ratio - last_collateral_ratio;
                FRAX.setPriceTarget(0); // Set to zero to increase CR
                emit FRAXdecollateralize(new_collateral_ratio);
            } else if (new_collateral_ratio < last_collateral_ratio){
                delta_collateral_ratio = last_collateral_ratio - new_collateral_ratio;
                FRAX.setPriceTarget(1000e6); // Set to high value to decrease CR
                emit FRAXrecollateralize(new_collateral_ratio);
            }

            FRAX.setFraxStep(delta_collateral_ratio); // Change by the delta
            uint256 cooldown_before = FRAX.refresh_cooldown(); // Note the existing cooldown period
            FRAX.setRefreshCooldown(0); // Unlock the CR cooldown

            FRAX.refreshCollateralRatio(); // Refresh CR

            // Reset params
            FRAX.setFraxStep(0);
            FRAX.setRefreshCooldown(cooldown_before); // Set the cooldown period to what it was before, or until next controller refresh
            FRAX.setPriceTarget(1e6);           
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function activate(bool _state) external onlyByOwnGov {
        is_active = _state;
    }

    function useGrowthRatio(bool _use_growth_ratio) external onlyByOwnGov {
        use_growth_ratio = _use_growth_ratio;
    }

    function setReserveTracker(address _reserve_tracker_address) external onlyByOwnGov {
        reserve_tracker_address = _reserve_tracker_address;
        reserve_tracker = ReserveTracker(_reserve_tracker_address);
    }

    function setMetapool(address _metapool_address) external onlyByOwnGov {
        frax_metapool_address = _metapool_address;
        frax_metapool = IMetaImplementationUSD(_metapool_address);
    }

    // As a percentage added/subtracted from the previous; e.g. top_band = 4000 = 0.4% -> will decollat if GR increases by 0.4% or more
    function setGrowthRatioBands(uint256 _GR_top_band, uint256 _GR_bottom_band) external onlyByOwnGov {
        GR_top_band = _GR_top_band;
        GR_bottom_band = _GR_bottom_band;
    }

    function setInternalCooldown(uint256 _internal_cooldown) external onlyByOwnGov {
        internal_cooldown = _internal_cooldown;
    }

    function setFraxStep(uint256 _new_step) external onlyByOwnGov {
        frax_step = _new_step;
    }

    function setPriceBands(uint256 _top_band, uint256 _bottom_band) external onlyByOwnGov {
        FRAX_top_band = _top_band;
        FRAX_bottom_band = _bottom_band;
    }

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function toggleCollateralRatio(bool _is_paused) external onlyByOwnGov {
    	collateral_ratio_paused = _is_paused;
    }

    function activateFIP6(bool _activate) external onlyByOwnGov {
        FIP_6 = _activate;
    }


    /* ========== EVENTS ========== */  
    event FRAXdecollateralize(uint256 new_collateral_ratio);
    event FRAXrecollateralize(uint256 new_collateral_ratio);
}