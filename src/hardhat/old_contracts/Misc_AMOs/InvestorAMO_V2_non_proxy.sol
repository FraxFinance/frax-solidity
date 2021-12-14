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
// ========================== InvestorAMO_V3 ==========================
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
import '../Uniswap/TransferHelper.sol';
import "./yearn/IyUSDC_V2_Partial.sol";
import "./aave/IAAVELendingPool_Partial.sol";
import "./aave/IAAVE_aUSDC_Partial.sol";
import "./aave/IStakedAave.sol";
import "./aave/IAaveIncentivesControllerPartial.sol";
import "./compound/IComptroller.sol";
import "./compound/IcUSDC_Partial.sol";

// Lower APY: yearn, AAVE, Compound
// Higher APY: KeeperDAO, BZX, Harvest

contract InvestorAMO_V3_non_proxy is AccessControl {
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
    IcUSDC_Partial private cUSDC = IcUSDC_Partial(0x39AA39c021dfbaE8faC545936693aC917d5E7563);

    // Reward Tokens
    Comp private COMP = Comp(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    ERC20 private AAVE = ERC20(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9);
    IStakedAave private stkAAVE = IStakedAave(0x4da27a545c0c5B758a6BA100e3a049001de870f5);
    IComptroller private CompController = IComptroller(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);
    IAaveIncentivesControllerPartial private AAVEIncentivesController = IAaveIncentivesControllerPartial(0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5);

    address public collateral_address;
    address public pool_address;
    address public owner_address;
    address public timelock_address;
    address public custodian_address;
    address public weth_address = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint256 public immutable missing_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max amount of collateral this contract can borrow from the FraxPool
    uint256 public borrow_cap = uint256(20000e6);

    // Amount the contract borrowed
    uint256 public borrowed_balance = 0;
    uint256 public borrowed_historical = 0;
    uint256 public paid_back_historical = 0;

    // Allowed strategies (can eventually be made into an array)
    bool public allow_yearn = true;
    bool public allow_aave = true;
    bool public allow_compound = true;

    // CollatDollarBalance
    bool useAllocationsForCollatDB = true;
    
    // Constants
    uint256 public constant MAX_UINT256 = type(uint256).max;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "Not owner or timelock");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian_address, "You are not the rewards custodian");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _frax_contract_address,
        address _fxs_contract_address,
        address _pool_address,
        address _collateral_address,
        address _owner_address,
        address _custodian_address,
        address _timelock_address
    ) {
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

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[5] memory allocations) {
        // All numbers given are assuming xyzUSDC, etc. is converted back to actual USDC
        allocations[0] = collateral_token.balanceOf(address(this)); // Unallocated
        allocations[1] = (yUSDC_V2.balanceOf(address(this))).mul(yUSDC_V2.pricePerShare()).div(1e6); // yearn
        allocations[2] = aaveUSDC_Token.balanceOf(address(this)); // AAVE
        allocations[3] = (cUSDC.balanceOf(address(this)).mul(cUSDC.exchangeRateStored()).div(1e18)); // Compound. Note that cUSDC is E8

        uint256 sum_tally = 0;
        for (uint i = 1; i < 5; i++){ 
            if (allocations[i] > 0){
                sum_tally = sum_tally.add(allocations[i]);
            }
        }

        allocations[4] = sum_tally; // Total Staked
    }

    function showRewards() external view returns (uint256[3] memory rewards) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if COMP.balanceOf() fails
        rewards[0] = COMP.balanceOf(address(this)); // COMP
        rewards[1] = stkAAVE.balanceOf(address(this)); // stkAAVE
        rewards[2] = AAVE.balanceOf(address(this)); // AAVE
    }

    // Return the cooldown end time
    function aaveCooldown_Show_Cooldowns() external view returns (uint256) {
        return stkAAVE.stakersCooldowns(address(this));
    }

    // Return the cooldown end time
    function aaveCooldown_Time_Left() external view returns (int256) {
        uint256 cooldown_length = stkAAVE.COOLDOWN_SECONDS();
        uint256 cooldown_end = stkAAVE.stakersCooldowns(address(this)) + cooldown_length;

        return (int256(cooldown_end) - int256(block.timestamp));
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Needed for the Frax contract to function 
    function collatDollarBalance() external view returns (uint256) {
        // Needs to mimic the FraxPool value and return in E18
        // Only thing different should be borrowed_balance vs balanceOf()
        if (useAllocationsForCollatDB){
            return ((showAllocations())[4]).mul(10 ** missing_decimals);
        } 
        else if (pool.collateralPricePaused() == true){
            return borrowed_balance.mul(10 ** missing_decimals).mul(pool.pausedPrice()).div(PRICE_PRECISION);
        }
        else {
            uint256 eth_usd_price = FRAX.eth_usd_price();
            uint256 eth_collat_price = UniswapPairOracle(pool.collat_eth_oracle_address()).consult(weth_address, (PRICE_PRECISION * (10 ** missing_decimals)));

            uint256 collat_usd_price = eth_usd_price.mul(PRICE_PRECISION).div(eth_collat_price);
            return borrowed_balance.mul(10 ** missing_decimals).mul(collat_usd_price).div(PRICE_PRECISION); //.mul(getCollateralPrice()).div(1e6);    
        }
    }

    function mintRedeemPart1(uint256 frax_amount) public onlyByOwnGov {
        require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
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

    function mintRedeemPart2() public onlyByOwnGov {
        pool.collectRedemption();
    }

    function giveCollatBack(uint256 amount) public onlyByOwnGov {
        // Still paying back principal
        if (amount <= borrowed_balance) {
            borrowed_balance = borrowed_balance.sub(amount);
        }
        // Pure profits
        else {
            borrowed_balance = 0;
        }
        paid_back_historical = paid_back_historical.add(amount);
        TransferHelper.safeTransfer(address(collateral_token), address(pool), amount);
    }
   
    function burnFXS(uint256 amount) public onlyByOwnGov {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    /* ========== yearn V2 ========== */

    function yDepositUSDC(uint256 USDC_amount) public onlyByOwnGov {
        require(allow_yearn, 'yearn strategy is currently off');
        collateral_token.approve(address(yUSDC_V2), USDC_amount);
        yUSDC_V2.deposit(USDC_amount);
    }

    // E6
    function yWithdrawUSDC(uint256 yUSDC_amount) public onlyByOwnGov {
        yUSDC_V2.withdraw(yUSDC_amount);
    }

    /* ========== AAVE V2 + stkAAVE ========== */

    function aaveDepositUSDC(uint256 USDC_amount) public onlyByOwnGov {
        require(allow_aave, 'AAVE strategy is currently off');
        collateral_token.approve(address(aaveUSDC_Pool), USDC_amount);
        aaveUSDC_Pool.deposit(collateral_address, USDC_amount, address(this), 0);
    }

    // E6
    function aaveWithdrawUSDC(uint256 aUSDC_amount) public onlyByOwnGov {
        aaveUSDC_Pool.withdraw(collateral_address, aUSDC_amount, address(this));
    }
    
    // Collect stkAAVE
    function aaveCollect_stkAAVE() public onlyByOwnGov {
        address[] memory the_assets = new address[](1);
        the_assets[0] = address(aaveUSDC_Token);
        uint256 rewards_balance = AAVEIncentivesController.getRewardsBalance(the_assets, address(this));
        AAVEIncentivesController.claimRewards(the_assets, rewards_balance, address(this));
    }

    // Start cooldown to begin converting stkAAVE to AAVE
    function aaveCooldown_stkAAVE() public onlyByOwnGov {
        stkAAVE.cooldown();
    }

    // Claim cooled-down AAVE
    function aaveCollect_Cooldowned_AAVE() public onlyByOwnGov {

        stkAAVE.claimRewards(address(this), MAX_UINT256);
        stkAAVE.redeem(address(this), stkAAVE.balanceOf(address(this)));
    }

    /* ========== Compound cUSDC + COMP ========== */

    function compoundMint_cUSDC(uint256 USDC_amount) public onlyByOwnGov {
        require(allow_compound, 'Compound strategy is currently off');
        collateral_token.approve(address(cUSDC), USDC_amount);
        cUSDC.mint(USDC_amount);
    }

    // E8
    function compoundRedeem_cUSDC(uint256 cUSDC_amount) public onlyByOwnGov {
        // NOTE that cUSDC is E8, NOT E6
        cUSDC.redeem(cUSDC_amount);
    }

    function compoundCollectCOMP() public onlyByOwnGov {
        address[] memory cTokens = new address[](1);
        cTokens[0] = address(cUSDC);
        CompController.claimComp(address(this), cTokens);
    }

    /* ========== Custodian ========== */

    function withdrawRewards() public onlyCustodian {
        TransferHelper.safeTransfer(address(COMP), custodian_address, COMP.balanceOf(address(this)));
        TransferHelper.safeTransfer(address(stkAAVE), custodian_address, stkAAVE.balanceOf(address(this)));
        TransferHelper.safeTransfer(address(AAVE), custodian_address, AAVE.balanceOf(address(this)));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setTimelock(address new_timelock) external onlyByOwnGov {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnGov {
        owner_address = _owner_address;
    }

    function setWethAddress(address _weth_address) external onlyByOwnGov {
        weth_address = _weth_address;
    }

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setPool(address _pool_address) external onlyByOwnGov {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setBorrowCap(uint256 _borrow_cap) external onlyByOwnGov {
        borrow_cap = _borrow_cap;
    }

    function toggleAllocsForCollatDB() external onlyByOwnGov {
        useAllocationsForCollatDB = !useAllocationsForCollatDB;
    }

    function setAllowedStrategies(bool _yearn, bool _aave, bool _compound) external onlyByOwnGov {
        allow_yearn = _yearn;
        allow_aave = _aave;
        allow_compound = _compound;
    }

    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        TransferHelper.safeTransfer(tokenAddress, custodian_address, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }


    /* ========== EVENTS ========== */

    event Recovered(address token, uint256 amount);

}