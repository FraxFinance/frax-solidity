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
// ====================== CurveMetapoolLockerAMO ======================
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
import "../Misc_AMOs/morganle/ITC.sol";
import '../Uniswap/TransferHelper.sol';
import "../ERC20/ERC20.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../Math/SafeMath.sol";
import "../Proxy/Initializable.sol";
import "../Staking/Owned.sol";

contract CurveMetapoolLockerAMO is Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    IMetaImplementationUSD private metapool_token;
    IStableSwap3Pool private three_pool;
    ITC private tc;
    ERC20 private three_pool_erc20;
    IFrax private FRAX;
    ERC20 private collateral_token;
    IFraxAMOMinter private amo_minter;

    address private collateral_token_address;
    address private reward_token_address;
    address private metapool_token_address;
    address private tc_address;
    uint256 private immutable tc_pid = 1;

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

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        owner = _owner_address;
        FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        reward_token_address = 0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        metapool_token_address = 0x06cb22615BA53E60D67Bf6C341a0fD5E718E1655;
        metapool_token = IMetaImplementationUSD(metapool_token_address);
        three_pool = IStableSwap3Pool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
        three_pool_erc20 = ERC20(0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490);

        tc_address = 0x9e1076cC0d19F9B0b8019F384B0a29E48Ee46f7f;
        tc = ITC(tc_address);

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

    function showAllocations() public view returns (uint256[6] memory return_arr) {
        // ------------LP Balance------------
        // Free LP
        uint256 lp_free = metapool_token.balanceOf(address(this));
        uint256 lp_total_val = (lp_free * metapool_token.get_virtual_price()) / 1e18;

        // Staked in the vault
        uint256 lp_value_in_vault = usdValueInVault();
        lp_total_val += lp_value_in_vault;

        // ------------Collateral Balance------------
        // Free Collateral
        uint256 free_collateral = collateral_token.balanceOf(address(this));

        // Free Collateral, in E18
        uint256 free_collateral_E18 = free_collateral * (10 ** missing_decimals);

        // ------------Total Balances------------
        // Total USD value
        uint256 total_value_E18 = free_collateral_E18 + lp_total_val;

        return [
            lp_free, // [0] Free LP
            lp_value_in_vault, // [1] Staked LP in the vault
            lp_total_val, // [2] Free + Staked LP
            free_collateral, // [3] Free Collateral
            free_collateral_E18, // [4] Free Collateral, in E18
            total_value_E18 // [5] Total USD value
        ];
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        // Get the allocations
        uint256[6] memory allocations = showAllocations();

        frax_val_e18 = allocations[5];

        // Allocations[2] is NOT multiplied by the CR because only USDC will ever go into it
        // In other AMOs, if you put FRAX in, you should multiply the FRAX part by the CR
        collat_val_e18 = allocations[4] + allocations[2];
    }

    // Amount of FRAX3CRV deposited in the vault contract
    function stakedBalance() public view returns (uint256) {
        return tc.getTotalStakedInPool(tc_pid, address(this));
    }

    function usdValueInVault() public view returns (uint256) {
        uint256 vaultBalance = stakedBalance();
        return (vaultBalance * metapool_token.get_virtual_price()) / 1e18;
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function metapoolDeposit(uint256 _collateral_amount) external onlyByOwnGov returns (uint256 metapool_LP_received) {
        uint256 threeCRV_received = 0;

        // Approve the collateral to be added to 3pool
        collateral_token.approve(address(three_pool), _collateral_amount);

        // Convert collateral into 3pool
        uint256[3] memory three_pool_collaterals;
        three_pool_collaterals[1] = _collateral_amount;
        uint256 min_3pool_out = (_collateral_amount * (10 ** missing_decimals)).mul(liq_slippage_3crv).div(PRICE_PRECISION);
        three_pool.add_liquidity(three_pool_collaterals, min_3pool_out);

        // Approve the 3pool for the metapool
        threeCRV_received = three_pool_erc20.balanceOf(address(this));

        // WEIRD ISSUE: NEED TO DO three_pool_erc20.approve(address(three_pool), 0); first before every time
        // May be related to https://github.com/vyperlang/vyper/blob/3e1ff1eb327e9017c5758e24db4bdf66bbfae371/examples/tokens/ERC20.vy#L85
        three_pool_erc20.approve(metapool_token_address, 0);
        three_pool_erc20.approve(metapool_token_address, threeCRV_received);


        // Add the FRAX and the collateral to the metapool
        uint256 min_lp_out = (threeCRV_received * slippage_metapool) / PRICE_PRECISION;
        metapool_LP_received = metapool_token.add_liquidity([0, threeCRV_received], min_lp_out);

        return metapool_LP_received;
    }

    function metapoolWithdraw3pool(uint256 metapool_lp_in) public onlyByOwnGov {
        // Withdraw 3pool from the metapool
        uint256 min_3pool_out = metapool_lp_in.mul(slippage_metapool).div(PRICE_PRECISION);
        metapool_token.remove_liquidity_one_coin(metapool_lp_in, 1, min_3pool_out);
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

    function metapoolWithdrawAndConvert3pool(uint256 metapool_lp_in) external onlyByOwnGov {
        metapoolWithdraw3pool(metapool_lp_in);
        three_pool_to_collateral(three_pool_erc20.balanceOf(address(this)));
    }

    /* ========== Main Functions ========== */

    // Deposit Metapool LP tokens into the vault
    function depositToVault(uint256 metapool_lp_in, uint64 lock_length) external onlyByOwnGovCust {
        // Approve the metapool LP tokens for the vault contract
        metapool_token.approve(tc_address, metapool_lp_in);
        
        // Deposit the metapool LP into the vault contract
        tc.deposit(tc_pid, metapool_lp_in, lock_length);
    }

    // Withdraw a specific Metapool LP deposit from the vault back to this contract
    function withdrawFromVault(uint256 metapool_lp_out, uint256 deposit_idx) external onlyByOwnGovCust {
        tc.withdrawFromDeposit(tc_pid, metapool_lp_out, address(this), deposit_idx);
    }

    // Withdraw all Metapool LP from the vault back to this contract
    function withdrawAllAndHarvest() external onlyByOwnGovCust {
        tc.withdrawAllAndHarvest(tc_pid, address(this));
    }

    /* ========== Rewards ========== */

    // Collect rewards
    function harvest() external onlyByOwnGovCust {
        tc.harvest(tc_pid, address(this));
    }

    function withdrawRewards() external onlyByOwnGovCust {
        // Withdraw CRV
        TransferHelper.safeTransfer(0xD533a949740bb3306d119CC777fa900bA034cd52, msg.sender, ERC20(0xD533a949740bb3306d119CC777fa900bA034cd52).balanceOf(address(this)));

        // Withdraw the reward tokens
        TransferHelper.safeTransfer(reward_token_address, msg.sender, ERC20(reward_token_address).balanceOf(address(this)));
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGovCust {
        collateral_token.approve(address(amo_minter), collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);
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

    function setSlippages(uint256 _liq_slippage_3crv, uint256 _slippage_metapool) external onlyByOwnGov {
        liq_slippage_3crv = _liq_slippage_3crv;
        slippage_metapool = _slippage_metapool;
    }

    function setTimelock(address _new_timelock_address) external onlyByOwnGov {
        timelock_address = _new_timelock_address;
    }

    function setCustodian(address _new_custodian_address) external onlyByOwnGov {
        custodian_address = _new_custodian_address;
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