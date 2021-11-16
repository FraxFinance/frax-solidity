pragma solidity ^0.8.4;

import "./Math.sol";
import "./SafeMath.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TWAMMSwap is Ownable {
    using SafeMath for uint;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    IERC20 public token0;
    IERC20 public token1;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    
    uint private twammTimestampLast; // uses single storage slot, accessible via getReserves
    uint public buy0PerSecond;
    uint public buy1PerSecond;
    uint public sell0PerSecond;
    uint public sell2PerSecond;
    uint public buy0EndTime;
    uint public buy1EndTime;
    uint public bought0;
    uint public bought1;
    uint public sold0;
    uint public sold1;

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'TWAPP: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint _twammTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _twammTimestampLast = twammTimestampLast;
    }

    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor(IERC20 _token0, IERC20 _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    /* External TWAMM functions for owner */

    // Set the TWAMMTrade to execute
    function setTWAMMTrade(uint _buy0PerSecond,uint _buy0EndTime, uint _buy1PerSecond, uint _buy1EndTime) external lock onlyOwner {
        _executeTWAMMTrade();
        buy0PerSecond = _buy0PerSecond;
        buy0EndTime = _buy0EndTime;
        buy1PerSecond = _buy1PerSecond;
        buy1EndTime = _buy1EndTime;
        twammTimestampLast=block.timestamp;
        
        uint balance0 = IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0);
        uint balance1 = IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1);
        _update(balance0, balance1);
    }
    
    // Execute the swap
    function executeTWAMMSwap() external lock onlyOwner {
        if (sold0>0 && bought0<sold0) SafeERC20.safeTransferFrom(token0, msg.sender, address(this), sold0-bought0);
        if (sold1>0 && bought1<sold1) SafeERC20.safeTransferFrom(token1, msg.sender, address(this), sold1-bought1);
        if (bought0>0 && bought0>sold0) SafeERC20.safeTransfer(token0, msg.sender, bought0-sold0);
        if (bought1>0 && bought1>sold1) SafeERC20.safeTransfer(token1, msg.sender, bought1-sold1);
        bought0 = bought1 = sold0 = sold1 = 0;
    }
    
    /* External add remove liquidity functions for owner */

    // Removes liquidity
    function removeLiquidity(uint percentage) external lock onlyOwner returns (uint amount0, uint amount1) {
        _executeTWAMMTrade();
        uint balance0 = IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0);
        uint balance1 = IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1);

        amount0 = balance0*percentage/1e18;
        amount1 = balance1*percentage/1e18;
        SafeERC20.safeTransfer(token0, msg.sender, amount0);
        SafeERC20.safeTransfer(token1, msg.sender, amount1);
        
        balance0 = IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0);
        balance1 = IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1);
        _update(balance0, balance1);
    }
    
     // Adds liquidity
    function addLiquidity(uint token0Amount, uint token1Amount, uint min_token1Amount, uint max_token1Amount) external lock onlyOwner {
        _executeTWAMMTrade();
        uint balance0 = IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0);
        uint balance1 = IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1);
        
        if (balance1>0) token1Amount = balance0*balance1/token0Amount; // adjust token1Amount to match the ratio
        require(token1Amount>=min_token1Amount && token1Amount<=max_token1Amount,'TWAPP: PRICE NOT WITHIN BOUNDS');
        SafeERC20.safeTransferFrom(token0, msg.sender, address(this), token0Amount);
        SafeERC20.safeTransferFrom(token1, msg.sender, address(this), token1Amount);
        
        balance0 = IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0);
        balance1 = IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1);
        _update(balance0, balance1);
    }
    
    
    /* External swap function for end users */
    
    function swapExactTokensForTokens(uint amountIn, uint amountOutMin, IERC20 tokenFrom, IERC20 tokenTo, address to, uint deadline) external lock returns (uint amount) {
        require(deadline==0 || block.timestamp<=deadline,'TWAPP: EXPIRED');
        _executeTWAMMTrade();
        uint balance0 = IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0);
        uint balance1 = IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1);
        
        if (tokenFrom==token0  && tokenTo==token1) {
            amount = getAmountOut(amountIn, balance0, balance1);
            require(amount>=amountOutMin,'TWAPP: INSUFFICIENT_OUTPUT_AMOUNT');
            SafeERC20.safeTransferFrom(token0, msg.sender, address(this), amountIn);
            swap(0, amount, to);
        } else if (tokenFrom==token1  && tokenTo==token0) {
            amount = getAmountOut(amountIn, balance1, balance0);
            require(amount>=amountOutMin,'TWAPP: INSUFFICIENT_OUTPUT_AMOUNT');
            SafeERC20.safeTransferFrom(token1, msg.sender, address(this), amountIn);
            swap(amount, 0, to);
        }
    }
    
    
    /* External utility functions */
    
    // force balances to match reserves
    function skim(address to) external lock {
        IERC20 _token0 = token0; // gas savings
        IERC20 _token1 = token1; // gas savings
        SafeERC20.safeTransfer(_token0, to, _token0.balanceOf(address(this)).add(bought0).sub(sold0).sub(reserve0));
        SafeERC20.safeTransfer(_token1, to, _token1.balanceOf(address(this)).add(bought1).sub(sold1).sub(reserve1));
    }

    // force reserves to match balances
    function sync() external lock {
    	_executeTWAMMTrade();
        _update(IERC20(token0).balanceOf(address(this)).add(sold0).sub(bought0), IERC20(token1).balanceOf(address(this)).add(sold1).sub(bought1));
    }
    
    
    /* Internal functions */
    
    // update reserves
    function _update(uint balance0, uint balance1) private {
        require(balance0 <=type(uint112).max  && balance1 <= type(uint112).max, 'TWAPP: OVERFLOW');
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }
    
    // internal function that executes the TWAMM trade for the previous period
    function _executeTWAMMTrade() internal {
        if (block.timestamp>twammTimestampLast) {
            if (buy0PerSecond>0 && twammTimestampLast<buy0EndTime) {
                uint period = Math.min(buy0EndTime,block.timestamp) - twammTimestampLast;
                uint bought = period*buy0PerSecond;
                uint sold = getAmountIn(bought,reserve1,reserve0);
                bought0+=bought;
                sold1+=sold;
            }
            if (buy1PerSecond>0 && twammTimestampLast<buy1EndTime) {
                uint period = Math.min(buy1EndTime,block.timestamp) - twammTimestampLast;
                uint bought = period*buy1PerSecond;
                uint sold = getAmountIn(bought,reserve0,reserve1);
                bought1+=bought;
                sold0+=sold;
            }
            twammTimestampLast = block.timestamp;
        }
    }

    function swap(uint amount0Out, uint amount1Out, address to) internal {
        require(amount0Out > 0 || amount1Out > 0, 'TWAPP: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'TWAPP: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        IERC20 _token0 = token0;
        IERC20 _token1 = token1;
        require(to != address(_token0) && to != address(_token1), 'TWAPP: INVALID_TO');
        if (amount0Out > 0) SafeERC20.safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) SafeERC20.safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
        
        //if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        balance0 = IERC20(_token0).balanceOf(address(this)).add(sold0).sub(bought0);
        balance1 = IERC20(_token1).balanceOf(address(this)).add(sold1).sub(bought1);
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'TWAPP: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'TWAPP: K');
        }
        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /* Internal utility functions */
    
    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'TWAPP: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'TWAPP: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }
    
    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) internal pure returns (uint amountIn) {
        require(amountOut > 0, 'TWAPP: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'TWAPP: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }
}
