const path = require("path");
const envPath = path.join(process.cwd(), "../../../../../.env");
require("dotenv").config({ path: envPath });
const { ethers } = require("hardhat");

const { BigNumber } = require("@ethersproject/bignumber");
const util = require("util");
const chalk = require("chalk");
const fse = require("fs-extra");
const { formatUnits } = require("ethers/lib/utils");
const constants = require(path.join(__dirname, '../../../../../dist/types/constants'));

global.artifacts = artifacts;
global.web3 = web3;

const BIG6 = BigNumber.from(10).pow(6);
const BIG18 = BigNumber.from(10).pow(18);

const hre = require("hardhat");

const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
let CHAIN_ID = CONTRACT_ADDRESSES.bsc.chain_id.toString();
let MSIG_ADDRESS = CONTRACT_ADDRESSES.bsc.Comptrollers;

const batch_json = {
    "version": "1.0",
    "chainId": CHAIN_ID,
    "createdAt": 1685556909304,
    "meta": {
        "name": "Transactions Batch",
        "description": "",
        "txBuilderVersion": "1.14.1",
        "createdFromSafeAddress": MSIG_ADDRESS,
        "createdFromOwnerAddress": "",
        "checksum": "0x"
    },
    "transactions": [
    ]
}

async function main() {
	// Set up the provider for some future calls
	[owner, addr1, addr2] = await ethers.getSigners();


	console.log(`Using env file from ${envPath}`);
	const thisBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());


	// ===============================================================
	// ===================== REWARDS COLLECTION ======================
	// ===============================================================

	// THENA #1
	// =====================================
	batch_json.transactions.push({
		"to": "0xC6bE40f6a14D4C2F3AAdf9b02294b003e3967779",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "uint256",
					"name": "_tokenId",
					"type": "uint256"
				}
			],
			"name": "claim",
			"payable": false
		},
		"contractInputsValues": {
			"_tokenId": "16"
		}
	});

	// THENA #2
	// =====================================
	batch_json.transactions.push({
		"to": "0x3a007F34B10A8C7af73af7Bd6e4F833dadc5225D",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "uint256",
					"name": "tokenId",
					"type": "uint256"
				},
				{
					"internalType": "address[]",
					"name": "tokens",
					"type": "address[]"
				}
			],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": {
			"tokenId": "16",
			"tokens": "[\"0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE\"]"
		}
	});

	// THENA #3
	// =====================================
	batch_json.transactions.push({
		"to": "0x5c2c0E71FdaFF857A9E5eF20548D043bfCC72F1b",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "uint256",
					"name": "tokenId",
					"type": "uint256"
				},
				{
					"internalType": "address[]",
					"name": "tokens",
					"type": "address[]"
				}
			],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": {
			"tokenId": "16",
			"tokens": "[\"0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE\", \"0xdDC3D26BAA9D2d979F5E2e42515478bf18F354D5\"]"
		}
	});

	// THENA #4
	// =====================================
	batch_json.transactions.push({
		"to": "0x1E0d61C4072f8DeE0C6E1666Bc87d38EAEBe9332",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "uint256",
					"name": "tokenId",
					"type": "uint256"
				},
				{
					"internalType": "address[]",
					"name": "tokens",
					"type": "address[]"
				}
			],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": {
			"tokenId": "16",
			"tokens": "[\"0x2F29Bc0FFAF9bff337b31CBe6CB5Fb3bf12e5840\", \"0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE\"]"
		}
	});


	// ===============================================================
	// ======================= CREATE THE JSON =======================
	// ===============================================================

	// Insert the checksum and the timestamp
	batch_json.createdAt = thisBlock.timestamp * 1000;
	batch_json.meta.checksum = calculateChecksum(batch_json);

	// console.log(JSON.stringify(batch_json));
	fse.writeFileSync(
		path.join(__dirname, 'BSC_Rewards_Collection.json'),
		JSON.stringify(batch_json),
		"utf8"
	);

}

const stringifyReplacer = (_, value) => (value === undefined ? null : value)

const serializeJSONObject = (json) => {
  if (Array.isArray(json)) {
    return `[${json.map((el) => serializeJSONObject(el)).join(',')}]`
  }

  if (typeof json === 'object' && json !== null) {
    let acc = ''
    const keys = Object.keys(json).sort()
    acc += `{${JSON.stringify(keys, stringifyReplacer)}`

    for (let i = 0; i < keys.length; i++) {
      acc += `${serializeJSONObject(json[keys[i]])},`
    }

    return `${acc}}`
  }

  return `${JSON.stringify(json, stringifyReplacer)}`
}

const calculateChecksum = (batchFile) => {
  const serialized = serializeJSONObject({
    ...batchFile,
    meta: { ...batchFile.meta, name: null },
  })
  const sha = web3.utils.sha3(serialized)

  return sha || undefined
}


// From https://docs.convexfinance.com/convexfinanceintegration/cvx-minting
const GetCVXMintAmount = ( crvEarned, cvxTotalSupply ) => {
	// Constants
	let cliffSize = BigNumber.from("1000000000000000000").mul(100000); // New cliff every 100000 tokens
	let cliffCount = BigNumber.from("1000"); // 1,000 cliffs
	let maxSupply = BigNumber.from("1000000000000000000").mul(100000000); // 100 mil max supply
    
    // Get current cliff
    let currentCliff = cvxTotalSupply.div(cliffSize);
    
    // If current cliff is under the max
    if(currentCliff.lt(cliffCount)){
        // Get remaining cliffs
        let remaining = cliffCount.sub(currentCliff);
        
        // Multiply ratio of remaining cliffs to total cliffs against amount CRV received
        var cvxEarned = (crvEarned.mul(remaining)).div(cliffCount);
    
        // Double check we have not gone over the max supply
        var amountTillMax = maxSupply.sub(cvxTotalSupply);
        if(cvxEarned.gt(amountTillMax)){
            cvxEarned = amountTillMax;
        }
        return cvxEarned;
    }
    return BigNumber.from(0);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
