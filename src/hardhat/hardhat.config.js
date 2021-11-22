const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

require('hardhat-deploy');
require('hardhat-contract-sizer');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
//require("@nomiclabs/hardhat-vyper");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
		hardhat: {
			forking: {
				url: `${process.env.ETHEREUM_NETWORK_ENDPOINT}${process.env.INFURA_PROJECT_ID}`,
				// url: `https://apis.ankr.com/${process.env.ANKR_STRING}`
				// url: 'https://bsc-dataseed.binance.org/'
			},
			accounts: {
				mnemonic: process.env.ROPSTEN_HARDHAT_PHRASE
			},
		},
		ethereum: {
			url:`${process.env.ETHEREUM_NETWORK_ENDPOINT}${process.env.INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE
			},
			chainId: 1,
			gas: "auto",
			gasPrice: 32000000000,
			gasMultiplier: 1.2
		},
		// bsc: {
		// 	url: process.env.BSC_NETWORK_ENDPOINT,
		// 	accounts: {
		// 		mnemonic: process.env.BSC_MNEMONIC_PHRASE
		// 	},
		// 	chainId: 56,
		// 	gas: "auto",
		// 	gasPrice: 8000000000, // 8 Gwei
		// 	gasMultiplier: 1.2
		// },
		// fantom: {
		// 	url: process.env.FANTOM_NETWORK_ENDPOINT,
		// 	accounts: {
		// 		mnemonic: process.env.FANTOM_MNEMONIC_PHRASE
		// 	},
		// 	chainId: 250,
		// 	gas: "auto",
		// 	gasPrice: 80000000000, // XX Gwei
		// 	gasMultiplier: 1.2
		// },
		// harmony: {
		// 	url: process.env.HARMONY_NETWORK_ENDPOINT,
		// 	accounts: {
		// 		mnemonic: process.env.HARMONY_MNEMONIC_PHRASE
		// 	},
		// 	chainId: 1666600000,
		// 	gas: "auto",
		// 	gasPrice: 5000000000, // 5 Gwei
		// 	gasMultiplier: 1.2
		// },
		// polygon: {
		// 	url: `${process.env.POLYGON_NETWORK_ENDPOINT}${process.env.INFURA_PROJECT_ID}`,
		// 	accounts: {
		// 		mnemonic: process.env.POLYGON_MNEMONIC_PHRASE
		// 	},
		// 	chainId: 137,
		// 	gas: "auto",
		// 	gasPrice: 8000000000, // 8 Gwei
		// 	gasMultiplier: 1.2
		// },
		ropsten: {
			url:`https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE
			},
			chainId: 3,
			gas: "auto",     
			gasPrice: "auto", 
			gasMultiplier: 1.2
		},
		rinkeby: {
			url:`https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE
			},
			chainId: 4,
			gas: "auto",
			gasPrice: "auto",
			gasMultiplier: 1.2
		}
    },
	solidity: {
		compilers: [
			{
				version: "0.5.17",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.6.11",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.7.6",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.0",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.2",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.4",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			}
		],
	},
    paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts"
    },
    mocha: {
      timeout: 500000
	},
	etherscan: {
		apiKey: process.env.BSCSCAN_API_KEY // BSC
		// apiKey: process.env.ETHERSCAN_API_KEY, // ETH Mainnet
		// apiKey: process.env.FTMSCAN_API_KEY // Fantom
		// apiKey: process.env.POLYGONSCAN_API_KEY // Polygon
	},

	contractSizer: {
		alphaSort: true,
		runOnCompile: true,
		disambiguatePaths: false,
	},
    // vyper: {
	// 	version: "0.2.12"
    // }
};

