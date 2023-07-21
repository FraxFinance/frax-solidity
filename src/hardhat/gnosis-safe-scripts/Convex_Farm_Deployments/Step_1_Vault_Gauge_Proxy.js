const path = require("path");
const envPath = path.join(process.cwd(), "../../../.env");
require("dotenv").config({ path: envPath });
const { ethers } = require("hardhat");

const { BigNumber } = require("@ethersproject/bignumber");
const util = require("util");
const chalk = require("chalk");
const fse = require("fs-extra");
const { formatUnits } = require("ethers/lib/utils");
const { BIG6, BIG18, stringifyReplacer, serializeJSONObject, calculateChecksum } = require("../utils/utils");
const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
let ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
let ADDRS_ETH_LPS = ADDRS_ETH.pair_tokens;
let ADDRS_ETH_FARMS = ADDRS_ETH.staking_contracts;

global.artifacts = artifacts;
global.web3 = web3;


const hre = require("hardhat");

const batch_json = {
    "version": "1.0",
    "chainId": "1",
    "createdAt": 1685556909304,
    "meta": {
        "name": "Transactions Batch",
        "description": "",
        "txBuilderVersion": "1.14.1",
        "createdFromSafeAddress": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
        "createdFromOwnerAddress": "",
        "checksum": "0x"
    },
    "transactions": [
    ]
}

async function main() {
	// Set up the provider for some future informational calls
	[owner, addr1, addr2] = await ethers.getSigners();

	console.log(`Using env file from ${envPath}`);
	const thisBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

	const wrapperAddrs = [
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHCRV_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHCVX_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHalETH_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHankrETH_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHcbETH_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHrETH_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHsETH_New'],
		// ADDRS_ETH_LPS['Convex stkcvxfrxETHstETH_New']
		ADDRS_ETH_LPS['Convex stkcvxZUSDFRAXBP']
	];

	const farmAddrs = [
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHCRV_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHCVX_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHalETH_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHankrETH_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHcbETH_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHrETH_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHsETH_New'],
		// ADDRS_ETH_FARMS['Convex stkcvxfrxETHstETH_New']
		ADDRS_ETH_FARMS['Convex stkcvxZUSDFRAXBP']
	];


	// ===============================================================
	// ==================== SET VAULTS ON WRAPPERS ===================
	// ===============================================================
	// This will generate the distro contracts to be used in step 2

	for (let i = 0; i < wrapperAddrs.length; i++) {
		batch_json.transactions.push({
			"to": wrapperAddrs[i],
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "internalType": "address",
					  "name": "_vault",
					  "type": "address"
					}
				  ],
				"name": "setVault",
				"payable": false
			},
			"contractInputsValues": {
				"_vault": farmAddrs[i],
			}
		});
	}


	// ===============================================================
	// ================ ADD GAUGES TO GAUGE CONTROLLER ===============
	// ===============================================================

	for (let i = 0; i < farmAddrs.length; i++) {
		batch_json.transactions.push({
			"to": ADDRS_ETH.misc.frax_gauge_controller_v2,
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "name": "addr",
					  "type": "address"
					},
					{
					  "name": "gauge_type",
					  "type": "int128"
					},
					{
					  "name": "weight",
					  "type": "uint256"
					}
				],
				"name": "add_gauge",
				"payable": false
			},
			"contractInputsValues": {
				"addr": farmAddrs[i],
				"gauge_type": "0",
				"weight": "1000",
			}
		});
	}


	

	// ===============================================================
	// ============ SET FXS GAUGE AND REWARD DIST ON FARM ============
	// ===============================================================

	for (let i = 0; i < farmAddrs.length; i++) {
		batch_json.transactions.push({
			"to": farmAddrs[i],
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "internalType": "address",
					  "name": "reward_token_address",
					  "type": "address"
					},
					{
					  "internalType": "uint256",
					  "name": "_new_rate",
					  "type": "uint256"
					},
					{
					  "internalType": "address",
					  "name": "_gauge_controller_address",
					  "type": "address"
					},
					{
					  "internalType": "address",
					  "name": "_rewards_distributor_address",
					  "type": "address"
					}
				  ],
				"name": "setRewardVars",
				"payable": false
			},
			"contractInputsValues": {
				"reward_token_address": ADDRS_ETH.main.FXS,
				"_new_rate": "0",
				"_gauge_controller_address": ADDRS_ETH.misc.frax_gauge_controller_v2,
				"_rewards_distributor_address": ADDRS_ETH.misc.frax_gauge_rewards_distributor,
			}
		});
	}

	// ===============================================================
	// ============== SET CONVEX AS ALLOWED VEFXS PROXY ==============
	// ===============================================================

	for (let i = 0; i < farmAddrs.length; i++) {
		batch_json.transactions.push({
			"to": farmAddrs[i],
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "internalType": "address",
					  "name": "_proxy_addr",
					  "type": "address"
					}
				  ],
				"name": "toggleValidVeFXSProxy",
				"payable": false
			},
			"contractInputsValues": {
				"_proxy_addr": "0x59CFCD384746ec3035299D90782Be065e466800B",
			}
		});
	}
	

	// ===============================================================
	// ======================= CREATE THE JSON =======================
	// ===============================================================

	// Insert the checksum and the timestamp
	batch_json.createdAt = thisBlock.timestamp * 1000;
	batch_json.meta.checksum = calculateChecksum(batch_json);

	// console.log(JSON.stringify(batch_json));
	fse.writeFileSync(
		path.join(__dirname, 'Step_1_Vault_Gauge_Proxy.json'),
		JSON.stringify(batch_json),
		"utf8"
	);

}


main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
