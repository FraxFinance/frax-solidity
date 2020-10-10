module.exports = {
	// Uncommenting the defaults below 
	// provides for an easier quick-start with Ganache.
	// You can also follow this format for other networks;
	// see <http://truffleframework.com/docs/advanced/configuration>
	// for more details on how to specify configuration options!
	//
	networks: {
		// development: {
		// 	host: "127.0.0.1",
		// 	port: 8545, // 7545
		// 	network_id: "*",
		// 	// gas: 0x1ffffffffffffe
		// },
		development: {
			host: "127.0.0.1",
			port: 8545,
			network_id: "*",
			// gas: 0x1ffffffffffffe
			websockets: true,        // Enable EventEmitter interface for web3 (default: false)
		},
		ropsten: {
			url: "wss://ropsten.infura.io/ws/v3/0a5b1633380b415d9b7342823baad798",
			network_id: "3"
		}
	},
	compilers: {
		solc: {
			version: "0.6.12",
			optimizer: {
				enabled: true,
				runs: 100000
			}
		}
	},
	mocha: {
		useColors: true
	},
	plugins: ["truffle-contract-size"]
};
