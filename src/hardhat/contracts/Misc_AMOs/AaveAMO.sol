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
// ============================= AaveAMO ==============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../FXS/IFxs.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import "./aave/IAAVELendingPool_Partial.sol";
import "./aave/IAAVE_aFRAX.sol";
import "./aave/IStakedAave.sol";
import "./aave/IAaveIncentivesControllerPartial.sol";

contract AaveAMO is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFxs private FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    IFraxAMOMinter private amo_minter;
    
    // Pools and vaults
    IAAVELendingPool_Partial private aaveFRAX_Pool = IAAVELendingPool_Partial(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
    IAAVE_aFRAX private aaveFRAX_Token = IAAVE_aFRAX(0xd4937682df3C8aEF4FE912A96A74121C0829E664);

    // Reward Tokens
    ERC20 private AAVE = ERC20(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9);
    IStakedAave private stkAAVE = IStakedAave(0x4da27a545c0c5B758a6BA100e3a049001de870f5);
    IAaveIncentivesControllerPartial private AAVEIncentivesController = IAaveIncentivesControllerPartial(0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5);

    address public timelock_address;
    address public custodian_address;

    uint256 private constant PRICE_PRECISION = 1e6;

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        
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

    function showAllocations() public view returns (uint256[3] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated
        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        allocations[1] = aaveFRAX_Token.balanceOf(address(this)); // AAVE

        uint256 sum_frax = allocations[0] + allocations[1];
        allocations[2] = sum_frax; // Total FRAX possessed in various forms
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[2];
        collat_val_e18 = (frax_val_e18).mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
    }

    // For potential Aave incentives in the future
    function showRewards() external view returns (uint256[2] memory rewards) {
        rewards[0] = stkAAVE.balanceOf(address(this)); // stkAAVE
        rewards[1] = AAVE.balanceOf(address(this)); // AAVE
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    /* ========== AAVE V2 + stkAAVE ========== */

    function aaveDepositFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(aaveFRAX_Pool), frax_amount);
        aaveFRAX_Pool.deposit(address(FRAX), frax_amount, address(this), 0);
    }

    // E18
    function aaveWithdrawFRAX(uint256 aFRAX_amount) public onlyByOwnGovCust {
        aaveFRAX_Pool.withdraw(address(FRAX), aFRAX_amount, address(this));
    }
    
    // Collect stkAAVE
    function aaveCollect_stkAAVE(bool withdraw_too) public onlyByOwnGovCust {
        address[] memory the_assets = new address[](1);
        the_assets[0] = address(aaveFRAX_Token);
        uint256 rewards_balance = AAVEIncentivesController.getRewardsBalance(the_assets, address(this));
        AAVEIncentivesController.claimRewards(the_assets, rewards_balance, address(this));

        if (withdraw_too){
            withdrawRewards();
        }
    }

    /* ========== Burns and givebacks ========== */
   
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }

    // Burn unneeded FXS. Goes through the minter
    function burnFXS(uint256 fxs_amount) public onlyByOwnGovCust {
        FXS.approve(address(amo_minter), fxs_amount);
        amo_minter.burnFxsFromAMO(fxs_amount);
    }

    /* ========== Rewards ========== */

    function withdrawRewards() public onlyByOwnGovCust {
        stkAAVE.transfer(msg.sender, stkAAVE.balanceOf(address(this)));
        AAVE.transfer(msg.sender, AAVE.balanceOf(address(this)));
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