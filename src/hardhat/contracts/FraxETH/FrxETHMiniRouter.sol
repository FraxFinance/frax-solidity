pragma solidity >=0.8.0;

import "./IfrxETH.sol";
import "./IfrxETHMinter.sol";
import "./IsfrxETH.sol";
import "./IsfrxETH.sol";
import "../Curve/ICurvefrxETHETHPool.sol";

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================= FrxETHMiniRouter =========================
// ====================================================================
// Routes ETH -> frxETH and ETH -> sfrxETH via the minter or via Curve, depending on pricing

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna


contract FrxETHMiniRouter  {
    /* ========== STATE VARIABLES ========== */
    IfrxETH public frxETH = IfrxETH(0x5E8422345238F34275888049021821E8E08CAa1f);
    IfrxETHMinter public minter = IfrxETHMinter(0xbAFA44EFE7901E04E39Dad13167D089C559c1138);
    IsfrxETH public sfrxETH = IsfrxETH(0xac3E018457B222d93114458476f3E3416Abbe38F);
    ICurvefrxETHETHPool public pool = ICurvefrxETHETHPool(0xa1F8A6807c402E4A15ef4EBa36528A3FED24E577);

    /* ========== CONSTRUCTOR ========== */
    constructor() {
        // Nothing
    }

    /* ========== VIEWS ========== */

    // Get the prices and estimated frxETH out amounts
    function getFrxETHRoutePricesAndOuts(uint256 eth_in) public view returns (
        uint256 minter_price, 
        uint256 minter_out, 
        uint256 curve_price,
        uint256 curve_out,
        bool use_curve // false: Minter, true: Curve
    ) {
        // Minter prices are fixed
        minter_price = 1e18;
        minter_out = eth_in;

        // Get the Curve info
        curve_price = pool.price_oracle();
        curve_out = pool.get_dy(0, 1, eth_in);

        // Use Curve if you get more frxEth out
        use_curve = (curve_out >= minter_out);
    }

    // Get the prices and estimated frxETH out amounts
    function sendETH(
        address recipient, 
        bool get_sfrxeth_instead, 
        uint256 min_frxeth_out
    ) external payable returns (
        uint256 frxeth_used, 
        uint256 frxeth_out,
        uint256 sfrxeth_out
    ) {
        // First see which route to take
        (, , , , bool use_curve) = getFrxETHRoutePricesAndOuts(msg.value);

        // Take different routes for frxETH depending on pricing
        if (use_curve) {
            frxeth_used = pool.exchange{ value: msg.value }(0, 1, msg.value, min_frxeth_out);
        }
        else {
            minter.submit{ value: msg.value }();
            frxeth_used = msg.value;
        }

        // Convert the frxETH to sfrxETH if the user specified it
        if (get_sfrxeth_instead) {
            // Approve frxETH to sfrxETH for staking
            frxETH.approve(address(sfrxETH), msg.value);

            // Deposit the frxETH and give the generated sfrxETH to the final recipient
            sfrxeth_out = sfrxETH.deposit(msg.value, recipient);
            require(sfrxeth_out > 0, 'No sfrxETH was returned');

            emit ETHToSfrxETH(msg.sender, recipient, use_curve, msg.value, frxeth_used, sfrxeth_out);
        } else {
            // Set the frxETH out to the frxETH used
            frxeth_out = frxeth_used;

            // Give the frxETH to the recipient
            frxETH.transfer(recipient, frxeth_out);

            emit ETHToFrxETH(msg.sender, recipient, use_curve, msg.value, frxeth_out);
        }
    }

    /* ========== EVENTS ========== */
    event ETHToFrxETH(address indexed from, address indexed recipient, bool curve_used, uint256 eth_in, uint256 frxeth_out);
    event ETHToSfrxETH(address indexed from, address indexed recipient, bool curve_used, uint256 amt_in, uint256 frxeth_used, uint256 sfrxeth_out);
}