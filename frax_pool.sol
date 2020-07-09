pragma solidity ^0.6.0;

import "./SafeMath.sol";
import "./fxs.sol";
import "./frax.sol";

contract frax_pool {
    ERC20 collateral_token;
    //address collateral_address; //unused
    //address fxs_address; //unused
    //address frax_address; //unused
    //address frax_pool_address; //unused
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
        //since solidity truncates division, every divsion operation must be the last operation in the equation to ensure minimum error
        
        uint256 fxs_needed;
        uint256 collateral_needed;
        
        //if fully decollateralized
        if(FRAX.global_collateral_ratio() == 0){ //check here or else calculating c_amount throws dividebyzero error
            FXS.transferFrom(msg.sender, address(this), FXS_amount);
            FRAX.pool_mint(msg.sender, FXS_amount);
            FXS.burn(FXS_amount);
            return;
        }
        
        uint fxs_price = FRAX.FXS_price();
        uint col_price = collateral_price_int;
        uint col_ratio = FRAX.global_collateral_ratio();
        
        uint256 c_amount = (collateral_amount * col_price) / col_ratio; //replace with safemath .div()
        uint256 f_amount = (FXS_amount * fxs_price) / (1e6 - col_ratio); //fxs_price has 6 extra precision, col_ratio also has 6 extra precision; replace with safemath .div()
        
        if (c_amount < f_amount) {
            collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
            fxs_needed = (c_amount * (1e6 - col_ratio)) / 1e6;
            FXS.transferFrom(msg.sender, address(this), fxs_needed);
            FRAX.pool_mint(msg.sender, collateral_amount);
            FXS.burn(fxs_needed);
        }
        
        else {
            collateral_needed = (f_amount * col_ratio) / 1e6;
            collateral_token.transferFrom(msg.sender, address(this), collateral_needed);
            FXS.transferFrom(msg.sender, address(this), FXS_amount);
            FRAX.pool_mint(msg.sender, f_amount); 
            FXS.burn(FXS_amount);
        }
    }

    function redeemFrax(uint256 FRAX_amount) public payable {
        uint col_ratio = FRAX.global_collateral_ratio();
        FRAX.transferFrom(msg.sender, address(this), FRAX_amount);
        collateral_token.transferFrom(address(this), msg.sender, (FRAX_amount * (1e6 - col_ratio)) / 1e6); 
        FXS.pool_mint(tx.origin, (FRAX_amount * (1e6 - col_ratio)) / 1e6);
        FRAX.burn(FRAX_amount);
    }

    
}
