// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================= CurveAMO =============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian

import "./IStableSwap3Pool.sol";
import "./IMetaImplementationUSD.sol";
import "./ILiquidityGauge.sol";
import "./IMinter.sol";
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../FXS/FXS.sol";
import "../Math/SafeMath.sol";

contract CurveAMO is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    IMetaImplementationUSD private frax3crv_metapool;
    IStableSwap3Pool private three_pool;
    ILiquidityGauge private gauge_frax3crv;
    IMinter private crv_minter;
    ERC20 private three_pool_erc20;
    FRAXStablecoin private FRAX;
    FraxPool private pool;
    FRAXShares private FXS;
    ERC20 private collateral_token;
    ERC20 private CRV = ERC20(0xD533a949740bb3306d119CC777fa900bA034cd52);

    address public frax3crv_metapool_address;
    address public three_pool_address;
    address public three_pool_token_address;
    address public gauge_3crv_address;
    address public crv_minter_address;
    address public frax_contract_address;
    address public fxs_contract_address;
    address public collateral_token_address;
    address public timelock_address;
    address public owner_address;
    address public custodian_address;
    address public pool_address;

    // Tracks FRAX
    uint256 public minted_frax_historical = 0;
    uint256 public burned_frax_historical = 0;

    // Max amount of FRAX outstanding the contract can mint from the FraxPool
    uint256 public max_frax_outstanding = uint256(2000000e18);
    
    // Tracks collateral
    uint256 public borrowed_collat_historical = 0;
    uint256 public returned_collat_historical = 0;

    // Max amount of collateral the contract can borrow from the FraxPool
    uint256 public collat_borrow_cap = uint256(20000e6);

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 850000;

    // Number of decimals under 18, for collateral token
    uint256 private missing_decimals;

    // Precision related
    uint256 private constant PRICE_PRECISION = 1e6;

    // Minimum acceptable ratio in terms of collateral deposited to LP tokens received for 3CRV add_liquidity; 1e6
    uint256 public add_liq_slippage_3crv = 900000;

    // Minimum acceptable ratio in terms of FRAX + 3CRV deposited to LP tokens received for FRAX3CRV-f metapool add_liquidity; 1e6
    uint256 public add_liq_slippage_metapool = 900000;

    // 3pool collateral index
    int128 public THREE_POOL_COIN_INDEX = 1;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _custodian_address,
        address _timelock_address
    ) public {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXS = FRAXShares(_fxs_contract_address);
        frax_contract_address = _frax_contract_address;
        fxs_contract_address = _fxs_contract_address;
        collateral_token = ERC20(_collateral_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        custodian_address = _custodian_address;

        missing_decimals = uint(18).sub(collateral_token.decimals());
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian_address, "You are not the rewards custodian");
        _;
    }

    /* ========== VIEWS ========== */

    function showAllocations() external view returns (uint256[9] memory allocations) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if any one of the functions below fail

        // Get collateral info
        uint256[4] memory collat_info = collatDollarBalanceExtended();

        uint256 frax_withdrawable = (collat_info[0]).mul(FRAX.global_collateral_ratio()).mul(FRAX.balanceOf(frax3crv_metapool_address)).div(collat_info[1]).div(uint(1e6));

        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        allocations[1] = frax_withdrawable; // FRAX withdrawable from the metapool LP
        allocations[2] = collateral_token.balanceOf(address(this)); // Free collateral
        allocations[3] = collat_info[3]; // Collateral withdrawable from the metapool LP
        allocations[4] = freeCRV(); // Free CRV
        allocations[5] = 0; // TODO: Staked CRV

        uint256 sum_frax = allocations[0];
        sum_frax = sum_frax.add(allocations[1]);
        allocations[6] = sum_frax; // Total FRAX possessed in various forms

        uint256 sum_collat = allocations[2];
        sum_collat = sum_collat.add(allocations[3]);
        allocations[7] = sum_collat; // Total Collateral possessed in various forms

        uint256 sum_crv = allocations[4];
        sum_crv = sum_crv.add(allocations[5]);
        allocations[8] = sum_crv; // Total CRV possessed in various forms


    }

    function collatDollarBalanceExtended() public view returns (uint256[4] memory return_arr) {
        // ------------LP Balance------------
        // Free LP
        uint256 lp_owned = frax3crv_metapool.balanceOf(address(this));

        // Staked in the gauge
        // TODO
        lp_owned = lp_owned.add(gauge_frax3crv.balanceOf(address(this)));

        // ------------3pool Withdrawable------------
        // Linear approximation of metapool withdrawable amounts at floor price (global_collateral_ratio)
        // TODO: Need to recreate metapool get_D() logic to simulate what would happen if FRAX price went to CR
        // threeCRV_withdrawable
        uint256 frax3crv_supply = frax3crv_metapool.totalSupply();

        uint256 _3pool_withdrawable;
        if (frax3crv_supply > 0) {
            _3pool_withdrawable = lp_owned.mul(FRAX.global_collateral_ratio()).mul(three_pool_erc20.balanceOf(frax3crv_metapool_address)).div(frax3crv_supply).div(uint(1e6));
        }
        else _3pool_withdrawable = 0;
         
        // ------------Collateral Balance------------
        // Free Collateral
        uint256 usdc_owned = collateral_token.balanceOf(address(this));

        // Returns amount of USDC withdrawable if the contract redeemed all of its 3pool tokens from the base 3pool for USDC,
        // with the 3pool coming from FRAX3CRV-f-2 remove_liquidity()
        usdc_owned = usdc_owned.add(three_pool.calc_withdraw_one_coin(_3pool_withdrawable, 1));

        // // Placeholder; can be used for CR calculations - up to the AMO design
        // // frax_withdrawable
        // return_arr[2] = return_arr[0].mul(uint(1e6)).mul(FRAX.balanceOf(frax3crv_metapool_address)).div(frax3crv_metapool.totalSupply()).div(FRAX.global_collateral_ratio());
        
        return [lp_owned, frax3crv_supply, _3pool_withdrawable, usdc_owned];
    }

    function collatDollarBalance() public view returns (uint256) {
        uint256[4] memory collat_info = collatDollarBalanceExtended();
        return (collat_info[3] * (10 ** missing_decimals));
    }

    function get_D() public view returns (uint256) {
        // Setting up constants
        uint256 _A = frax3crv_metapool.A_precise();
        uint256 A_PRECISION = 100;
        uint256[2] memory _xp = [three_pool_erc20.balanceOf(frax3crv_metapool_address), FRAX.balanceOf(frax3crv_metapool_address)];

        uint256 N_COINS = 2;
        uint256 S;
        for(uint i = 0; i < N_COINS; i++){
            S += _xp[i];
        }
        if(S == 0){
            return 0;
        }
        uint256 D = S;
        uint256 Ann = N_COINS * _A;
        
        uint256 Dprev = 0;
        uint256 D_P;
        // Iteratively converge upon D
        for(uint i = 0; i < 256; i++){
            D_P = D;
            for(uint j = 0; j < N_COINS; j++){
                D_P = D * D / (_xp[j] * N_COINS);
            }
            Dprev = D;
            D = (Ann * S / A_PRECISION + D_P * N_COINS) * D / ((Ann - A_PRECISION) * D / A_PRECISION + (N_COINS + 1) * D_P);

            // Check if iteration has converged
            if(D > Dprev){
                if(D - Dprev <= 1){
                    return D;
                }
            } else {
                if(Dprev - D <= 1){
                    return D;
                }
            }
        }

        // Placeholder, in case it does not converge (should do so within <= 4 rounds)
        // TODO: consider changing this to return a safe value that won't brick everything if it is reached
        revert("Convergence not reached");
    }

    // TESTING PURPOSES ONLY – WILL BE REMOVED
    function get_D_and_iterations() public view returns (uint256, uint256) {
        // Setting up constants
        uint256 _A = frax3crv_metapool.A_precise();
        uint256 A_PRECISION = 100;
        uint256[2] memory _xp = [three_pool_erc20.balanceOf(frax3crv_metapool_address), FRAX.balanceOf(frax3crv_metapool_address)];

        uint256 N_COINS = 2;
        uint256 S;
        for(uint i = 0; i < N_COINS; i++){
            S += _xp[i];
        }
        if(S == 0){
            return (0, 0);
        }
        uint256 D = S;
        uint256 Ann = N_COINS * _A;
        
        uint256 Dprev = 0;
        uint256 D_P;
        // Iteratively converge upon D
        for(uint i = 0; i < 256; i++){
            D_P = D;
            for(uint j = 0; j < N_COINS; j++){
                D_P = D * D / (_xp[j] * N_COINS);
            }
            Dprev = D;
            D = (Ann * S / A_PRECISION + D_P * N_COINS) * D / ((Ann - A_PRECISION) * D / A_PRECISION + (N_COINS + 1) * D_P);

            // Check if iteration has converged
            if(D > Dprev){
                if(D - Dprev <= 1){
                    return (D, i);
                }
            } else {
                if(Dprev - D <= 1){
                    return (D, i);
                }
            }
        }

        revert("Convergence not reached");
    }

    // returns hypothetical reserves of metapool if the FRAX price went to the CR,
    // assuming no removal of liquidity from the metapool.

    // I will add safemath later, currently still need ease of reading regular operations
    uint256 public convergence_window = 1e15; // 1/10th of a cent, TODO: add a setter
    function iterate() public view returns (uint256, uint256, uint256) {
        uint256 frax_balance = FRAX.balanceOf(frax3crv_metapool_address);
        uint256 crv3_balance = three_pool_erc20.balanceOf(frax3crv_metapool_address);

        // 3crv is usually slightly above $1 due to collecting 3pool swap fees
        uint256 one_dollar_3crv = uint(1e18).div(three_pool.get_virtual_price());

        uint256 floor_price_frax = uint(1e18).mul(FRAX.global_collateral_ratio()).div(1e6);
        
        uint256 frax_received;
        for(uint i = 0; i < 256; i++){
            // how much FRAX received for $1 worth of 3CRV
            frax_received = frax3crv_metapool.get_dy(1, 0, one_dollar_3crv, [frax_balance, crv3_balance]);
            if(frax_received <= floor_price_frax + convergence_window){
                return (frax_balance, crv3_balance, i);
            } else if (frax_received + convergence_window <= floor_price_frax){ // if overshot
                return (frax_balance, crv3_balance, i);
            }
            uint256 frax_to_swap = frax_balance / 10;
            crv3_balance = crv3_balance - frax3crv_metapool.get_dy(0, 1, frax_to_swap, [frax_balance, crv3_balance]);
            frax_balance = frax_balance + frax_to_swap;
        }
        revert("Didn't find hypothetical point on curve within 256 rounds");
    }

    // In FRAX
    function fraxBalance() public view returns (uint256) {
        if (minted_frax_historical >= burned_frax_historical) return minted_frax_historical.sub(burned_frax_historical);
        else return 0;
    }

    // In collateral
    function collateralBalance() public view returns (uint256) {
        if (borrowed_collat_historical >= returned_collat_historical) return borrowed_collat_historical.sub(returned_collat_historical);
        else return 0;
    }

    // Amount of FRAX3CRV deposited in the gauge contract
    function metapoolLPInGauge() public view returns (uint256){
        return gauge_frax3crv.balanceOf(address(this));
    }

    // This function is problematic because it can be either a view or non-view
    // // Amount of CRV rewards mintable / claimable
    // function claimableCRV() public view returns (uint256){
    //     return gauge_frax3crv.claimable_tokens(address(this));
    //     // return 0;
    // }

    // Amount of CRV in the contract
    function freeCRV() public view returns (uint256){
        return CRV.balanceOf(address(this));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // This is basically a workaround to transfer USDC from the FraxPool to this investor contract
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called separately later on
    function mintRedeemPart1(uint256 frax_amount) public onlyByOwnerOrGovernance {
        //require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
        uint256 redemption_fee = pool.redemption_fee();
        uint256 col_price_usd = pool.getCollateralPrice();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(redemption_fee))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(global_collateral_ratio).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(col_price_usd);

        require(collateralBalance().add(expected_collat_amount) <= collat_borrow_cap, "Borrow cap reached");
        borrowed_collat_historical = borrowed_collat_historical.add(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() public onlyByOwnerOrGovernance {
        pool.collectRedemption();
    }

    // Give USDC profits back
    function giveCollatBack(uint256 amount) public onlyByOwnerOrGovernance {
        collateral_token.transfer(address(pool), amount);
        returned_collat_historical = returned_collat_historical.add(amount);
    }
   
    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 frax_amount) public onlyByOwnerOrGovernance {
        FRAX.burn(frax_amount);
        burned_frax_historical = burned_frax_historical.add(frax_amount);
    }
   
    function burnFXS(uint256 amount) public onlyByOwnerOrGovernance {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    function metapoolDeposit(uint256 _frax_amount, uint256 _collateral_amount) public onlyByOwnerOrGovernance returns (uint256 metapool_LP_received) {
        // Mint the FRAX component
        FRAX.pool_mint(address(this), _frax_amount);
        minted_frax_historical = minted_frax_historical.add(_frax_amount);
        require(fraxBalance() <= max_frax_outstanding, "Too much FRAX would be minted [max_frax_outstanding reached]");

        // Approve the collateral to be added to 3pool
        collateral_token.approve(address(three_pool), _collateral_amount);

        // Convert collateral into 3pool
        uint256[3] memory three_pool_collaterals;
        three_pool_collaterals[uint256(THREE_POOL_COIN_INDEX)] = _collateral_amount;
        three_pool.add_liquidity(three_pool_collaterals, 0);

        // Approve the 3pool for the metapool
        uint threeCRV_received = three_pool_erc20.balanceOf(address(this));
        three_pool_erc20.approve(frax3crv_metapool_address, threeCRV_received);

        // Approve the FRAX for the metapool
        FRAX.approve(frax3crv_metapool_address, _frax_amount);

        // Add the FRAX and the collateral to the metapool
        metapool_LP_received = frax3crv_metapool.add_liquidity([_frax_amount, threeCRV_received], 0);

        // Make sure the collateral ratio did not fall too much
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue()).mul(10 ** missing_decimals);
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(cur_frax_supply);
        require (new_cr >= min_cr, "Minting caused the collateral ratio to be too low");
        
        return metapool_LP_received;
    }

    function metapoolWithdraw(uint256 _metapool_lp_in, bool burn_the_frax) public onlyByOwnerOrGovernance returns (uint256 frax_received) {
        // // Approve the metapool LP tokens for the metapool contract
        // frax3crv_metapool.approve(address(this), _metapool_lp_in);

        // Withdraw FRAX and 3pool from the metapool
        uint256[2] memory min_amounts;
        uint256[2] memory result_arr = frax3crv_metapool.remove_liquidity(_metapool_lp_in, min_amounts);
        frax_received = result_arr[0];
        uint256 three_pool_received = result_arr[1];

        // Convert the 3pool into the collateral
        three_pool_erc20.approve(address(three_pool), three_pool_received);
        three_pool.remove_liquidity_one_coin(three_pool_received, THREE_POOL_COIN_INDEX, 0);

        // Optionally burn the FRAX
        if (burn_the_frax){
            burnFRAX(frax_received);
        }
        
    }

    // Deposit Metapool LP tokens into the Curve DAO for gauge rewards, if any
    function depositToGauge(uint256 _metapool_lp_in) public onlyByOwnerOrGovernance {
        // Approve the metapool LP tokens for the gauge contract
        frax3crv_metapool.approve(address(gauge_frax3crv), _metapool_lp_in);
        
        // Deposit the metapool LP into the gauge contract
        gauge_frax3crv.deposit(_metapool_lp_in);
    }

    // Withdraw Metapool LP from Curve DAO back to this contract
    function withdrawFromGauge(uint256 _metapool_lp_out) public onlyByOwnerOrGovernance {
        gauge_frax3crv.withdraw(_metapool_lp_out);
    }

    // Retrieve CRV gauge rewards, if any
    function collectCRVFromGauge() public onlyByOwnerOrGovernance {
        crv_minter.mint(address(this));
    }

    /* ========== Custodian ========== */

    // NOTE: The custodian_address can be set to the governance contract to be used as
    // a mega-voter or sorts. The CRV here can be converted to veCRV and then used to vote
    function withdrawCRVRewards() public onlyCustodian {
        CRV.transfer(custodian_address, CRV.balanceOf(address(this)));
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setMiscRewardsCustodian(address _custodian_address) external onlyByOwnerOrGovernance {
        custodian_address = _custodian_address;
    }

    function setPool(address _pool_address) external onlyByOwnerOrGovernance {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setThreePool(address _three_pool_address, address _three_pool_token_address) external onlyByOwnerOrGovernance {
        three_pool_address = _three_pool_address;
        three_pool = IStableSwap3Pool(_three_pool_address);
        three_pool_token_address = _three_pool_token_address;
        three_pool_erc20 = ERC20(_three_pool_token_address);
    }

    function setMetapool(address _metapool_address) public onlyByOwnerOrGovernance {
        frax3crv_metapool_address = _metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_metapool_address);
    }

    function setGauge(address _gauge_3crv_address) public onlyByOwnerOrGovernance {
        gauge_3crv_address = _gauge_3crv_address;
        gauge_frax3crv = ILiquidityGauge(_gauge_3crv_address);

        // Set the minter too
        crv_minter_address = gauge_frax3crv.minter();
        crv_minter = IMinter(crv_minter_address);
    }

    function setCollatBorrowCap(uint256 _collat_borrow_cap) external onlyByOwnerOrGovernance {
        collat_borrow_cap = _collat_borrow_cap;
    }

    function setMaxFraxOutstanding(uint256 _max_frax_outstanding) external onlyByOwnerOrGovernance {
        max_frax_outstanding = _max_frax_outstanding;
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnerOrGovernance {
        min_cr = _min_cr;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        ERC20(tokenAddress).transfer(custodian_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);

}