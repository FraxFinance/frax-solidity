// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =================== ComboOracle_KyberSwapElastic ===================
// ====================================================================
// Aggregates KyberSwapElastic NFTs (similar to UniV3)
// Unofficial repo: https://github.com/0xamogh/kyberswap_elastic

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian

import "./AggregatorV3Interface.sol";
import "../ERC20/ERC20.sol";
import "../Staking/Owned.sol";

// ComboOracle
import "../Oracle/ComboOracle.sol";

// KyberSwap Elastic (similar to UniV3)
import "../Misc_AMOs/kyberswap/factory/IKyberFactory.sol";
import "../Misc_AMOs/kyberswap/KyberTickMath.sol";
import "../Uniswap_V3/libraries/LiquidityAmounts.sol";
import "../Misc_AMOs/kyberswap/position_manager/IAntiSnipAttackPositionManager.sol";
import "../Misc_AMOs/kyberswap/pool/IKyberPool.sol";
import "../Misc_AMOs/kyberswap/router/IRouter.sol";
import "../Misc_AMOs/kyberswap/position_manager/ITickFeesReader.sol";

contract ComboOracle_KyberSwapElastic is Owned {
    using SafeMath for uint256;
    
    /* ========== STATE VARIABLES ========== */
    
    // Core addresses
    address timelock_address;

    // Oracle info
    ComboOracle public combo_oracle;

    // KyberSwap Elastic
    IKyberFactory public kyber_factory;
    IAntiSnipAttackPositionManager public kyber_positions_mgr;
    IRouter public kyber_router;
    ITickFeesReader public kyber_tick_fees_reader;

    // Precision
    uint256 public PRECISE_PRICE_PRECISION = 1e18;
    uint256 public PRICE_PRECISION = 1e6;
    uint256 public PRICE_MISSING_MULTIPLIER = 1e12;

    /* ========== STRUCTS ========== */

    // ------------ KyberSwap Elastic ------------

    struct NFTBasicInfo {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint256 token0_decimals; 
        uint256 token1_decimals; 
        uint256 lowest_decimals; 
    }

    struct NFTValueInfo {
        uint256 token0_value;
        uint256 token1_value;
        uint256 total_value;
        string token0_symbol;
        string token1_symbol;
        uint256 liquidity_price;
    }
    
    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        address[] memory _starting_addresses
    ) Owned(_owner_address) {
        // Oracle info
        combo_oracle = ComboOracle(_starting_addresses[0]);

        // KyberSwap Elastic
        // https://docs.kyberswap.com/contract/deployment
        kyber_factory = IKyberFactory(_starting_addresses[1]);
        kyber_positions_mgr = IAntiSnipAttackPositionManager(_starting_addresses[2]);
        kyber_router = IRouter(_starting_addresses[3]);
        kyber_tick_fees_reader = ITickFeesReader(_starting_addresses[4]);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "You are not an owner or the governance timelock");
        _;
    }

    /* ========== VIEWS ========== */

    function getNFTBasicInfo(uint256 token_id) public view returns (NFTBasicInfo memory) {
        // Get the position information
        ( 
            IAntiSnipAttackPositionManager.Position memory pos, 
            IAntiSnipAttackPositionManager.PoolInfo memory info
        ) = kyber_positions_mgr.positions(token_id);

        // Get decimals
        uint256 tkn0_dec = ERC20(info.token0).decimals();
        uint256 tkn1_dec = ERC20(info.token1).decimals();

        return NFTBasicInfo(
            info.token0, // [0]
            info.token1, // [1]
            info.fee, // [2]
            pos.tickLower, // [3]
            pos.tickUpper, // [4]
            pos.liquidity, // [5]
            tkn0_dec,  // [6]
            tkn1_dec,  // [7]
            (tkn0_dec < tkn1_dec) ? tkn0_dec : tkn1_dec // [8]
        );
    }

    // Get stats about a particular NFT
    function getNFTValueInfo(uint256 token_id) public view returns (NFTValueInfo memory) {
        NFTBasicInfo memory lp_basic_info = getNFTBasicInfo(token_id);

        // Get pool price info
        uint160 sqrtPriceX96;
        {
            address pool_address = kyber_factory.getPool(lp_basic_info.token0, lp_basic_info.token1, lp_basic_info.fee);
            IKyberPool the_pool = IKyberPool(pool_address);
            (sqrtPriceX96, , , ) = the_pool.getPoolState();
        }

        // Tick math
        uint256 token0_val_usd = 0;
        uint256 token1_val_usd = 0; 
        {
            // Get the amount of each underlying token in each NFT
            uint160 sqrtRatioAX96 = KyberTickMath.getSqrtRatioAtTick(lp_basic_info.tickLower);
            uint160 sqrtRatioBX96 = KyberTickMath.getSqrtRatioAtTick(lp_basic_info.tickUpper);

            // Get amount of each token for 0.1% liquidity movement in each direction (1 per mille)
            uint256 liq_pricing_divisor = (10 ** lp_basic_info.lowest_decimals);
            (uint256 token0_1pm_amt, uint256 token1_1pm_amt) = LiquidityAmounts.getAmountsForLiquidity(sqrtPriceX96, sqrtRatioAX96, sqrtRatioBX96, uint128(lp_basic_info.liquidity / liq_pricing_divisor));

            // Get missing decimals
            uint256 token0_miss_dec_mult = 10 ** (uint(18) - lp_basic_info.token0_decimals);
            uint256 token1_miss_dec_mult = 10 ** (uint(18) - lp_basic_info.token1_decimals);

            // Get token prices
            // Will revert if ComboOracle doesn't have a price for both token0 and token1
            (uint256 token0_precise_price, , ) = combo_oracle.getTokenPrice(lp_basic_info.token0);
            (uint256 token1_precise_price, , ) = combo_oracle.getTokenPrice(lp_basic_info.token1);

            // Get the value of each portion
            // Multiply by liq_pricing_divisor as well
            token0_val_usd = (token0_1pm_amt * liq_pricing_divisor * token0_precise_price * token0_miss_dec_mult) / PRECISE_PRICE_PRECISION;
            token1_val_usd = (token1_1pm_amt * liq_pricing_divisor * token1_precise_price * token1_miss_dec_mult) / PRECISE_PRICE_PRECISION;
        }

        // Return the total value of the UniV3 NFT
        uint256 nft_ttl_val = (token0_val_usd + token1_val_usd);

        // Return
        return NFTValueInfo(
            token0_val_usd,
            token1_val_usd,
            nft_ttl_val,
            ERC20(lp_basic_info.token0).symbol(),
            ERC20(lp_basic_info.token1).symbol(),
            (uint256(lp_basic_info.liquidity) * PRECISE_PRICE_PRECISION) / nft_ttl_val
        );
    }

    function getFeeCollectionMulticallPayload(
        uint256 token_id, 
        address tkn0_addr, 
        address tkn1_addr, 
        uint24 fee, 
        address dest_addr
    ) external view returns (bytes[] memory multicall_payloads, uint256 tk0_owed, uint256 tk1_owed, bool has_rewards) {
        address pool_address = kyber_factory.getPool(tkn0_addr, tkn1_addr, fee);
        (tk0_owed, tk1_owed) = kyber_tick_fees_reader.getTotalFeesOwedToPosition(address(kyber_positions_mgr), pool_address, token_id);

        // Will return an empty payload array unless there is actually something to collect
        has_rewards = ((tk0_owed + tk1_owed) > 0);
        if (has_rewards) {
            multicall_payloads = new bytes[](4);
            multicall_payloads[0] = abi.encodeWithSignature(
                "removeLiquidity(uint256,uint128,uint256,uint256,uint256)", 
                token_id, 
                1, 
                0,
                0,
                7289575165 // Year 2200
            );
            multicall_payloads[1] = abi.encodeWithSignature(
                "burnRTokens(uint256,uint256,uint256,uint256)", 
                token_id, 
                0, 
                0,
                7289575165 // Year 2200
            );
            multicall_payloads[2] = abi.encodeWithSignature(
                "transferAllTokens(address,uint256,address)", 
                tkn0_addr, 
                tk0_owed, 
                dest_addr
            );
            multicall_payloads[3] = abi.encodeWithSignature(
                "transferAllTokens(address,uint256,address)", 
                tkn1_addr, 
                tk1_owed, 
                dest_addr
            );
        }
        else {
            multicall_payloads = new bytes[](0);
        }
    }

    function checkKyberElasticNFT(uint256 seed_nft_id, uint256 test_nft_id) external view returns (uint256 liquidity, int24 tick_lower, int24 tick_upper) {
        // Get the seed NFT info
        ( 
            IAntiSnipAttackPositionManager.Position memory pos_seed, 
            IAntiSnipAttackPositionManager.PoolInfo memory info_seed
        ) = kyber_positions_mgr.positions(seed_nft_id);
        
        // Get the test NFT info
        ( 
            IAntiSnipAttackPositionManager.Position memory pos_test, 
            IAntiSnipAttackPositionManager.PoolInfo memory info_test
        ) = kyber_positions_mgr.positions(test_nft_id);

        // Set initially
        liquidity = pos_test.liquidity;

        // Do the checks
        if (
            (info_test.token0 == info_seed.token0) && 
            (info_test.token1 == info_seed.token1) && 
            (info_test.fee == info_seed.fee) && 
            (pos_test.tickLower == pos_seed.tickLower) && 
            (pos_test.tickUpper == pos_seed.tickUpper)
        ) {
            // Do nothing
        }
        else {
            revert("Wrong token characteristics");
        }
        return (liquidity, pos_test.tickLower, pos_test.tickUpper);
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address _timelock_address) external onlyByOwnGov {
        timelock_address = _timelock_address;
    }

    function setComboOracle(address _combo_oracle) external onlyByOwnGov {
        combo_oracle = ComboOracle(_combo_oracle);
    }

    function setMiscAddrs(
        address _factory, 
        address _positions_nft_manager, 
        address _router,
        address _tick_fees_reader
    ) external onlyByOwnGov {
        // KyberSwap Elastic
        kyber_factory = IKyberFactory(_factory);
        kyber_positions_mgr = IAntiSnipAttackPositionManager(_positions_nft_manager);
        kyber_router = IRouter(_router);
        kyber_tick_fees_reader = ITickFeesReader(_tick_fees_reader);
    }
}
