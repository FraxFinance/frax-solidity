#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const {spawn} = require('child_process');

const program = require('commander');
function execute(command) {
  return new Promise((resolve, reject) => {
    const onExit = (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    };
    spawn(command.split(' ')[0], command.split(' ').slice(1), {
      stdio: 'inherit',
      shell: true,
    }).on('exit', onExit);
  });
}

program.version('0.0.1');

program
  .command('run <network> <file> [extra...]')
  .description('run file against a network')
  .action(async (network, file, extra) => {
    await execute(
      `cross-env HARDHAT_NETWORK=${network} ts-node --files ${file} ${
        extra ? extra.join(' ') : ''
      }`
    );
  });

program
  .command('deploy <network> [extra...]')
  .description('deploy to network')
  .option('--tags <tags>')
  .option('--gasPrice <gasPrice>')
  .action(async (network, extra, options) => {
    await execute(
      `hardhat --network ${network} deploy ${
        options.tags ? `--tags ${options.tags}` : ''
      } ${options.gasPrice ? `--gasPrice ${options.gasPrice}` : ''} ${
        extra ? extra.join(' ') : ''
      }`
    );
  });

program
  .command('export <network> <file>')
  .description('export contracts for network')
  .action(async (network, file) => {
    await execute(`hardhat --network ${network} export --export ${file}`);
  });

program
  .command('fork:run <network> <file> [extra...]')
  .option('--blockNumber <blockNumber>')
  .option('--deploy')
  .description('run file against a fork')
  .action(async (network, file, extra, options) => {
    await execute(
      `cross-env ${
        options.deploy ? 'HARDHAT_DEPLOY_FIXTURE=true' : ''
      } HARDHAT_DEPLOY_ACCOUNTS_NETWORK=${network} HARDHAT_FORK=${network} ${
        options.blockNumber ? `HARDHAT_FORK_NUMBER=${options.blockNumber}` : ''
      } ts-node --files ${file} ${extra ? extra.join(' ') : ''}`
    );
  });

program
  .command('fork:deploy <network> [extra...]')
  .option('--blockNumber <blockNumber>')
  .description('deploy on a fork')
  .action(async (network, extra, options) => {
    // console.log({network, extra, options});
    await execute(
      `cross-env HARDHAT_DEPLOY_ACCOUNTS_NETWORK=${network} HARDHAT_FORK=${network} ${
        options.blockNumber ? `HARDHAT_FORK_NUMBER=${options.blockNumber}` : ''
      } hardhat deploy ${extra ? extra.join(' ') : ''}`
    );
  });

program
  .command('fork:test <network> [extra...]')
  .option('--blockNumber <blockNumber>')
  .description('test on a fork')
  .action(async (network, extra, options) => {
    // console.log({network, extra, options});
    await execute(
      `cross-env HARDHAT_DEPLOY_ACCOUNTS_NETWORK=${network} HARDHAT_FORK=${network} ${
        options.blockNumber ? `HARDHAT_FORK_NUMBER=${options.blockNumber}` : ''
      }  HARDHAT_DEPLOY_FIXTURE=true HARDHAT_COMPILE=true mocha --bail --recursive test ${
        extra ? extra.join(' ') : ''
      }`
    );
  });

program
  .command('fork:dev <network> [extra...]')
  .option('--blockNumber <blockNumber>')
  .description('deploy on a fork and keep running')
  .action(async (network, extra, options) => {
    await execute(
      `cross-env HARDHAT_DEPLOY_ACCOUNTS_NETWORK=${network} HARDHAT_FORK=${network} ${
        options.blockNumber ? `HARDHAT_FORK_NUMBER=${options.blockNumber}` : ''
      } hardhat node --watch --export contractsInfo.json ${
        extra ? extra.join(' ') : ''
      }`
    );
  });

// program
//   .command('exec <command>  [options...]')
//   .description('exec program in PATH')
//   .action(async (command, options) => {
//     const actualCommand = command + ' ' + options ? options.join(' ') : '';
//     await execute(actualCommand);
//   });

program.parse(process.argv);
