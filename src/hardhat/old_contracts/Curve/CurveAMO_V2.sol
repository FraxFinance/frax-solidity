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
// ============================ CurveAMO_V2 ===========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

// NOTE: You can get boosted rewards on your FRAX3CRV liquidity 
// https://resources.curve.fi/guides/boosting-your-crv-rewards
// This requires a veCRV / voting logic, which is beyond the scope of this AMO
// Voting logic is also constantly changing, and having fixed code for it is not desireable
// Therefore, CRV rewards and FRAX3CRV will be 'loaned' to the voter contract (can be the timelock in the future)
// which has delegateCall and universal function-calling 
// in this manner, the LP-boosted CRV rewards can be captured, rather than non-boosted LP CRV rewards

import "./IStableSwap3Pool.sol";
import "./IMetaImplementationUSD.sol";
import "./ILiquidityGaugeV2.sol";
import "./IMinter.sol";
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../FXS/FXS.sol";
import "../Math/SafeMath.sol";
import "../Proxy/Initializable.sol";

contract CurveAMO_V2 is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    IMetaImplementationUSD private frax3crv_metapool;
    IStableSwap3Pool private three_pool;
    ILiquidityGaugeV2 private gauge_frax3crv;
    ERC20 private three_pool_erc20;
    FRAXStablecoin private FRAX;
    FraxPool private pool;
    ERC20 private collateral_token;

    address private three_pool_address;
    address private three_pool_token_address;
    address private fxs_contract_address;
    address private collateral_token_address;
    address private crv_address;

    address public frax3crv_metapool_address;
    address public gauge_frax3crv_address;
    address public timelock_address;
    address public owner_address;
    address public custodian_address;
    address public pool_address;
    address public voter_contract_address; // FRAX3CRV and CRV will be sent here for veCRV voting, locked LP boosts, etc

    // Tracks FRAX
    uint256 public minted_frax_historical;
    uint256 public burned_frax_historical;

    // Max amount of FRAX outstanding the contract can mint from the FraxPool
    uint256 public max_frax_outstanding;
    
    // Tracks collateral
    uint256 public borrowed_collat_historical;
    uint256 public returned_collat_historical;

    // Max amount of collateral the contract can borrow from the FraxPool
    uint256 public collat_borrow_cap;

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr;

    // Number of decimals under 18, for collateral token
    uint256 private missing_decimals;

    // Precision related
    uint256 private PRICE_PRECISION;

    // Min ratio of collat <-> 3crv conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_3crv;

    // Min ratio of (FRAX + 3CRV) <-> FRAX3CRV-f-2 metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public add_liq_slippage_metapool;
    uint256 public rem_liq_slippage_metapool;

    // Convergence window
    uint256 public convergence_window; // 1 cent

    // Default will use global_collateral_ratio()
    bool public custom_floor;    
    uint256 public frax_floor;

    // Discount
    bool public set_discount;
    uint256 public discount_rate;

    // Collateral balance related
    bool public override_collat_balance;
    uint256 public override_collat_balance_amount;

    /* ========== CONSTRUCTOR ========== */

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
        address _pool_address,
        address _gauge_frax3crv_address
    ) {
        FRAX = FRAXStablecoin(_frax_contract_address);
        fxs_contract_address = _fxs_contract_address;
        collateral_token_address = _collateral_address;
        collateral_token = ERC20(_collateral_address);
        crv_address = 0xD533a949740bb3306d119CC777fa900bA034cd52;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        custodian_address = _custodian_address;
        voter_contract_address = _custodian_address; // Default to the custodian
        
        frax3crv_metapool_address = _frax3crv_metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_frax3crv_metapool_address);
        three_pool_address = _three_pool_address;
        three_pool = IStableSwap3Pool(_three_pool_address);
        three_pool_token_address = _three_pool_token_address;
        three_pool_erc20 = ERC20(_three_pool_token_address);
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);

        gauge_frax3crv_address = _gauge_frax3crv_address;
        gauge_frax3crv = ILiquidityGaugeV2(_gauge_frax3crv_address);

        // Other variable initializations
        minted_frax_historical = 0;
        burned_frax_historical = 0;
        max_frax_outstanding = uint256(2000000e18);
        borrowed_collat_historical = 0;
        returned_collat_historical = 0;
        collat_borrow_cap = uint256(1000000e6);
        min_cr = 850000;
        PRICE_PRECISION = 1e6;
        liq_slippage_3crv = 800000;
        add_liq_slippage_metapool = 950000;
        rem_liq_slippage_metapool = 950000;
        convergence_window = 1e16;
        custom_floor = false;  
        set_discount = false;
        override_collat_balance = false;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "Must be owner or timelock");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian_address, "Must be rewards custodian");
        _;
    }

    modifier onlyCustodianOrVoter() {
        require(msg.sender == custodian_address || msg.sender == voter_contract_address, "Must be rewards custodian or the voter contract");
        _;
    }

    // modifier onlyVoter() {
    //     require(msg.sender == voter_contract_address, "Must be voter contract");
    //     _;
    // }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[12] memory return_arr) {
        // ------------LP Balance------------
        // Lent to the voter contract
        uint256 lp_lent_to_voter = lentFRAX3CRV();

        // Free LP
        uint256 lp_owned = (frax3crv_metapool.balanceOf(address(this))).add(lp_lent_to_voter);

        // Staked in the gauge
        uint256 lp_in_gauge = gauge_frax3crv.balanceOf(address(this));
        lp_owned = lp_owned.add(lp_in_gauge);

        // ------------3pool Withdrawable------------
        // Uses iterate() to get metapool withdrawable amounts at FRAX floor price (global_collateral_ratio)
        uint256 frax3crv_supply = frax3crv_metapool.totalSupply();

        uint256 frax_withdrawable;
        uint256 _3pool_withdrawable;
        (frax_withdrawable, _3pool_withdrawable, ) = iterate();
        if (frax3crv_supply > 0) {
            _3pool_withdrawable = _3pool_withdrawable.mul(lp_owned).div(frax3crv_supply);
            frax_withdrawable = frax_withdrawable.mul(lp_owned).div(frax3crv_supply);
        }
        else _3pool_withdrawable = 0;
         
        // ------------Frax Balance------------
        // Frax sums
        uint256 frax_in_contract = FRAX.balanceOf(address(this));

        // ------------Collateral Balance------------
        // Free Collateral
        uint256 usdc_in_contract = collateral_token.balanceOf(address(this));

        // Returns the dollar value withdrawable of USDC if the contract redeemed its 3CRV from the metapool; assume 1 USDC = $1
        uint256 usdc_withdrawable = _3pool_withdrawable.mul(three_pool.get_virtual_price()).div(1e18).div(10 ** missing_decimals);

        // USDC subtotal assuming FRAX drops to the CR and all reserves are arbed
        uint256 usdc_subtotal = usdc_in_contract.add(usdc_withdrawable);

        return [
            frax_in_contract, // [0]
            frax_withdrawable, // [1]
            frax_withdrawable.add(frax_in_contract), // [2]
            usdc_in_contract, // [3]
            usdc_withdrawable, // [4]
            usdc_subtotal, // [5]
            usdc_subtotal + (frax_in_contract.add(frax_withdrawable)).mul(fraxDiscountRate()).div(1e6 * (10 ** missing_decimals)), // [6] USDC Total
            lp_owned, // [7]
            frax3crv_supply, // [8]
            _3pool_withdrawable, // [9]
            lp_in_gauge, // [10]
            lp_lent_to_voter // [11]
        ];
    }

    function collatDollarBalance() public view returns (uint256) {
        if(override_collat_balance){
            return override_collat_balance_amount;
        }
        return (showAllocations()[6] * (10 ** missing_decimals));
    }

    // function get_D() public view returns (uint256) {
    //     // Setting up constants
    //     uint256 A_PRECISION = 100;
    //     uint256[2] memory _xp = [three_pool_erc20.balanceOf(frax3crv_metapool_address), FRAX.balanceOf(frax3crv_metapool_address)];

    //     uint256 N_COINS = 2;
    //     uint256 S;
    //     for(uint i = 0; i < N_COINS; i++){
    //         S += _xp[i];
    //     }
    //     if(S == 0){
    //         return 0;
    //     }
    //     uint256 D = S;
    //     uint256 Ann = N_COINS * frax3crv_metapool.A_precise();
        
    //     uint256 Dprev = 0;
    //     uint256 D_P;
    //     // Iteratively converge upon D
    //     for(uint i = 0; i < 256; i++){
    //         D_P = D;
    //         for(uint j = 0; j < N_COINS; j++){
    //             D_P = D * D / (_xp[j] * N_COINS);
    //         }
    //         Dprev = D;
    //         D = (Ann * S / A_PRECISION + D_P * N_COINS) * D / ((Ann - A_PRECISION) * D / A_PRECISION + (N_COINS + 1) * D_P);

    //         // Check if iteration has converged
    //         if(D > Dprev){
    //             if(D - Dprev <= 1){
    //                 return D;
    //             }
    //         } else {
    //             if(Dprev - D <= 1){
    //                 return D;
    //             }
    //         }
    //     }

    //     // Placeholder, in case it does not converge (should do so within <= 4 rounds)
    //     revert("Convergence not reached");
    // }

    // Returns hypothetical reserves of metapool if the FRAX price went to the CR,
    // assuming no removal of liquidity from the metapool.
    function iterate() public view returns (uint256, uint256, uint256) {
        uint256 frax_balance = FRAX.balanceOf(frax3crv_metapool_address);
        uint256 crv3_balance = three_pool_erc20.balanceOf(frax3crv_metapool_address);

        uint256 floor_price_frax = uint(1e18).mul(fraxFloor()).div(1e6);
        
        uint256 crv3_received;
        uint256 dollar_value; // 3crv is usually slightly above $1 due to collecting 3pool swap fees
        uint256 virtual_price = three_pool.get_virtual_price();
        for(uint i = 0; i < 256; i++){
            crv3_received = frax3crv_metapool.get_dy(0, 1, 1e18, [frax_balance, crv3_balance]);
            dollar_value = crv3_received.mul(1e18).div(virtual_price);
            if(dollar_value <= floor_price_frax.add(convergence_window)){
                return (frax_balance, crv3_balance, i);
            }
            uint256 frax_to_swap = frax_balance.div(10);
            crv3_balance = crv3_balance.sub(frax3crv_metapool.get_dy(0, 1, frax_to_swap, [frax_balance, crv3_balance]));
            frax_balance = frax_balance.add(frax_to_swap);
        }
        revert("No hypothetical point"); // in 256 rounds
    }

    function fraxFloor() public view returns (uint256) {
        if(custom_floor){
            return frax_floor;
        } else {
            return FRAX.global_collateral_ratio();
        }
    }

    function fraxDiscountRate() public view returns (uint256) {
        if(set_discount){
            return discount_rate;
        } else {
            return FRAX.global_collateral_ratio();
        }
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

    // FRAX3CRV lent to the voter contract
    function lentFRAX3CRV() public view returns (uint256) {
        return frax3crv_metapool.balanceOf(voter_contract_address);
    }

    // REMOVED FOR CONTRACT SIZE CONSIDERATIONS 
    // // Amount of FRAX3CRV deposited in the gauge contract
    // function metapoolLPInGauge() public view returns (uint256) {
    //     return gauge_frax3crv.balanceOf(address(this));
    // }

    // REMOVED FOR CONTRACT SIZE CONSIDERATIONS 
    // // This function is problematic because it can be either a view or non-view
    // // The self._checkpoint(addr) call inside of it is mutative...
    // // Amount of CRV rewards mintable / claimable
    // function claimableCRV() public view returns (uint256) {
    //     // Have to manually replicate the formula inside of LiquidityGaugeV2.vy
    //     // otherwise, it would just be this: return gauge_frax3crv.claimable_tokens(address(this));
    //     uint256 integrate_fraction = gauge_frax3crv.integrate_fraction(address(this));
    //     uint256 other_side = IMinter(gauge_frax3crv.minter()).minted(address(this), gauge_frax3crv_address);
    //     return integrate_fraction.sub(other_side);
    // }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function mintRedeemPart1(uint256 frax_amount) external onlyByOwnGov {
        //require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
        uint256 redemption_fee = pool.redemption_fee();
        uint256 col_price_usd = pool.getCollateralPrice();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(redemption_fee))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(global_collateral_ratio).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(col_price_usd);

        require(collateralBalance().add(expected_collat_amount) <= collat_borrow_cap, "Borrow cap");
        borrowed_collat_historical = borrowed_collat_historical.add(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() external onlyByOwnGov {
        pool.collectRedemption();
    }

    // Give USDC profits back
    function giveCollatBack(uint256 amount) external onlyByOwnGov {
        collateral_token.transfer(address(pool), amount);
        returned_collat_historical = returned_collat_historical.add(amount);
    }
   
    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.burn(frax_amount);
        burned_frax_historical = burned_frax_historical.add(frax_amount);
    }
   
    function burnFXS(uint256 amount) public onlyByOwnGov {
        FRAXShares(fxs_contract_address).approve(address(this), amount);
        FRAXShares(fxs_contract_address).pool_burn_from(address(this), amount);
    }

    function metapoolDeposit(uint256 _frax_amount, uint256 _collateral_amount) external onlyByOwnGov returns (uint256 metapool_LP_received) {
        // Mint the FRAX component
        FRAX.pool_mint(address(this), _frax_amount);
        minted_frax_historical = minted_frax_historical.add(_frax_amount);
        require(fraxBalance() <= max_frax_outstanding, "max_frax_outstanding reached");

        uint256 threeCRV_received = 0;
        if (_collateral_amount > 0) {
            // Approve the collateral to be added to 3pool
            collateral_token.approve(address(three_pool), _collateral_amount);

            // Convert collateral into 3pool
            uint256[3] memory three_pool_collaterals;
            three_pool_collaterals[1] = _collateral_amount;
            {
                uint256 min_3pool_out = (_collateral_amount * (10 ** missing_decimals)).mul(liq_slippage_3crv).div(PRICE_PRECISION);
                three_pool.add_liquidity(three_pool_collaterals, min_3pool_out);
            }

            // Approve the 3pool for the metapool
            threeCRV_received = three_pool_erc20.balanceOf(address(this));

            // WEIRD ISSUE: NEED TO DO three_pool_erc20.approve(address(three_pool), 0); first before every time
            // May be related to https://github.com/vyperlang/vyper/blob/3e1ff1eb327e9017c5758e24db4bdf66bbfae371/examples/tokens/ERC20.vy#L85
            three_pool_erc20.approve(frax3crv_metapool_address, 0);
            three_pool_erc20.approve(frax3crv_metapool_address, threeCRV_received);
        }
        
        // Approve the FRAX for the metapool
        FRAX.approve(frax3crv_metapool_address, _frax_amount);

        {
            // Add the FRAX and the collateral to the metapool
            uint256 min_lp_out = (_frax_amount.add(threeCRV_received)).mul(add_liq_slippage_metapool).div(PRICE_PRECISION);
            metapool_LP_received = frax3crv_metapool.add_liquidity([_frax_amount, threeCRV_received], min_lp_out);
        }

        // Make sure the collateral ratio did not fall too much
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue()).mul(10 ** missing_decimals);
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(cur_frax_supply);
        require(new_cr >= min_cr, "CR would be too low");
        
        return metapool_LP_received;
    }

    function metapoolWithdrawAtCurRatio(uint256 _metapool_lp_in, bool burn_the_frax, uint256 min_frax, uint256 min_3pool) external onlyByOwnGov returns (uint256 frax_received) {
        // Approve the metapool LP tokens for the metapool contract
        frax3crv_metapool.approve(address(this), _metapool_lp_in);

        // Withdraw FRAX and 3pool from the metapool at the current balance
        uint256 three_pool_received;
        {
            uint256[2] memory result_arr = frax3crv_metapool.remove_liquidity(_metapool_lp_in, [min_frax, min_3pool]);
            frax_received = result_arr[0];
            three_pool_received = result_arr[1];
        }

        // Convert the 3pool into the collateral
        three_pool_erc20.approve(address(three_pool), 0);
        three_pool_erc20.approve(address(three_pool), three_pool_received);
        {
            // Add the FRAX and the collateral to the metapool
            uint256 min_collat_out = three_pool_received.mul(liq_slippage_3crv).div(PRICE_PRECISION * (10 ** missing_decimals));
            three_pool.remove_liquidity_one_coin(three_pool_received, 1, min_collat_out);
        }

        // Optionally burn the FRAX
        if (burn_the_frax){
            burnFRAX(frax_received);
        }
        
    }

    function metapoolWithdrawFrax(uint256 _metapool_lp_in, bool burn_the_frax) external onlyByOwnGov returns (uint256 frax_received) {
        // Withdraw FRAX from the metapool
        uint256 min_frax_out = _metapool_lp_in.mul(rem_liq_slippage_metapool).div(PRICE_PRECISION);
        frax_received = frax3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 0, min_frax_out);

        // Optionally burn the FRAX
        if (burn_the_frax){
            burnFRAX(frax_received);
        }
    }

    function metapoolWithdraw3pool(uint256 _metapool_lp_in) public onlyByOwnGov {
        // Withdraw 3pool from the metapool
        uint256 min_3pool_out = _metapool_lp_in.mul(rem_liq_slippage_metapool).div(PRICE_PRECISION);
        frax3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 1, min_3pool_out);
    }

    function three_pool_to_collateral(uint256 _3pool_in) public onlyByOwnGov {
        // Convert the 3pool into the collateral
        // WEIRD ISSUE: NEED TO DO three_pool_erc20.approve(address(three_pool), 0); first before every time
        // May be related to https://github.com/vyperlang/vyper/blob/3e1ff1eb327e9017c5758e24db4bdf66bbfae371/examples/tokens/ERC20.vy#L85
        three_pool_erc20.approve(address(three_pool), 0);
        three_pool_erc20.approve(address(three_pool), _3pool_in);
        uint256 min_collat_out = _3pool_in.mul(liq_slippage_3crv).div(PRICE_PRECISION * (10 ** missing_decimals));
        three_pool.remove_liquidity_one_coin(_3pool_in, 1, min_collat_out);
    }

    function metapoolWithdrawAndConvert3pool(uint256 _metapool_lp_in) external onlyByOwnGov {
        metapoolWithdraw3pool(_metapool_lp_in);
        three_pool_to_collateral(three_pool_erc20.balanceOf(address(this)));
    }

    // Deposit Metapool LP tokens into the Curve DAO for gauge rewards, if any
    function depositToGauge(uint256 _metapool_lp_in) external onlyByOwnGov {
        // Approve the metapool LP tokens for the gauge contract
        frax3crv_metapool.approve(address(gauge_frax3crv), _metapool_lp_in);
        
        // Deposit the metapool LP into the gauge contract
        gauge_frax3crv.deposit(_metapool_lp_in);
    }

    // Withdraw Metapool LP from Curve DAO back to this contract
    function withdrawFromGauge(uint256 _metapool_lp_out) external onlyByOwnGov {
        gauge_frax3crv.withdraw(_metapool_lp_out);
    }

    // Checkpoint the Gauge for this address
    function checkpointGauge() external onlyByOwnGov {
        gauge_frax3crv.user_checkpoint(address(this));
    }

    // Retrieve CRV gauge rewards, if any
    function collectCRVFromGauge() external onlyByOwnGov {
        gauge_frax3crv.claim_rewards(address(this));
        IMinter(gauge_frax3crv.minter()).mint(gauge_frax3crv_address);
    }

    // Loan / transfer FRAX3CRV to the voter contract
    function loanFRAX3CRV_To_Voter(uint256 loan_amount) external onlyByOwnGov {
        frax3crv_metapool.transfer(voter_contract_address, loan_amount);
    }

    // /* ========== Voter ========== */

    // // Repay FRAX3CRV loan (called by the voter contract)
    // function repayFRAX3CRV(uint256 repay_amount) external onlyVoter {
    //     // Remember to approve() first
    //     frax3crv_metapool.transferFrom(voter_contract_address, address(this), repay_amount);
    // }

    /* ========== Custodian / Voter========== */

    // NOTE: The custodian_address or voter_contract_addresse can be set to the governance contract to be used as
    // a mega-voter or sorts. The CRV here can then be converted to veCRV and then used to vote
    function withdrawCRVRewards() external onlyCustodianOrVoter {
        ERC20(crv_address).transfer(msg.sender, ERC20(crv_address).balanceOf(address(this)));
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnGov {
        owner_address = _owner_address;
    }

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setVoterContract(address _voter_contract_address) external onlyByOwnGov {
        require(_voter_contract_address != address(0), "Voter address cannot be 0");  
        voter_contract_address = _voter_contract_address;
    }

    function setPool(address _pool_address) external onlyByOwnGov {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setThreePool(address _three_pool_address, address _three_pool_token_address) external onlyByOwnGov {
        three_pool_address = _three_pool_address;
        three_pool = IStableSwap3Pool(_three_pool_address);
        three_pool_token_address = _three_pool_token_address;
        three_pool_erc20 = ERC20(_three_pool_token_address);
    }

    function setMetapool(address _metapool_address) external onlyByOwnGov {
        frax3crv_metapool_address = _metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_metapool_address);
    }

    function setGauge(address _gauge_frax3crv_address) external onlyByOwnGov {
        gauge_frax3crv_address = _gauge_frax3crv_address;
        gauge_frax3crv = ILiquidityGaugeV2(_gauge_frax3crv_address);
    }

    function setCollatBorrowCap(uint256 _collat_borrow_cap) external onlyByOwnGov {
        collat_borrow_cap = _collat_borrow_cap;
    }

    function setMaxFraxOutstanding(uint256 _max_frax_outstanding) external onlyByOwnGov {
        max_frax_outstanding = _max_frax_outstanding;
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnGov {
        min_cr = _min_cr;
    }

    function setConvergenceWindow(uint256 _window) external onlyByOwnGov {
        convergence_window = _window;
    }

    function setOverrideCollatBalance(bool _state, uint256 _balance) external onlyByOwnGov {
        override_collat_balance = _state;
        override_collat_balance_amount = _balance;
    }

    // in terms of 1e6 (overriding global_collateral_ratio)
    function setCustomFloor(bool _state, uint256 _floor_price) external onlyByOwnGov {
        custom_floor = _state;
        frax_floor = _floor_price;
    }

    // in terms of 1e6 (overriding global_collateral_ratio)
    function setDiscountRate(bool _state, uint256 _discount_rate) external onlyByOwnGov {
        set_discount = _state;
        discount_rate = _discount_rate;
    }

    function setSlippages(uint256 _liq_slippage_3crv, uint256 _add_liq_slippage_metapool, uint256 _rem_liq_slippage_metapool) external onlyByOwnGov {
        liq_slippage_3crv = _liq_slippage_3crv;
        add_liq_slippage_metapool = _add_liq_slippage_metapool;
        rem_liq_slippage_metapool = _rem_liq_slippage_metapool;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
        ERC20(tokenAddress).transfer(custodian_address, tokenAmount);
    }
}