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
// ============================ CurveAMO_V4 ===========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett


import "../Curve/IStableSwap3Pool.sol";
import "../Curve/IMetaImplementationUSD.sol";
import "../Misc_AMOs/yearn/IYearnVault.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Frax/Frax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../Math/SafeMath.sol";
import "../Proxy/Initializable.sol";
import "../Staking/Owned.sol";

contract CurveAMO_V4 is Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    IMetaImplementationUSD private frax3crv_metapool;
    IStableSwap3Pool private three_pool;
    IYearnVault private crvFRAX_vault;
    ERC20 private three_pool_erc20;
    FRAXStablecoin private FRAX;
    ERC20 private collateral_token;
    IFraxAMOMinter private amo_minter;

    address private collateral_token_address;
    address private crv_address;
    address private frax3crv_metapool_address;
    address private crvFRAX_vault_address;

    address public timelock_address;
    address public custodian_address;

    // Number of decimals under 18, for collateral token
    uint256 private missing_decimals;

    // Precision related
    uint256 private PRICE_PRECISION;

    // Min ratio of collat <-> 3crv conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_3crv;

    // Min ratio of (FRAX + 3CRV) <-> FRAX3CRV-f-2 metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public slippage_metapool;

    // Convergence window
    uint256 public convergence_window; // 0.1 cent

    // Default will use global_collateral_ratio()
    bool public custom_floor;    
    uint256 public frax_floor;

    // Discount
    bool public set_discount;
    uint256 public discount_rate;

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        owner = _owner_address;
        FRAX = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        crv_address = 0xD533a949740bb3306d119CC777fa900bA034cd52;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        frax3crv_metapool_address = 0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B;
        frax3crv_metapool = IMetaImplementationUSD(frax3crv_metapool_address);
        three_pool = IStableSwap3Pool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
        three_pool_erc20 = ERC20(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);

        crvFRAX_vault_address = 0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139;
        crvFRAX_vault = IYearnVault(crvFRAX_vault_address);

        // Other variable initializations
        PRICE_PRECISION = 1e6;
        liq_slippage_3crv = 800000;
        slippage_metapool = 950000;
        convergence_window = 1e15;
        custom_floor = false;  
        set_discount = false;

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

    function showAllocations() public view returns (uint256[11] memory return_arr) {
        // ------------LP Balance------------

        // Free LP
        uint256 lp_owned = (frax3crv_metapool.balanceOf(address(this)));

        // Staked in the vault
        uint256 lp_value_in_vault = usdValueInVault();
        lp_owned = lp_owned.add(lp_value_in_vault);

        // ------------3pool Withdrawable------------
        // Uses iterate() to get metapool withdrawable amounts at FRAX floor price (global_collateral_ratio)
        uint256 frax3crv_supply = frax3crv_metapool.totalSupply();

        uint256 frax_withdrawable;
        uint256 _3pool_withdrawable;
        (frax_withdrawable, _3pool_withdrawable, ,) = iterate();
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

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        // Get the allocations
        uint256[11] memory allocations = showAllocations();

        frax_val_e18 = (allocations[2]).add((allocations[5]).mul((10 ** missing_decimals)));
        collat_val_e18 = (allocations[6]).mul(10 ** missing_decimals);
    }

    // Returns hypothetical reserves of metapool if the FRAX price went to the CR,
    // assuming no removal of liquidity from the metapool.
    function iterate() public view returns (uint256, uint256, uint256, uint256) {
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
                uint256 factor = uint256(1e6).mul(total_balance).div(frax_balance.add(crv3_balance)); //1e6 precision

                // Normalize back to initial balances, since this estimation method adds in extra tokens
                frax_balance = frax_balance.mul(factor).div(1e6);
                crv3_balance = crv3_balance.mul(factor).div(1e6);
                return (frax_balance, crv3_balance, i, factor);
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

    // Amount of FRAX3CRV deposited in the vault contract
    function yvCurveFRAXBalance() public view returns (uint256) {
        return crvFRAX_vault.balanceOf(address(this));
    }

    function usdValueInVault() public view returns (uint256) {
        uint256 yvCurveFrax_balance = yvCurveFRAXBalance();
        return yvCurveFrax_balance.mul(crvFRAX_vault.pricePerShare()).div(1e18);
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function metapoolDeposit(uint256 _frax_amount, uint256 _collateral_amount) external onlyByOwnGov returns (uint256 metapool_LP_received) {
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
        uint256 min_frax_out = _metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
        frax_received = frax3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 0, min_frax_out);

        // Optionally burn the FRAX
        if (burn_the_frax){
            burnFRAX(frax_received);
        }
    }

    function metapoolWithdraw3pool(uint256 _metapool_lp_in) public onlyByOwnGov {
        // Withdraw 3pool from the metapool
        uint256 min_3pool_out = _metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
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

    /* ========== Main Functions ========== */

    // Deposit Metapool LP tokens into the yearn vault
    function depositToVault(uint256 _metapool_lp_in) external onlyByOwnGovCust {
        // Approve the metapool LP tokens for the vault contract
        frax3crv_metapool.approve(address(crvFRAX_vault), _metapool_lp_in);
        
        // Deposit the metapool LP into the vault contract
        crvFRAX_vault.deposit(_metapool_lp_in, address(this));
    }

    // Withdraw Metapool LP from the yearn vault back to this contract
    function withdrawFromVault(uint256 _metapool_lp_out) external onlyByOwnGovCust {
        crvFRAX_vault.withdraw(_metapool_lp_out, address(this), 1);
    }

    // Same as withdrawFromVault, but with manual loss override
    // 1 = 0.01% [BPS]
    function withdrawFromVaultMaxLoss(uint256 _metapool_lp_out, uint256 maxloss) external onlyByOwnGovCust {
        crvFRAX_vault.withdraw(_metapool_lp_out, address(this), maxloss);
    }


    /* ========== Rewards ========== */

    function withdrawCRVRewards() external onlyByOwnGovCust {
        TransferHelper.safeTransfer(crv_address, msg.sender,  ERC20(crv_address).balanceOf(address(this)));
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGovCust {
        collateral_token.approve(address(amo_minter), collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);
    }
   
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }
   
    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setAMOMinter(address _amo_minter_address) external onlyByOwnGov {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Make sure the new addresses are not address(0)
        require(custodian_address != address(0) && timelock_address != address(0), "Invalid custodian or timelock");
    }

    function setConvergenceWindow(uint256 _window) external onlyByOwnGov {
        convergence_window = _window;
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

    function setSlippages(uint256 _liq_slippage_3crv, uint256 _slippage_metapool) external onlyByOwnGov {
        liq_slippage_3crv = _liq_slippage_3crv;
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
        return (success, result);
    }
}