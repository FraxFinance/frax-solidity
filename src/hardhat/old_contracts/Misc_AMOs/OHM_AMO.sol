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
import '../Uniswap/Interfaces/IUniswapV2Router02.sol';
import '../Uniswap/Interfaces/IUniswapV2Pair.sol';
import "../Proxy/Initializable.sol";
import "../Staking/Owned.sol";

// The AMO needs to have 
// 1) Mint FRAX -> Bond (coming next week) -> Collect OHM rewards
// 2) Stake OHM and be able to collect rewards and also withdraw the staked OHM
// 3) Collect OHM rewards and send to custodian
// 4) Sell OHM for FRAX

contract OHM_AMO is Initializable, Owned {
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
    IUniswapV2Pair private UNI_OHM_FRAX_PAIR;
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

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
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
        sOHM = IsOlympus(0x04F2694C8fcee23e8Fd0dfEA1d4f5Bb8c352111F);
        stakingHelper = IStakingHelper(0xC8C436271f9A6F10a5B80c8b8eD7D0E8f37a612d);
        olympusStaking = IOlympusStaking(0xFd31c7d00Ca47653c6Ce64Af53c1571f9C36566a);
        bondDepository = IOlympusBondDepository(0x8510c8c2B6891E04864fa196693D44E6B6ec2514);

        // Uniswap
        UNISWAP_ROUTER_ADDRESS = payable(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        UniRouterV2 = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
        UNI_OHM_FRAX_PAIR = IUniswapV2Pair(0x2dcE0dDa1C2f98e0F171DE8333c3c6Fe1BbF4877);

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

    function showAllocations() public view returns (uint256[5] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        // Call once to save gas
        (uint256 spot_price_ohm_raw, ) = spotPriceOHM();

        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        allocations[1] = OHM.balanceOf(address(this)).mul(spot_price_ohm_raw); // OHM
        allocations[2] = sOHM.balanceOf(address(this)).mul(spot_price_ohm_raw); // sOHM
        allocations[3] = (bondDepository.pendingPayoutFor(address(this))).mul(spot_price_ohm_raw); // Claimable OHM from bonding
    
        uint256 sum_tally = 0;
        for (uint i = 0; i < 4; i++){ 
            if (allocations[i] > 0){
                sum_tally = sum_tally.add(allocations[i]);
            }
        }

        allocations[4] = sum_tally; // Total Staked
    }

    function showSOHMRewards() external view returns (uint256) {
        return sOHM.balanceOf(address(this));
    }

    function spotPriceOHM() public view returns (uint256 frax_per_ohm_raw, uint256 frax_per_ohm) {
        (uint256 reserve0, uint256 reserve1, ) = (UNI_OHM_FRAX_PAIR.getReserves());

        // OHM = token0, FRAX = token1
        frax_per_ohm_raw = reserve1.div(reserve0);
        frax_per_ohm = reserve1.mul(PRICE_PRECISION).div(reserve0.mul(10 ** missing_decimals_ohm));
    }

    // In FRAX, can be negative
    function mintedBalance() public view returns (int256) {
        return minted_sum_historical - burned_sum_historical;
    }

    // In FRAX, can be negative
    function accumulatedProfit() public view returns (int256) {
        return int256(showAllocations()[4]) - mintedBalance();
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
            return (showAllocations()[4]);
        }
        
    }

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFRAXForInvestments(uint256 frax_amount) public onlyByOwnGov {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the mint cap
        require((mintedBalance() + frax_amt_i256) <= mint_cap, "Mint cap reached");
        minted_sum_historical = minted_sum_historical + frax_amt_i256;

        // Make sure the current CR isn't already too low
        require(FRAX.global_collateral_ratio() > min_cr, "CR already too low");

        // Make sure the FRAX minting wouldn't push the CR down too much
        // This is also a sanity check for the int256 math
        uint256 current_collateral_E18 = FRAX.globalCollateralValue();
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
        require(new_cr > min_cr, "CR would be too low");

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);
    }

    // Burn unneeded or excess FRAX
    function burnFRAX(int256 frax_amount) public onlyByOwnGov {
        require(frax_amount > 0, "frax_amount must be positive");
        FRAX.burn(uint256(frax_amount));
        burned_sum_historical = burned_sum_historical + frax_amount;
    }

    /* ========== Olympus: Bonding ========== */

    function bondFRAX(uint256 frax_amount) public onlyByOwnGov {
        FRAX.approve(address(bondDepository), frax_amount);
        bondDepository.deposit(frax_amount, bondDepository.bondPrice(), address(this));
    }

    function redeemBondedFRAX(bool stake) public onlyByOwnGov {
        bondDepository.redeem(address(this), stake);
    }

    function bondInfo() public view returns (uint256 pendingPayout, uint256 percentVested) {
        pendingPayout = bondDepository.pendingPayoutFor(address(this));
        percentVested = bondDepository.percentVestedFor(address(this));
    }

    /* ========== Olympus: Staking ========== */

    // OHM -> sOHM. E9
    // Calls stake and claim together
    function stakeOHM_WithHelper(uint256 ohm_amount) public onlyByOwnGov {
        OHM.approve(address(stakingHelper), ohm_amount);
        stakingHelper.stake(ohm_amount);
    }

    // OHM -> sOHM. E9
    // Stake only, no claim
    function stakeOHM_NoHelper(uint256 ohm_amount) public onlyByOwnGov {
        OHM.approve(address(olympusStaking), ohm_amount);
        olympusStaking.stake(ohm_amount, address(this));
    }

    // Claim the OHM
    function claimOHM() public onlyByOwnGov {
        olympusStaking.claim(address(this));
    }

    // sOHM -> OHM. E9
    // The contract is set up with a warmup period, where user has to stake for some number of epochs before they can 
    // get the sOHM. If they unstake before then they only get the deposit.
    // They earn during warmup period though just can't get rewards before it.
    function unstakeOHM(uint256 sohm_amount, bool rebase) public onlyByOwnGov {
        sOHM.approve(address(olympusStaking), sohm_amount);
        olympusStaking.unstake(sohm_amount, rebase);
    }

    // Forfeit takes back the OHM before the warmup is over
    function forfeitOHM() public onlyByOwnGov {
        olympusStaking.forfeit();
    }

    // toggleDepositLock() prevents new stakes from being added to the address
    // Anyone can stake for you and it delays the warmup so if someone were to do so maliciously 
    // you'd just toggle that until warmup is done.
    function toggleDepositLock() public onlyByOwnGov {
        olympusStaking.toggleDepositLock();
    }

    /* ========== Swaps ========== */

    // FRAX -> OHM. E18 and E9
    function swapFRAXforOHM(uint256 frax_amount, uint256 min_ohm_out) external onlyByOwnGov returns (uint256 ohm_spent, uint256 frax_received) {
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
            block.timestamp + 604800 // Expiration: 7 days from now
        );
        return (amounts[0], amounts[1]);
    }

    // OHM -> FRAX. E9 and E18
    function swapOHMforFRAX(uint256 ohm_amount, uint256 min_frax_out) external onlyByOwnGov returns (uint256 ohm_spent, uint256 frax_received) {
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
            block.timestamp + 604800 // Expiration: 7 days from now
        );
        return (amounts[0], amounts[1]);
    }

    /* ========== Custodian ========== */

    function withdrawRewards() public onlyCustodian {
        OHM.transfer(custodian_address, OHM.balanceOf(address(this)));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setPool(address _pool_address) external onlyByOwnGov {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setOverrideCollatBalance(bool _state, uint256 _balance) external onlyByOwnGov {
        override_collat_balance = _state;
        override_collat_balance_amount = _balance;
    }

    function setMintCap(uint256 _mint_cap) external onlyByOwnGov {
        mint_cap = int256(_mint_cap);
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnGov {
        min_cr = _min_cr;
    }

    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        ERC20(tokenAddress).transfer(custodian_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);
}