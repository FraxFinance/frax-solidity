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
import "../FXS/IFxs.sol";
import "../ERC20/ERC20.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../Frax/Pools/FraxPoolV3.sol";
import "../Oracle/UniswapPairOracle.sol";
import '../Uniswap/TransferHelper.sol';
import '../Uniswap/Interfaces/IUniswapV2Router02.sol';
import "../Proxy/Initializable.sol";
import "../Staking/Owned.sol";
import "../Staking/veFXSYieldDistributorV4.sol";

contract FXS1559_AMO_V3 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    IFrax private FRAX;
    IFxs private FXS;
    IUniswapV2Router02 private UniRouterV2;
    IFraxAMOMinter public amo_minter;
    FraxPoolV3 public pool = FraxPoolV3(0x2fE065e6FFEf9ac95ab39E5042744d695F560729);
    veFXSYieldDistributorV4 public yieldDistributor;
    
    address private constant collateral_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public timelock_address;
    address public custodian_address;
    address private constant frax_address = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    address private constant fxs_address = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0;
    address payable public constant UNISWAP_ROUTER_ADDRESS = payable(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address public amo_minter_address;

    uint256 private missing_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;

    // FRAX -> FXS max slippage
    uint256 public max_slippage;

    // Burned vs given to yield distributor
    uint256 public burn_fraction; // E6. Fraction of FXS burned vs transferred to the yield distributor

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _yield_distributor_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        owner = _owner_address;
        FRAX = IFrax(frax_address);
        FXS = IFxs(fxs_address);
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        yieldDistributor = veFXSYieldDistributorV4(_yield_distributor_address);
        
        // Initializations
        UniRouterV2 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        max_slippage = 50000; // 5%
        burn_fraction = 0; // Give all to veFXS initially

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

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = FRAX.balanceOf(address(this));
        collat_val_e18 = frax_val_e18.mul(COLLATERAL_RATIO_PRECISION).div(FRAX.global_collateral_ratio());
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function _swapFRAXforFXS(uint256 frax_amount) internal returns (uint256 frax_spent, uint256 fxs_received) {
        // Get the FXS price
        uint256 fxs_price = pool.getFXSPrice(); 

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
    function swapBurn(uint256 override_frax_amount, bool use_override) public onlyByOwnGov {
        uint256 mintable_frax;
        if (use_override){
            // mintable_frax = override_USDC_amount.mul(10 ** missing_decimals).mul(COLLATERAL_RATIO_PRECISION).div(FRAX.global_collateral_ratio());
            mintable_frax = override_frax_amount;
        }
        else {
            mintable_frax = pool.buybackAvailableCollat();
        }

        (, uint256 fxs_received ) = _swapFRAXforFXS(mintable_frax);

        // Calculate the amount to burn vs give to the yield distributor
        uint256 amt_to_burn = fxs_received.mul(burn_fraction).div(PRICE_PRECISION);
        uint256 amt_to_yield_distributor = fxs_received.sub(amt_to_burn);

        // Burn some of the FXS
        burnFXS(amt_to_burn);

        // Give the rest to the yield distributor
        FXS.approve(address(yieldDistributor), amt_to_yield_distributor);
        yieldDistributor.notifyRewardAmount(amt_to_yield_distributor);
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

    function setFraxPool(address _frax_pool_address) external onlyByOwnGov {
        pool = FraxPoolV3(_frax_pool_address);
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
        yieldDistributor = veFXSYieldDistributorV4(_yield_distributor_address);
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }

    // Generic proxy
    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyByOwnGov returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value:_value}(_data);
        return (success, result);
    }
}