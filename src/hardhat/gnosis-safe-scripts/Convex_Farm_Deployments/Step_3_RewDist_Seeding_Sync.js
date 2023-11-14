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
const { wrapperAddrs, farmAddrs } = require("./Script_Constants");
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

	// ===============================================================
	// =============== ADD GAUGES TO REWARD DISTRIBUTOR ==============
	// ===============================================================

	for (let i = 0; i < farmAddrs.length; i++) {
		batch_json.transactions.push({
			"to": ADDRS_ETH.misc.frax_gauge_rewards_distributor,
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "internalType": "address",
					  "name": "_gauge_address",
					  "type": "address"
					},
					{
					  "internalType": "bool",
					  "name": "_is_middleman",
					  "type": "bool"
					},
					{
					  "internalType": "bool",
					  "name": "_is_active",
					  "type": "bool"
					}
				  ],
				"name": "setGaugeState",
				"payable": false
			},
			"contractInputsValues": {
				"_gauge_address": farmAddrs[i],
				"_is_middleman": "false",
				"_is_active": "true",
			}
		});
	}


	// ===============================================================
	// ======================= FARM FXS SEEDING ======================
	// ===============================================================

	for (let i = 0; i < farmAddrs.length; i++) {
		batch_json.transactions.push({
			"to": ADDRS_ETH.main.FXS,
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "internalType": "address",
					  "name": "recipient",
					  "type": "address"
					},
					{
					  "internalType": "uint256",
					  "name": "amount",
					  "type": "uint256"
					}
				  ],
				"name": "transfer",
				"payable": false
			},
			"contractInputsValues": {
				"recipient": farmAddrs[i],
				"amount": "1000000000000000000",
			}
		});
	}


	// ===============================================================
	// ============================= SYNC ============================
	// ===============================================================

	for (let i = 0; i < farmAddrs.length; i++) {
		batch_json.transactions.push({
			"to": farmAddrs[i],
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [],
				"name": "sync",
				"payable": false
			},
			"contractInputsValues": {}
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
		path.join(__dirname, 'Step_3_RewDist_Seeding_Sync.json'),
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
