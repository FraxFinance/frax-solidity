// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ====================== UniV3LiquidityAMO_V2 ========================
// ====================================================================
// Creates Uni v3 positions between Frax and other stablecoins/assets
// Earns money on swap fees

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jason Huan: https://github.com/jasonhuan

// Reviewer(s) / Contributor(s)
// Sam Kazemian: https://github.com/samkazemian
// Travis Moore: https://github.com/FortisFortuna

import "../Frax/Frax.sol";
import "../Frax/Pools/FraxPool.sol";
import "../Frax/IFraxAMOMinter.sol";
import "../FXS/FXS.sol";
import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import "../ERC20/SafeERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

import "../Uniswap_V3/IUniswapV3Factory.sol";
import "../Uniswap_V3/libraries/TickMath.sol";
import "../Uniswap_V3/libraries/LiquidityAmounts.sol";
import "../Uniswap_V3/periphery/interfaces/INonfungiblePositionManager.sol";
import "../Uniswap_V3/IUniswapV3Pool.sol";
import "../Uniswap_V3/ISwapRouter.sol";

contract UniV3LiquidityAMO_V2_old is Owned {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== STATE VARIABLES ========== */

    // Core
    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    IFraxAMOMinter private amo_minter;
    ERC20 private giveback_collateral;
    address public giveback_collateral_address;
    uint256 public missing_decimals_giveback_collat;
    address public timelock_address;
    address public custodian_address;

    // Uniswap v3
    IUniswapV3Factory public univ3_factory;
    INonfungiblePositionManager public univ3_positions;
    ISwapRouter public univ3_router;

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // Wildcat AMO
    // Details about the AMO's uniswap positions
    struct Position {
        uint256 token_id;
        address collateral_address;
        uint128 liquidity; // the liquidity of the position
        int24 tickLower; // the tick range of the position
        int24 tickUpper;
        uint24 fee_tier;
    }

    // Array of all Uni v3 NFT positions held by the AMO
    Position[] public positions_array;

    // List of all collaterals
    address[] public collateral_addresses;
    mapping(address => bool) public allowed_collaterals; // Mapping is also used for faster verification

    // Map token_id to Position
    mapping(uint256 => Position) public positions_mapping;

    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _creator_address,
        address _giveback_collateral_address,
        address _amo_minter_address
    ) Owned(_creator_address) {
        FRAX = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
        FXS = FRAXShares(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
        giveback_collateral_address = _giveback_collateral_address;
        giveback_collateral = ERC20(_giveback_collateral_address);
        missing_decimals_giveback_collat = uint(18).sub(giveback_collateral.decimals());

        collateral_addresses.push(_giveback_collateral_address);
        allowed_collaterals[_giveback_collateral_address] = true;

        univ3_factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);
        univ3_positions = INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);
        univ3_router = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

        // Initialize the minter
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

    function showAllocations() public view returns (uint256[4] memory allocations) {
        // All numbers given are in FRAX unless otherwise stated

        // Unallocated FRAX
        allocations[0] = FRAX.balanceOf(address(this));

        // Unallocated Collateral Dollar Value (E18)
        allocations[1] = freeColDolVal();
        
        // Sum of Uni v3 Positions liquidity, if it was all in FRAX
        allocations[2] = TotalLiquidityFrax(); 

        // Total Value
        allocations[3] = allocations[0].add(allocations[1]).add(allocations[2]);
    }

    // E18 Collateral dollar value
    function freeColDolVal() public view returns (uint256) {
        uint256 value_tally_e18 = 0;
        for (uint i = 0; i < collateral_addresses.length; i++){ 
            ERC20 thisCollateral = ERC20(collateral_addresses[i]);
            uint256 missing_decs = uint256(18).sub(thisCollateral.decimals());
            uint256 col_bal_e18 = thisCollateral.balanceOf(address(this)).mul(10 ** missing_decs);
            value_tally_e18 = value_tally_e18.add(col_bal_e18);
        }
        return value_tally_e18;
    }

    // Needed for the Frax contract to function 
    function collatDollarBalance() public view returns (uint256) {
        uint256 collat_portion = showAllocations()[1];
        uint256 frax_portion = (showAllocations()[0]).add(showAllocations()[2]);

        // Assumes worst case scenario if FRAX slips out of range. 
        // Otherwise, it would only be half that is multiplied by the CR
        frax_portion = frax_portion.mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
        return (collat_portion).add(frax_portion);
    }

    function dollarBalances() public view returns (uint256 frax_val_e18, uint256 collat_val_e18) {
        frax_val_e18 = showAllocations()[3];
        collat_val_e18 = collatDollarBalance();
    }

    function TotalLiquidityFrax() public view returns (uint256) {
        uint256 frax_tally = 0;
        Position memory thisPosition;
        for (uint256 i = 0; i < positions_array.length; i++) {
            thisPosition = positions_array[i];
            uint128 this_liq = thisPosition.liquidity;
            if (this_liq > 0){
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(thisPosition.tickLower);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(thisPosition.tickUpper);
                if (thisPosition.collateral_address > 0x853d955aCEf822Db058eb8505911ED77F175b99e){ // if address(FRAX) < collateral_address, then FRAX is token0
                    frax_tally = frax_tally.add(LiquidityAmounts.getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, this_liq));
                }
                else {
                    frax_tally = frax_tally.add(LiquidityAmounts.getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, this_liq));
                }
            }
        }

        // Return the sum of all the positions' balances of FRAX, if the price fell off the range towards that side
        return frax_tally;
    }

    // Backwards compatibility
    function mintedBalance() public view returns (int256) {
        return amo_minter.frax_mint_balances(address(this));
    }

    // Backwards compatibility
    function collateralBalance() public view returns (int256) {
        return amo_minter.collat_borrowed_balances(address(this));
    }

    // Only counts non-withdrawn positions
    function numPositions() public view returns (uint256) {
        return positions_array.length;
    }
    
    function allCollateralAddresses() external view returns (address[] memory) {
        return collateral_addresses;
    }

    /* ========== RESTRICTED FUNCTIONS, BUT CUSTODIAN CAN CALL ========== */

    // Iterate through all positions and collect fees accumulated
    function collectFees() external onlyByOwnGovCust {
        for (uint i = 0; i < positions_array.length; i++){ 
            Position memory current_position = positions_array[i];
            INonfungiblePositionManager.CollectParams memory collect_params = INonfungiblePositionManager.CollectParams(
                current_position.token_id,
                custodian_address,
                type(uint128).max,
                type(uint128).max
            );

            // Send to custodian address
            univ3_positions.collect(collect_params);
        }
    }


    /* ---------------------------------------------------- */
    /* ---------------------- Uni v3 ---------------------- */
    /* ---------------------------------------------------- */

    function approveTarget(address _target, address _token, uint256 _amount, bool use_safe_approve) public onlyByOwnGov {
        if (use_safe_approve) {
            // safeApprove needed for USDT and others for the first approval
            // You need to approve 0 every time beforehand for USDT: it resets
            TransferHelper.safeApprove(_token, _target, _amount);
        }
        else {
            ERC20(_token).approve(_target, _amount);
        }
    }

    // Mint NFT using collateral / FRAX already held
    // If suboptimal liquidity taken, withdraw() and try again
    // Will revert if the pool doesn't exist yet
    function mint(address _collat_addr, uint256 _amountCollateral, uint256 _amountFrax, uint24 _fee_tier, int24 _tickLower, int24 _tickUpper) public onlyByOwnGov returns (uint256, uint128) {
        // Make sure the collateral is allowed 
        require(allowed_collaterals[_collat_addr], "Collateral not allowed");
        
        INonfungiblePositionManager.MintParams memory mint_params;
        if(_collat_addr < address(FRAX)){
            mint_params = INonfungiblePositionManager.MintParams(
                _collat_addr,
                address(FRAX),
                _fee_tier,
                _tickLower,
                _tickUpper,
                _amountCollateral,
                _amountFrax,
                0,
                0,
                address(this),
                block.timestamp + 604800 // Expiration: 7 days from now
            );
        } else {
            mint_params = INonfungiblePositionManager.MintParams(
                address(FRAX),
                _collat_addr,
                _fee_tier,
                _tickLower,
                _tickUpper,
                _amountFrax,
                _amountCollateral,
                0,
                0,
                address(this),
                block.timestamp + 604800 // Expiration: 7 days from now
            );
        }

        // Approvals
        ERC20(_collat_addr).approve(address(univ3_positions), _amountCollateral);
        ERC20(address(FRAX)).approve(address(univ3_positions), _amountFrax);

        // Leave off amount0 and amount1 due to stack limit
        (uint256 token_id, uint128 liquidity, , ) = univ3_positions.mint(mint_params);
        
        // Store new NFT in mapping and array
        Position memory new_position = Position(token_id, _collat_addr, liquidity, _tickLower, _tickUpper, _fee_tier);
        positions_mapping[token_id] = new_position;
        positions_array.push(new_position);

        return (token_id, liquidity);
    }

    function withdrawAll(uint256 _token_id) public onlyByOwnGov returns (uint256, uint256) {
        return removeLiquidity(_token_id, uint128(PRICE_PRECISION));
    }

    // Remove liquidity
    // Example fract_to_rem_e6 = 500000 = 50% removal. 1000000 = 100% removal
    function removeLiquidity(uint256 _token_id, uint128 fract_to_rem_e6) public onlyByOwnGov returns (uint256, uint256) {
        Position memory current_position = positions_mapping[_token_id];

        INonfungiblePositionManager.DecreaseLiquidityParams memory decrease_params = INonfungiblePositionManager.DecreaseLiquidityParams(
            _token_id,
            (current_position.liquidity * fract_to_rem_e6) / uint128(PRICE_PRECISION),
            0,
            0,
            block.timestamp + 604800 // Expiration: 7 days from now
        );

        univ3_positions.decreaseLiquidity(decrease_params);

        (uint256 amount0, uint256 amount1) = univ3_positions.collect(INonfungiblePositionManager.CollectParams(
            _token_id,
            address(this),
            type(uint128).max,
            type(uint128).max
        ));

        // Burn the empty NFT
        // univ3_positions.burn(_token_id);

        // If the NFT has no liquidity, manage the arrays
        if (fract_to_rem_e6 == uint128(PRICE_PRECISION)) {
            // Delete from the mapping
            delete positions_mapping[_token_id];

            // Swap withdrawn position with last element and delete to avoid leaving a hole
            for (uint i = 0; i < positions_array.length; i++){ 
                if(positions_array[i].token_id == _token_id){
                    positions_array[i] = positions_array[positions_array.length - 1];
                    positions_array.pop();
                }
            }
        }

        return (amount0, amount1);
    }

    // Increase liquidity
    function increaseLiquidity(uint256 _token_id, address _collat_addr, uint256 _amountCollateral, uint256 _amountFrax) public onlyByOwnGov returns (uint128, uint256, uint256) {
        INonfungiblePositionManager.IncreaseLiquidityParams memory inc_liq_params;
        if(_collat_addr < address(FRAX)){
            inc_liq_params = INonfungiblePositionManager.IncreaseLiquidityParams(
                _token_id,
                _amountCollateral,
                _amountFrax,
                0,
                0,
                block.timestamp + 604800 // Expiration: 7 days from now
            );
        } else {
            inc_liq_params = INonfungiblePositionManager.IncreaseLiquidityParams(
                _token_id,
                _amountFrax,
                _amountCollateral,
                0,
                0,
                block.timestamp + 604800 // Expiration: 7 days from now
            );
        }

        // Approvals
        TransferHelper.safeApprove(_collat_addr, address(univ3_positions), _amountCollateral);
        TransferHelper.safeApprove(address(FRAX), address(univ3_positions), _amountFrax);

        return univ3_positions.increaseLiquidity(inc_liq_params);
    }

    // Swap tokenA into tokenB using univ3_router.ExactInputSingle()
    // Uni V3 only
    function swap(address _tokenA, address _tokenB, uint24 _fee_tier, uint256 _amountAtoB, uint256 _amountOutMinimum, uint160 _sqrtPriceLimitX96) public onlyByOwnGov returns (uint256) {
        // Make sure the collateral is allowed 
        require(allowed_collaterals[_tokenA] || _tokenA == address(FRAX), "TokenA not allowed");
        require(allowed_collaterals[_tokenB] || _tokenB == address(FRAX), "TokenB not allowed");

        ISwapRouter.ExactInputSingleParams memory swap_params = ISwapRouter.ExactInputSingleParams(
            _tokenA,
            _tokenB,
            _fee_tier,
            address(this),
            2105300114, // Expiration: a long time from now
            _amountAtoB,
            _amountOutMinimum,
            _sqrtPriceLimitX96
        );

        // Approval
        TransferHelper.safeApprove(_tokenA, address(univ3_router), _amountAtoB);

        uint256 amountOut = univ3_router.exactInputSingle(swap_params);
        return amountOut;
    }

    /* ========== Burns and givebacks ========== */

    // Give USDC profits back. Goes through the minter
    function giveCollatBack(uint256 collat_amount) external onlyByOwnGovCust {
        giveback_collateral.approve(address(amo_minter), collat_amount);
        amo_minter.receiveCollatFromAMO(collat_amount);
    }

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

    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */
    // Only owner or timelock can call, to limit risk 

    // Adds collateral addresses supported. Needed to make sure dollarBalances is correct
    function addCollateral(address collat_addr) public onlyByOwnGov {
        require(collat_addr != address(0), "Zero address detected");
        require(collat_addr != address(FRAX), "FRAX is not collateral");

        require(allowed_collaterals[collat_addr] == false, "Address already exists");
        allowed_collaterals[collat_addr] = true; 
        collateral_addresses.push(collat_addr);
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
        TransferHelper.safeTransfer(tokenAddress, custodian_address, tokenAmount);
        
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function recoverERC721(address tokenAddress, uint256 token_id) external onlyByOwnGov {        
        // Only the owner address can ever receive the recovery withdrawal
        // INonfungiblePositionManager inherits IERC721 so the latter does not need to be imported
        INonfungiblePositionManager(tokenAddress).safeTransferFrom( address(this), custodian_address, token_id);
        emit RecoveredERC721(tokenAddress, token_id);
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

    /* ========== EVENTS ========== */

    event RecoveredERC20(address token, uint256 amount);
    event RecoveredERC721(address token, uint256 id);
}