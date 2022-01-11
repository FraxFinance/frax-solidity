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
// ========================== FraxLendingAMO_V2 ==========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "../FXS/IFxs.sol";
import "../Frax/IFrax.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/Variants/Comp.sol";
import "../Oracle/UniswapPairOracle.sol";
import "../Staking/Owned.sol";
import '../Uniswap/TransferHelper.sol';
import "./cream/ICREAM_crFRAX.sol";

contract FraxLendingAMO_V2 is Owned {
    using SafeMath for uint256;
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    IFxs private FXS = IFxs(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IFraxAMOMinter private amo_minter;
    
    // Cream
    ICREAM_crFRAX private crFRAX = ICREAM_crFRAX(0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5);

    address public timelock_address;
    address public custodian_address;

    uint256 public immutable missing_decimals;
    uint256 private constant PRICE_PRECISION = 1e6;

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _amo_minter_address
    ) Owned(_owner_address) {
        collateral_token = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        amo_minter = IFraxAMOMinter(_amo_minter_address);
        missing_decimals = uint(18).sub(collateral_token.decimals());
        
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
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if any one of the functions below fail

        // All numbers given are in FRAX unless otherwise stated
        allocations[0] = FRAX.balanceOf(address(this)); // Unallocated FRAX
        allocations[1] = (crFRAX.balanceOf(address(this)).mul(crFRAX.exchangeRateStored()).div(1e18)); // Cream

        uint256 sum_frax = allocations[0];
        sum_frax = sum_frax.add(allocations[1]);
        allocations[2] = sum_frax; // Total FRAX possessed in various forms
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[2];
        collat_val_e18 = (frax_val_e18).mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    /* ========== Burns and givebacks ========== */
   
    // Burn unneeded or excess FRAX. Goes through the minter
    function burnFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        FRAX.approve(address(amo_minter), frax_amount);
        amo_minter.burnFraxFromAMO(frax_amount);
    }
   
    /* ==================== CREAM ==================== */

    // E18
    function creamDeposit_FRAX(uint256 FRAX_amount) public onlyByOwnGovCust {
        FRAX.approve(address(crFRAX), FRAX_amount);
        require(crFRAX.mint(FRAX_amount) == 0, 'Mint failed');
    }

    // E18
    function creamWithdraw_FRAX(uint256 FRAX_amount) public onlyByOwnGovCust {
        require(crFRAX.redeemUnderlying(FRAX_amount) == 0, 'RedeemUnderlying failed');
    }

    // E8
    function creamWithdraw_crFRAX(uint256 crFRAX_amount) public onlyByOwnGovCust {
        require(crFRAX.redeem(crFRAX_amount) == 0, 'Redeem failed');
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