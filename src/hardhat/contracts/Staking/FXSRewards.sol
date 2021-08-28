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
// =========================== FXSRewards =============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett
// Hameed

// This contract borrows FXS staked in the veFXS contract
// and mints FRAX against it according to a leverage ratio,
// buying USDC with half of the minted FRAX amount and farming
// the FRAX-3CRV metapool on curve.fi/frax.
// It returns the profits back to the veFXS stakers as yield
// through the FeeDistributor contract.


// TO-DO:
//
// Borrowing:
// * calculate FXS value stored in veFXS staking contract
// * mint FRAX against this value according to leverage ratio
// * buy USDC on Curve with half of the minted FRAX
//
// Farming:
// * deposit FRAX into yearn crvFRAX vault for ycrvFRAX LP tokens
//
// Collecting Rewards:
// * claim rewards from yearn vault
// * swap rewards for FXS
// * distribute FXS yields to users 

import "../Curve/IStableSwap3Pool.sol";
import "../Curve/IMetaImplementationUSD.sol";
import "../Curve/IveFXS.sol";
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../FXS/FXS.sol";
import "../Math/SafeMath.sol";
import "../Oracle/ChainlinkFXSUSDPriceConsumer.sol";

contract FXSRewards {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    IveFXS private veFXS;
    ERC20 private collateral_token;
    ERC20 private three_pool_erc20;
    IStableSwap3Pool private three_pool;
    IMetaImplementationUSD private frax3crv_metapool;
    ChainlinkFXSUSDPriceConsumer private fxs_usd_pricer;
    uint256 private fxs_usd_pricer_decimals;

    address public frax_contract_address;
    address public fxs_contract_address;
    address public collateral_token_address;
    address public owner_address;
    address public custodian_address;
    address public timelock_address;
    address public frax3crv_metapool_address;
    address public three_pool_address;
    address public three_pool_token_address;
    address public fxs_usd_consumer_address;

    uint256 public missing_decimals;

    // Tracks FRAX
    uint256 public minted_frax_historical;
    uint256 public burned_frax_historical;

    // Tracks collateral
    uint256 public swapped_collateral_historical;
    uint256 public returned_collateral_historical;

    // Max amount of FRAX outstanding the contract can mint from the FraxPool
    uint256 public max_frax_outstanding;

    // Minimum collateral ratio for new FRAX minting
    uint256 public min_cr = 850000;

    // 1 - max slippage for curve swap, in 1e6
    uint256 public curve_slippage = 990000;

    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _custodian_address,
        address _timelock_address,
        address _frax3crv_metapool_address,
        address _three_pool_address,
        address _three_pool_token_address,
        address _ve_fxs_address
    ) public {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXS = FRAXShares(_fxs_contract_address);
        veFXS = IveFXS(_ve_fxs_address);

        frax_contract_address = _frax_contract_address;
        fxs_contract_address = _fxs_contract_address;
        collateral_token_address = _collateral_address;
        collateral_token = ERC20(_collateral_address);
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        custodian_address = _custodian_address;
        frax3crv_metapool_address = _frax3crv_metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_frax3crv_metapool_address);
        three_pool_address = _three_pool_address;
        three_pool = IStableSwap3Pool(_three_pool_address);
        three_pool_token_address = _three_pool_token_address;
        three_pool_erc20 = ERC20(_three_pool_token_address);

        missing_decimals = uint(18).sub(collateral_token.decimals());
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "Must be owner or timelock");
        _;
    }

    /* ========== VIEWS ========== */

    function fxsDollarValueStaked() public view returns (uint256) {
        return FXS.balanceOf(address(veFXS)).mul(uint256(fxs_usd_pricer.getLatestPrice())).div(10 ** fxs_usd_pricer_decimals);
    }

    function collatDollarBalance() public pure returns (uint256) {
        return 1e18; // Anti-brick
    }

    // Returns ratio of minted FRAX against staked FXS, in 1e6
    function leverageRatio() public view returns (uint256) {
        return (minted_frax_historical.sub(burned_frax_historical)).mul(1e6).div(fxsDollarValueStaked());
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setFXSUSDOracle(address _fxs_usd_consumer_address) public onlyByOwnGov {
        fxs_usd_consumer_address = _fxs_usd_consumer_address;
        fxs_usd_pricer = ChainlinkFXSUSDPriceConsumer(fxs_usd_consumer_address);
        fxs_usd_pricer_decimals = fxs_usd_pricer.getDecimals(); // should be 8
    }

    // mint FRAX against staked FXS
    function _mintFRAX(uint256 frax_amount) internal {
        // Make sure the FRAX minting wouldn't push the CR down too much
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue());//.add(unspentInvestorAMOProfit_E18());
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(1e6)).div(new_frax_supply);
        require(new_cr > min_cr, "CR would be too low");

        // Mint the frax 
        minted_frax_historical = minted_frax_historical.add(frax_amount);
        FRAX.pool_mint(address(this), frax_amount);
    }

    // wrap the minting function
    function mintFrax(uint256 frax_amount) external onlyByOwnGov {
        _mintFRAX(frax_amount);
    }

    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.burn(frax_amount);
        burned_frax_historical = burned_frax_historical.add(frax_amount);
    }

    int128 FRAX_INDEX = 0;
    int128 USDC_INDEX = 2;
    // swap minted FRAX for collateral from curve pool, returns collateral amount received
    function swapCollateral(uint256 frax_amount) public onlyByOwnGov returns (uint256) {
        uint256 received_collat = frax3crv_metapool.exchange_underlying(FRAX_INDEX, USDC_INDEX, frax_amount, frax_amount.mul(curve_slippage).div(1e6));
        swapped_collateral_historical = swapped_collateral_historical.add(received_collat);
        return received_collat;
    }

    // swap collateral for FRAX, returns FRAX amount received
    function returnCollateral(uint256 collateral_amount) public onlyByOwnGov returns (uint256) {
        uint256 received_frax = frax3crv_metapool.exchange_underlying(USDC_INDEX, FRAX_INDEX, collateral_amount, collateral_amount.mul(curve_slippage).div(1e6));
        returned_collateral_historical = returned_collateral_historical.add(received_frax);
        return received_frax;
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnGov {
        min_cr = _min_cr;
    }

    /* ========== EVENTS ========== */
}