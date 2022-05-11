// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= FPIControllerPool =========================
// ====================================================================
// Makes sure FPI is targeting the CPI peg
// First method is minting / redeeming with FRAX
// Second is bulk TWAMM trades
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett
// Jack Corddry: https://github.com/corddry

import "./FPI.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../Staking/Owned.sol";
import "../Oracle/AggregatorV3Interface.sol";
import "../Oracle/CPITrackerOracle.sol";
import "../Fraxswap/periphery/libraries/UniswapV2LiquidityMathLibraryMini.sol";
import "../Fraxswap/core/interfaces/IFraxswapPair.sol";

contract FPIControllerPool is Owned {

    // Core
    address public timelock_address;
    FPI public FPI_TKN;
    IFrax public FRAX;
    IFraxswapPair public TWAMM;

    // Oracles
    AggregatorV3Interface public priceFeedFRAXUSD;
    AggregatorV3Interface public priceFeedFPIUSD;
    uint256 public chainlink_frax_usd_decimals;
    uint256 public chainlink_fpi_usd_decimals;
    CPITrackerOracle public cpiTracker;

    // Tracking
    uint256 public last_order_id_twamm; // Last TWAMM order ID that was used

   // AMO addresses (lend out FRAX)
    address[] public amos_array;
    mapping(address => bool) public amos; // Mapping is also used for faster verification

    // FRAX borrowed balances
    mapping(address => int256) public frax_borrowed_balances; // Amount of FRAX the contract borrowed, by AMO
    int256 public frax_borrowed_sum = 0; // Across all AMOs
    int256 public frax_borrow_cap = int256(10000000e18); // Max amount of FRAX the contract can borrow from this contract

    // Mint Fee Related
    bool public use_manual_mint_fee = true;
    uint256 public mint_fee_manual = 3000; // E6
    uint256 public mint_fee_multiplier = 1000000; // E6
    
    // Redeem Fee Related
    bool public use_manual_redeem_fee = true;
    uint256 public redeem_fee_manual = 3000; // E6
    uint256 public redeem_fee_multiplier = 1000000; // E6
    
    // Safety
    uint256 public fpi_mint_cap = 110000000e18; // 110M
    uint256 public peg_band_mint_redeem = 50000; // 5%
    uint256 public peg_band_twamm = 100000; // 10%
    uint256 public max_swap_frax_amt_in = 10000000e18; // 10M, mainly fat-finger precautions
    uint256 public max_swap_fpi_amt_in = 10000000e18; // 10M, mainly fat-finger precautions
    bool public mints_paused = false;
    bool public redeems_paused = false;

    // Constants for various precisions
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant FEE_PRECISION = 1e6;
    uint256 public constant PEG_BAND_PRECISION = 1e6;

    // Misc
    bool public frax_is_token0;
    bool public pending_twamm_order = false;
    uint256 public num_twamm_intervals = 168; // Each interval is default 3600 sec (1 hr)
    uint256 public swap_period = 7 * 86400; // 7 days

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier validAMO(address amo_address) {
        require(amos[amo_address], "Invalid AMO");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _timelock_address,
        address[6] memory _address_pack
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;

        // Set instances
        FRAX = IFrax(_address_pack[0]);
        FPI_TKN = FPI(_address_pack[1]);
        TWAMM = IFraxswapPair(_address_pack[2]);
        priceFeedFRAXUSD = AggregatorV3Interface(_address_pack[3]);
        priceFeedFPIUSD = AggregatorV3Interface(_address_pack[4]);
        cpiTracker = CPITrackerOracle(_address_pack[5]);

        // Set the oracle decimals
        chainlink_frax_usd_decimals = priceFeedFRAXUSD.decimals();
        chainlink_fpi_usd_decimals = priceFeedFPIUSD.decimals();

        // Need to know which token FRAX is (0 or 1)
        address token0 = TWAMM.token0();
        if (token0 == address(FRAX)) frax_is_token0 = true;
        else frax_is_token0 = false;

        // Get the number of TWAMM intervals. Truncation desired
        num_twamm_intervals = swap_period / TWAMM.orderTimeInterval();
    }


    /* ========== VIEWS ========== */

    // Needed as a FRAX AMO
    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        // Dummy values here. FPI is not FRAX and should not be treated as FRAX collateral
        frax_val_e18 = 1e18;
        collat_val_e18 = 1e18;
    }

    // In Chainlink decimals
    function getFRAXPriceE18() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFRAXUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return ((uint256(price) * 1e18) / (10 ** chainlink_frax_usd_decimals));
    }

    // In Chainlink decimals    
    function getFPIPriceE18() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFPIUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return ((uint256(price) * 1e18) / (10 ** chainlink_fpi_usd_decimals));
    }

    // Reserve spot price (fpi_price is dangerous / flash loan susceptible, so use carefully)    
    function getReservesAndFPISpot() public returns (uint256 reserveFRAX, uint256 reserveFPI, uint256 fpi_price) {
        // Update and get the reserves
        TWAMM.executeVirtualOrders(block.timestamp);
        {
            (uint256 reserveA, uint256 reserveB, ) = TWAMM.getReserves();
            if (frax_is_token0){
                reserveFRAX = reserveA;
                reserveFPI = reserveB;
                
            }
            else {
                reserveFRAX = reserveB;
                reserveFPI = reserveA;
            }
        }

        // Get the TWAMM reserve spot price
        fpi_price = (reserveFRAX * 1e18) / reserveFPI;
    }

    // function getTwammToPegAmt() public returns (uint256 frax_in, uint256 fpi_in) {
    //     // Update and get the reserves
    //     (uint256 reserveFRAX, uint256 reserveFPI, uint256 reservePriceFPI) = getReservesAndFPISpot();
        
    //     // Get the CPI price
    //     uint256 cpi_peg_price = cpiTracker.currPegPrice();

    //     // Sort the pricing. NOTE: IN RATIOS, NOT PRICE
    //     uint256 truePriceFRAX = 1e18;
    //     uint256 truePriceFPI = cpi_peg_price;

    //     // Determine the direction
    //     if (fpi_to_frax) {
    //         return UniswapV2LiquidityMathLibraryMini.computeProfitMaximizingTrade(
    //             truePriceFPI, truePriceFRAX,
    //             reserveFPI, reserveFRAX
    //         );
    //     }
    //     else {
    //         return UniswapV2LiquidityMathLibraryMini.computeProfitMaximizingTrade(
    //             truePriceFRAX, truePriceFPI,
    //             reserveFRAX, reserveFPI
    //         );
    //     }
    // }

    // In E6
    function mint_fee() public view returns (uint256 fee) {
        if (use_manual_mint_fee) fee = mint_fee_manual;
        else {
            // For future variable fees
            fee = 0;

            // Apply the multiplier
            fee = (fee * mint_fee_multiplier) / 1e6;
        }
    }

    // In E6
    function redeem_fee() public view returns (uint256 fee) {
        if (use_manual_redeem_fee) fee = redeem_fee_manual;
        else {
            // For future variable fees
            fee = 0;

            // Apply the multiplier
            fee = (fee * redeem_fee_multiplier) / 1e6;
        }

        
    }

    // Get some info about the peg status
    function pegStatusMntRdm() public view returns (uint256 cpi_peg_price, uint256 diff_frac_abs, bool within_range) {
        uint256 fpi_price = getFPIPriceE18();
        cpi_peg_price = cpiTracker.currPegPrice();

        if (fpi_price > cpi_peg_price){
            diff_frac_abs = ((fpi_price - cpi_peg_price) * PEG_BAND_PRECISION) / fpi_price;
        }
        else {
            diff_frac_abs = ((cpi_peg_price - fpi_price) * PEG_BAND_PRECISION) / fpi_price;
        }

        within_range = (diff_frac_abs <= peg_band_mint_redeem);
    }

    // Get additional info about the peg status
    function price_info() public view returns (
        int256 collat_imbalance, 
        uint256 cpi_peg_price,
        uint256 fpi_price,
        uint256 price_diff_frac_abs
    ) {
        fpi_price = getFPIPriceE18();
        cpi_peg_price = cpiTracker.currPegPrice();
        uint256 fpi_supply = FPI_TKN.totalSupply();

        if (fpi_price > cpi_peg_price){
            collat_imbalance = int256(((fpi_price - cpi_peg_price) * fpi_supply) / PRICE_PRECISION);
            price_diff_frac_abs = ((fpi_price - cpi_peg_price) * PEG_BAND_PRECISION) / fpi_price;
        }
        else {
            collat_imbalance = -1 * int256(((cpi_peg_price - fpi_price) * fpi_supply) / PRICE_PRECISION);
            price_diff_frac_abs = ((cpi_peg_price - fpi_price) * PEG_BAND_PRECISION) / fpi_price;
        }
    }

    /* ========== MUTATIVE ========== */

    // Calculate Mint FPI with FRAX
    function calcMintFPI(uint256 frax_in, uint256 min_fpi_out) public view returns (uint256 fpi_out) {
        require(!mints_paused, "Mints paused");

        // Fetch the CPI price and other info
        (uint256 cpi_peg_price, , bool within_range) = pegStatusMntRdm();

        // Make sure the peg is within range for minting
        // Helps combat oracle errors and megadumping
        require(within_range, "Peg band [Mint]");

        // Calculate the amount of FPI that the incoming FRAX should give
        fpi_out = (frax_in * PRICE_PRECISION) / cpi_peg_price;

        // Apply the fee
        fpi_out -= (fpi_out * mint_fee()) / FEE_PRECISION;

        // Make sure enough FPI is generated
        require(fpi_out >= min_fpi_out, "Slippage [Mint]");

        // Check the mint cap
        require(FPI_TKN.totalSupply() + fpi_out <= fpi_mint_cap, "FPI mint cap");
    }

    // Mint FPI with FRAX
    function mintFPI(uint256 frax_in, uint256 min_fpi_out) external returns (uint256 fpi_out) {
        fpi_out = calcMintFPI(frax_in, min_fpi_out);

        // Pull in the FRAX
        TransferHelper.safeTransferFrom(address(FRAX), msg.sender, address(this), frax_in);

        // Mint FPI to the sender
        FPI_TKN.minter_mint(msg.sender, fpi_out);

        emit FPIMinted(frax_in, fpi_out);
    }

    // Calculate Redeem FPI for FRAX
    function calcRedeemFPI(uint256 fpi_in, uint256 min_frax_out) public view returns (uint256 frax_out) {
        require(!redeems_paused, "Redeems paused");

        // Fetch the CPI price and other info
        (uint256 cpi_peg_price, , bool within_range) = pegStatusMntRdm();

        // Make sure the peg is within range for minting
        // Helps combat oracle errors and megadumping
        require(within_range, "Peg band [Redeem]");

        // Calculate the amount of FRAX that the incoming FPI should give
        frax_out = (fpi_in * cpi_peg_price) / PRICE_PRECISION;

        // Apply the fee
        frax_out -= (frax_out * redeem_fee()) / FEE_PRECISION;

        // Make sure enough FRAX is generated
        require(frax_out >= min_frax_out, "Slippage [Redeem]");
    }

    // Redeem FPI for FRAX
    function redeemFPI(uint256 fpi_in, uint256 min_frax_out) external returns (uint256 frax_out) {
        frax_out = calcRedeemFPI(fpi_in, min_frax_out);

        // Pull in the FPI
        TransferHelper.safeTransferFrom(address(FPI_TKN), msg.sender, address(this), fpi_in);

        // Give FRAX to the sender
        TransferHelper.safeTransfer(address(FRAX), msg.sender, frax_out);

        emit FPIRedeemed(fpi_in, frax_out);
    }

    // Use the TWAMM for bulk peg corrections
    function twammManual(uint256 frax_sell_amt, uint256 fpi_sell_amt, uint256 override_intervals) external onlyByOwnGov returns (uint256 frax_to_use, uint256 fpi_to_use) {
        // Make sure only one direction occurs
        require(!((frax_sell_amt > 0) && (fpi_sell_amt > 0)), "Can only sell in one direction");

        // Update and get the reserves
        // longTermSwapFrom0to1 and longTermSwapFrom1To0 do it automatically
        // TWAMM.executeVirtualOrders(block.timestamp);
        
        // Cancel the previous order (if any) and collect any leftover tokens
        if (pending_twamm_order) TWAMM.cancelLongTermSwap(last_order_id_twamm);

        // Now calculate the imbalance after the burn
        (, , , uint256 price_diff_abs) = price_info();

        // Make sure the FPI oracle price hasn't moved away too much from the target peg price
        require(price_diff_abs <= peg_band_twamm, "Peg band [TWAMM]");

        // Create a new order
        last_order_id_twamm = TWAMM.getNextOrderID(); 
        {
            if (fpi_sell_amt > 0) {
                // Mint FPI and sell for FRAX
                // --------------------------------
                fpi_to_use = fpi_sell_amt;
    
                // Make sure nonzero
                require(fpi_to_use > 0, "FPI sold must be nonzero");

                // Safety check
                require(fpi_to_use <= max_swap_fpi_amt_in, "Too much FPI sold");

                // Mint some FPI
                FPI_TKN.minter_mint(address(this), fpi_to_use);

                // Approve FPI first
                FPI_TKN.approve(address(TWAMM), fpi_to_use);

                // Sell FPI for FRAX
                if (frax_is_token0) {
                    TWAMM.longTermSwapFrom1To0(fpi_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
                else {
                    TWAMM.longTermSwapFrom0To1(fpi_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
            }
            else {
                // Use FRAX to buy FPI
                // --------------------------------
                frax_to_use = frax_sell_amt;

                // Make sure nonzero
                require(frax_to_use > 0, "FRAX sold must be nonzero");

                // Safety check
                require(frax_to_use <= max_swap_frax_amt_in, "Too much FRAX sold");

                // Approve FRAX first
                FRAX.approve(address(TWAMM), frax_to_use);

                // Sell FRAX for FPI
                if (frax_is_token0) {
                    TWAMM.longTermSwapFrom0To1(frax_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
                else {
                    TWAMM.longTermSwapFrom1To0(frax_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
            }
        }

        // Mark that there is a pending order
        pending_twamm_order = true;

        emit TWAMMedToPeg(last_order_id_twamm, frax_to_use, fpi_to_use, block.timestamp);
    }

    function cancelCurrTWAMMOrder(uint256 order_id_override) public onlyByOwnGov {
        // Get the order id
        uint256 order_id_to_use = (order_id_override == 0 ? last_order_id_twamm : order_id_override);

        // Cancel the order
        TWAMM.cancelLongTermSwap(order_id_to_use);

        // Clear the pending order indicator
        pending_twamm_order = false;

        emit TWAMMOrderCancelled(order_id_to_use);
    }

    function collectCurrTWAMMProceeds(uint256 order_id_override) external onlyByOwnGov {
        // Get the order id
        uint256 order_id_to_use = (order_id_override == 0 ? last_order_id_twamm : order_id_override);

        // Withdraw current proceeds
        (bool is_expired, address rewardTkn, uint256 totalReward) = TWAMM.withdrawProceedsFromLongTermSwap(order_id_to_use);
        
        // If using the last_order_id_twamm and it is expired, clear the pending order indicator
        if (is_expired && (order_id_override == 0)) pending_twamm_order = false;

        emit TWAMMProceedsCollected(order_id_to_use, rewardTkn, totalReward);
    }

    /* ========== Burns and givebacks ========== */

    // Burn unneeded or excess FPI.
    function burnFPI(bool burn_all, uint256 fpi_amount) public onlyByOwnGov {
        uint256 amt_to_burn = burn_all ? FPI_TKN.balanceOf(address(this)) : fpi_amount;

        // Burn
        FPI_TKN.burn(amt_to_burn);

        emit FPIBurned(amt_to_burn);
    }

    // ------------------------------------------------------------------
    // ------------------------------ FRAX ------------------------------
    // ------------------------------------------------------------------

    // Lend the FRAX collateral to an AMO
    function giveFRAXToAMO(address destination_amo, uint256 frax_amount) external onlyByOwnGov validAMO(destination_amo) {
        require(frax_amount <= (2**255 - 1), "int256 overflow");
        int256 frax_amount_i256 = int256(frax_amount);

        // Update the balances first
        require((frax_borrowed_sum + frax_amount_i256) <= frax_borrow_cap, "Borrow cap");
        frax_borrowed_balances[destination_amo] += frax_amount_i256;
        frax_borrowed_sum += frax_amount_i256;

        // Give the FRAX to the AMO
        TransferHelper.safeTransfer(address(FRAX), destination_amo, frax_amount);

        emit FRAXGivenToAMO(destination_amo, frax_amount);
    }

    // AMO gives back FRAX. Needed for proper accounting
    function receiveFRAXFromAMO(uint256 frax_amount) external validAMO(msg.sender) {
        require(frax_amount <= (2**255 - 1), "int256 overflow");
        int256 frax_amt_i256 = int256(frax_amount);

        // Give back first
        TransferHelper.safeTransferFrom(address(FRAX), msg.sender, address(this), frax_amount);

        // Then update the balances
        frax_borrowed_balances[msg.sender] -= frax_amt_i256;
        frax_borrowed_sum -= frax_amt_i256;

        emit FRAXReceivedFromAMO(msg.sender, frax_amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Adds an AMO 
    function addAMO(address amo_address) public onlyByOwnGov {
        require(amo_address != address(0), "Zero address detected");

        require(amos[amo_address] == false, "Address already exists");
        amos[amo_address] = true; 
        amos_array.push(amo_address);

        emit AMOAdded(amo_address);
    }

    // Removes an AMO
    function removeAMO(address amo_address) public onlyByOwnGov {
        require(amo_address != address(0), "Zero address detected");
        require(amos[amo_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete amos[amo_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < amos_array.length; i++){ 
            if (amos_array[i] == amo_address) {
                amos_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        emit AMORemoved(amo_address);
    }

    function setOracles(address _frax_oracle, address _fpi_oracle, address _cpi_oracle) external onlyByOwnGov {
        priceFeedFRAXUSD = AggregatorV3Interface(_frax_oracle);
        priceFeedFPIUSD = AggregatorV3Interface(_fpi_oracle);
        cpiTracker = CPITrackerOracle(_cpi_oracle);

        // Set the Chainlink oracle decimals
        chainlink_frax_usd_decimals = priceFeedFRAXUSD.decimals();
        chainlink_fpi_usd_decimals = priceFeedFPIUSD.decimals();
    }

    function setTWAMMAndSwapPeriod(address _twamm_addr, uint256 _swap_period) external onlyByOwnGov {
        // Cancel an outstanding order, if present
        if (pending_twamm_order) cancelCurrTWAMMOrder(last_order_id_twamm);
        
        // Change the TWAMM parameters
        TWAMM = IFraxswapPair(_twamm_addr);
        swap_period = _swap_period;
        num_twamm_intervals = _swap_period / TWAMM.orderTimeInterval();
    }

    function toggleMints() external onlyByOwnGov {
        mints_paused = !mints_paused;
    }

    function toggleRedeems() external onlyByOwnGov {
        redeems_paused = !redeems_paused;
    }

    function setFraxBorrowCap(int256 _frax_borrow_cap) external onlyByOwnGov {
        require(_frax_borrow_cap >= 0, "int256 underflow");
        require(_frax_borrow_cap <= (2**255 - 1), "int256 overflow");
        frax_borrow_cap = _frax_borrow_cap;
    }

    function setMintCap(uint256 _fpi_mint_cap) external onlyByOwnGov {
        fpi_mint_cap = _fpi_mint_cap;
    }

    function setPegBands(uint256 _peg_band_mint_redeem, uint256 _peg_band_twamm) external onlyByOwnGov {
        peg_band_mint_redeem = _peg_band_mint_redeem;
        peg_band_twamm = _peg_band_twamm;
    }

    function setMintRedeemFees(
        bool _use_manual_mint_fee,
        uint256 _mint_fee_manual, 
        uint256 _mint_fee_multiplier, 
        bool _use_manual_redeem_fee,
        uint256 _redeem_fee_manual, 
        uint256 _redeem_fee_multiplier
    ) external onlyByOwnGov {
        use_manual_mint_fee = _use_manual_mint_fee;
        mint_fee_manual = _mint_fee_manual;
        mint_fee_multiplier = _mint_fee_multiplier;
        use_manual_redeem_fee = _use_manual_redeem_fee;
        redeem_fee_manual = _redeem_fee_manual;
        redeem_fee_multiplier = _redeem_fee_multiplier;
    }

    function setTWAMMMaxSwapIn(uint256 _max_swap_frax_amt_in, uint256 _max_swap_fpi_amt_in) external onlyByOwnGov {
        max_swap_frax_amt_in = _max_swap_frax_amt_in;
        max_swap_fpi_amt_in = _max_swap_fpi_amt_in;
    }

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    // Added to support recovering LP Rewards and other mistaken tokens from other systems to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */
    event FPIMinted(uint256 frax_in, uint256 fpi_out);
    event FPIRedeemed(uint256 fpi_in, uint256 frax_out);
    event TWAMMedToPeg(uint256 order_id, uint256 frax_amt, uint256 fpi_amt, uint256 timestamp);
    event TWAMMOrderCancelled(uint256 order_id);
    event TWAMMProceedsCollected(uint256 order_id, address reward_tkn, uint256 ttl_reward);
    event FPIBurned(uint256 amt_burned);
    event FRAXGivenToAMO(address destination_amo, uint256 frax_amount);
    event FRAXReceivedFromAMO(address source_amo, uint256 frax_amount);
    event AMOAdded(address amo_address);
    event AMORemoved(address amo_address);
    event RecoveredERC20(address token, uint256 amount);
}
