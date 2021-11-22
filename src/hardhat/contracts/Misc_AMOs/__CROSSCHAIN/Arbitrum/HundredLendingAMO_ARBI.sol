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
// ====================== HundredLendingAMO_ARBI ======================
// ====================================================================
// Lends FRAX
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../../../ERC20/ERC20.sol";
import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol";
import "../../../Bridges/Arbitrum/CrossChainBridgeBacker_ARBI_AnySwap.sol";
import "../../rari/ICErc20Delegator.sol";
import "../../compound/IComptroller.sol";
import "../../hundred/IHundred.sol";
import "../../../Staking/Owned.sol";
import '../../../Uniswap/TransferHelper.sol';

contract HundredLendingAMO_ARBI is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    CrossChainCanonicalFRAX public canFRAX;
    CrossChainBridgeBacker_ARBI_AnySwap public cc_bridge_backer;
    address public timelock_address;
    address public custodian_address;

    // Pools and vaults
    IComptroller public comptroller = IComptroller(0x0F390559F258eB8591C8e31Cf0905E97cf36ACE2);
    ICErc20Delegator public hFRAX = ICErc20Delegator(0xb1c4426C86082D91a6c097fC588E5D5d8dD1f5a8);

    // Reward Tokens
    IHundred public HND = IHundred(0x10010078a54396F62c96dF8532dc2B4847d47ED3);
    
    // Constants
    uint256 public missing_decimals;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnGovCust() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, tlck, or custd");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _owner_address,
        address _custodian_address,
        address _canonical_frax_address,
        address _cc_bridge_backer_address
    ) Owned(_owner_address) {
        // Core
        canFRAX = CrossChainCanonicalFRAX(_canonical_frax_address);
        cc_bridge_backer = CrossChainBridgeBacker_ARBI_AnySwap(_cc_bridge_backer_address);

        // Missing decimals
        missing_decimals = uint(18) - hFRAX.decimals();

        // Set the custodian
        custodian_address = _custodian_address;

        // Get the timelock address from the minter
        timelock_address = cc_bridge_backer.timelock_address();
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[5] memory allocations) {
        // FRAX and hFRAX
        allocations[0] = canFRAX.balanceOf(address(this)); // Free FRAX
        allocations[1] = hFRAX.balanceOf(address(this)); // Free hFRAX, E8
        allocations[2] = allocations[1] * (10 ** missing_decimals); // Free hFRAX, E18
        allocations[3] = (allocations[2] * hFRAX.exchangeRateStored()) / (10 ** (18 + missing_decimals)); // hFRAX USD value, E18
        allocations[4] = allocations[0] + allocations[3]; // USD Value, E18
    }

    function showTokenBalances() public view returns (uint256[2] memory tkn_bals) {
        tkn_bals[0] = canFRAX.balanceOf(address(this)); // FRAX
        tkn_bals[1] = hFRAX.balanceOf(address(this)); // hFRAX
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        uint256[5] memory allocations = showAllocations();

        return (allocations[4], 0, 0, allocations[4]);
    }

    function showRewards() external view returns (uint256[5] memory rewards) {
        // HND
        rewards[0] = HND.balanceOf(address(this)); // Free HND
        rewards[1] = comptroller.compAccrued(address(this)); // Unclaimed HND

        // Total HND equivalents
        rewards[2] = rewards[0] + rewards[1];
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[4];
        collat_val_e18 = frax_val_e18;
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }
    
    function total_profit() public view returns (int256 profit) {
        uint256[5] memory allocations = showAllocations();

        // Handle FRAX
        profit = int256(allocations[4]) - int256(borrowed_frax());
    }

    /* ========== hFRAX ========== */

    function depositFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        canFRAX.approve(address(hFRAX), frax_amount);
        hFRAX.mint(frax_amount);
    }

    function redeem_hFRAX(uint256 hFRAX_amount_e8) public onlyByOwnGovCust {
        // NOTE that hFRAX is E8, NOT E6
        hFRAX.redeem(hFRAX_amount_e8);
    }

    function redeemUnderlying_hFRAX(uint256 frax_amount_e18) public onlyByOwnGovCust {
        // Same as redeem(), but input is FRAX, not hFRAX
        hFRAX.redeemUnderlying(frax_amount_e18);
    }

    /* ========== Rewards ========== */

    function collectHND() public onlyByOwnGovCust {
        comptroller.claimComp(address(this));
    }

    function withdrawRewards() public onlyByOwnGovCust {
        HND.transfer(msg.sender, HND.balanceOf(address(this)));
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwnGovCust {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(address(canFRAX), frax_amount, do_bridging);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setCCBridgeBacker(address _cc_bridge_backer_address) external onlyByOwnGov {
        cc_bridge_backer = CrossChainBridgeBacker_ARBI_AnySwap(_cc_bridge_backer_address);

        // Get the timelock addresses from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Make sure the new addresse is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

    function setCustodian(address _custodian_address) external onlyByOwnGov {
        require(_custodian_address != address(0), "Zero address detected");
        custodian_address = _custodian_address;
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