// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ============================= UniV3LiquidityAMO =============================
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
import "../FXS/FXS.sol";
import "../Frax/Pools/FraxPool.sol";
import "../Math/Math.sol";
import "../Math/SafeMath.sol";
import "../ERC20/ERC20.sol";
import '../Uniswap/TransferHelper.sol';
import "../Staking/Owned.sol";

import "../Uniswap_V3/IUniswapV3Factory.sol";
import "../Uniswap_V3/libraries/TickMath.sol";
import "../Uniswap_V3/libraries/LiquidityAmounts.sol";
import "../Uniswap_V3/periphery/interfaces/INonfungiblePositionManager.sol";
import "../Uniswap_V3/IUniswapV3Pool.sol";
import "../Uniswap_V3/ISwapRouter.sol";

contract UniV3LiquidityAMO is Owned {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

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

    // Core
    FRAXStablecoin private FRAX;
    FRAXShares private FXS;
    FraxPool private pool;
    ERC20 private pool_collateral_token;
    address public pool_collateral_address;
    uint256 public missing_decimals;
    address public pool_address;
    address public timelock_address;
    address public custodian_address;

    // Uniswap v3
    IUniswapV3Factory public univ3_factory;
    INonfungiblePositionManager public univ3_positions;
    ISwapRouter public univ3_router;

    // Price constants
    uint256 private constant PRICE_PRECISION = 1e6;

    // Max amount of FRAX this contract can mint
    int256 public mint_cap = int256(5000000e18);
    
    // Tracks collateral
    uint256 public borrowed_collat_historical;
    uint256 public returned_collat_historical;

    // Max amount of collateral the contract can borrow from the FraxPool
    uint256 public collat_borrow_cap = uint256(5000000e6);

    // Minimum collateral ratio needed for new FRAX minting
    uint256 public min_cr = 820000;

    // Amount the contract borrowed
    int256 public minted_sum_historical = 0;
    int256 public burned_sum_historical = 0;

    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _creator_address,
        address _custodian_address,
        address _frax_contract_address,
        address _fxs_contract_address,
        address _timelock_address,
        address _pool_address,
        address _pool_collateral_address,
        address _univ3_factory_address,
        address _univ3_positions_address,
        address _univ3_router_address
    ) Owned(_creator_address) {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXS = FRAXShares(_fxs_contract_address);
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
        pool_collateral_address = _pool_collateral_address;
        pool_collateral_token = ERC20(_pool_collateral_address);
        missing_decimals = uint256(18).sub(pool_collateral_token.decimals());
        timelock_address = _timelock_address;
        custodian_address = _custodian_address;

        collateral_addresses.push(_pool_collateral_address);
        allowed_collaterals[_pool_collateral_address] = true;

        univ3_factory = IUniswapV3Factory(_univ3_factory_address);
        univ3_positions = INonfungiblePositionManager(_univ3_positions_address);
        univ3_router = ISwapRouter(_univ3_router_address);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    modifier onlyByOwnerOrGovernanceOrCustodian() {
        require(msg.sender == timelock_address || msg.sender == owner || msg.sender == custodian_address, "Not owner, timelock, or custodian");
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
    function collatDollarBalance() external view returns (uint256) {
        uint256 collat_portion = showAllocations()[1];
        uint256 frax_portion = (showAllocations()[0]).add(showAllocations()[2]);

        // Assumes worst case scenario if FRAX slips out of range. 
        // Otherwise, it would only be half that is multiplied by the CR
        frax_portion = frax_portion.mul(FRAX.global_collateral_ratio()).div(PRICE_PRECISION);
        return (collat_portion).add(frax_portion);
    }

    function allCollateralAddresses() external view returns (address[] memory) {
        return collateral_addresses;
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

    // In collateral
    function collateralBalance() public view returns (uint256) {
        if (borrowed_collat_historical >= returned_collat_historical) return borrowed_collat_historical.sub(returned_collat_historical);
        else return 0;
    }

    // In FRAX, can be negative
    function mintedBalance() public view returns (int256) {
        return minted_sum_historical - burned_sum_historical;
    }

    // In FRAX, can be negative
    function accumulatedProfit() public view returns (int256) {
        return int256(showAllocations()[0]) - mintedBalance();
    }

    // Only counts non-withdrawn positions
    function numPositions() public view returns (uint256) {
        return positions_array.length;
    }
    

    /* ========== RESTRICTED FUNCTIONS, BUT CUSTODIAN CAN CALL ========== */

    // Burn unneeded or excess FRAX
    function burnFRAX(uint256 amount) external onlyByOwnerOrGovernanceOrCustodian {
        burned_sum_historical += int256(amount);
        FRAX.burn(amount);
    }

    // Burn unneeded or excess FXS
    function burnFXS(uint256 amount) external onlyByOwnerOrGovernanceOrCustodian {
        FXS.approve(address(this), amount);
        FXS.pool_burn_from(address(this), amount);
    }

    // Give USDC profits back
    function giveCollatBack(uint256 amount) external onlyByOwnerOrGovernanceOrCustodian {
        returned_collat_historical = returned_collat_historical.add(amount);
        TransferHelper.safeTransfer(address(pool_collateral_token), address(pool), amount);
    }

    // Iterate through all positions and collect fees accumulated
    function collectFees() external onlyByOwnerOrGovernanceOrCustodian {
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

    function approveTarget(address _target, address _token, uint256 _amount, bool use_safe_approve) public onlyByOwnerOrGovernance {
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
    function mint(address _collat_addr, uint256 _amountCollateral, uint256 _amountFrax, uint24 _fee_tier, int24 _tickLower, int24 _tickUpper) public onlyByOwnerOrGovernance returns (uint256, uint128) {
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
        TransferHelper.safeApprove(_collat_addr, address(univ3_positions), _amountCollateral);
        TransferHelper.safeApprove(address(FRAX), address(univ3_positions), _amountFrax);

        // Leave off amount0 and amount1 due to stack limit
        (uint256 token_id, uint128 liquidity, , ) = univ3_positions.mint(mint_params);
        
        // store new NFT in mapping and array
        Position memory new_position = Position(token_id, _collat_addr, liquidity, _tickLower, _tickUpper, _fee_tier);
        positions_mapping[token_id] = new_position;
        positions_array.push(new_position);

        return (token_id, liquidity);
    }

    // Remove liquidity
    // Example fract_to_rem_e6 = 500000 = 50% removal. 1000000 = 100% removal
    function withdraw(uint256 _token_id) public onlyByOwnerOrGovernance returns (uint256, uint256) {
        Position memory current_position = positions_mapping[_token_id];

        INonfungiblePositionManager.DecreaseLiquidityParams memory decrease_params = INonfungiblePositionManager.DecreaseLiquidityParams(
            _token_id,
            current_position.liquidity,
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

        // Delete from the mapping
        delete positions_mapping[_token_id];

        // Swap withdrawn position with last element and delete to avoid leaving a hole
        for (uint i = 0; i < positions_array.length; i++){ 
            if(positions_array[i].token_id == _token_id){
                positions_array[i] = positions_array[positions_array.length - 1];
                positions_array.pop();
            }
        }

        return (amount0, amount1);
    }

    
    // Swap tokenA into tokenB using univ3_router.ExactInputSingle()
    // Uni V3 only
    function swap(address _tokenA, address _tokenB, uint24 _fee_tier, uint256 _amountAtoB, uint256 _amountOutMinimum, uint160 _sqrtPriceLimitX96) public onlyByOwnerOrGovernance returns (uint256) {
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


    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */
    // Only owner or timelock can call, to limit risk 

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like pool_mint and pool_burn_from
    // on the main FRAX contract
    function mintFRAXForInvestments(uint256 frax_amount) public onlyByOwnerOrGovernance {
        int256 frax_amt_i256 = int256(frax_amount);

        // Make sure you aren't minting more than the mint cap
        require((mintedBalance() + frax_amt_i256) <= mint_cap, "Mint cap reached");
        minted_sum_historical = minted_sum_historical + frax_amt_i256;

        // Make sure the current CR isn't already too low
        require (FRAX.global_collateral_ratio() > min_cr, "Collateral ratio is already too low");

        // Make sure the FRAX minting wouldn't push the CR down too much
        // This is also a sanity check for the int256 math
        uint256 current_collateral_E18 = FRAX.globalCollateralValue();
        uint256 cur_frax_supply = FRAX.totalSupply();
        uint256 new_frax_supply = cur_frax_supply.add(frax_amount);
        uint256 new_cr = (current_collateral_E18.mul(PRICE_PRECISION)).div(new_frax_supply);
        require (new_cr > min_cr, "Minting would cause collateral ratio to be too low");

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);
    }

    // It mints FRAX from nothing, and redeems it on the target pool for collateral and FXS
    // The burn can be called separately later on
    function mintRedeemPart1(uint256 frax_amount) external onlyByOwnerOrGovernance {
        //require(allow_yearn || allow_aave || allow_compound, 'All strategies are currently off');
        uint256 redeem_amount_E6 = (frax_amount.mul(uint256(1e6).sub(pool.redemption_fee()))).div(1e6).div(10 ** missing_decimals);
        uint256 expected_collat_amount = redeem_amount_E6.mul(FRAX.global_collateral_ratio()).div(1e6);
        expected_collat_amount = expected_collat_amount.mul(1e6).div(pool.getCollateralPrice());

        require(collateralBalance().add(expected_collat_amount) <= collat_borrow_cap, "Borrow cap");
        borrowed_collat_historical = borrowed_collat_historical.add(expected_collat_amount);

        // Mint the frax 
        FRAX.pool_mint(address(this), frax_amount);

        // Redeem the frax
        FRAX.approve(address(pool), frax_amount);
        pool.redeemFractionalFRAX(frax_amount, 0, 0);
    }

    function mintRedeemPart2() external onlyByOwnerOrGovernance {
        pool.collectRedemption();
    }

    // Adds collateral addresses supported. Needed to make sure collatDollarBalance is correct
    function addCollateral(address collat_addr) public onlyByOwnerOrGovernance {
        require(collat_addr != address(0), "Zero address detected");
        require(collat_addr != address(FRAX), "FRAX is not collateral");

        require(allowed_collaterals[collat_addr] == false, "Address already exists");
        allowed_collaterals[collat_addr] = true; 
        collateral_addresses.push(collat_addr);
    }

    function setCustodian(address _custodian_address) external onlyByOwnerOrGovernance {
        require(_custodian_address != address(0), "Custodian address cannot be 0");        
        custodian_address = _custodian_address;
    }

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        require(new_timelock != address(0), "Timelock address cannot be 0");
        timelock_address = new_timelock;
    }

    function setSafetyParams(uint256 _min_cr, uint256 _mint_cap, uint256 _collat_borrow_cap) external onlyByOwnerOrGovernance {
        min_cr = _min_cr;
        mint_cap = int256(_mint_cap);
        collat_borrow_cap = _collat_borrow_cap;
    }

    function setPool(address _pool_address, address _pool_collateral_address, uint256 _missing_decimals) external onlyByOwnerOrGovernance {
        pool_address = _pool_address;
        pool = FraxPool(_pool_address);
        pool_collateral_token = ERC20(_pool_collateral_address);
        pool_collateral_address = _pool_collateral_address;
        missing_decimals = _missing_decimals;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrGovernance {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard
        TransferHelper.safeTransfer(tokenAddress, custodian_address, tokenAmount);
        
        emit RecoveredERC20(tokenAddress, tokenAmount);
    }

    function recoverERC721(address tokenAddress, uint256 token_id) external onlyByOwnerOrGovernance {        
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
    ) external onlyByOwnerOrGovernance returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value:_value}(_data);
        return (success, result);
    }

    /* ========== EVENTS ========== */

    event RecoveredERC20(address token, uint256 amount);
    event RecoveredERC721(address token, uint256 id);

}