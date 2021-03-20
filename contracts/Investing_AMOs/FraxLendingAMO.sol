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
// ========================== FraxLendingAMO ==========================
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
import "../Oracle/UniswapPairOracle.sol";
import "../Governance/AccessControl.sol";
import "../Frax/Pools/FraxPool.sol";
import "./cream/ICREAM_crFRAX.sol";
import "./finnexus/IFNX_CFNX.sol";
import "./finnexus/IFNX_FPT_FRAX.sol";
import "./finnexus/IFNX_FPT_B.sol";
import "./finnexus/IFNX_IntegratedStake.sol";
import "./finnexus/IFNX_MinePool.sol";
import "./finnexus/IFNX_TokenConverter.sol";
import "./finnexus/IFNX_ManagerProxy.sol";
import "./finnexus/IFNX_Oracle.sol";


contract FraxLendingAMO is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    FRAXShares private FXS;
    FRAXStablecoin private FRAX;
    FraxPool private pool;

    // Cream
    ICREAM_crFRAX private crFRAX = ICREAM_crFRAX(0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5);

    // FinNexus
    // More addresses: https://github.com/FinNexus/FinNexus-Documentation/blob/master/content/developers/smart-contracts.md
    IFNX_FPT_FRAX private fnxFPT_FRAX = IFNX_FPT_FRAX(0x39ad661bA8a7C9D3A7E4808fb9f9D5223E22F763);
    IFNX_FPT_B private fnxFPT_B = IFNX_FPT_B(0x7E605Fb638983A448096D82fFD2958ba012F30Cd);
    IFNX_IntegratedStake private fnxIntegratedStake = IFNX_IntegratedStake(0x23e54F9bBe26eD55F93F19541bC30AAc2D5569b2);
    IFNX_MinePool private fnxMinePool = IFNX_MinePool(0x4e6005396F80a737cE80d50B2162C0a7296c9620);
    IFNX_TokenConverter private fnxTokenConverter = IFNX_TokenConverter(0x955282b82440F8F69E901380BeF2b603Fba96F3b);
    IFNX_ManagerProxy private fnxManagerProxy = IFNX_ManagerProxy(0xa2904Fd151C9d9D634dFA8ECd856E6B9517F9785);
    IFNX_Oracle private fnxOracle = IFNX_Oracle(0x43BD92bF3Bb25EBB3BdC2524CBd6156E3Fdd41F3);

    // Reward Tokens
    IFNX_CFNX private CFNX = IFNX_CFNX(0x9d7beb4265817a4923FAD9Ca9EF8af138499615d);
    ERC20 private FNX = ERC20(0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B);

    address public collateral_address;
    address public pool_address;
    address public owner_address;
    address public timelock_address;
    address public custodian_address;

    uint256 public immutable missing_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max amount of FRAX this contract mint
    uint256 public mint_cap = uint256(100000e18);

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 850000;

    // Amount the contract borrowed
    uint256 public minted_sum_historical = 0;
    uint256 public burned_sum_historical = 0;

    // Allowed strategies (can eventually be made into an array)
    bool public allow_cream = true;
    bool public allow_finnexus = true;

    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _pool_address,
        address _collateral_address,
        address _owner_address,
        address _custodian_address,
        address _timelock_address
    ) public {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXS = FRAXShares(_fxs_contract_address);
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
        collateral_address = _collateral_address;
        collateral_token = ERC20(_collateral_address);
        timelock_address = _timelock_address;
        owner_address = _owner_address;
        custodian_address = _custodian_address;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
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

        // All numbers given are in FRAX unless otherwise stated
        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        allocations[1] = (crFRAX.balanceOf(address(this)).mul(crFRAX.exchangeRateStored()).div(1e18)); // Cream
        allocations[2] = (fnxMinePool.getUserFPTABalance(address(this))).mul(1e8).div(fnxManagerProxy.getTokenNetworth()); // Staked FPT-FRAX
        allocations[3] = (fnxFPT_FRAX.balanceOf(address(this))).mul(1e8).div(fnxManagerProxy.getTokenNetworth()); // Free FPT-FRAX
        allocations[4] = fnxTokenConverter.lockedBalanceOf(address(this)); // Unwinding CFNX
        allocations[5] = fnxTokenConverter.getClaimAbleBalance(address(this)); // Claimable Unwound FNX
        allocations[6] = FNX.balanceOf(address(this)); // Free FNX

        uint256 sum_fnx = allocations[4];
        sum_fnx = sum_fnx.add(allocations[5]);
        sum_fnx = sum_fnx.add(allocations[6]);
        allocations[7] = sum_fnx; // Total FNX possessed in various forms

        uint256 sum_frax = allocations[0];
        sum_frax = sum_frax.add(allocations[1]);
        sum_frax = sum_frax.add(allocations[2]);
        sum_frax = sum_frax.add(allocations[3]);
        allocations[8] = sum_frax; // Total FRAX possessed in various forms
    }

    function showRewards() external view returns (uint256[1] memory rewards) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if FNX.balanceOf() fails
        rewards[0] = FNX.balanceOf(address(this)); // FNX
    }

    // In FRAX
    function mintedBalance() public view returns (uint256){
        if (minted_sum_historical >= burned_sum_historical) return minted_sum_historical.sub(burned_sum_historical);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Needed for the Frax contract to not brick
    function collatDollarBalance() external view returns (uint256) {
        return 1e18; // 1 USDC
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFRAXForInvestments(uint256 frax_amount) public onlyByOwnerOrGovernance {
        uint256 borrowed_balance = mintedBalance();

        // Make sure you aren't minting more than the mint cap
        require(borrowed_balance.add(frax_amount) <= mint_cap, "Borrow cap reached");
        minted_sum_historical = minted_sum_historical.add(frax_amount);

        // Make sure the current CR isn't already too low
        require (FRAX.global_collateral_ratio() > min_cr, "Collateral ratio is already too low");

        // Make sure the FRAX minting wouldn't push the CR down too much
        uint256 current_collateral_E18 = (FRAX.globalCollateralValue()).mul(10 ** missing_decimals);
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
        require (new_cr > min_cr, "Minting would cause collateral ratio to be too low");

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);
    }

    // Give USDC profits back
    function giveCollatBack(uint256 amount) public onlyByOwnerOrGovernance {
        collateral_token.transfer(address(pool), amount);
    }
   
    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 frax_amount) public onlyByOwnerOrGovernance {
        FRAX.burn(frax_amount);
        burned_sum_historical = burned_sum_historical.add(frax_amount);
    }

    // Burn unneeded FXS
    function burnFXS(uint256 amount) public onlyByOwnerOrGovernance {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    /* ==================== CREAM ==================== */

    // E18
    function creamDeposit_FRAX(uint256 FRAX_amount) public onlyByOwnerOrGovernance {
        require(allow_cream, 'Cream strategy is disabled');
        FRAX.approve(address(crFRAX), FRAX_amount);
        require(crFRAX.mint(FRAX_amount) == 0, 'Mint failed');
    }

    // E18
    function creamWithdraw_FRAX(uint256 FRAX_amount) public onlyByOwnerOrGovernance {
        require(crFRAX.redeemUnderlying(FRAX_amount) == 0, 'RedeemUnderlying failed');
    }

    // E8
    function creamWithdraw_crFRAX(uint256 crFRAX_amount) public onlyByOwnerOrGovernance {
        require(crFRAX.redeem(crFRAX_amount) == 0, 'Redeem failed');
    }

    /* ==================== FinNexus ==================== */
    
    /* --== Staking ==-- */

    function fnxIntegratedStakeFPTs_FRAX_FNX(uint256 FRAX_amount, uint256 FNX_amount, uint256 lock_period) public onlyByOwnerOrGovernance {
        require(allow_finnexus, 'FinNexus strategy is disabled');
        FRAX.approve(address(fnxIntegratedStake), FRAX_amount);
        FNX.approve(address(fnxIntegratedStake), FNX_amount);
        
        address[] memory fpta_tokens = new address[](1);
        uint256[] memory fpta_amounts = new uint256[](1);
        address[] memory fptb_tokens = new address[](1);
        uint256[] memory fptb_amounts = new uint256[](1);

        fpta_tokens[0] = address(FRAX);
        fpta_amounts[0] = FRAX_amount;
        fptb_tokens[0] = address(FNX);
        fptb_amounts[0] = FNX_amount;

        fnxIntegratedStake.stake(fpta_tokens, fpta_amounts, fptb_tokens, fptb_amounts, lock_period);
    }

    // FPT-FRAX : FPT-B = 10:1 is the best ratio for staking. You can get it using the prices.
    function fnxStakeFRAXForFPT_FRAX(uint256 FRAX_amount, uint256 lock_period) public onlyByOwnerOrGovernance {
        require(allow_finnexus, 'FinNexus strategy is disabled');
        FRAX.approve(address(fnxIntegratedStake), FRAX_amount);

        address[] memory fpta_tokens = new address[](1);
        uint256[] memory fpta_amounts = new uint256[](1);
        address[] memory fptb_tokens = new address[](0);
        uint256[] memory fptb_amounts = new uint256[](0);

        fpta_tokens[0] = address(FRAX);
        fpta_amounts[0] = FRAX_amount;

        fnxIntegratedStake.stake(fpta_tokens, fpta_amounts, fptb_tokens, fptb_amounts, lock_period);
    }

    /* --== Collect CFNX ==-- */

    function fnxCollectCFNX() public onlyByOwnerOrGovernance {
        uint256 claimable_cfnx = fnxMinePool.getMinerBalance(address(this), address(CFNX));
        fnxMinePool.redeemMinerCoin(address(CFNX), claimable_cfnx);
    }

    /* --== UnStaking ==-- */

    // FPT-FRAX = Staked FRAX
    function fnxUnStakeFPT_FRAX(uint256 FPT_FRAX_amount) public onlyByOwnerOrGovernance {
        fnxMinePool.unstakeFPTA(FPT_FRAX_amount);
    }

    // FPT-B = Staked FNX
    function fnxUnStakeFPT_B(uint256 FPT_B_amount) public onlyByOwnerOrGovernance {
        fnxMinePool.unstakeFPTB(FPT_B_amount);
    }

    /* --== Unwrapping LP Tokens ==-- */

    // FPT-FRAX = Staked FRAX
    function fnxUnRedeemFPT_FRAXForFRAX(uint256 FPT_FRAX_amount) public onlyByOwnerOrGovernance {
        fnxFPT_FRAX.approve(address(fnxManagerProxy), FPT_FRAX_amount);
        fnxManagerProxy.redeemCollateral(FPT_FRAX_amount, address(FRAX));
    }

    // FPT-B = Staked FNX
    function fnxUnStakeFPT_BForFNX(uint256 FPT_B_amount) public onlyByOwnerOrGovernance {
        fnxFPT_B.approve(address(fnxManagerProxy), FPT_B_amount);
        fnxManagerProxy.redeemCollateral(FPT_B_amount, address(FNX));
    }

    /* --== Convert CFNX to FNX ==-- */
    
    // Has to be done in batches, since it unlocks over several months
    function fnxInputCFNXForUnwinding() public onlyByOwnerOrGovernance {
        uint256 cfnx_amount = CFNX.balanceOf(address(this));
        CFNX.approve(address(fnxTokenConverter), cfnx_amount);
        fnxTokenConverter.inputCfnxForInstallmentPay(cfnx_amount);
    }

    function fnxClaimFNX_From_CFNX() public onlyByOwnerOrGovernance {
        fnxTokenConverter.claimFnxExpiredReward();
    }

    /* --== Combination Functions ==-- */
    
    function fnxCFNXCollectConvertUnwind() public onlyByOwnerOrGovernance {
        fnxCollectCFNX();
        fnxInputCFNXForUnwinding();
        fnxClaimFNX_From_CFNX();
    }

    /* ========== Custodian ========== */

    function withdrawRewards() public onlyCustodian {
        FNX.transfer(custodian_address, FNX.balanceOf(address(this)));
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

    function setMintCap(uint256 _mint_cap) external onlyByOwnerOrGovernance {
        mint_cap = _mint_cap;
    }

    function setMinimumCollateralRatio(uint256 _min_cr) external onlyByOwnerOrGovernance {
        min_cr = _min_cr;
    }

    function setAllowedStrategies(bool _cream, bool _finnexus) external onlyByOwnerOrGovernance {
        allow_cream = _cream;
        allow_finnexus = _finnexus;
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