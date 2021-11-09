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
// ========================== MIM_Convex_AMO ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett


import "../Curve/IStableSwap3Pool.sol";
import "../Curve/IMetaImplementationUSD.sol";
import "../Misc_AMOs/convex/IConvexBooster.sol";
import "../Misc_AMOs/convex/IConvexBaseRewardPool.sol";
import "../Misc_AMOs/convex/IVirtualBalanceRewardPool.sol";
import "../Misc_AMOs/convex/IConvexClaimZap.sol";
import "../Misc_AMOs/convex/IcvxRewardPool.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";
import "../Proxy/Initializable.sol";
import "../Staking/Owned.sol";

contract MIM_Convex_AMO is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    ERC20 private collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    IFraxAMOMinter private amo_minter;

    // Curve-related
    IMetaImplementationUSD private mim3crv_metapool;
    IStableSwap3Pool private three_pool;
    ERC20 private three_pool_erc20;

    // MIM-related
    ERC20 private MIM = ERC20(0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3);
    IConvexBooster private convex_booster;
    IConvexBaseRewardPool private convex_base_reward_pool;
    IConvexClaimZap private convex_claim_zap;
    IVirtualBalanceRewardPool private convex_spell_rewards_pool;
    IcvxRewardPool private cvx_reward_pool;
    ERC20 private cvx;
    address private cvx_crv_address;
    uint256 private lp_deposit_pid;

    address private crv_address;
    address private constant spell_address = 0x090185f2135308BaD17527004364eBcC2D37e5F6;
    address private mim3crv_metapool_address;

    address public timelock_address;
    address public custodian_address;

    // Number of decimals under 18, for collateral token
    uint256 private missing_decimals;

    // Precision related
    uint256 private PRICE_PRECISION;

    // Min ratio of collat <-> 3crv conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_3crv;

    // Min ratio of (MIM + 3CRV) <-> MIMCRV-f-2 metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public slippage_metapool;

    // Discount
    bool public set_discount;
    uint256 public discount_rate;

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        owner = _owner_address;
        missing_decimals = 12;

        mim3crv_metapool_address = 0x5a6A4D54456819380173272A5E8E9B9904BdF41B;
        mim3crv_metapool = IMetaImplementationUSD(mim3crv_metapool_address);
        three_pool = IStableSwap3Pool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
        three_pool_erc20 = ERC20(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Convex MIM-related 
        convex_booster = IConvexBooster(0xF403C135812408BFbE8713b5A23a04b3D48AAE31);
        convex_base_reward_pool = IConvexBaseRewardPool(0xFd5AbF66b003881b88567EB9Ed9c651F14Dc4771);
        convex_claim_zap = IConvexClaimZap(0x4890970BB23FCdF624A0557845A29366033e6Fa2);
        cvx_reward_pool = IcvxRewardPool(0xCF50b810E57Ac33B91dCF525C6ddd9881B139332);
        cvx = ERC20(0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B);
        cvx_crv_address = 0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7;
        crv_address = 0xD533a949740bb3306d119CC777fa900bA034cd52;
        convex_spell_rewards_pool = IVirtualBalanceRewardPool(0x69a92f1656cd2e193797546cFe2EaF32EACcf6f7);
        lp_deposit_pid = 40;

        // Other variable initializations
        PRICE_PRECISION = 1e6;
        liq_slippage_3crv = 800000;
        slippage_metapool = 950000;

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

    function showAllocations() public view returns (uint256[10] memory return_arr) {
        // ------------LP Balance------------

        // Free LP
        uint256 lp_owned = (mim3crv_metapool.balanceOf(address(this)));

        // Staked in the vault
        uint256 lp_value_in_vault = MIM3CRVInVault();
        lp_owned = lp_owned.add(lp_value_in_vault);

        // ------------3pool Withdrawable------------
        uint256 mim3crv_supply = mim3crv_metapool.totalSupply();

        uint256 mim_withdrawable = 0;
        uint256 _3pool_withdrawable = 0;
        if (lp_owned > 0) _3pool_withdrawable = mim3crv_metapool.calc_withdraw_one_coin(lp_owned, 1); // 1: 3pool index
         
        // ------------MIM Balance------------
        // MIM sums
        uint256 mim_in_contract = MIM.balanceOf(address(this));

        // ------------Collateral Balance------------
        // Free Collateral
        uint256 usdc_in_contract = collateral_token.balanceOf(address(this));

        // Returns the dollar value withdrawable of USDC if the contract redeemed its 3CRV from the metapool; assume 1 USDC = $1
        uint256 usdc_withdrawable = _3pool_withdrawable.mul(three_pool.get_virtual_price()).div(1e18).div(10 ** missing_decimals);

        // USDC subtotal
        uint256 usdc_subtotal = usdc_in_contract.add(usdc_withdrawable);

        return [
            mim_in_contract, // [0] Free MIM in the contract
            mim_withdrawable, // [1] MIM withdrawable from the MIM3CRV tokens
            mim_withdrawable.add(mim_in_contract), // [2] MIM withdrawable + free MIM in the the contract
            usdc_in_contract, // [3] Free USDC
            usdc_withdrawable, // [4] USDC withdrawable from the MIM3CRV tokens
            usdc_subtotal, // [5] USDC Total
            lp_owned, // [6] MIM3CRV free or in the vault
            mim3crv_supply, // [7] Total supply of MIM3CRV tokens
            _3pool_withdrawable, // [8] 3pool withdrawable from the MIM3CRV tokens
            lp_value_in_vault // [9] MIM3CRV in the vault
        ];
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        // Get the allocations
        uint256[10] memory allocations = showAllocations();

        frax_val_e18 = 1e18; // don't have FRAX in this contract
        collat_val_e18 = allocations[2].add((allocations[5]).mul(10 ** missing_decimals)); // all MIM (valued at $1) plus USDC in this contract
    }

    function showRewards() public view returns (uint256[4] memory return_arr) {
        return_arr[0] = convex_base_reward_pool.earned(address(this)); // CRV claimable
        return_arr[1] = 0; // CVX claimable. PITA to calculate. See https://docs.convexfinance.com/convexfinanceintegration/cvx-minting
        return_arr[2] = cvx_reward_pool.earned(address(this)); // cvxCRV claimable
        return_arr[3] = convex_spell_rewards_pool.earned(address(this)); // SPELL claimable
    }

    function MIM3CRVInVault() public view returns (uint256) {
        return convex_base_reward_pool.balanceOf(address(this));
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    function usdValueInVault() public view returns (uint256) {
        uint256 vault_balance = MIM3CRVInVault();
        return vault_balance.mul(mim3crv_metapool.get_virtual_price()).div(1e18);
    }
    
    /* ========== RESTRICTED FUNCTIONS ========== */

    function metapoolDeposit(uint256 _MIM_Convex_AMOunt, uint256 _collateral_amount) external onlyByOwnGov returns (uint256 metapool_LP_received) {
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
            three_pool_erc20.approve(mim3crv_metapool_address, 0);
            three_pool_erc20.approve(mim3crv_metapool_address, threeCRV_received);
        }
        
        // Approve the MIM for the metapool
        MIM.approve(mim3crv_metapool_address, _MIM_Convex_AMOunt);

        {
            // Add the FRAX and the collateral to the metapool
            uint256 min_lp_out = (_MIM_Convex_AMOunt.add(threeCRV_received)).mul(slippage_metapool).div(PRICE_PRECISION);
            metapool_LP_received = mim3crv_metapool.add_liquidity([_MIM_Convex_AMOunt, threeCRV_received], min_lp_out);
        }

        return metapool_LP_received;
    }

    function metapoolWithdrawMIM(uint256 _metapool_lp_in) external onlyByOwnGov returns (uint256 mim_received) {
        // Withdraw MIM from the metapool
        uint256 min_mim_out = _metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
        mim_received = mim3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 0, min_mim_out);
    }

    function metapoolWithdraw3pool(uint256 _metapool_lp_in) internal onlyByOwnGov {
        // Withdraw 3pool from the metapool
        uint256 min_3pool_out = _metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
        mim3crv_metapool.remove_liquidity_one_coin(_metapool_lp_in, 1, min_3pool_out);
    }

    function three_pool_to_collateral(uint256 _3pool_in) internal onlyByOwnGov {
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

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGovCust {
        collateral_token.approve(address(amo_minter), collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);
    }

    /* ========== Convex: Deposit / Claim / Withdraw MIM3CRV Metapool LP ========== */

    // Deposit Metapool LP tokens, convert them to Convex LP, and deposit into their vault
    function depositMIM3CRV(uint256 _metapool_lp_in) external onlyByOwnGovCust{
        // Approve the metapool LP tokens for the vault contract
        mim3crv_metapool.approve(address(convex_booster), _metapool_lp_in);
        
        // Deposit the metapool LP into the vault contract
        convex_booster.deposit(lp_deposit_pid, _metapool_lp_in, true);
    }

    // Withdraw Convex LP, convert it back to Metapool LP tokens, and give them back to the sender
    function withdrawAndUnwrapMIM3CRV(uint256 amount, bool claim) external onlyByOwnGovCust{
        convex_base_reward_pool.withdrawAndUnwrap(amount, claim);
    }

    // Claim CVX, CRV, and SPELL rewards
    function claimRewardsMIM3CRV() external onlyByOwnGovCust {
        address[] memory rewardContracts = new address[](1);
        rewardContracts[0] = address(convex_base_reward_pool);

        uint256[] memory chefIds = new uint256[](0);

        convex_claim_zap.claimRewards(
            rewardContracts, 
            chefIds, 
            false, 
            false, 
            false, 
            0, 
            0
        );
    }

    /* ========== Convex: Stake / Claim / Withdraw CVX ========== */

    // Stake CVX tokens
    // E18
    function stakeCVX(uint256 _cvx_in) external onlyByOwnGovCust {
        // Approve the CVX tokens for the staking contract
        cvx.approve(address(cvx_reward_pool), _cvx_in);
        
        // Stake the CVX tokens into the staking contract
        cvx_reward_pool.stakeFor(address(this), _cvx_in);
    }

    // Claim cvxCRV rewards
    function claimRewards_cvxCRV(bool stake) external onlyByOwnGovCust {
        cvx_reward_pool.getReward(address(this), true, stake);
    }

    // Unstake CVX tokens
    // E18
    function withdrawCVX(uint256 cvx_amt, bool claim) external onlyByOwnGovCust {
        cvx_reward_pool.withdraw(cvx_amt, claim);
    }

    function withdrawRewards(
        uint256 crv_amt,
        uint256 cvx_amt,
        uint256 cvxCRV_amt,
        uint256 spell_amt
    ) external onlyByOwnGovCust {
        if (crv_amt > 0) TransferHelper.safeTransfer(crv_address, msg.sender, crv_amt);
        if (cvx_amt > 0) TransferHelper.safeTransfer(address(cvx), msg.sender, cvx_amt);
        if (cvxCRV_amt > 0) TransferHelper.safeTransfer(cvx_crv_address, msg.sender, cvxCRV_amt);
        if (spell_amt > 0) TransferHelper.safeTransfer(spell_address, msg.sender, spell_amt);
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