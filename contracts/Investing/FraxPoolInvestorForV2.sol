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
// ======================= FraxPoolInvestorForV2 ======================
// ====================================================================


import "../Math/SafeMath.sol";
import "../FXS/FXS.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/Variants/Comp.sol";
import "../ERC20/Variants/RookToken.sol";
import "../ERC20/Variants/FarmToken.sol";
import "../ERC20/Variants/IDLEToken.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Governance/AccessControl.sol";
import "../Frax/Pools/FraxPool.sol";
import "./yearn/IyUSDC_V2_Partial.sol";
import "./aave/IAAVELendingPool_Partial.sol";
import "./aave/IAAVE_aUSDC_Partial.sol";
import "./bzx/IBZXFulcrum_Partial.sol";
import "./compound/IcUSDC_Partial.sol";
import "./keeper/IKEEPERLiquidityPool_V2.sol";
import "./keeper/IKToken.sol";
import "./harvest/IHARVESTDepositHelper_Partial.sol";
import "./harvest/IHARVESTNoMintRewardPool_Partial.sol";
import "./harvest/IHARVEST_fUSDC.sol";

// Lower APY: yearn, AAVE, Compound
// Higher APY: KeeperDAO, BZX, Harvest

contract FraxPoolInvestorForV2 is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    FRAXShares private FXS;
    FRAXStablecoin private FRAX;
    FraxPool private pool;

    // Pools and vaults
    IyUSDC_V2_Partial private yUSDC_V2 = IyUSDC_V2_Partial(0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9);
    IAAVELendingPool_Partial private aaveUSDC_Pool = IAAVELendingPool_Partial(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
    IAAVE_aUSDC_Partial private aaveUSDC_Token = IAAVE_aUSDC_Partial(0xBcca60bB61934080951369a648Fb03DF4F96263C);
    IBZXFulcrum_Partial private bzxFulcrum = IBZXFulcrum_Partial(0x32E4c68B3A4a813b710595AebA7f6B7604Ab9c15);
    IcUSDC_Partial private cUSDC = IcUSDC_Partial(0x39AA39c021dfbaE8faC545936693aC917d5E7563);
    IKEEPERLiquidityPool_V2 private keeperPool_V2 = IKEEPERLiquidityPool_V2(0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E);
    IHARVESTDepositHelper_Partial private harvestDepositHelper = IHARVESTDepositHelper_Partial(0xF8ce90c2710713552fb564869694B2505Bfc0846);
    IHARVESTNoMintRewardPool_Partial private harvestNoMintRewardPool = IHARVESTNoMintRewardPool_Partial(0x4F7c28cCb0F1Dbd1388209C67eEc234273C878Bd);
    IHARVEST_fUSDC private fUSDC = IHARVEST_fUSDC(0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE);
    IKToken private kUSDC = IKToken(0xac826952bc30504359a099c3a486d44E97415c77);

    // Reward Tokens
    Comp private COMP = Comp(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    RookToken private ROOK = RookToken(0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a);
    FarmToken private FARM = FarmToken(0xa0246c9032bC3A600820415aE600c6388619A14D);
    IDLEToken private IDLE = IDLEToken(0x875773784Af8135eA0ef43b5a374AaD105c5D39e);

    address public collateral_address;
    address public pool_address;
    address public owner_address;
    address public timelock_address;
    address public custodian_address;

    uint256 public immutable missing_decimals;

    // Max amount of collateral this contract can borrow from the FraxPool
    uint256 public borrow_cap = uint256(100000e6);

    // Amount the contract borrowed
    uint256 public borrowed_balance = 0;
    uint256 public borrowed_historical = 0;
    uint256 public paid_back_historical = 0;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian_address, "You are not the rewards custodian");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _frax_contract_address,
        address _fxs_contract_address,
        address _pool_address,
        address _collateral_address,
        address _owner_address,
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
        custodian_address = _owner_address;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /* ========== VIEWS ========== */

    function showAllocations() public returns (uint256[9] memory allocations) {
        // IMPORTANT
        // IMPORTANT
        // IMPORTANT
        // IMPORTANT
        // TODO: Make sure the entire function or contract does not brick if one of the external calls fails. Strategy boolean array?

        // All numbers given are assuming xyzUSDC, etc. is converted back to actual USDC
        allocations[0] = collateral_token.balanceOf(address(this)); // Unallocated
        allocations[1] = (yUSDC_V2.balanceOf(address(this))).mul(yUSDC_V2.pricePerShare()).div(1e6); // yearn
        allocations[2] = aaveUSDC_Token.balanceOf(address(this)); // AAVE
        allocations[3] = bzxFulcrum.assetBalanceOf(address(this)); // BZX
        allocations[4] = (cUSDC.balanceOf(address(this)).mul(cUSDC.exchangeRateStored()).div(1e18)); // Compound. Note that cUSDC is E8
        allocations[5] = keeperPool_V2.underlyingBalance(collateral_address, address(this)); // KeeperDAO
        allocations[6] = fUSDC.underlyingBalanceWithInvestmentForHolder(address(this)); // Harvest [Unstaked]
        allocations[7] = (harvestNoMintRewardPool.balanceOf(address(this))).mul(fUSDC.getPricePerFullShare()).div(1e6); // Harvest [Staked]
    
        uint256 sum_tally = 0;
        for (uint i = 1; i < 8; i++){ 
            if (allocations[i] > 0){
                sum_tally = sum_tally.add(allocations[i]);
            }
        }

        allocations[8] = sum_tally; // Harvest [Staked]
    }

    function showRewards() public returns (uint256[4] memory rewards) {
        // IMPORTANT
        // IMPORTANT
        // IMPORTANT
        // IMPORTANT

        // TODO: Make sure the entire function or contract does not brick if one of the external calls fails. Strategy boolean array?

        rewards[0] = COMP.balanceOf(address(this)); // COMP
        rewards[1] = ROOK.balanceOf(address(this)); // ROOK
        rewards[2] = IDLE.balanceOf(address(this)); // IDLE
        rewards[3] = FARM.balanceOf(address(this)); // FARM
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Needed for the Frax contract to function 
    function collatDollarBalance() public returns (uint256) {
        return borrowed_balance;
    }

    // This is basically a workaround to transfer USDC from the FraxPool to this investor contract
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called seperately later on
    function mintRedeemPart1(uint256 frax_amount) public onlyByOwnerOrGovernance {
        uint256 redemption_fee = pool.redemption_fee();
        uint256 col_price_usd = pool.getCollateralPrice();
        uint256 global_collateral_ratio = FRAX.global_collateral_ratio();
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(redemption_fee))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(global_collateral_ratio).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(col_price_usd);

        require(borrowed_balance.add(expected_collat_amount) <= borrow_cap, "Borrow cap reached");
        borrowed_balance = borrowed_balance.add(expected_collat_amount);
        borrowed_historical = borrowed_historical.add(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() public onlyByOwnerOrGovernance {
        pool.collectRedemption();
    }

    function giveCollatBack(uint256 amount) public onlyByOwnerOrGovernance {
        // Still paying back principal
        if (amount <= borrowed_balance) {
            borrowed_balance = borrowed_balance.sub(amount);
        }
        // Pure profits
        else {
            borrowed_balance = 0;
        }
        paid_back_historical = paid_back_historical.add(amount);
        collateral_token.transfer(address(pool), amount);
    }
   
    function burnFXS(uint256 amount) public onlyByOwnerOrGovernance {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    /* ========== yearn V2 ========== */

    function yDepositUSDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(yUSDC_V2), USDC_amount);
        yUSDC_V2.deposit(USDC_amount);
    }

    function yWithdrawUSDC(uint256 yUSDC_amount) public onlyByOwnerOrGovernance {
        yUSDC_V2.withdraw(yUSDC_amount);
    }

    /* ========== AAVE V2 ========== */

    function aaveDepositUSDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(aaveUSDC_Pool), USDC_amount);
        aaveUSDC_Pool.deposit(collateral_address, USDC_amount, address(this), 0);
    }

    function aaveWithdrawUSDC(uint256 aUSDC_amount) public onlyByOwnerOrGovernance {
        aaveUSDC_Pool.withdraw(collateral_address, aUSDC_amount, address(this));
    }

    /* ========== BZX Fulcrum ========== */

    function bzxMint_iUSDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(bzxFulcrum), USDC_amount);
        bzxFulcrum.mint(address(this), USDC_amount);
    }

    function bzxBurn_iUSDC(uint256 iUSDC_amount) public onlyByOwnerOrGovernance {
        bzxFulcrum.burn(address(this), iUSDC_amount);
    }

    /* ========== Compound cUSDC + COMP ========== */

    function compoundMint_cUSDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(cUSDC), USDC_amount);
        cUSDC.mint(USDC_amount);
    }

    function compoundRedeem_cUSDC(uint256 cUSDC_amount) public onlyByOwnerOrGovernance {
        // NOTE that cUSDC is E8, NOT E6
        cUSDC.redeem(cUSDC_amount);
    }

    /* ========== KeeperDAO kUSDC + ROOK ========== */

    // Note that this has a deposit fee
    function keeperDeposit_USDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(keeperPool_V2), USDC_amount);
        keeperPool_V2.deposit(collateral_address, USDC_amount);
    }

    function keeperWithdraw_kUSDC(uint256 kUSDC_amount) public onlyByOwnerOrGovernance {
        kUSDC.approve(address(keeperPool_V2), kUSDC_amount);
        keeperPool_V2.withdraw(payable(address(this)), kUSDC, kUSDC_amount);
    }

    /* ========== Harvest fUSDC + FARM + COMP + IDLE ========== */

    function harvestDeposit_USDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(harvestDepositHelper), USDC_amount);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = USDC_amount;
        address[] memory addresses = new address[](1);
        addresses[0] = address(fUSDC);
        harvestDepositHelper.depositAll(amounts, addresses);
    }

    function harvestStake_fUSDC(uint256 fUSDC_amount) public onlyByOwnerOrGovernance {
        fUSDC.approve(address(harvestNoMintRewardPool), fUSDC_amount);
        harvestNoMintRewardPool.stake(fUSDC_amount);
    }

    function harvestWithdrawStake_fUSDC(uint256 fUSDC_amount) public onlyByOwnerOrGovernance {
        harvestNoMintRewardPool.withdraw(fUSDC_amount);
    }

    function harvestGetRewardsForStake_fUSDC() public onlyByOwnerOrGovernance {
        // This gets FARM, IDLE, and COMP tokens
        harvestNoMintRewardPool.getReward();
    }

    function harvestExitStake_fUSDC() public onlyByOwnerOrGovernance {
        harvestNoMintRewardPool.exit();
    }

    function harvestWithdraw_fUSDC_for_USDC(uint256 fUSDC_amount) public onlyByOwnerOrGovernance {
        fUSDC.withdraw(fUSDC_amount);
    }

    /* ========== Custodian ========== */

    function withdrawRewards(
        uint256 comp_amount, 
        uint256 rook_amount, 
        uint256 idle_amount, 
        uint256 farm_amount
    ) public onlyCustodian {
        // IMPORTANT
        // IMPORTANT
        // IMPORTANT
        // IMPORTANT
        // TODO: Make sure the entire function or contract does not brick if one of the external calls fails. Strategy boolean array?

        if (comp_amount > 0) COMP.transfer(custodian_address, comp_amount);
        if (rook_amount > 0) ROOK.transfer(custodian_address, rook_amount);
        if (idle_amount > 0) IDLE.transfer(custodian_address, idle_amount);
        if (farm_amount > 0) FARM.transfer(custodian_address, farm_amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

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

    function setBorrowCap(uint256 _borrow_cap) external onlyByOwnerOrGovernance {
        borrow_cap = _borrow_cap;
    }

    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // require(tokenAddress != address(collateral_address));
        ERC20(tokenAddress).transfer(owner_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    // TODO
    // IMPORTANT
    // IMPORTANT
    // IMPORTANT
    // IMPORTANT
    // function setAllowedStrategies
    // add in an array of allowed strategies as a failsafe and put checks in all the functions above, or at least
    // ones where a perma-brick could occur.

    /* ========== EVENTS ========== */

    // TODO
    // ADD MORE EVENTS
    // ADD MORE EVENTS
    // ADD MORE EVENTS
    // ADD MORE EVENTS

    event Recovered(address token, uint256 amount);

}