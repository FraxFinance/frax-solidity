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
// ======================= FraxPoolInvestorForV2 ======================
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
import "../Frax/Pools/FraxPool.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/Variants/Comp.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Governance/AccessControl.sol";
import "./yearn/IyUSDC_V2_Partial.sol";
import "./aave/IAAVELendingPool_Partial.sol";
import "./aave/IAAVE_aUSDC_Partial.sol";
import "./compound/IComptroller.sol";
import "./compound/IcUSDC_Partial.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';

// Lower APY: yearn, AAVE, Compound
// Higher APY: KeeperDAO, BZX, Harvest

contract FraxPoolInvestorForV2 is AccessControl, Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    FRAXShares private FXS = FRAXShares(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    FRAXStablecoin private FRAX = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    FraxPool private pool;
    IFraxAMOMinter private amo_minter;

    // Pools and vaults
    IyUSDC_V2_Partial private yUSDC_V2 = IyUSDC_V2_Partial(0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9);
    IAAVELendingPool_Partial private aaveUSDC_Pool = IAAVELendingPool_Partial(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
    IAAVE_aUSDC_Partial private aaveUSDC_Token = IAAVE_aUSDC_Partial(0xBcca60bB61934080951369a648Fb03DF4F96263C);
    IcUSDC_Partial private cUSDC = IcUSDC_Partial(0x39AA39c021dfbaE8faC545936693aC917d5E7563);

    // Reward Tokens
    Comp private COMP = Comp(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    IComptroller private CompController = IComptroller(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);

    address public collateral_address;
    address public pool_address;
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
        address _pool_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
        collateral_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        collateral_token = ERC20(collateral_address);
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();
    }

    /* ========== VIEWS ========== */

    function showAllocations() external view returns (uint256[5] memory allocations) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if any one of the functions below fail

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

    function showRewards() external view returns (uint256[1] memory rewards) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if COMP.balanceOf() fails
        rewards[0] = COMP.balanceOf(address(this)); // COMP
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Needed for the Frax contract to function 
    function collatDollarBalance() external view returns (uint256) {
        // Needs to mimic the FraxPool value and return in E18
        // Only thing different should be borrowed_balance vs balanceOf()
        if(pool.collateralPricePaused() == true){
            return borrowed_balance.mul(10 ** missing_decimals).mul(pool.pausedPrice()).div(PRICE_PRECISION);
        } else {
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
        amo_minter.mintFraxForAMO(frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() public onlyByOwnGov {
        pool.collectRedemption();
    }

    /* ========== Burns and givebacks ========== */

    function giveCollatBack(uint256 amount) public onlyByOwnGovCust {
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
   
    function burnFXS(uint256 amount) public onlyByOwnGovCust {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    /* ========== yearn V2 ========== */

    function yDepositUSDC(uint256 USDC_amount) public onlyByOwnGovCust {
        require(allow_yearn, 'yearn strategy is currently off');
        collateral_token.approve(address(yUSDC_V2), USDC_amount);
        yUSDC_V2.deposit(USDC_amount);
    }

    // E6
    function yWithdrawUSDC(uint256 yUSDC_amount) public onlyByOwnGovCust {
        yUSDC_V2.withdraw(yUSDC_amount);
    }

    /* ========== AAVE V2 ========== */

    function aaveDepositUSDC(uint256 USDC_amount) public onlyByOwnGovCust {
        require(allow_aave, 'AAVE strategy is currently off');
        collateral_token.approve(address(aaveUSDC_Pool), USDC_amount);
        aaveUSDC_Pool.deposit(collateral_address, USDC_amount, address(this), 0);
    }

    // E6
    function aaveWithdrawUSDC(uint256 aUSDC_amount) public onlyByOwnGovCust {
        aaveUSDC_Pool.withdraw(collateral_address, aUSDC_amount, address(this));
    }

    /* ========== Compound cUSDC + COMP ========== */

    function compoundMint_cUSDC(uint256 USDC_amount) public onlyByOwnGovCust {
        require(allow_compound, 'Compound strategy is currently off');
        collateral_token.approve(address(cUSDC), USDC_amount);
        cUSDC.mint(USDC_amount);
    }

    // E8
    function compoundRedeem_cUSDC(uint256 cUSDC_amount) public onlyByOwnGovCust {
        // NOTE that cUSDC is E8, NOT E6
        cUSDC.redeem(cUSDC_amount);
    }

    function compoundCollectCOMP() public onlyByOwnGovCust {
        address[] memory cTokens = new address[](1);
        cTokens[0] = address(cUSDC);
        CompController.claimComp(address(this), cTokens);

        // CompController.claimComp(address(this), );
    }

    /* ========== Rewards ========== */

    function withdrawRewards() public onlyByOwnGovCust {
        COMP.transfer(msg.sender, COMP.balanceOf(address(this)));
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

    function setPool(address _pool_address) external onlyByOwnGov {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
    }

    function setBorrowCap(uint256 _borrow_cap) external onlyByOwnGov {
        borrow_cap = _borrow_cap;
    }

    function setAllowedStrategies(bool _yearn, bool _aave, bool _compound) external onlyByOwnGov {
        allow_yearn = _yearn;
        allow_aave = _aave;
        allow_compound = _compound;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }
}