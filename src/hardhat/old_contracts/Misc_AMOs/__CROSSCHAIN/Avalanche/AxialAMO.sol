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
// ============================= AxialAMO =============================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Jason Huan: https://github.com/jasonhuan
// Dennis: github.com/denett

import "../../../ERC20/__CROSSCHAIN/CrossChainCanonicalFRAX.sol";
import "../../../ERC20/ERC20.sol";
import "../../../Bridges/Avalanche/CrossChainBridgeBacker_AVAX_AnySwap.sol";
import "../../axial/IAxialToken.sol";
import "../../axial/ISwapFlashLoan.sol";
import "../../axial/IMasterChefAxialV3.sol";
import '../../../Uniswap/TransferHelper.sol';
import "../../../Staking/Owned.sol";

contract AxialAMO is Owned {
    /* ========== STATE VARIABLES ========== */

    // Core
    ERC20 public TSD;
    ERC20 public MIM;
    CrossChainCanonicalFRAX public canFRAX;
    ERC20 public DAI;
    CrossChainBridgeBacker_AVAX_AnySwap public cc_bridge_backer;

    // Axial related
    IAxialToken public AXIAL; // 0xcF8419A615c57511807236751c0AF38Db4ba3351
    ISwapFlashLoan public ac4d_swap; // 0x8c3c1C6F971C01481150CA7942bD2bbB9Bc27bC7
    ERC20 public AC4D; // 0x4da067E13974A4d32D342d86fBBbE4fb0f95f382
    IMasterChefAxialV3 public masterchef; // 0x958C0d0baA8F220846d3966742D4Fb5edc5493D3
    uint256 mchef_pid = 1;

    // Precision related
    uint256 public PRICE_PRECISION = 1e6;
    uint256 public VIRTUAL_PRICE_PRECISION = 1e18;

    // Min ratio of collat <-> 3crv conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public liq_slippage_ac4d;

    // Min ratio of (FRAX + 3CRV) <-> FRAX3CRV-f-2 metapool conversions via add_liquidity / remove_liquidity; 1e6
    uint256 public slippage_metapool;

    // Admins
    address public timelock_address;
    address public custodian_address;

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        address _custodian_address,
        address[5] memory _core_addresses, // 0: TSD, 1: MIM, 2: canFRAX, 3: DAI, 4: CrossChainBridgeBacker
        address[4] memory _pool_addresses // 0: AXIAL, 1: AC4D Swap, 2: AC4D, 3: IMasterChefAxialV3, 
    ) Owned(_owner_address) {
        // Owner
        owner = _owner_address;

        // Core
        TSD = ERC20(_core_addresses[0]);
        MIM = ERC20(_core_addresses[1]);
        canFRAX = CrossChainCanonicalFRAX(_core_addresses[2]);
        DAI = ERC20(_core_addresses[3]);
        cc_bridge_backer = CrossChainBridgeBacker_AVAX_AnySwap(_core_addresses[4]);

        // Pools
        AXIAL = IAxialToken(_pool_addresses[0]);
        ac4d_swap = ISwapFlashLoan(_pool_addresses[1]);
        AC4D = ERC20(_pool_addresses[2]);
        masterchef = IMasterChefAxialV3(_pool_addresses[3]);

        // Other variable initializations
        liq_slippage_ac4d = 950000;
        slippage_metapool = 950000;

        // Set the custodian
        custodian_address = _custodian_address;

        // Get the timelock address from the minter
        timelock_address = cc_bridge_backer.timelock_address();
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

    /* ========== VIEWS ========== */

    function showAllocations() public view returns (uint256[8] memory allocations) {
        // TSD
        allocations[0] = TSD.balanceOf(address(this)); // Free TSD

        // MIM
        allocations[1] = MIM.balanceOf(address(this)); // Free MIM

        // FRAX
        allocations[2] = canFRAX.balanceOf(address(this)); // Free FRAX

        // DAI
        allocations[3] = DAI.balanceOf(address(this)); // Free DAI

        // AC4D LP
        allocations[4] = (AC4D.balanceOf(address(this))); // Free AC4D
        (uint256 master_amt, ) = masterchef.userInfo(mchef_pid, address(this));
        allocations[5] = master_amt; // Deposited AC4D
        allocations[6] = ((allocations[4] + allocations[5]) * getACDBPrice()) / VIRTUAL_PRICE_PRECISION; // Free AC4D USD value

        // Total USD value
        allocations[7] = allocations[0] + allocations[1] + allocations[2] + allocations[3] + allocations[6];
    }

    // Needed by CrossChainBridgeBacker
    function allDollarBalances() public view returns (
        uint256 frax_ttl, 
        uint256 fxs_ttl,
        uint256 col_ttl, // in native decimals()
        uint256 ttl_val_usd_e18
    ) {
        uint256[8] memory allocations = showAllocations();

        return (allocations[2], 0, 0, allocations[7]);
    }

    function borrowed_frax() public view returns (uint256) {
        return cc_bridge_backer.frax_lent_balances(address(this));
    }

    // Should eventually renamve getACD4Price(). Note the B
    function getACDBPrice() public view returns (uint256) {
        return ac4d_swap.getVirtualPrice();
        // return VIRTUAL_PRICE_PRECISION;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /* ------------ LP Tokens ------------ */

    function ac4dDeposit(
        uint256 _tsd_amount,
        uint256 _mim_amount, 
        uint256 _frax_amount, 
        uint256 _dai_amount 
    ) external onlyByOwnGov returns (uint256 ac4d_received) {
        // Approve the TSD
        if (_tsd_amount > 0) {
            TSD.approve(address(ac4d_swap), _tsd_amount);
        }

        // Approve the MIM
        if (_mim_amount > 0) {
            MIM.approve(address(ac4d_swap), _mim_amount);
        }

        // Approve the MIM
        if (_frax_amount > 0) {
            canFRAX.approve(address(ac4d_swap), _frax_amount);
        }

        // Approve the MIM
        if (_dai_amount > 0) {
            DAI.approve(address(ac4d_swap), _dai_amount);
        }
        
        // Calculate the min LP out expected
        uint256 ttl_val_usd = _tsd_amount + _mim_amount + _frax_amount + _dai_amount;
        ttl_val_usd = (ttl_val_usd * VIRTUAL_PRICE_PRECISION) / getACDBPrice();
        uint256 min_ac4d_out = (ttl_val_usd * liq_slippage_ac4d) / PRICE_PRECISION;

        // Prepare the add liquidity array
        uint256[] memory add_liq_arr = new uint256[](4);
        add_liq_arr[0] = _tsd_amount;
        add_liq_arr[1] = _mim_amount;
        add_liq_arr[2] = _frax_amount;
        add_liq_arr[3] = _dai_amount;

        // Add the liquidity
        ac4d_received = ac4d_swap.addLiquidity(
            add_liq_arr, 
            min_ac4d_out,
            block.timestamp + 604800 // Expiration: 7 days from now
        );
    }

    function _ac4dWithdrawOneCoin(uint256 _ac4d_in, uint8 tkn_idx) internal returns (uint256 tokens_received) {
        // Approve the AC4D LP tokens
        AC4D.approve(address(ac4d_swap), _ac4d_in);

        // Calculate the min token out
        uint256 lp_usd_value = (_ac4d_in * VIRTUAL_PRICE_PRECISION) / getACDBPrice();
        uint256 min_tkn_out = (lp_usd_value * liq_slippage_ac4d) / PRICE_PRECISION;

        // Perform the liquidity swap
        tokens_received = ac4d_swap.removeLiquidityOneToken(
            _ac4d_in,
            tkn_idx,
            min_tkn_out,
            block.timestamp + 604800 // Expiration: 7 days from now
        );
    }

    function ac4dWithdrawTSD(uint256 _ac4d_lp_in) external onlyByOwnGov returns (uint256) {
        return _ac4dWithdrawOneCoin(_ac4d_lp_in, 0);
    }

    function ac4dWithdrawMIM(uint256 _ac4d_lp_in) external onlyByOwnGov returns (uint256) {
        return _ac4dWithdrawOneCoin(_ac4d_lp_in, 1);
    }

    function ac4dWithdrawFRAX(uint256 _ac4d_lp_in) external onlyByOwnGov returns (uint256) {
        return _ac4dWithdrawOneCoin(_ac4d_lp_in, 2);
    }

    function ac4dWithdrawDAI(uint256 _ac4d_lp_in) external onlyByOwnGov returns (uint256) {
        return _ac4dWithdrawOneCoin(_ac4d_lp_in, 3);
    }

    function ac4dWithdrawAtCurRatio(
        uint256 _ac4d_lp_in, 
        uint256 min_tsd, 
        uint256 min_mim, 
        uint256 min_frax, 
        uint256 min_dai
    ) external onlyByOwnGov returns (uint256 tsd_received, uint256 mim_received, uint256 frax_received, uint256 dai_received) {
        // Approve the AC4D LP tokens
        AC4D.approve(address(ac4d_swap), _ac4d_lp_in);

        // Prepare the withdraw array
        uint256[] memory withdraw_arr = new uint256[](4);
        withdraw_arr[0] = min_tsd;
        withdraw_arr[1] = min_mim;
        withdraw_arr[2] = min_frax;
        withdraw_arr[3] = min_dai;

        // Withdraw FRAX, DAI, and USDC from the ac4d at the current balance
        uint256[] memory result_arr = ac4d_swap.removeLiquidity(
            _ac4d_lp_in, 
            withdraw_arr,
            block.timestamp + 604800 // Expiration: 7 days from now
        );
        tsd_received = result_arr[0];
        mim_received = result_arr[1];
        frax_received = result_arr[2];
        dai_received = result_arr[3];
    }

    /* ------------ MasterChef deposits ------------ */

    function masterChefDeposit(uint256 _ac4d_lp_in) external onlyByOwnGov {
        // Approve the AC4D LP tokens
        AC4D.approve(address(masterchef), _ac4d_lp_in);

        // Do the deposit
        masterchef.deposit(mchef_pid, _ac4d_lp_in);
    }

    function masterChefCollect() external onlyByOwnGov {
        // Collect rewards (withdraw 0)
        masterchef.withdraw(mchef_pid, 0);
    }

    function masterChefWithdraw(uint256 _ac4d_lp_out) external onlyByOwnGov {
        // Withdraw LP and collect rewards
        masterchef.withdraw(mchef_pid, _ac4d_lp_out);
    }


    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveFRAXBack(uint256 frax_amount, bool do_bridging) external onlyByOwnGovCust {
        canFRAX.approve(address(cc_bridge_backer), frax_amount);
        cc_bridge_backer.receiveBackViaAMO(address(canFRAX), frax_amount, do_bridging);
    }
   
    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setCCBridgeBacker(address _cc_bridge_backer_address) external onlyByOwnGov {
        cc_bridge_backer = CrossChainBridgeBacker_AVAX_AnySwap(_cc_bridge_backer_address);

        // Get the timelock addresses from the minter
        timelock_address = cc_bridge_backer.timelock_address();

        // Make sure the new addresse is not address(0)
        require(timelock_address != address(0), "Invalid timelock");
    }

    function setSlippages(uint256 _liq_slippage_ac4d, uint256 _slippage_metapool) external onlyByOwnGov {
        liq_slippage_ac4d = _liq_slippage_ac4d;
        slippage_metapool = _slippage_metapool;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
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