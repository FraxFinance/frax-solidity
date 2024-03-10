const path = require("path");
const envPath = path.join(process.cwd(), "../../../.env");
require("dotenv").config({ path: envPath });
const { ethers } = require("hardhat");

const util = require("util");
const chalk = require("chalk");
const fse = require("fs-extra");
const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
let ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
let ADDRS_ETH_LPS = ADDRS_ETH.pair_tokens;
let ADDRS_ETH_FARMS = ADDRS_ETH.staking_contracts;

global.artifacts = artifacts;
global.web3 = web3;

const BIG6 = BigInt("1000000");
const BIG18 = BigInt("1000000000000000000");

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
	let cliffSize = BigInt("1000000000000000000") *  BigInt("100000"); // New cliff every 100000 tokens
	let cliffCount = BigInt("1000"); // 1,000 cliffs
	let maxSupply = BigInt("1000000000000000000") *  BigInt("100000000"); // 100 mil max supply
    
    // Get current cliff
    let currentCliff = cvxTotalSupply / cliffSize;
    
    // If current cliff is under the max
    if(currentCliff < cliffCount){
        // Get remaining cliffs
        let remaining = cliffCount - currentCliff;
        
        // Multiply ratio of remaining cliffs to total cliffs against amount CRV received
        var cvxEarned = (crvEarned * remaining) / (cliffCount);
    
        // Double check we have not gone over the max supply
        var amountTillMax = maxSupply - cvxTotalSupply;
        if(cvxEarned > amountTillMax){
            cvxEarned = amountTillMax;
        }
        return cvxEarned;
    }
    return BigInt(0);
}

module.exports = {
    BIG6, BIG18, stringifyReplacer, serializeJSONObject, calculateChecksum, GetCVXMintAmount
};