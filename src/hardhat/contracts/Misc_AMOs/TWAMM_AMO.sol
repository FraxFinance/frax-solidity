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
// ============================ TWAMM_AMO =============================
// ====================================================================
// Interacts with Fraxswap to buy and sell FRAX and FXS
// Also can burn them or in the case of FXS, give to veFXS yield
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett
// Jack Corddry: https://github.com/corddry

import "../Frax/IFrax.sol";
import "../FXS/IFxs.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../Staking/Owned.sol";
import "../Staking/veFXSYieldDistributorV4.sol";
import "../Oracle/AggregatorV3Interface.sol";
import "../Fraxswap/periphery/libraries/UniswapV2LiquidityMathLibraryMini.sol";
import "../Fraxswap/core/interfaces/IFraxswapPair.sol";

contract TWAMM_AMO is Owned {

    // Core
    IFrax public FRAX;
    IFxs public FXS;
    IFraxswapPair public fraxswap_pair;
    IFraxAMOMinter public amo_minter;
    veFXSYieldDistributorV4 public yield_distributor;
    address public timelock_address;
    address public msig_address;

    // Oracles
    AggregatorV3Interface public priceFeedFRAXUSD;
    AggregatorV3Interface public priceFeedFXSUSD;
    uint256 public chainlink_frax_usd_decimals;
    uint256 public chainlink_fxs_usd_decimals;

    // Safety
    uint256 public max_swap_frax_amt_in = 10000000e18; // 10M, mainly fat-finger precautions
    uint256 public max_swap_fxs_amt_in = 10000000e18; // 10M, mainly fat-finger precautions

    // Constants for various precisions
    uint256 public constant PRICE_PRECISION = 1e18;

    // Misc
    bool public frax_is_token0;
    uint256 public num_twamm_intervals = 168; // Each interval is default 3600 sec (1 hr)
    uint256 public swap_period = 7 * 86400; // 7 days

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _timelock_address,
        address[8] memory _address_pack
    ) Owned(_creator_address) {
        // Set timelock
        timelock_address = _timelock_address;

        // Set instances
        FRAX = IFrax(_address_pack[0]);
        FXS = IFxs(_address_pack[1]);
        fraxswap_pair = IFraxswapPair(_address_pack[2]);
        priceFeedFRAXUSD = AggregatorV3Interface(_address_pack[3]);
        priceFeedFXSUSD = AggregatorV3Interface(_address_pack[4]);
        msig_address = _address_pack[5];
        amo_minter = IFraxAMOMinter(_address_pack[6]);
        yield_distributor = veFXSYieldDistributorV4(_address_pack[7]);

        // Set the oracle decimals
        chainlink_frax_usd_decimals = priceFeedFRAXUSD.decimals();
        chainlink_fxs_usd_decimals = priceFeedFXSUSD.decimals();

        // Need to know which token FRAX is (0 or 1)
        address token0 = fraxswap_pair.token0();
        if (token0 == address(FRAX)) frax_is_token0 = true;
        else frax_is_token0 = false;

        // Get the number of TWAMM intervals. Truncation desired
        num_twamm_intervals = swap_period / fraxswap_pair.orderTimeInterval();
    }


    /* ========== VIEWS ========== */

    // Needed as a FRAX AMO
    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = FRAX.balanceOf(address(this)); // Unallocated FRAX
        collat_val_e18 = (frax_val_e18 * FRAX.global_collateral_ratio()) / 1e6;
    }

    // In Chainlink decimals
    function getFRAXPriceE18() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFRAXUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return ((uint256(price) * 1e18) / (10 ** chainlink_frax_usd_decimals));
    }

    // In Chainlink decimals    
    function getFXSPriceE18() public view returns (uint256) {
        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = priceFeedFXSUSD.latestRoundData();
        require(price >= 0 && updatedAt!= 0 && answeredInRound >= roundID, "Invalid chainlink price");

        return ((uint256(price) * 1e18) / (10 ** chainlink_fxs_usd_decimals));
    }

    /* ========== MUTATIVE ========== */

    // Use the TWAMM
    function twammSwap(uint256 frax_sell_amt, uint256 fxs_sell_amount, uint256 override_intervals) external onlyByOwnGov returns (uint256 frax_to_use, uint256 fxs_to_use, uint256 new_order_id) {
        // Make sure only one direction occurs
        require(!((frax_sell_amt > 0) && (fxs_sell_amount > 0)), "Can only sell in one direction");

        {
            if (fxs_sell_amount > 0) {
                // Sell FXS for FRAX
                // --------------------------------
                fxs_to_use = fxs_sell_amount;
    
                // Make sure nonzero
                require(fxs_to_use > 0, "FXS sold must be nonzero");

                // Safety check
                require(fxs_to_use <= max_swap_fxs_amt_in, "Too much FXS sold");

                // Approve FXS first
                FXS.approve(address(fraxswap_pair), fxs_to_use);

                // Swap
                if (frax_is_token0) {
                    new_order_id = fraxswap_pair.longTermSwapFrom1To0(fxs_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
                else {
                    new_order_id = fraxswap_pair.longTermSwapFrom0To1(fxs_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
            }
            else {
                // Use FRAX to buy FXS
                // --------------------------------
                frax_to_use = frax_sell_amt;

                // Make sure nonzero
                require(frax_to_use > 0, "FRAX sold must be nonzero");

                // Safety check
                require(frax_to_use <= max_swap_frax_amt_in, "Too much FRAX sold");

                // Approve FRAX first
                FRAX.approve(address(fraxswap_pair), frax_to_use);

                // Swap
                if (frax_is_token0) {
                    new_order_id = fraxswap_pair.longTermSwapFrom0To1(frax_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
                else {
                    new_order_id = fraxswap_pair.longTermSwapFrom1To0(frax_to_use, override_intervals > 0 ? override_intervals : num_twamm_intervals);
                }
            }
        }

        emit SwapInitiated(new_order_id, frax_to_use, fxs_to_use, block.timestamp);
    }

    function cancelTWAMMOrder(uint256 order_id) external onlyByOwnGov {
        // Cancel the order
        fraxswap_pair.cancelLongTermSwap(order_id);

        emit SwapCancelled(order_id);
    }

    function collectCurrTWAMMProceeds(uint256 order_id) external onlyByOwnGov {
        // Withdraw current proceeds
        (, address rewardTkn, uint256 totalReward) = fraxswap_pair.withdrawProceedsFromLongTermSwap(order_id);

        emit SwapProceedsCollected(order_id, rewardTkn, totalReward);
    }

    // token_choice 0 = FRAX; 1 = FXS
    function burnAndOrGive(
        uint8 token_choice, 
        uint256 burn_amount, 
        uint256 give_amount_yield_dist,
        uint256 give_amount_msig
    ) external onlyByOwnGov {
        if (token_choice == 0) {
            // Burn some of the FRAX
            if (burn_amount > 0) burnFRAX(burn_amount);

            // Give the rest to the yield distributor
            // NOT APPLICABLE FOR FRAX

            // Give some to the msig
            if (give_amount_msig > 0) TransferHelper.safeTransfer(address(FRAX), msig_address, give_amount_msig);
        }
        else {
            // Burn some of the FXS
            if (burn_amount > 0) burnFXS(burn_amount);

            // Give some to the yield distributor
            if (give_amount_yield_dist > 0) {
                FXS.approve(address(yield_distributor), give_amount_yield_dist);
                yield_distributor.notifyRewardAmount(give_amount_yield_dist);
            }

            // Give some to the msig
            if (give_amount_msig > 0) TransferHelper.safeTransfer(address(FXS), msig_address, give_amount_msig);
        }

        emit burnAndOrGiven(token_choice, burn_amount, give_amount_yield_dist, give_amount_msig);
    }

    /* ========== Burns and givebacks ========== */
   
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);

        emit FRAXBurned(frax_amount);
    }

    // Burn unneeded FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGov {
        FXS.approve(address(amo_minter), fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);

        emit FXSBurned(fxs_amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setOracles(address _frax_oracle, address _fxs_oracle) external onlyByOwnGov {
        priceFeedFRAXUSD = AggregatorV3Interface(_frax_oracle);
        priceFeedFXSUSD = AggregatorV3Interface(_fxs_oracle);

        // Set the Chainlink oracle decimals
        chainlink_frax_usd_decimals = priceFeedFRAXUSD.decimals();
        chainlink_fxs_usd_decimals = priceFeedFXSUSD.decimals();
    }

    function setTWAMMAndSwapPeriod(address _twamm_addr, uint256 _swap_period) external onlyByOwnGov {
        // Change the TWAMM parameters
        fraxswap_pair = IFraxswapPair(_twamm_addr);
        swap_period = _swap_period;
        num_twamm_intervals = _swap_period / fraxswap_pair.orderTimeInterval();
    }

    function setTWAMMMaxSwapIn(uint256 _max_swap_frax_amt_in, uint256 _max_swap_fxs_amt_in) external onlyByOwnGov {
        max_swap_frax_amt_in = _max_swap_frax_amt_in;
        max_swap_fxs_amt_in = _max_swap_fxs_amt_in;
    }

    function setMiscAddresses(address _new_msig_address, address _new_yield_distributor_address) external onlyByOwnGov {
        msig_address = _new_msig_address;
        yield_distributor = veFXSYieldDistributorV4(_new_yield_distributor_address);
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
    event SwapInitiated(uint256 order_id, uint256 frax_amt, uint256 fxs_amt, uint256 timestamp);
    event SwapCancelled(uint256 order_id);
    event SwapProceedsCollected(uint256 order_id, address reward_tkn, uint256 ttl_reward);
    event burnAndOrGiven(uint8 token_choice, uint256 burn_amount, uint256 give_amount_yield_dist, uint256 give_amount_msig);
    event FRAXBurned(uint256 frax_amount);
    event FXSBurned(uint256 fxs_amount);
    event RecoveredERC20(address token, uint256 amount);
}
