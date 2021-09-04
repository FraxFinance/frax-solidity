// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================ FraxPoolV3 ============================
// ====================================================================
// Allows multiple stablecoins (fixed amount at initialization) as collateral
// LUSD, sUSD, USDP, Wrapped UST, and FEI initially
// For this pool, the goal is to accept crypto-backed / overcollateralized stablecoins to limit
// government / regulatory risk (e.g. USDC blacklisting until holders KYC)

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett
// Hameed

import "../../Math/SafeMath.sol";
import '../../Uniswap/TransferHelper.sol';
import "../../Staking/Owned.sol";
import "../../FXS/FXS.sol";
import "../../Frax/Frax.sol";
import "../../Frax/FraxAMOMinter.sol";
import "../../ERC20/ERC20.sol";

contract FraxPoolV3 is Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    // Core
    address public timelock_address;
    address public custodian_address; // Custodian is an EOA (or msig) with pausing privileges only, in case of an emergency
    FRAXStablecoin private FRAX = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    FRAXShares private FXS = FRAXShares(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    mapping(address => bool) public amo_minter_addresses; // minter address -> is it enabled

    // Collateral
    address[] public collateral_addresses;
    string[] public collateral_symbols;
    uint256[] public missing_decimals; // Number of decimals needed to get to E18. collateral index -> missing_decimals
    uint256[] public pool_ceilings; // Total across all collaterals. Accounts for missing_decimals
    uint256[] public collateral_prices; // Stores price of the collateral, if price is paused
    mapping(address => uint256) public collateralAddrToIdx; // collateral addr -> collateral index
    mapping(address => bool) public enabled_pools; // collateral address -> is it enabled
    
    // Redeem related
    mapping (address => uint256) public redeemFXSBalances;
    mapping (address => mapping(uint256 => uint256)) public redeemCollateralBalances; // Address -> collateral index -> balance
    uint256[] public unclaimedPoolCollateral; // collateral index -> balance
    uint256 public unclaimedPoolFXS;
    mapping (address => uint256) public lastRedeemed; // Collateral independent
    uint256 public redemption_delay = 2; // Number of blocks to wait before being able to collectRedemption()
    uint256 public redeem_price_threshold = 990000; // $0.99
    uint256 public mint_price_threshold = 1010000; // $1.01
    
    // Fees and rates
    // getters are in collateral_information()
    uint256[] private minting_fee;
    uint256[] private redemption_fee;
    uint256[] private buyback_fee;
    uint256[] private recollat_fee;
    uint256 public bonus_rate; // Bonus rate on FXS minted during recollateralizeFrax(); 6 decimals of precision, set to 0.75% on genesis
    
    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;

    // Pause variables
    // getters are in collateral_information()
    bool[] private mintPaused; // Collateral-specific
    bool[] private redeemPaused; // Collateral-specific
    bool[] private recollateralizePaused; // Collateral-specific
    bool[] private buyBackPaused; // Collateral-specific

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    modifier onlyAMOMinters() {
        require(amo_minter_addresses[msg.sender], "Not an AMO Minter");
        _;
    }

    modifier collateralEnabled(uint256 col_idx) {
        require(enabled_pools[collateral_addresses[col_idx]], "Collateral disabled");
        _;
    }
 
    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _pool_manager_address,
        address _custodian_address,
        address _timelock_address,
        address[] memory _collateral_addresses,
        uint256[] memory _pool_ceilings,
        uint256[] memory _initial_fees
    ) Owned(_pool_manager_address){
        // Core
        timelock_address = _timelock_address;
        custodian_address = _custodian_address;

        // Fill collateral info
        collateral_addresses = _collateral_addresses;
        for (uint256 i = 0; i < _collateral_addresses.length; i++){ 
            // For fast collateral address -> collateral idx lookups later
            collateralAddrToIdx[_collateral_addresses[i]] = i;

            // Validate the collaterals
            enabled_pools[_collateral_addresses[i]] = true;

            // Add in the missing decimals
            missing_decimals.push(uint256(18).sub(ERC20(_collateral_addresses[i]).decimals()));

            // Add in the collateral symbols
            collateral_symbols.push(ERC20(_collateral_addresses[i]).symbol());

            // Initialize unclaimed pool collateral
            unclaimedPoolCollateral.push(0);

            // Initialize paused prices to $1 as a backup
            collateral_prices.push(PRICE_PRECISION);

            // Handle the fees
            minting_fee.push(_initial_fees[0]);
            redemption_fee.push(_initial_fees[1]);
            buyback_fee.push(_initial_fees[2]);
            recollat_fee.push(_initial_fees[3]);

            // Handle the pauses
            mintPaused.push(false);
            redeemPaused.push(false);
            recollateralizePaused.push(false);
            buyBackPaused.push(false);
        }

        // Pool ceiling
        pool_ceilings = _pool_ceilings;
    }

    /* ========== STRUCTS ========== */
    
    struct CollateralInformation {
        uint256 index;
        string symbol;
        address col_addr;
        bool is_enabled;
        uint256 missing_decs;
        uint256 price;
        uint256 pool_ceiling;
        bool mint_paused;
        bool redeem_paused;
        bool recollat_paused;
        bool buyback_paused;
        uint256 minting_fee;
        uint256 redemption_fee;
        uint256 buyback_fee;
        uint256 recollat_fee;
    }

    /* ========== VIEWS ========== */

    // Helpful for UIs
    function collateral_information(address collat_address) external view returns (CollateralInformation memory return_data){
        require(enabled_pools[collat_address], "Invalid collateral");

        // Get the index
        uint256 idx = collateralAddrToIdx[collat_address];
        
        return_data = CollateralInformation(
            idx, // [0]
            collateral_symbols[idx], // [1]
            collat_address, // [2]
            enabled_pools[collat_address], // [3]
            missing_decimals[idx], // [4]
            collateral_prices[idx], // [5]
            pool_ceilings[idx], // [6]
            mintPaused[idx], // [7]
            redeemPaused[idx], // [8]
            recollateralizePaused[idx], // [9]
            buyBackPaused[idx], // [10]
            minting_fee[idx], // [11]
            redemption_fee[idx], // [12]
            buyback_fee[idx], // [13]
            recollat_fee[idx] // [14]
        );
    }

    // Helpful for UIs
    function allCollateralAddresses() external view returns (address[] memory) {
        return collateral_addresses;
    }

    // Helpful for UIs
    function allCollateralSymbols() external view returns (string[] memory){
        return collateral_symbols;
    }

    // Returns the FRAX value in collateral tokens
    function getFRAXInCollateral(uint256 col_idx, uint256 frax_amount) public view returns (uint256) {
        return frax_amount.mul(PRICE_PRECISION).div(10 ** missing_decimals[col_idx]).div(collateral_prices[col_idx]);
    }

    // Used by some functions.
    function freeCollatBalance(uint256 col_idx) public view returns (uint256) {
        return ERC20(collateral_addresses[col_idx]).balanceOf(address(this)).sub(unclaimedPoolCollateral[col_idx]);
    }

    // Returns dollar value of collateral held in this Frax pool, in E18
    function collatDollarBalance() external view returns (uint256 balance_tally) {
        balance_tally = 0;
        for (uint256 i = 0; i < collateral_addresses.length; i++){ 
            ERC20 collat_token = ERC20(collateral_addresses[i]);
            if (enabled_pools[collateral_addresses[i]]){
                balance_tally = balance_tally.add((collat_token.balanceOf(address(this)).sub(unclaimedPoolCollateral[i])).mul(10 ** missing_decimals[i]).mul(collateral_prices[i]).div(PRICE_PRECISION));
            }
        }
    }

    // Returns the value of excess collateral held in this Frax pool, compared to what is needed to maintain the global collateral ratio
    function availableExcessCollatDV() public view returns (uint256) {
        uint256 total_supply = FRAX.totalSupply();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 global_collat_value = FRAX.globalCollateralValue();

        if (global_collateral_ratio > PRICE_PRECISION) global_collateral_ratio = PRICE_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 = (total_supply.mul(global_collateral_ratio)).div(PRICE_PRECISION); // Calculates collateral needed to back each 1 FRAX with $1 of collateral at current collat ratio
        if (global_collat_value > required_collat_dollar_value_d18) return global_collat_value.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

     function mintFrax(
        uint256 col_idx, 
        uint256 frax_amt,
        uint256 frax_out_min,
        bool one_to_one_override
    ) external collateralEnabled(col_idx) returns (
        uint256 total_frax_mint, 
        uint256 collat_needed, 
        uint256 fxs_needed
    ) {
        require(mintPaused[col_idx] == false, "Minting is paused");

        // Prevent unneccessary mints
        require(FRAX.frax_price() >= mint_price_threshold, "Frax price too low");

        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();

        if (one_to_one_override || global_collateral_ratio >= PRICE_PRECISION) { 
            // 1-to-1, overcollateralized, or user selects override
            collat_needed = getFRAXInCollateral(col_idx, frax_amt);
            fxs_needed = 0;
        } else if (global_collateral_ratio == 0) { 
            // Algorithmic
            collat_needed = 0;
            fxs_needed = frax_amt.mul(PRICE_PRECISION).div(FRAX.fxs_price());
        } else { 
            // Fractional
            uint256 frax_for_collat = frax_amt.mul(global_collateral_ratio).div(PRICE_PRECISION);
            uint256 frax_for_fxs = frax_amt.sub(frax_for_collat);
            collat_needed = getFRAXInCollateral(col_idx, frax_for_collat);
            fxs_needed = frax_for_fxs.mul(PRICE_PRECISION).div(FRAX.fxs_price());
        }

        // Subtract the minting fee
        total_frax_mint = (frax_amt.mul(PRICE_PRECISION.sub(minting_fee[col_idx]))).div(PRICE_PRECISION);

        // Checks
        require((frax_out_min <= total_frax_mint), "FRAX slippage");
        require(freeCollatBalance(col_idx).add(collat_needed) <= pool_ceilings[col_idx], "Pool ceiling");

        // Take the FXS and collateral first
        FXS.pool_burn_from(msg.sender, fxs_needed);
        TransferHelper.safeTransferFrom(collateral_addresses[col_idx], msg.sender, address(this), collat_needed);

        // Mint the FRAX
        FRAX.pool_mint(msg.sender, total_frax_mint);
    }

    function redeemFrax(
        uint256 col_idx, 
        uint256 frax_amount, 
        uint256 fxs_out_min, 
        uint256 col_out_min
    ) external collateralEnabled(col_idx) returns (
        uint256 collat_out, 
        uint256 fxs_out
    ) {
        require(redeemPaused[col_idx] == false, "Redeeming is paused");

        // Prevent unneccessary redemptions that could adversely affect the FXS price
        require(FRAX.frax_price() <= redeem_price_threshold, "Frax price too high");

        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 frax_after_fee = (frax_amount.mul(PRICE_PRECISION.sub(redemption_fee[col_idx]))).div(PRICE_PRECISION);

        // Assumes $1 FRAX in all cases
        if(global_collateral_ratio >= PRICE_PRECISION) { 
            // 1-to-1 or overcollateralized
            collat_out = frax_after_fee
                            .mul(collateral_prices[col_idx])
                            .div(10 ** (6 + missing_decimals[col_idx])); // PRICE_PRECISION + missing decimals
            fxs_out = 0;
        } else if (global_collateral_ratio == 0) { 
            // Algorithmic
            fxs_out = frax_after_fee
                            .mul(PRICE_PRECISION)
                            .div(FRAX.fxs_price());
            collat_out = 0;
        } else { 
            // Fractional
            collat_out = frax_after_fee
                            .mul(global_collateral_ratio)
                            .mul(collateral_prices[col_idx])
                            .div(10 ** (12 + missing_decimals[col_idx])); // PRICE_PRECISION ^2 + missing decimals
            fxs_out = frax_after_fee
                            .mul(PRICE_PRECISION.sub(global_collateral_ratio))
                            .div(FRAX.fxs_price()); // PRICE_PRECISIONS CANCEL OUT
        }

        // Checks
        require(collat_out <= (ERC20(collateral_addresses[col_idx])).balanceOf(address(this)).sub(unclaimedPoolCollateral[col_idx]), "Insufficient pool collateral");
        require(collat_out >= col_out_min, "Collateral slippage");
        require(fxs_out >= fxs_out_min, "FXS slippage");

        // Account for the redeem delay
        redeemCollateralBalances[msg.sender][col_idx] = redeemCollateralBalances[msg.sender][col_idx].add(collat_out);
        unclaimedPoolCollateral[col_idx] = unclaimedPoolCollateral[col_idx].add(collat_out);

        redeemFXSBalances[msg.sender] = redeemFXSBalances[msg.sender].add(fxs_out);
        unclaimedPoolFXS = unclaimedPoolFXS.add(fxs_out);

        lastRedeemed[msg.sender] = block.number;

        FRAX.pool_burn_from(msg.sender, frax_amount);
        FXS.pool_mint(address(this), fxs_out);
    }

    // After a redemption happens, transfer the newly minted FXS and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out FRAX/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption(uint256 col_idx) external returns (uint256 fxs_amount, uint256 collateral_amount) {
        require(redeemPaused[col_idx] == false, "Redeeming is paused");
        require((lastRedeemed[msg.sender].add(redemption_delay)) <= block.number, "Too soon");
        bool sendFXS = false;
        bool sendCollateral = false;

        // Use Checks-Effects-Interactions pattern
        if(redeemFXSBalances[msg.sender] > 0){
            fxs_amount = redeemFXSBalances[msg.sender];
            redeemFXSBalances[msg.sender] = 0;
            unclaimedPoolFXS = unclaimedPoolFXS.sub(fxs_amount);
            sendFXS = true;
        }
        
        if(redeemCollateralBalances[msg.sender][col_idx] > 0){
            collateral_amount = redeemCollateralBalances[msg.sender][col_idx];
            redeemCollateralBalances[msg.sender][col_idx] = 0;
            unclaimedPoolCollateral[col_idx] = unclaimedPoolCollateral[col_idx].sub(collateral_amount);
            sendCollateral = true;
        }

        // Send out the tokens
        if(sendFXS){
            TransferHelper.safeTransfer(address(FXS), msg.sender, fxs_amount);
        }
        if(sendCollateral){
            TransferHelper.safeTransfer(collateral_addresses[col_idx], msg.sender, collateral_amount);
        }
    }

    // Function can be called by an FXS holder to have the protocol buy back FXS with excess collateral value from a desired collateral pool
    // This can also happen if the collateral ratio > 1
    function buyBackFxs(uint256 col_idx, uint256 fxs_amount, uint256 col_out_min) external collateralEnabled(col_idx) returns (uint256 col_out) {
        require(buyBackPaused[col_idx] == false, "Buyback is paused");
        uint256 fxs_price = FRAX.fxs_price();
        uint256 available_excess_collat_dv = availableExcessCollatDV();

        // If the total collateral value is higher than the amount required at the current collateral ratio then buy back up to the possible FXS with the desired collateral
        require(available_excess_collat_dv > 0, "No excess collateral");

        // Make sure not to take more than is available
        uint256 fxs_dollar_value_d18 = fxs_amount.mul(fxs_price).div(PRICE_PRECISION);
        require(fxs_dollar_value_d18 <= available_excess_collat_dv, "Not enough excess collat");

        // Get the equivalent amount of collateral based on the market value of FXS provided 
        uint256 collateral_equivalent_d18 = fxs_dollar_value_d18.mul(PRICE_PRECISION).div(collateral_prices[col_idx]);
        col_out = collateral_equivalent_d18.div(10 ** missing_decimals[col_idx]); // In its natural decimals()

        // Subtract the buyback fee
        col_out = (col_out.mul(PRICE_PRECISION.sub(buyback_fee[col_idx]))).div(PRICE_PRECISION);

        // Check for slippage
        require(col_out >= col_out_min, "Collateral slippage");

        // Take in and burn the FXS, then send out the collateral
        FXS.pool_burn_from(msg.sender, fxs_amount);
        TransferHelper.safeTransfer(collateral_addresses[col_idx], msg.sender, col_out);
    }

    // When the protocol is recollateralizing, we need to give a discount of FXS to hit the new CR target
    // Thus, if the target collateral ratio is higher than the actual value of collateral, minters get FXS for adding collateral
    // This function simply rewards anyone that sends collateral to a pool with the same amount of FXS + the bonus rate
    // Anyone can call this function to recollateralize the protocol and take the extra FXS value from the bonus rate as an arb opportunity
    function recollateralizeFrax(uint256 col_idx, uint256 collateral_amount, uint256 fxs_out_min) external collateralEnabled(col_idx) returns (uint256 collateral_units_precision, uint256 fxs_paid_back) {
        require(recollateralizePaused[col_idx] == false, "Recollat is paused");
        uint256 collateral_amount_d18 = collateral_amount * (10 ** missing_decimals[col_idx]);
        uint256 fxs_price = FRAX.fxs_price();
        uint256 collateral_units;
        uint256 amount_to_recollat;
        {
            uint256 frax_total_supply = FRAX.totalSupply();
            uint256 collat_value_attempted = collateral_amount_d18.mul(collateral_prices[col_idx]).div(PRICE_PRECISION);
            uint256 effective_collateral_ratio = FRAX.globalCollateralValue().mul(PRICE_PRECISION).div(frax_total_supply); //returns it in 1e6
            uint256 recollat_possible = (FRAX.global_collateral_ratio().mul(frax_total_supply).sub(frax_total_supply.mul(effective_collateral_ratio))).div(PRICE_PRECISION);

            if(collat_value_attempted <= recollat_possible){
                amount_to_recollat = collat_value_attempted;
            } else {
                amount_to_recollat = recollat_possible;
            }

            collateral_units = amount_to_recollat.mul(PRICE_PRECISION).div(collateral_prices[col_idx]);
        }

        collateral_units_precision = collateral_units.div(10 ** missing_decimals[col_idx]); // In its natural decimals()
        fxs_paid_back = amount_to_recollat.mul(PRICE_PRECISION.add(bonus_rate).sub(recollat_fee[col_idx])).div(fxs_price);

        // Check slippage
        require(fxs_out_min <= fxs_paid_back, "FXS slippage");

        // Check pool ceiling
        require(freeCollatBalance(col_idx).add(collateral_units_precision) <= pool_ceilings[col_idx], "Pool ceiling");

        // Take in the collateral and pay out the FXS
        TransferHelper.safeTransferFrom(collateral_addresses[col_idx], msg.sender, address(this), collateral_units_precision);
        FXS.pool_mint(msg.sender, fxs_paid_back);
    }

    // Bypasses the gassy mint->redeem cycle for AMOs to borrow collateral
    function amoMinterBorrow(uint256 collateral_amount) external onlyAMOMinters {
        // Checks the col_idx of the minter as an additional safety check
        uint256 minter_col_idx = FraxAMOMinter(msg.sender).col_idx();

        // Transfer
        TransferHelper.safeTransfer(collateral_addresses[minter_col_idx], msg.sender, collateral_amount);
    }

    /* ========== RESTRICTED FUNCTIONS, CUSTODIAN CAN CALL TOO ========== */

    function toggleMinting(uint256 col_idx) external onlyByOwnGovCust {
        mintPaused[col_idx] = !mintPaused[col_idx];

        emit MintingToggled(col_idx, mintPaused[col_idx]);
    }

    function toggleRedeeming(uint256 col_idx) external onlyByOwnGovCust {
        redeemPaused[col_idx] = !redeemPaused[col_idx];

        emit RedeemingToggled(col_idx, redeemPaused[col_idx]);
    }

    function toggleRecollateralize(uint256 col_idx) external onlyByOwnGovCust {
        recollateralizePaused[col_idx] = !recollateralizePaused[col_idx];

        emit RecollateralizeToggled(col_idx, recollateralizePaused[col_idx]);
    }
    
    function toggleBuyBack(uint256 col_idx) external onlyByOwnGovCust {
        buyBackPaused[col_idx] = !buyBackPaused[col_idx];

        emit BuybackToggled(col_idx, buyBackPaused[col_idx]);
    }

    /* ========== RESTRICTED FUNCTIONS, GOVERNANCE ONLY ========== */

    // Add an AMO Minter
    function addAMOMinter(address amo_minter_addr) external onlyByOwnGov {
        require(amo_minter_addr != address(0), "Zero address detected");

        // Make sure the AMO Minter has collatDollarBalance()
        uint256 collat_val_e18 = FraxAMOMinter(amo_minter_addr).collatDollarBalance();
        require(collat_val_e18 >= 0, "Invalid AMO");

        amo_minter_addresses[amo_minter_addr] = true;

        emit AMOMinterAdded(amo_minter_addr);
    }

    // Remove an AMO Minter 
    function removeAMOMinter(address amo_minter_addr) external onlyByOwnGov {
        amo_minter_addresses[amo_minter_addr] = false;
        
        emit AMOMinterRemoved(amo_minter_addr);
    }

    function setCollateralPrice(uint256 col_idx, uint256 _new_price) external onlyByOwnGov {
        collateral_prices[col_idx] = _new_price;

        emit CollateralPriceSet(col_idx, _new_price);
    }

    function togglePool(uint256 col_idx) external onlyByOwnGov {
        address pool_address = collateral_addresses[col_idx];
        enabled_pools[pool_address] = !enabled_pools[pool_address];

        emit PoolToggled(col_idx, enabled_pools[pool_address]);
    }

    function setPoolCeiling(uint256 col_idx, uint256 new_ceiling) external onlyByOwnGov {
        pool_ceilings[col_idx] = new_ceiling;

        emit PoolCeilingSet(col_idx, new_ceiling);
    }

    function setFees(uint256 col_idx, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee) external onlyByOwnGov {
        minting_fee[col_idx] = new_mint_fee;
        redemption_fee[col_idx] = new_redeem_fee;
        buyback_fee[col_idx] = new_buyback_fee;
        recollat_fee[col_idx] = new_recollat_fee;

        emit FeesSet(col_idx, new_mint_fee, new_redeem_fee, new_buyback_fee, new_recollat_fee);
    }

    function setPoolParameters(uint256 new_bonus_rate, uint256 new_redemption_delay) external onlyByOwnGov {
        bonus_rate = new_bonus_rate;
        redemption_delay = new_redemption_delay;
        emit PoolParametersSet(new_bonus_rate, new_redemption_delay);
    }

    function setPriceThresholds(uint256 new_mint_price_threshold, uint256 new_redeem_price_threshold) external onlyByOwnGov {
        mint_price_threshold = new_mint_price_threshold;
        redeem_price_threshold = new_redeem_price_threshold;
        emit PriceThresholdsSet(new_mint_price_threshold, new_redeem_price_threshold);
    }

    function setCustodian(address new_custodian) external onlyByOwnGov {
        custodian_address = new_custodian;

        emit CustodianSet(new_custodian);
    }

    function setTimelock(address new_timelock) external onlyByOwnGov {
        timelock_address = new_timelock;

        emit TimelockSet(new_timelock);
    }

    /* ========== EVENTS ========== */
    event PoolToggled(uint256 col_idx, bool new_state);
    event PoolCeilingSet(uint256 col_idx, uint256 new_ceiling);
    event FeesSet(uint256 col_idx, uint256 new_mint_fee, uint256 new_redeem_fee, uint256 new_buyback_fee, uint256 new_recollat_fee);
    event PoolParametersSet(uint256 new_bonus_rate, uint256 new_redemption_delay);
    event PriceThresholdsSet(uint256 new_bonus_rate, uint256 new_redemption_delay);
    event AMOMinterAdded(address amo_minter_addr);
    event AMOMinterRemoved(address amo_minter_addr);
    event CustodianSet(address new_custodian);
    event TimelockSet(address new_timelock);
    event MintingToggled(uint256 col_idx, bool toggled);
    event RedeemingToggled(uint256 col_idx, bool toggled);
    event RecollateralizeToggled(uint256 col_idx, bool toggled);
    event BuybackToggled(uint256 col_idx, bool toggled);
    event CollateralPriceSet(uint256 col_idx, uint256 new_price);
}