// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================= CurveAMO =============================
// ====================================================================

import "./IStableSwap3Pool.sol";
import "./IMetaImplementationUSD.sol";
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../FXS/FXS.sol";
import "../Math/SafeMath.sol";

contract CurveAMO is AccessControl {
    using SafeMath for uint256;

	IMetaImplementationUSD private frax3crv_metapool;
	IStableSwap3Pool private three_pool;
    ERC20 private three_pool_erc20;
	FRAXStablecoin private FRAX;
    FraxPool private pool;
    FRAXShares private FXS;
    ERC20 private collateral_token;


	address public frax3crv_metapool_address;
	address public three_pool_address;
    address public three_pool_token_address;
	address public frax_contract_address;
    address public fxs_contract_address;
    address public collateral_token_address;
	address public timelock_address;
	address public owner_address;
    address public custodian_address;
    address public pool_address;

    // Amount the contract borrowed
    uint256 public borrowed_balance = 0;
    uint256 public borrowed_historical = 0;
    uint256 public paid_back_historical = 0;

    // Max amount of collateral this contract can borrow from the FraxPool
    uint256 public borrow_cap = uint256(20000e6);

    // Number of decimals under 18, for collateral token
    uint256 private missing_decimals;

    // Minimum acceptable ratio in terms of collateral deposited to LP tokens received for 3CRV add_liquidity; 1e6
    uint256 public add_liq_slippage_3crv = 900000;

    // Minimum acceptable ratio in terms of FRAX + 3CRV deposited to LP tokens received for FRAX3CRV-f metapool add_liquidity; 1e6
    uint256 public add_liq_slippage_metapool = 900000;

	constructor(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _custodian_address,
        address _timelock_address
	) public {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXS = FRAXShares(_fxs_contract_address);
        frax_contract_address = _frax_contract_address;
        fxs_contract_address = _fxs_contract_address;
        collateral_token = ERC20(_collateral_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        custodian_address = _custodian_address;
	}

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
        _;
    }

    function setPool(address _pool_address) external onlyByOwnerOrGovernance {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setThreePool(address _three_pool_address, address _three_pool_token_address) external onlyByOwnerOrGovernance {
    	three_pool_address = _three_pool_address;
    	three_pool = IStableSwap3Pool(_three_pool_address);
        three_pool_erc20 = ERC20(_three_pool_token_address);
    }

    function setMetapool(address _metapool_address) public onlyByOwnerOrGovernance {
        frax3crv_metapool_address = _metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_metapool_address);
	}

	function test() public {
		uint x = three_pool_erc20.balanceOf(address(this));
		uint y = frax3crv_metapool.totalSupply();
	}

	function collatDollarBalance() public view returns (uint256) {
		uint256 LP_balance = frax3crv_metapool.balanceOf(address(this));
		return 0;
		/*
		uint x = three_pool.balanceOf(frax3crv_metapool_address);
		uint y = frax3crv_metapool.totalSupply();

		// Linear approximation of metapool withdrawable amounts at floor price (global_collateral_ratio)
		uint256 threeCRV_withdrawable = LP_balance * (FRAX.global_collateral_ratio() / 1e6) * three_pool.balanceOf(frax3crv_metapool_address) / frax3crv_metapool.totalSupply();
		uint256 frax_withdrawable = LP_balance * (1e6 / FRAX.global_collateral_ratio()) * FRAX.balanceOf(frax3crv_metapool_address) / frax3crv_metapool.totalSupply();
		// returns amount of USDC withdrawable if the contract redeemed all of its 3CRV tokens from the base 3pool for USDC,
		// with the 3CRV coming from FRAX3CRV-f remove_liquidity()
		return three_pool.calc_withdraw_one_coin(threeCRV_withdrawable, 1); // still need to adjust for decimals (currently returns 6 decimals due to USDC)
		*/
	}

    // This is basically a workaround to transfer USDC from the FraxPool to this investor contract
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called separately later on
    function mintRedeemPart1(uint256 frax_amount) public onlyByOwnerOrGovernance {
        //require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
        uint256 redemption_fee = pool.redemption_fee();
        uint256 col_price_usd = pool.getCollateralPrice();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(redemption_fee))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(global_collateral_ratio).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(col_price_usd);

        require(borrowed_balance.add(expected_collat_amount) <= borrow_cap, "Borrow cap reached");
        borrowed_balance = borrowed_balance.add(expected_collat_amount);
        borrowed_historical = borrowed_historical.add(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() public onlyByOwnerOrGovernance {
        pool.collectRedemption();
    }

    function giveCollatBack(uint256 amount) public onlyByOwnerOrGovernance {
        // Still paying back principal
        if (amount <= borrowed_balance) {
            borrowed_balance = borrowed_balance.sub(amount);
        }
        // Pure profits
        else {
            borrowed_balance = 0;
        }
        paid_back_historical = paid_back_historical.add(amount);
        collateral_token.transfer(address(pool), amount);
    }
   
    function burnFXS(uint256 amount) public onlyByOwnerOrGovernance {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    function setBorrowCap(uint256 _borrow_cap) external onlyByOwnerOrGovernance {
        borrow_cap = _borrow_cap;
    }

    function metapoolDeposit(uint256 _frax_amount, uint256 _collateral_amount) public onlyByOwnerOrGovernance returns (uint256 metapool_LP_received) {
    	FRAX.pool_mint(address(this), _frax_amount);
    	collateral_token.approve(address(three_pool), _collateral_amount);

    	three_pool.add_liquidity([0, _collateral_amount, 0], (_collateral_amount * (10 ** missing_decimals) * (add_liq_slippage_3crv / 1e6)) );
    	uint threeCRV_received = three_pool.balanceOf(address(this));
    	metapool_LP_received = frax3crv_metapool.add_liquidity([_frax_amount, threeCRV_received], (_frax_amount + threeCRV_received) * add_liq_slippage_metapool / 1e6);
    	return metapool_LP_received;
    }

    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        ERC20(tokenAddress).transfer(custodian_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);

}