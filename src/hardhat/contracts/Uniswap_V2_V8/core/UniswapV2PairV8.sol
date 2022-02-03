pragma solidity ^0.8.0;

import './interfaces/IUniswapV2PairV5.sol';
import './interfaces/IUniswapV2PairPartialV5.sol';
import './UniswapV2ERC20V8.sol';
import './libraries/Math.sol';
import './libraries/UQ112x112.sol';
import './interfaces/IERC20V5.sol';
import './interfaces/IUniswapV2FactoryV5.sol';
import './interfaces/IUniswapV2CalleeV5.sol';
import "../twamm/LongTermOrders.sol";

contract UniswapV2PairV8 is IUniswapV2PairPartialV5, UniswapV2ERC20V8 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
    using LongTermOrdersLib for LongTermOrdersLib.ExecuteVirtualOrdersResult;

    /// ---------------------------
    /// -----TWAMM Parameters -----
    /// ---------------------------

    address public owner_address;

    ///@notice interval between blocks that are eligible for order expiry
    uint256 public orderBlockInterval = 10;

    ///@notice false when longTermOrders are permissioned
    bool public whitelistDisabled;

    ///@notice data structure to handle long term orders
    LongTermOrdersLib.LongTermOrders internal longTermOrders;

    uint112 public twammReserve0;
    uint112 public twammReserve1;

    modifier execVirtualOrders() {
        executeVirtualOrdersInternal(block.number);
        _;
    }

    /// ---------------------------
    /// --------- Events ----------
    /// ---------------------------

    ///@notice An event emitted when a long term swap from tokenA to tokenB is performed
    event LongTermSwapAToB(address indexed addr, uint256 amountAIn, uint256 orderId);

    ///@notice An event emitted when a long term swap from tokenB to tokenA is performed
    event LongTermSwapBToA(address indexed addr, uint256 amountBIn, uint256 orderId);

    ///@notice An event emitted when a long term swap is cancelled
    event CancelLongTermOrder(address indexed addr, uint256 orderId);

    ///@notice An event emitted when a long term swap is withdrawn
    event WithdrawProceedsFromLongTermOrder(address indexed addr, uint256 orderId);

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

    uint public override price0CumulativeLast;
    uint public override price1CumulativeLast;
    uint public override kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'EC16');
        // LOCKED
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function getTwammReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast, uint112 _twammReserve0, uint112 _twammReserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
        _twammReserve0 = twammReserve0;
        _twammReserve1 = twammReserve1;
    }

    function getTwammState(uint256 blockNumber) public view returns (
        uint256 token0Rate,
        uint256 token1Rate,
        uint256 lastVirtualOrderBlock,
        uint256 orderBlockInterval,
        uint256 orderPool0SalesRateEnding,
        uint256 orderPool1SalesRateEnding
    ){
        token0Rate = longTermOrders.OrderPoolA.currentSalesRate;
        token1Rate = longTermOrders.OrderPoolB.currentSalesRate;
        lastVirtualOrderBlock = longTermOrders.lastVirtualOrderBlock;
        orderBlockInterval = longTermOrders.orderBlockInterval;
        orderPool0SalesRateEnding = longTermOrders.OrderPoolA.salesRateEndingPerBlock[blockNumber];
        orderPool1SalesRateEnding = longTermOrders.OrderPoolB.salesRateEndingPerBlock[blockNumber];
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))));
        // TRANSFER_FAILED
    }

    constructor() public {
        factory = msg.sender;
        owner_address = IUniswapV2FactoryV5(factory).feeToSetter();
    }

    // called once by the factory at time of deployment
    function initialize(address _token0, address _token1) external override {
        require(msg.sender == factory);
        // FORBIDDEN
        // sufficient check
        token0 = _token0;
        token1 = _token1;

        // TWAMM
        longTermOrders.initialize(_token0, _token1, block.number, orderBlockInterval);
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max);
        // OVERFLOW
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        // overflow is desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
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
        uint _kLast = kLast;
        // gas savings
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = Math.sqrt(uint(_reserve0).mul(_reserve1));
                uint rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = totalSupply.mul(rootK.sub(rootKLast));
                    uint denominator = rootK.mul(5).add(rootKLast);
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
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        // gas savings
        uint balance0 = IERC20V5(token0).balanceOf(address(this)) - twammReserve0;
        uint balance1 = IERC20V5(token1).balanceOf(address(this)) - twammReserve1;
        uint amount0 = balance0.sub(_reserve0);
        uint amount1 = balance1.sub(_reserve1);

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply;
        // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
            _mint(address(0), MINIMUM_LIQUIDITY);
            // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
        }
        require(liquidity > 0);
        // INSUFFICIENT_LIQUIDITY_MINTED
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1);
        // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function burn(address to) external override lock execVirtualOrders returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        // gas savings
        address _token0 = token0;
        // gas savings
        address _token1 = token1;
        // gas savings
        uint balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
        uint balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply;
        // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity.mul(balance0) / _totalSupply;
        // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply;
        // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0);
        // INSUFFICIENT_LIQUIDITY_BURNED
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
        balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1);
        // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external override lock execVirtualOrders {
        require(amount0Out > 0 || amount1Out > 0);
        // INSUFFICIENT_OUTPUT_AMOUNT
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1);
        // INSUFFICIENT_LIQUIDITY

        uint balance0;
        uint balance1;
        {// scope for _token{0,1}, avoids stack too deep errors
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1);
            // INVALID_TO
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
            // optimistically transfer tokens
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
            // optimistically transfer tokens
            if (data.length > 0) IUniswapV2CalleeV5(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            balance0 = IERC20V5(_token0).balanceOf(address(this)) - twammReserve0;
            balance1 = IERC20V5(_token1).balanceOf(address(this)) - twammReserve1;
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0);
        // INSUFFICIENT_INPUT_AMOUNT
        {// scope for reserve{0,1}Adjusted, avoids stack too deep errors
            uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
            uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
            require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000 ** 2), 'K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // force balances to match reserves
    function skim(address to) external override lock execVirtualOrders {
        address _token0 = token0;
        // gas savings
        address _token1 = token1;
        // gas savings
        _safeTransfer(_token0, to, IERC20V5(_token0).balanceOf(address(this)).sub(reserve0) - twammReserve0);
        _safeTransfer(_token1, to, IERC20V5(_token1).balanceOf(address(this)).sub(reserve1) - twammReserve1);
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

    // EC5: Whitelist has not been disabled
    modifier onlyWhitelist() {
        require(whitelistDisabled || msg.sender == owner_address);
        _;
    }

    ///@notice opens longTermOrders to all users
    function disableWhitelist() public {
        //EC6: Only owner or factory can disable the whitelist
        require(msg.sender == owner_address || msg.sender == factory);
        whitelistDisabled = true;
    }

    function twammUpToDate() public view returns (bool){
        return block.number <= longTermOrders.lastVirtualOrderBlock;
    }

    ///@notice create a long term order to swap from tokenA
    ///@param amountAIn total amount of token A to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromAToB(uint256 amountAIn, uint256 numberOfBlockIntervals) external lock onlyWhitelist execVirtualOrders {
        twammReserve0 += uint112(amountAIn);
        uint256 orderId = longTermOrders.longTermSwapFromAToB(amountAIn, numberOfBlockIntervals);
        emit LongTermSwapAToB(msg.sender, amountAIn, orderId);
    }

    ///@notice create a long term order to swap from tokenB
    ///@param amountBIn total amount of tokenB to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromBToA(uint256 amountBIn, uint256 numberOfBlockIntervals) external lock onlyWhitelist execVirtualOrders {
        twammReserve1 += uint112(amountBIn);
        uint256 orderId = longTermOrders.longTermSwapFromBToA(amountBIn, numberOfBlockIntervals);
        emit LongTermSwapBToA(msg.sender, amountBIn, orderId);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(uint256 orderId) external lock onlyWhitelist execVirtualOrders {
        (address sellToken, uint256 unsoldAmount, address buyToken, uint256 purchasedAmount) = longTermOrders.cancelLongTermSwap(orderId);

        bool isToken0 = buyToken == token0;
        twammReserve0 -= uint112(isToken0 ? purchasedAmount : unsoldAmount);
        twammReserve1 -= uint112(isToken0 ? unsoldAmount : purchasedAmount);

        emit CancelLongTermOrder(msg.sender, orderId);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(uint256 orderId) external lock onlyWhitelist execVirtualOrders {
        (address proceedToken, uint256 proceeds) = longTermOrders.withdrawProceedsFromLongTermSwap(orderId);
        if (proceedToken == token0) {
            twammReserve0 -= uint112(proceeds);
        } else {
            twammReserve1 -= uint112(proceeds);
        }
        emit WithdrawProceedsFromLongTermOrder(msg.sender, orderId);
    }

    function executeVirtualOrdersInternal(uint256 blockNumber) internal {

        LongTermOrdersLib.ExecuteVirtualOrdersResult memory result;
        result.newReserve0 = reserve0;
        result.newReserve1 = reserve1;
        result.newTwammReserve0 = twammReserve0;
        result.newTwammReserve1 = twammReserve1;

        longTermOrders.executeVirtualOrdersUntilBlock(blockNumber, result);

        reserve0 = uint112(result.newReserve0);
        reserve1 = uint112(result.newReserve1);
        twammReserve0 = uint112(result.newTwammReserve0);
        twammReserve1 = uint112(result.newTwammReserve1);

    }

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders(uint256 blockNumber) public lock {
        require(blockNumber <= block.number);
        executeVirtualOrdersInternal(blockNumber);
    }
}
