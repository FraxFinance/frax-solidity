//using infura provider on ropsten, currently access is open to public
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/0a5b1633380b415d9b7342823baad798"))

const solc = require('solc');
const fs = require ('fs');
const path = require('path');

//prepare input .sol files into JSON-input-output interface for solc compiler (https://solidity.readthedocs.io/en/v0.6.0/using-the-compiler.html#compiler-input-and-output-json-description)
var input = {
	language: 'Solidity',
	sources: {
		'Context.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'Context.sol'), 'UTF-8')
		},
		'IERC20.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'IERC20.sol'), 'UTF-8')
		},
		'SafeMath.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'SafeMath.sol'), 'UTF-8')
		},
		'tether_sample.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'tether_sample.sol'), 'UTF-8')
		},
		'frax.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'frax.sol'), 'UTF-8')
		},
		'fxs.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'fxs.sol'), 'UTF-8')
		},
		'frax_pool.sol': {
			content: fs.readFileSync(path.resolve(__dirname, 'frax_pool.sol'), 'UTF-8')
		}
	},
	settings: {
		outputSelection: {
			'*': {
				'*': [ '*' ]
			}
		}
	}
};

//compile contracts
var output = JSON.parse(solc.compile(JSON.stringify(input)));


/* print compiled contracts of specific .sol file
for (var contractName in output.contracts['frax.sol']) {
	console.log(contractName + ': ' + output.contracts['frax.sol'][contractName].evm.bytecode.object);
}
*/

//setting contract provider - is this necessary while web3 provider is already set to same address?
var Contract = require('web3-eth-contract');
Contract.setProvider('https://ropsten.infura.io/v3/0a5b1633380b415d9b7342823baad798');

//link metamask - this should be put into the front-end
const ethEnabled = () => {
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    window.ethereum.enable();
    return true;
  }
  return false;
}


//creating account and storing its values into vars
var deploy_account = web3.eth.accounts.create();
var deploy_account_address = deploy_account.address;
var deploy_account_privkey = deploy_account.privateKey;
var deploy_account_signTxObject = deploy_account.signTransaction;

console.log('address: ' + deploy_account_address + '\nprivkey: ' + deploy_account_privkey);

/* returns local accounts in web3 provider
var tetherAccount = web3.eth.getAccounts().then(e => {
	console.log(e);
});

console.log(`account: ` + tetherAccount);
*/


//console.log('tether contract ABI: ' + output.contracts['tether_sample.sol']['tether'].evm.bytecode.object);




/* deploying */

//grab ABI of compiled contract
var tether_sample = new Contract(output.contracts['tether_sample.sol']['tether'].abi);

//deploy ABI of contract using its bytecode
tether_sample.deploy({
	data: output.contracts['tether_sample.sol']['tether'].evm.bytecode.object,
	arguments: ['USDT', '10000', deploy_account_address]
});
