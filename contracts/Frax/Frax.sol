// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "../Common/Context.sol";
import "../ERC20/IERC20.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "./Pools/FraxPool.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Oracle/ChainlinkETHUSDPriceConsumer.sol";
import "../Governance/AccessControl.sol";

contract FRAXStablecoin is ERC20Custom, AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
    enum PriceChoice { FRAX, FXS }
    PriceChoice price_choices;
    ChainlinkETHUSDPriceConsumer eth_usd_pricer;
    uint8 eth_usd_pricer_decimals;
    UniswapPairOracle fraxEthOracle;
    UniswapPairOracle fxsEthOracle;
    string public symbol;
    uint8 public decimals = 18;
    address[] public owners;
    address governance_address;
    address public creator_address;
    address public timelock_address;
    address public fxs_address;
    address public frax_eth_oracle_address;
    address public fxs_eth_oracle_address;
    address public weth_address;
    address public eth_usd_consumer_address;
    uint256 public genesis_supply = 1000000e18; // 1M. This is to help with establishing the Uniswap pools, as they need liquidity

    mapping(PriceChoice => address[]) private stablecoin_oracles; // 

    // The addresses in this array are added by the oracle and these contracts are able to mint frax
    address[] frax_pools_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public frax_pools; 
    
    uint256 public global_collateral_ratio; // 6 decimals of precision, e.g. 924102 = 0.924102
    uint256 public redemption_fee; // 6 decimals of precision, divide by 1000000 in calculations for fee
    uint256 public minting_fee; // 6 decimals of precision, divide by 1000000 in calculations for fee

    address public DEFAULT_ADMIN_ADDRESS;
    bytes32 public constant COLLATERAL_RATIO_PAUSER = keccak256("COLLATERAL_RATIO_PAUSER");
    bool public collateral_ratio_paused = false;

    /* ========== MODIFIERS ========== */

    modifier onlyCollateralRatioPauser() {
        require(hasRole(COLLATERAL_RATIO_PAUSER, msg.sender));
        _;
    }

    modifier onlyPools() {
       require(frax_pools[msg.sender] == true, "Only frax pools can mint new FRAX");
        _;
    } 
    
    modifier onlyByGovernance() {
        require(msg.sender == governance_address, "You're not the governance contract :p");
        _;
    }

    modifier onlyByOwnerOrGovernance() {
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
        address _creator_address,
        address _timelock_address
    ) public {
        symbol = _symbol;
        creator_address = _creator_address;
        timelock_address = _timelock_address;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DEFAULT_ADMIN_ADDRESS = _msgSender();
        owners.push(creator_address);
        owners.push(timelock_address);
        _mint(creator_address, genesis_supply);
        grantRole(COLLATERAL_RATIO_PAUSER, creator_address);
        grantRole(COLLATERAL_RATIO_PAUSER, timelock_address);
    }

    /* ========== VIEWS ========== */

    // Choice = 'FRAX' or 'FXS' for now
    function oracle_price(PriceChoice choice) internal view returns (uint256) {
        // Get the ETH / USD price first, and cut it down to 1e6 precision
        uint256 eth_usd_price = uint256(eth_usd_pricer.getLatestPrice()).mul(1e6).div(uint256(10) ** eth_usd_pricer_decimals);
        uint256 price_vs_eth;

        if (choice == PriceChoice.FRAX) {
            price_vs_eth = uint256(fraxEthOracle.consult(weth_address, 1e6));
        }
        else if (choice == PriceChoice.FXS) {
            price_vs_eth = uint256(fxsEthOracle.consult(weth_address, 1e6));
        }
        else revert("INVALID PRICE CHOICE. Needs to be either 0 (FRAX) or 1 (FXS)");

        // Will be in 1e6 format
        return price_vs_eth.mul(1e6).div(eth_usd_price);
    }

    // Returns X FRAX = 1 USD
    function frax_price() public view returns (uint256) {
        return oracle_price(PriceChoice.FRAX);
    }

    // Returns X FXS = 1 USD
    function fxs_price()  public view returns (uint256) {
        return oracle_price(PriceChoice.FXS);
    }

    // This is needed to avoid costly repeat calls to different getter functions
    // It is cheaper gas-wise to just dump everything and only use some of the info
    function frax_info() public view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (
            oracle_price(PriceChoice.FRAX), // frax_price()
            oracle_price(PriceChoice.FXS), // fxs_price()
            totalSupply(), // totalSupply()
            global_collateral_ratio, // global_collateral_ratio()
            globalCollateralValue(), // globalCollateralValue
            minting_fee, // minting_fee()
            redemption_fee // redemption_fee()
        );
    }

    // Iterate through all frax pools and calculate all value of collateral in all pools globally 
    function globalCollateralValue() public view returns (uint256) {
        uint256 total_collateral_value_d18 = 0; 

        for (uint i = 0; i < frax_pools_array.length; i++){ 
            // Exclude null addresses
            if (frax_pools_array[i] != address(0)){
                total_collateral_value_d18 += FraxPool(frax_pools_array[i]).collatDollarBalance();
            }

        }
        return total_collateral_value_d18;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // There needs to be a time interval that this can be called. Otherwise it can be called multiple times per expansion.
    uint256 last_call_time; // Last time the refreshCollateralRatio function was called
    function refreshCollateralRatio() public {
        require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
        require(block.timestamp - last_call_time >= 3600 && frax_price() != 1000000);  // 3600 seconds means can be called once per hour, 86400 seconds is per day, callable only if FRAX price is not $1
        
        uint256 tot_collat_value =  globalCollateralValue();

        // If tot_collat_value > totalSupply(), this will truncate to 0 and underflow below.
        // Need to multiply by 1e6 to avoid this issue and divide by 1e6 later when used in other places
        // uint256 globalC_ratio = (totalSupply().mul(1e6)).div(tot_collat_value); 
        uint256 globalC_ratio;
        if (tot_collat_value == 0) globalC_ratio = 0;
        else {
            globalC_ratio = (tot_collat_value.mul(1e6)).div(totalSupply()); 
            
            // Step increments are .5% 
            if (frax_price() > 1000000) {
                global_collateral_ratio = globalC_ratio.sub(5000);
            }    
            else {
                global_collateral_ratio = globalC_ratio.add(5000);
            }
        }


        last_call_time = block.timestamp; // Set the time of the last expansion
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Public implementation of internal _mint()
    function mint(uint256 amount) public virtual onlyByOwnerOrGovernance {
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
    function addPool(address pool_address) public onlyByOwnerOrGovernance {
        frax_pools[pool_address] = true; 
        frax_pools_array.push(pool_address);
    }

    // Remove a pool 
    function removePool(address pool_address) public onlyByOwnerOrGovernance {
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

    // Adds a new stablecoin oracle 
    function addStablecoinOracle(PriceChoice choice, address oracle_address) public onlyByOwnerOrGovernance {
        stablecoin_oracles[choice].push(oracle_address);
    }

    // Removes an oracle 
    function removeStablecoinOracle(PriceChoice choice, address oracle_address) public onlyByOwnerOrGovernance {
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < stablecoin_oracles[choice].length; i++){ 
            if (stablecoin_oracles[choice][i] == oracle_address) {
                stablecoin_oracles[choice][i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // Adds an owner 
    function addOwner(address owner_address) public onlyByOwnerOrGovernance {
        owners.push(owner_address);
    }

    // Removes an owner 
    function removeOwner(address owner_address) public onlyByOwnerOrGovernance {
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < owners.length; i++){ 
            if (owners[i] == owner_address) {
                owners[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    function setRedemptionFee(uint256 red_fee) public onlyByOwnerOrGovernance {
        redemption_fee = red_fee;
    }

    function setMintingFee(uint256 min_fee) public onlyByOwnerOrGovernance {
        minting_fee = min_fee;
    }  

    function setFXSAddress(address _fxs_address) public onlyByOwnerOrGovernance {
        fxs_address = _fxs_address;
    }

    function setETHUSDOracle(address _eth_usd_consumer_address) public onlyByOwnerOrGovernance {
        eth_usd_consumer_address = _eth_usd_consumer_address;
        eth_usd_pricer = ChainlinkETHUSDPriceConsumer(eth_usd_consumer_address);
        eth_usd_pricer_decimals = eth_usd_pricer.getDecimals();
    }

    // Sets the FRAX_ETH Uniswap oracle address 
    function setFRAXEthOracle(address _frax_addr, address _weth_address) public onlyByOwnerOrGovernance {
        frax_eth_oracle_address = _frax_addr;
        fraxEthOracle = UniswapPairOracle(_frax_addr); 
        weth_address = _weth_address;
    }

    // Sets the FXS_ETH Uniswap oracle address 
    function setFXSEthOracle(address _fxs_addr, address _weth_address) public onlyByOwnerOrGovernance {
        fxs_eth_oracle_address = _fxs_addr;
        fxsEthOracle = UniswapPairOracle(_fxs_addr);
        weth_address = _weth_address;
    }

    function toggleCollateralRatio() public onlyCollateralRatioPauser {
        collateral_ratio_paused = !collateral_ratio_paused;
    }

    /* ========== EVENTS ========== */

    // Track FXS burned
    event FRAXBurned(address indexed from, address indexed to, uint256 amount);
}
