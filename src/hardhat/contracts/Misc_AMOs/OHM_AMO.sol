// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================== OHM_AMO =============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/Variants/Comp.sol";
import "../Frax/Pools/FraxPool.sol";
import "./olympus/IOlympusERC20Token.sol";
import "./olympus/IsOlympus.sol";
import "./olympus/IStakingHelper.sol";
import "./olympus/IOlympusStaking.sol";
import "./olympus/IOlympusBondDepository.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import '../Uniswap/UniswapV2Router02_Modified.sol';
import '../Uniswap/UniswapV2Pair.sol';
import "../Proxy/Initializable.sol";
import "../Staking/Owned_Proxy.sol";

// The AMO needs to have 
// 1) Mint FRAX -> Bond (coming next week) -> Collect OHM rewards
// 2) Stake OHM and be able to collect rewards and also withdraw the staked OHM
// 3) Collect OHM rewards and send to custodian
// 4) Sell OHM for FRAX

contract OHM_AMO is Initializable, Owned_Proxy {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    // FRAX related
    FRAXStablecoin private FRAX;
    FraxPool private pool;
    address public pool_address;
    address public timelock_address;
    address public custodian_address;

    // Collateral related
    address public collateral_address;

    // Uniswap related
    IUniswapV2Router02 private UniRouterV2;
    UniswapV2Pair private SLP_FRAX_DAI_Pair;
    address payable public UNISWAP_ROUTER_ADDRESS;

    // OHM related
    IOlympusERC20Token private OHM;
    IsOlympus private sOHM;
    IStakingHelper private stakingHelper;
    IOlympusStaking private olympusStaking;
    IOlympusBondDepository private bondDepository;

    // Precision
    uint256 private missing_decimals_collat;
    uint256 private missing_decimals_ohm;
    uint256 private PRICE_PRECISION;

    // Max amount of FRAX this contract mint
    int256 public mint_cap;

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr;

    // Amount the contract borrowed
    int256 public minted_sum_historical;
    int256 public burned_sum_historical;

    // Collateral balance related
    bool public override_collat_balance;
    uint256 public override_collat_balance_amount;
    
    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner, "You are not the owner or the governance timelock");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian_address, "You are not the rewards custodian");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    
    function initialize(
        address _frax_contract_address,
        address _pool_address,
        address _collateral_address,
        address _creator_address,
        address _custodian_address,
        address _timelock_address
    ) public initializer {
        owner = _creator_address;
        FRAX = FRAXStablecoin(_frax_contract_address);
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
        timelock_address = _timelock_address;
        custodian_address = _custodian_address;
        collateral_address = _collateral_address;

        // Assignments (must be done in initializer, so assignment gets stored in proxy address's storage instead of implementation address's storage)
        // Olympus
        OHM = IOlympusERC20Token(0x383518188C0C6d7730D91b2c03a03C837814a899);
        sOHM = IsOlympus(0x31932E6e45012476ba3A3A4953cbA62AeE77Fbbe);
        stakingHelper = IStakingHelper(0xC8C436271f9A6F10a5B80c8b8eD7D0E8f37a612d);
        olympusStaking = IOlympusStaking(0xFd31c7d00Ca47653c6Ce64Af53c1571f9C36566a);
        bondDepository = IOlympusBondDepository(0x13E8484a86327f5882d1340ed0D7643a29548536);

        // Uniswap
        UNISWAP_ROUTER_ADDRESS = payable(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        UniRouterV2 = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
        SLP_FRAX_DAI_Pair = UniswapV2Pair(0x34d7d7Aaf50AD4944B70B320aCB24C95fa2def7c);

        PRICE_PRECISION = 1e6;
        missing_decimals_collat = 12;
        missing_decimals_ohm = 9;

        mint_cap = int256(2500000e18);
        min_cr = 820000;
        minted_sum_historical = 0;
        burned_sum_historical = 0;

        override_collat_balance = false;
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[4] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        // Call once to save gas
        uint256 ohm_to_frax = spotPriceOHM().mul(10 ** missing_decimals_ohm).div(PRICE_PRECISION);

        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        allocations[1] = OHM.balanceOf(address(this)).mul(ohm_to_frax); // OHM
        allocations[2] = sOHM.balanceOf(address(this)).mul(ohm_to_frax); // sOHM
    
        uint256 sum_tally = 0;
        for (uint i = 0; i < 3; i++){ 
            if (allocations[i] > 0){
                sum_tally = sum_tally.add(allocations[i]);
            }
        }

        allocations[3] = sum_tally; // Total Staked
    }

    function showRewards() external view returns (uint256) {
        return sOHM.balanceOf(address(this));
    }

    function spotPriceOHM() public view returns (uint256 frax_per_ohm) {
        (uint256 reserve0, uint256 reserve1, ) = (SLP_FRAX_DAI_Pair.getReserves());

        // 1e9 comes from Dai's 18 decimals and OHM's 9 decimals, a 1e9 difference.
        frax_per_ohm = reserve1.mul(PRICE_PRECISION).div(reserve0).div(1e9);
    }

    // In FRAX, can be negative
    function mintedBalance() public view returns (int256) {
        return minted_sum_historical - burned_sum_historical;
    }

    // In FRAX, can be negative
    function accumulatedProfit() public view returns (int256) {
        return int256(showAllocations()[3]) - mintedBalance();
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Needed for the Frax contract to function 
    function collatDollarBalance() external view returns (uint256) {
        // Needs to mimic the FraxPool value and return in E18
        // Override is here in case of a brick on the Olympus side
        if(override_collat_balance){
            return override_collat_balance_amount;
        }
        else {
            return (showAllocations()[3]);
        }
        
    }

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFRAXForInvestments(uint256 frax_amount) public onlyByOwnerOrGovernance {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the mint cap
        require((mintedBalance() + frax_amt_i256) <= mint_cap, "Mint cap reached");
        minted_sum_historical = minted_sum_historical + frax_amt_i256;

        // Make sure the current CR isn't already too low
        require (FRAX.global_collateral_ratio() > min_cr, "Collateral ratio is already too low");

        // Make sure the FRAX minting wouldn't push the CR down too much
        // This is also a sanity check for the int256 math
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue()).mul(10 ** missing_decimals_collat);
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
        require (new_cr > min_cr, "Minting would cause collateral ratio to be too low");

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);
    }

    // Burn unneeded or excess FRAX
    function burnFRAX(int256 frax_amount) public onlyByOwnerOrGovernance {
        require(frax_amount > 0, "frax_amount must be positive");
        FRAX.burn(uint256(frax_amount));
        burned_sum_historical = burned_sum_historical + frax_amount;
    }

    /* ========== Olympus: Bonding ========== */
    // TODO

    /* ========== Olympus: Staking ========== */

    // OHM -> sOHM. E9
    function stakeOHM(uint256 ohm_amount) public onlyByOwnerOrGovernance {
        OHM.approve(address(stakingHelper), ohm_amount);
        stakingHelper.stake(ohm_amount);
    }

    // sOHM -> OHM. E9
    function unstakeOHM(uint256 sohm_amount, bool rebase) public onlyByOwnerOrGovernance {
        sOHM.approve(address(olympusStaking), sohm_amount);
        olympusStaking.unstake(sohm_amount, rebase);
    }

    /* ========== Swaps ========== */

    // FRAX -> OHM. E18 and E9
    function swapFRAXforOHM(uint256 frax_amount, uint256 min_ohm_out) external onlyByOwnerOrGovernance returns (uint256 ohm_spent, uint256 frax_received) {
        // Approve the FRAX for the router
        FRAX.approve(UNISWAP_ROUTER_ADDRESS, frax_amount);

        address[] memory FRAX_OHM_PATH = new address[](2);
        FRAX_OHM_PATH[0] = address(FRAX);
        FRAX_OHM_PATH[1] = address(OHM);

        // Buy some FRAX with OHM
        (uint[] memory amounts) = UniRouterV2.swapExactTokensForTokens(
            frax_amount,
            min_ohm_out,
            FRAX_OHM_PATH,
            address(this),
            2105300114 // Expiration: a long time from now
        );
        return (amounts[0], amounts[1]);
    }

    // OHM -> FRAX. E9 and E18
    function swapOHMforFRAX(uint256 ohm_amount, uint256 min_frax_out) external onlyByOwnerOrGovernance returns (uint256 ohm_spent, uint256 frax_received) {
        // Approve the OHM for the router
        OHM.approve(UNISWAP_ROUTER_ADDRESS, ohm_amount);

        address[] memory OHM_FRAX_PATH = new address[](2);
        OHM_FRAX_PATH[0] = address(OHM);
        OHM_FRAX_PATH[1] = address(FRAX);

        // Buy some FRAX with OHM
        (uint[] memory amounts) = UniRouterV2.swapExactTokensForTokens(
            ohm_amount,
            min_frax_out,
            OHM_FRAX_PATH,
            address(this),
            2105300114 // Expiration: a long time from now
        );
        return (amounts[0], amounts[1]);
    }

    /* ========== Custodian ========== */

    function withdrawRewards() public onlyCustodian {
        OHM.transfer(custodian_address, OHM.balanceOf(address(this)));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setCustodian(address _custodian_address) external onlyByOwnerOrGovernance {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setPool(address _pool_address) external onlyByOwnerOrGovernance {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setOverrideCollatBalance(bool _state, uint256 _balance) external onlyByOwnerOrGovernance {
        override_collat_balance = _state;
        override_collat_balance_amount = _balance;
    }

    function setMintCap(int256 _mint_cap) external onlyByOwnerOrGovernance {
        mint_cap = _mint_cap;
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnerOrGovernance {
        min_cr = _min_cr;
    }

    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        ERC20(tokenAddress).transfer(custodian_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);
}