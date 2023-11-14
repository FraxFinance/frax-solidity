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


const wrapperAddrs = [
	// ADDRS_ETH_LPS['Convex stkcvxtriSDT'],
	// ADDRS_ETH_LPS['Convex stkcvxmkUSDFRAXBP'],
	ADDRS_ETH_LPS['Convex stkcvxfrxETHpETH'],
	// ADDRS_ETH_LPS['Convex stkcvxfrxETHzETH'],
	// ADDRS_ETH_LPS['Convex stkcvxGRAIFRAXBP']
];

const farmAddrs = [
	// ADDRS_ETH_FARMS['Convex stkcvxtriSDT'],
	// ADDRS_ETH_FARMS['Convex stkcvxmkUSDFRAXBP'],
	ADDRS_ETH_FARMS['Convex stkcvxfrxETHpETH'],
	// ADDRS_ETH_FARMS['Convex stkcvxfrxETHzETH'],
	// ADDRS_ETH_FARMS['Convex stkcvxGRAIFRAXBP']
];


module.exports = { wrapperAddrs, farmAddrs };