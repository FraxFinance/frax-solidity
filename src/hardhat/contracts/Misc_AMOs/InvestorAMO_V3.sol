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
// ========================== InvestorAMO_V3 ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../FXS/IFxs.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/Variants/Comp.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "./yearn/IyUSDC_V2_Partial.sol";
import "./aave/IAAVELendingPool_Partial.sol";
import "./aave/IAAVE_aUSDC_Partial.sol";
import "./aave/IStakedAave.sol";
import "./aave/IAaveIncentivesControllerPartial.sol";
import "./compound/IComptroller.sol";
import "./compound/IcUSDC_Partial.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';

contract InvestorAMO_V3 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    IFxs private FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFraxAMOMinter private amo_minter;

    // Pools and vaults
    IyUSDC_V2_Partial private yUSDC_V2;
    IAAVELendingPool_Partial private aaveUSDC_Pool;
    IAAVE_aUSDC_Partial private aaveUSDC_Token;
    IcUSDC_Partial private cUSDC;

    // Reward Tokens
    Comp private COMP;
    ERC20 private AAVE;
    IStakedAave private stkAAVE;
    IComptroller private CompController;
    IAaveIncentivesControllerPartial private AAVEIncentivesController;

    address private constant collateral_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public timelock_address;
    address public custodian_address;
    address public weth_address;

    uint256 public missing_decimals;
    uint256 private PRICE_PRECISION;

    // Allowed strategies (can eventually be made into an array)
    bool public allow_yearn;
    bool public allow_aave;
    bool public allow_compound;
    
    // Constants
    uint256 public MAX_UINT256;

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
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        missing_decimals = uint(18).sub(collateral_token.decimals());

        // assignments (must be done in initializer, so assignment gets stored in proxy address's storage instead of implementation address's storage)
        yUSDC_V2 = IyUSDC_V2_Partial(0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9);
        aaveUSDC_Pool = IAAVELendingPool_Partial(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
        aaveUSDC_Token = IAAVE_aUSDC_Partial(0xBcca60bB61934080951369a648Fb03DF4F96263C);
        cUSDC = IcUSDC_Partial(0x39AA39c021dfbaE8faC545936693aC917d5E7563);

        COMP = Comp(0xc00e94Cb662C3520282E6f5717214004A7f26888);
        AAVE = ERC20(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9);
        stkAAVE = IStakedAave(0x4da27a545c0c5B758a6BA100e3a049001de870f5);
        CompController = IComptroller(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);
        AAVEIncentivesController = IAaveIncentivesControllerPartial(0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5);
        amo_minter = IFraxAMOMinter(_amo_minter_address);

        weth_address = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        PRICE_PRECISION = 1e6;

        allow_yearn = true;
        allow_aave = true;
        allow_compound = true;
        
        MAX_UINT256 = type(uint256).max;

        // Get the custodian and timelock addresses from the minter
        custodian_address = amo_minter.custodian_address();
        timelock_address = amo_minter.timelock_address();
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[5] memory allocations) {
        // All numbers given are assuming xyzUSDC, etc. is converted back to actual USDC
        allocations[0] = collateral_token.balanceOf(address(this)); // Unallocated
        allocations[1] = (yUSDC_V2.balanceOf(address(this))).mul(yUSDC_V2.pricePerShare()).div(1e6); // yearn
        allocations[2] = aaveUSDC_Token.balanceOf(address(this)); // AAVE
        allocations[3] = (cUSDC.balanceOf(address(this)).mul(cUSDC.exchangeRateStored()).div(1e18)); // Compound. Note that cUSDC is E8

        uint256 sum_tally = 0;
        for (uint i = 0; i < 4; i++){ 
            if (allocations[i] > 0){
                sum_tally = sum_tally.add(allocations[i]);
            }
        }

        allocations[4] = sum_tally; // Total USDC Value
    }

    function showRewards() external view returns (uint256[3] memory rewards) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if COMP.balanceOf() fails
        rewards[0] = COMP.balanceOf(address(this)); // COMP
        rewards[1] = stkAAVE.balanceOf(address(this)); // stkAAVE
        rewards[2] = AAVE.balanceOf(address(this)); // AAVE
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = (showAllocations()[4]).mul(10 ** missing_decimals);
        collat_val_e18 = frax_val_e18;
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }
    
    // Backwards compatibility
    function borrowed_balance() public view returns (int256) {
        return amo_minter.collat_borrowed_balances(address(this));
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGovCust {
        collateral_token.approve(address(amo_minter), collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);
    }
   
    // Burn unneeded FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGovCust {
        FXS.approve(address(amo_minter), fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);
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

    /* ========== AAVE V2 + stkAAVE ========== */

    function aaveDepositUSDC(uint256 USDC_amount) public onlyByOwnGovCust {
        require(allow_aave, 'AAVE strategy is currently off');
        collateral_token.approve(address(aaveUSDC_Pool), USDC_amount);
        aaveUSDC_Pool.deposit(collateral_address, USDC_amount, address(this), 0);
    }

    // E6
    function aaveWithdrawUSDC(uint256 aUSDC_amount) public onlyByOwnGovCust {
        aaveUSDC_Pool.withdraw(collateral_address, aUSDC_amount, address(this));
    }
    
    // Collect stkAAVE
    function aaveCollect_stkAAVE() public onlyByOwnGovCust {
        address[] memory the_assets = new address[](1);
        the_assets[0] = address(aaveUSDC_Token);
        uint256 rewards_balance = AAVEIncentivesController.getRewardsBalance(the_assets, address(this));
        AAVEIncentivesController.claimRewards(the_assets, rewards_balance, address(this));
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
    }

    /* ========== Rewards ========== */

    function withdrawRewards() public onlyByOwnGovCust {
        COMP.transfer(msg.sender, COMP.balanceOf(address(this)));
        stkAAVE.transfer(msg.sender, stkAAVE.balanceOf(address(this)));
        AAVE.transfer(msg.sender, AAVE.balanceOf(address(this)));
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

    function setAllowedStrategies(bool _yearn, bool _aave, bool _compound) external onlyByOwnGov {
        allow_yearn = _yearn;
        allow_aave = _aave;
        allow_compound = _compound;
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