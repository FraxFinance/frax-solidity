import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-gas-reporter';
import 'hardhat-typechain';
import 'solidity-coverage';
import '@nomiclabs/hardhat-vyper';
import {accounts, keys, node_url} from './utils/network';
import {utils} from 'ethers';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.6.11',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
      {
        version: '0.5.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000,
          },
        },
      },
    ],
  },
  vyper: {
    version: '0.2.12',
  },
  namedAccounts: {
    ORACLE_ADDRESS: {
      default: 0,
    },
    COLLATERAL_FRAX_AND_FXS_OWNER: {
      default: 0,
    },
    TIMELOCK_ADMIN: {
      default: 0,
    },
    deployer: {
      default: 0,
      mainnet: '0xaCa39B187352D9805DECEd6E73A3d72ABf86E7A0', // deployer
    },
    stakingToken: {
      default: 1, // for testing staking rewards dual v3
    }
  },
  networks: {
    hardhat: {
      accounts: accounts(process.env.HARDHAT_FORK),
      forking: process.env.HARDHAT_FORK
        ? {
            url: node_url(process.env.HARDHAT_FORK),
            blockNumber: process.env.HARDHAT_FORK_NUMBER
              ? parseInt(process.env.HARDHAT_FORK_NUMBER)
              : undefined,
          }
        : undefined,
    },
    localhost: {
      url: node_url('localhost'),
      accounts: accounts(),
    },
    mainnet: {
      gasPrice: parseInt(utils.parseUnits('123', 'gwei').toString()),
      url: node_url('mainnet'),
      accounts:
        keys('mainnet')[0] !== '' ? keys('mainnet') : accounts('mainnet'),
    },
    rinkeby: {
      gasPrice: parseInt(utils.parseUnits('123', 'gwei').toString()),
      url: node_url('rinkeby'),
      accounts:
        keys('rinkeby')[0] !== '' ? keys('rinkeby') : accounts('rinkeby'),
    },
    kovan: {
      url: node_url('kovan'),
      accounts: accounts('kovan'),
    },
    goerli: {
      gasPrice: parseInt(utils.parseUnits('123', 'gwei').toString()),
      url: node_url('goerli'),
      accounts: keys('goerli')[0] !== '' ? keys('goerli') : accounts('goerli'),
    },
    mumbai: {
      url: node_url('mumbai'),
      accounts: accounts('mumbai'),
    },
    matic: {
      url: node_url('matic'),
      accounts: keys('matic')[0] !== '' ? keys('matic') : accounts('matic'),
    },
    staging: {
      url: node_url('goerli'),
      accounts: accounts('goerli'),
    },
  },
  paths: {
    sources: 'src',
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 185,
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    maxMethodDiff: 10,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 0,
  },
  external: process.env.HARDHAT_FORK
    ? {
        deployments: {
          hardhat: ['deployments/' + process.env.HARDHAT_FORK],
        },
      }
    : undefined,
};

export default config;
