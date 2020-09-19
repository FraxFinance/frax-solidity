// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;

import "../Common/Context.sol";
import "../ERC20/IERC20.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../Frax/FraxPool.sol";
import "../Oracle/UniswapPairOracle.sol";

contract FRAXStablecoin is ERC20Custom {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
    enum PriceChoice { FRAX, FXS }
    PriceChoice price_choices;
    string public symbol;
    uint8 public decimals = 18;
    address[] public owners;
    address governance_address;
    address public creator_address;
    address public fxs_address;
    uint256 public genesis_supply = 1000000e18; // 1M. This is to help with establishing the Uniswap pools, as they need liquidity

    mapping(PriceChoice => address[]) private oracles; // 

    // The addresses in this array are added by the oracle and these contracts are able to mint frax
    address[] frax_pools_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public frax_pools; 
    
    uint256 public global_collateral_ratio; // 6 decimals of precision, e.g. 924102 = 0.924102
    uint256 public redemption_fee; // 6 decimals of precision, divide by 1000000 in calculations for fee
    uint256 public minting_fee; // 6 decimals of precision, divide by 1000000 in calculations for fee

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
       require(frax_pools[msg.sender] == true, "Only frax pools can mint new FRAX");
        _;
    } 
    
    modifier onlyByGovernance() {
        require(msg.sender == governance_address, "You're not the governance contract :p");
        _;
    }

    modifier onlyByOwner() {
        // Loop through the owners until one is found
        bool found = false;
        for (uint i = 0; i < owners.length; i++){ 
            if (owners[i] == msg.sender) {
                found = true;
                break;
            }
        }
        require(found, "You're not an owner");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _symbol,
        address _creator_address
    ) public {
        symbol = _symbol;
        creator_address = _creator_address;
        owners.push(creator_address);
        _mint(creator_address, genesis_supply);
    }

    /* ========== VIEWS ========== */

    // Gives the price of the token0 in the UniswapPairOracle
    // Choice = 'FRAX' or 'FXS' for now
    function oracle_price(PriceChoice choice) internal view returns (uint256) {
        // 6 decimals of precision
        uint256 weighted_numerator = 0;
        uint256 weighted_denominator = 0;

        for (uint i = 0; i < oracles[choice].length; i++){ 
            address thisAddress = oracles[choice][i];

            // Exclude null addresses
            if (thisAddress != address(0)){
                // Need to do a weighted average
                uint256 reserve0;
                uint256 reserve1;
                address choice_address; 
                if (choice == PriceChoice.FRAX) choice_address = address(this);
                else if (choice == PriceChoice.FXS) choice_address = fxs_address;
                else revert("INVALID PRICE CHOICE");

                (reserve0, reserve1, ) = UniswapPairOracle(thisAddress).pair().getReserves();

                // Uniswap may switch the address order around at pair creation time 
                if (UniswapPairOracle(thisAddress).token0() == choice_address){
                    // Need to scale the stablecoin to decimal 18 in the weight calculation
                    uint256 stablecoin_decimals_difference = 18 - ERC20(UniswapPairOracle(thisAddress).token1()).decimals();
                    require(stablecoin_decimals_difference >= 0, "The stablecoin must have 18 or fewer decimals");
                    uint256 redecimaled_stablecoin = reserve1.mul(10**(stablecoin_decimals_difference)); // 10^0 = 1 in case the stablecoin is decimal 18 too
                    uint256 weight = reserve0.add(redecimaled_stablecoin);
                    weighted_denominator += weight;
                    uint256 price_256 = uint256(UniswapPairOracle(thisAddress).price0Average()); // NEED TO CONVERT FixedPoint.uq112x112 to uint256
                    weighted_numerator += (price_256).mul(weight);
                }
                else {
                    // Need to scale the stablecoin to decimal 18 in the weight calculation
                    uint256 stablecoin_decimals_difference = 18 - ERC20(UniswapPairOracle(thisAddress).token0()).decimals();
                    require(stablecoin_decimals_difference >= 0, "The stablecoin must have 18 or fewer decimals");
                    uint256 redecimaled_stablecoin = reserve1.mul(10**(stablecoin_decimals_difference)); // 10^0 = 1 in case the stablecoin is decimal 18 too
                    uint256 weight = reserve1.add(redecimaled_stablecoin);
                    weighted_denominator += weight;
                    uint256 price_256 = uint256(UniswapPairOracle(thisAddress).price1Average()); // NEED TO CONVERT FixedPoint.uq112x112 to uint256
                    weighted_numerator += (price_256).mul(weight);
                }
                




            }
        }
        return weighted_numerator.div(weighted_denominator);
    }

    function frax_price() public view returns (uint256) {
        return oracle_price(PriceChoice.FRAX);
    }

    function fxs_price()  public view returns (uint256) {
        return oracle_price(PriceChoice.FXS);
    }

    // Iterate through all frax pools and calculate all value of collateral in all pools globally 
    function globalCollateralValue() public view returns (uint256) {
        uint256 total_collateral_value_d18; 

        for (uint i = 0; i < frax_pools_array.length; i++){ 
            // Exclude null addresses
            if (frax_pools_array[i] != address(0)){
                FraxPool pool = FraxPool(frax_pools_array[i]);
                total_collateral_value_d18 += pool.collatDollarBalance();
            }

        }
        return total_collateral_value_d18;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // There needs to be a time interval that this can be called. Otherwise it can be called multiple times per expansion.
    uint256 last_call_time; // Last time the setNewCollateralRatio function was called
    function setNewCollateralRatio() public {
        require(block.timestamp - last_call_time >= 3600 && frax_price() != 1000000);  // 3600 seconds means can be called once per hour, 86400 seconds is per day, callable only if FRAX price is not $1
        
        uint256 tot_collat_value =  globalCollateralValue();
        uint256 globalC_ratio = totalSupply().div(tot_collat_value); // Div by 12 places, FRAX has 18 precision and c_ratio has 6              
        
        // Step increments are .5% 
        if (frax_price() > 1000000) {
            global_collateral_ratio = globalC_ratio - 5000;
        }    
        else {
            global_collateral_ratio = globalC_ratio + 5000;
        }

        last_call_time = block.timestamp; // Set the time of the last expansion
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Public implementation of internal _mint()
    function mint(uint256 amount) public virtual onlyByOwner {
        _mint(msg.sender, amount);
    }

    // Used by pools when user redeems
    function pool_burn_from(address b_address, uint256 b_amount) public onlyPools {
        super._burnFrom(b_address, b_amount);
        emit FRAXBurned(b_address, msg.sender, b_amount);
    }

    // This function is what other frax pools will call to mint new FRAX 
    function pool_mint(address m_address, uint256 m_amount) public onlyPools {
        super._mint(m_address, m_amount);
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20 
    function addPool(address pool_address) public onlyByOwner {
        frax_pools[pool_address] = true; 
        frax_pools_array.push(pool_address);
    }

    // Remove a pool 
    function removePool(address pool_address) public onlyByOwner {
        // Delete from the mapping
        delete frax_pools[pool_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < frax_pools_array.length; i++){ 
            if (frax_pools_array[i] == pool_address) {
                frax_pools_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // Adds a new oracle 
    function addOracle(PriceChoice choice, address oracle_address) public onlyByOwner {
        oracles[choice].push(oracle_address);
    }

    // Removes an oracle 
    function removeOracle(PriceChoice choice, address oracle_address) public onlyByOwner {
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < oracles[choice].length; i++){ 
            if (oracles[choice][i] == oracle_address) {
                oracles[choice][i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // Adds an owner 
    function addOwner(address owner_address) public onlyByOwner {
        owners.push(owner_address);
    }

    // Removes an owner 
    function removeOwner(address owner_address) public onlyByOwner {
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < owners.length; i++){ 
            if (owners[i] == owner_address) {
                owners[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    function setRedemptionFee(uint256 red_fee) public onlyByOwner {
        redemption_fee = red_fee;
    }

    function setMintingFee(uint256 min_fee) public onlyByOwner {
        minting_fee = min_fee;
    }  

    function setFXSAddress(address _fxs_address) public onlyByOwner {
        fxs_address = _fxs_address;
    }

    /* ========== EVENTS ========== */

    // Track FXS burned
    event FRAXBurned(address indexed from, address indexed to, uint256 amount);
}
