const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');
const {expectRevert, time} = require('@openzeppelin/test-helpers');

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const Address = artifacts.require('Utils/Address');
const BlockMiner = artifacts.require('Utils/BlockMiner');
const Math = artifacts.require('Math/Math');
const SafeMath = artifacts.require('Math/SafeMath');
const Babylonian = artifacts.require('Math/Babylonian');
const FixedPoint = artifacts.require('Math/FixedPoint');
const UQ112x112 = artifacts.require('Math/UQ112x112');
const Owned = artifacts.require('Staking/Owned');
const ERC20 = artifacts.require('ERC20/ERC20');
const ERC20Custom = artifacts.require('ERC20/ERC20Custom');
const SafeERC20 = artifacts.require('ERC20/SafeERC20');

// Uniswap related
const TransferHelper = artifacts.require('Uniswap/TransferHelper');
const SwapToPrice = artifacts.require('Uniswap/SwapToPrice');
const UniswapV2ERC20 = artifacts.require('Uniswap/UniswapV2ERC20');
const UniswapV2Factory = artifacts.require('Uniswap/UniswapV2Factory');
const UniswapV2Library = artifacts.require('Uniswap/UniswapV2Library');
const UniswapV2OracleLibrary = artifacts.require(
  'Uniswap/UniswapV2OracleLibrary'
);
const UniswapV2Pair = artifacts.require('Uniswap/UniswapV2Pair');
const UniswapV2Router02_Modified = artifacts.require(
  'Uniswap/UniswapV2Router02_Modified'
);

// Collateral
const WETH = artifacts.require('ERC20/WETH');
const FakeCollateral_USDC = artifacts.require(
  'FakeCollateral/FakeCollateral_USDC'
);
const FakeCollateral_USDT = artifacts.require(
  'FakeCollateral/FakeCollateral_USDT'
);

// Collateral Pools
const Pool_USDC = artifacts.require('Frax/Pools/Pool_USDC');
const Pool_USDT = artifacts.require('Frax/Pools/Pool_USDT');

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_WETH'
);
const UniswapPairOracle_FRAX_USDT = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_USDT'
);
const UniswapPairOracle_FRAX_USDC = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_USDC'
);

const UniswapPairOracle_FXS_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FXS_WETH'
);
const UniswapPairOracle_FXS_USDT = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FXS_USDT'
);
const UniswapPairOracle_FXS_USDC = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FXS_USDC'
);

const UniswapPairOracle_USDT_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_USDT_WETH'
);
const UniswapPairOracle_USDC_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_USDC_WETH'
);

// Chainlink Price Consumer
//const ChainlinkETHUSDPriceConsumer = artifacts.require("Oracle/ChainlinkETHUSDPriceConsumer");
const ChainlinkETHUSDPriceConsumerTest = artifacts.require(
  'Oracle/ChainlinkETHUSDPriceConsumerTest'
);

// FRAX core
const FRAXStablecoin = artifacts.require('Frax/FRAXStablecoin');
const FRAXShares = artifacts.require('FXS/FRAXShares');
const StakingRewards_FRAX_WETH = artifacts.require(
  'Staking/Variants/Stake_FRAX_WETH.sol'
);
const StakingRewards_FRAX_USDC = artifacts.require(
  'Staking/Variants/Stake_FRAX_USDC.sol'
);
//const StakingRewards_FRAX_USDT = artifacts.require("Staking/Variants/Stake_FRAX_USDT.sol");
// const StakingRewards_FRAX_yUSD = artifacts.require("Staking/Variants/Stake_FRAX_yUSD.sol");
const StakingRewards_FXS_WETH = artifacts.require(
  'Staking/Variants/Stake_FXS_WETH.sol'
);
//const StakingRewards_FXS_USDC = artifacts.require("Staking/Variants/Stake_FXS_USDC.sol");
//const StakingRewards_FXS_USDT = artifacts.require("Staking/Variants/Stake_FXS_USDT.sol");
// const StakingRewards_FXS_yUSD = artifacts.require("Staking/Variants/Stake_FXS_yUSD.sol");

// Token vesting
const TokenVesting = artifacts.require('FXS/TokenVesting.sol');
// Governance related
const GovernorAlpha = artifacts.require('Governance/GovernorAlpha');
const Timelock = artifacts.require('Governance/Timelock');

const ONE_MILLION_DEC18 = new BigNumber(1000000e18);
const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);
const COLLATERAL_SEED_DEC6 = new BigNumber(508500e6);
const ONE_THOUSAND_DEC18 = new BigNumber(1000e18);
const THREE_THOUSAND_DEC18 = new BigNumber(3000e18);
const THREE_THOUSAND_DEC6 = new BigNumber(3000e6);
const BIG6 = new BigNumber('1e6');
const BIG18 = new BigNumber('1e18');
const TIMELOCK_DELAY = 86400 * 2; // 2 days
const DUMP_ADDRESS = '0x6666666666666666666666666666666666666666';
const METAMASK_ADDRESS = '0x6A24A4EcA5Ed225CeaE6895e071a74344E2853F5';

const REWARDS_DURATION = 7 * 86400; // 7 days

let totalSupplyFRAX;
let totalSupplyFXS;
let globalCollateralRatio;
let globalCollateralValue;

