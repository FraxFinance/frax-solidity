pragma solidity ^0.6.0;

import "./SafeMath.sol";
import "./fxs.sol";
import "./frax.sol";

contract frax_pool_tether {
    ERC20 collateral_token;
    address fxs_address;
    address frax_address;
    address pool_oracle;
    FRAXShares FXS;
    FRAXStablecoin FRAX;
    uint256 public pool_col_price;
    
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
    

    function setOracle(address new_oracle) public onlyByOracle {
        pool_oracle = new_oracle;
    }
    
    function setCollateralAddress(address collateral_address) public onlyByOracle {
        collateral_token = ERC20(collateral_address);
    }
    
    function setFRAXAddress(address frax_contract_address) public onlyByOracle {
        FRAX = FRAXStablecoin(frax_contract_address);
    }
    
    
    //these functions need modifiers to close them if phase 1 is over 
    
    //one way to shut off 1t1 minting is for oracles on the Frax contract to remove pool address from the mapping 
    function mintFrax1t1(uint256 collateral_amount) public payable {
    //first we must check if the collateral_ratio is  at 100%, if it is not, 1t1 minting is not active
    
    collateral_token.transferFrom(msg.sender, address(this), collateral_amount); 
        FRAX.pool_mint(tx.origin, collateral_amount); //then mints 1:1 to the caller and increases total supply 
    }
    
    
    function redeem1t1(uint256 frax_amount) public  {
        
        //collaer must allow contract to burn frax from their balance first
        //why does _burn not work? 
        FRAX.burn(frax_amount);

        //sends tether back to the frax holder 1t1 after burning the frax
       collateral_token.transfer(tx.origin, frax_amount); 
        
    }
    
}