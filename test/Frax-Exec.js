const BigNumber = require('bignumber.js');
require('@openzeppelin/test-helpers/configure')({
	provider: 'http://127.0.0.1:7545',
  });
const { expectEvent, send, shouldFail, time } = require('@openzeppelin/test-helpers');
global.artifacts = artifacts;
global.web3 = web3;

const Address = artifacts.require("Utils/Address");
const BlockMiner = artifacts.require("Utils/BlockMiner");
const Math = artifacts.require("Math/Math");
const SafeMath = artifacts.require("Math/SafeMath");
const Babylonian = artifacts.require("Math/Babylonian");
const FixedPoint = artifacts.require("Math/FixedPoint");
const UQ112x112 = artifacts.require("Math/UQ112x112");
const Owned = artifacts.require("Staking/Owned");
const ERC20 = artifacts.require("ERC20/ERC20");
const ERC20Custom = artifacts.require("ERC20/ERC20Custom");
const SafeERC20 = artifacts.require("ERC20/SafeERC20");

// Uniswap related
const TransferHelper = artifacts.require("Uniswap/TransferHelper");
const SwapToPrice = artifacts.require("Uniswap/SwapToPrice");
const UniswapV2ERC20 = artifacts.require("Uniswap/UniswapV2ERC20");
const UniswapV2Factory = artifacts.require("Uniswap/UniswapV2Factory");
const UniswapV2Library = artifacts.require("Uniswap/UniswapV2Library");
const UniswapV2OracleLibrary = artifacts.require("Uniswap/UniswapV2OracleLibrary");
const UniswapV2Pair = artifacts.require("Uniswap/UniswapV2Pair");
const UniswapV2Router02_Modified = artifacts.require("Uniswap/UniswapV2Router02_Modified");

// Collateral
const WETH = artifacts.require("ERC20/WETH");
const FakeCollateral_USDC = artifacts.require("FakeCollateral/FakeCollateral_USDC");
const FakeCollateral_USDT = artifacts.require("FakeCollateral/FakeCollateral_USDT");
const FakeCollateral_yUSD = artifacts.require("FakeCollateral/FakeCollateral_yUSD");

// Collateral Pools
const Pool_USDC = artifacts.require("Frax/Pools/Pool_USDC");
const Pool_USDT = artifacts.require("Frax/Pools/Pool_USDT");
const Pool_yUSD = artifacts.require("Frax/Pools/Pool_yUSD");

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_WETH");
const UniswapPairOracle_FRAX_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_USDT");
const UniswapPairOracle_FRAX_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_USDC");
const UniswapPairOracle_FRAX_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_FRAX_yUSD");
const UniswapPairOracle_FXS_WETH = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_WETH");
const UniswapPairOracle_FXS_USDT = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_USDT");
const UniswapPairOracle_FXS_USDC = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_USDC");
const UniswapPairOracle_FXS_yUSD = artifacts.require("Oracle/Fakes/UniswapPairOracle_FXS_yUSD");

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");

// FRAX core
const FRAXStablecoin = artifacts.require("Frax/FRAXStablecoin");
const FRAXShares = artifacts.require("FXS/FRAXShares");
const GovernorAlpha = artifacts.require("Governance/GovernorAlpha");
const StakingRewards = artifacts.require("Staking/StakingRewards");

const ONE_MILLION_DEC18 = new BigNumber("1000000e18");
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const DUMP_ADDRESS = "0x6666666666666666666666666666666666666666";
const METAMASK_ADDRESS = "0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5";

// Good examples
// https://github.com/KyberNetwork/workshop/tree/master/examples/truffle

module.exports = async function(done) {
	// Get the accounts
	const accounts = await web3.eth.getAccounts();

	
	// Advance 24 hrs to catch things up
	await time.increase(86400 + 1);
	await time.advanceBlock();

	// call this to signal truffle that your script is done
	console.log("DONE");
    done();
}