const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({path: envPath});

const constants = require(path.join(
  __dirname,
  '../../../dist/types/constants'
));

const BigNumber = require('bignumber.js');
require('@openzeppelin/test-helpers/configure')({
  provider: process.env.NETWORK_ENDPOINT,
});

const {
  expectEvent,
  send,
  shouldFail,
  time,
} = require('@openzeppelin/test-helpers');
const BIG6 = new BigNumber('1e6');
const BIG18 = new BigNumber('1e18');
const chalk = require('chalk');

const Address = artifacts.require('Utils/Address');
const BlockMiner = artifacts.require('Utils/BlockMiner');
const MigrationHelper = artifacts.require('Utils/MigrationHelper');
const StringHelpers = artifacts.require('Utils/StringHelpers');
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
const UniswapV2Router02 = artifacts.require('Uniswap/UniswapV2Router02');
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
const FraxPoolLibrary = artifacts.require('Frax/Pools/FraxPoolLibrary');
const Pool_USDC = artifacts.require('Frax/Pools/Pool_USDC');
const Pool_USDT = artifacts.require('Frax/Pools/Pool_USDT');
const Pool_USDC_V2 = artifacts.require('Frax/Pools/Pool_USDC_V2');
const Pool_USDT_V2 = artifacts.require('Frax/Pools/Pool_USDT_V2');

// Oracles
const UniswapPairOracle_FRAX_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_WETH'
);
const UniswapPairOracle_FRAX_USDC = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_USDC'
);
const UniswapPairOracle_FRAX_USDT = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_USDT'
);
const UniswapPairOracle_FRAX_FXS = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FRAX_FXS'
);
const UniswapPairOracle_FXS_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FXS_WETH'
);
const UniswapPairOracle_FXS_USDC = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FXS_USDC'
);
const UniswapPairOracle_FXS_USDT = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_FXS_USDT'
);
const UniswapPairOracle_USDC_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_USDC_WETH'
);
const UniswapPairOracle_USDT_WETH = artifacts.require(
  'Oracle/Variants/UniswapPairOracle_USDT_WETH'
);

// Chainlink Price Consumer
const ChainlinkETHUSDPriceConsumer = artifacts.require(
  'Oracle/ChainlinkETHUSDPriceConsumer'
);
const ChainlinkETHUSDPriceConsumerTest = artifacts.require(
  'Oracle/ChainlinkETHUSDPriceConsumerTest'
);

// FRAX core
const FRAXStablecoin = artifacts.require('Frax/FRAXStablecoin');
const FRAXShares = artifacts.require('FXS/FRAXShares');

// Governance related
const GovernorAlpha = artifacts.require('Governance/GovernorAlpha');
const Timelock = artifacts.require('Governance/Timelock');

// Staking contracts
const StakingRewards_FRAX_WETH = artifacts.require(
  'Staking/Variants/Stake_FRAX_WETH.sol'
);
const StakingRewards_FRAX_USDC = artifacts.require(
  'Staking/Variants/Stake_FRAX_USDC.sol'
);
const StakingRewards_FRAX_FXS = artifacts.require(
  'Staking/Variants/Stake_FRAX_FXS.sol'
);
const StakingRewards_FXS_WETH = artifacts.require(
  'Staking/Variants/Stake_FXS_WETH.sol'
);

const DUMP_ADDRESS = '0x6666666666666666666666666666666666666666';

