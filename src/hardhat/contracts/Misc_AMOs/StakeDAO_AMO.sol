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
// =========================== StakeDAO_AMO ===========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// github.com/denett


import "../Curve/IStableSwap3Pool.sol";
import "../Curve/IMetaImplementationUSD.sol";
import "../Misc_AMOs/stakedao/IStakeDaoVault.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../FXS/FXS.sol";
import "../Math/SafeMath.sol";
import "../Proxy/Initializable.sol";
import "../Staking/Owned_Proxy.sol";

contract StakeDAO_AMO is AccessControl, Initializable, Owned_Proxy {
    using SafeMath for uint256;
    // Solidity ^8.0.0 automatically reverts on int256 underflows/overflows

    /* ========== STATE VARIABLES ========== */

    IMetaImplementationUSD private frax3crv_metapool;
    IStableSwap3Pool private three_pool;
    IStakeDaoVault private stakedao_vault;
    ERC20 private three_pool_erc20;
    FRAXStablecoin private FRAX;
    FraxPool private pool;
    ERC20 private collateral_token;

    address private fxs_contract_address;
    address private frax3crv_metapool_address;

    address public timelock_address;
    address public custodian_address;
    address public voter_contract_address; // FRAX3CRV and CRV will be sent here for veCRV voting, locked LP boosts, etc

    // Number of decimals under 18, for collateral token
    uint256 private missing_decimals;

    // Precision related
    uint256 private PRICE_PRECISION;

    // Tracks FRAX
    int256 public minted_frax_historical;
    int256 public burned_frax_historical;

    // Max amount of FRAX outstanding the contract can mint from the FraxPool
    int256 public max_frax_outstanding;
    
    // Tracks collateral
    int256 public borrowed_collat_historical;
    int256 public returned_collat_historical;

    // Max amount of collateral the contract can borrow from the FraxPool
    int256 public collat_borrow_cap;

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr;

    // Min ratio of collat <-> 3crv conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_3crv;

    // Min ratio of (FRAX + 3CRV) <-> FRAX3CRV-f-2 metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public slippage_metapool;

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

    /* ========== INITIALIZER ========== */

    function initialize(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _collateral_address,
        address _creator_address,
        address _custodian_address,
        address _timelock_address,
        address _frax3crv_metapool_address,
        address _pool_address
    ) public initializer {
        owner = _creator_address;
        FRAX = FRAXStablecoin(_frax_contract_address);
        fxs_contract_address = _fxs_contract_address;
        collateral_token = ERC20(_collateral_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        timelock_address = _timelock_address;
        custodian_address = _custodian_address;
        voter_contract_address = _custodian_address; // Default to the custodian

        frax3crv_metapool_address = _frax3crv_metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_frax3crv_metapool_address);
        three_pool = IStableSwap3Pool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
        three_pool_erc20 = ERC20(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);
        pool = FraxPool(_pool_address);

        stakedao_vault = IStakeDaoVault(0x99780beAdd209cc3c7282536883Ef58f4ff4E52F);

        // Other variable initializations
        minted_frax_historical = 0;
        burned_frax_historical = 0;
        max_frax_outstanding = int256(2000000e18);
        borrowed_collat_historical = 0;
        returned_collat_historical = 0;
        collat_borrow_cap = int256(1000000e6);
        min_cr = 820000;
        PRICE_PRECISION = 1e6;
        liq_slippage_3crv = 800000;
        slippage_metapool = 950000;
        convergence_window = 1e16;
        custom_floor = false;  
        set_discount = false;
        override_collat_balance = false;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner, "Must be owner or timelock");
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

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[11] memory return_arr) {
        // ------------LP Balance------------

        // Free LP
        uint256 lp_owned = (frax3crv_metapool.balanceOf(address(this)));

        // Staked in the vault
        uint256 lp_value_in_vault = FRAX3CRVInVault();
        lp_owned = lp_owned.add(lp_value_in_vault);

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
            frax_in_contract, // [0] Free FRAX in the contract
            frax_withdrawable, // [1] FRAX withdrawable from the FRAX3CRV tokens
            frax_withdrawable.add(frax_in_contract), // [2] FRAX withdrawable + free FRAX in the the contract
            usdc_in_contract, // [3] Free USDC
            usdc_withdrawable, // [4] USDC withdrawable from the FRAX3CRV tokens
            usdc_subtotal, // [5] USDC subtotal assuming FRAX drops to the CR and all reserves are arbed
            usdc_subtotal.add((frax_in_contract.add(frax_withdrawable)).mul(fraxDiscountRate()).div(1e6 * (10 ** missing_decimals))), // [6] USDC Total
            lp_owned, // [7] FRAX3CRV free or in the vault
            frax3crv_supply, // [8] Total supply of FRAX3CRV tokens
            _3pool_withdrawable, // [9] 3pool withdrawable from the FRAX3CRV tokens
            lp_value_in_vault // [10] FRAX3CRV in the vault
        ];
    }

    function collatDollarBalance() external view returns (uint256) {
        if(override_collat_balance){
            return override_collat_balance_amount;
        }
        return (showAllocations()[6] * (10 ** missing_decimals));
    }

    // Returns hypothetical reserves of metapool if the FRAX price went to the CR,
    // assuming no removal of liquidity from the metapool.
    function iterate() public view returns (uint256, uint256, uint256) {
        uint256 frax_balance = FRAX.balanceOf(frax3crv_metapool_address);
        uint256 crv3_balance = three_pool_erc20.balanceOf(frax3crv_metapool_address);
        uint256 total_balance = frax_balance.add(crv3_balance);

        uint256 floor_price_frax = uint(1e18).mul(fraxFloor()).div(1e6);
        
        uint256 crv3_received;
        uint256 dollar_value; // 3crv is usually slightly above $1 due to collecting 3pool swap fees
        for(uint i = 0; i < 256; i++){
            crv3_received = frax3crv_metapool.get_dy(0, 1, 1e18, [frax_balance, crv3_balance]);
            dollar_value = crv3_received.mul(1e18).div(three_pool.get_virtual_price());
            if(dollar_value <= floor_price_frax.add(convergence_window) && dollar_value >= floor_price_frax.sub(convergence_window)){
                return (frax_balance, crv3_balance, i);
            } else if (dollar_value <= floor_price_frax.add(convergence_window)){
                uint256 crv3_to_swap = total_balance.div(2 ** i);
                frax_balance = frax_balance.sub(frax3crv_metapool.get_dy(1, 0, crv3_to_swap, [frax_balance, crv3_balance]));
                crv3_balance = crv3_balance.add(crv3_to_swap);
            } else if (dollar_value >= floor_price_frax.sub(convergence_window)){
                uint256 frax_to_swap = total_balance.div(2 ** i);
                crv3_balance = crv3_balance.sub(frax3crv_metapool.get_dy(0, 1, frax_to_swap, [frax_balance, crv3_balance]));
                frax_balance = frax_balance.add(frax_to_swap);
            }
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

    // In FRAX, can be negative
    function mintedBalance() public view returns (int256) {
        return minted_frax_historical - burned_frax_historical;
    }

    // In collateral, can be negative
    function borrowedCollatBalance() public view returns (int256) {
        return borrowed_collat_historical - returned_collat_historical;
    }

    // In FRAX, can be negative
    function totalInvested() public view returns (int256) {
        return mintedBalance() + (borrowedCollatBalance() * int256((10 ** missing_decimals)));
    }

    // Amount of FRAX3CRV deposited in the vault contract
    function sdFRAX3CRV_Balance() public view returns (uint256){
        return stakedao_vault.balanceOf(address(this));
    }

    function FRAX3CRVInVault() public view returns (uint256){
        uint256 sdBal = sdFRAX3CRV_Balance();
        return sdBal.mul(stakedao_vault.getPricePerFullShare()).div(1e18);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // This is basically a workaround to transfer USDC from the FraxPool to this investor contract
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called separately later on
    function mintRedeemPart1(uint256 frax_amount) external onlyByOwnerOrGovernance {
        //require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(pool.redemption_fee()))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(FRAX.global_collateral_ratio()).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(pool.getCollateralPrice());

        require((borrowedCollatBalance() + int256(expected_collat_amount)) <= collat_borrow_cap, "Borrow cap");
        borrowed_collat_historical = borrowed_collat_historical + int256(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() external onlyByOwnerOrGovernance {
        pool.collectRedemption();
    }

    // Give USDC profits back
    function giveCollatBack(uint256 amount) external onlyByOwnerOrGovernance {
        returned_collat_historical = returned_collat_historical + int256(amount);
        TransferHelper.safeTransfer(address(collateral_token), address(pool), uint256(amount));
    }
   
    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 frax_amount) public onlyByOwnerOrGovernance {
        burned_frax_historical = burned_frax_historical + int256(frax_amount);
        FRAX.burn(uint256(frax_amount));
    }
   
    function burnFXS(uint256 amount) external onlyByOwnerOrGovernance {
        FRAXShares(fxs_contract_address).approve(address(this), amount);
        FRAXShares(fxs_contract_address).pool_burn_from(address(this), amount);
    }

    function metapoolDeposit(uint256 _frax_amount, uint256 _collateral_amount) external onlyByOwnerOrGovernance returns (uint256 metapool_LP_received) {
        // Mint the FRAX component
        minted_frax_historical = minted_frax_historical + int256(_frax_amount);
        FRAX.pool_mint(address(this), _frax_amount);
        require(mintedBalance() <= max_frax_outstanding, "max_frax_outstanding reached");

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
            uint256 min_lp_out = (_frax_amount.add(threeCRV_received)).mul(slippage_metapool).div(PRICE_PRECISION);
            metapool_LP_received = frax3crv_metapool.add_liquidity([_frax_amount, threeCRV_received], min_lp_out);
        }

        // Make sure the collateral ratio did not fall too much
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue()).mul(10 ** missing_decimals);
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(cur_frax_supply);
        require (new_cr >= min_cr, "CR would be too low");
        
        return metapool_LP_received;
    }

    function metapoolWithdrawAtCurRatio(uint256 _metapool_lp_in, bool burn_the_frax, uint256 min_frax, uint256 min_3pool) external onlyByOwnerOrGovernance returns (uint256 frax_received) {
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

    function metapoolWithdrawFrax(uint256 _metapool_lp_in, bool burn_the_frax) external onlyByOwnerOrGovernance returns (uint256 frax_received) {
        // Withdraw FRAX from the metapool
        uint256 min_frax_out = _metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
        frax_received = frax3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 0, min_frax_out);

        // Optionally burn the FRAX
        if (burn_the_frax){
            burnFRAX(frax_received);
        }
    }

    function metapoolWithdraw3pool(uint256 _metapool_lp_in) public onlyByOwnerOrGovernance {
        // Withdraw 3pool from the metapool
        uint256 min_3pool_out = _metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
        frax3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 1, min_3pool_out);
    }

    function three_pool_to_collateral(uint256 _3pool_in) public onlyByOwnerOrGovernance {
        // Convert the 3pool into the collateral
        // WEIRD ISSUE: NEED TO DO three_pool_erc20.approve(address(three_pool), 0); first before every time
        // May be related to https://github.com/vyperlang/vyper/blob/3e1ff1eb327e9017c5758e24db4bdf66bbfae371/examples/tokens/ERC20.vy#L85
        three_pool_erc20.approve(address(three_pool), 0);
        three_pool_erc20.approve(address(three_pool), _3pool_in);
        uint256 min_collat_out = _3pool_in.mul(liq_slippage_3crv).div(PRICE_PRECISION * (10 ** missing_decimals));
        three_pool.remove_liquidity_one_coin(_3pool_in, 1, min_collat_out);
    }

    function metapoolWithdrawAndConvert3pool(uint256 _metapool_lp_in) external onlyByOwnerOrGovernance {
        metapoolWithdraw3pool(_metapool_lp_in);
        three_pool_to_collateral(three_pool_erc20.balanceOf(address(this)));
    }

    /* ========== StakeDAO: Deposit / Withdrawal ========== */

    // Deposit Metapool LP tokens into the vault
    function depositToVault(uint256 _metapool_lp_in) external onlyByOwnerOrGovernance {
        // Approve the metapool LP tokens for the vault contract
        frax3crv_metapool.approve(address(stakedao_vault), _metapool_lp_in);
        
        // Deposit the metapool LP into the vault contract
        stakedao_vault.deposit(_metapool_lp_in);
    }

    // Withdraw Metapool LP from the vault back to this contract
    function withdrawFromVault(uint256 _vault_shares) external onlyByOwnerOrGovernance {
        stakedao_vault.withdraw(_vault_shares);
    }

    /* ========== Custodian / Voter========== */

    // NOTE: The custodian_address or voter_contract_address can be set to the governance contract to be used as
    // a mega-voter or sorts.
    // Rewards is in an increasing getPricePerFullShare() over time here, not a token
    function withdrawRewards(uint256 frax3crv_amt) external onlyCustodianOrVoter {
        TransferHelper.safeTransfer(frax3crv_metapool_address, msg.sender, frax3crv_amt);
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setCustodian(address _custodian_address) external onlyByOwnerOrGovernance {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setVoterContract(address _voter_contract_address) external onlyByOwnerOrGovernance {
        require(_voter_contract_address != address(0), "Voter address cannot be 0");  
        voter_contract_address = _voter_contract_address;
    }

    function setPool(address _pool_address) external onlyByOwnerOrGovernance {
        pool = FraxPool(_pool_address);
    }

    function setMetapool(address _metapool_address) external onlyByOwnerOrGovernance {
        frax3crv_metapool_address = _metapool_address;
        frax3crv_metapool = IMetaImplementationUSD(_metapool_address);
    }

    function setVault(address _stakedao_vault_address) external onlyByOwnerOrGovernance {
        stakedao_vault = IStakeDaoVault(_stakedao_vault_address);
    }

    function setCollatBorrowCap(int256 _collat_borrow_cap) external onlyByOwnerOrGovernance {
        collat_borrow_cap = _collat_borrow_cap;
    }

    function setMaxFraxOutstanding(int256 _max_frax_outstanding) external onlyByOwnerOrGovernance {
        max_frax_outstanding = _max_frax_outstanding;
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnerOrGovernance {
        min_cr = _min_cr;
    }

    function setConvergenceWindow(uint256 _window) external onlyByOwnerOrGovernance {
        convergence_window = _window;
    }

    function setOverrideCollatBalance(bool _state, uint256 _balance) external onlyByOwnerOrGovernance {
        override_collat_balance = _state;
        override_collat_balance_amount = _balance;
    }

    // in terms of 1e6 (overriding global_collateral_ratio)
    function setCustomFloor(bool _state, uint256 _floor_price) external onlyByOwnerOrGovernance {
        custom_floor = _state;
        frax_floor = _floor_price;
    }

    // in terms of 1e6 (overriding global_collateral_ratio)
    function setDiscountRate(bool _state, uint256 _discount_rate) external onlyByOwnerOrGovernance {
        set_discount = _state;
        discount_rate = _discount_rate;
    }

    function setSlippages(uint256 _liq_slippage_3crv, uint256 _slippage_metapool) external onlyByOwnerOrGovernance {
        liq_slippage_3crv = _liq_slippage_3crv;
        slippage_metapool = _slippage_metapool;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
        TransferHelper.safeTransfer(address(tokenAddress), custodian_address, tokenAmount);
    }
}