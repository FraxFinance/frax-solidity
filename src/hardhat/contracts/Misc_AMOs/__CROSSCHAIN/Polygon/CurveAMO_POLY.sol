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
// ========================== CurveAMO_POLY ===========================
// ====================================================================
// Uses Polygon Curve: https://polygon.curve.fi/factory/11

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna


// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Jason Huan: https://github.com/jasonhuan
// Dennis: github.com/denett

import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol";
import "../../../ERC20/ERC20.sol";
import "../../../Bridges/Polygon/CrossChainBridgeBacker_POLY_MaticBridge.sol";
import "../../curve/IFRAX3pool.sol";
import "../../curve/I3poolGaugeDeposit.sol";
import "../../curve/I3poolToken.sol";
import "../../curve/I3pool.sol";
import "../../curve/IZapDepositor3pool.sol";
import '../../../Uniswap/TransferHelper.sol';
import "../../../Staking/Owned.sol";

contract CurveAMO_POLY is Owned {
    /* ========== STATE VARIABLES ========== */

    // Core
    CrossChainCanonicalFRAX public canFRAX;
    ERC20 public DAI; // DAI: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
    ERC20 public USDC; // USDC: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
    ERC20 public USDT; // USDT: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
    CrossChainBridgeBacker_POLY_MaticBridge public cc_bridge_backer;

    // Pools
    IFRAX3pool public frax3pool; // 0x5e5A23b52Cb48F5E70271Be83079cA5bC9c9e9ac
    I3pool public am3crv_pool; // 0x445FE580eF8d70FF569aB36e80c647af338db351
    I3poolToken public am3crv_token; // 0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171
    I3poolGaugeDeposit public am3crv_gauge; // 0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c
    IZapDepositor3pool public zap_depositor; // 0x5ab5C56B9db92Ba45a0B46a207286cD83C15C939

    // Number of decimals under 18, for collateral token
    uint256 public dai_missing_decimals;
    uint256 public usdc_missing_decimals;
    uint256 public usdt_missing_decimals;

    // Precision related
    uint256 public PRICE_PRECISION = 1e6;
    uint256 public VIRTUAL_PRICE_PRECISION = 1e18;

    // Min ratio of collat <-> 3pool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_3pool;

    // Min ratio of(FRAX + 3CRV) <-> FRAX3CRV-f-2 metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public slippage_metapool;

    // Admins
    address public timelock_address;
    address public custodian_address;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner_address,
        address _custodian_address,
        address[5] memory _core_addresses, // 0: canFRAX, 1: DAI, 2: USDC, 3: USDT, 4: CrossChainBridgeBacker
        address[5] memory _pool_addresses // 0: IFRAX3pool, 1: I3pool, 2: I3poolToken, 3: I3poolGaugeDeposit, 4: IZapDepositor3pool
    ) Owned(_owner_address) {
        // Owner
        owner = _owner_address;

        // Core
        canFRAX = CrossChainCanonicalFRAX(_core_addresses[0]);
        DAI = ERC20(_core_addresses[1]);
        USDC = ERC20(_core_addresses[2]);
        USDT = ERC20(_core_addresses[3]);
        dai_missing_decimals = uint(18) - DAI.decimals();
        usdc_missing_decimals = uint(18) - USDC.decimals();
        usdt_missing_decimals = uint(18) - USDT.decimals();
        cc_bridge_backer = CrossChainBridgeBacker_POLY_MaticBridge(_core_addresses[4]);

        // Pools
        frax3pool = IFRAX3pool(_pool_addresses[0]);
        am3crv_pool = I3pool(_pool_addresses[1]);
        am3crv_token = I3poolToken(_pool_addresses[2]);
        am3crv_gauge = I3poolGaugeDeposit(_pool_addresses[3]);
        zap_depositor = IZapDepositor3pool(_pool_addresses[4]);

        // Other variable initializations
        liq_slippage_3pool = 950000;
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

    function showAllocations() public view returns (uint256[14] memory allocations) {
        // Get some LP token prices
        uint256 am3crv_price = am3crv_pool.get_virtual_price();
        uint256 frax3pool_price = frax3pool.get_virtual_price();

        // FRAX
        allocations[0] = canFRAX.balanceOf(address(this)); // Free FRAX

        // DAI
        allocations[1] = DAI.balanceOf(address(this)); // Free DAI, native precision
        allocations[2] = (allocations[1] * (10 ** dai_missing_decimals)); // Free DAI USD value

        // USDC
        allocations[3] = USDC.balanceOf(address(this)); // Free USDC, native precision
        allocations[4] = (allocations[3] * (10 ** usdc_missing_decimals)); // Free USDC USD value

        // USDT
        allocations[5] = USDT.balanceOf(address(this)); // Free USDT, native precision
        allocations[6] = (allocations[5] * (10 ** usdt_missing_decimals)); // Free USDT USD value

        // 3poolGaugeDeposit
        allocations[7] = (am3crv_gauge.balanceOf(address(this))); // Free 3pool gauge
        allocations[8] = (allocations[7] * am3crv_price) / VIRTUAL_PRICE_PRECISION; // Free 3pool gauge USD value (1-to-1 conversion with 2pool)

        // 3pool
        allocations[9] = (am3crv_token.balanceOf(address(this))); // Free 3pool
        allocations[10] = (allocations[9] * am3crv_price) / VIRTUAL_PRICE_PRECISION; // Free 3pool USD value

        // FRAX3pool LP
        allocations[11] = (frax3pool.balanceOf(address(this))); // Free FRAX3pool
        allocations[12] = (allocations[11] * frax3pool_price) / VIRTUAL_PRICE_PRECISION; // Free FRAX3pool USD value

        // Total USD value
        allocations[13] = allocations[0] + allocations[2] + allocations[4] + allocations[6] + allocations[8] + allocations[10] + allocations[12];
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        uint256[14] memory allocations = showAllocations();

        return(allocations[0], 0, allocations[3], allocations[13]);
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }

    function borrowed_collat() public view returns (uint256) {
        return cc_bridge_backer.collat_lent_balances(address(this));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function metapoolDeposit(
        uint256 _frax_amount, 
        uint256 _dai_amount, 
        uint256 _usdc_amount, 
        uint256 _usdt_amount
    ) external onlyByOwnGov returns (uint256 metapool_LP_received) {
        // Approve the FRAX to be zapped
        if(_frax_amount > 0) {
            canFRAX.approve(address(zap_depositor), _frax_amount);
        }

        // Approve the DAI to be zapped
        if(_dai_amount > 0) {
            DAI.approve(address(zap_depositor), _dai_amount);
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
        uint256 ttl_val_usd = _frax_amount 
                                + (_dai_amount * (10 ** dai_missing_decimals)) 
                                + (_usdc_amount * (10 ** usdc_missing_decimals)) 
                                + (_usdt_amount * (10 ** usdt_missing_decimals));
        ttl_val_usd = (ttl_val_usd * VIRTUAL_PRICE_PRECISION) / frax3pool.get_virtual_price();
        uint256 min_3pool_out = (ttl_val_usd * liq_slippage_3pool) / PRICE_PRECISION;

        // Zap the token(s)
        metapool_LP_received = zap_depositor.add_liquidity(
            address(frax3pool), 
            [
                _frax_amount,
                _dai_amount,
                _usdc_amount,
                _usdt_amount
            ], 
            min_3pool_out
        );
    }

    function _metapoolWithdrawOneCoin(uint256 _metapool_lp_in, int128 tkn_idx) internal returns (uint256 tokens_received) {
        // Approve the metapool LP tokens for zapper contract
        frax3pool.approve(address(zap_depositor), _metapool_lp_in);

        // Calculate the min FRAX out
        uint256 lp_usd_value = (_metapool_lp_in * VIRTUAL_PRICE_PRECISION) / frax3pool.get_virtual_price();
        uint256 min_tkn_out = (lp_usd_value * liq_slippage_3pool) / PRICE_PRECISION;

        // Handle different decimals
        if(tkn_idx == 1) min_tkn_out = min_tkn_out / (10 ** dai_missing_decimals);
        else if(tkn_idx == 2) min_tkn_out = min_tkn_out / (10 ** usdc_missing_decimals);
        else if(tkn_idx == 3) min_tkn_out = min_tkn_out / (10 ** usdt_missing_decimals);

        // Perform the liquidity swap
        tokens_received = zap_depositor.remove_liquidity_one_coin(
            address(frax3pool),
            _metapool_lp_in,
            tkn_idx,
            min_tkn_out
        );
    }

    function metapoolWithdrawFrax(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 0);
    }

    function metapoolWithdrawDai(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 1);
    }

    function metapoolWithdrawUsdc(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 2);
    }

    function metapoolWithdrawUsdt(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256) {
        return _metapoolWithdrawOneCoin(_metapool_lp_in, 3);
    }

    function metapoolWithdrawAtCurRatio(
        uint256 _metapool_lp_in, 
        uint256 min_frax, 
        uint256 min_dai, 
        uint256 min_usdc, 
        uint256 min_usdt
    ) external onlyByOwnGov returns (uint256 frax_received, uint256 dai_received, uint256 usdc_received, uint256 usdt_received) {
        // Approve the metapool LP tokens for zapper contract
        frax3pool.approve(address(zap_depositor), _metapool_lp_in);

        // Withdraw FRAX, USDC, and USDT from the metapool at the current balance
        uint256[4] memory result_arr = zap_depositor.remove_liquidity(
            address(frax3pool), 
            _metapool_lp_in, 
            [min_frax, min_dai, min_usdc, min_usdt]
        );
        frax_received = result_arr[0];
        dai_received = result_arr[1];
        usdc_received = result_arr[2];
        usdt_received = result_arr[3];
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
        cc_bridge_backer = CrossChainBridgeBacker_POLY_MaticBridge(_cc_bridge_backer_address);

        // Get the timelock addresses from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Make sure the new addresse is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

    function setSlippages(uint256 _liq_slippage_3pool, uint256 _slippage_metapool) external onlyByOwnGov {
        liq_slippage_3pool = _liq_slippage_3pool;
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