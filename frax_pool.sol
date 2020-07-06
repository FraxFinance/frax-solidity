pragma solidity ^0.6.0;

import "./SafeMath.sol";
import "./fxs.sol";
import "./frax.sol";

contract frax_pool_tether {
    ERC20 collateral_token;
    address collateral_address;
    address fxs_address;
    address frax_address;
    address frax_pool_address;
    address pool_oracle;
    FRAXShares FXS;
    FRAXStablecoin FRAX;
    uint256 public pool_col_price;
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
    
    function getCollateralAdd() public {
        return collateral_address;
    }
    
    function mintFrax(uint256 collateral_amount, uint256 FXS_amount) public payable {
        
        collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
        require(collateral_amount == 1 && FXS_amount == (1 - 1), "the amount of collateral and FXS you're sending does not match the collateral ratio"); 
        {
            FXS.transferFrom(msg.sender, address(frax_pool_address), FXS_amount);
            
            FRAX.pool_mint(tx.origin, collateral_amount); //then mints 1:1 to the caller and increases total supply 
        }

        
    }

    function redeemFrax(uint256 FRAX_amount) public payable {
        
        collateral_token.transferFrom(msg.sender, address(this), (1/FRAX_amount)); 
    //    FXS.transferFrom(msg.sender, address(frax_pool_address), (FXS_amount);
        
        FRAX.burn(FRAX_amount); 
    }

    
}