// Make sure Ganache is running beforehand
module.exports = async function (deployer, network, accounts) {
  // ======== Set the addresses ========
  console.log(chalk.yellow('===== SET THE ADDRESSES ====='));
  const COLLATERAL_FRAX_AND_FXS_OWNER = accounts[1];
  const ORACLE_ADDRESS = accounts[2];
  const POOL_CREATOR = accounts[3];
  const TIMELOCK_ADMIN = accounts[4];
  const GOVERNOR_GUARDIAN_ADDRESS = accounts[5];
  const STAKING_OWNER = accounts[6];
  const STAKING_REWARDS_DISTRIBUTOR = accounts[7];
  // const COLLATERAL_FRAX_AND_FXS_OWNER = accounts[8];

  // ======== Set other constants ========
  const TWENTY_FIVE_DEC6 = new BigNumber('25e6');
  const ONE_MILLION_DEC18 = new BigNumber('1000000e18');
  const FIVE_MILLION_DEC18 = new BigNumber('5000000e18');
  const TEN_MILLION_DEC18 = new BigNumber('10000000e18');
  const ONE_HUNDRED_MILLION_DEC18 = new BigNumber('100000000e18');
  const ONE_BILLION_DEC18 = new BigNumber('1000000000e18');
  const COLLATERAL_SEED_DEC18 = new BigNumber(508500e18);

  const REDEMPTION_FEE = 400; // 0.04%
  const MINTING_FEE = 300; // 0.03%
  const COLLATERAL_PRICE = 1040000; // $1.04
  const FRAX_PRICE = 980000; // $0.98
  const FXS_PRICE = 210000; // $0.21
  const TIMELOCK_DELAY = 86400 * 2; // 2 days
  const DUMP_ADDRESS = '0x6666666666666666666666666666666666666666';
  const METAMASK_ADDRESS = process.env.METAMASK_ADDRESS;

  // ================= Start Initializing =================

  // Get the necessary instances
  let CONTRACT_ADDRESSES;
  let timelockInstance;
  let migrationHelperInstance;
  let fraxInstance;
  let fxsInstance;
  let governanceInstance;
  let wethInstance;
  let col_instance_USDC;
  let routerInstance;
  let uniswapFactoryInstance;
  let swapToPriceInstance;
  let oracle_instance_FRAX_WETH;
  let oracle_instance_FRAX_USDC;
  let oracle_instance_FRAX_USDT;
  let oracle_instance_FRAX_FXS;
  let oracle_instance_FXS_WETH;
  let oracle_instance_FXS_USDC;
  let oracle_instance_FXS_USDT;
  let oracle_instance_USDC_WETH;
  let oracle_instance_USDT_WETH;
  let pool_instance_USDC;
  let pool_instance_USDT;

  if (process.env.MIGRATION_MODE == 'ganache') {
    timelockInstance = await Timelock.deployed();
    migrationHelperInstance = await MigrationHelper.deployed();
    governanceInstance = await GovernorAlpha.deployed();
    routerInstance = await UniswapV2Router02_Modified.deployed();
    fraxInstance = await FRAXStablecoin.deployed();
    fxsInstance = await FRAXShares.deployed();
    wethInstance = await WETH.deployed();
    col_instance_USDC = await FakeCollateral_USDC.deployed();
    uniswapFactoryInstance = await UniswapV2Factory.deployed();
    oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.deployed();
    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.deployed();
    oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.deployed();
    oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.deployed();
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.deployed();
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.deployed();
    oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.deployed();
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.deployed();
    oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.deployed();
    pool_instance_USDC = await Pool_USDC.deployed();
    pool_instance_USDT = await Pool_USDT.deployed();
  } else {
    CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
    timelockInstance = await Timelock.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.timelock
    );
    migrationHelperInstance = await MigrationHelper.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].misc.migration_helper
    );
    fraxInstance = await FRAXStablecoin.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FRAX
    );
    fxsInstance = await FRAXShares.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].main.FXS
    );
    governanceInstance = await GovernorAlpha.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].governance
    );
    wethInstance = await WETH.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].weth
    );
    col_instance_USDC = await FakeCollateral_USDC.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDC
    );
    col_instance_USDT = await FakeCollateral_USDT.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].collateral.USDT
    );
    routerInstance = await UniswapV2Router02.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.router
    );
    uniswapFactoryInstance = await UniswapV2Factory.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].uniswap_other.factory
    );
    swapToPriceInstance = await SwapToPrice.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pricing.swap_to_price
    );
    oracle_instance_FRAX_WETH = await UniswapPairOracle_FRAX_WETH.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_WETH
    );
    oracle_instance_FRAX_USDC = await UniswapPairOracle_FRAX_USDC.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_USDC
    );
    oracle_instance_FRAX_USDT = await UniswapPairOracle_FRAX_USDT.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_USDT
    );
    oracle_instance_FRAX_FXS = await UniswapPairOracle_FRAX_FXS.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FRAX_FXS
    );
    oracle_instance_FXS_WETH = await UniswapPairOracle_FXS_WETH.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_WETH
    );
    oracle_instance_FXS_USDC = await UniswapPairOracle_FXS_USDC.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_USDC
    );
    oracle_instance_FXS_USDT = await UniswapPairOracle_FXS_USDT.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.FXS_USDT
    );
    oracle_instance_USDC_WETH = await UniswapPairOracle_USDC_WETH.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.USDC_WETH
    );
    oracle_instance_USDT_WETH = await UniswapPairOracle_USDT_WETH.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].oracles.USDT_WETH
    );
    pool_instance_USDC = await Pool_USDC.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pools.USDC
    );
    pool_instance_USDT = await Pool_USDT.at(
      CONTRACT_ADDRESSES[process.env.MIGRATION_MODE].pools.USDT
    );
  }

  // CONTINUE MAIN DEPLOY CODE HERE
  // ====================================================================================================================
  // ====================================================================================================================

  return false;

  // Have to do these since Truffle gets messy when you want to link already-deployed libraries
  console.log(chalk.yellow('========== LINK STUFF =========='));
  // await deployer.deploy(SafeMath);
  await deployer.link(SafeMath, [Pool_USDC_V2, Pool_USDT_V2]);
  // await deployer.deploy(TransferHelper);
  await deployer.link(TransferHelper, [Pool_USDC_V2, Pool_USDT_V2]);
  // await deployer.deploy(SafeERC20);
  await deployer.link(SafeERC20, [Pool_USDC_V2, Pool_USDT_V2]);
  // await deployer.deploy(FraxPoolLibrary);
  await deployer.link(FraxPoolLibrary, [Pool_USDC_V2, Pool_USDT_V2]);
  await deployer.link(StringHelpers, [Pool_USDC_V2, Pool_USDC_V2]);

  // ============= Set the Frax Pools ========
  console.log(chalk.yellow('========== SET THE V2 POOLS =========='));
  await Promise.all([
    deployer.deploy(
      Pool_USDC_V2,
      fraxInstance.address,
      fxsInstance.address,
      col_instance_USDC.address,
      POOL_CREATOR,
      timelockInstance.address,
      FIVE_MILLION_DEC18
    ),
    deployer.deploy(
      Pool_USDT_V2,
      fraxInstance.address,
      fxsInstance.address,
      col_instance_USDT.address,
      POOL_CREATOR,
      timelockInstance.address,
      FIVE_MILLION_DEC18
    ),
  ]);

  // ============= Get the pool instances ========
  console.log(chalk.yellow('========== POOL INSTANCES =========='));
  const pool_instance_USDC_V2 = await Pool_USDC_V2.deployed();
  const pool_instance_USDT_V2 = await Pool_USDT_V2.deployed();

  // ============= Set the new pool oracles ========
  console.log(
    chalk.yellow('========== SET THE ORACLES FOR THE POOLS ==========')
  );
  await Promise.all([
    pool_instance_USDC_V2.setCollatETHOracle(
      oracle_instance_USDC_WETH.address,
      wethInstance.address,
      {from: POOL_CREATOR}
    ),
    pool_instance_USDT_V2.setCollatETHOracle(
      oracle_instance_USDT_WETH.address,
      wethInstance.address,
      {from: POOL_CREATOR}
    ),
  ]);

  // ============= Minimally seed the pools ========
  console.log(chalk.yellow('========== MINI POOL SEED =========='));
  await Promise.all([
    await col_instance_USDC.transfer(
      pool_instance_USDC_V2.address,
      TWENTY_FIVE_DEC6,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    ),
    await col_instance_USDT.transfer(
      pool_instance_USDT_V2.address,
      TWENTY_FIVE_DEC6,
      {from: COLLATERAL_FRAX_AND_FXS_OWNER}
    ),
  ]);

  // ============= Set the pool parameters so the minting and redemption fees get set ========
  console.log(chalk.yellow('========== REFRESH POOL PARAMETERS =========='));
  await Promise.all([
    await pool_instance_USDC_V2.setPoolParameters(FIVE_MILLION_DEC18, 7500, 1, {
      from: POOL_CREATOR,
    }),
    await pool_instance_USDT_V2.setPoolParameters(FIVE_MILLION_DEC18, 7500, 1, {
      from: POOL_CREATOR,
    }),
  ]);

  // Link the FAKE collateral pool to the FRAX contract
  console.log(chalk.yellow('===== ADD NEW POOLS TO FRAX ====='));
  await fraxInstance.addPool(pool_instance_USDC_V2.address, {
    from: COLLATERAL_FRAX_AND_FXS_OWNER,
  });
  await fraxInstance.addPool(pool_instance_USDT_V2.address, {
    from: COLLATERAL_FRAX_AND_FXS_OWNER,
  });

  // Remove the old pools
  console.log(chalk.yellow('===== REMOVE THE OLD POOLS ====='));
  // await fraxInstance.removePool(pool_instance_USDC.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
  // await fraxInstance.removePool(pool_instance_USDT.address, { from: COLLATERAL_FRAX_AND_FXS_OWNER });
  await fraxInstance.removePool('0x5e57064B79c8A0854858e13614A7024ccB8F09E9', {
    from: COLLATERAL_FRAX_AND_FXS_OWNER,
  });
  await fraxInstance.removePool('0xF8eC470B09d8636546fCd6A0922046e3fE9940C7', {
    from: COLLATERAL_FRAX_AND_FXS_OWNER,
  });

  // ============= Print the new pools ========
  const NEW_POOLS = {
    USDC: pool_instance_USDC_V2.address,
    USDT: pool_instance_USDT_V2.address,
  };

  console.log('NEW POOLS: ', NEW_POOLS);
};
