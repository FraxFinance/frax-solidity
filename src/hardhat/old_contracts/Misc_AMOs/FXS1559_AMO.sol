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
// ============================ FXS1559_AMO ===========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../Frax/Pools/FraxPool.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Governance/AccessControl.sol";
import '../Misc_AMOs/FraxPoolInvestorForV2.sol';
import '../Uniswap/Interfaces/IUniswapV2Router02.sol';

contract FXS1559_AMO is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    FraxPoolInvestorForV2 private InvestorAMO;
    FraxPool private pool;
    IUniswapV2Router02 private UniRouterV2 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    
    address public collateral_address;
    address public pool_address;
    address public owner_address;
    address public timelock_address;
    address public custodian_address;
    address public frax_address;
    address public fxs_address;
    address payable public UNISWAP_ROUTER_ADDRESS = payable(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address public investor_amo_address = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    uint256 public immutable missing_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 850000;

    // Amount the contract borrowed
    uint256 public minted_sum_historical = 0;
    uint256 public burned_sum_historical = 0;

    // FRAX -> FXS max slippage
    uint256 public max_slippage = 200000; // 20%

    // AMO profits
    bool public override_amo_profits = false;
    uint256 public overridden_amo_profit = 0;

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _pool_address,
        address _collateral_address,
        address _owner_address,
        address _custodian_address,
        address _timelock_address,
        address _investor_amo_address
    ) {
        frax_address = _frax_contract_address;
        FRAX = FRAXStablecoin(_frax_contract_address);
        fxs_address = _fxs_contract_address;
        FXS = FRAXShares(_fxs_contract_address);
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
        collateral_address = _collateral_address;
        collateral_token = ERC20(_collateral_address);
        investor_amo_address = _investor_amo_address;
        InvestorAMO = FraxPoolInvestorForV2(_investor_amo_address);
        timelock_address = _timelock_address;
        owner_address = _owner_address;
        custodian_address = _custodian_address;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "Not owner or timelock");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian_address, "You are not the rewards custodian");
        _;
    }

    /* ========== VIEWS ========== */

    function unspentInvestorAMOProfit_E18() public view returns (uint256 unspent_profit_e18) {
        if (override_amo_profits){
            unspent_profit_e18 = overridden_amo_profit;
        }
        else {
            uint256[5] memory allocations = InvestorAMO.showAllocations();
            uint256 borrowed_USDC = InvestorAMO.borrowed_balance();
            unspent_profit_e18 = (allocations[4]).sub(borrowed_USDC);
            unspent_profit_e18 = unspent_profit_e18.mul(10 ** missing_decimals);
        }
    }

    function cr_info() public view returns (
            uint256 effective_collateral_ratio, 
            uint256 global_collateral_ratio, 
            uint256 excess_collateral_e18,
            uint256 frax_mintable
    ) {
        global_collateral_ratio = FRAX.global_collateral_ratio();

        uint256 frax_total_supply = FRAX.totalSupply();
        uint256 global_collat_value = (FRAX.globalCollateralValue()).add(unspentInvestorAMOProfit_E18());
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

    // Needed for the Frax contract to not brick when this contract is added as a pool
    function collatDollarBalance() public pure returns (uint256) {
        return 1e18; // Anti-brick
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function _mintFRAXForSwap(uint256 frax_amount) internal {
        // Make sure the current CR isn't already too low
        require(FRAX.global_collateral_ratio() > min_cr, "CR already too low");

        // Make sure the FRAX minting wouldn't push the CR down too much
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue()).add(unspentInvestorAMOProfit_E18());
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
        require(new_cr > min_cr, "CR would be too low");

        // Mint the frax 
        minted_sum_historical = minted_sum_historical.add(frax_amount);
        FRAX.pool_mint(address(this), frax_amount);
    }


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
            block.timestamp + 604800 // Expiration: 7 days from now
        );
        return (amounts[0], amounts[1]);
    }


    // Burn unneeded or excess FRAX
    function mintSwapBurn(uint256 override_USDC_amount, bool use_override) public onlyByOwnGov {
        uint256 mintable_frax;
        if (use_override){
            mintable_frax = override_USDC_amount.mul(10 ** missing_decimals).mul(COLLATERAL_RATIO_PRECISION).div(FRAX.global_collateral_ratio());
        }
        else {
            (, , , mintable_frax) = cr_info();
        }
        _mintFRAXForSwap(mintable_frax);
        (, uint256 fxs_received_ ) = _swapFRAXforFXS(mintable_frax);
        burnFXS(fxs_received_);
    }

    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.burn(frax_amount);
        burned_sum_historical = burned_sum_historical.add(frax_amount);
    }

    // Burn unneeded FXS
    function burnFXS(uint256 amount) public onlyByOwnGov {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnGov {
        owner_address = _owner_address;
    }

    function setPool(address _pool_address) external onlyByOwnGov {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnGov {
        min_cr = _min_cr;
    }

    function setMaxSlippage(uint256 _max_slippage) external onlyByOwnGov {
        max_slippage = _max_slippage;
    }

    function setAMOProfits(uint256 _overridden_amo_profit_e18, bool _override_amo_profits) external onlyByOwnGov {
        overridden_amo_profit = _overridden_amo_profit_e18; // E18
        override_amo_profits = _override_amo_profits;
    }

    function setRouter(address payable _router_address) external onlyByOwnGov {
        UNISWAP_ROUTER_ADDRESS = _router_address;
        UniRouterV2 = IUniswapV2Router02(_router_address);
    }

    function setInvestorAMO(address _investor_amo_address) external onlyByOwnGov {
        investor_amo_address = _investor_amo_address;
        InvestorAMO = FraxPoolInvestorForV2(_investor_amo_address);
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        ERC20(tokenAddress).transfer(custodian_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }


    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);
}