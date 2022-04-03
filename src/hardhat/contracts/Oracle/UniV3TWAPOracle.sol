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
// ========================= UniV3TWAPOracle ==========================
// ====================================================================
// Wraps the in-built UniV3 pool's oracle with the Chainlink-style interface
// Outputs a price in 1e18

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)


import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "./AggregatorV3Interface.sol";
import "../Uniswap_V3/IUniswapV3Pool.sol";
import "../Uniswap_V3/periphery/libraries/OracleLibrary.sol";
import "../Staking/Owned.sol";

contract UniV3TWAPOracle is Owned {
    using SafeMath for uint256;

    // Core
    address public timelock_address;
    IUniswapV3Pool public pool;
    ERC20 public token0;
    ERC20 public token1;

    // AggregatorV3Interface stuff
    uint8 public decimals; // For Chainlink mocking
    string public description;
    uint256 public version = 1;

    // Misc
    uint32 public lookback_secs = 300; // 5 minutes
    bool public price_in_token0 = false; // can flip the order of the pricing

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _creator_address,
        address _timelock_address,
        address _pool_address,
        uint8 _decimals,
        string memory _description
    ) Owned(_creator_address) {
        timelock_address = _timelock_address;

        // Core
        pool = IUniswapV3Pool(_pool_address);
        token0 = ERC20(pool.token0());
        token1 = ERC20(pool.token1());

        // Make sure both are E18, until you fix this
        require ((token0.decimals() == 18) && (token1.decimals() == 18), 'Must both be 18 decs');

        // Chainlink mocking related
        decimals = _decimals;
        description = _description;
    }

    /* ========== VIEWS ========== */

    function token_symbols() external view returns (string memory base, string memory pricing) {
        if (price_in_token0) {
            base = token1.symbol();
            pricing = token0.symbol();
        }
        else {
            base = token0.symbol();
            pricing = token1.symbol();
        }
    }

    // In E18
    function getPrecisePrice() public view returns (uint256 amount_out) {
        // Get the average price tick first
        (int24 arithmeticMeanTick, ) = OracleLibrary.consult(address(pool), lookback_secs);

        // Get the quote for selling 1 unit of a token. Assumes 1e18 for both.
        if (price_in_token0) {
            amount_out = OracleLibrary.getQuoteAtTick(arithmeticMeanTick, 1e18, address(token1), address(token0));
        }
        else {
            amount_out = OracleLibrary.getQuoteAtTick(arithmeticMeanTick, 1e18, address(token0), address(token1));
        }
    }

    // In E6
    function getPrice() public view returns (uint256) {
        return getPrecisePrice() / 1e12;
    }

    // AggregatorV3Interface / Chainlink compatibility
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (0, int256(getPrecisePrice()), 0, block.timestamp, 0);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    // Convenience function
    function increaseObservationCardinality(uint16 _num_cardinals) external onlyByOwnGov {
        pool.increaseObservationCardinalityNext(_num_cardinals);
    }

    function setTWAPLookbackSec(uint32 _secs) external onlyByOwnGov {
        lookback_secs = _secs;
    }

    function toggleTokenForPricing() external onlyByOwnGov {
        price_in_token0 = !price_in_token0;
    }

}