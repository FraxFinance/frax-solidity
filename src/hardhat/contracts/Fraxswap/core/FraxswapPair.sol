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
import '../libraries/TransferHelper.sol';
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
    uint256 public orderTimeInterval = 3600;

    ///@notice data structure to handle long term orders
    LongTermOrdersLib.LongTermOrders internal longTermOrders;

    uint112 public twammReserve0;
    uint112 public twammReserve1;

    bool public newSwapsPaused;

    modifier execVirtualOrders() {
        executeVirtualOrdersInternal(block.timestamp);
        _;
    }

    /// ---------------------------
    /// -------- Modifiers --------
    /// ---------------------------

    ///@notice Throws if called by any account other than the owner.
    modifier onlyOwner() {
        require(IUniswapV2FactoryV5(factory).feeToSetter() == msg.sender); // NOT OWNER
        _;
    }

    ///@notice Checks if new swaps are paused. If they are, only allow closing of existing ones.
    modifier isNotPaused() {
        require(newSwapsPaused == false); // NEW LT ORDERS PAUSED
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

    ///@notice An event emitted when virtual orders are executed
    event VirtualOrderExecution(uint256 blocktimestamp, uint256 newReserve0, uint256 newReserve1, uint256 newTwammReserve0, uint256 newTwammReserve1, uint256 token0Bought, uint256 token1Bought, uint256 token0Sold, uint256 token1Sold, uint256 expiries);

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
        uint256 length_remaining = order_ids.length - offset;
        uint256 limit_to_use = Math.min(limit, length_remaining);
        detailed_orders = new LongTermOrdersLib.Order[](limit_to_use);

        for (uint256 i = 0; i < limit_to_use; i++){ 
            detailed_orders[i] = longTermOrders.orderMap[order_ids[offset + i]];
        }
    }

    function getReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function getTwammReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast, uint112 _twammReserve0, uint112 _twammReserve1) {
        return (reserve0, reserve1, blockTimestampLast, twammReserve0, twammReserve1);
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "EC01"); // TRANSFER_FAILED
    }

    constructor() public {
        factory = msg.sender;
        // owner_address = IUniswapV2FactoryV5(factory).feeToSetter();
    }

    // called once by the factory at time of deployment
    function initialize(address _token0, address _token1) external override {
        require(msg.sender == factory); // FORBIDDEN
        // sufficient check
        token0 = _token0;
        token1 = _token1;

        // TWAMM
        longTermOrders.initialize(_token0, _token1, block.timestamp, orderTimeInterval);
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 + twammReserve0 <= type(uint112).max && balance1 + twammReserve1 <= type(uint112).max, "EC02"); // OVERFLOW
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);

        uint32 timeElapsed;
        unchecked{
            timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
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

        _update(balance0, balance1, _reserve0, _reserve1);
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

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0) * reserve1; // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external override lock execVirtualOrders {
        require(amount0Out > 0 || amount1Out > 0, "EC03"); // INSUFFICIENT_OUTPUT_AMOUNT
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "EC04"); // INSUFFICIENT_LIQUIDITY

        uint balance0;
        uint balance1;
        {// scope for _token{0,1}, avoids stack too deep errors
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "EC05"); // INVALID_TO
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
            if (data.length > 0) IUniswapV2CalleeV5(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
            balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "EC06"); // INSUFFICIENT_INPUT_AMOUNT
        {// scope for reserve{0,1}Adjusted, avoids stack too deep errors
            uint balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            require(balance0Adjusted * balance1Adjusted >= uint(_reserve0) * _reserve1 * (1000 ** 2), 'K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
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
            reserve0, reserve1
        );
    }

    // TWAMM

    ///@notice calculate the amount in for token0 using the balance diff to handle feeOnTransfer tokens
    function transferAmount0In(uint amount0In) internal returns(uint256){
        // prev balance
        uint bal0 = IERC20V5(token0).balanceOf(address(this));
        // transfer amount to contract
        TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0In);
        // balance change
        return IERC20V5(token0).balanceOf(address(this)) - bal0;
    }

    ///@notice calculate the amount in for token1 using the balance diff to handle feeOnTransfer tokens
    function transferAmount1In(uint amount1In) internal returns(uint256){
        // prev balance
        uint bal1 = IERC20V5(token1).balanceOf(address(this));
        // transfer amount to contract
        TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1In);
        // balance change
        return IERC20V5(token1).balanceOf(address(this)) - bal1;
    }

    ///@notice create a long term order to swap from token0
    ///@param amount0In total amount of token0 to swap
    ///@param numberOfTimeIntervals number of time intervals over which to execute long term order
    function longTermSwapFrom0To1(uint256 amount0In, uint256 numberOfTimeIntervals) external lock isNotPaused execVirtualOrders returns (uint256 orderId) {
        uint amount0 = transferAmount0In(amount0In);
        twammReserve0 += uint112(amount0);
        require(uint256(reserve0) + twammReserve0 <= type(uint112).max); // OVERFLOW
        orderId = longTermOrders.longTermSwapFrom0To1(amount0, numberOfTimeIntervals);
        orderIDsForUser[msg.sender].push(orderId);
        emit LongTermSwap0To1(msg.sender, orderId, amount0, numberOfTimeIntervals);
    }

    ///@notice create a long term order to swap from token1
    ///@param amount1In total amount of token1 to swap
    ///@param numberOfTimeIntervals number of time intervals over which to execute long term order
    function longTermSwapFrom1To0(uint256 amount1In, uint256 numberOfTimeIntervals) external lock isNotPaused execVirtualOrders returns (uint256 orderId) {
        uint amount1 = transferAmount1In(amount1In);
        twammReserve1 += uint112(amount1);
        require(uint256(reserve1) + twammReserve1 <= type(uint112).max); // OVERFLOW
        orderId = longTermOrders.longTermSwapFrom1To0(amount1, numberOfTimeIntervals);
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

        LongTermOrdersLib.ExecuteVirtualOrdersResult memory result;
        result.newReserve0 = reserve0;
        result.newReserve1 = reserve1;
        result.newTwammReserve0 = twammReserve0;
        result.newTwammReserve1 = twammReserve1;

        longTermOrders.executeVirtualOrdersUntilTimestamp(blockTimestamp, result);

        twammReserve0 = uint112(result.newTwammReserve0);
        twammReserve1 = uint112(result.newTwammReserve1);
        
        uint112 newReserve0 = uint112(result.newReserve0);
        uint112 newReserve1 = uint112(result.newReserve1);

        uint32 _blockTimestamp = uint32(blockTimestamp % 2 ** 32);
        uint32 timeElapsed;
        unchecked{
            timeElapsed = _blockTimestamp - blockTimestampLast; // overflow is desired
        }
        // update reserve0 and reserve1
        if ( timeElapsed > 0 && (newReserve0 != reserve0 || newReserve1 != reserve1)) {
            emit VirtualOrderExecution(
                _blockTimestamp,
                result.newReserve0,
                result.newReserve1,
                result.newTwammReserve0,
                result.newTwammReserve1,
                result.token0Bought,
                result.token1Bought,
                result.token0Sold,
                result.token1Sold,
                result.expiries
            );
            _update(newReserve0, newReserve1, reserve0, reserve1);
        } else {
            reserve0 = newReserve0;
            reserve1 = newReserve1;
        }
    }

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders(uint256 blockTimestamp) public override lock {
        // blockTimestamp is valid
        require(longTermOrders.lastVirtualOrderTimestamp <= blockTimestamp && blockTimestamp <= block.timestamp); // INVALID TIMESTAMP
        executeVirtualOrdersInternal(blockTimestamp);
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

        LongTermOrdersLib.ExecuteVirtualOrdersResult memory result;
        result.newReserve0 = reserve0;
        result.newReserve1 = reserve1;
        result.newTwammReserve0 = twammReserve0;
        result.newTwammReserve1 = twammReserve1;

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
        orderTimeInterval_rtn = longTermOrders.orderTimeInterval;
        rewardFactorPool0 = longTermOrders.OrderPool0.rewardFactor;
        rewardFactorPool1 = longTermOrders.OrderPool1.rewardFactor;
    }

    ///@notice returns salesRates ending on this blockTimestamp
    function getTwammSalesRateEnding(uint256 _blockTimestamp) public override view returns (
        uint256 orderPool0SalesRateEnding,
        uint256 orderPool1SalesRateEnding
    ){
        uint256 lastExpiryTimestamp = _blockTimestamp - (_blockTimestamp % longTermOrders.orderTimeInterval);
        orderPool0SalesRateEnding = longTermOrders.OrderPool0.salesRateEndingPerTimeInterval[lastExpiryTimestamp];
        orderPool1SalesRateEnding = longTermOrders.OrderPool1.salesRateEndingPerTimeInterval[lastExpiryTimestamp];
    }

    ///@notice returns reward factors at this blockTimestamp
    function getTwammRewardFactor(uint256 _blockTimestamp) public override view returns (
        uint256 rewardFactorPool0AtTimestamp,
        uint256 rewardFactorPool1AtTimestamp
    ){
        uint256 lastExpiryTimestamp = _blockTimestamp - (_blockTimestamp % longTermOrders.orderTimeInterval);
        rewardFactorPool0AtTimestamp = longTermOrders.OrderPool0.rewardFactorAtTimestamp[lastExpiryTimestamp];
        rewardFactorPool1AtTimestamp = longTermOrders.OrderPool1.rewardFactorAtTimestamp[lastExpiryTimestamp];
    }

    ///@notice returns the twamm Order struct
    function getTwammOrder(uint256 orderId) public override view returns (
        uint256 id,
        uint256 expirationTimestamp,
        uint256 saleRate,
        address owner,
        address sellTokenAddr,
        address buyTokenAddr
    ){
        require(orderId < longTermOrders.orderId); // INVALID ORDERID
        LongTermOrdersLib.Order storage order = longTermOrders.orderMap[orderId];
        return (order.id, order.expirationTimestamp, order.saleRate, order.owner, order.sellTokenAddr, order.buyTokenAddr);
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


    /* ========== RESTRICTED FUNCTIONS - Owner only ========== */

    // Only callable once
    function togglePauseNewSwaps() external override onlyOwner {
        // Pause new swaps
        require(!newSwapsPaused);
        newSwapsPaused = true;
    }
}
