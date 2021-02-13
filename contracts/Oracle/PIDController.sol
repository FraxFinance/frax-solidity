// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

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
	uint256 public growth_ratio_band;
	uint256 public top_band;
	uint256 public bottom_band;


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
		growth_ratio_band = 0;
		FRAX = FRAXStablecoin(frax_contract_address);
		FXS = FRAXShares(fxs_contract_address);
	}

	function setFraxStep(uint256 _new_step) external onlyByOwnerOrGovernance {
		frax_step = _new_step;
	}

	function setPriceBands(uint256 _top_band, uint256 _bottom_band) external onlyByOwnerOrGovernance {
		top_band = _top_band;
		bottom_band = _bottom_band;
	}

	uint256 last_frax_supply;
	function setCollateralRatio() public onlyByOwnerOrGovernance {
		uint256 fxs_reserves = reserve_tracker.getFXSReserves();
		uint256 fxs_price = reserve_tracker.getFXSPrice();
		
		uint256 fxs_liquidity = (fxs_reserves.mul(fxs_price)); //has 6 decimals of precision

		uint256 frax_supply = FRAX.totalSupply();
		uint256 frax_price = reserve_tracker.getFRAXPrice();

		uint256 new_growth_ratio = fxs_liquidity.div(frax_supply);

		uint256 last_collateral_ratio = FRAX.global_collateral_ratio();
		uint256 new_collateral_ratio = last_collateral_ratio;

		// First check if FRAX price is within band
		if(frax_price > top_band){
			new_collateral_ratio = last_collateral_ratio.sub(frax_step);
		} else if (frax_price < bottom_band){
			new_collateral_ratio = last_collateral_ratio.add(frax_step);
		} else { // Else, check if GR has increased or decreased
			if(new_growth_ratio > growth_ratio.add(growth_ratio_band)){
				new_collateral_ratio = last_collateral_ratio.add(frax_step);
			} else if (growth_ratio > growth_ratio_band) {
				if(new_growth_ratio < growth_ratio.sub(growth_ratio_band)){
					new_collateral_ratio = last_collateral_ratio.sub(frax_step);
				}
			} else { // GR is less than previous GR, which is less than the band
				if(last_collateral_ratio >= frax_step) {
					new_collateral_ratio = last_collateral_ratio.sub(frax_step);
				} else {
					new_collateral_ratio = 0;
				}
				
			}
		}

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

		growth_ratio = new_growth_ratio;
	}

    /* ========== EVENTS ========== */	
    event FRAXdecollateralize(uint256 new_collateral_ratio);
    event FRAXrecollateralize(uint256 new_collateral_ratio);
}