// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

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
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

// Reviewed by
// Travis Moore: https://github.com/FortisFortuna

import '../Frax/Frax.sol';
import "../Math/SafeMath.sol";
import "./ReserveTracker.sol";

contract PIDController {
	using SafeMath for uint256;

	FRAXStablecoin public FRAX;
	FRAXShares public FXS;
	ReserveTracker public reserve_tracker;

	address public frax_contract_address;
	address public fxs_contract_address;

	address public owner_address;
	address public timelock_address;

	address public reserve_tracker_address;

	// 6 decimals of precision
	uint256 public growth_ratio;
	uint256 public frax_step;
	uint256 public GR_top_band;
	uint256 public GR_bottom_band;

	uint256 public FRAX_top_band;
	uint256 public FRAX_bottom_band;

	uint256 public internal_cooldown;

	bool public is_active;


    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "You are not the owner, controller, or the governance timelock");
        _;
    }

	constructor(
		address _frax_contract_address,
		address _fxs_contract_address,
		address _creator_address,
		address _timelock_address,
		address _reserve_tracker_address
	) public {
		frax_contract_address = _frax_contract_address;
		fxs_contract_address = _fxs_contract_address;
		owner_address = _creator_address;
		timelock_address = _timelock_address;
		reserve_tracker_address = _reserve_tracker_address;
		reserve_tracker = ReserveTracker(reserve_tracker_address);
		frax_step = 2500;
		FRAX = FRAXStablecoin(frax_contract_address);
		FXS = FRAXShares(fxs_contract_address);

		// upon genesis, if GR changes by more than 1% percent, enable change of collateral ratio
		GR_top_band = 1000;
		GR_bottom_band = 1000; 

		is_active = false;
	}

	function activate(bool _state) external onlyByOwnerOrGovernance {
		is_active = _state;
	}

	function setFraxStep(uint256 _new_step) external onlyByOwnerOrGovernance {
		frax_step = _new_step;
	}

	function setPriceBands(uint256 _top_band, uint256 _bottom_band) external onlyByOwnerOrGovernance {
		FRAX_top_band = _top_band;
		FRAX_bottom_band = _bottom_band;
	}

	// as a percentage added/subtracted from the previous; e.g. top_band = 4000 = 0.4% -> will decollat if GR increases by 0.4% or more
	function setGrowthRatioBands(uint256 _GR_top_band, uint256 _GR_bottom_band) external onlyByOwnerOrGovernance {
		GR_top_band = _GR_top_band;
		GR_bottom_band = _GR_bottom_band;
	}

	function setInternalCooldown(uint256 _internal_cooldown) external onlyByOwnerOrGovernance {
		internal_cooldown = _internal_cooldown;
	}

	uint256 last_frax_supply;
	uint256 last_update;
	function setCollateralRatio() public onlyByOwnerOrGovernance {
		require(block.timestamp - last_update >= internal_cooldown, "internal cooldown not passed");
		uint256 fxs_reserves = reserve_tracker.getFXSReserves();
		uint256 fxs_price = reserve_tracker.getFXSPrice();
		
		uint256 fxs_liquidity = (fxs_reserves.mul(fxs_price)); // has 6 decimals of precision

		uint256 frax_supply = FRAX.totalSupply();
		uint256 frax_price = reserve_tracker.getFRAXPrice();

		uint256 new_growth_ratio = fxs_liquidity.div(frax_supply);

		uint256 last_collateral_ratio = FRAX.global_collateral_ratio();
		uint256 new_collateral_ratio = last_collateral_ratio;


		// First, check if the price is out of the band
		if(frax_price > FRAX_top_band){
			new_collateral_ratio = last_collateral_ratio.sub(frax_step);
		} else if (frax_price < FRAX_bottom_band){
			new_collateral_ratio = last_collateral_ratio.add(frax_step);

		// Else, check if the growth ratio has increased or decreased since last update
		} else {
			if(new_growth_ratio > growth_ratio.mul(1e6 + GR_top_band).div(1e6)){
				new_collateral_ratio = last_collateral_ratio.sub(frax_step);
			} else if (new_growth_ratio < growth_ratio.mul(1e6 - GR_bottom_band).div(1e6)){
				new_collateral_ratio = last_collateral_ratio.add(frax_step);
			}
		}

		if(new_collateral_ratio > 1e6){
			new_collateral_ratio = 1e6;
		}

		// for testing purposes
		if(is_active){
			uint256 delta_collateral_ratio;
			if(new_collateral_ratio > last_collateral_ratio){
				delta_collateral_ratio = new_collateral_ratio - last_collateral_ratio;
				FRAX.setPriceTarget(0); // set to zero to increase CR
				emit FRAXdecollateralize(new_collateral_ratio);
			} else if (new_collateral_ratio < last_collateral_ratio){
				delta_collateral_ratio = last_collateral_ratio - new_collateral_ratio;
				FRAX.setPriceTarget(1000e6); // set to high value to decrease CR
				emit FRAXrecollateralize(new_collateral_ratio);
			}

			FRAX.setFraxStep(delta_collateral_ratio); // change by the delta
			FRAX.setRefreshCooldown(0); // unlock the CR cooldown

			FRAX.refreshCollateralRatio(); // refresh CR

			//reset params
			FRAX.setFraxStep(0);
			FRAX.setRefreshCooldown(86400); // auto-lock for one day, or until next controller refresh
			FRAX.setPriceTarget(1e6);			
		}
		
		growth_ratio = new_growth_ratio;
	}

    /* ========== EVENTS ========== */	
    event FRAXdecollateralize(uint256 new_collateral_ratio);
    event FRAXrecollateralize(uint256 new_collateral_ratio);
}
