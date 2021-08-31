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
// ========================== FXS1559_AMO_V3 ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../Oracle/UniswapPairOracle.sol";
import '../Uniswap/TransferHelper.sol';
import '../Misc_AMOs/InvestorAMO_V3.sol';
import '../Uniswap/Interfaces/IUniswapV2Router02.sol';
import "../Proxy/Initializable.sol";
import "../Staking/Owned.sol";

contract FXS1559_AMO_V3 is Owned {
    using SafeMath for uint256;
    // Solidity ^8.0.0 automatically reverts on int256 underflows/overflows

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    InvestorAMO_V3 private InvestorAMO;
    IUniswapV2Router02 private UniRouterV2;
    IFraxAMOMinter private amo_minter;
    
    address private constant collateral_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public timelock_address;
    address public custodian_address;
    address private constant frax_address = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    address private constant fxs_address = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0;
    address public yield_distributor_address;
    address payable public constant UNISWAP_ROUTER_ADDRESS = payable(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address private constant investor_amo_address = 0xEE5825d5185a1D512706f9068E69146A54B6e076;
    address private constant investor_amo_v2_address = 0xB8315Af919729c823B2d996B1A6DDE381E7444f1;
    address public amo_minter_address;

    uint256 private missing_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;

    // FRAX -> FXS max slippage
    uint256 public max_slippage;

    // Burned vs given to yield distributor
    uint256 burn_fraction; // E6. Fraction of FXS burned vs transferred to the yield distributor

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _yield_distributor_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        owner = _owner_address;
        FRAX = FRAXStablecoin(frax_address);
        FXS = FRAXShares(fxs_address);
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        InvestorAMO = InvestorAMO_V3(investor_amo_v2_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        yield_distributor_address = _yield_distributor_address;
        
        // Initializations
        UniRouterV2 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        max_slippage = 200000; // 20%
        burn_fraction = 500000;

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    modifier onlyByMinter() {
        require(msg.sender == address(amo_minter), "Not minter");
        _;
    }

    /* ========== VIEWS ========== */

    function cr_info() public view returns (
            uint256 effective_collateral_ratio, 
            uint256 global_collateral_ratio, 
            uint256 excess_collateral_e18,
            uint256 frax_mintable
    ) {
        global_collateral_ratio = FRAX.global_collateral_ratio();

        uint256 frax_total_supply = FRAX.totalSupply();
        uint256 global_collat_value = FRAX.globalCollateralValue();
        effective_collateral_ratio = global_collat_value.mul(1e6).div(frax_total_supply); //returns it in 1e6

        // Same as availableExcessCollatDV() in FraxPool
        if (global_collateral_ratio > COLLATERAL_RATIO_PRECISION) global_collateral_ratio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 = (frax_total_supply.mul(global_collateral_ratio)).div(COLLATERAL_RATIO_PRECISION); // Calculates collateral needed to back each 1 FRAX with $1 of collateral at current collat ratio
        if (global_collat_value > required_collat_dollar_value_d18) {
            excess_collateral_e18 = global_collat_value.sub(required_collat_dollar_value_d18);
            frax_mintable = excess_collateral_e18.mul(COLLATERAL_RATIO_PRECISION).div(global_collateral_ratio);
        }
        else {
            excess_collateral_e18 = 0;
            frax_mintable = 0;
        }
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = 1e18;
        collat_val_e18 = 1e18;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function _swapFRAXforFXS(uint256 frax_amount) internal returns (uint256 frax_spent, uint256 fxs_received) {
        // Get the FXS price
        uint256 fxs_price = FRAX.fxs_price();

        // Approve the FRAX for the router
        FRAX.approve(UNISWAP_ROUTER_ADDRESS, frax_amount);

        address[] memory FRAX_FXS_PATH = new address[](2);
        FRAX_FXS_PATH[0] = frax_address;
        FRAX_FXS_PATH[1] = fxs_address;

        uint256 min_fxs_out = frax_amount.mul(PRICE_PRECISION).div(fxs_price);
        min_fxs_out = min_fxs_out.sub(min_fxs_out.mul(max_slippage).div(PRICE_PRECISION));

        // Buy some FXS with FRAX
        (uint[] memory amounts) = UniRouterV2.swapExactTokensForTokens(
            frax_amount,
            min_fxs_out,
            FRAX_FXS_PATH,
            address(this),
            2105300114 // Expiration: a long time from now
        );
        return (amounts[0], amounts[1]);
    }


    // Burn unneeded or excess FRAX
    function swapBurn(uint256 override_USDC_amount, bool use_override) public onlyByOwnGov {
        uint256 mintable_frax;
        if (use_override){
            mintable_frax = override_USDC_amount.mul(10 ** missing_decimals).mul(COLLATERAL_RATIO_PRECISION).div(FRAX.global_collateral_ratio());
        }
        else {
            (, , , mintable_frax) = cr_info();
        }

        (, uint256 fxs_received ) = _swapFRAXforFXS(mintable_frax);

        // Calculate the amount to burn vs give to the yield distributor
        uint256 amt_to_burn = fxs_received.mul(burn_fraction).div(PRICE_PRECISION);
        uint256 amt_to_yield_distributor = fxs_received.sub(amt_to_burn);

        // Burn some of the FXS
        burnFXS(amt_to_burn);

        // Give the rest to the yield distributor
        TransferHelper.safeTransfer(address(FXS), yield_distributor_address, amt_to_yield_distributor);
    }

    /* ========== Burns and givebacks ========== */

    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    // Burn unneeded FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGovCust {
        FXS.approve(address(amo_minter), fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setBurnFraction(uint256 _burn_fraction) external onlyByOwnGov {
        burn_fraction = _burn_fraction;
    }

    function setAMOMinter(address _amo_minter_address) external onlyByOwnGov {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Get the timelock address from the minter
        timelock_address = amo_minter.timelock_address();

        // Make sure the new address is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

    function setSafetyParams(uint256 _max_slippage) external onlyByOwnGov {
        max_slippage = _max_slippage;
    }

    function setYieldDistributor(address _yield_distributor_address) external onlyByOwnGov {
        yield_distributor_address = _yield_distributor_address;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }
}