contract('FRAX', async (accounts) => {
  // Constants
  let COLLATERAL_FRAX_AND_FXS_OWNER;
  let ORACLE_ADDRESS;
  let POOL_CREATOR;
  let TIMELOCK_ADMIN;
  let GOVERNOR_GUARDIAN_ADDRESS;
  let STAKING_OWNER;
  let STAKING_REWARDS_DISTRIBUTOR;
  // let COLLATERAL_FRAX_AND_FXS_OWNER;

  // Initialize core contract instances
  let fraxInstance;
  let fxsInstance;

  let vestingInstance;

  // Initialize collateral instances
  let wethInstance;
  let col_instance_USDC;
  let col_instance_USDT;

  // Initialize the Uniswap Router Instance
  let routerInstance;

  // Initialize the Uniswap Factory Instance
  let factoryInstance;

  // Initialize the Uniswap Libraries
  let uniswapLibraryInstance;
  let uniswapOracleLibraryInstance;

  // Initialize the Timelock instance
  let timelockInstance;

  // Initialize the swap to price contract
  let swapToPriceInstance;

  // Initialize oracle instances
  let oracle_instance_FRAX_WETH;
  let oracle_instance_FRAX_USDC;
  let oracle_instance_FRAX_USDT;

  let oracle_instance_FXS_WETH;
  let oracle_instance_FXS_USDC;
  let oracle_instance_FXS_USDT;

  // Initialize ETH-USD Chainlink Oracle too
  let oracle_chainlink_ETH_USD;

  // Initialize the governance contract
  let governanceInstance;

  // Initialize pool instances
  let pool_instance_USDC;
  let pool_instance_USDT;

  // Initialize pair addresses
  let pair_addr_FRAX_WETH;
  let pair_addr_FRAX_USDC;
  let pair_addr_FRAX_USDT;
  let pair_addr_FXS_WETH;
  let pair_addr_FXS_USDC;
  let pair_addr_FXS_USDT;

  // Initialize pair contracts
  let pair_instance_FRAX_WETH;
  let pair_instance_FRAX_USDC;
  let pair_instance_FRAX_USDT;
  let pair_instance_FXS_WETH;
  let pair_instance_FXS_USDC;
  let pair_instance_FXS_USDT;

  // Initialize pair orders
  let fraxfxs_first_FRAX_WETH;
  let fraxfxs_first_FRAX_USDC;
  let fraxfxs_first_FRAX_USDT;
  let fraxfxs_first_FXS_WETH;
  let fraxfxs_first_FXS_USDC;
  let fraxfxs_first_FXS_USDT;

  // Initialize staking instances
  let stakingInstance_FRAX_WETH;
  let stakingInstance_FRAX_USDC;
  //let stakingInstance_FRAX_USDT;
  // let stakingInstance_FRAX_yUSD;
  let stakingInstance_FXS_WETH;
  //let stakingInstance_FXS_USDC;
  //let stakingInstance_FXS_USDT;
  // let stakingInstance_FXS_yUSD;

  // Initialize running balances
  let bal_frax = 0;
  let bal_fxs = 0;
  let col_bal_usdc = 0;
  let col_rat = 1;
  let pool_bal_usdc = 0;
  let global_collateral_value = 0;

  beforeEach(async () => {
    // Constants
    COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
    ORACLE_ADDRESS = accounts[2];
    POOL_CREATOR = accounts[3];
    TIMELOCK_ADMIN = accounts[4];
    GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
    STAKING_OWNER = accounts[6];
    STAKING_REWARDS_DISTRIBUTOR = accounts[7];
    // COLLATERAL_FRAX_AND_FXS_OWNER = accounts[8];

    // Fill core contract instances
    fraxInstance = await FRAXStablecoin.deployed();
    fxsInstance = await FRAXShares.deployed();

    vestingInstance = await TokenVesting.deployed();

    // Fill collateral instances
    wethInstance = await WETH.deployed();
    col_instance_USDC = await FakeCollateral_USDC.deployed();
    col_instance_USDT = await FakeCollateral_USDT.deployed();

    // Fill the Uniswap Router Instance
    routerInstance = await UniswapV2Router02_Modified.deployed();

    // Fill the Timelock instance
    timelockInstance = await Timelock.deployed();

    // Fill oracle instances
    oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed();
    oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.deployed();

    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed();
    oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed();

    oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();

    // Initialize ETH-USD Chainlink Oracle too
    //oracle_chainlink_ETH_USD = await ChainlinkETHUSDPriceConsumer.deployed();
    oracle_chainlink_ETH_USD =
      await ChainlinkETHUSDPriceConsumerTest.deployed();

    // Initialize the governance contract
    governanceInstance = await GovernorAlpha.deployed();

    // Fill pool instances
    pool_instance_USDC = await Pool_USDC.deployed();
    pool_instance_USDT = await Pool_USDT.deployed();

    // Initialize the Uniswap Factory Instance
    uniswapFactoryInstance = await UniswapV2Factory.deployed();

    // Initialize the Uniswap Libraries
    uniswapLibraryInstance = await UniswapV2OracleLibrary.deployed();
    uniswapOracleLibraryInstance = await UniswapV2Library.deployed();

    // Initialize the swap to price contract
    swapToPriceInstance = await SwapToPrice.deployed();

    // Get the addresses of the pairs
    pair_addr_FRAX_WETH = await uniswapFactoryInstance.getPair(
      fraxInstance.address,
      WETH.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_FRAX_USDC = await uniswapFactoryInstance.getPair(
      fraxInstance.address,
      FakeCollateral_USDC.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_FRAX_USDT = await uniswapFactoryInstance.getPair(
      fraxInstance.address,
      FakeCollateral_USDT.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_FXS_WETH = await uniswapFactoryInstance.getPair(
      fxsInstance.address,
      WETH.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_FXS_USDC = await uniswapFactoryInstance.getPair(
      fxsInstance.address,
      FakeCollateral_USDC.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_FXS_USDT = await uniswapFactoryInstance.getPair(
      fxsInstance.address,
      FakeCollateral_USDT.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_USDT_WETH = await uniswapFactoryInstance.getPair(
      FakeCollateral_USDT.address,
      WETH.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    pair_addr_USDC_WETH = await uniswapFactoryInstance.getPair(
      FakeCollateral_USDC.address,
      WETH.address,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Get instances of the pairs
    pair_instance_FRAX_WETH = await UniswapV2Pair.at(pair_addr_FRAX_WETH);
    pair_instance_FRAX_USDC = await UniswapV2Pair.at(pair_addr_FRAX_USDC);
    pair_instance_FRAX_USDT = await UniswapV2Pair.at(pair_addr_FRAX_USDT);
    pair_instance_FXS_WETH = await UniswapV2Pair.at(pair_addr_FXS_WETH);
    pair_instance_FXS_USDC = await UniswapV2Pair.at(pair_addr_FXS_USDC);
    pair_instance_FXS_USDT = await UniswapV2Pair.at(pair_addr_FXS_USDT);
    pair_instance_USDT_WETH = await UniswapV2Pair.at(pair_addr_USDT_WETH);
    pair_instance_USDC_WETH = await UniswapV2Pair.at(pair_addr_USDC_WETH);

    // Get the pair order results
    fraxfxs_first_FRAX_WETH = await oracle_instance_FRAX_WETH.token0();
    fraxfxs_first_FRAX_USDC = await oracle_instance_FRAX_USDC.token0();
    fraxfxs_first_FRAX_USDT = await oracle_instance_FRAX_USDT.token0();
    fraxfxs_first_FXS_WETH = await oracle_instance_FXS_WETH.token0();
    fraxfxs_first_FXS_USDC = await oracle_instance_FXS_USDC.token0();
    fraxfxs_first_FXS_USDT = await oracle_instance_FXS_USDT.token0();

    fraxfxs_first_FRAX_WETH = fraxInstance.address == fraxfxs_first_FRAX_WETH;
    fraxfxs_first_FRAX_USDC = fraxInstance.address == fraxfxs_first_FRAX_USDC;
    fraxfxs_first_FRAX_USDT = fraxInstance.address == fraxfxs_first_FRAX_USDT;
    fraxfxs_first_FXS_WETH = fxsInstance.address == fraxfxs_first_FXS_WETH;
    fraxfxs_first_FXS_USDC = fxsInstance.address == fraxfxs_first_FXS_USDC;
    fraxfxs_first_FXS_USDT = fxsInstance.address == fraxfxs_first_FXS_USDT;

    // Fill the staking rewards instances
    stakingInstance_FRAX_WETH = await StakingRewards_FRAX_WETH.deployed();
    stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.deployed();
    //stakingInstance_FRAX_USDT = await StakingRewards_FRAX_USDT.deployed();
    // stakingInstance_FRAX_yUSD = await StakingRewards_FRAX_yUSD.deployed();
    stakingInstance_FXS_WETH = await StakingRewards_FXS_WETH.deployed();
    //stakingInstance_FXS_USDC = await StakingRewards_FXS_USDC.deployed();
    //stakingInstance_FXS_USDT = await StakingRewards_FXS_USDT.deployed();
    // stakingInstance_FXS_yUSD = await StakingRewards_FXS_yUSD.deployed();
  });

  // INITIALIZATION
  // ================================================================
  it('Check up on the oracles and make sure the prices are set', async () => {
    // Advance 24 hrs so the period can be computed
    await time.increase(86400 + 1);
    await time.advanceBlock();

    // Make sure the prices are updated
    await oracle_instance_FRAX_WETH.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await oracle_instance_FRAX_USDC.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await oracle_instance_FRAX_USDT.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await oracle_instance_FXS_WETH.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await oracle_instance_FXS_USDC.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await oracle_instance_FXS_USDT.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    await oracle_instance_USDT_WETH.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await oracle_instance_USDC_WETH.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Get the prices
    // Price is in collateral needed for 1 FRAX
    let frax_price_from_FRAX_WETH = new BigNumber(
      await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6)
    )
      .div(BIG6)
      .toNumber();
    let frax_price_from_FRAX_USDC = new BigNumber(
      await oracle_instance_FRAX_USDC.consult.call(
        fraxInstance.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);
    let frax_price_from_FRAX_USDT = new BigNumber(
      await oracle_instance_FRAX_USDT.consult.call(
        fraxInstance.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);
    let fxs_price_from_FXS_WETH = new BigNumber(
      await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6)
    )
      .div(BIG6)
      .toNumber();
    let fxs_price_from_FXS_USDC = new BigNumber(
      await oracle_instance_FXS_USDC.consult.call(
        fxsInstance.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);
    let fxs_price_from_FXS_USDT = new BigNumber(
      await oracle_instance_FXS_USDT.consult.call(
        fxsInstance.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);
    let USDT_price_from_USDT_WETH = new BigNumber(
      await oracle_instance_USDT_WETH.consult.call(
        WETH.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);
    let USDC_price_from_USDC_WETH = new BigNumber(
      await oracle_instance_USDC_WETH.consult.call(
        WETH.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);

    // Print the prices
    console.log(
      'frax_price_from_FRAX_WETH: ',
      frax_price_from_FRAX_WETH.toString(),
      ' FRAX = 1 WETH'
    );
    console.log(
      'frax_price_from_FRAX_USDC: ',
      frax_price_from_FRAX_USDC.toString(),
      ' FRAX = 1 USDC'
    );
    console.log(
      'frax_price_from_FRAX_USDT: ',
      frax_price_from_FRAX_USDT.toString(),
      ' FRAX = 1 USDT'
    );
    console.log(
      'fxs_price_from_FXS_WETH: ',
      fxs_price_from_FXS_WETH.toString(),
      ' FXS = 1 WETH'
    );
    console.log(
      'fxs_price_from_FXS_USDC: ',
      fxs_price_from_FXS_USDC.toString(),
      ' FXS = 1 USDC'
    );
    console.log(
      'fxs_price_from_FXS_USDT: ',
      fxs_price_from_FXS_USDT.toString(),
      ' FXS = 1 USDT'
    );
    console.log(
      'USDT_price_from_USDT_WETH: ',
      USDT_price_from_USDT_WETH.toString(),
      ' USDT = 1 WETH'
    );
    console.log(
      'USDC_price_from_USDC_WETH: ',
      USDC_price_from_USDC_WETH.toString(),
      ' USDC = 1 WETH'
    );

    // Add allowances to the Uniswap Router
    await wethInstance.approve(
      routerInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await col_instance_USDC.approve(
      routerInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await col_instance_USDT.approve(
      routerInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await fraxInstance.approve(
      routerInstance.address,
      new BigNumber(1000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await fxsInstance.approve(
      routerInstance.address,
      new BigNumber(5000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Add allowances to the swapToPrice contract
    await wethInstance.approve(
      swapToPriceInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await col_instance_USDC.approve(
      swapToPriceInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await col_instance_USDT.approve(
      swapToPriceInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await fraxInstance.approve(
      swapToPriceInstance.address,
      new BigNumber(1000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await fxsInstance.approve(
      swapToPriceInstance.address,
      new BigNumber(5000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Get the prices
    frax_price_from_FRAX_WETH = new BigNumber(
      await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6)
    )
      .div(BIG6)
      .toNumber();
    frax_price_from_FRAX_USDC = new BigNumber(
      await oracle_instance_FRAX_USDC.consult.call(
        FakeCollateral_USDC.address,
        1e6
      )
    )
      .div(BIG6)
      .toNumber();
    frax_price_from_FRAX_USDT = new BigNumber(
      await oracle_instance_FRAX_USDT.consult.call(
        FakeCollateral_USDT.address,
        1e6
      )
    )
      .div(BIG6)
      .toNumber();
    fxs_price_from_FXS_WETH = new BigNumber(
      await oracle_instance_FXS_WETH.consult.call(wethInstance.address, 1e6)
    )
      .div(BIG6)
      .toNumber();
    fxs_price_from_FXS_USDC = new BigNumber(
      await oracle_instance_FXS_USDC.consult.call(
        FakeCollateral_USDC.address,
        1e6
      )
    )
      .div(BIG6)
      .toNumber();
    fxs_price_from_FXS_USDT = new BigNumber(
      await oracle_instance_FXS_USDT.consult.call(
        FakeCollateral_USDT.address,
        1e6
      )
    )
      .div(BIG6)
      .toNumber();
    USDT_price_from_USDT_WETH = new BigNumber(
      await oracle_instance_USDT_WETH.consult.call(
        WETH.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);
    USDC_price_from_USDC_WETH = new BigNumber(
      await oracle_instance_USDC_WETH.consult.call(
        WETH.address,
        new BigNumber('1e18')
      )
    ).div(BIG6);

    console.log(chalk.blue('==================PRICES=================='));
    // Print the new prices
    console.log(
      'ETH-USD price from Chainlink:',
      new BigNumber((await fraxInstance.frax_info.call())['7'])
        .div(1e6)
        .toString(),
      'USD = 1 ETH'
    );
    console.log(
      'frax_price_from_FRAX_WETH: ',
      frax_price_from_FRAX_WETH.toString(),
      'FRAX = 1 WETH'
    );
    console.log(
      'FRAX-USD price from Chainlink, Uniswap:',
      new BigNumber(await fraxInstance.frax_price.call()).div(1e6).toString(),
      'FRAX = 1 USD'
    );
    //console.log("frax_price_from_FRAX_USDC: ", frax_price_from_FRAX_USDC.toString(), "FRAX = 1 USDC");
    //console.log("frax_price_from_FRAX_USDT: ", frax_price_from_FRAX_USDT.toString(), "FRAX = 1 USDT");
    console.log(
      'fxs_price_from_FXS_WETH: ',
      fxs_price_from_FXS_WETH.toString(),
      'FXS = 1 WETH'
    );
    //console.log("fxs_price_from_FXS_USDC: ", fxs_price_from_FXS_USDC.toString(), "FXS = 1 USDC");
    //console.log("fxs_price_from_FXS_USDT: ", fxs_price_from_FXS_USDT.toString(), "FXS = 1 USDT");
    console.log(
      'USDT_price_from_USDT_WETH: ',
      USDT_price_from_USDT_WETH.toString(),
      'USDT = 1 WETH'
    );
    console.log(
      'USDC_price_from_USDC_WETH: ',
      USDC_price_from_USDC_WETH.toString(),
      'USDC = 1 WETH'
    );
    console.log(
      'USDT_price_from_pool: ',
      new BigNumber(await pool_instance_USDT.getCollateralPrice.call())
        .div(1e6)
        .toString(),
      'USDT = 1 USD'
    );
    console.log(
      'USDC_price_from_pool: ',
      new BigNumber(await pool_instance_USDC.getCollateralPrice.call())
        .div(1e6)
        .toString(),
      'USDC = 1 USD'
    );
  });

  // [DEPRECATED] SEEDED IN THE MIGRATION FLOW
  // it('Seed the collateral pools some collateral to start off with', async () => {
  // 	console.log("========================Collateral Seed========================");

  // 	// Link the FAKE collateral pool to the FRAX contract
  // 	await col_instance_USDC.transfer(pool_instance_USDC.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
  // 	await col_instance_USDT.transfer(pool_instance_USDT.address, COLLATERAL_SEED_DEC18, { from: COLLATERAL_FRAX_AND_FXS_OWNER });

  // 	// Refresh the collateral ratio
  // 	const totalCollateralValue = new BigNumber(await fraxInstance.globalCollateralValue.call()).div(BIG18);
  // 	console.log("totalCollateralValue: ", totalCollateralValue.toNumber());

  // 	const collateral_ratio_refreshed = new BigNumber(await fraxInstance.global_collateral_ratio.call()).div(BIG6);
  // 	console.log("collateral_ratio_refreshed: ", collateral_ratio_refreshed.toNumber());
  // 	col_rat = collateral_ratio_refreshed;
  // });

  it('Deploys a vesting contract and then executes a governance proposal to revoke it', async () => {
    console.log('======== Setup vestingInstance ========');
    await vestingInstance.setTimelockAddress(timelockInstance.address, {
      from: accounts[0],
    });
    await vestingInstance.setFXSAddress(fxsInstance.address, {
      from: accounts[0],
    });
    await fxsInstance.approve(
      vestingInstance.address,
      new BigNumber('100000e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await fxsInstance.transfer(
      vestingInstance.address,
      new BigNumber('100000e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    const initial_FXS_balance = new BigNumber(
      await fxsInstance.balanceOf(accounts[0])
    );
    const initial_FXS_balance_5 = new BigNumber(
      await fxsInstance.balanceOf(accounts[5])
    );

    const timelock_delay = (await timelockInstance.delay.call()).toNumber();

    // Temporarily set the voting period to 10 blocks
    await governanceInstance.__setVotingPeriod(10, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });

    console.log('timelock_delay:', timelock_delay);
    console.log(
      'votingPeriod (denoted in blocks):',
      (await governanceInstance.votingPeriod()).toNumber()
    );

    // Determine the latest block
    const latestBlock = new BigNumber(await time.latestBlock()).toNumber();
    console.log('Latest block: ', latestBlock);

    // Print the revoked status beforehand
    let revoked_status_before = await vestingInstance.getRevoked();
    console.log('revoked_status_before:', revoked_status_before);

    console.log('======== Create proposal ========');
    // https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js

    await governanceInstance.propose(
      [vestingInstance.address],
      [0],
      ['revoke()'],
      ['0x00'],
      'vestingInstance revoke()',
      "I hereby propose to revoke the vestingInstance owner's unvested FXS",
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Advance one block so the voting can begin
    await time.increase(15);
    await time.advanceBlock();

    // Print the proposal count
    let proposal_id = await governanceInstance.latestProposalIds.call(
      COLLATERAL_FRAX_AND_FXS_OWNER
    );

    console.log('proposal_id:', proposal_id.toNumber());
    // Print the proposal before
    let proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log('id: ', proposal_details.id.toNumber());
    console.log(
      'forVotes: ',
      new BigNumber(proposal_details.forVotes).div(BIG18).toNumber()
    );
    console.log(
      'againstVotes: ',
      new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber()
    );
    console.log('startBlock: ', proposal_details.startBlock.toString());
    console.log('endBlock: ', proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_during_voting = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_during_voting: ',
      new BigNumber(proposal_state_during_voting).toNumber()
    );

    // Have at least 4% of FXS holders vote (so the quorum is reached)
    await governanceInstance.castVote(proposal_id, true, {from: POOL_CREATOR});
    await governanceInstance.castVote(proposal_id, true, {
      from: TIMELOCK_ADMIN,
    });
    await governanceInstance.castVote(proposal_id, true, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });
    await governanceInstance.castVote(proposal_id, true, {from: STAKING_OWNER});
    await governanceInstance.castVote(proposal_id, true, {
      from: STAKING_REWARDS_DISTRIBUTOR,
    });

    // Print the proposal after votes
    proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log('id: ', proposal_details.id.toString());
    console.log(
      'forVotes: ',
      new BigNumber(proposal_details.forVotes).div(BIG18).toNumber()
    );
    console.log(
      'againstVotes: ',
      new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber()
    );
    console.log('startBlock: ', proposal_details.startBlock.toString());
    console.log('endBlock: ', proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_before = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_before: ',
      new BigNumber(proposal_state_before).toNumber()
    );

    // Advance 10 blocks so the voting ends
    await time.increase(10 * 15); // ~15 sec per block
    await time.advanceBlockTo(latestBlock + 10 + 5);

    // Print the proposal state
    let proposal_state_after = await governanceInstance.state.call(proposal_id);
    console.log(
      'proposal_state_after: ',
      new BigNumber(proposal_state_after).toNumber()
    );

    console.log('======== Queue proposal ========');
    // Queue the execution
    console.log(chalk.blue('=== QUEUING EXECUTION ==='));
    await governanceInstance.queue(proposal_id, {from: TIMELOCK_ADMIN});

    // Advance timelock_delay until the timelock is done
    await time.increase(timelock_delay + 1);
    await time.advanceBlock();

    // Have accounts[5] release() from the vestingInstance
    console.log(chalk.blue('=== VESTING INSTANCE RELEASE ==='));
    await vestingInstance.release({from: accounts[5]});

    let proposal_state_after_queue = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_after_queue: ',
      new BigNumber(proposal_state_after_queue).toNumber()
    );

    await time.increase(86400);
    await time.advanceBlock();

    console.log('======== Execute proposal ========');
    // Execute the proposal
    await governanceInstance.execute(proposal_id, {from: TIMELOCK_ADMIN});

    // Print the minting fee afterwards
    let revoked_status_after = await vestingInstance.getRevoked();
    console.log('revoked_status_after', revoked_status_after);

    // Set the voting period back to 17280 blocks
    await governanceInstance.__setVotingPeriod(17280, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });

    const acc_0_FXS_balance_change = new BigNumber(
      await fxsInstance.balanceOf(accounts[0])
    )
      .minus(initial_FXS_balance)
      .div(BIG18);
    const acc_5_FXS_balance_change = new BigNumber(
      await fxsInstance.balanceOf(accounts[5])
    )
      .minus(initial_FXS_balance_5)
      .div(BIG18);

    console.log(
      'accounts[0] FXS balance change:',
      acc_0_FXS_balance_change.toNumber()
    );
    console.log(
      'accounts[5] FXS balance change:',
      acc_5_FXS_balance_change.toNumber()
    );

    console.log('accounts[5] attempts to release more tokens');
    await vestingInstance.release({from: accounts[5]});
    console.log(
      'accounts[5] FXS balance change:',
      new BigNumber(await fxsInstance.balanceOf(accounts[5]))
        .minus(initial_FXS_balance_5)
        .div(BIG18)
        .toNumber()
    );
  });

  // GOVERNANCE TEST [PART 0]
  it('PART 0: Normal stakes at CR = 100%', async () => {
    console.log(
      '=========================Normal Stakes [CR = 100%]========================='
    );
    // Give some Uniswap Pool tokens to another user so they can stake too
    await pair_instance_FRAX_USDC.transfer(accounts[9], new BigNumber('10e6'), {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    console.log('give accounts[9] 10 FRAX-USDC Uniswap pool tokens');

    const cr_boost_multiplier = new BigNumber(
      await stakingInstance_FRAX_USDC.crBoostMultiplier()
    ).div(BIG6);
    console.log(
      'pool cr_boost_multiplier (div 1e6): ',
      cr_boost_multiplier.toNumber()
    );

    // Note the Uniswap Pool Token and FXS amounts after staking
    let uni_pool_tokens_1 = new BigNumber('75e5');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_tokens_1,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log(
      'accounts[1] approve FRAX_USDC staking pool for 7.5 (E6) LP tokens'
    );
    const uni_pool_1st_stake_1 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const fxs_1st_stake_1 = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const rewards_balance_1st_stake_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.rewards.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG18);

    await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_1, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    console.log(
      'accounts[1] staking 7.5 LP (E6) tokens into FRAX_USDC staking pool'
    );
    console.log(
      'accounts[1] LP token balance:',
      uni_pool_1st_stake_1.toString()
    );
    console.log('accounts[1] FXS balance:', fxs_1st_stake_1.toString());
    console.log(
      'accounts[1] staking rewards():',
      rewards_balance_1st_stake_1.toString()
    );
    console.log(
      'accounts[1] balanceOf:',
      new BigNumber(
        await stakingInstance_FRAX_USDC.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG6)
        .toNumber()
    );
    console.log(
      'accounts[1] boostedBalanceOf:',
      new BigNumber(
        await stakingInstance_FRAX_USDC.boostedBalanceOf(
          COLLATERAL_FRAX_AND_FXS_OWNER
        )
      )
        .div(BIG6)
        .toNumber()
    );
    console.log('');

    let uni_pool_tokens_9 = new BigNumber('25e5');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_tokens_9,
      {from: accounts[9]}
    );
    console.log(
      'accounts[9] approve FRAX_USDC staking pool for 2.5 (E6) LP tokens'
    );
    const uni_pool_1st_stake_9 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(accounts[9])
    ).div(BIG6);
    const fxs_1st_stake_9 = new BigNumber(
      await fxsInstance.balanceOf.call(accounts[9])
    ).div(BIG18);
    const rewards_balance_1st_stake_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.rewards(accounts[9])
    ).div(BIG18);

    await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_9, {
      from: accounts[9],
    });
    console.log(
      'accounts[9] staking 2.5 (E6) LP tokens into FRAX_USDC staking pool'
    );
    console.log(
      'accounts[9] LP token balance:',
      uni_pool_1st_stake_9.toString()
    );
    console.log('accounts[9] FXS balance:', fxs_1st_stake_9.toString());
    console.log(
      'accounts[9] staking rewards():',
      rewards_balance_1st_stake_9.toString()
    );
    console.log(
      'accounts[9] balanceOf:',
      new BigNumber(await stakingInstance_FRAX_USDC.balanceOf(accounts[9]))
        .div(BIG6)
        .toNumber()
    );
    console.log(
      'accounts[9] boostedBalanceOf:',
      new BigNumber(
        await stakingInstance_FRAX_USDC.boostedBalanceOf(accounts[9])
      )
        .div(BIG6)
        .toNumber()
    );
    console.log('');

    // Note the last update time
    const block_time_before = (await time.latest()).toNumber();
    console.log('current block time (in seconds):', block_time_before);

    // Note the total lastUpdateTime
    let rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toString()
    );

    // Note the total periodFinish
    let rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    );
    console.log('pool periodFinish:', rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    let rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()
    );
    console.log(
      'pool lastTimeRewardApplicable():',
      rewards_contract_lastTimeRewardApplicable.toString()
    );

    console.log(
      '===================================================================='
    );
    console.log('advance one week (one rewardsDuration period)');
    // Advance 7 days so the reward can be claimed
    await time.increase(7 * 86400 + 1);
    await time.advanceBlock();
    //await fraxInstance.refreshCollateralRatio();
    console.log('');

    const cr_boost_multiplier_2 = new BigNumber(
      await stakingInstance_FRAX_USDC.crBoostMultiplier()
    ).div(BIG6);
    console.log(
      'pool cr_boost_multiplier (div 1e6): ',
      cr_boost_multiplier_2.toNumber()
    );

    // Note the last update time
    let block_time_after = (await time.latest()).toNumber();
    console.log(
      'block time after waiting one week (in seconds):',
      block_time_after
    );

    // Make sure there is a valid period for the contract
    await stakingInstance_FRAX_USDC.renewIfApplicable({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toString()
    );

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    );
    console.log('pool periodFinish:', rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()
    );
    console.log(
      'pool lastTimeRewardApplicable():',
      rewards_contract_lastTimeRewardApplicable.toString()
    );

    // Note the total FRAX supply
    const rewards_contract_stored_uni_pool = new BigNumber(
      await stakingInstance_FRAX_USDC.totalSupply.call()
    ).div(BIG6);
    console.log(
      'pool totalSupply() (of LP tokens):',
      rewards_contract_stored_uni_pool.toString()
    );

    // Print the decimals
    const staking_token_decimal = new BigNumber(
      await stakingInstance_FRAX_USDC.stakingDecimals.call()
    );
    console.log('pool stakingDecimals():', staking_token_decimal.toString());

    console.log('');
    // Show the reward
    const staking_fxs_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const staking_fxs_earned_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[1] earnings after 1 week:',
      staking_fxs_earned_1.toString()
    );
    console.log(
      'accounts[9] earnings after 1 week:',
      staking_fxs_earned_9.toString()
    );
    const reward_week_1 = staking_fxs_earned_1.plus(staking_fxs_earned_9);
    const effective_yearly_reward_at_week_1 =
      reward_week_1.multipliedBy(52.1429);
    console.log(
      'Effective weekly reward at week 1: ',
      reward_week_1.toString()
    );
    console.log(
      'Effective yearly reward at week 1: ',
      effective_yearly_reward_at_week_1.toString()
    );

    const duration_reward_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.getRewardForDuration.call()
    ).div(BIG18);
    console.log(
      'Expected yearly reward: ',
      duration_reward_1.multipliedBy(52.1429).toString()
    );

    // await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

    // Note the UNI POOL and FXS amounts after the reward
    const uni_pool_post_reward_1 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const fxs_post_reward_1 = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] LP token balance:',
      uni_pool_post_reward_1.toString()
    );
    console.log('accounts[1] FXS balance:', fxs_post_reward_1.toString());

    console.log(
      '===================================================================='
    );
    console.log('accounts[1] claims and withdraws');
    console.log('');
    await time.advanceBlock();
    const uni_pool_balance_1 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const staking_fxs_ew_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log('accounts[1] LP token balance:', uni_pool_balance_1.toString());
    console.log(
      'accounts[1] staking earned():',
      staking_fxs_ew_earned_1.toString()
    );
    console.log('');

    console.log('accounts[1] claims getReward()');
    await stakingInstance_FRAX_USDC.getReward({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await time.advanceBlock();
    console.log('accounts[1] withdraws');
    await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_1, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await time.advanceBlock();
    console.log('');

    const fxs_after_withdraw_0 = new BigNumber(
      await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] FXS balance change:',
      fxs_after_withdraw_0.minus(fxs_1st_stake_1).toNumber()
    );
    console.log(
      '===================================================================='
    );

    console.log('wait two weeks so account[9] can earn more');
    // Advance a few days
    await time.increase(2 * (7 * 86400) + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract and sync it
    await stakingInstance_FRAX_USDC.renewIfApplicable({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the last update time
    block_time_after = (await time.latest()).toNumber();
    console.log('current block time (in seconds):', block_time_after);

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toString()
    );

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    ).toNumber();
    console.log(
      'pool periodFinish: ',
      rewards_contract_periodFinish.toString()
    );

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()
    ).toNumber();
    console.log(
      'pool lastTimeRewardApplicable: ',
      rewards_contract_lastTimeRewardApplicable.toString()
    );

    // Show the reward
    const staking_fxs_part2_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const staking_fxs_part2_earned_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[1] staking earned():',
      staking_fxs_part2_earned_1.toString()
    );

    const uni_pool_2nd_time_balance = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const fxs_2nd_time_balance = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] LP token balance:',
      uni_pool_2nd_time_balance.toString()
    );
    console.log('accounts[1] FXS balance:', fxs_2nd_time_balance.toString());
    console.log('');

    console.log(
      'accounts[9] staking earned():',
      staking_fxs_part2_earned_9.toString()
    );
    console.log('accounts[9] withdrawing');
    await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_9, {
      from: accounts[9],
    });
    console.log('accounts[9] getReward()');
    await stakingInstance_FRAX_USDC.getReward({from: accounts[9]});
    await time.advanceBlock();

    const reward_week_3 = staking_fxs_part2_earned_1
      .plus(staking_fxs_part2_earned_9)
      .plus(staking_fxs_ew_earned_1);
    const effective_yearly_reward_at_week_3 = reward_week_3.multipliedBy(
      52.1429 / 3.0
    ); // Total over 3 weeks
    console.log(
      'Effective weekly reward at week 3: ',
      reward_week_3.div(3).toString()
    ); // Total over 3 weeks
    console.log(
      'Effective yearly reward at week 3: ',
      effective_yearly_reward_at_week_3.toString()
    );

    const duration_reward_3 = new BigNumber(
      await stakingInstance_FRAX_USDC.getRewardForDuration.call()
    ).div(BIG18);
    console.log(
      'Expected yearly reward: ',
      duration_reward_3.multipliedBy(52.1429).toString()
    );

    const acc_9_FXS_balance_after = new BigNumber(
      await fxsInstance.balanceOf(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[9] FXS balance change:',
      acc_9_FXS_balance_after.minus(fxs_1st_stake_9).toNumber()
    );
    console.log(
      'crBoostMultiplier():',
      new BigNumber(
        await stakingInstance_FRAX_USDC.crBoostMultiplier()
      ).toNumber()
    );
  });

  // GOVERNANCE TEST [PART 1]
  // ================================================================
  it('Propose changing the minting fee', async () => {
    console.log('======== Minting fee 0.03% -> 0.1% ========');
    const timelock_delay = (await timelockInstance.delay.call()).toNumber();

    // Temporarily set the voting period to 10 blocks
    await governanceInstance.__setVotingPeriod(10, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });

    // Determine the latest block
    const latestBlock = new BigNumber(await time.latestBlock()).toNumber();
    console.log('Latest block: ', latestBlock);

    // Print the minting fee beforehand
    let minting_fee_before = new BigNumber(
      await fraxInstance.minting_fee.call()
    )
      .div(BIG6)
      .toNumber();
    console.log('minting_fee_before: ', minting_fee_before);

    // https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js
    await governanceInstance.propose(
      [fraxInstance.address],
      [0],
      ['setMintingFee(uint256)'],
      [web3.eth.abi.encodeParameters(['uint256'], [1000])], // 0.1%
      'Minting fee change',
      'I hereby propose to increase the minting fee from 0.03% to 0.1%',
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Advance one block so the voting can begin
    await time.increase(15);
    await time.advanceBlock();

    // Print the proposal count
    let proposal_id = await governanceInstance.latestProposalIds.call(
      COLLATERAL_FRAX_AND_FXS_OWNER
    );

    // Print the proposal before
    let proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log('id: ', proposal_details.id.toNumber());
    console.log(
      'forVotes: ',
      new BigNumber(proposal_details.forVotes).div(BIG18).toNumber()
    );
    console.log(
      'againstVotes: ',
      new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber()
    );
    console.log('startBlock: ', proposal_details.startBlock.toString());
    console.log('endBlock: ', proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_during_voting = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_during_voting: ',
      new BigNumber(proposal_state_during_voting).toNumber()
    );

    // Have at least 4% of FXS holders vote (so the quorum is reached)
    await governanceInstance.castVote(proposal_id, true, {from: POOL_CREATOR});
    await governanceInstance.castVote(proposal_id, true, {
      from: TIMELOCK_ADMIN,
    });
    await governanceInstance.castVote(proposal_id, true, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });
    await governanceInstance.castVote(proposal_id, true, {from: STAKING_OWNER});
    await governanceInstance.castVote(proposal_id, true, {
      from: STAKING_REWARDS_DISTRIBUTOR,
    });

    // Print the proposal after votes
    proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log('id: ', proposal_details.id.toString());
    console.log(
      'forVotes: ',
      new BigNumber(proposal_details.forVotes).div(BIG18).toNumber()
    );
    console.log(
      'againstVotes: ',
      new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber()
    );
    console.log('startBlock: ', proposal_details.startBlock.toString());
    console.log('endBlock: ', proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_before = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_before: ',
      new BigNumber(proposal_state_before).toNumber()
    );

    // Advance 10 blocks so the voting ends
    await time.increase(10 * 15); // ~15 sec per block
    await time.advanceBlockTo(latestBlock + 10 + 5);

    // Print the proposal state
    let proposal_state_after = await governanceInstance.state.call(proposal_id);
    console.log(
      'proposal_state_after: ',
      new BigNumber(proposal_state_after).toNumber()
    );

    // Queue the execution
    await governanceInstance.queue(proposal_id, {from: TIMELOCK_ADMIN});

    // Advance timelock_delay until the timelock is done
    await time.increase(timelock_delay + 1);
    await time.advanceBlock();

    let proposal_state_after_queue = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_after_queue: ',
      new BigNumber(proposal_state_after_queue).toNumber()
    );

    // Execute the proposal
    await governanceInstance.execute(proposal_id, {from: TIMELOCK_ADMIN});

    // Advance one block to sync
    await time.increase(15);
    await time.advanceBlock();

    // Print the minting fee afterwards
    let minting_fee_after = new BigNumber(await fraxInstance.minting_fee.call())
      .div(BIG6)
      .toNumber();
    console.log('minting_fee_after: ', minting_fee_after);

    // Set the voting period back to 17280 blocks
    await governanceInstance.__setVotingPeriod(17280, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });
  });

  // GOVERNANCE TEST [PART 2]
  // ================================================================
  it('Change the minting fee back to 0.03%', async () => {
    console.log('======== Minting fee 0.1% -> 0.03% ========');
    const timelock_delay = (await timelockInstance.delay.call()).toNumber();

    // Temporarily set the voting period to 10 blocks
    await governanceInstance.__setVotingPeriod(10, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });

    // Determine the latest block
    const latestBlock = new BigNumber(await time.latestBlock()).toNumber();
    console.log('Latest block: ', latestBlock);

    // Print the minting fee beforehand
    let minting_fee_before = new BigNumber(
      await fraxInstance.minting_fee.call()
    )
      .div(BIG6)
      .toNumber();
    console.log('minting_fee_before: ', minting_fee_before);

    // https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/GovernorAlpha/ProposeTest.js
    await governanceInstance.propose(
      [fraxInstance.address],
      [0],
      ['setMintingFee(uint256)'],
      [web3.eth.abi.encodeParameters(['uint256'], [300])], // 0.03%
      'Minting fee revert back to old value',
      'I hereby propose to decrease the minting fee back to 0.03% from 0.1%',
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Advance one block so the voting can begin
    await time.increase(15);
    await time.advanceBlock();

    // Print the proposal count
    let proposal_id = await governanceInstance.latestProposalIds.call(
      COLLATERAL_FRAX_AND_FXS_OWNER
    );

    // Print the proposal before
    let proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log('id: ', proposal_details.id.toNumber());
    console.log(
      'forVotes: ',
      new BigNumber(proposal_details.forVotes).div(BIG18).toNumber()
    );
    console.log(
      'againstVotes: ',
      new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber()
    );
    console.log('startBlock: ', proposal_details.startBlock.toString());
    console.log('endBlock: ', proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_during_voting = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_during_voting: ',
      new BigNumber(proposal_state_during_voting).toNumber()
    );

    // Have at least 4% of FXS holders vote (so the quorum is reached)
    await governanceInstance.castVote(proposal_id, true, {from: POOL_CREATOR});
    await governanceInstance.castVote(proposal_id, true, {
      from: TIMELOCK_ADMIN,
    });
    await governanceInstance.castVote(proposal_id, true, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });
    await governanceInstance.castVote(proposal_id, true, {from: STAKING_OWNER});
    await governanceInstance.castVote(proposal_id, true, {
      from: STAKING_REWARDS_DISTRIBUTOR,
    });

    // Print the proposal after votes
    proposal_details = await governanceInstance.proposals.call(proposal_id);
    // console.log(util.inspect(proposal_details, false, null, true));
    console.log('id: ', proposal_details.id.toString());
    console.log(
      'forVotes: ',
      new BigNumber(proposal_details.forVotes).div(BIG18).toNumber()
    );
    console.log(
      'againstVotes: ',
      new BigNumber(proposal_details.againstVotes).div(BIG18).toNumber()
    );
    console.log('startBlock: ', proposal_details.startBlock.toString());
    console.log('endBlock: ', proposal_details.endBlock.toString());

    // Print the proposal state
    let proposal_state_before = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_before: ',
      new BigNumber(proposal_state_before).toNumber()
    );

    // Advance 10 blocks so the voting ends
    await time.increase(10 * 15); // ~15 sec per block
    await time.advanceBlockTo(latestBlock + 10 + 5);

    // Print the proposal state
    let proposal_state_after = await governanceInstance.state.call(proposal_id);
    console.log(
      'proposal_state_after: ',
      new BigNumber(proposal_state_after).toNumber()
    );

    // Queue the execution
    await governanceInstance.queue(proposal_id, {from: TIMELOCK_ADMIN});

    // Advance timelock_delay until the timelock is done
    await time.increase(timelock_delay + 1);
    await time.advanceBlock();

    let proposal_state_after_queue = await governanceInstance.state.call(
      proposal_id
    );
    console.log(
      'proposal_state_after_queue: ',
      new BigNumber(proposal_state_after_queue).toNumber()
    );

    // Execute the proposal
    await governanceInstance.execute(proposal_id, {from: TIMELOCK_ADMIN});

    // Advance one block to sync
    await time.increase(15);
    await time.advanceBlock();

    // Print the minting fee afterwards
    let minting_fee_after = new BigNumber(await fraxInstance.minting_fee.call())
      .div(BIG6)
      .toNumber();
    console.log('minting_fee_after: ', minting_fee_after);

    // Set the voting period back to 17280 blocks
    await governanceInstance.__setVotingPeriod(17280, {
      from: GOVERNOR_GUARDIAN_ADDRESS,
    });
  });

  it('Mint some FRAX using USDC as collateral (collateral ratio = 1) [mint1t1FRAX]', async () => {
    console.log(
      '=========================mint1t1FRAX========================='
    );
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the collateral and FRAX amounts before minting
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);

    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('bal_frax: ', bal_frax.toNumber());
    console.log('col_bal_usdc: ', col_bal_usdc.toNumber());
    console.log('pool_bal_usdc: ', pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const collateral_amount = new BigNumber('100e6');
    await col_instance_USDC.approve(
      pool_instance_USDC.address,
      collateral_amount,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    // Mint some FRAX
    console.log(
      'accounts[1] mint1t1FRAX() with 100 USDC; slippage limit of 1%'
    );
    const collateral_price = new BigNumber(
      await pool_instance_USDC.getCollateralPrice.call()
    )
      .div(BIG6)
      .toNumber();
    const FRAX_out_min = new BigNumber(
      collateral_amount.times(collateral_price).times(0.99)
    ); // 1% slippage
    await pool_instance_USDC.mint1t1FRAX(collateral_amount, FRAX_out_min, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the collateral and FRAX amounts after minting
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    // assert.equal(frax_after, 103.9584);
    // assert.equal(collateral_after, 8999900);
    // assert.equal(pool_collateral_after, 1000100);
    console.log(
      'accounts[1] frax change: ',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'accounts[1] collateral change: ',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC collateral change: ',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  it('Redeem some FRAX for USDC (collateral ratio >= 1) [redeem1t1FRAX]', async () => {
    console.log(
      '=========================redeem1t1FRAX========================='
    );
    // Advance 1 hr so the collateral ratio can be recalculated
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // Deposit some collateral to move the collateral ratio above 1
    await col_instance_USDC.transfer(
      pool_instance_USDC.address,
      THREE_THOUSAND_DEC6,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await col_instance_USDT.transfer(
      pool_instance_USDT.address,
      THREE_THOUSAND_DEC6,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the collateral and FRAX amounts before redeeming
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('bal_frax: ', bal_frax.toNumber());
    console.log('col_bal_usdc: ', col_bal_usdc.toNumber());
    console.log('pool_bal_usdc: ', pool_bal_usdc.toNumber());
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );

    // Need to approve first so the pool contract can use transfer
    const frax_amount = new BigNumber('100e18');
    await fraxInstance.approve(pool_instance_USDC.address, frax_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Redeem some FRAX
    await pool_instance_USDC.redeem1t1FRAX(frax_amount, new BigNumber('10e6'), {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    }); // Get at least 10 USDC out, roughly 90% slippage limit (testing purposes)
    console.log('accounts[1] redeem1t1() with 100 FRAX');
    // Collect redemption
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    await pool_instance_USDC.collectRedemption({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the collateral and FRAX amounts after redeeming
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    console.log(
      'accounts[1] FRAX change: ',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'accounts[1] USDC change: ',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC change: ',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  // REDUCE COLLATERAL RATIO
  it('Reduces the collateral ratio: 1-to-1 Phase => Fractional Phase', async () => {
    console.log(
      '=========================Reducing the collateral ratio========================='
    );
    // const tokensToMint = new BigNumber(1000000e18);
    // await fraxInstance.mint(tokensToMint, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
    // totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call()).div(BIG18).toNumber();
    // console.log("totalSupplyFRAX: ", totalSupplyFRAX);

    // Add allowances to the swapToPrice contract
    await wethInstance.approve(
      swapToPriceInstance.address,
      new BigNumber(2000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await fraxInstance.approve(
      swapToPriceInstance.address,
      new BigNumber(1000000e18),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Print the current FRAX price
    frax_price_from_FRAX_WETH = new BigNumber(
      await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6)
    )
      .div(BIG6)
      .toNumber();
    console.log(
      'frax_price_from_FRAX_WETH (before): ',
      frax_price_from_FRAX_WETH.toString(),
      ' FRAX = 1 WETH'
    );
    console.log(
      'frax_price:',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );

    // Swap the FRAX price upwards
    // Targeting 10 FRAX / 1 WETH
    await swapToPriceInstance.swapToPrice(
      fraxInstance.address,
      wethInstance.address,
      new BigNumber(10e6),
      new BigNumber(1e6),
      new BigNumber(100000e18),
      new BigNumber(100000e18),
      COLLATERAL_FRAX_AND_FXS_OWNER,
      new BigNumber(2105300114),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    // Advance 24 hrs so the period can be computed
    await time.increase(86400 + 1);
    await time.advanceBlock();

    // Make sure the price is updated
    await oracle_instance_FRAX_WETH.update({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Print the new FRAX price
    frax_price_from_FRAX_WETH = new BigNumber(
      await oracle_instance_FRAX_WETH.consult.call(wethInstance.address, 1e6)
    )
      .div(BIG6)
      .toNumber();
    console.log(
      'frax_price_from_FRAX_WETH (after): ',
      frax_price_from_FRAX_WETH.toString(),
      ' FRAX = 1 WETH'
    );
    console.log(
      'frax_price:',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );

    for (let i = 0; i < 13; i++) {
      // Drop the collateral ratio by 13 * 0.25%
      await time.increase(3600 + 1);
      await time.advanceBlock();
      await fraxInstance.refreshCollateralRatio();
      console.log(
        'global_collateral_ratio:',
        new BigNumber(await fraxInstance.global_collateral_ratio.call())
          .div(BIG6)
          .toNumber()
      );
    }
  });

  // MINTING PART 2
  // ================================================================

  it('Mint some FRAX using FXS and USDC (collateral ratio between .000001 and .999999) [mintFractionalFRAX]', async () => {
    console.log(
      '=========================mintFractionalFRAX========================='
    );
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    console.log(
      'accounts[1] votes initial:',
      new BigNumber(
        await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG18)
        .toString()
    );
    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS, FRAX, and FAKE amounts before minting
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    bal_fxs = fxs_before;
    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('bal_fxs: ', bal_fxs.toNumber());
    console.log('bal_frax: ', bal_frax.toNumber());
    console.log('col_bal_usdc: ', col_bal_usdc.toNumber());
    console.log('pool_bal_usdc: ', pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const fxs_amount = new BigNumber('500e18');
    await fxsInstance.approve(pool_instance_USDC.address, fxs_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    const collateral_amount = new BigNumber('100e6');
    await col_instance_USDC.approve(
      pool_instance_USDC.address,
      collateral_amount,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    await pool_instance_USDC.mintFractionalFRAX(
      collateral_amount,
      fxs_amount,
      new BigNumber('10e6'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log('accounts[1] mintFractionalFRAX() with 100 USDC and 500 FXS');

    // Note the FXS, FRAX, and FAKE amounts after minting
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    console.log(
      'accounts[1] USDC balance change: ',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'accounts[1] FXS balance change: ',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] votes final:',
      new BigNumber(
        await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG18)
        .toString()
    );
    console.log(
      'accounts[1] FRAX balance change: ',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC balance change: ',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  it('Set the pool ceiling and try to mint above it', async () => {
    console.log(
      '=========================Pool Ceiling Test========================='
    );
    await pool_instance_USDC.setPoolParameters(
      new BigNumber('100e6'),
      7500,
      1,
      {from: POOL_CREATOR}
    );
    await fxsInstance.approve(
      pool_instance_USDC.address,
      new BigNumber('1000e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await col_instance_USDC.approve(
      pool_instance_USDC.address,
      new BigNumber('1000e6'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await expectRevert.unspecified(
      pool_instance_USDC.mintFractionalFRAX(
        new BigNumber('1000e18'),
        new BigNumber('1000e18'),
        0,
        {from: COLLATERAL_FRAX_AND_FXS_OWNER}
      )
    );
    await pool_instance_USDC.setPoolParameters(
      new BigNumber('5000000e18'),
      7500,
      1,
      {from: POOL_CREATOR}
    );
  });

  it("SHOULD FAIL: Mint some FRAX using FXS and USDC, but doesn't send in enough FXS [mintFractionalFRAX]", async () => {
    console.log(
      '=========================mintFractionalFRAX========================='
    );

    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS, FRAX, and FAKE amounts before minting
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    bal_fxs = fxs_before;
    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('bal_fxs: ', bal_fxs.toNumber());
    console.log('bal_frax: ', bal_frax.toNumber());
    console.log('col_bal_usdc: ', col_bal_usdc.toNumber());
    console.log('pool_bal_usdc: ', pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const fxs_amount = new BigNumber('1e18');
    await fxsInstance.approve(pool_instance_USDC.address, fxs_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    const collateral_amount = new BigNumber('100e6');
    await col_instance_USDC.approve(
      pool_instance_USDC.address,
      collateral_amount,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    await expectRevert.unspecified(
      pool_instance_USDC.mintFractionalFRAX(
        collateral_amount,
        fxs_amount,
        new BigNumber('10e18'),
        {from: COLLATERAL_FRAX_AND_FXS_OWNER}
      )
    );
    console.log('accounts[1] mintFractionalFRAX() with 100 USDC and 5 FXS');

    // Note the FXS, FRAX, and FAKE amounts after minting
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    console.log(
      'accounts[1] USDC balance change: ',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'accounts[1] FXS balance change: ',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] FRAX balance change: ',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC balance change: ',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  it('Redeem some FRAX for FXS and USDC (collateral ratio between .000001 and .999999) [redeemFractionalFRAX]', async () => {
    console.log(
      '=========================redeemFractionalFRAX========================='
    );
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    console.log(
      'accounts[1] votes initial:',
      new BigNumber(
        await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG18)
        .toString()
    );

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS, FRAX, and FAKE amounts before redeeming
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    bal_fxs = fxs_before;
    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('accounts[1] FXS balance:', bal_frax.toNumber());
    console.log('accounts[1] FRAX balance:', bal_frax.toNumber());
    console.log('accounts[1] USDC balance', col_bal_usdc.toNumber());
    console.log('FRAX_pool_USDC balance:', pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transfer
    const frax_amount = new BigNumber('135242531948024e6');
    await fraxInstance.approve(pool_instance_USDC.address, frax_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Redeem some FRAX
    await pool_instance_USDC.redeemFractionalFRAX(
      frax_amount,
      new BigNumber('5e18'),
      new BigNumber('125e6'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log('accounts[1] redeemFractionalFRAX() with 135.24253 FRAX');
    // Collect redemption
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    await pool_instance_USDC.collectRedemption({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the FXS, FRAX, and FAKE amounts after redeeming
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    console.log(
      'accounts[1] FXS balance change:',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] votes final:',
      new BigNumber(
        await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG18)
        .toString()
    );
    console.log(
      'accounts[1] FRAX balance change:',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'accounts[1] USDC balance change:',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC balance change:',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  it('Mint some FRAX using FXS and USDC (collateral ratio between .000001 and .999999) [mintFractionalFRAX]', async () => {
    console.log(
      '=========================mintFractionalFRAX========================='
    );
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS, FRAX, and FAKE amounts before minting
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    bal_fxs = fxs_before;
    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('bal_fxs: ', bal_fxs.toNumber());
    console.log('bal_frax: ', bal_frax.toNumber());
    console.log('col_bal_usdc: ', col_bal_usdc.toNumber());
    console.log('pool_bal_usdc: ', pool_bal_usdc.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const fxs_amount = new BigNumber('50000e18');
    await fxsInstance.approve(pool_instance_USDC.address, fxs_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    const collateral_amount = new BigNumber('10000e6');
    await col_instance_USDC.approve(
      pool_instance_USDC.address,
      collateral_amount,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    await pool_instance_USDC.mintFractionalFRAX(
      collateral_amount,
      fxs_amount,
      new BigNumber('10e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log(
      'accounts[1] mintFractionalFRAX() with 10,000 USDC and 50,000 FXS'
    );

    // Note the FXS, FRAX, and FAKE amounts after minting
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    console.log(
      'accounts[1] USDC balance change: ',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'accounts[1] FXS balance change: ',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] FRAX balance change: ',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC balance change: ',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  it('Recollateralizes the system using recollateralizeFRAX()', async () => {
    console.log(
      '=========================recollateralizeFRAX========================='
    );
    let totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    let totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    let globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    let globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // Note the new collateral ratio
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();

    console.log(
      'effective collateral ratio before:',
      globalCollateralValue / totalSupplyFRAX
    );

    // Note the FXS, FRAX, and FAKE amounts before redeeming
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    bal_fxs = fxs_before;
    bal_frax = frax_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    console.log('accounts[1] FXS balance:', bal_frax.toNumber());
    console.log('accounts[1] FRAX balance:', bal_frax.toNumber());
    console.log('accounts[1] USDC balance', col_bal_usdc.toNumber());
    console.log('FRAX_pool_USDC balance:', pool_bal_usdc.toNumber());

    // Get the amount of recollateralization available
    const frax_info = await fraxInstance.frax_info.call();
    const frax_total_supply = new BigNumber(frax_info[2]);
    const global_collateral_ratio = new BigNumber(frax_info[3]);
    const global_collat_value = new BigNumber(frax_info[4]);
    const effective_collateral_ratio_E6 = global_collat_value
      .multipliedBy(1e6)
      .div(frax_total_supply)
      .toNumber(); // Returns it in 1e6
    const effective_collateral_ratio = effective_collateral_ratio_E6 / 1e6;
    let available_to_recollat = global_collateral_ratio
      .multipliedBy(frax_total_supply)
      .minus(frax_total_supply.multipliedBy(effective_collateral_ratio_E6))
      .div(1e6)
      .div(1e18)
      .toNumber();
    if (available_to_recollat < 0) available_to_recollat = 0;
    console.log('AVAILABLE TO RECOLLATERALIZE: ', available_to_recollat);

    console.log(
      'pool_USDC getCollateralPrice() (divided by 1e6):',
      new BigNumber(await pool_instance_USDC.getCollateralPrice.call())
        .div(BIG6)
        .toNumber()
    );

    // Need to approve first so the pool contract can use transfer
    const USDC_amount = new BigNumber('10000e6');
    await col_instance_USDC.approve(pool_instance_USDC.address, USDC_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Redeem some FRAX
    await pool_instance_USDC.recollateralizeFRAX(
      USDC_amount,
      new BigNumber('10e6'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log('accounts[1] recollateralizeFRAX() with 10,000 USDC');

    // Note the FXS, FRAX, and FAKE amounts after redeeming
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    console.log(
      'accounts[1] FXS balance change:',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] FRAX balance change:',
      frax_after.toNumber() - frax_before.toNumber()
    );
    console.log(
      'accounts[1] USDC balance change:',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC balance change:',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();

    console.log(
      'effective collateral ratio after:',
      globalCollateralValue / totalSupplyFRAX
    );
  });

  // MINTING AND REDEMPTION [CR = 0]
  // ================================================================

  it('Mint some FRAX using FXS (collateral ratio = 0) [mintAlgorithmicFRAX]', async () => {
    console.log(
      '=========================mintAlgorithmicFRAX========================='
    );
    for (let i = 0; i < 4 * 96; i++) {
      //drop by 96%
      await time.increase(3600 + 1);
      await time.advanceBlock();
      await fraxInstance.refreshCollateralRatio();
      if (i % 20 == 0) {
        console.log(
          'global_collateral_ratio:',
          new BigNumber(await fraxInstance.global_collateral_ratio.call())
            .div(BIG6)
            .toNumber()
        );
      }
    }

    // drop it 3 more times
    await time.increase(3600 + 1);
    await time.advanceBlock();
    await fraxInstance.refreshCollateralRatio();
    await time.increase(3600 + 1);
    await time.advanceBlock();
    await fraxInstance.refreshCollateralRatio();
    await time.increase(3600 + 1);
    await time.advanceBlock();
    await fraxInstance.refreshCollateralRatio();

    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
    // IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
    // IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!
    //console.log(chalk.red("IF YOU ARE RUNNING TESTS, YOU NEED TO COMMENT OUT THE RELEVANT PART IN THE DEPLOY SCRIPT!"));

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS and FRAX amounts before minting
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    bal_fxs = fxs_before;
    bal_frax = frax_before;
    console.log('accounts[1] FXS balance before:', fxs_before.toNumber());
    console.log('accounts[1] FRAX balance before:', frax_before.toNumber());

    // Need to approve first so the pool contract can use transferFrom
    const fxs_amount = new BigNumber('10000e18');
    await fxsInstance.approve(pool_instance_USDC.address, fxs_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Mint some FRAX
    await pool_instance_USDC.mintAlgorithmicFRAX(
      fxs_amount,
      new BigNumber('10e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log('accounts[1] mintAlgorithmicFRAX() using 10,000 FXS');

    // Note the FXS and FRAX amounts after minting
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] FXS balance after:',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] FRAX balance after:',
      frax_after.toNumber() - frax_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
  });

  // MINTING AND REDEMPTION [Other CRs]
  // ================================================================

  it('Redeem some FRAX for FXS (collateral ratio = 0) [redeemAlgorithmicFRAX]', async () => {
    console.log(
      '=========================redeemAlgorithmicFRAX========================='
    );
    // Advance 1 hr so the collateral ratio can be recalculated
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS, FRAX, and FAKE amounts before minting
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_before = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log('accounts[1] FXS balance before:', fxs_before.toNumber());
    console.log('accounts[1] FRAX balance before:', frax_before.toNumber());

    // Need to approve first so the pool contract can use transfer
    const frax_amount = new BigNumber('1000e18');
    await fraxInstance.approve(pool_instance_USDC.address, frax_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Redeem some FRAX
    await pool_instance_USDC.redeemAlgorithmicFRAX(
      frax_amount,
      new BigNumber('10e6'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log('accounts[1] redeemAlgorithmicFRAX() using 1,000 FRAX');

    // Collect redemption
    await time.advanceBlock();
    await time.advanceBlock();
    await time.advanceBlock();
    await pool_instance_USDC.collectRedemption({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the FXS, FRAX, and FAKE amounts after minting
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const frax_after = new BigNumber(
      await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    //const fxs_unclaimed = new BigNumber(await pool_instance_USDC.getRedeemFXSBalance.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
    //console.log("bal_fxs change: ", fxs_after.toNumber() - bal_fxs);
    //console.log("bal_fxs sitting inside Pool_USDC waiting to be claimed by COLLATERAL_FRAX_AND_FXS_OWNER: ", fxs_unclaimed);
    //console.log("bal_frax change: ", frax_after.toNumber() - bal_frax);
    console.log(
      'accounts[1] FXS change:',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] FRAX change:',
      frax_after.toNumber() - frax_before.toNumber()
    );
  });

  it('Buys back collateral using FXS [should fail if CR = 0]', async () => {
    console.log('=========================buyBackFXS=========================');
    // Advance 1 hr so the collateral ratio can be recalculated
    totalSupplyFRAX = new BigNumber(await fraxInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    totalSupplyFXS = new BigNumber(await fxsInstance.totalSupply.call())
      .div(BIG18)
      .toNumber();
    globalCollateralRatio = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    )
      .div(BIG6)
      .toNumber();
    globalCollateralValue = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    )
      .div(BIG18)
      .toNumber();
    console.log(
      'FRAX price (USD): ',
      new BigNumber(await fraxInstance.frax_price.call()).div(BIG6).toNumber()
    );
    console.log(
      'FXS price (USD): ',
      new BigNumber(await fraxInstance.fxs_price.call()).div(BIG6).toNumber()
    );
    console.log('totalSupplyFRAX: ', totalSupplyFRAX);
    console.log('totalSupplyFXS: ', totalSupplyFXS);
    console.log('globalCollateralRatio: ', globalCollateralRatio);
    console.log('globalCollateralValue: ', globalCollateralValue);
    console.log('');

    // This will push the collateral ratio below 1
    // Note the collateral ratio
    const collateral_ratio_before = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log(
      'collateral_ratio_before: ',
      collateral_ratio_before.toNumber()
    );

    // Note the FXS and FAKE amounts before buying back
    const fxs_before = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_before = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    const global_pool_collateral_before = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    ).div(BIG18);
    bal_fxs = fxs_before;
    col_bal_usdc = collateral_before;
    pool_bal_usdc = pool_collateral_before;
    global_collateral_value = global_pool_collateral_before;
    console.log('accounts[1] FXS balance: ', bal_fxs.toNumber());
    console.log('accounts[1] USDC balance: ', col_bal_usdc.toNumber());
    console.log('FRAX_pool_USDC balance: ', pool_bal_usdc.toNumber());
    console.log(
      'global_collateral_value: ',
      global_collateral_value.toNumber()
    );

    // Available to buyback
    const buyback_available = new BigNumber(
      await pool_instance_USDC.availableExcessCollatDV.call()
    ).div(BIG18);
    // const buyback_available_in_fxs = new BigNumber(await pool_instance_USDC.availableExcessCollatDVInFXS.call()).div(BIG18);
    console.log('buyback_available: $', buyback_available.toNumber());
    // console.log("buyback_available_in_fxs: ", buyback_available_in_fxs.toNumber(), " FXS");

    // Need to approve first so the pool contract can use transfer
    const fxs_amount = new BigNumber('40000e18');
    await fxsInstance.approve(pool_instance_USDC.address, fxs_amount, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // FXS price
    const fxs_price = new BigNumber(await fraxInstance.fxs_price()).div(BIG6);
    console.log('fxs_price: $', fxs_price.toNumber());

    // Buy back some FRAX
    console.log('accounts[1] buyBackFXS() using 40,000 FXS');
    await pool_instance_USDC.buyBackFXS(fxs_amount, new BigNumber('10e6'), {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the FXS and FAKE amounts after buying back
    const fxs_after = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG6);
    const pool_collateral_after = new BigNumber(
      await col_instance_USDC.balanceOf.call(pool_instance_USDC.address)
    ).div(BIG6);
    const global_pool_collateral_after = new BigNumber(
      await fraxInstance.globalCollateralValue.call()
    ).div(BIG18);
    console.log(
      'accounts[1] FXS balance change: ',
      fxs_after.toNumber() - fxs_before.toNumber()
    );
    console.log(
      'accounts[1] USDC balance change: ',
      collateral_after.toNumber() - collateral_before.toNumber()
    );
    console.log(
      'FRAX_pool_USDC balance change: ',
      pool_collateral_after.toNumber() - pool_collateral_before.toNumber()
    );
    console.log(
      'global_collateral_value change: ',
      global_pool_collateral_after.toNumber() -
        global_pool_collateral_before.toNumber()
    );

    // Note the new collateral ratio
    const collateral_ratio_after = new BigNumber(
      await fraxInstance.global_collateral_ratio.call()
    ).div(BIG6);
    console.log('collateral_ratio_after: ', collateral_ratio_after.toNumber());
    console.log(
      'getCollateralPrice() from FRAX_pool_USDC: ',
      new BigNumber(await pool_instance_USDC.getCollateralPrice.call())
        .div(BIG6)
        .toNumber()
    );
  });

  // STAKING
  // ================================================================

  it('Make sure the StakingRewards (FRAX/USDC) are initialized', async () => {
    await stakingInstance_FRAX_USDC.renewIfApplicable();
    const pre_period_finish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish()
    );
    const pre_block_timestamp = new BigNumber(await time.latest());

    console.log('pre-periodFinish:', pre_period_finish.toNumber());
    console.log('block.timestamp:', pre_block_timestamp.toNumber());

    console.log('moving forward rest of period & renewing');
    await time.increase(
      pre_period_finish.minus(pre_block_timestamp).toNumber() + 1
    );
    await time.advanceBlock();
    await stakingInstance_FRAX_USDC.renewIfApplicable();

    let rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    ).toNumber();
    let rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    ).toNumber();

    console.log('periodFinish:', rewards_contract_periodFinish);
    console.log('lastUpdateTime:', rewards_contract_lastUpdateTime);
    console.log(
      'block.timestamp:',
      new BigNumber(await time.latest()).toNumber()
    );

    // assert.equal(rewards_contract_periodFinish - rewards_contract_lastUpdateTime, REWARDS_DURATION);
    assert.equal(
      (rewards_contract_periodFinish - rewards_contract_lastUpdateTime) /
        REWARDS_DURATION >=
        0.9999,
      true
    );
  });

  it('PART 1: Normal stakes at CR = 0', async () => {
    console.log(
      '=========================Normal Stakes [CR = 0]========================='
    );
    // Give some Uniswap Pool tokens to another user so they can stake too
    await pair_instance_FRAX_USDC.transfer(accounts[9], new BigNumber('10e6'), {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    console.log('give accounts[9] 10 FRAX-USDC Uniswap pool tokens');

    const cr_boost_multiplier = new BigNumber(
      await stakingInstance_FRAX_USDC.crBoostMultiplier()
    ).div(BIG6);
    console.log(
      'pool cr_boost_multiplier (div 1e6): ',
      cr_boost_multiplier.toNumber()
    );

    // Note the Uniswap Pool Token and FXS amounts after staking
    let uni_pool_tokens_1 = new BigNumber('75e5');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_tokens_1,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log(
      'accounts[1] approve FRAX_USDC staking pool for 7.5 (E6) LP tokens'
    );
    const uni_pool_1st_stake_1 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const fxs_1st_stake_1 = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const rewards_balance_1st_stake_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.rewards.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG18);

    await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_1, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    console.log(
      'accounts[1] staking 7.5 (E6) LP tokens into FRAX_USDC staking pool'
    );
    console.log(
      'accounts[1] LP token balance:',
      uni_pool_1st_stake_1.toString()
    );
    console.log('accounts[1] FXS balance:', fxs_1st_stake_1.toString());
    console.log(
      'accounts[1] staking rewards():',
      rewards_balance_1st_stake_1.toString()
    );
    console.log(
      'accounts[1] balanceOf:',
      new BigNumber(
        await stakingInstance_FRAX_USDC.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG6)
        .toNumber()
    );
    console.log(
      'accounts[1] boostedBalanceOf:',
      new BigNumber(
        await stakingInstance_FRAX_USDC.boostedBalanceOf(
          COLLATERAL_FRAX_AND_FXS_OWNER
        )
      )
        .div(BIG6)
        .toNumber()
    );
    console.log('');

    let uni_pool_tokens_9 = new BigNumber('25e5');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_tokens_9,
      {from: accounts[9]}
    );
    console.log(
      'accounts[9] approve FRAX_USDC staking pool for 2.5 (E6) LP tokens'
    );
    const uni_pool_1st_stake_9 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(accounts[9])
    ).div(BIG6);
    const fxs_1st_stake_9 = new BigNumber(
      await fxsInstance.balanceOf.call(accounts[9])
    ).div(BIG18);
    const rewards_balance_1st_stake_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.rewards(accounts[9])
    ).div(BIG18);

    await stakingInstance_FRAX_USDC.stake(uni_pool_tokens_9, {
      from: accounts[9],
    });
    console.log(
      'accounts[9] staking 2.5 (E6) LP tokens into FRAX_USDC staking pool'
    );
    console.log(
      'accounts[9] LP token balance:',
      uni_pool_1st_stake_9.toString()
    );
    console.log('accounts[9] FXS balance:', fxs_1st_stake_9.toString());
    console.log(
      'accounts[9] staking rewards():',
      rewards_balance_1st_stake_9.toString()
    );
    console.log(
      'accounts[9] balanceOf:',
      new BigNumber(await stakingInstance_FRAX_USDC.balanceOf(accounts[9]))
        .div(BIG6)
        .toNumber()
    );
    console.log(
      'accounts[9] boostedBalanceOf:',
      new BigNumber(
        await stakingInstance_FRAX_USDC.boostedBalanceOf(accounts[9])
      )
        .div(BIG6)
        .toNumber()
    );
    console.log('');

    // Note the last update time
    const block_time_before = (await time.latest()).toNumber();
    console.log('current block time (in seconds):', block_time_before);

    // Note the total lastUpdateTime
    let rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toString()
    );

    // Note the total periodFinish
    let rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    );
    console.log('pool periodFinish:', rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    let rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()
    );
    console.log(
      'pool lastTimeRewardApplicable():',
      rewards_contract_lastTimeRewardApplicable.toString()
    );

    console.log(
      '===================================================================='
    );
    console.log('advance one week (one rewardsDuration period)');
    // Advance 7 days so the reward can be claimed
    await time.increase(7 * 86400 + 1);
    await time.advanceBlock();
    //await fraxInstance.refreshCollateralRatio();
    console.log('');

    const cr_boost_multiplier_2 = new BigNumber(
      await stakingInstance_FRAX_USDC.crBoostMultiplier()
    ).div(BIG6);
    console.log(
      'pool cr_boost_multiplier (div 1e6): ',
      cr_boost_multiplier_2.toNumber()
    );

    // Note the last update time
    let block_time_after = (await time.latest()).toNumber();
    console.log(
      'block time after waiting one week (in seconds):',
      block_time_after
    );

    // Make sure there is a valid period for the contract
    await stakingInstance_FRAX_USDC.renewIfApplicable({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toString()
    );

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    );
    console.log('pool periodFinish:', rewards_contract_periodFinish.toString());

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()
    );
    console.log(
      'pool lastTimeRewardApplicable():',
      rewards_contract_lastTimeRewardApplicable.toString()
    );

    // Note the total FRAX supply
    const rewards_contract_stored_uni_pool = new BigNumber(
      await stakingInstance_FRAX_USDC.totalSupply.call()
    ).div(BIG6);
    console.log(
      'pool totalSupply() (of LP tokens):',
      rewards_contract_stored_uni_pool.toString()
    );

    // Print the decimals
    const staking_token_decimal = new BigNumber(
      await stakingInstance_FRAX_USDC.stakingDecimals.call()
    );
    console.log('pool stakingDecimals():', staking_token_decimal.toString());

    console.log('');
    // Show the reward
    const staking_fxs_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const staking_fxs_earned_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[9])
    ).div(BIG18);

    console.log(
      'accounts[1] earnings after 1 week:',
      staking_fxs_earned_1.toString()
    );
    console.log(
      'accounts[9] earnings after 1 week:',
      staking_fxs_earned_9.toString()
    );
    const reward_week_1 = staking_fxs_earned_1.plus(staking_fxs_earned_9);
    const effective_yearly_reward_at_week_1 =
      reward_week_1.multipliedBy(52.1429);
    console.log(
      'Effective weekly reward at week 1: ',
      reward_week_1.toString()
    );
    console.log(
      'Effective yearly reward at week 1: ',
      effective_yearly_reward_at_week_1.toString()
    );

    const duration_reward_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.getRewardForDuration.call()
    ).div(BIG18);
    console.log(
      'Expected yearly reward: ',
      duration_reward_1.multipliedBy(52.1429).toString()
    );

    // await stakingInstance_FRAX_USDC.getReward({ from: COLLATERAL_FRAX_AND_FXS_OWNER });

    // Note the UNI POOL and FXS amounts after the reward
    const uni_pool_post_reward_1 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const fxs_post_reward_1 = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] LP token balance:',
      uni_pool_post_reward_1.toString()
    );
    console.log('accounts[1] FXS balance:', fxs_post_reward_1.toString());

    console.log(
      '===================================================================='
    );
    console.log('accounts[1] claim and withdrawal...');
    console.log('');
    await time.advanceBlock();
    const uni_pool_balance_1 = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const staking_fxs_ew_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log('accounts[1] LP token balance:', uni_pool_balance_1.toString());
    console.log(
      'accounts[1] staking earned():',
      staking_fxs_ew_earned_1.toString()
    );
    console.log('');

    console.log('accounts[1] claims getReward()');
    await stakingInstance_FRAX_USDC.getReward({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await time.advanceBlock();

    console.log('accounts[1] performs withdraw()');
    await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_1, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await time.advanceBlock();
    console.log('');

    const fxs_after_withdraw_0 = new BigNumber(
      await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] FXS balance change:',
      fxs_after_withdraw_0.minus(fxs_1st_stake_1).toNumber()
    );
    console.log(
      'accounts[1] vote balance:',
      new BigNumber(
        await fxsInstance.getCurrentVotes(COLLATERAL_FRAX_AND_FXS_OWNER)
      )
        .div(BIG18)
        .toNumber()
    );
    console.log(
      'accounts[1] FXS balance:',
      new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))
        .div(BIG18)
        .toNumber()
    );
    console.log(
      '===================================================================='
    );

    console.log('wait two weeks so accounts[9] can earn more');
    // Advance a few days
    await time.increase(2 * (7 * 86400) + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract
    await stakingInstance_FRAX_USDC.renewIfApplicable({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    // Note the last update time
    block_time_after = (await time.latest()).toNumber();
    console.log('current block time (in seconds):', block_time_after);

    // Note the total lastUpdateTime
    rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_USDC.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toString()
    );

    // Note the total periodFinish
    rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_USDC.periodFinish.call()
    ).toNumber();
    console.log(
      'pool periodFinish: ',
      rewards_contract_periodFinish.toString()
    );

    // Note the total lastTimeRewardApplicable
    rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_USDC.lastTimeRewardApplicable.call()
    ).toNumber();
    console.log(
      'pool lastTimeRewardApplicable: ',
      rewards_contract_lastTimeRewardApplicable.toString()
    );

    // Show the reward
    const staking_fxs_part2_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const staking_fxs_part2_earned_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[1] staking earned():',
      staking_fxs_part2_earned_1.toString()
    );
    console.log(
      'accounts[9] staking earned():',
      staking_fxs_part2_earned_9.toString()
    );

    const uni_pool_2nd_time_balance = new BigNumber(
      await pair_instance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const fxs_2nd_time_balance = new BigNumber(
      await fxsInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const rewards_earned_2nd_time = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    console.log(
      'accounts[1] LP token balance:',
      uni_pool_2nd_time_balance.toString()
    );
    console.log('accounts[1] FXS balance:', fxs_2nd_time_balance.toString());
    console.log(
      'accounts[1] staking earned():',
      rewards_earned_2nd_time.toString()
    );
    console.log('');

    console.log('accounts[9] getReward()');
    await stakingInstance_FRAX_USDC.getReward({from: accounts[9]});

    console.log('accounts[9] withdrawing');
    await stakingInstance_FRAX_USDC.withdraw(uni_pool_tokens_9, {
      from: accounts[9],
    });
    await time.advanceBlock();

    const reward_week_3 = staking_fxs_part2_earned_1
      .plus(staking_fxs_part2_earned_9)
      .plus(staking_fxs_ew_earned_1);
    const effective_yearly_reward_at_week_3 = reward_week_3.multipliedBy(
      52.1429 / 3.0
    ); // Total over 3 weeks
    console.log(
      'Effective weekly reward at week 3: ',
      reward_week_3.div(3).toString()
    ); // Total over 3 weeks
    console.log(
      'Effective yearly reward at week 3: ',
      effective_yearly_reward_at_week_3.toString()
    );

    const duration_reward_3 = new BigNumber(
      await stakingInstance_FRAX_USDC.getRewardForDuration.call()
    ).div(BIG18);
    console.log(
      'Expected yearly reward: ',
      duration_reward_3.multipliedBy(52.1429).toString()
    );

    const acc_9_FXS_balance_after = new BigNumber(
      await fxsInstance.balanceOf(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[9] FXS balance change:',
      acc_9_FXS_balance_after.minus(fxs_1st_stake_9).toNumber()
    );
  });

  it('blocks a greylisted address which tries to stake; SHOULD FAIL', async () => {
    console.log('greylistAddress(accounts[9])');
    await stakingInstance_FRAX_USDC.greylistAddress(accounts[9], {
      from: STAKING_OWNER,
    });
    console.log('');
    console.log('this should fail');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      new BigNumber('1e6'),
      {from: accounts[9]}
    );

    await expectRevert.unspecified(
      stakingInstance_FRAX_USDC.stake(new BigNumber('1e6'), {from: accounts[9]})
    );
  });

  it('ungreylists a greylisted address which tries to stake; SHOULD SUCCEED', async () => {
    console.log('greylistAddress(accounts[9])');
    await stakingInstance_FRAX_USDC.greylistAddress(accounts[9], {
      from: STAKING_OWNER,
    });
    console.log('');
    console.log('this should succeed');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      new BigNumber('1e6'),
      {from: accounts[9]}
    );
    await stakingInstance_FRAX_USDC.stake(new BigNumber('1e6'), {
      from: accounts[9],
    });
  });

  it('PART 2: Locked stakes', async () => {
    console.log(
      '===================================================================='
    );
    console.log('NOW TRY TESTS WITH LOCKED STAKES.');
    console.log('[1] AND [9] HAVE WITHDRAWN EVERYTHING AND ARE NOW AT 0');

    // Need to approve first so the staking can use transfer
    const uni_pool_normal_1 = new BigNumber('15e5');
    const uni_pool_normal_9 = new BigNumber('5e5');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_normal_1,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_normal_9,
      {from: accounts[9]}
    );

    // Stake Normal
    await stakingInstance_FRAX_USDC.stake(uni_pool_normal_1, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await stakingInstance_FRAX_USDC.stake(uni_pool_normal_9, {
      from: accounts[9],
    });
    await time.advanceBlock();

    // Need to approve first so the staking can use transfer
    const uni_pool_locked_1 = new BigNumber('75e5');
    const uni_pool_locked_1_sum = new BigNumber('10e6');
    const uni_pool_locked_9 = new BigNumber('25e5');
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_locked_1_sum,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await pair_instance_FRAX_USDC.approve(
      stakingInstance_FRAX_USDC.address,
      uni_pool_locked_9,
      {from: accounts[9]}
    );

    // // Note the FRAX amounts before
    // const frax_before_1_locked = new BigNumber(await fraxInstance.balanceOf.call(COLLATERAL_FRAX_AND_FXS_OWNER)).div(BIG18);
    // const frax_before_9_locked = new BigNumber(await fraxInstance.balanceOf.call(accounts[9])).div(BIG18);
    // console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [1]: ", frax_before_1_locked.toString());
    // console.log("FRAX_USDC Uniswap Liquidity Tokens BEFORE [9]: ", frax_before_9_locked.toString());

    console.log(
      'accounts[1] FXS balance:',
      new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))
        .div(BIG18)
        .toNumber()
    );

    // Stake Locked
    // account[1]
    await stakingInstance_FRAX_USDC.stakeLocked(uni_pool_locked_1, 7 * 86400, {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    }); // 15 days
    await stakingInstance_FRAX_USDC.stakeLocked(
      new BigNumber('25e5'),
      548 * 86400,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    ); // 270 days

    // account[9]
    await stakingInstance_FRAX_USDC.stakeLocked(uni_pool_locked_9, 28 * 86400, {
      from: accounts[9],
    }); // 6 months
    await time.advanceBlock();

    // Show the stake structs
    const locked_stake_structs_1 =
      await stakingInstance_FRAX_USDC.lockedStakesOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      );
    const locked_stake_structs_9 =
      await stakingInstance_FRAX_USDC.lockedStakesOf.call(accounts[9]);
    console.log('LOCKED STAKES [1]: ', locked_stake_structs_1);
    console.log('LOCKED STAKES [9]: ', locked_stake_structs_9);

    // Note the UNI POOL and FXS amount after staking
    const regular_balance_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.balanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const boosted_balance_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.boostedBalanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const unlocked_balance_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.unlockedBalanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const locked_balance_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.lockedBalanceOf.call(
        COLLATERAL_FRAX_AND_FXS_OWNER
      )
    ).div(BIG6);
    const regular_balance_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.balanceOf.call(accounts[9])
    ).div(BIG6);
    const boosted_balance_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.boostedBalanceOf.call(accounts[9])
    ).div(BIG6);
    const unlocked_balance_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.unlockedBalanceOf.call(accounts[9])
    ).div(BIG6);
    const locked_balance_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.lockedBalanceOf.call(accounts[9])
    ).div(BIG6);
    console.log('REGULAR BALANCE [1]: ', regular_balance_1.toString());
    console.log('BOOSTED BALANCE [1]: ', boosted_balance_1.toString());
    console.log('---- UNLOCKED [1]: ', unlocked_balance_1.toString());
    console.log('---- LOCKED [1]: ', locked_balance_1.toString());
    console.log('REGULAR BALANCE [9]: ', regular_balance_9.toString());
    console.log('BOOSTED BALANCE [9]: ', boosted_balance_9.toString());
    console.log('---- UNLOCKED [9]: ', unlocked_balance_9.toString());
    console.log('---- LOCKED [9]: ', locked_balance_9.toString());

    console.log('TRY AN EARLY WITHDRAWAL (SHOULD FAIL)');
    await expectRevert.unspecified(
      stakingInstance_FRAX_USDC.withdrawLocked(
        locked_stake_structs_1[0].kek_id,
        {from: COLLATERAL_FRAX_AND_FXS_OWNER}
      )
    );
    await expectRevert.unspecified(
      stakingInstance_FRAX_USDC.withdrawLocked(
        locked_stake_structs_9[0].kek_id,
        {from: accounts[9]}
      )
    );
    await time.advanceBlock();

    console.log(
      '===================================================================='
    );
    console.log('WAIT 7 DAYS');

    // Advance 7 days
    await time.increase(7 * 86400 + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract and sync it
    await stakingInstance_FRAX_USDC.renewIfApplicable({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    const staking_fxs_earned_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(COLLATERAL_FRAX_AND_FXS_OWNER)
    ).div(BIG18);
    const staking_fxs_earned_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[1] earnings after 1 week:',
      staking_fxs_earned_1.toString()
    );
    console.log(
      'accounts[9] earnings after 1 week:',
      staking_fxs_earned_9.toString()
    );
    const reward_week_1 = staking_fxs_earned_1.plus(staking_fxs_earned_9);
    const effective_yearly_reward_at_week_1 =
      reward_week_1.multipliedBy(52.1429);
    console.log(
      'Effective weekly reward at week 1: ',
      reward_week_1.toString()
    );
    console.log(
      'Effective yearly reward at week 1: ',
      effective_yearly_reward_at_week_1.toString()
    );

    const duration_reward_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.getRewardForDuration.call()
    ).div(BIG18);
    console.log(
      'Expected yearly reward: ',
      duration_reward_1.multipliedBy(52.1429).toString()
    );

    console.log('TRY WITHDRAWING AGAIN');
    console.log('[1] SHOULD SUCCEED, [9] SHOULD FAIL');
    await stakingInstance_FRAX_USDC.withdrawLocked(
      locked_stake_structs_1[0].kek_id,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await expectRevert.unspecified(
      stakingInstance_FRAX_USDC.withdrawLocked(
        locked_stake_structs_9[0].kek_id,
        {from: accounts[9]}
      )
    );

    console.log(
      '===================================================================='
    );
    console.log('ADVANCING 28 DAYS');

    // Advance 28 days
    await time.increase(28 * 86400 + 1);
    await time.advanceBlock();

    // Make sure there is a valid period for the contract and sync it
    await stakingInstance_FRAX_USDC.renewIfApplicable({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    const staking_fxs_earned_28_1 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[1])
    ).div(BIG18);
    const staking_fxs_earned_28_9 = new BigNumber(
      await stakingInstance_FRAX_USDC.earned.call(accounts[9])
    ).div(BIG18);
    console.log(
      'accounts[1] earnings after 5 weeks:',
      staking_fxs_earned_28_1.toString()
    );
    console.log(
      'accounts[9] earnings after 5 weeks:',
      staking_fxs_earned_28_9.toString()
    );
    const reward_week_5 = staking_fxs_earned_28_1.plus(staking_fxs_earned_28_9);
    const effective_yearly_reward_at_week_5 = reward_week_5.multipliedBy(
      52.1429 / 5.0
    );
    console.log(
      'Effective weekly reward at week 5: ',
      reward_week_5.div(5).toString()
    );
    console.log(
      'Effective yearly reward at week 5: ',
      effective_yearly_reward_at_week_5.toString()
    );

    const duration_reward_3 = new BigNumber(
      await stakingInstance_FRAX_USDC.getRewardForDuration.call()
    ).div(BIG18);
    console.log(
      'Expected yearly reward: ',
      duration_reward_3.multipliedBy(52.1429).toString()
    );

    // Account 9 withdraws and claims its locked stake
    await stakingInstance_FRAX_USDC.withdrawLocked(
      locked_stake_structs_9[0].kek_id,
      {from: accounts[9]}
    );
    await stakingInstance_FRAX_USDC.getReward({from: accounts[9]});
    await expectRevert.unspecified(
      stakingInstance_FRAX_USDC.withdrawLocked(
        locked_stake_structs_1[1].kek_id,
        {from: COLLATERAL_FRAX_AND_FXS_OWNER}
      )
    );

    console.log('UNLOCKING ALL STAKES');
    await stakingInstance_FRAX_USDC.unlockStakes({from: STAKING_OWNER});
    await stakingInstance_FRAX_USDC.withdrawLocked(
      locked_stake_structs_1[1].kek_id,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );

    await fxsInstance.transfer(
      stakingInstance_FRAX_USDC.address,
      new BigNumber('100000e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    console.log(
      'stakingInstance FXS balance:',
      new BigNumber(
        await fxsInstance.balanceOf(stakingInstance_FRAX_USDC.address)
      )
        .div(BIG18)
        .toNumber()
    );
    await stakingInstance_FRAX_USDC.getReward({
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    console.log(
      'accounts[1] FXS balance:',
      new BigNumber(await fxsInstance.balanceOf(COLLATERAL_FRAX_AND_FXS_OWNER))
        .div(BIG18)
        .toNumber()
    );
  });

  it('FraxPool security tests; SHOULD FAIL', async () => {
    console.log(
      'Try to call various things on the pool contract that should fail'
    );
    await expectRevert.unspecified(
      pool_instance_USDC.setCollatETHOracle(DUMP_ADDRESS, DUMP_ADDRESS, {
        from: accounts[6],
      })
    );
    await expectRevert.unspecified(
      pool_instance_USDC.toggleMinting({from: accounts[6]})
    );
    await expectRevert.unspecified(
      pool_instance_USDC.toggleRedeeming({from: accounts[6]})
    );
    await expectRevert.unspecified(
      pool_instance_USDC.toggleRecollateralize({from: accounts[6]})
    );
    await expectRevert.unspecified(
      pool_instance_USDC.toggleBuyBack({from: accounts[6]})
    );
    await expectRevert.unspecified(
      pool_instance_USDC.toggleCollateralPrice({from: accounts[6]})
    );
    await expectRevert.unspecified(
      pool_instance_USDC.setPoolParameters(
        new BigNumber('100e6'),
        new BigNumber('5000e0'),
        new BigNumber('3600e0'),
        {from: accounts[6]}
      )
    );
    await expectRevert.unspecified(
      pool_instance_USDC.setTimelock(DUMP_ADDRESS, {from: accounts[6]})
    );
    await expectRevert.unspecified(
      pool_instance_USDC.setOwner(DUMP_ADDRESS, {from: accounts[6]})
    );
  });

  it('Does a fair launch', async () => {
    console.log(
      '===================================================================='
    );
    await fxsInstance.transfer(
      stakingInstance_FRAX_WETH.address,
      new BigNumber('1000000e18'),
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    );
    await pair_instance_FRAX_WETH.transfer(accounts[2], new BigNumber('1e18'), {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });
    await pair_instance_FRAX_WETH.transfer(accounts[3], new BigNumber('1e18'), {
      from: COLLATERAL_FRAX_AND_FXS_OWNER,
    });

    console.log(
      'staking contract FXS balance:',
      new BigNumber(
        await fxsInstance.balanceOf(stakingInstance_FRAX_WETH.address)
      )
        .div(BIG18)
        .toNumber()
    );
    console.log(
      'accounts[2] FRAX-WETH LP token balance:',
      new BigNumber(await pair_instance_FRAX_WETH.balanceOf(accounts[2]))
        .div(BIG18)
        .toNumber()
    );
    console.log(
      'accounts[3] FRAX-WETH LP token balance:',
      new BigNumber(await pair_instance_FRAX_WETH.balanceOf(accounts[3]))
        .div(BIG18)
        .toNumber()
    );

    console.log('');

    let acc2_startingFXSbalance = new BigNumber(
      await fxsInstance.balanceOf(accounts[2])
    );
    let acc3_startingFXSbalance = new BigNumber(
      await fxsInstance.balanceOf(accounts[3])
    );

    console.log(
      'accounts[2] FXS balance:',
      new BigNumber(await fxsInstance.balanceOf(accounts[2]))
        .div(BIG18)
        .toNumber()
    );
    console.log(
      'accounts[3] FXS balance:',
      new BigNumber(await fxsInstance.balanceOf(accounts[3]))
        .div(BIG18)
        .toNumber()
    );

    await pair_instance_FRAX_WETH.approve(
      stakingInstance_FRAX_WETH.address,
      new BigNumber('1e18'),
      {from: accounts[2]}
    );
    await pair_instance_FRAX_WETH.approve(
      stakingInstance_FRAX_WETH.address,
      new BigNumber('1e18'),
      {from: accounts[3]}
    );

    console.log('staking');
    await stakingInstance_FRAX_WETH.stake(new BigNumber('1e18'), {
      from: accounts[3],
    });

    // Note the last update time
    const block_time_before = (await time.latest()).toNumber();
    console.log('current block time (in seconds):', block_time_before);

    // Note the total lastUpdateTime
    let rewards_contract_lastUpdateTime = new BigNumber(
      await stakingInstance_FRAX_WETH.lastUpdateTime.call()
    );
    console.log(
      'pool lastUpdateTime:',
      rewards_contract_lastUpdateTime.toNumber()
    );

    // Note the total periodFinish
    let rewards_contract_periodFinish = new BigNumber(
      await stakingInstance_FRAX_WETH.periodFinish.call()
    );
    console.log('pool periodFinish:', rewards_contract_periodFinish.toNumber());

    // Note the total lastTimeRewardApplicable
    let rewards_contract_lastTimeRewardApplicable = new BigNumber(
      await stakingInstance_FRAX_WETH.lastTimeRewardApplicable.call()
    );
    console.log(
      'pool lastTimeRewardApplicable():',
      rewards_contract_lastTimeRewardApplicable.toNumber()
    );

    const staking_fxs_earned_2 = new BigNumber(
      await stakingInstance_FRAX_WETH.earned(accounts[2])
    ).div(BIG18);
    const staking_fxs_earned_3 = new BigNumber(
      await stakingInstance_FRAX_WETH.earned(accounts[3])
    ).div(BIG18);

    console.log(
      'accounts[2] staking earned():',
      staking_fxs_earned_2.toNumber()
    );
    console.log(
      'accounts[3] staking earned():',
      staking_fxs_earned_3.toNumber()
    );

    let cr_boost_multiplier_2;
    let mid_block_time_before;
    let rewards_contract_stored_uni_pool;
    let mid_staking_fxs_earned_2;
    let mid_staking_fxs_earned_3;

    for (let i = 0; i < 3; i++) {
      console.log(
        '===================================================================='
      );
      console.log('advance one day [day number:', i, ']');

      if (i == 1) {
        await stakingInstance_FRAX_WETH.stake(new BigNumber('1e18'), {
          from: accounts[2],
        });
      }

      await time.increase(86400);
      await time.advanceBlock();
      console.log('');

      cr_boost_multiplier_2 = new BigNumber(
        await stakingInstance_FRAX_WETH.crBoostMultiplier()
      ).div(BIG6);
      console.log('cr_boost_multiplier:', cr_boost_multiplier_2.toNumber());

      // Make sure there is a valid period for the contract
      await stakingInstance_FRAX_WETH.renewIfApplicable({
        from: COLLATERAL_FRAX_AND_FXS_OWNER,
      });

      // Note the last update time
      mid_block_time_before = (await time.latest()).toNumber();
      console.log('current block time (in seconds):', mid_block_time_before);

      // Note the total lastUpdateTime
      rewards_contract_lastUpdateTime = new BigNumber(
        await stakingInstance_FRAX_WETH.lastUpdateTime()
      );
      console.log(
        'pool lastUpdateTime:',
        rewards_contract_lastUpdateTime.toNumber()
      );

      // Note the total periodFinish
      rewards_contract_periodFinish = new BigNumber(
        await stakingInstance_FRAX_WETH.periodFinish()
      );
      console.log(
        'pool periodFinish:',
        rewards_contract_periodFinish.toNumber()
      );

      // Note the total lastTimeRewardApplicable
      rewards_contract_lastTimeRewardApplicable = new BigNumber(
        await stakingInstance_FRAX_WETH.lastTimeRewardApplicable()
      );
      console.log(
        'pool lastTimeRewardApplicable():',
        rewards_contract_lastTimeRewardApplicable.toNumber()
      );

      // Note the total FRAX supply
      rewards_contract_stored_uni_pool = new BigNumber(
        await stakingInstance_FRAX_WETH.totalSupply()
      ).div(BIG18);
      console.log(
        'pool totalSupply() (of LP tokens):',
        rewards_contract_stored_uni_pool.toNumber()
      );

      // Show the reward
      mid_staking_fxs_earned_2 = new BigNumber(
        await stakingInstance_FRAX_WETH.earned(accounts[2])
      ).div(BIG18);
      mid_staking_fxs_earned_3 = new BigNumber(
        await stakingInstance_FRAX_WETH.earned(accounts[3])
      ).div(BIG18);

      console.log(
        'accounts[2] staking earned():',
        mid_staking_fxs_earned_2.toNumber()
      );
      console.log(
        'accounts[3] staking earned():',
        mid_staking_fxs_earned_3.toNumber()
      );
    }

    console.log('accounts[2] getReward()');
    await stakingInstance_FRAX_WETH.getReward({from: accounts[2]});
    console.log('accounts[3] getReward()');
    await stakingInstance_FRAX_WETH.getReward({from: accounts[3]});
    console.log('');

    console.log(
      'accounts[2] FXS balance change:',
      new BigNumber(await fxsInstance.balanceOf(accounts[2]))
        .minus(acc2_startingFXSbalance)
        .div(BIG18)
        .toNumber()
    );
    console.log(
      'accounts[3] FXS balance change:',
      new BigNumber(await fxsInstance.balanceOf(accounts[3]))
        .minus(acc3_startingFXSbalance)
        .div(BIG18)
        .toNumber()
    );

    console.log('');

    // Show the reward
    mid_staking_fxs_earned_2 = new BigNumber(
      await stakingInstance_FRAX_WETH.earned(accounts[2])
    ).div(BIG18);
    mid_staking_fxs_earned_3 = new BigNumber(
      await stakingInstance_FRAX_WETH.earned(accounts[3])
    ).div(BIG18);

    console.log(
      'accounts[2] staking earned():',
      mid_staking_fxs_earned_2.toNumber()
    );
    console.log(
      'accounts[3] staking earned():',
      mid_staking_fxs_earned_3.toNumber()
    );

    console.log(
      'staking contract FXS balance:',
      new BigNumber(
        await fxsInstance.balanceOf(stakingInstance_FRAX_WETH.address)
      )
        .div(BIG18)
        .toNumber()
    );
    console.log(
      'crBoostMultiplier():',
      new BigNumber(
        await stakingInstance_FRAX_WETH.crBoostMultiplier()
      ).toNumber()
    );
  });
});
