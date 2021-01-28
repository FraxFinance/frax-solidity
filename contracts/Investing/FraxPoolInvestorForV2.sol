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
import "../Oracle/UniswapPairOracle.sol";
import "../Governance/AccessControl.sol";
import "../Frax/Pools/FraxPool.sol";
import "./yearn/IyUSDC_V2_Partial.sol";
import "./aave/IAAVELendingPoolV2_Partial.sol";
import "./bzx/IBZXFulcrum_Partial.sol";
import "./compound/IcUSDC_Partial.sol";


contract FraxPoolInvestorForV2 is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    FRAXShares private FXS;
    FRAXStablecoin private FRAX;
    FraxPool private pool;
    IyUSDC_V2_Partial private yUSDC_V2 = IyUSDC_V2_Partial(0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9);
    IAAVELendingPoolV2_Partial private aaveUSDC_V2 = IAAVELendingPoolV2_Partial(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
    IBZXFulcrum_Partial private bzxFulcrum = IBZXFulcrum_Partial(0x32E4c68B3A4a813b710595AebA7f6B7604Ab9c15);
    IcUSDC_Partial private cUSDC = IcUSDC_Partial(0x39AA39c021dfbaE8faC545936693aC917d5E7563);
    Comp private COMP = Comp(0xc00e94Cb662C3520282E6f5717214004A7f26888);

    address public collateral_address;
    address public pool_address;
    address public owner_address;
    address public timelock_address;
    address public misc_rewards_custodian;

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
        misc_rewards_custodian = _owner_address;
        missing_decimals = uint(18).sub(collateral_token.decimals());
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /* ========== VIEWS ========== */

    // BuyAndBurnFXS

    /* ========== PUBLIC FUNCTIONS ========== */

    // Needed for the Frax contract to function 
    function collatDollarBalance() public returns (uint256) {
        return borrowed_balance;
    }

    // This is basically a trick to transfer the USDC from the FraxPool
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called separately later on
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
        collateral_token.approve(address(aaveUSDC_V2), USDC_amount);
        aaveUSDC_V2.deposit(collateral_address, USDC_amount, address(this), 0);
    }

    function aaveWithdrawUSDC(uint256 aUSDC_amount) public onlyByOwnerOrGovernance {
        aaveUSDC_V2.withdraw(collateral_address, aUSDC_amount, address(this));
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

    function compMint_cUSDC(uint256 USDC_amount) public onlyByOwnerOrGovernance {
        collateral_token.approve(address(cUSDC), USDC_amount);
        cUSDC.mint(USDC_amount);
    }

    function compRedeemUnderlying_cUSDC(uint256 cUSDC_amount) public onlyByOwnerOrGovernance {
        cUSDC.redeemUnderlying(cUSDC_amount);
    }

    function compWithdrawCOMP(uint256 comp_amount) public onlyByOwnerOrGovernance {
        COMP.transfer(misc_rewards_custodian, comp_amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setMiscRewardsCustodian(address _misc_rewards_custodian) external onlyByOwnerOrGovernance {
        misc_rewards_custodian = _misc_rewards_custodian;
    }

    function setPool(address _pool_address) external onlyByOwnerOrGovernance {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setBorrowCap(uint256 _borrow_cap) external onlyByOwnerOrGovernance {
        borrow_cap = _borrow_cap;
    }

    /* ========== EVENTS ========== */

}
