pragma solidity ^0.6.6;

import "./SafeMath.sol";
import "./fxs.sol";
import "./frax.sol";
/*

6/30 push
    -fixed the error in calling FRAX.mint(new_supply) line 37 by implementing a public, non-internal mint() function in FRAXStablecoin
    -fixed bug in line 73, calls FRAX_price() instead of FRAX_price
    -kicked the can down the road for line 74 .div(10000)
    -successfully compiles and deploys now
*/
contract frax_hop_step {
 
address hopBidder;
uint256 hopBid;
address fxs_address;
address frax_address;
FRAXShares FXS = FRAXShares(fxs_address); 
FRAXStablecoin FRAX = FRAXStablecoin(frax_address); 
uint256 last_hop_time;

function fraxHop() public {
    require(block.timestamp - last_hop_time >= 60);  //3600 seconds means can be called once per hour
    
// send previous hop winner their FRAX
    if (hopBidder != address(0)) {
        FRAX.transfer(hopBidder, FRAX.balanceOf(address(this))); //what does address(this) return? frax or frax_hop_step?
        FXS.burn(hopBid);
        hopBidder = address(0);
        hopBid = 0;
}
    
    // Mint new FRAX
    //frax doesn't hop to fractionality unless the price is above $1 with this
    if (FRAX.n_collateral_ratio() <= 1 && FRAX.FRAX_price() > 1e18) {
        uint256 new_supply = FRAX.totalSupply() / 10000; //MAKE SAFE MATH .div(10000);
        FRAX.mint(new_supply);
        last_hop_time = block.timestamp; //set the time of the last expansion
    }
}
    
    function bidExpand (uint256 fxs) public {
        require(fxs > hopBid, "bid is not greater than previous bid");
        
        // refund previous bidder
    if (hopBidder != address(0)) {
    FXS.transfer(hopBidder, hopBid);
        
    }
        
        // record new bidder
        hopBidder = msg.sender;
        FXS.transferFrom(msg.sender, address(this), fxs);
    }
    
    address backHopBidder;
    uint256 backHopBid;
    uint256 backHopAmount;
    uint256 last_back_hop_time;
    
    function fraxBackstep() public {
    require(block.timestamp - last_back_hop_time >= 60); //3600 seconds means can be called once per hour
    
    // send previous hop winner their FXS
    if (backHopBidder != address(0)) {
        FXS.mint(backHopBidder, backHopBid);
        backHopBidder = address(0);
        backHopBid = 0;
        backHopAmount = 0;
    }
    
    // Start contraction
    if (FRAX.n_collateral_ratio() > 1 && FRAX.FRAX_price() < 1e18) {
        backHopAmount = FRAX.totalSupply() / 10000; // MAKE SAFE MATH .div(10000)
        last_back_hop_time = block.timestamp; //set the time of the last contraction
    }
}   
    
}