const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	res.end('Hello World');
});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));
console.log(`Provider at: ${web3.givenProvider}`);

web3.eth.getAccounts(console.log);

const solc = require('solc');
const fs = require ('fs');
const path = require('path');

const contextPath = path.resolve(__dirname, 'Context.sol');
const context = fs.readFileSync(contextPath, 'UTF-8');

const ierc20Path = path.resolve(__dirname, 'IERC20.sol');
const ierc20 = fs.readFileSync(ierc20Path, 'UTF-8');

const safemathPath = path.resolve(__dirname, 'SafeMath.sol');
const safemath = fs.readFileSync(safemathPath, 'UTF-8');

const tethersamplePath = path.resolve(__dirname, 'tether_sample.sol');
const tethersample = fs.readFileSync(tethersamplePath, 'UTF-8');

var input = {
	language: 'Solidity',
	sources: {
		'Context.sol': {
			content: context
		},
		'IERC20.sol': {
			content: ierc20
		},
		'SafeMath.sol': {
			content: safemath
		},
		'tether_sample.sol': {
			content: tethersample
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

var output = JSON.parse(solc.compile(JSON.stringify(input)));

for (var contractName in output.contracts['frax.sol']) {
	console.log(contractName + ': ' + output.contracts['frax.sol'][contractName].evm.bytecode.object);
}


