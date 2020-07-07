pragma solidity ^0.6.0;

import "./SafeMath.sol";
import "./fxs.sol";
import "./frax.sol";

contract frax_pool {
    ERC20 collateral_token;
    address collateral_address;
    address fxs_address;
    address frax_address;
    address frax_pool_address;
    address pool_oracle;
    FRAXShares FXS;
    FRAXStablecoin FRAX;
    uint256 collateral_price_int; //6 decimals of precision, e.g. 1023000 represents $1.023
    //pool_ceiling is the total amount of collateral that a pool contract can hold
    uint256 pool_ceiling;
    
        constructor(
     address _oracle_address) 
    public 
    {

    pool_oracle = _oracle_address;
}

    modifier onlyByOracle() {
        require(msg.sender == pool_oracle, "you're not the oracle :p");
        _;
    }
    
    function _collateral_price() internal returns (uint256) { //retrieve price of collateral, in dollars
        return collateral_price_int / 100000; //replace with safemath .div()
    }
    
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
    
    function setPrice(uint256 c_price) public onlyByOracle {
        collateral_price_int = c_price;

    }
    
    
    function mintFrax(uint256 collateral_amount, uint256 FXS_amount) public payable {
        
        uint256 c_amount = (collateral_amount * _collateral_price()) / FRAX.global_collateral_ratio();//replace with safemath .div()
        uint256 fxs_needed;
        
        if(FRAX.global_collateral_ratio() == 1){ //need to check here or else calculating f_amount throws dividebyzero error
            collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
            FRAX.pool_mint(msg.sender, collateral_amount);
            return;
        }
        
        uint256 f_amount = (FXS_amount * FRAX.FXS_price()) / (1 - FRAX.global_collateral_ratio());//replace with safemath .div()
        
        if (c_amount < f_amount) {
            collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
            fxs_needed = c_amount * (1-FRAX.global_collateral_ratio());
            FXS.transferFrom(msg.sender, address(frax_pool_address), fxs_needed);
            FRAX.pool_mint(msg.sender, collateral_amount);
            FXS.burn(fxs_needed);
        }
        
        else {
            uint256 collateral_needed = f_amount * FRAX.global_collateral_ratio();
            collateral_token.transferFrom(msg.sender, address(this), collateral_needed);
            FXS.transferFrom(msg.sender, address(frax_pool_address), FXS_amount);
            FRAX.pool_mint(msg.sender, f_amount); 
            FXS.burn(FXS_amount);
        }
        

        
    }

    function redeemFrax(uint256 FRAX_amount) public payable {
        
        FRAX.transferFrom(msg.sender, address(this), FRAX_amount);
        collateral_token.transferFrom(address(this), msg.sender, (FRAX_amount * FRAX.global_collateral_ratio())); 
        FXS.pool_mint(tx.origin, (FRAX_amount * (1 - (FRAX.global_collateral_ratio()))));
        
        FRAX.burn(FRAX_amount); 
    }

    
}
