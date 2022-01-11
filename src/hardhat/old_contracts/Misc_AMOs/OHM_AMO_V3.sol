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
// ============================ OHM_AMO_V3 ============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/Variants/Comp.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
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

contract OHM_AMO_V3 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // FRAX related
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFraxAMOMinter private amo_minter;
    address public timelock_address;
    address public custodian_address;

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

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        owner = _owner_address;
        FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
        amo_minter = IFraxAMOMinter(_amo_minter_address);

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

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();
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

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[4];
        collat_val_e18 = (frax_val_e18).mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    // Backwards compatibility
    function accumulatedProfit() public view returns (int256) {
        return int256(showAllocations()[4]) - mintedBalance();
    }
    
    /* ========== Burns and givebacks ========== */

    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    /* ========== Olympus: Bonding ========== */

    function bondFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(bondDepository), frax_amount);
        bondDepository.deposit(frax_amount, bondDepository.bondPrice(), address(this));
    }

    function redeemBondedFRAX(bool stake) public onlyByOwnGovCust {
        bondDepository.redeem(address(this), stake);
    }

    function bondInfo() public view returns (uint256 pendingPayout, uint256 percentVested) {
        pendingPayout = bondDepository.pendingPayoutFor(address(this));
        percentVested = bondDepository.percentVestedFor(address(this));
    }

    /* ========== Olympus: Staking ========== */

    // OHM -> sOHM. E9
    // Calls stake and claim together
    function stakeOHM_WithHelper(uint256 ohm_amount) public onlyByOwnGovCust {
        OHM.approve(address(stakingHelper), ohm_amount);
        stakingHelper.stake(ohm_amount);
    }

    // OHM -> sOHM. E9
    // Stake only, no claim
    function stakeOHM_NoHelper(uint256 ohm_amount) public onlyByOwnGovCust {
        OHM.approve(address(olympusStaking), ohm_amount);
        olympusStaking.stake(ohm_amount, address(this));
    }

    // Claim the OHM
    function claimOHM() public onlyByOwnGovCust {
        olympusStaking.claim(address(this));
    }

    // sOHM -> OHM. E9
    // The contract is set up with a warmup period, where user has to stake for some number of epochs before they can 
    // get the sOHM. If they unstake before then they only get the deposit.
    // They earn during warmup period though just can't get rewards before it.
    function unstakeOHM(uint256 sohm_amount, bool rebase) public onlyByOwnGovCust {
        sOHM.approve(address(olympusStaking), sohm_amount);
        olympusStaking.unstake(sohm_amount, rebase);
    }

    // Forfeit takes back the OHM before the warmup is over
    function forfeitOHM() public onlyByOwnGovCust {
        olympusStaking.forfeit();
    }

    // toggleDepositLock() prevents new stakes from being added to the address
    // Anyone can stake for you and it delays the warmup so if someone were to do so maliciously 
    // you'd just toggle that until warmup is done.
    function toggleDepositLock() public onlyByOwnGovCust {
        olympusStaking.toggleDepositLock();
    }

    /* ========== Swaps ========== */

    // FRAX -> OHM. E18 and E9
    function swapFRAXforOHM(uint256 frax_amount, uint256 min_ohm_out) external onlyByOwnGovCust returns (uint256 ohm_spent, uint256 frax_received) {
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
    function swapOHMforFRAX(uint256 ohm_amount, uint256 min_frax_out) external onlyByOwnGovCust returns (uint256 ohm_spent, uint256 frax_received) {
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

    /* ========== Rewards ========== */

    function withdrawRewards() public onlyByOwnGovCust {
        OHM.transfer(msg.sender, OHM.balanceOf(address(this)));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setAMOMinter(address _amo_minter_address) external onlyByOwnGov {
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();

        // Make sure the new addresses are not address(0)
        require(custodian_address != address(0) && timelock_address != address(0), "Invalid custodian or timelock");
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
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