// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== FraxswapPair ===========================
// ====================================================================
// TWAMM LP Pair Token
// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Rich Gee: https://github.com/zer0blockchain
// Dennis: https://github.com/denett

// Logic / Algorithm Ideas
// FrankieIsLost: https://github.com/FrankieIsLost

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna
// Sam Kazemian: https://github.com/samkazemian
// Drake Evans: https://github.com/DrakeEvans
// Jack Corddry: https://github.com/corddry
// Justin Moore: https://github.com/0xJM

import './interfaces/IUniswapV2PairPartialV5.sol';
import './FraxswapERC20.sol';
import './libraries/Math.sol';
import './libraries/UQ112x112.sol';
import './interfaces/IERC20V5.sol';
import './interfaces/IUniswapV2FactoryV5.sol';
import './interfaces/IUniswapV2CalleeV5.sol';
import "../twamm/LongTermOrders.sol";

contract FraxswapPair is IUniswapV2PairPartialV5, FraxswapERC20 {
    using UQ112x112 for uint224;
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
    using LongTermOrdersLib for LongTermOrdersLib.ExecuteVirtualOrdersResult;

    /// ---------------------------
    /// -----TWAMM Parameters -----
    /// ---------------------------

    // address public owner_address;

    ///@notice time interval that are eligible for order expiry (to align expiries)
    uint256 constant public orderTimeInterval = 3600; // sync with LongTermOrders.sol

    ///@notice data structure to handle long term orders
    LongTermOrdersLib.LongTermOrders internal longTermOrders;

    uint112 public twammReserve0;
    uint112 public twammReserve1;

    uint256 public override fee;

    bool public newSwapsPaused;

    modifier execVirtualOrders() {
        executeVirtualOrdersInternal(block.timestamp);
        _;
    }

    /// ---------------------------
    /// -------- Modifiers --------
    /// ---------------------------

    ///@notice Throws if called by any account other than the owner.
    modifier onlyOwnerOrFactory() {
        require(factory == msg.sender || IUniswapV2FactoryV5(factory).feeToSetter() == msg.sender); // NOT OWNER OR FACTORY
        _;
    }

    ///@notice Checks if new swaps are paused. If they are, only allow closing of existing ones.
    modifier isNotPaused() {
        require(newSwapsPaused == false); // NEW LT ORDERS PAUSED
        _;
    }

    modifier feeCheck(uint256 newFee) {
        require(newFee > 0 && newFee < 101); // fee can't be zero and can't be more than 1%
        _;
    }

    /// ---------------------------
    /// --------- Events ----------
    /// ---------------------------

    ///@notice An event emitted when a long term swap from token0 to token1 is performed
    event LongTermSwap0To1(address indexed addr, uint256 orderId, uint256 amount0In, uint256 numberOfTimeIntervals);

    ///@notice An event emitted when a long term swap from token1 to token0 is performed
    event LongTermSwap1To0(address indexed addr, uint256 orderId, uint256 amount1In, uint256 numberOfTimeIntervals);

    ///@notice An event emitted when a long term swap is cancelled
    event CancelLongTermOrder(address indexed addr, uint256 orderId, address sellToken, uint256 unsoldAmount, address buyToken, uint256 purchasedAmount);

    ///@notice An event emitted when a long term swap is withdrawn
    event WithdrawProceedsFromLongTermOrder(address indexed addr, uint256 orderId, address indexed proceedToken, uint256 proceeds, bool orderExpired);

    ///@notice An event emitted when lp fee is updated
    event LpFeeUpdated(uint256 fee);

    /// ---------------------------
    /// --------- Errors ----------
    /// ---------------------------

    error InvalidToToken();
    error Uint112Overflow();
    error KConstantError();
    error InsufficientInputAmount();
    error InsufficientOutputAmount();
    error InsufficientLiquidity(uint112 reserve0, uint112 reserve1);

    /// -------------------------------
    /// -----UNISWAPV2 Parameters -----
    /// -------------------------------

    uint public constant override MINIMUM_LIQUIDITY = 10 ** 3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    address public override factory;
    address public override token0;
    address public override token1;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves

    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint public override kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    // Track order IDs
    mapping(address => uint256[]) public orderIDsForUser;

    TWAPObservation[] public TWAPObservationHistory;

    struct TWAPObservation {
        uint timestamp;
        uint price0CumulativeLast;
        uint price1CumulativeLast;
    }
    function price0CumulativeLast() public view override returns (uint){
        return TWAPObservationHistory.length > 0 ? TWAPObservationHistory[TWAPObservationHistory.length - 1].price0CumulativeLast : 0;
    }
    function price1CumulativeLast() public view override returns (uint){
        return TWAPObservationHistory.length > 0 ? TWAPObservationHistory[TWAPObservationHistory.length - 1].price1CumulativeLast : 0;
    }
    function getTWAPHistoryLength() public view override returns (uint){
        return TWAPObservationHistory.length;
    }

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1); // LOCKED
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getOrderIDsForUser(address user) external view returns (uint256[] memory) {
        return orderIDsForUser[user];
    }

    function getOrderIDsForUserLength(address user) external view returns (uint256) {
        return orderIDsForUser[user].length;
    }

    function getDetailedOrdersForUser(address user, uint256 offset, uint256 limit) external view returns (LongTermOrdersLib.Order[] memory detailed_orders) {
        uint256[] memory order_ids = orderIDsForUser[user];
        uint256 limit_to_use = Math.min(limit, order_ids.length - offset);
        detailed_orders = new LongTermOrdersLib.Order[](limit_to_use);

        for (uint256 i = 0; i < limit_to_use; i++){ 
            detailed_orders[i] = longTermOrders.orderMap[order_ids[offset + i]];
        }
    }

    function getReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function getTwammReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast, uint112 _twammReserve0, uint112 _twammReserve1, uint256 _fee) {
        return (reserve0, reserve1, blockTimestampLast, twammReserve0, twammReserve1, 10000-fee);
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(uint amountIn, address tokenIn) external view returns (uint) { 
        (uint112 reserveIn, uint112 reserveOut) = tokenIn == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0); // INSUFFICIENT_INPUT_AMOUNT, INSUFFICIENT_LIQUIDITY
        uint amountInWithFee = amountIn * fee;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 10000) + amountInWithFee;
        return numerator / denominator;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(uint amountOut, address tokenOut) external view returns (uint) {
        (uint112 reserveIn, uint112 reserveOut) = tokenOut == token0 ? (reserve1, reserve0) : (reserve0, reserve1);
        require(amountOut > 0 && reserveIn > 0 && reserveOut > 0); // INSUFFICIENT_OUTPUT_AMOUNT, INSUFFICIENT_LIQUIDITY
        uint numerator = reserveIn * amountOut * 10000;
        uint denominator = (reserveOut - amountOut) * fee;
        return (numerator / denominator) + 1;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool)))); // TRANSFER_FAILED
    }

    constructor() {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment. will revert if fee is bad
    function initialize(address _token0, address _token1, uint256 _fee) feeCheck(_fee) external override {
        require(msg.sender == factory); // FORBIDDEN
        // sufficient check
        token0 = _token0;
        token1 = _token1;
        fee = 10000 - _fee;

        // TWAMM
        longTermOrders.initialize(_token0);
        
        emit LpFeeUpdated(_fee);
    }

    function _getTimeElapsed() private view returns (uint32) {
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);

        uint32 timeElapsed;
        unchecked{
            timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        }
        return timeElapsed;
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1, uint32 timeElapsed) private {
        if (!(balance0 + twammReserve0 <= type(uint112).max && balance1 + twammReserve1 <= type(uint112).max)) revert Uint112Overflow(); // OVERFLOW
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);

        unchecked{
            if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
                // * never overflows, and + overflow is desired
                TWAPObservationHistory.push(
                    TWAPObservation(
                        blockTimestamp,
                        price0CumulativeLast() + uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed,
                        price1CumulativeLast() + uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed
                    )
                );
            }
        }

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);

        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    // if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IUniswapV2FactoryV5(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast; // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = Math.sqrt(uint(_reserve0) * _reserve1);
                uint rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = totalSupply * (rootK - rootKLast);
                    uint denominator = (rootK * 5) + rootKLast;
                    uint liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    // this low-level function should be called from a contract which performs important safety checks
    function mint(address to) external override lock execVirtualOrders returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint balance0 = IERC20V5(token0).balanceOf(address(this)) - twammReserve0;
        uint balance1 = IERC20V5(token1).balanceOf(address(this)) - twammReserve1;
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min(amount0 * _totalSupply / _reserve0, amount1 * _totalSupply / _reserve1);
        }
        require(liquidity > 0); // INSUFFICIENT_LIQUIDITY_MINTED
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1, _getTimeElapsed());
        if (feeOn) kLast = uint(reserve0) * reserve1; // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function burn(address to) external override lock execVirtualOrders returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        uint balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
        uint balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity * balance0 / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity * balance1 / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0); // INSUFFICIENT_LIQUIDITY_BURNED
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
        balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;

        _update(balance0, balance1, _reserve0, _reserve1, _getTimeElapsed());
        if (feeOn) kLast = uint(reserve0) * reserve1; // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external override lock execVirtualOrders {
        if(!(amount0Out > 0 || amount1Out > 0)) revert InsufficientOutputAmount(); // INSUFFICIENT_OUTPUT_AMOUNT
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        if(!(amount0Out < _reserve0 && amount1Out < _reserve1)) revert InsufficientLiquidity(_reserve0, _reserve1); // INSUFFICIENT_LIQUIDITY

        uint balance0;
        uint balance1;
        {// scope for _token{0,1}, avoids stack too deep errors
            address _token0 = token0;
            address _token1 = token1;
            if(!(to != _token0 && to != _token1)) revert InvalidToToken(); // INVALID_TO
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
            if (data.length > 0) IUniswapV2CalleeV5(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
            balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        if(!(amount0In > 0 || amount1In > 0)) revert InsufficientInputAmount(); // INSUFFICIENT_INPUT_AMOUNT
        {// scope for reserve{0,1}Adjusted, avoids stack too deep errors
            uint minusFee = 10000 - fee;
            uint balance0Adjusted = (balance0 * 10000) - (amount0In * minusFee);
            uint balance1Adjusted = (balance1 * 10000) - (amount1In * minusFee);
            if (!(balance0Adjusted * balance1Adjusted >= uint(_reserve0) * _reserve1 * (10000 ** 2))) revert KConstantError(); // K
        }

        _update(balance0, balance1, _reserve0, _reserve1, _getTimeElapsed());
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // force balances to match reserves
    function skim(address to) external override lock execVirtualOrders {
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        _safeTransfer(_token0, to, IERC20V5(_token0).balanceOf(address(this)) - (reserve0 + twammReserve0));
        _safeTransfer(_token1, to, IERC20V5(_token1).balanceOf(address(this)) - (reserve1 + twammReserve1));
    }

    // force reserves to match balances
    function sync() external override lock execVirtualOrders {
        _update(
            IERC20V5(token0).balanceOf(address(this)) - twammReserve0,
            IERC20V5(token1).balanceOf(address(this)) - twammReserve1,
            reserve0, reserve1,
            _getTimeElapsed()
        );
    }

    // TWAMM

    ///@notice calculate the amount in for token using the balance diff to handle feeOnTransfer tokens
    function transferAmountIn(address token, uint amountIn) internal returns(uint256){
        // prev balance
        uint bal = IERC20V5(token).balanceOf(address(this));
        // transfer amount to contract

        // safeTransferFrom
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amountIn));
        require(success && (data.length == 0 || abi.decode(data, (bool))));

        // balance change
        return IERC20V5(token).balanceOf(address(this)) - bal;
    }

    ///@notice create a long term order to swap from token0
    ///@param amount0In total amount of token0 to swap
    ///@param numberOfTimeIntervals number of time intervals over which to execute long term order
    function longTermSwapFrom0To1(uint256 amount0In, uint256 numberOfTimeIntervals) external lock isNotPaused execVirtualOrders returns (uint256 orderId) {
        uint amount0 = transferAmountIn(token0, amount0In);
        twammReserve0 += uint112(amount0);
        require(uint256(reserve0) + twammReserve0 <= type(uint112).max); // OVERFLOW
        orderId = longTermOrders.performLongTermSwap(token0, token1, amount0, numberOfTimeIntervals);
        orderIDsForUser[msg.sender].push(orderId);
        emit LongTermSwap0To1(msg.sender, orderId, amount0, numberOfTimeIntervals);
    }

    ///@notice create a long term order to swap from token1
    ///@param amount1In total amount of token1 to swap
    ///@param numberOfTimeIntervals number of time intervals over which to execute long term order
    function longTermSwapFrom1To0(uint256 amount1In, uint256 numberOfTimeIntervals) external lock isNotPaused execVirtualOrders returns (uint256 orderId) {
        uint amount1 = transferAmountIn(token1, amount1In);
        twammReserve1 += uint112(amount1);
        require(uint256(reserve1) + twammReserve1 <= type(uint112).max); // OVERFLOW
        orderId = longTermOrders.performLongTermSwap(token1, token0, amount1, numberOfTimeIntervals);
        orderIDsForUser[msg.sender].push(orderId);
        emit LongTermSwap1To0(msg.sender, orderId, amount1, numberOfTimeIntervals);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(uint256 orderId) external lock execVirtualOrders {
        (address sellToken, uint256 unsoldAmount, address buyToken, uint256 purchasedAmount) = longTermOrders.cancelLongTermSwap(orderId);

        bool buyToken0 = buyToken == token0;
        twammReserve0 -= uint112(buyToken0 ? purchasedAmount : unsoldAmount);
        twammReserve1 -= uint112(buyToken0 ? unsoldAmount : purchasedAmount);

        // update order. Used for tracking / informational
        longTermOrders.orderMap[orderId].isComplete = true;

        // transfer to owner of order
        _safeTransfer(buyToken, msg.sender, purchasedAmount);
        _safeTransfer(sellToken, msg.sender, unsoldAmount);

        emit CancelLongTermOrder(msg.sender, orderId, sellToken, unsoldAmount, buyToken, purchasedAmount);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(uint256 orderId) external lock execVirtualOrders returns (bool is_expired, address rewardTkn, uint256 totalReward) {
        (address proceedToken, uint256 proceeds, bool orderExpired) = longTermOrders.withdrawProceedsFromLongTermSwap(orderId);
        if (proceedToken == token0) {
            twammReserve0 -= uint112(proceeds);
        } else {
            twammReserve1 -= uint112(proceeds);
        }

        // update order. Used for tracking / informational
        if (orderExpired) longTermOrders.orderMap[orderId].isComplete = true;

        // transfer to owner of order
        _safeTransfer(proceedToken, msg.sender, proceeds);

        emit WithdrawProceedsFromLongTermOrder(msg.sender, orderId, proceedToken, proceeds, orderExpired);

        return (orderExpired, proceedToken, proceeds);
    }

    ///@notice execute virtual orders in the twamm, bring it up to the blockNumber passed in
    ///updates the TWAP if it is the first amm tx of the block
    function executeVirtualOrdersInternal(uint256 blockTimestamp) internal {

        if(newSwapsPaused) return; // skip twamm executions
        if(twammUpToDate()) return; // save gas

        LongTermOrdersLib.ExecuteVirtualOrdersResult memory result = LongTermOrdersLib.ExecuteVirtualOrdersResult(
            reserve0,
            reserve1,
            twammReserve0,
            twammReserve1,
            fee
        );

        longTermOrders.executeVirtualOrdersUntilTimestamp(blockTimestamp, result);

        twammReserve0 = uint112(result.newTwammReserve0);
        twammReserve1 = uint112(result.newTwammReserve1);
        
        uint112 newReserve0 = uint112(result.newReserve0);
        uint112 newReserve1 = uint112(result.newReserve1);

        uint32 timeElapsed = _getTimeElapsed();
        // update reserve0 and reserve1
        if ( timeElapsed > 0 && (newReserve0 != reserve0 || newReserve1 != reserve1)) {
            _update(newReserve0, newReserve1, reserve0, reserve1, timeElapsed);
        } else {
            reserve0 = newReserve0;
            reserve1 = newReserve1;
        }
    }

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders(uint256 blockTimestamp) public override lock {
        // blockTimestamp is valid then execute the long term orders otherwise noop
        if(longTermOrders.lastVirtualOrderTimestamp < blockTimestamp && blockTimestamp <= block.timestamp){
            executeVirtualOrdersInternal(blockTimestamp);
        }
    }

    /// ---------------------------
    /// ------- TWAMM Views -------
    /// ---------------------------

    ///@notice util function for getting the next orderId
    function getNextOrderID() public override view returns (uint256){
        return longTermOrders.orderId;
    }

    ///@notice util function for checking if the twamm is up to date
    function twammUpToDate() public override view returns (bool) {
        return block.timestamp == longTermOrders.lastVirtualOrderTimestamp;
    }

    function getReserveAfterTwamm(uint256 blockTimestamp) public view returns (
        uint112 _reserve0, uint112 _reserve1,
        uint256 lastVirtualOrderTimestamp,
        uint112 _twammReserve0, uint112 _twammReserve1
    ) {

        lastVirtualOrderTimestamp = longTermOrders.lastVirtualOrderTimestamp;

        uint112 bal0 = reserve0 + twammReserve0; // save the balance of token0
        uint112 bal1 = reserve1 + twammReserve1; // save the balance of token1

        LongTermOrdersLib.ExecuteVirtualOrdersResult memory result = LongTermOrdersLib.ExecuteVirtualOrdersResult(
            reserve0,
            reserve1,
            twammReserve0,
            twammReserve1,
            fee
        );

        longTermOrders.executeVirtualOrdersUntilTimestampView(blockTimestamp, result);

        _reserve0 = uint112(bal0 - result.newTwammReserve0);
        _reserve1 = uint112(bal1 - result.newTwammReserve1);
        _twammReserve0 = uint112(result.newTwammReserve0);
        _twammReserve1 = uint112(result.newTwammReserve1);
    }

    ///@notice returns the current state of the twamm
    function getTwammState() public override view returns (
        uint256 token0Rate,
        uint256 token1Rate,
        uint256 lastVirtualOrderTimestamp,
        uint256 orderTimeInterval_rtn,
        uint256 rewardFactorPool0,
        uint256 rewardFactorPool1
    ){
        token0Rate = longTermOrders.OrderPool0.currentSalesRate;
        token1Rate = longTermOrders.OrderPool1.currentSalesRate;
        lastVirtualOrderTimestamp = longTermOrders.lastVirtualOrderTimestamp;
        orderTimeInterval_rtn = orderTimeInterval;
        rewardFactorPool0 = longTermOrders.OrderPool0.rewardFactor;
        rewardFactorPool1 = longTermOrders.OrderPool1.rewardFactor;
    }

    ///@notice returns salesRates ending on this blockTimestamp
    function getTwammSalesRateEnding(uint256 _blockTimestamp) public override view returns (
        uint256 orderPool0SalesRateEnding,
        uint256 orderPool1SalesRateEnding
    ){
        uint256 lastExpiryTimestamp = _blockTimestamp - (_blockTimestamp % orderTimeInterval);
        orderPool0SalesRateEnding = longTermOrders.OrderPool0.salesRateEndingPerTimeInterval[lastExpiryTimestamp];
        orderPool1SalesRateEnding = longTermOrders.OrderPool1.salesRateEndingPerTimeInterval[lastExpiryTimestamp];
    }

    ///@notice returns reward factors at this blockTimestamp
    function getTwammRewardFactor(uint256 _blockTimestamp) public override view returns (
        uint256 rewardFactorPool0AtTimestamp,
        uint256 rewardFactorPool1AtTimestamp
    ){
        uint256 lastExpiryTimestamp = _blockTimestamp - (_blockTimestamp % orderTimeInterval);
        rewardFactorPool0AtTimestamp = longTermOrders.OrderPool0.rewardFactorAtTimestamp[lastExpiryTimestamp];
        rewardFactorPool1AtTimestamp = longTermOrders.OrderPool1.rewardFactorAtTimestamp[lastExpiryTimestamp];
    }

    ///@notice returns the twamm Order struct
    function getTwammOrder(uint256 orderId) public override view returns (
        uint256 id,
        uint256 creationTimestamp,
        uint256 expirationTimestamp,
        uint256 saleRate,
        address owner,
        address sellTokenAddr,
        address buyTokenAddr
    ){
        require(orderId < longTermOrders.orderId); // INVALID ORDERID
        LongTermOrdersLib.Order storage order = longTermOrders.orderMap[orderId];
        return (order.id, order.creationTimestamp, order.expirationTimestamp, order.saleRate, order.owner, order.sellTokenAddr, order.buyTokenAddr);
    }

    ///@notice returns the twamm Order withdrawable proceeds
    // IMPORTANT: Can be stale. Should call executeVirtualOrders first or use getTwammOrderProceeds below.
    // You can also .call() withdrawProceedsFromLongTermSwap
    // blockTimestamp should be <= current
    function getTwammOrderProceedsView(uint256 orderId, uint256 blockTimestamp) public override view returns (
        bool orderExpired,
        uint256 totalReward
    ){
        require(orderId < longTermOrders.orderId); // INVALID ORDERID
        LongTermOrdersLib.OrderPool storage orderPool = LongTermOrdersLib.getOrderPool(longTermOrders, longTermOrders.orderMap[orderId].sellTokenAddr);
        (orderExpired, totalReward) = LongTermOrdersLib.orderPoolGetProceeds(orderPool, orderId, blockTimestamp);
    }

    ///@notice returns the twamm Order withdrawable proceeds
    // Need to update the virtual orders first
    function getTwammOrderProceeds(uint256 orderId) public override returns (
        bool orderExpired,
        uint256 totalReward
    ){
        executeVirtualOrders(block.timestamp);
        return getTwammOrderProceedsView(orderId, block.timestamp);
    }

    ///@notice Pauses the execution of existing twamm orders and the creation of new twamm orders
    // Only callable once by anyone once the pause is toggled on the factory
    function togglePauseNewSwaps() external override {
        require(!newSwapsPaused && IUniswapV2FactoryV5(factory).globalPause()); // globalPause is enabled
        // Pause new swaps
        newSwapsPaused = true;
    }

    /* ========== RESTRICTED FUNCTIONS - Owner only ========== */

    ///@notice sets the pool's lp fee
    function setFee(uint256 newFee) feeCheck(newFee) external onlyOwnerOrFactory {
        fee = 10000 - newFee; // newFee should be in basis points (100th of a pecent). 30 = 0.3%
        emit LpFeeUpdated(newFee);
    }

}
