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
// ========================== CurveAMO_ARBI ===========================
// ====================================================================
// Uses Arbitrum Curve https://arbitrum.curve.fi/factory/9

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna


// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Jason Huan: https://github.com/jasonhuan
// Dennis: github.com/denett

import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol";
import "../../../ERC20/ERC20.sol";
import "../../../Bridges/Arbitrum/CrossChainBridgeBacker_ARBI_AnySwap.sol";
import "../../curve/IFRAX2pool.sol";
import "../../curve/I2poolGaugeDeposit.sol";
import "../../curve/I2pool.sol";
import "../../curve/IZapDepositor2pool.sol";
import '../../../Uniswap/TransferHelper.sol';
import "../../../Staking/Owned.sol";

contract CurveAMO_ARBI is Owned {
    /* ========== STATE VARIABLES ========== */

    // Core
    CrossChainCanonicalFRAX public canFRAX;
    ERC20 public USDC; // USDC: 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8
    ERC20 public USDT; // USDT: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
    CrossChainBridgeBacker_ARBI_AnySwap public cc_bridge_backer;

    // Pools
    IFRAX2pool public frax2pool; // 0xf07d553B195080F84F582e88ecdD54bAa122b279
    I2poolGaugeDeposit public two_pool_gauge; // 0xbF7E49483881C76487b0989CD7d9A8239B20CA41
    I2pool public two_pool; // 0x7f90122BF0700F9E7e1F688fe926940E8839F353
    IZapDepositor2pool public zap_depositor; // 0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287

    // Number of decimals under 18, for collateral token
    uint256 public usdc_missing_decimals;
    uint256 public usdt_missing_decimals;

    // Precision related
    uint256 public PRICE_PRECISION = 1e6;
    uint256 public VIRTUAL_PRICE_PRECISION = 1e18;

    // Min ratio of collat <-> 2pool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_2pool;

    // Min ratio of (FRAX + 2pool) <-> FRAX2pool metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public slippage_metapool;

    // Admins
    address public timelock_address;
    address public custodian_address;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner_address,
        address _custodian_address,
        address[4] memory _core_addresses, // 0: canFRAX, 1: USDC, 2: USDT, 3: CrossChainBridgeBacker
        address[4] memory _pool_addresses // 0: FRAX2pool, 1: I2poolGaugeDeposit, 2: I2pool, 3: IZapDepositor2pool
    ) Owned(_owner_address) {
        // Owner
        owner = _owner_address;

        // Core
        canFRAX = CrossChainCanonicalFRAX(_core_addresses[0]);
        USDC = ERC20(_core_addresses[1]);
        USDT = ERC20(_core_addresses[2]);
        usdc_missing_decimals = uint(18) - USDC.decimals();
        usdt_missing_decimals = uint(18) - USDT.decimals();
        cc_bridge_backer = CrossChainBridgeBacker_ARBI_AnySwap(_core_addresses[3]);

        // Pools
        frax2pool = IFRAX2pool(_pool_addresses[0]);
        two_pool_gauge = I2poolGaugeDeposit(_pool_addresses[1]);
        two_pool = I2pool(_pool_addresses[2]);
        zap_depositor = IZapDepositor2pool(_pool_addresses[3]);

        // Other variable initializations
        liq_slippage_2pool = 950000;
        slippage_metapool = 950000;

        // Set the custodian
        custodian_address = _custodian_address;

        // Get the timelock address from the minter
        timelock_address = cc_bridge_backer.timelock_address();
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[12] memory allocations) {
        // Get some LP token prices
        uint256 two_pool_price = two_pool.get_virtual_price();
        uint256 frax2pool_price = frax2pool.get_virtual_price();

        // FRAX
        allocations[0] = canFRAX.balanceOf(address(this)); // Free FRAX

        // USDC
        allocations[1] = USDC.balanceOf(address(this)); // Free USDC, native precision
        allocations[2] = (allocations[1] * (10 ** usdc_missing_decimals)); // Free USDC USD value

        // USDT
        allocations[3] = USDT.balanceOf(address(this)); // Free USDT, native precision
        allocations[4] = (allocations[3] * (10 ** usdt_missing_decimals)); // Free USDT USD value

        // 2pool Gauge Deposit
        allocations[5] = (two_pool_gauge.balanceOf(address(this))); // Free 2pool gauge
        allocations[6] = (allocations[5] * two_pool_price) / VIRTUAL_PRICE_PRECISION; // Free 2pool gauge USD value(1-to-1 conversion with 2pool)

        // 2pool
        allocations[7] = (two_pool.balanceOf(address(this))); // Free 2pool
        allocations[8] = (allocations[7] * two_pool_price) / VIRTUAL_PRICE_PRECISION; // Free 2pool USD value

        // FRAX2pool LP
        allocations[9] = (frax2pool.balanceOf(address(this))); // Free FRAX2pool
        allocations[10] = (allocations[9] * frax2pool_price) / VIRTUAL_PRICE_PRECISION; // Free FRAX2pool USD value

        // Total USD value
        allocations[11] = allocations[0] + allocations[2] + allocations[4] + allocations[6] + allocations[8] + allocations[10];
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        uint256[12] memory allocations = showAllocations();

        return(allocations[0], 0, allocations[1], allocations[11]);
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }

    function borrowed_collat() public view returns (uint256) {
        return cc_bridge_backer.collat_lent_balances(address(this));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function metapoolDeposit(uint256 _frax_amount, uint256 _usdc_amount, uint256 _usdt_amount) external onlyByOwnGov returns (uint256 metapool_LP_received) {
        // Approve the FRAX to be zapped
        if(_frax_amount > 0) {
            canFRAX.approve(address(zap_depositor), _frax_amount);
        }

        // Approve the USDC to be zapped
        if(_usdc_amount > 0) {
            USDC.approve(address(zap_depositor), _usdc_amount);
        }
        
        // Approve the USDT to be zapped
        if(_usdt_amount > 0) {
            USDT.approve(address(zap_depositor), _usdt_amount);
        }

        // Calculate the min LP out expected
        uint256 ttl_val_usd = _frax_amount + (_usdc_amount * (10 ** usdc_missing_decimals)) + (_usdt_amount * (10 ** usdt_missing_decimals));
        ttl_val_usd = (ttl_val_usd * VIRTUAL_PRICE_PRECISION) / frax2pool.get_virtual_price();
        uint256 min_3pool_out = (ttl_val_usd * liq_slippage_2pool) / PRICE_PRECISION;

        // Zap the token(s)
        metapool_LP_received = zap_depositor.add_liquidity(
            address(frax2pool), 
            [
                _frax_amount,
                _usdc_amount,
                _usdt_amount
            ], 
            min_3pool_out
        );
    }

    function _metapoolWithdrawOneCoin(uint256 _metapool_lp_in, int128 tkn_idx) internal returns (uint256 tokens_received) {
        // Approve the metapool LP tokens for zapper contract
        frax2pool.approve(address(zap_depositor), _metapool_lp_in);

        // Calculate the min FRAX out
        uint256 lp_usd_value = (_metapool_lp_in * VIRTUAL_PRICE_PRECISION) / frax2pool.get_virtual_price();
        uint256 min_tkn_out = (lp_usd_value * liq_slippage_2pool) / PRICE_PRECISION;

        // Handle different decimals
        if(tkn_idx == 1) min_tkn_out = min_tkn_out / (10 ** usdc_missing_decimals);
        else if(tkn_idx == 2) min_tkn_out = min_tkn_out / (10 ** usdt_missing_decimals);

        // Perform the liquidity swap
        tokens_received = zap_depositor.remove_liquidity_one_coin(
            address(frax2pool),
            _metapool_lp_in,
            tkn_idx,
            min_tkn_out
        );
    }

    function metapoolWithdrawFrax(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 0);
    }

    function metapoolWithdrawUsdc(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 1);
    }

    function metapoolWithdrawUsdt(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 2);
    }

    function metapoolWithdrawAtCurRatio(
        uint256 _metapool_lp_in, 
        uint256 min_frax, 
        uint256 min_usdc, 
        uint256 min_usdt
    ) external onlyByOwnGov returns (uint256 frax_received, uint256 usdc_received, uint256 usdt_received) {
        // Approve the metapool LP tokens for zapper contract
        frax2pool.approve(address(zap_depositor), _metapool_lp_in);

        // Withdraw FRAX, USDC, and USDT from the metapool at the current balance
        uint256[3] memory result_arr = zap_depositor.remove_liquidity(
            address(frax2pool), 
            _metapool_lp_in, 
            [min_frax, min_usdc, min_usdt]
        );
        frax_received = result_arr[0];
        usdc_received = result_arr[1];
        usdt_received = result_arr[2];
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwnGov {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(address(canFRAX), frax_amount, do_bridging);
    }

    function giveCollatBack(uint256 collat_amount, bool do_bridging) external onlyByOwnGov {
        USDC.approve(address(cc_bridge_backer), collat_amount);
        cc_bridge_backer.receiveBackViaAMO(address(USDC), collat_amount, do_bridging);
    }
   
    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setCCBridgeBacker(address _cc_bridge_backer_address) external onlyByOwnGov {
        cc_bridge_backer = CrossChainBridgeBacker_ARBI_AnySwap(_cc_bridge_backer_address);

        // Get the timelock addresses from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Make sure the new addresse is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

    function setSlippages(uint256 _liq_slippage_2pool, uint256 _slippage_metapool) external onlyByOwnGov {
        liq_slippage_2pool = _liq_slippage_2pool;
        slippage_metapool = _slippage_metapool;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }

    // Generic proxy
    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyByOwnGov returns (bool, bytes memory) {
       (bool success, bytes memory result) = _to.call{value:_value}(_data);
        return(success, result);
    }
}