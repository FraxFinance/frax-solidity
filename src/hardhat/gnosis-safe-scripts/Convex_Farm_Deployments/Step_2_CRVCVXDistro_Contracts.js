const path = require("path");
const envPath = path.join(process.cwd(), "../../../.env");
require("dotenv").config({ path: envPath });
const { ethers } = require("hardhat");

const { BigNumber } = require("@ethersproject/bignumber");
const util = require("util");
const chalk = require("chalk");
const fse = require("fs-extra");
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
	// ============== GET THE DISTRO CONTRACT ADDRESSES ==============
	// ===============================================================
	const IConvexStakingWrapperFrax_json_path = path.join(__dirname, '../../artifacts/contracts/Misc_AMOs/convex/IConvexStakingWrapperFrax.sol/IConvexStakingWrapperFrax.json');
	const { abi: IConvexStakingWrapperFrax_ABI } = JSON.parse( await fse.readFileSync(IConvexStakingWrapperFrax_json_path, 'utf-8'));

	const distroAddrs = [];
	for (let i = 0; i < wrapperAddrs.length; i++) {
		const wrapper_contract = new ethers.Contract(wrapperAddrs[i], IConvexStakingWrapperFrax_ABI).connect(owner);
		distroAddrs.push(await wrapper_contract.distroContract());
	}



	// ===============================================================
	// =============== SET CRV TOKEN MANAGER TO DISTRO ===============
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
					  "internalType": "address",
					  "name": "new_manager_address",
					  "type": "address"
					}
				  ],
				"name": "changeTokenManager",
				"payable": false
			},
			"contractInputsValues": {
				"reward_token_address": ADDRS_ETH.reward_tokens.curve_dao,
				"new_manager_address": distroAddrs[i],
			}
		});
	}

	// ===============================================================
	// =================== SET CRV REWARD VARIABLES ==================
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
				"reward_token_address": ADDRS_ETH.reward_tokens.curve_dao,
				"_new_rate": "0",
				"_gauge_controller_address": "0x0000000000000000000000000000000000000000",
				"_rewards_distributor_address": distroAddrs[i],
			}
		});
	}
	

	// ===============================================================
	// =============== SET CVX TOKEN MANAGER TO DISTRO ===============
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
					  "internalType": "address",
					  "name": "new_manager_address",
					  "type": "address"
					}
				  ],
				"name": "changeTokenManager",
				"payable": false
			},
			"contractInputsValues": {
				"reward_token_address": ADDRS_ETH.reward_tokens.cvx,
				"new_manager_address": distroAddrs[i],
			}
		});
	}

	// ===============================================================
	// =================== SET CVX REWARD VARIABLES ==================
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
				"reward_token_address": ADDRS_ETH.reward_tokens.cvx,
				"_new_rate": "0",
				"_gauge_controller_address": "0x0000000000000000000000000000000000000000",
				"_rewards_distributor_address": distroAddrs[i],
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
		path.join(__dirname, 'Step_2_CRVCVXDistro_Contracts.json'),
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
