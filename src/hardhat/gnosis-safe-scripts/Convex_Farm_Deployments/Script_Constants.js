const path = require("path");
const envPath = path.join(process.cwd(), "../../../.env");
require("dotenv").config({ path: envPath });
const { ethers } = require("hardhat");

const { BigNumber } = require("@ethersproject/bignumber");
const util = require("util");
const chalk = require("chalk");
const fse = require("fs-extra");
const { BIG6, BIG18, stringifyReplacer, serializeJSONObject, calculateChecksum } = require("../utils/utils");
const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;
let ADDRS_ETH = CONTRACT_ADDRESSES.ethereum;
let ADDRS_ETH_LPS = ADDRS_ETH.pair_tokens;
let ADDRS_ETH_FARMS = ADDRS_ETH.staking_contracts;


const wrapperAddrs = [
	// ADDRS_ETH_LPS['Convex stkcvxCVGFRAXBP'],
	// ADDRS_ETH_LPS['Convex stkcvxDOLAFRAXPYUSD'],
	// ADDRS_ETH_LPS['Convex stkcvxFRAXFPI_NG'],
	// ADDRS_ETH_LPS['Convex stkcvxFRAXPYUSD'],
	// ADDRS_ETH_LPS['Convex stkcvxFRAXsDAI'],
	// ADDRS_ETH_LPS['Convex stkcvxFRAXFXB_20240630'],
	// ADDRS_ETH_LPS['Convex stkcvxFRAXFXB_20241231'],
	// ADDRS_ETH_LPS['Convex stkcvxFRAXFXB_20261231'],
	// ADDRS_ETH_LPS['Convex stkcvxfrxETHpxETH'],
	ADDRS_ETH_LPS['Convex stkcvxfrxETHzunETH'],
	// ADDRS_ETH_LPS['Convex stkcvxtricryptoFRAX'],
];

const farmAddrs = [
	// ADDRS_ETH_FARMS['Convex stkcvxCVGFRAXBP'],
	// ADDRS_ETH_FARMS['Convex stkcvxDOLAFRAXPYUSD'],
	// ADDRS_ETH_FARMS['Convex stkcvxFRAXFPI_NG'],
	// ADDRS_ETH_FARMS['Convex stkcvxFRAXPYUSD'],
	// ADDRS_ETH_FARMS['Convex stkcvxFRAXsDAI'],
	// ADDRS_ETH_FARMS['Convex stkcvxFRAXFXB_20240630'],
	// ADDRS_ETH_FARMS['Convex stkcvxFRAXFXB_20241231'],
	// ADDRS_ETH_FARMS['Convex stkcvxFRAXFXB_20261231'],
	// ADDRS_ETH_FARMS['Convex stkcvxfrxETHpxETH'],
	ADDRS_ETH_FARMS['Convex stkcvxfrxETHzunETH'],
	// ADDRS_ETH_FARMS['Convex stkcvxtricryptoFRAX'],
];


module.exports = { wrapperAddrs, farmAddrs };