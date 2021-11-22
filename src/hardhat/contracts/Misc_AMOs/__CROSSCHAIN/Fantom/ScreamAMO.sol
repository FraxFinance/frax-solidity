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
// ============================ ScreamAMO =============================
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
import "../../../Bridges/Fantom/CrossChainBridgeBacker_FTM_AnySwap.sol";
import "../../rari/ICErc20Delegator.sol";
import "../../scream/IScreamComptroller.sol";
import "../../scream/ISCREAM.sol";
import "../../scream/IxSCREAM.sol";
import "../../../Staking/Owned.sol";
import '../../../Uniswap/TransferHelper.sol';

contract ScreamAMO is Owned {
    // SafeMath automatically included in Solidity >= 8.0.0

    /* ========== STATE VARIABLES ========== */

    // Core
    CrossChainCanonicalFRAX public canFRAX;
    CrossChainBridgeBacker_FTM_AnySwap public cc_bridge_backer;
    address public timelock_address;
    address public custodian_address;

    // Pools and vaults
    IScreamComptroller public CompController = IScreamComptroller(0x260E596DAbE3AFc463e75B6CC05d8c46aCAcFB09);
    ICErc20Delegator public scFRAX;

    // Reward Tokens
    ISCREAM public SCREAM = ISCREAM(0xe0654C8e6fd4D733349ac7E09f6f23DA256bF475);
    IxSCREAM public xSCREAM = IxSCREAM(0xe3D17C7e840ec140a7A51ACA351a482231760824);
    
    // Constants
    uint256 public missing_decimals;
    uint256 private PRICE_PRECISION = 1e6;
    uint256 public MAX_UINT256 = type(uint256).max;

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
        address _scfrax_address,
        address _cc_bridge_backer_address
    ) Owned(_owner_address) {
        // Core
        canFRAX = CrossChainCanonicalFRAX(_canonical_frax_address);
        scFRAX = ICErc20Delegator(_scfrax_address);
        cc_bridge_backer = CrossChainBridgeBacker_FTM_AnySwap(_cc_bridge_backer_address);

        // Missing decimals
        missing_decimals = uint(18) - scFRAX.decimals();

        // Set the custodian
        custodian_address = _custodian_address;

        // Get the timelock address from the minter
        timelock_address = cc_bridge_backer.timelock_address();
    }

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[5] memory allocations) {
        // FRAX and scFRAX
        allocations[0] = canFRAX.balanceOf(address(this)); // Free FRAX
        allocations[1] = scFRAX.balanceOf(address(this)); // Free scFRAX, E8
        allocations[2] = allocations[1] * (10 ** missing_decimals); // Free scFRAX, E18
        allocations[3] = (allocations[2] * scFRAX.exchangeRateStored()) / (10 ** (18 + missing_decimals)); // scFRAX USD value, E18
        allocations[4] = allocations[0] + allocations[3]; // USD Value, E18
    }

    function showTokenBalances() public view returns (uint256[2] memory tkn_bals) {
        tkn_bals[0] = canFRAX.balanceOf(address(this)); // FRAX
        tkn_bals[1] = scFRAX.balanceOf(address(this)); // scFRAX
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
        // SCREAM
        rewards[0] = SCREAM.balanceOf(address(this)); // Free SCREAM
        rewards[1] = CompController.compAccrued(address(this)); // Unclaimed SCREAM

        // xSCREAM
        rewards[2] = xSCREAM.balanceOf(address(this)); // Free xSCREAM
        rewards[3] = (rewards[2] * xSCREAM.getShareValue()) / 1e18; // SCREAM value of xSCREAM

        // Total SCREAM equivalents
        rewards[4] = rewards[0] + rewards[1] + rewards[3];
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

    /* ========== scFRAX ========== */

    function depositFRAX(uint256 frax_amount) public onlyByOwnGovCust {
        canFRAX.approve(address(scFRAX), frax_amount);
        scFRAX.mint(frax_amount);
    }

    function redeem_scFRAX(uint256 scFRAX_amount_e8) public onlyByOwnGovCust {
        // NOTE that scFRAX is E8, NOT E6
        scFRAX.redeem(scFRAX_amount_e8);
    }

    function redeemUnderlying_scFRAX(uint256 frax_amount_e18) public onlyByOwnGovCust {
        // Same as redeem(), but input is FRAX, not scFRAX
        scFRAX.redeemUnderlying(frax_amount_e18);
    }

    /* ========== SCREAM staking (xSCREAM) ========== */

    // SCREAM -> xSCREAM
    // Stake SCREAM for xSCREAM
    function stakeSCREAM(uint256 scream_amount) public onlyByOwnGovCust {
        SCREAM.approve(address(xSCREAM), scream_amount);
        xSCREAM.deposit(scream_amount);
    }

    // xSCREAM -> SCREAM
    // Unstake xSCREAM for SCREAM
    function unstakeXSCREAM(uint256 xscream_amount) public onlyByOwnGovCust {
        xSCREAM.withdraw(xscream_amount);
    }

    /* ========== Rewards ========== */

    function collectSCREAM() public onlyByOwnGovCust {
        CompController.claimComp(address(this));
    }

    function withdrawRewards() public onlyByOwnGovCust {
        SCREAM.transfer(msg.sender, SCREAM.balanceOf(address(this)));
        xSCREAM.transfer(msg.sender, xSCREAM.balanceOf(address(this)));
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwnGovCust {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(address(canFRAX), frax_amount, do_bridging);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setCCBridgeBacker(address _cc_bridge_backer_address) external onlyByOwnGov {
        cc_bridge_backer = CrossChainBridgeBacker_FTM_AnySwap(_cc_bridge_backer_address);

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