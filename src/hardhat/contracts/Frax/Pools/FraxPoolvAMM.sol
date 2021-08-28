// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== FraxPoolvAMM ===========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian

// Reviewer(s) / Contributor(s)
// Dennis: github.com/denett
// github.com/realisation

// TODO
// 1) Have to call getVirtualReserves() on every update of the reserve, such that we can call _update with the averages of the reserve


import "../../Math/Math.sol";
import "../../Math/SafeMath.sol";
import "../../FXS/FXS.sol";
import "../../Frax/Frax.sol";
import "../../ERC20/ERC20.sol";
import "../../Uniswap/UniswapV2Library.sol";
import "../../Oracle/UniswapPairOracle.sol";
import "../../Governance/AccessControl.sol";

contract FraxPoolvAMM is AccessControl {
    using SafeMath for uint256;
    
    ERC20 private collateral_token;
    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    UniswapPairOracle private fxsUSDCOracle;

    address private collateral_address;
    address private frax_contract_address;
    address private fxs_contract_address;
    address public fxs_usdc_oracle_address;
    address private uniswap_factory;

    address private owner_address;
    address private timelock_address;

    uint256 public minting_fee;
    uint256 public redemption_fee;
    uint256 public buyback_fee;
    uint256 public recollat_fee;

    // Mint check tolerance
    uint256 public max_drift_band;

    mapping (address => uint256) public redeemFXSBalances;
    mapping (address => uint256) public redeemCollateralBalances;
    uint256 public unclaimedPoolCollateral;
    uint256 public unclaimedPoolFXS;
    mapping (address => uint256) public lastRedeemed;

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_MAX = 1e6;

    // Number of decimals needed to get to 18
    uint256 public immutable missing_decimals;
    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 public pool_ceiling;
    // Stores price of the collateral, if price is paused
    uint256 public pausedPrice;
    // Bonus rate on FXS minted during recollateralizeFRAX(); 6 decimals of precision
    uint256 public bonus_rate;
    // Number of blocks to wait before being able to collectRedemption()
    uint256 public redemption_delay;
    // Number of seconds to wait before refreshing virtual AMM reserves
    uint256 public reserve_refresh_cooldown;
    // Last reserve refresh
    uint256 public last_reserve_refresh;

    // For investing collateral
    uint256 public global_investment_cap_percentage = 10000; // 1e6 precision
    uint256 public collateral_invested = 0; // Keeps track of how much collateral the investor was given
    address public investor_contract_address; // All of the investing code logic will be offloaded to the investor contract

    // AccessControl Roles
    bytes32 private constant MINT_PAUSER = keccak256("MINT_PAUSER");
    bytes32 private constant REDEEM_PAUSER = keccak256("REDEEM_PAUSER");
    bytes32 private constant BUYBACK_PAUSER = keccak256("BUYBACK_PAUSER");
    bytes32 private constant RECOLLATERALIZE_PAUSER = keccak256("RECOLLATERALIZE_PAUSER");
    bytes32 private constant COLLATERAL_PRICE_PAUSER = keccak256("COLLATERAL_PRICE_PAUSER");

    // AccessControl state variables
    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public recollateralizePaused = false;
    bool public buyBackPaused = false;
    bool public collateralPricePaused = false;

    // Drift related
    uint256 public drift_end_time = 0;
    uint256 public last_update_time = 0;
    uint256 public collat_virtual_reserves = 0;
    uint256 public fxs_virtual_reserves = 0; // Needs to be nonzero here initially
    uint256 drift_fxs_positive = 0;
    uint256 drift_fxs_negative = 0;
    uint256 drift_collat_positive = 0;
    uint256 drift_collat_negative = 0;
    uint256 public fxs_price_cumulative = 0;
    uint256 public fxs_price_cumulative_prev = 0;
    uint256 public last_drift_refresh = 0;
    uint256 public drift_refresh_period = 0;
    uint256 public k_virtual_amm = 0;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "Not owner or timelock");
        _;
    }

    modifier onlyInvestor() {
        require(msg.sender == investor_contract_address, "You are not the investor");
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, "Minting is paused");
        _;
    }

    modifier notRedeemPaused() {
        require(redeemPaused == false, "Redeeming is paused");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        address _uniswap_factory_address,
        address _fxs_usdc_oracle_addr,
        uint256 _pool_ceiling
    ) {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXS = FRAXShares(_fxs_contract_address);
        frax_contract_address = _frax_contract_address;
        fxs_contract_address = _fxs_contract_address;
        collateral_address = _collateral_address;
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        collateral_token = ERC20(_collateral_address);
        pool_ceiling = _pool_ceiling;
        uniswap_factory = _uniswap_factory_address;

        missing_decimals = uint(18).sub(collateral_token.decimals());
        pool_ceiling = 100000e6;
        pausedPrice = 0;
        bonus_rate = 0;
        redemption_delay = 2;
        reserve_refresh_cooldown = 3600;
        minting_fee = 4500;
        redemption_fee = 4500;
        buyback_fee = 4500;
        recollat_fee = 4500;
        max_drift_band = 50000; // 5%. Also used to potentially curtail sandwich attacks

        drift_refresh_period = 900;

        last_update_time = block.timestamp.sub(drift_refresh_period + 1);
        drift_end_time = block.timestamp.sub(1);

        fxs_usdc_oracle_address = _fxs_usdc_oracle_addr;
        fxsUSDCOracle = UniswapPairOracle(_fxs_usdc_oracle_addr);

        (uint112 reserve0, uint112 reserve1, ) = fxsUSDCOracle.pair().getReserves();
        if (fxsUSDCOracle.token0() == fxs_contract_address) {
            fxs_virtual_reserves = reserve0;
            collat_virtual_reserves = reserve1;
        }
        else {
            fxs_virtual_reserves = reserve1;
            collat_virtual_reserves = reserve0;
        }

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(MINT_PAUSER, timelock_address);
        grantRole(REDEEM_PAUSER, timelock_address);
        grantRole(RECOLLATERALIZE_PAUSER, timelock_address);
        grantRole(BUYBACK_PAUSER, timelock_address);
        grantRole(COLLATERAL_PRICE_PAUSER, timelock_address);
    }


    /* ========== VIEWS ========== */

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    // uses constant product concept https://uniswap.org/docs/v2/core-concepts/swaps/
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint the_fee) public pure returns (uint amountOut) {
        require(amountIn > 0, 'FRAX_vAMM: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'FRAX_vAMM: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(uint(1e6).sub(the_fee));
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = (reserveIn.mul(1e6)).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // Courtesy of github.com/denett
    function getVirtualReserves() public view returns (
        uint current_fxs_virtual_reserves, 
        uint current_collat_virtual_reserves, 
        uint average_fxs_virtual_reserves, 
        uint average_collat_virtual_reserves
    ) {
        current_fxs_virtual_reserves = fxs_virtual_reserves;
        current_collat_virtual_reserves = collat_virtual_reserves;
        uint256 drift_time = 0;
        if (drift_end_time > last_update_time) {
            drift_time = Math.min(block.timestamp, drift_end_time) - last_update_time;
            if (drift_time > 0) {
                if (drift_fxs_positive > 0) current_fxs_virtual_reserves = current_fxs_virtual_reserves.add(drift_fxs_positive.mul(drift_time));
                else current_fxs_virtual_reserves = current_fxs_virtual_reserves.sub(drift_fxs_negative.mul(drift_time));
                
                if (drift_collat_positive > 0) current_collat_virtual_reserves = current_collat_virtual_reserves.add(drift_collat_positive.mul(drift_time));
                else current_collat_virtual_reserves = current_collat_virtual_reserves.sub(drift_collat_negative.mul(drift_time));
            }
        }
        average_fxs_virtual_reserves = fxs_virtual_reserves.add(current_fxs_virtual_reserves).div(2);
        average_collat_virtual_reserves = collat_virtual_reserves.add(current_collat_virtual_reserves).div(2);
        
        // Adjust for when time was split between drift and no drift.
        uint time_elapsed = block.timestamp - last_update_time;
        if (time_elapsed > drift_time && drift_time > 0) {
            average_fxs_virtual_reserves = average_fxs_virtual_reserves.mul(drift_time).add(current_fxs_virtual_reserves.mul(time_elapsed.sub(drift_time))).div(time_elapsed);
            average_collat_virtual_reserves = average_collat_virtual_reserves.mul(drift_time).add(current_collat_virtual_reserves.mul(time_elapsed.sub(drift_time))).div(time_elapsed);
        }
    }

    // Courtesy of github.com/denett
    // Updates the reserve drifts
    function refreshDrift() external {
        require(block.timestamp >= drift_end_time, "Drift refresh is cooling down");
        
        // First apply the drift of the previous period
        (uint current_fxs_virtual_reserves, uint current_collat_virtual_reserves, uint average_fxs_virtual_reserves, uint average_collat_virtual_reserves) = getVirtualReserves();
        _update(current_fxs_virtual_reserves, current_collat_virtual_reserves, average_fxs_virtual_reserves, average_collat_virtual_reserves);
        
        // Calculate the reserves at the average internal price over the last period and the current K
        uint time_elapsed = block.timestamp - last_drift_refresh;
        uint average_period_price_fxs = (fxs_price_cumulative - fxs_price_cumulative_prev).div(time_elapsed);
        uint internal_k = current_fxs_virtual_reserves.mul(current_collat_virtual_reserves);
        uint collat_reserves_average_price = sqrt(internal_k.mul(average_period_price_fxs));
        uint fxs_reserves_average_price = internal_k.div(collat_reserves_average_price);
        
        // Calculate the reserves at the average external price over the last period and the target K
        (uint ext_average_fxs_usd_price, uint ext_k) = getOracleInfo();
        uint targetK = internal_k > ext_k
            ? Math.max(ext_k, internal_k.sub(internal_k.div(100)))  // Decrease or
            : Math.min(ext_k, internal_k.add(internal_k.div(100))); // Increase K no more than 1% per period
        uint ext_collat_reserves_average_price = sqrt(targetK.mul(ext_average_fxs_usd_price));
        uint ext_fxs_reserves_average_price = targetK.div(ext_collat_reserves_average_price);
        
        // Calculate the drifts per second
        if (collat_reserves_average_price < ext_collat_reserves_average_price) {
            drift_collat_positive = (ext_collat_reserves_average_price - collat_reserves_average_price).div(drift_refresh_period);
            drift_collat_negative = 0;
        } else {
            drift_collat_positive = 0;
            drift_collat_negative = (collat_reserves_average_price - ext_collat_reserves_average_price).div(drift_refresh_period);
        }

        if (fxs_reserves_average_price < ext_fxs_reserves_average_price) {
            drift_fxs_positive = (ext_fxs_reserves_average_price - fxs_reserves_average_price).div(drift_refresh_period);
            drift_fxs_negative = 0;
        } else {
            drift_fxs_positive = 0;
            drift_fxs_negative = (fxs_reserves_average_price - ext_fxs_reserves_average_price).div(drift_refresh_period);
        }
        
        fxs_price_cumulative_prev = fxs_price_cumulative;
        last_drift_refresh = block.timestamp;
        drift_end_time = block.timestamp.add(drift_refresh_period);
    }
    
    // Gets the external average fxs price over the previous period and the external K
    function getOracleInfo() public view returns (uint ext_average_fxs_usd_price, uint ext_k) {
        ext_average_fxs_usd_price = fxsUSDCOracle.consult(fxs_contract_address, 1e18);
        (uint112 reserve0, uint112 reserve1, ) = fxsUSDCOracle.pair().getReserves();
        ext_k = uint(reserve0).mul(uint(reserve1));
    }

    // Needed for compatibility with FraxPool standard
    function collatDollarBalance() public view returns (uint256) {
        return (collateral_token.balanceOf(address(this)).add(collateral_invested).sub(unclaimedPoolCollateral)).mul(10 ** missing_decimals);
    }

    function availableExcessCollatDV() public view returns (uint256) {
        uint256 total_supply = FRAX.totalSupply();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 global_collat_value = FRAX.globalCollateralValue();

        uint256 target_collat_value = total_supply.mul(global_collateral_ratio).div(1e6);

        if(global_collat_value > target_collat_value){
            return global_collat_value.sub(target_collat_value);
        } else {
            return 0;
        }
    }

    function availableForInvestment() public view returns (uint256 max_invest) {
        uint256 curr_pool_bal = collateral_token.balanceOf(address(this)).add(collateral_invested).sub(unclaimedPoolCollateral);
        max_invest = curr_pool_bal.mul(global_investment_cap_percentage).div(1e6);
    }

    /* ========== INTERNAL ========== */

    // Courtesy of github.com/denett
    // Update the reserves and the cumulative price
    function _update(
        uint current_fxs_virtual_reserves, 
        uint current_collat_virtual_reserves, 
        uint average_fxs_virtual_reserves, 
        uint average_collat_virtual_reserves
    ) private {
        uint time_elapsed = block.timestamp - last_update_time; 
        if (time_elapsed > 0) {
            fxs_price_cumulative += average_fxs_virtual_reserves.mul(1e18).div(average_collat_virtual_reserves).mul(time_elapsed);
        }
        fxs_virtual_reserves = current_fxs_virtual_reserves;
        collat_virtual_reserves = current_collat_virtual_reserves;
        last_update_time = block.timestamp;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    function mintFractionalFRAX(uint256 collateral_amount, uint256 fxs_amount, uint256 FRAX_out_min) public notMintPaused returns (uint256, uint256, uint256) {
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();

        // Do not need to equalize decimals between FXS and collateral, getAmountOut & reserves takes care of it
        // Still need to adjust for FRAX (18 decimals) and collateral (not always 18 decimals)
        uint256 total_frax_mint;
        uint256 collat_needed;
        uint256 fxs_needed;
        if (global_collateral_ratio == 1e6) { // 1-to-1
            total_frax_mint = collateral_amount.mul(10 ** missing_decimals);
            collat_needed = collateral_amount;
            fxs_needed = 0;
        } else if (global_collateral_ratio == 0) { // Algorithmic
            // Assumes 1 collat = 1 FRAX at all times 
            total_frax_mint = getAmountOut(fxs_amount, fxs_virtual_reserves, collat_virtual_reserves, minting_fee);
            _update(fxs_virtual_reserves.add(fxs_amount), collat_virtual_reserves.sub(total_frax_mint), fxs_virtual_reserves, collat_virtual_reserves);

            total_frax_mint = total_frax_mint.mul(10 ** missing_decimals);
            collat_needed = 0;
            fxs_needed = fxs_amount;
        } else { // Fractional
            // Assumes 1 collat = 1 FRAX at all times 
            uint256 frax_mint_from_fxs = getAmountOut(fxs_amount, fxs_virtual_reserves, collat_virtual_reserves, minting_fee);
            _update(fxs_virtual_reserves.add(fxs_amount), collat_virtual_reserves.sub(frax_mint_from_fxs), fxs_virtual_reserves, collat_virtual_reserves);

            collat_needed = frax_mint_from_fxs.mul(1e6).div(uint(1e6).sub(global_collateral_ratio)); // find collat needed at collateral ratio
            require(collat_needed <= collateral_amount, "Not enough collateral inputted");

            uint256 frax_mint_from_collat = collat_needed.mul(10 ** missing_decimals);
            frax_mint_from_fxs = frax_mint_from_fxs.mul(10 ** missing_decimals);
            total_frax_mint = frax_mint_from_fxs.add(frax_mint_from_collat);
            fxs_needed = fxs_amount;
        }

        require(total_frax_mint >= FRAX_out_min, "Slippage limit reached");
        require(collateral_token.balanceOf(address(this)).add(collateral_invested).sub(unclaimedPoolCollateral).add(collat_needed) <= pool_ceiling, "Pool ceiling reached, no more FRAX can be minted with this collateral");

        FXS.pool_burn_from(msg.sender, fxs_needed);
        collateral_token.transferFrom(msg.sender, address(this), collat_needed);

        // Sanity check to make sure the FRAX mint amount is close to the expected amount from the collateral input
        // Using collateral_needed here could cause problems if the reserves are off
        // Useful in case of a sandwich attack or some other fault with the virtual reserves
        // Assumes $1 collateral (USDC, USDT, DAI, etc)
        require(total_frax_mint <= collateral_amount.mul(10 ** missing_decimals).mul(uint256(1e6).add(max_drift_band)).div(global_collateral_ratio), "[max_drift_band] Too much FRAX being minted");
        FRAX.pool_mint(msg.sender, total_frax_mint);

        return (total_frax_mint, collat_needed, fxs_needed);
    }

    function redeemFractionalFRAX(uint256 FRAX_amount, uint256 fxs_out_min, uint256 collateral_out_min) public notRedeemPaused returns (uint256, uint256, uint256) {
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();

        uint256 collat_out;
        uint256 fxs_out;

        uint256 collat_equivalent = FRAX_amount.div(10 ** missing_decimals);

        if(global_collateral_ratio == 1e6) { // 1-to-1
            collat_out = collat_equivalent;
            fxs_out = 0;

        } else if (global_collateral_ratio == 0) { // Algorithmic
            fxs_out = getAmountOut(collat_equivalent, collat_virtual_reserves, fxs_virtual_reserves, redemption_fee); // switch FRAX to units of collateral and swap
            collat_out = 0;

            _update(fxs_virtual_reserves.sub(fxs_out), collat_virtual_reserves.add(collat_equivalent), fxs_virtual_reserves, collat_virtual_reserves);
        } else { // Fractional
            collat_out = collat_equivalent.mul(global_collateral_ratio).div(1e6);
            fxs_out = getAmountOut(collat_equivalent.mul((uint(1e6).sub(global_collateral_ratio))).div(1e6), collat_virtual_reserves, fxs_virtual_reserves, redemption_fee);

            _update(fxs_virtual_reserves.sub(fxs_out), collat_virtual_reserves.add(collat_equivalent.mul((uint(1e6).sub(global_collateral_ratio))).div(1e6)), fxs_virtual_reserves, collat_virtual_reserves);
        }

        require(collat_out <= collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral), "Not enough collateral in pool");
        require(collat_out >= collateral_out_min, "Slippage limit reached [collateral]");
        require(fxs_out >= fxs_out_min, "Slippage limit reached [FXS]");

        // Sanity check to make sure the collat amount is close to the expected amount from the FRAX input
        // This check is redundant since collat_out is essentially supplied by the user
        // Useful in case of a sandwich attack or some other fault with the virtual reserves	        // fxs_out should receive a sanity check instead
        // Assumes $1 collateral (USDC, USDT, DAI, etc)	        // one possible way to do this may be to obtain the twap price while infering how much slippage
        // a trade at that price might incur according to the percentage of the reserves that were 
        // traded and that may approximate a sane transaction.
        // Alternatively, maybe it could be done as it is done on lines 496 and 497.

        require(collat_out.mul(10 ** missing_decimals) <= FRAX_amount.mul(global_collateral_ratio).mul(uint256(1e6).add(max_drift_band)).div(1e12), "[max_drift_band] Too much collateral being released");
        
        redeemCollateralBalances[msg.sender] = redeemCollateralBalances[msg.sender].add(collat_out);
        unclaimedPoolCollateral = unclaimedPoolCollateral.add(collat_out);

        redeemFXSBalances[msg.sender] = redeemFXSBalances[msg.sender].add(fxs_out);
        unclaimedPoolFXS = unclaimedPoolFXS.add(fxs_out);

        lastRedeemed[msg.sender] = block.number;

        FRAX.pool_burn_from(msg.sender, FRAX_amount);
        FXS.pool_mint(address(this), fxs_out);

        return (FRAX_amount, collat_out, fxs_out);
    }

    // After a redemption happens, transfer the newly minted FXS and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out FRAX/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption() external returns (uint256, uint256){
        require((lastRedeemed[msg.sender].add(redemption_delay)) <= block.number, "Must wait for redemption_delay blocks before collecting redemption");
        bool sendFXS = false;
        bool sendCollateral = false;
        uint FXSAmount;
        uint CollateralAmount;

        // Use Checks-Effects-Interactions pattern
        if(redeemFXSBalances[msg.sender] > 0){
            FXSAmount = redeemFXSBalances[msg.sender];
            redeemFXSBalances[msg.sender] = 0;
            unclaimedPoolFXS = unclaimedPoolFXS.sub(FXSAmount);

            sendFXS = true;
        }
        
        if(redeemCollateralBalances[msg.sender] > 0){
            CollateralAmount = redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
            unclaimedPoolCollateral = unclaimedPoolCollateral.sub(CollateralAmount);

            sendCollateral = true;
        }

        if(sendFXS == true){
            FXS.transfer(msg.sender, FXSAmount);
        }
        if(sendCollateral == true){
            collateral_token.transfer(msg.sender, CollateralAmount);
        }

        return (CollateralAmount, FXSAmount);
    }

    function recollateralizeFRAX(uint256 collateral_amount, uint256 FXS_out_min) external returns (uint256, uint256) {
        require(recollateralizePaused == false, "Recollateralize is paused");
        uint256 fxs_out = getAmountOut(collateral_amount, collat_virtual_reserves, fxs_virtual_reserves, recollat_fee);

        _update(fxs_virtual_reserves.sub(fxs_out), collat_virtual_reserves.add(collateral_amount), fxs_virtual_reserves, collat_virtual_reserves);
        require(fxs_out >= FXS_out_min, "Slippage limit reached");

        uint256 total_supply = FRAX.totalSupply();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 global_collat_value = FRAX.globalCollateralValue();
        uint256 target_collat_value = total_supply.mul(global_collateral_ratio);

        require(target_collat_value >= global_collat_value + collateral_amount.mul(10 ** missing_decimals), "Too much recollateralize inputted");

        collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
        
        // Sanity check to make sure the value of the outgoing FXS amount is close to the expected amount based on the collateral input
        // Ignores the bonus, as it will be added in later
        // Useful in case of a sandwich attack or some other fault with the virtual reserves
        // Assumes $1 collateral (USDC, USDT, DAI, etc)
        uint256 fxs_price = fxsUSDCOracle.consult(fxs_contract_address, 1e18); // comes out e6
        require(fxs_out.mul(fxs_price).div(1e6) <= collateral_amount.mul(10 ** missing_decimals).mul(uint256(1e6).add(max_drift_band)).div(1e6), "[max_drift_band] Too much FXS being released");
        
        // Add in the bonus
        fxs_out = fxs_out.add(fxs_out.mul(bonus_rate).div(1e6));

        FXS.pool_mint(msg.sender, fxs_out);

        return (collateral_amount, fxs_out);
    }

    function buyBackFXS(uint256 FXS_amount, uint256 COLLATERAL_out_min) external returns (uint256, uint256) {
        require(buyBackPaused == false, "Buyback is paused");
        uint256 buyback_available = availableExcessCollatDV().div(10 ** missing_decimals);
        uint256 collat_out = getAmountOut(FXS_amount, fxs_virtual_reserves, collat_virtual_reserves, buyback_fee);

        require(buyback_available > 0, "Zero buyback available");
        require(collat_out <= buyback_available, "Not enough buyback available");
        require(collat_out >= COLLATERAL_out_min, "Slippage limit reached");
        _update(fxs_virtual_reserves.sub(FXS_amount), collat_virtual_reserves.add(collat_out), fxs_virtual_reserves, collat_virtual_reserves);

        FXS.pool_burn_from(msg.sender, FXS_amount);

        // Sanity check to make sure the value of the outgoing collat amount is close to the expected amount based on the FXS input
        // Useful in case of a sandwich attack or some other fault with the virtual reserves
        // Assumes $1 collateral (USDC, USDT, DAI, etc)
        uint256 fxs_price = fxsUSDCOracle.consult(fxs_contract_address, 1e18); // comes out e6
        require(collat_out.mul(10 ** missing_decimals) <= FXS_amount.mul(fxs_price).mul(uint256(1e6).add(max_drift_band)).div(1e12), "[max_drift_band] Too much collateral being released");
        
        collateral_token.transfer(msg.sender, collat_out);

        return (FXS_amount, collat_out);
    }

    // Send collateral to investor contract
    // Called by INVESTOR CONTRACT
    function takeOutCollat_Inv(uint256 amount) external onlyInvestor {
        require(collateral_invested.add(amount) <= availableForInvestment(), 'Investment cap reached');
        collateral_invested = collateral_invested.add(amount);
        collateral_token.transfer(investor_contract_address, amount);
    }

    // Deposit collateral back to this contract
    // Called by INVESTOR CONTRACT
    function putBackCollat_Inv(uint256 amount) external onlyInvestor {
        if (amount < collateral_invested) collateral_invested = collateral_invested.sub(amount);
        else collateral_invested = 0;
        collateral_token.transferFrom(investor_contract_address, address(this), amount);
    }

    /* ========== MISC FUNCTIONS ========== */

    // SQRT from here: https://ethereum.stackexchange.com/questions/2910/can-i-square-root-in-solidity
    function sqrt(uint x) internal pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function toggleMinting(bool state) external {
        require(hasRole(MINT_PAUSER, msg.sender));
        mintPaused = state;
    }

    function toggleRedeeming(bool state) external {
        require(hasRole(REDEEM_PAUSER, msg.sender));
        redeemPaused = state;
    }

    function toggleRecollateralize(bool state) external {
        require(hasRole(RECOLLATERALIZE_PAUSER, msg.sender));
        recollateralizePaused = state;
    }
    
    function toggleBuyBack(bool state) external {
        require(hasRole(BUYBACK_PAUSER, msg.sender));
        buyBackPaused = state;
    }

    function toggleCollateralPrice(bool state, uint256 _new_price) external {
        require(hasRole(COLLATERAL_PRICE_PAUSER, msg.sender));
        collateralPricePaused = state;

        if(collateralPricePaused == true){
            pausedPrice = _new_price;
        }
    }

    // Combined into one function due to 24KiB contract memory limit
    function setPoolParameters(uint256 new_ceiling, uint256 new_bonus_rate, uint256 new_redemption_delay, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee, uint256 _reserve_refresh_cooldown, uint256 _max_drift_band) external onlyByOwnGov {
        pool_ceiling = new_ceiling;
        bonus_rate = new_bonus_rate;
        redemption_delay = new_redemption_delay;
        minting_fee = new_mint_fee;
        redemption_fee = new_redeem_fee;
        buyback_fee = new_buyback_fee;
        recollat_fee = new_recollat_fee;
        reserve_refresh_cooldown = _reserve_refresh_cooldown;
        max_drift_band = _max_drift_band;
    }
    

    // Sets the FXS_USDC Uniswap oracle address 
    function setFXSUSDCOracle(address _fxs_usdc_oracle_addr) public onlyByOwnGov {
        fxs_usdc_oracle_address = _fxs_usdc_oracle_addr;
        fxsUSDCOracle = UniswapPairOracle(_fxs_usdc_oracle_addr);
    }

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnGov {
        owner_address = _owner_address;
    }

    function setInvestorParameters(address _investor_contract_address, uint256 _global_investment_cap_percentage) external onlyByOwnGov {
        investor_contract_address = _investor_contract_address;
        global_investment_cap_percentage = _global_investment_cap_percentage;
    }

}