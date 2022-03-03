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
// ========================= FPIControllerAMO =========================
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
import "../Uniswap_V2_TWAMM/periphery/libraries/UniswapV2LiquidityMathLibraryMini.sol";
import "../Uniswap_V2_TWAMM/core/interfaces/IUniV2TWAMMPair.sol";

contract FPIControllerAMO is Owned {

    // Core
    address public timelock_address;
    FPI public FPI_TKN = FPI(0x76c8ceF5B18994a85bC2bE1991E5B9C716626767);
    IFrax public FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IUniV2TWAMMPair public TWAMM = IUniV2TWAMMPair(0x0000000000000000000000000000000000000000);
    IFraxAMOMinter public amo_minter = IFraxAMOMinter(0xcf37B62109b537fa0Cb9A90Af4CA72f6fb85E241);

    // Oracles
    AggregatorV3Interface public priceFeedFRAXUSD = AggregatorV3Interface(0xB9E1E3A9feFf48998E45Fa90847ed4D467E8BcfD);
    AggregatorV3Interface public priceFeedFPIUSD = AggregatorV3Interface(0x0000000000000000000000000000000000000000);
    CPITrackerOracle public cpiTracker = CPITrackerOracle(0x90E7eFdcA79de10F1713c59BC3AE9B076e753490);

    // Tracking
    uint256 public last_fpi_price_twamm;
    uint256 public last_order_id_twamm;
    uint256 public last_swap_time_twamm;

    // Misc
    bool frax_is_token0;
    uint256 public num_twamm_intervals;
    uint256 public swap_period = 7 * 86400; // 7 days

    // Constants for various precisions
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant FEE_PRECISION = 1e6;
    uint256 public constant PEG_BAND_PRECISION = 1e6;
   
    // Fees
    uint256 public mint_fee = 30000;
    uint256 public redeem_fee = 30000;

    // Safety
    uint256 public fpi_mint_cap = 100000000e18;
    uint256 public peg_band_mint_redeem = 50000; // 5%
    uint256 public peg_band_twamm = 100000; // 10%
    uint256 public max_swap_frax_amt_in = 100000000e18; // 100M
    uint256 public max_swap_fpi_amt_in = 100000000e18; // 100M

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _timelock_address
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;

        // Need to know which token FRAX is (0 or 1)
        address token0 = TWAMM.token0();
        if (token0 == address(FRAX)) frax_is_token0 = true;
        else frax_is_token0 = false;

        // Get the number of TWAMM intervals. Truncation desired
        num_twamm_intervals = swap_period / TWAMM.orderTimeInterval();
    }


    /* ========== VIEWS ========== */

    // Needed as an AMO
    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = FRAX.balanceOf(address(this));
        collat_val_e18 = (frax_val_e18 * 1e6) / FRAX.global_collateral_ratio();
    }

    function getFRAXPriceE18() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFRAXUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return ((uint256(price) * PRICE_PRECISION) / 1e18);
    }

    function getFPIPriceE18() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFPIUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return ((uint256(price) * PRICE_PRECISION) / 1e18);
    }

    function peg_status_mntrdm() public view returns (uint256 cpi_price, uint256 diff_pct_abs, bool within_range) {
        uint256 fpi_price = getFPIPriceE18();
        cpi_price = cpiTracker.lastPrice();

        if (fpi_price > cpi_price){
            diff_pct_abs = ((fpi_price - cpi_price) * PEG_BAND_PRECISION) / fpi_price;
        }
        else {
            diff_pct_abs = ((cpi_price - fpi_price) * PEG_BAND_PRECISION) / fpi_price;
        }

        within_range = (diff_pct_abs <= peg_band_mint_redeem);
    }

    function price_info() public view returns (
        int256 collat_imbalance, 
        uint256 cpi_price,
        uint256 fpi_price,
        uint256 price_diff_pct_abs
    ) {
        fpi_price = getFPIPriceE18();
        cpi_price = cpiTracker.lastPrice();
        uint256 fpi_supply = FPI_TKN.totalSupply();

        if (fpi_price > cpi_price){
            collat_imbalance = int256(((fpi_price - cpi_price) * fpi_supply) / PRICE_PRECISION);
            price_diff_pct_abs = ((fpi_price - cpi_price) * PEG_BAND_PRECISION) / fpi_price;
        }
        else {
            collat_imbalance = -1 * int256(((cpi_price - fpi_price) * fpi_supply) / PRICE_PRECISION);
            price_diff_pct_abs = ((cpi_price - fpi_price) * PEG_BAND_PRECISION) / fpi_price;
        }
    }

    /* ========== MUTATIVE ========== */

    // Mint FPI with FRAX
    function mintFPI(uint256 frax_in, uint256 min_fpi_out) external returns (uint256 fpi_out) {
        // Fetch the CPI price and other info
        (uint256 cpi_price, , bool within_range) = peg_status_mntrdm();

        // Make sure the peg is within range for minting
        // Helps combat oracle errors and megadumping
        require(within_range, "Peg band [Mint]");

        // Calculate the amount of FPI that the incoming FRAX should give
        fpi_out = (frax_in * PRICE_PRECISION) / cpi_price;

        // Apply the fee
        fpi_out = (fpi_out * (FEE_PRECISION - mint_fee)) / FEE_PRECISION;

        // Make sure enough FPI is generated
        require(fpi_out >= min_fpi_out, "Slippage [Mint]");

        // Check the mint cap
        require(FPI_TKN.totalSupply() + fpi_out <= fpi_mint_cap, "FPI mint cap");

        // Pull in the FRAX
        TransferHelper.safeTransferFrom(address(FRAX), msg.sender, address(this), frax_in);

        // Mint FPI to the sender
        FPI_TKN.minter_mint(msg.sender, fpi_out);

        emit FPIMinted(frax_in, fpi_out);
    }

    // Redeem FPI for FRAX
    function redeemFPI(uint256 fpi_in, uint256 min_frax_out) external returns (uint256 frax_out) {
        // Fetch the CPI price and other info
        (uint256 cpi_price, , bool within_range) = peg_status_mntrdm();

        // Make sure the peg is within range for minting
        // Helps combat oracle errors and megadumping
        require(within_range, "Peg band [Redeem]");

        // Calculate the amount of FRAX that the incoming FPI should give
        frax_out = (fpi_in * cpi_price) / PRICE_PRECISION;

        // Apply the fee
        frax_out = (frax_out * (FEE_PRECISION - redeem_fee)) / FEE_PRECISION;

        // Make sure enough FRAX is generated
        require(frax_out >= min_frax_out, "Slippage [Redeem]");

        // Pull in the FPI
        TransferHelper.safeTransferFrom(address(FPI_TKN), msg.sender, address(this), fpi_in);

        // Give FRAX to the sender
        TransferHelper.safeTransferFrom(address(FRAX), address(this), msg.sender, frax_out);

        emit FPIRedeemed(fpi_in, frax_out);
    }

    // Use the TWAMM for bulk peg corrections
    function twammToPeg(uint256 override_amt) external onlyByOwnGov returns (uint256 frax_to_use, uint256 fpi_to_use) {
        // Cancel the previous order (should have expired anyways) and collect any leftover tokens
        TWAMM.cancelLongTermSwap(last_order_id_twamm);

        // Burn any leftover FPI
        FPI_TKN.burn(FPI_TKN.balanceOf(address(this)));

        // Now calculate the imbalance after the burn
        (int256 collat_imbalance, uint256 curr_cpi_price, uint256 curr_fpi_price, uint256 price_diff_abs) = price_info();

        // Make sure the FPI price hasn't moved too much
        require(price_diff_abs <= peg_band_twamm, "Peg band [TWAMM]");

        // Create a new order
        last_order_id_twamm = TWAMM.getNextOrderID(); 
        last_fpi_price_twamm = curr_fpi_price;
        {
            // Get the reserves
            (uint256 reserveA, uint256 reserveB, ) = TWAMM.getReserves();

            // Sort the pricing
            uint256 truePriceTokenA;
            uint256 truePriceTokenB;
            if (frax_is_token0){
                truePriceTokenA = 1e18;
                truePriceTokenB = curr_cpi_price;
            }
            else {
                truePriceTokenA = curr_cpi_price;
                truePriceTokenB = 1e18;
            }

            if (collat_imbalance > 0) {
                // FPI price is too high, mint FPI and sell for FRAX

                // Sell cap
                uint256 fpi_max = (uint256(collat_imbalance) * PRICE_PRECISION) / curr_fpi_price;

                // Calculate the amount of FPI needed to be sold in order to reach the target FPI price
                fpi_to_use = UniswapV2LiquidityMathLibraryMini.computeProfitMaximizingTrade(
                    truePriceTokenA, truePriceTokenB,
                    reserveA, reserveB,
                    !frax_is_token0
                );

                // Cap the amount of FPI sold
                if (fpi_to_use > fpi_max) fpi_to_use = fpi_max;

                // Optionally handle the override amount
                if (override_amt > 0) fpi_to_use = override_amt;

                // Mint some FPI
                FPI_TKN.minter_mint(address(this), fpi_to_use);

                // Approve FPI first
                FPI_TKN.approve(address(TWAMM), fpi_to_use);

                // Sell FPI for FRAX
                if (frax_is_token0) {
                    TWAMM.longTermSwapFrom1To0(fpi_to_use, num_twamm_intervals);
                }
                else {
                    TWAMM.longTermSwapFrom0To1(fpi_to_use, num_twamm_intervals);
                }
            }
            else {
                // FPI price is too low, use existing (pre-minted or deposited) FRAX and buy FPI

                // Sell cap
                uint256 frax_max = uint256(-1 * collat_imbalance); // collat_imbalance will always be negative here

                // Calculate the amount of FRAX needed to be sold in order to reach the target FPI price
                frax_to_use = UniswapV2LiquidityMathLibraryMini.computeProfitMaximizingTrade(
                    truePriceTokenA, truePriceTokenB,
                    reserveA, reserveB,
                    frax_is_token0
                );

                // Cap the amount of FRAX sold
                if (frax_to_use > frax_max) frax_to_use = frax_max;

                // Optionally handle the override amount
                if (override_amt > 0) fpi_to_use = override_amt;

                // Approve FRAX first
                FRAX.approve(address(TWAMM), frax_to_use);

                // Sell FRAX for FPI
                if (frax_is_token0) {
                    TWAMM.longTermSwapFrom0To1(frax_to_use, num_twamm_intervals);
                }
                else {
                    TWAMM.longTermSwapFrom1To0(frax_to_use, num_twamm_intervals);
                }
            }

            // Safety checks
            require(frax_to_use <= max_swap_frax_amt_in, "Too much FRAX sold");
            require(fpi_to_use <= max_swap_fpi_amt_in, "Too much FPI sold");
        }
        
        // Update the last swap time
        last_swap_time_twamm = block.timestamp;

        emit TWAMMedToPeg(last_order_id_twamm, frax_to_use, fpi_to_use, last_swap_time_twamm);
    }

    function abortCurrTWAMMOrder(uint256 order_id_override) external onlyByOwnGov {
        TWAMM.cancelLongTermSwap(order_id_override == 0 ? last_order_id_twamm : order_id_override);
    }

    /* ========== Burns and givebacks ========== */

    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setOracles(address _frax_oracle, address _fpi_oracle, address _cpi_oracle) external onlyByOwnGov {
        priceFeedFRAXUSD = AggregatorV3Interface(_frax_oracle);
        priceFeedFPIUSD = AggregatorV3Interface(_fpi_oracle);
        cpiTracker = CPITrackerOracle(_cpi_oracle);
    }

    function setTWAMMAndSwapPeriod(address _twamm_addr, uint256 _swap_period) external onlyByOwnGov {
        TWAMM = IUniV2TWAMMPair(_twamm_addr);
        swap_period = _swap_period;
        num_twamm_intervals = _swap_period / TWAMM.orderTimeInterval();
    }

    function setMintCap(uint256 _fpi_mint_cap) external onlyByOwnGov {
        fpi_mint_cap = _fpi_mint_cap;
    }

    function setPegBands(uint256 _peg_band_mint_redeem, uint256 _peg_band_twamm) external onlyByOwnGov {
        peg_band_mint_redeem = _peg_band_mint_redeem;
        peg_band_twamm = _peg_band_twamm;
    }

    function setFees(uint256 _mint_fee, uint256 _redeem_fee) external onlyByOwnGov {
        mint_fee = _mint_fee;
        redeem_fee = _redeem_fee;
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

    event RecoveredERC20(address token, uint256 amount);
    event FPIMinted(uint256 frax_in, uint256 fpi_out);
    event FPIRedeemed(uint256 fpi_in, uint256 frax_out);
    event TWAMMedToPeg(uint256 order_id, uint256 frax_amt, uint256 fpi_amt, uint256 timestamp);
}