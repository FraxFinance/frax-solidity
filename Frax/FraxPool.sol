// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;

import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";

contract FraxPool {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 collateral_token;
    address pool_oracle;
    FRAXShares FXS;
    FRAXStablecoin FRAX;
    uint256 public collateral_price_int; // 6 decimals of precision, e.g. 1050000 represents $1.050
    
    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 pool_ceiling;

    /* ========== MODIFIERS ========== */

    modifier onlyByOracle() {
        require(msg.sender == pool_oracle, "You are not the oracle :p");
        _;
    }
 
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _oracle_address) public {
        pool_oracle = _oracle_address;
    }

    /* ========== VIEWS ========== */

    function collatBalance() public view returns (uint256) {
        return collateral_token.balanceOf(address(this));
    }

    function collatDollarBalance() public view returns (uint256) {
        return collateral_token.balanceOf(address(this)).mul(collateral_price_int).div(1e6);
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency 
    // 100% collateral-backed
    function mint1t1FRAX(uint256 collateral_amount_d18) public {
        require(FRAX.global_collateral_ratio() == 1000000, "Collateral ratio must be 1");
        require((collateral_token.balanceOf(address(this))) + collateral_amount_d18 < pool_ceiling, "[Pool's Closed]: Pool ceiling reached, no more FRAX can be minted with this collateral");
        
        uint256 col_price = collateral_price_int;
        uint256 mint_fee = FRAX.minting_fee();
        uint256 c_dollar_value_d18 = (collateral_amount_d18.mul(col_price)).div(1e6);
        uint256 frax_amount_d18 = c_dollar_value_d18.sub((c_dollar_value_d18.mul(mint_fee)).div(1e6));
        collateral_token.transferFrom(msg.sender, address(this), collateral_amount_d18);
        FRAX.pool_mint(msg.sender, frax_amount_d18);
        
    }

    // 0% collateral-backed
    function mintAlgorithmicFRAX(uint256 fxs_amount_d18) public {
        require(FRAX.global_collateral_ratio() == 0, "Collateral ratio must be 0");
        
        uint256 mint_fee = FRAX.minting_fee(); 
        uint256 fxs_price = FRAX.fxs_price();
        uint256 fxs_dollar_value_d18 = (fxs_amount_d18.mul(fxs_price)).div(1e6);
        uint256 frax_amount_d18 = fxs_dollar_value_d18.sub((fxs_dollar_value_d18.mul(mint_fee)).div(1e6));
        FXS.pool_burn_from(msg.sender, fxs_amount_d18);
        FRAX.pool_mint(msg.sender, frax_amount_d18);
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function mintFractionalFRAX(uint256 collateral_amount, uint256 fxs_amount) public {
        require(FRAX.global_collateral_ratio() < 1000000 && FRAX.global_collateral_ratio() > 0, "Collateral ratio needs to be between .000001 and .999999");
        // Since solidity truncates division, every division operation must be the last operation in the equation to ensure minimum error
        // The contract must check the proper ratio was sent to mint FRAX. We do this by seeing the minimum mintable FRAX based on each amount 
        uint256 fxs_needed;
        uint256 collateral_needed;
        uint256 mint_fee = FRAX.minting_fee(); 
        uint256 fxs_price = FRAX.fxs_price();
        uint256 col_ratio = FRAX.global_collateral_ratio();
        uint256 col_price = collateral_price_int;
        
        // USD amounts of the collateral and the FXS
        uint256 fxs_dollar_value_d18 = (fxs_amount.mul(fxs_price)).div(1e6);
        uint256 c_dollar_value_d18 = (collateral_amount.mul(col_price)).div(1e6);

        // Total USD value in play 
        uint256 frax_dollar_value_d18 = fxs_dollar_value_d18 + c_dollar_value_d18;

        // Expected collateral amount, based on the collateral ratio
        uint256 c_dollar_val_expected = frax_dollar_value_d18.mul(col_ratio).div(1e6);

        emit LoggerUInt256("c_dollar_value_d18", c_dollar_value_d18);
        emit LoggerUInt256("c_dollar_val_expected", c_dollar_val_expected);

        // Make sure there is enough collateral 
        require(c_dollar_value_d18 <= c_dollar_val_expected, "Too much collateral supplied for the given FXS");

        // Recalculate and round down
        collateral_needed = (c_dollar_value_d18.mul(1e6)).div(col_price);
        fxs_needed = (c_dollar_value_d18.mul(1e6).div(col_ratio) - c_dollar_value_d18).mul(1e6).div(fxs_price);
        fxs_dollar_value_d18 = (fxs_needed.mul(fxs_price)).div(1e6);

        collateral_token.transferFrom(msg.sender, address(this), collateral_needed);
        FRAX.pool_mint(msg.sender, (c_dollar_value_d18 + fxs_dollar_value_d18).sub(((c_dollar_value_d18 + fxs_dollar_value_d18).mul(mint_fee)).div(1e6)));
        FXS.burnFrom(msg.sender, fxs_needed);

        require((collateral_token.balanceOf(address(this))) + collateral_needed < pool_ceiling, "Pool ceiling reached, no more FRAX can be minted with this collateral");
        
    }

    // Redeem collateral. 100% collateral-backed
    function redeem1t1FRAX(uint256 FRAX_amount) public {
        require(FRAX.global_collateral_ratio() == 1000000, "Collateral ratio must be 1");
        uint256 red_fee = FRAX.redemption_fee(); 
        uint256 col_price = collateral_price_int;
        uint256 frax_dollar_value_d18 = (FRAX_amount.mul(FRAX.frax_price())).div(1e6);
        uint256 collateral_needed_d18 = (frax_dollar_value_d18.mul(1e6)).div(col_price);

        collateral_token.transfer(msg.sender, collateral_needed_d18.sub((collateral_needed_d18.mul(red_fee)).div(1e6))); 
        FRAX.pool_burn_from(msg.sender, FRAX_amount);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem FRAX for collateral and FXS. .000001% - .999999% collateral-backed
    function redeemFractionalFRAX(uint256 FRAX_amount) public {
        uint256 col_ratio = FRAX.global_collateral_ratio();
        require(col_ratio < 1000000 && col_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");

        uint256 frax_dollar_value_d18 = (FRAX_amount.mul(FRAX.frax_price())).div(1e6);
        frax_dollar_value_d18 = frax_dollar_value_d18.sub((frax_dollar_value_d18.mul(FRAX.redemption_fee())).div(1e6));
        uint256 collateral_dollar_value_d18 = frax_dollar_value_d18.mul(col_ratio).div(1e6);
        uint256 fxs_dollar_value_d18 = frax_dollar_value_d18.sub(collateral_dollar_value_d18);

        collateral_token.transfer(msg.sender, (collateral_dollar_value_d18.mul(1e6)).div(collateral_price_int)); 
        FXS.pool_mint(tx.origin, (fxs_dollar_value_d18.mul(1e6)).div(FRAX.fxs_price()));
        FRAX.burnFrom(msg.sender, FRAX_amount);
    }

    // Redeem FRAX for FXS. 0% collateral-backed
    function redeemAlgorithmicFRAX(uint256 FRAX_amount) public {
        uint256 col_ratio = FRAX.global_collateral_ratio();
        require(col_ratio == 0, "Collateral ratio must be 0");     
        uint256 frax_dollar_value_d18 = (FRAX_amount.mul(FRAX.frax_price())).div(1e6);
        frax_dollar_value_d18 = frax_dollar_value_d18.sub((frax_dollar_value_d18.mul(FRAX.redemption_fee())).div(1e6));

        FXS.pool_mint(tx.origin, (frax_dollar_value_d18.mul(1e6)).div(FRAX.fxs_price()));
        FRAX.burnFrom(msg.sender, FRAX_amount);
    }

    // Function can be called by an FXS holder to have the protocol buy back FXS with excess collateral value from a desired collateral pool
    function buyBackFXS(uint256 FXS_amount) public {
        uint256 buyback_fee = FRAX.redemption_fee(); 
        uint256 total_FRAX_dollar_value_d18 = (FRAX.totalSupply().mul(FRAX.frax_price())).div(1e6); 
        uint256 required_collat_dollar_value_d18 = (total_FRAX_dollar_value_d18.mul(FRAX.global_collateral_ratio())).div(1e6);
        uint256 excess_collateral_dollar_value_d18 = FRAX.globalCollateralValue().sub(required_collat_dollar_value_d18);

        // If the total collateral value is higher than the amount required at the current collateral ratio then buy back up to the possible FXS with the desired collateral
        require(excess_collateral_dollar_value_d18 > 0, "No excess collateral to buy back!");

        // Make sure not to take more than is available
        uint256 fxs_dollar_value_d18 = (FXS_amount.mul(FRAX.fxs_price())).div(1e6);
        require(fxs_dollar_value_d18 <= excess_collateral_dollar_value_d18, "You are trying to buy back more than the excess!");

        // Get the equivalent amount of collateral based on the market value of FXS provided 
        uint256 collateral_equivalent_d18 = (fxs_dollar_value_d18.mul(1e6)).div(collateral_price_int);
        collateral_equivalent_d18 = collateral_equivalent_d18.sub((collateral_equivalent_d18.mul(buyback_fee)).div(1e6));

        // Give the sender their desired collateral and burn the FXS
        collateral_token.transfer(msg.sender, collateral_equivalent_d18);
        FXS.burnFrom(msg.sender, FXS_amount);

    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setPoolCeiling(uint256 new_ceiling) public onlyByOracle {
        pool_ceiling = new_ceiling;
    }

    function setOracle(address new_oracle) public onlyByOracle {
        pool_oracle = new_oracle;
    }
    
    function setCollateralAdd(address collateral_address) public onlyByOracle {
        collateral_token = ERC20(collateral_address);
    }
    
    function setFRAXAddress(address frax_contract_address) public onlyByOracle {
        FRAX = FRAXStablecoin(frax_contract_address);
    }

    function setFXSAddress(address fxs_contract_address) public onlyByOracle {
        FXS = FRAXShares(fxs_contract_address);
    }
    
    function setPrice(uint256 c_price) public onlyByOracle {
        collateral_price_int = c_price;
    }

    /* ========== EVENTS ========== */

    // Logger for UInt256
    event LoggerUInt256(string, uint256);
}
