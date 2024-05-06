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
// ========================== FLETwammGauge ===========================
// ====================================================================
// Interacts with Fraxswap to sell FXS for Frax-ecosystem assets
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: https://github.com/denett

import "../ERC20/IERC20.sol";
import "../FXS/IFxs.sol";
import "../Staking/OwnedV2.sol";
import "../Oracle/AggregatorV3Interface.sol";
import "../Fraxswap/core/interfaces/IFraxswapPair.sol";
import '../Uniswap/TransferHelper.sol';

contract FLETwammGauge is OwnedV2 {

    // Core
    IFxs public FXS = IFxs(0xFc00000000000000000000000000000000000002);
    IERC20 public otherToken;
    IFraxswapPair public fraxswapPair;
    address public operatorAddress;

    // Safety
    uint256 public maxSwapFxsAmtIn = 1000000e18; // 1M, mainly fat-finger precautions

    // Misc
    bool public isFxsToken0;
    uint256 public numTwammIntervals = 168; // 1 week. Each interval is default 3600 sec (1 hr)
    uint256 public swapPeriod = 7 * 86400; // 7 days

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrOperator() {
        require(msg.sender == owner || msg.sender == operatorAddress, "Not owner or operator");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _ownerAddress,
        address _operatorAddress,
        address _fraxswap_pair
    ) OwnedV2(_ownerAddress) {
        // Set operator
        operatorAddress = _operatorAddress;

        // Set instances
        fraxswapPair = IFraxswapPair(_fraxswap_pair);

        // Need to know which token FXS is (0 or 1)
        address _token0 = fraxswapPair.token0();
        if (_token0 == address(FXS)) {
            isFxsToken0 = true;
            otherToken = IERC20(fraxswapPair.token1());
        }
        else {
            isFxsToken0 = false;
            otherToken = IERC20(_token0);
        }

        // Get the number of TWAMM intervals. Truncation desired
        numTwammIntervals = swapPeriod / fraxswapPair.orderTimeInterval();
    }


    /* ========== MUTATIVE ========== */

    // Use the TWAMM
    function twammLongTermSwap(uint256 _fxsSellAmount) external onlyByOwnerOrOperator returns (uint256 _fxsToUse, uint256 new_order_id) {
        // Sell FXS for another asset
        // --------------------------------
        _fxsToUse = _fxsSellAmount;

        // Make sure input amount is nonzero
        require(_fxsToUse > 0, "FXS sold must be nonzero");

        // Safety check
        require(_fxsToUse <= maxSwapFxsAmtIn, "Too much FXS sold");

        // Approve FXS first
        FXS.approve(address(fraxswapPair), _fxsToUse);

        // Swap
        if (isFxsToken0) {
            new_order_id = fraxswapPair.longTermSwapFrom0To1(_fxsToUse, numTwammIntervals);
        }
        else {
            new_order_id = fraxswapPair.longTermSwapFrom1To0(_fxsToUse, numTwammIntervals);
        }

        emit SwapInitiated(new_order_id, _fxsToUse, block.timestamp);
    }

    function cancelTWAMMOrder(uint256 order_id, bool _send_to_msig) external onlyByOwnerOrOperator {
        // Cancel the order
        uint256 _amtOtherBefore = otherToken.balanceOf(address(this));
        uint256 _fxsBefore = FXS.balanceOf(address(this));
        fraxswapPair.cancelLongTermSwap(order_id);
        uint256 _otherCollected = otherToken.balanceOf(address(this)) - _amtOtherBefore;
        uint256 _fxsCollected = FXS.balanceOf(address(this)) - _fxsBefore;

        // Optionally send the collected otherToken to the msig
        if (_send_to_msig) TransferHelper.safeTransfer(address(otherToken), owner, _otherCollected);

        emit SwapCancelled(order_id, _fxsCollected, _otherCollected);
    }

    function collectCurrTWAMMProceeds(uint256 _order_id, bool _send_to_msig) external onlyByOwnerOrOperator {
        // Collect current proceeds.
        ( , , uint256 _otherCollected) = fraxswapPair.withdrawProceedsFromLongTermSwap(_order_id);

        // Optionally send the collected otherToken to the msig
        if (_send_to_msig) TransferHelper.safeTransfer(address(otherToken), owner, _otherCollected);

        emit SwapProceedsCollected(_order_id, _otherCollected);
    }

    // Send all otherToken to the msig
    function sendOtherTokenToMsig() external onlyByOwnerOrOperator {
        TransferHelper.safeTransfer(address(otherToken), owner, otherToken.balanceOf(address(this)));

    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setSwapPeriod(uint256 _swapPeriod) external onlyOwner {
        // Change the swap period
        swapPeriod = _swapPeriod;
        numTwammIntervals = _swapPeriod / fraxswapPair.orderTimeInterval();
    }

    function setTWAMMMaxSwapIn(uint256 _maxSwapFxsAmtIn) external onlyOwner {
        maxSwapFxsAmtIn = _maxSwapFxsAmtIn;
    }

    function setOperator(address _newOperatorAddress) external onlyOwner {
        operatorAddress = _newOperatorAddress;
    }


    // Added to support other mistaken tokens
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        // Only the owner address can ever receive the recovery withdrawal
        TransferHelper.safeTransfer(tokenAddress, owner, tokenAmount);
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */
    event RecoveredERC20(address token, uint256 amount);
    event SwapCancelled(uint256 order_id, uint256 recovered_fxs, uint256 other_token_amount);
    event SwapInitiated(uint256 order_id, uint256 fxs_amt, uint256 timestamp);
    event SwapProceedsCollected(uint256 order_id, uint256 other_token_amount);
}
