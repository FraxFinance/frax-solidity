pragma solidity ^0.8.4;

import "hardhat/console.sol";
import '../Uniswap_V2_TWAMM/core/interfaces/IUniswapV2PairV5.sol';
import '../Uniswap_V2_TWAMM/core/UniV2TWAMMERC20.sol';
import '../Math/Math.sol';
import '../Math/UQ112x112.sol';
import '../Uniswap_V2_TWAMM/core/interfaces/IERC20V5.sol';
import '../Uniswap_V2_TWAMM/core/interfaces/IUniswapV2FactoryV5.sol';
import '../Uniswap_V2_TWAMM/core/interfaces/IUniswapV2CalleeV5.sol';

contract FraxswapRangePair is UniV2TWAMMERC20 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;           	// uses single storage slot, accessible via getReserves
    uint112 private reserve1;           	// uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; 	// uses single storage slot, accessible via getReserves
    uint112 public virtualReserve0;    	// reserves not in the AMM because outside of range 
    uint112 public virtualReserve1;    	// reserves not in the AMM because outside of range
    uint256 lastVirtualReserveUpdateK;
    uint256 public centerPrice;
    uint256 public Q;
    uint256 public constant PRECISION = 10**18;
    uint256 public fee;

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'UniswapV2: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2: TRANSFER_FAILED');
    }

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor() public {
        factory = msg.sender;
    }

    // called once by the factory at time of deployment
    function initialize(address _token0, address _token1, uint _centerPrice, uint _rangeSize, uint _fee) external {
        require(msg.sender == factory, 'UniswapV2: FORBIDDEN'); // sufficient check
        token0 = _token0;
        token1 = _token1;
        centerPrice = _centerPrice;
        Q = (_rangeSize+PRECISION)*_centerPrice/PRECISION;
        fee = _fee;
    }
    
    function rangeSize() public view returns (uint rangeSize) {
    	return (Q*PRECISION/centerPrice)-PRECISION;
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1, bool forceUpdateVirtualReserves) private {
        require(balance0 <= uint112(type(uint).max) && balance1 <= uint112(type(uint).max), 'UniswapV2: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        
        uint K = balance0*balance1;
        if (forceUpdateVirtualReserves || K*(10000-fee)/10000>lastVirtualReserveUpdateK || K<lastVirtualReserveUpdateK) { // Max 0.01% K change, means max 0.01% price change after update of virtual reserves
   	   /* Update virtual reserves in case K has changed
 	   ** Definitions:
	   ** V0 = virtualReserve0
	   ** V1 = virtualReserve1
	   ** A0 = actualBalance0
	   ** A1 = actualBalance1
	   ** We are solving the following equations
	   ** K = Q*V0^2             // There is a fixed ratio between V0^2 and K, meaning we have a fixed upper price boundary.
	   ** V1/V0 = centerPrice    // The ratio between virtualReserve0 and virtualReserve1 is fixed, so we also have a fixed lower boundary as well
	   ** K = (V0*A0)*(V1*A1)    // K is the product of the two full reserves
	   ** ==>
	   ** (centerPrice-Q)*V0^2 + (A1+A0*centerPrice)*V0 + A0*A1 = 0
	   ** ==>
	   ** a = (centerPrice-Q), b = (A1+A0*centerPrice), c = A0*A1
	   ** a*V0^2+b*V0+c = 0     
	   ** ==>
	   ** V0 = (-b(+/-)sqrt(b^2-4ac))/(2*a) // Famous abc-formula
	   */
	   uint actualBalance0 = balance0-virtualReserve0;
           uint actualBalance1 = balance1-virtualReserve1;
	   uint256 minus_a = Q-centerPrice;
	   uint256 b = actualBalance1+actualBalance0*centerPrice/PRECISION;
	   uint256 c = actualBalance0*actualBalance1;
	   uint256 sqrt_b2_4ac = Math.sqrt(b*b+(c*4*minus_a/PRECISION));
	   uint newVirtualReserve0 = (sqrt_b2_4ac+b)*PRECISION/(2*minus_a);
	   virtualReserve0 = uint112(newVirtualReserve0);
	   virtualReserve1 = uint112(newVirtualReserve0*centerPrice/PRECISION);
	   reserve0 = uint112(actualBalance0+virtualReserve0);
           reserve1 = uint112(actualBalance1+virtualReserve1);
           lastVirtualReserveUpdateK=uint(reserve0)*uint(reserve1);
	} else {
	   reserve0 = uint112(balance0);
           reserve1 = uint112(balance1);
	}
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
    function mint(address to) external lock returns (uint liquidity) {
    	uint balance0 = IERC20V5(token0).balanceOf(address(this));
        uint balance1 = IERC20V5(token1).balanceOf(address(this));
        if (totalSupply>0) {
	   _update(reserve0,reserve1, reserve0, reserve1,true); // Make sure virtual reserves are correctly set
	} else {
	   _update(balance0,balance1, reserve0, reserve1,true); // Make sure virtual reserves are correctly set
	}
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint amount0 = balance0.add(virtualReserve0).sub(_reserve0);
        uint amount1 = balance1.add(virtualReserve1).sub(_reserve1);
        
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
	    liquidity = Math.sqrt(uint(_reserve0).mul(uint(_reserve1))).sub(MINIMUM_LIQUIDITY);
	   _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min(amount0.mul(_totalSupply) / (_reserve0 - virtualReserve0), amount1.mul(_totalSupply) / (_reserve1 - virtualReserve1));
        }
        require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);
        

        _update(balance0.add(virtualReserve0), balance1.add(virtualReserve1), _reserve0, _reserve1,true);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function burn(address to) external lock returns (uint amount0, uint amount1) {
    	_update(reserve0,reserve1, reserve0, reserve1,true); // Make sure virtual reserves are correctly set
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint balance0 = IERC20V5(_token0).balanceOf(address(this));
        uint balance1 = IERC20V5(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20V5(_token0).balanceOf(address(this));
        balance1 = IERC20V5(_token1).balanceOf(address(this));

        _update(balance0.add(virtualReserve0), balance1.add(virtualReserve1), _reserve0, _reserve1,true);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out <= _reserve0-virtualReserve0 && amount1Out <= _reserve1-virtualReserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');
        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
        if (data.length > 0) IUniswapV2CalleeV5(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        
        balance0 = IERC20V5(_token0).balanceOf(address(this))+virtualReserve0;
        balance1 = IERC20V5(_token1).balanceOf(address(this))+virtualReserve1;
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint _fee=fee; // gas savings
        uint balance0Adjusted = balance0.mul(10000).sub(amount0In.mul(_fee));
        uint balance1Adjusted = balance1.mul(10000).sub(amount1In.mul(_fee));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(10000**2), 'UniswapV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1,false);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // force balances to match reserves
    function skim(address to) external lock {
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        _safeTransfer(_token0, to, IERC20V5(_token0).balanceOf(address(this)).add(virtualReserve0).sub(reserve0));
        _safeTransfer(_token1, to, IERC20V5(_token1).balanceOf(address(this)).add(virtualReserve1).sub(reserve1));
    }

    // force reserves to match balances
    function sync() external lock {
        _update(IERC20V5(token0).balanceOf(address(this)).add(virtualReserve0), IERC20V5(token1).balanceOf(address(this)).add(virtualReserve1), reserve0, reserve1,true);
    }
}