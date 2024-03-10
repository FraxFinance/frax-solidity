const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

require('hardhat-deploy');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require("hardhat-tracer");
// require("@matterlabs/hardhat-zksync-deploy");
// require("@matterlabs/hardhat-zksync-solc");
// require("@nomicfoundation/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-vyper");
require('hardhat-spdx-license-identifier');


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
			// chainId: 1337, // Ethereum (alternate / frontend testing)
			forking: {
				// url: `${process.env.ARBITRUM_NETWORK_ENDPOINT}`, // Arbitrum
				// url: `${process.env.AURORA_NETWORK_ENDPOINT}`, // Aurora
				// url: `${process.env.AVALANCHE_FORKING_NETWORK_ENDPOINT}`, // Avalanche
				// url: `${process.env.BOBA_NETWORK_ENDPOINT}`, // Boba
				// url: `${process.env.BSC_NETWORK_ENDPOINT}`, // BSC
				// url: `${process.env.ETHEREUM_NETWORK_ENDPOINT}`, // Ethereum
				// url: `${process.env.EVMOS_NETWORK_ENDPOINT}`, // Evmos
				// url: `${process.env.FANTOM_FORKING_NETWORK_ENDPOINT}`, // Fantom
				url: `${process.env.FRAXTAL_NETWORK_ENDPOINT}`, // Fraxtal
				// url: `${process.env.FUSE_NETWORK_ENDPOINT}`, // Fuse
				// url: `${process.env.HARMONY_NETWORK_ENDPOINT}`, // Harmony
				// url: `${process.env.MOONBEAM_NETWORK_ENDPOINT}`, // Moonbeam
				// url: `${process.env.MOONRIVER_NETWORK_ENDPOINT}`, // Moonriver
				// url: `${process.env.OPTIMISM_NETWORK_ENDPOINT}`, // Optimism
				// url: `${process.env.POLYGON_NETWORK_ENDPOINT}`, // Polygon
				// url: `${process.env.ZKSYNC_NETWORK_ENDPOINT}`, // zkSync
				// zksync: true

				// TESTING (npx hardhat node --hostname 0.0.0.0)
				// Also see src/hardhat/justin-scripts/instructions.txt
				// url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`, // Ethereum (alternate)

				// Pin the block to allow caching
				// blockNumber: 167152063 // ARBITRUM
				// blockNumber: 18936285 // ETHEREUM
				
			},
			accounts: {
				mnemonic: process.env.ROPSTEN_HARDHAT_PHRASE
			},
			// hardfork: 'shanghai'
		},
		arbitrum: {
			url: process.env.ARBITRUM_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.ARBITRUM_MNEMONIC_PHRASE
			},
			chainId: 42161,
			gas: "auto",
			gasPrice: 170000000, // 0.17 Gwei
			gasMultiplier: 1.2
		},
		aurora: {
			url: process.env.AURORA_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.AURORA_MNEMONIC_PHRASE
			},
			chainId: 1313161554,
			gas: "auto",
			gasPrice: 3500000000, // 3.5 Gwei
			gasMultiplier: 1.2
		},
		avalanche: {
			url: process.env.AVALANCHE_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.AVALANCHE_MNEMONIC_PHRASE
			},
			chainId: 43114,
			gas: "auto",
			gasPrice: 75000000000, // 75 Gwei
			gasMultiplier: 1.2
		},
		boba: {
			url: process.env.BOBA_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.BOBA_MNEMONIC_PHRASE
			},
			chainId: 288,
			gas: "auto",
			gasPrice: 80000000000, // 80 Gwei
			gasMultiplier: 1.2
		},
		bsc: {
			url: process.env.BSC_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.BSC_MNEMONIC_PHRASE
			},
			chainId: 56,
			gas: "auto",
			gasPrice: 6000000000, // 6 Gwei
			gasMultiplier: 1.2
		},
		ethereum: {
			url:`${process.env.ETHEREUM_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE,
			},
			chainId: 1,
			gas: "auto",
			gasPrice: 40000000000, // 40 Gwei
			gasMultiplier: 1.2,
		},
		evmos: {
			url: process.env.EVMOS_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.EVMOS_MNEMONIC_PHRASE
			},
			chainId: 9001,
			gas: "auto",
			gasPrice: 10000000000, // 10 Gwei
			gasMultiplier: 1.2
		},
		fantom: {
			url: process.env.FANTOM_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.FANTOM_MNEMONIC_PHRASE
			},
			chainId: 250,
			gas: "auto",
			gasPrice: 750000000000, // 750 Gwei
			gasMultiplier: 1.2
		},
		fraxchain_devnet_l1: {
			url:`${process.env.FRAXCHAIN_DEVNET_L1_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE,
			},
			httpHeaders: {
				"Cookie": `${process.env.FRAXCHAIN_DEVNET_COOKIE}`
			},
			chainId: 2520,
			gas: "auto",
			gasPrice: 2000000000, // 2 Gwei
			gasMultiplier: 1.2,
		},
		fraxchain_devnet_l2: {
			url:`${process.env.FRAXCHAIN_DEVNET_L2_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE,
			},
			httpHeaders: {
				"Cookie": `${process.env.FRAXCHAIN_DEVNET_COOKIE}`
			},
			chainId: 2521,
			gas: "auto",
			gasPrice: 2000000000, // 2 Gwei
			gasMultiplier: 1.2,
		},
		fraxtal: {
			url:`${process.env.FRAXTAL_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.MNEMONIC_PHRASE,
			},
			// httpHeaders: {
			// 	"Cookie": `${process.env.FRAXCHAIN_DEVNET_COOKIE}`
			// },
			chainId: 252,
			gas: "auto",
			gasPrice: 2500000, // 0.0025 Gwei
			gasMultiplier: 1.2,
		},
		// fuse: {
		// 	url: process.env.FUSE_NETWORK_ENDPOINT,
		// 	accounts: {
		// 		mnemonic: process.env.FUSE_MNEMONIC_PHRASE
		// 	},
		// 	chainId: 122,
		// 	gas: "auto",
		// 	gasPrice: 5000000000, // 5 Gwei
		// 	gasMultiplier: 1.2
		// },
		harmony: {
			url: process.env.HARMONY_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.HARMONY_MNEMONIC_PHRASE
			},
			chainId: 1666600000,
			gas: "auto",
			gasPrice: 50000000000, // 50 Gwei
			gasMultiplier: 1.2
		},
		holesky: {
			url: process.env.HOLESKY_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.HOLESKY_MNEMONIC_PHRASE
			},
			chainId: 17000,
			gas: "auto",
			gasPrice: 10000000000, // 10 Gwei
			gasMultiplier: 1.2
		},
		moonbeam: {
			url: process.env.MOONBEAM_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.MOONBEAM_MNEMONIC_PHRASE
			},
			chainId: 1284,
			gas: "auto",
			gasPrice: 150000000000, // 150 Gwei
			gasMultiplier: 1.2
		},
		moonriver: {
			url: process.env.MOONRIVER_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.MOONRIVER_MNEMONIC_PHRASE
			},
			chainId: 1285,
			gas: "auto",
			gasPrice: 3000000000, // 3 Gwei
			gasMultiplier: 1.2
		},
		optimism: {
			url: process.env.OPTIMISM_NETWORK_ENDPOINT,
			accounts: {
				mnemonic: process.env.OPTIMISM_MNEMONIC_PHRASE
			},
			chainId: 10,
			gas: "auto",
			gasPrice: 25000000, // 0.025 Gwei
			gasMultiplier: 1.2
		},
		polygon: {
			url: `${process.env.POLYGON_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.POLYGON_MNEMONIC_PHRASE
			},
			chainId: 137,
			gas: "auto",
			gasPrice: 50000000000, // 50 Gwei
			gasMultiplier: 1.2
		},
		polygon_zkevm: {
			url: `${process.env.POLYGON_ZKEVM_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.POLYGON_ZKEVM_MNEMONIC_PHRASE
			},
			chainId: 1101,
			gas: "auto",
			gasPrice: 10000000000, // 10 Gwei
			gasMultiplier: 1.2
		},
		polygon_mumbai: {
			url: `${process.env.POLYGON_MUMBAI_NETWORK_ENDPOINT}`,
			accounts: {
				mnemonic: process.env.ROPSTEN_HARDHAT_PHRASE
			},
			chainId: 80001,
			gas: "auto",
			gasPrice: 4000000000, // 4 Gwei
			gasMultiplier: 1.2
		},
		ropsten: {
			url:`https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
			accounts: {
				mnemonic: process.env.ROPSTEN_HARDHAT_PHRASE
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
		},
		// zksync: {
		// 	url: process.env.ZKSYNC_NETWORK_ENDPOINT,
		// 	accounts: {
		// 		mnemonic: process.env.ZKSYNC_MNEMONIC_PHRASE
		// 	},
		// 	chainId: 324,
		// 	gas: "auto",
		// 	gasPrice: "auto",
		// 	// gasPrice: 3000000000, // 3 Gwei
		// 	gasMultiplier: 1.2,
		// 	zksync: true
		// },
    },
	solidity: {
		compilers: [
			{
				version: "0.5.17",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					},
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
				version: "0.6.12",
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
			// {
			// 	version: "0.8.0",
			// 	settings: {
			// 		optimizer: {
			// 			enabled: true,
			// 			runs: 100000
			// 		}
			// 	  }
			// },
			// {
			// 	version: "0.8.2",
			// 	settings: {
			// 		optimizer: {
			// 			enabled: true,
			// 			runs: 100000
			// 		}
			// 	  }
			// },
			{
				version: "0.8.4",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.6",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.10",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.13",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.15",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.16",
				settings: {
					optimizer: {
						enabled: true,
						runs: 100000
					}
				  }
			},
			{
				version: "0.8.15",
				settings: {
					// viaIR: true,
					// optimizer: {
					// 	enabled: true,
					// 	runs: 200000,
					// 	details: {
					// 		orderLiterals: true,
					// 		deduplicate: true,
					// 		cse: true,
					// 		constantOptimizer: true,
					// 		yul: true,
					// 		yulDetails: {
					// 			stackAllocation: true
					// 		}
					// 	},
					// }
					optimizer: {
						enabled: true,
						runs: 100000
					}
				}
			},
			{
				version: "0.8.19",
				settings: {
					// viaIR: true,
					// optimizer: {
					// 	enabled: true,
					// 	runs: 200000,
					// 	details: {
					// 		orderLiterals: true,
					// 		deduplicate: true,
					// 		cse: true,
					// 		constantOptimizer: true,
					// 		yul: true,
					// 		yulDetails: {
					// 			stackAllocation: true
					// 		}
					// 	},
					// }
					optimizer: {
						enabled: true,
						runs: 100000
					}
				}
			},
			{
				version: "0.8.23",
				settings: {
					// viaIR: true,
					// optimizer: {
					// 	enabled: true,
					// 	runs: 200000,
					// 	details: {
					// 		orderLiterals: true,
					// 		deduplicate: true,
					// 		cse: true,
					// 		constantOptimizer: true,
					// 		yul: true,
					// 		yulDetails: {
					// 			stackAllocation: true
					// 		}
					// 	},
					// }
					optimizer: {
						enabled: true,
						runs: 100000
					}
				}
			},
		],
	},
	zksolc: {
		version: "1.3.9",
		compilerSource: "binary",
		settings: {
			// forceEvmla: true // optional. Falls back to EVM legacy assembly if there is a bug with Yul
		}
	},
    paths: {
      sources: "./contracts",
      tests: "./test",
      cache: "./cache",
      artifacts: "./artifacts"
    },
    mocha: {
      timeout: 50000000
	},
	etherscan: {
		apiKey: {
			bsc: process.env.BSCSCAN_API_KEY,
			mainnet: process.env.ETHERSCAN_API_KEY,
			// fantom: process.env.FTMSCAN_API_KEY,
			fraxtal: process.env.FRAXTAL_API_KEY,
			// optimisticEthereum: process.env.OPTIMISM_API_KEY,
			polygon: process.env.POLYGONSCAN_API_KEY,
		},
		customChains: [
			{
			  network: "fraxtal",
			  chainId: 252,
			  urls: {
				apiURL: "https://api.fraxscan.com",
				browserURL: "https://fraxscan.com"
			  }
			}
		  ]

		
	},
	gasReporter: {
		currency: 'USD',
		gasPrice: 80,
		enabled: true,
		maxMethodDiff: 10,
	},
	contractSizer: {
		alphaSort: true,
		runOnCompile: true,
		disambiguatePaths: false,
	},
    vyper: {
		// version: "0.2.15"
		// version: "0.2.16"
		version: "0.3.7"
    }
};

