const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../../../.env');
const { Chain, Common, Hardfork } = require('@ethereumjs/common');
const { LegacyTransaction, FeeMarketEIP1559Transaction } = require('@ethereumjs/tx');
const { hexToBytes, bytesToHex } = require('@ethereumjs/util');
require('dotenv').config({ path: envPath });
const constants = require(path.join(__dirname, '../../../dist/types/constants'));
const toHex = require('to-hex');
const chalk = require('chalk');
const { sleep } = require('../../../dist/misc/utilities');

const { Provider } = require('@ethersproject/abstract-provider');
const { Signer } = require('@ethersproject/abstract-signer');
const { BigNumber } = require('@ethersproject/bignumber');
const { hexZeroPad, hexStripZeros } = require('@ethersproject/bytes');
const { Contract } = require('@ethersproject/contracts');
const { JsonRpcProvider } = require('@ethersproject/providers');
const { encode } = require('@ethersproject/rlp');
const { keccak256 } = require('@ethersproject/solidity');
const { Wallet } = require('@ethersproject/wallet');

const VEFXS_ABI = [{"name":"CommitOwnership","inputs":[{"type":"address","name":"admin","indexed":false}],"anonymous":false,"type":"event"},{"name":"ApplyOwnership","inputs":[{"type":"address","name":"admin","indexed":false}],"anonymous":false,"type":"event"},{"name":"Deposit","inputs":[{"type":"address","name":"provider","indexed":true},{"type":"uint256","name":"value","indexed":false},{"type":"uint256","name":"locktime","indexed":true},{"type":"int128","name":"type","indexed":false},{"type":"uint256","name":"ts","indexed":false}],"anonymous":false,"type":"event"},{"name":"Withdraw","inputs":[{"type":"address","name":"provider","indexed":true},{"type":"uint256","name":"value","indexed":false},{"type":"uint256","name":"ts","indexed":false}],"anonymous":false,"type":"event"},{"name":"Supply","inputs":[{"type":"uint256","name":"prevSupply","indexed":false},{"type":"uint256","name":"supply","indexed":false}],"anonymous":false,"type":"event"},{"outputs":[],"inputs":[{"type":"address","name":"token_addr"},{"type":"string","name":"_name"},{"type":"string","name":"_symbol"},{"type":"string","name":"_version"}],"stateMutability":"nonpayable","type":"constructor"},{"name":"commit_transfer_ownership","outputs":[],"inputs":[{"type":"address","name":"addr"}],"stateMutability":"nonpayable","type":"function","gas":37568},{"name":"apply_transfer_ownership","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":38407},{"name":"commit_smart_wallet_checker","outputs":[],"inputs":[{"type":"address","name":"addr"}],"stateMutability":"nonpayable","type":"function","gas":36278},{"name":"apply_smart_wallet_checker","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":37005},{"name":"toggleEmergencyUnlock","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":37038},{"name":"recoverERC20","outputs":[],"inputs":[{"type":"address","name":"token_addr"},{"type":"uint256","name":"amount"}],"stateMutability":"nonpayable","type":"function","gas":4045},{"name":"get_last_user_slope","outputs":[{"type":"int128","name":""}],"inputs":[{"type":"address","name":"addr"}],"stateMutability":"view","type":"function","gas":2600},{"name":"user_point_history__ts","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"address","name":"_addr"},{"type":"uint256","name":"_idx"}],"stateMutability":"view","type":"function","gas":1703},{"name":"locked__end","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"address","name":"_addr"}],"stateMutability":"view","type":"function","gas":1624},{"name":"checkpoint","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":46119699},{"name":"deposit_for","outputs":[],"inputs":[{"type":"address","name":"_addr"},{"type":"uint256","name":"_value"}],"stateMutability":"nonpayable","type":"function","gas":92414024},{"name":"create_lock","outputs":[],"inputs":[{"type":"uint256","name":"_value"},{"type":"uint256","name":"_unlock_time"}],"stateMutability":"nonpayable","type":"function","gas":92415425},{"name":"increase_amount","outputs":[],"inputs":[{"type":"uint256","name":"_value"}],"stateMutability":"nonpayable","type":"function","gas":92414846},{"name":"increase_unlock_time","outputs":[],"inputs":[{"type":"uint256","name":"_unlock_time"}],"stateMutability":"nonpayable","type":"function","gas":92415493},{"name":"withdraw","outputs":[],"inputs":[],"stateMutability":"nonpayable","type":"function","gas":46291332},{"name":"balanceOf","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"address","name":"addr"}],"stateMutability":"view","type":"function"},{"name":"balanceOf","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"address","name":"addr"},{"type":"uint256","name":"_t"}],"stateMutability":"view","type":"function"},{"name":"balanceOfAt","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"address","name":"addr"},{"type":"uint256","name":"_block"}],"stateMutability":"view","type":"function","gas":512868},{"name":"totalSupply","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function"},{"name":"totalSupply","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"t"}],"stateMutability":"view","type":"function"},{"name":"totalSupplyAt","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"_block"}],"stateMutability":"view","type":"function","gas":882020},{"name":"totalFXSSupply","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2116},{"name":"totalFXSSupplyAt","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"_block"}],"stateMutability":"view","type":"function","gas":252170},{"name":"changeController","outputs":[],"inputs":[{"type":"address","name":"_newController"}],"stateMutability":"nonpayable","type":"function","gas":36998},{"name":"token","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1871},{"name":"supply","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1901},{"name":"locked","outputs":[{"type":"int128","name":"amount"},{"type":"uint256","name":"end"}],"inputs":[{"type":"address","name":"arg0"}],"stateMutability":"view","type":"function","gas":3380},{"name":"epoch","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1961},{"name":"point_history","outputs":[{"type":"int128","name":"bias"},{"type":"int128","name":"slope"},{"type":"uint256","name":"ts"},{"type":"uint256","name":"blk"},{"type":"uint256","name":"fxs_amt"}],"inputs":[{"type":"uint256","name":"arg0"}],"stateMutability":"view","type":"function","gas":6280},{"name":"user_point_history","outputs":[{"type":"int128","name":"bias"},{"type":"int128","name":"slope"},{"type":"uint256","name":"ts"},{"type":"uint256","name":"blk"},{"type":"uint256","name":"fxs_amt"}],"inputs":[{"type":"address","name":"arg0"},{"type":"uint256","name":"arg1"}],"stateMutability":"view","type":"function","gas":6525},{"name":"user_point_epoch","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"address","name":"arg0"}],"stateMutability":"view","type":"function","gas":2266},{"name":"slope_changes","outputs":[{"type":"int128","name":""}],"inputs":[{"type":"uint256","name":"arg0"}],"stateMutability":"view","type":"function","gas":2196},{"name":"controller","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2111},{"name":"transfersEnabled","outputs":[{"type":"bool","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2141},{"name":"emergencyUnlockActive","outputs":[{"type":"bool","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2171},{"name":"name","outputs":[{"type":"string","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":8603},{"name":"symbol","outputs":[{"type":"string","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":7656},{"name":"version","outputs":[{"type":"string","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":7686},{"name":"decimals","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2291},{"name":"future_smart_wallet_checker","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2321},{"name":"smart_wallet_checker","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2351},{"name":"admin","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2381},{"name":"future_admin","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2411}];
const L1VEFXS_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"InvalidInitialization","type":"error"},{"inputs":[],"name":"NotInitializing","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"UnequalLengths","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint64","name":"version","type":"uint64"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"addr","type":"address"},{"indexed":false,"internalType":"uint128","name":"amount","type":"uint128"},{"indexed":false,"internalType":"uint64","name":"end","type":"uint64"},{"indexed":false,"internalType":"uint64","name":"blockTimestamp","type":"uint64"}],"name":"veFXSUpdated","type":"event"},{"inputs":[],"name":"LOCKED_SLOT_INDEX","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acceptOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_addresses","type":"address[]"},{"components":[{"internalType":"uint128","name":"amount","type":"uint128"},{"internalType":"uint64","name":"end","type":"uint64"},{"internalType":"uint64","name":"blockTimestamp","type":"uint64"}],"internalType":"struct L1VeFXS.LockedBalance[]","name":"_lockedBalances","type":"tuple[]"}],"name":"adminProofVeFXS","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_address","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"_balance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_stateRootOracle","type":"address"},{"internalType":"address","name":"_owner","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"locked","outputs":[{"components":[{"internalType":"uint128","name":"amount","type":"uint128"},{"internalType":"uint64","name":"end","type":"uint64"},{"internalType":"uint64","name":"blockTimestamp","type":"uint64"}],"internalType":"struct L1VeFXS.LockedBalance","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pendingOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_address","type":"address"},{"internalType":"uint256","name":"_blockNumber","type":"uint256"},{"internalType":"bytes[]","name":"_accountProof","type":"bytes[]"},{"internalType":"bytes[]","name":"_storageProof1","type":"bytes[]"},{"internalType":"bytes[]","name":"_storageProof2","type":"bytes[]"}],"name":"proofVeFXS","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"veFXSAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];
const FRAXCHAIN_L1_BLOCK_ABI = [{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"blockHash","type":"bytes32"}],"name":"BlockHashReceived","type":"event"},{"inputs":[],"name":"DEPOSITOR_ACCOUNT","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseFeeScalar","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"basefee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"batcherHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"blobBaseFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"blobBaseFeeScalar","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_blockHash","type":"bytes32"}],"name":"blockHashStored","outputs":[{"internalType":"bool","name":"_result","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"hash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l1FeeOverhead","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l1FeeScalar","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"number","outputs":[{"internalType":"uint64","name":"","type":"uint64"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"sequenceNumber","outputs":[{"internalType":"uint64","name":"","type":"uint64"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint64","name":"_number","type":"uint64"},{"internalType":"uint64","name":"_timestamp","type":"uint64"},{"internalType":"uint256","name":"_basefee","type":"uint256"},{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"uint64","name":"_sequenceNumber","type":"uint64"},{"internalType":"bytes32","name":"_batcherHash","type":"bytes32"},{"internalType":"uint256","name":"_l1FeeOverhead","type":"uint256"},{"internalType":"uint256","name":"_l1FeeScalar","type":"uint256"}],"name":"setL1BlockValues","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"setL1BlockValuesEcotone","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"storedBlockHashes","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"timestamp","outputs":[{"internalType":"uint64","name":"","type":"uint64"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}];
const STATE_ROOT_ORACLE_ABI = [{"inputs":[{"internalType":"contract IBlockHashProvider[]","name":"_providers","type":"address[]"},{"internalType":"uint256","name":"_minimumRequiredProviders","type":"uint256"},{"internalType":"address","name":"_timelockAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"MinimumRequiredProvidersTooLow","type":"error"},{"inputs":[],"name":"NotEnoughProviders","type":"error"},{"inputs":[],"name":"OnlyPendingTimelock","type":"error"},{"inputs":[],"name":"OnlyTimelock","type":"error"},{"inputs":[],"name":"ProviderAlreadyAdded","type":"error"},{"inputs":[],"name":"ProviderNotFound","type":"error"},{"inputs":[],"name":"SameMinimumRequiredProviders","type":"error"},{"inputs":[{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"name":"StateRootAlreadyProvenForBlockNumber","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint40","name":"blockNumber","type":"uint40"},{"indexed":false,"internalType":"uint40","name":"timestamp","type":"uint40"},{"indexed":false,"internalType":"bytes32","name":"stateRootHash","type":"bytes32"}],"name":"BlockVerified","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"provider","type":"address"}],"name":"ProviderAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"provider","type":"address"}],"name":"ProviderRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldMinimumRequiredProviders","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newMinimumRequiredProviders","type":"uint256"}],"name":"SetMinimumRequiredProviders","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousTimelock","type":"address"},{"indexed":true,"internalType":"address","name":"newTimelock","type":"address"}],"name":"TimelockTransferStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousTimelock","type":"address"},{"indexed":true,"internalType":"address","name":"newTimelock","type":"address"}],"name":"TimelockTransferred","type":"event"},{"inputs":[],"name":"acceptTransferTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IBlockHashProvider","name":"_provider","type":"address"}],"name":"addProvider","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"blockHashProviders","outputs":[{"internalType":"contract IBlockHashProvider","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"name":"blockNumberToBlockInfo","outputs":[{"internalType":"bytes32","name":"stateRootHash","type":"bytes32"},{"internalType":"uint40","name":"timestamp","type":"uint40"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBlockHashProvidersCount","outputs":[{"internalType":"uint256","name":"_providersCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_blockNumber","type":"uint256"}],"name":"getBlockInfo","outputs":[{"components":[{"internalType":"bytes32","name":"stateRootHash","type":"bytes32"},{"internalType":"uint40","name":"timestamp","type":"uint40"}],"internalType":"struct IStateRootOracle.BlockInfo","name":"_blockInfo","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minimumRequiredProviders","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pendingTimelockAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"_blockHeader","type":"bytes"}],"name":"proveStateRoot","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IBlockHashProvider","name":"_provider","type":"address"}],"name":"removeProvider","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_minimumRequiredProviders","type":"uint256"}],"name":"setMinimumRequiredProviders","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"timelockAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newTimelock","type":"address"}],"name":"transferTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

// MANUALLY SET THESE
// LIST OF ALL veFXS holders: https://api.frax.finance/v2/vefxs/users
const MANUAL_ADDRESS_LIST = [
	"0x5180db0237291A6449DdA9ed33aD90a38787621c",
	// "0x00ea95c08064a987f96e2632b78951e5dd0bc0e3",
	// "0x02654d401cea4c544418aca90a631079756904ed",
	// "0x10c16c7b8b1ddcfe65990ec822de4379dd8a86de",
	// "0x11443ad12aef3663a8cd767e6f9508fc799c4b18",
	// "0x13fe84d36d7a507bb4bdac6dcaf13a10961fc470",
	// "0x14b1b3ff91525dd00e8fb8ce000097ce7d1cb251",
	// "0x169787961b393d800afafc0b9927088dc84d692b",
	// "0x1b7ea7d42c476a1e2808f23e18d850c5a4692df7",
	// "0x281dbb9ca3f6d48e085384a821b7259abfdc7d66",
	// "0x420a6c1c79a6ce31ed9dc1c4343310c97b378f83",
	// "0x57447072d5fe4c5e740e6e2bfce3f41a1ce047b5",
	// "0x641d99580f6cf034e1734287a9e8dae4356641ca",
	// "0x66df2139c24446f5b43db80a680fb94d0c1c5d8e",
	// "0x6763bc9000fb2d8b922a025c4b2be745a449cad3",
	// "0x6a5dbf2fb5206ec8192620810c3edb6d5e62b188",
	// "0x8593b031d147cb86824ba55dacc7625a9d446bcf",
	// "0x88e863d4572d2dae27db81e98837a9dbeb0e7a12",
	// "0x8df937afdf1d08c2ba565d636ca1365a42144385",
	// "0x91746d6f9df58b9807a5bb0e54e4ea86600c2dba",
	// "0x9c5083dd4838e120dbeac44c052179692aa5dac5",
	// "0x9de160ff0063dd08bf0cd716f9e686e640b9c2d3",
	// "0xa35b52835dc644444881dd51563d13ad987c148c",
	// "0xa4b5778d81cc9bb79e46a51ebd57de90148ab8a4",
	// "0xa81ace214b97d4b9c2072a934d0c4de486757538",
	// "0xaf2c6c841bfe63df61364b8ee120773a7517f1d4",
	// "0xc30a8c89b02180f8c184c1b8e8f76af2b9d8f54d",
	// "0xcc4e62029e0491a61a7ac1b60ab1721f6df841e3",
	// "0xccf6c29d87eb2c0bafede74f5df35f84541f4549",
	// "0xd6ddac45512c216600502f46feb3a85731accac1",
	// "0xdfc11349cb2b6368854318b808b47c87f32c7efb",
]; 
const SENDER_ADDRESS = process.env.L1VEFXS_PROVER_ADDRESS_ROPSTEN_10;
const PKEY = process.env.L1VEFXS_PROVER_PRIVATE_KEY;
const CHAIN_ID = Chain.Mainnet;
const PROOF_DELAY_MSECS = 50;
const SLEEP_MSECS = 50;
// const FIXED_BLOCK = 19949000;
let FIXED_BLOCK = 20169000; 
const USE_MANUAL_ADDRESS_LIST = false;
const OFFSET = 0;
const USE_MOST_RECENT_KNOWN_BLOCK = false;
const VEFXS_CUTOFF_BN = BigNumber.from("10000000000000000000"); // 10e18
const VEFXS_CUTOFF_DEC = VEFXS_CUTOFF_BN.div("1000000000000000000").toNumber();

// Helpful: https://github.com/FraxFinance/fraxtal-proof-client
async function main() {
	// Initialize the providers and wallets
	const mainnetProvider = new JsonRpcProvider(process.env.ETHEREUM_NETWORK_ENDPOINT);
	const fraxtalProvider = new JsonRpcProvider(process.env.FRAXTAL_NETWORK_ENDPOINT);
	const mainnetWallet = new Wallet(PKEY, mainnetProvider);
	const fraxtalWallet = new Wallet(PKEY, fraxtalProvider);

	// Initialize the main response
	const mainResponse = [];

	// Instantiate the contracts
	let vefxsMainnet = new Contract(CONTRACT_ADDRESSES.ethereum.main.veFXS, VEFXS_ABI, mainnetWallet);
	let l1vefxsFraxtal = new Contract(CONTRACT_ADDRESSES.fraxtal.oracles.L1veFXS, L1VEFXS_ABI, fraxtalWallet);
	let fraxchainL1Block = new Contract(CONTRACT_ADDRESSES.fraxtal.oracles.fraxchain_l1_block, FRAXCHAIN_L1_BLOCK_ABI, fraxtalWallet);
	let stateRootFraxtal = new Contract(CONTRACT_ADDRESSES.fraxtal.oracles.state_root, STATE_ROOT_ORACLE_ABI, fraxtalWallet);

	// Determine the address list
	let addressesToUse = [];
	if (USE_MANUAL_ADDRESS_LIST) {
		// Use the manual list
		addressesToUse = MANUAL_ADDRESS_LIST;
		console.log(`Using the manual address list`);

	} else {
		// Fetch from the API
		const response = await fetch('https://api.frax.finance/v2/vefxs/users');
		const users = (await response.json()).users;
		console.log(`Using the API for the address list`);

		// Remove expired positions and amounts under VEFXS_CUTOFF_BN
		for (let i = OFFSET; i < users.length; i++) {
			// Get the user object
			const theUser = users[i];

			// Get the amount and end time
			const usrAmount = theUser.vefxsBalance;
			const usrEndMs = Date.parse(theUser.lockEndsAt);

			// Reject if the amount is below the cutoff, or if the position is expired
			if ((usrAmount < VEFXS_CUTOFF_DEC) || (usrEndMs <= Date.now())){
				continue;
			} else {
				addressesToUse.push(theUser.address);
			}
		}

		console.log(`Found ${addressesToUse.length} unexpired veFXS users above ${VEFXS_CUTOFF_DEC} veFXS`);
		console.log(addressesToUse);
	}

	// Determine which block number to use
	let blockToUse;
	if (USE_MOST_RECENT_KNOWN_BLOCK) {
		// Fetch the most recent known block from fraxchainL1Block
		blockToUse = await fraxchainL1Block.number();
		blockToUse = blockToUse.toNumber();
		console.log(`Using most recent known block: ${blockToUse}`);
	}
	else {
		// Use the fixed block
		blockToUse = FIXED_BLOCK;
		console.log(`Using fixed block: ${blockToUse}`);
	}

	// Convert the block to hex
	const blockHexed = '0x' + blockToUse.toString(16).replace(/^0+/, '');

	// STATE ROOT
	// ==============================================
	console.log(`================= CHECK STATE ROOT =================`);

	// See if the state root oracle already has the block header. If it doesn't, you need to prove it.
	const fetchedHeaderInfo = await stateRootFraxtal.getBlockInfo(blockToUse);
	if (fetchedHeaderInfo.timestamp == 0) {
		// Prove the block header
		console.log(`Need to prove state root for block ${blockToUse}.`)

		// Generate the RLP data for the header
		const blkHeaderInfoRLP = await getBlockHeaderInfo(blockHexed, mainnetProvider);
		
		// Estimate gas
		const estimatedGas = await stateRootFraxtal.estimateGas.proveStateRoot(blkHeaderInfoRLP);
		console.log(`proveStateRoot estimatedGas: ${estimatedGas}`);

		// Submit the proof
		const psrResponse = await stateRootFraxtal.proveStateRoot(
			blkHeaderInfoRLP
		,{ 
			gasLimit: increaseGasLimit(estimatedGas),
			gasPrice: 15000
		});

		// console.log(psrResponse);
	} else {
		console.log(`State root already proven for block ${blockToUse}. Skipping...`)
	}

	// PROCESS USERS
	// ==============================================
	
	// Nonce tracking
	// let availableNonceMainnet = await mainnetProvider.getTransactionCount(SENDER_ADDRESS);
	let availableNonceFraxtal = await fraxtalProvider.getTransactionCount(SENDER_ADDRESS);
	console.log(`availableNonceFraxtal: ${availableNonceFraxtal}`);


	for (let i = 0; i < addressesToUse.length; i++) {
		// Initialize the user
		const userAddress = addressesToUse[i];

		console.log(`\n================= PROCESSING USER ${userAddress} [#${i} IN JSON] =================`);
		
		// Fetch the mainnet locked user data
		const mainnetLocked = await vefxsMainnet.locked(userAddress, { gasLimit: '50000000' });
		const amountBigMainnet = BigNumber.from(mainnetLocked.amount);
		const endBigMainnet = BigNumber.from(mainnetLocked.end);
		// console.log(`amountBigMainnet: ${amountBigMainnet}`);
		// console.log(`endBigMainnet: ${endBigMainnet}`);

		// Skip users with small veFXS amounts
		if (amountBigMainnet.lt(VEFXS_CUTOFF_BN)) {
			console.log(`User balance (${amountBigMainnet.toString()}) below script cutoff. Skipping...`);
			continue;
		}

		// See if the user already has already been proven with this lock
		try {
			// Fetch l1veFXS locked
			const l1vefxsLocked = await l1vefxsFraxtal.locked(userAddress, { gasLimit: '50000000' });

			// Clean up the data from the response
			const amountBigFraxtal = BigNumber.from(l1vefxsLocked.amount);
			const endBigFraxtal = BigNumber.from(l1vefxsLocked.end);
			const blockTsBigFraxtal = BigNumber.from(l1vefxsLocked.blockTimestamp);
			// console.log(`amountBigFraxtal: ${amountBigFraxtal}`);
			// console.log(`endBigFraxtal: ${endBigFraxtal}`);
			// console.log(`blockTsBigFraxtal: ${blockTsBigFraxtal}`);

			// Check the response
			if ((amountBigMainnet.eq(amountBigFraxtal)) && (endBigMainnet.eq(endBigFraxtal))) {
				console.log(`User has already proven this data (amount and end did not change). Skipping...`);
				continue;
			} else {
				console.log(`Need to re-prove the lock`);
			}

		} catch (err) {
			// User has not been proven yet for anything
			console.log(`Existing l1vefxsFraxtal.locked() failed for ${userAddress}: ${err}`);
		}

		// Initialize the user response
		const usrResponse = {
			address: userAddress,
			blockNumber: blockToUse,
			provenAmount: null,
			provenEndTs: null,
			accountProof: [],
			storageProof1: [], // Amount
			storageProof2: [], // Ending timestamp
		};

		// FETCH PROOFS ON MAINNET
		// ==============================================

		// Wait briefly
		console.log(`Sleeping ${PROOF_DELAY_MSECS} milliseconds`);
		await sleep(PROOF_DELAY_MSECS); 

		try {
			// Pad some variables
			const paddedAddress = hexZeroPad(userAddress, 32);
			const paddedSlotLBAmt = hexZeroPad('0x2', 32); // LockedBalance.amount

			// Pack and hash
			const dblKeckedLBAmt = keccak256(['uint256'], [keccak256(['uint256', 'address'], [paddedSlotLBAmt, paddedAddress])]);

			// Get the "amount" proof
			const amtProofResponse = await mainnetProvider.send('eth_getProof', [
				'0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0',
				[dblKeckedLBAmt],
				blockHexed,
			]);
			usrResponse.accountProof = amtProofResponse.accountProof;
			usrResponse.storageProof1 = amtProofResponse.storageProof[0].proof;
			usrResponse.provenAmount = parseInt(amtProofResponse.storageProof[0].value);

			// Check that the proven and fetched amounts match
			assert(hexStripZeros(BigNumber.from(mainnetLocked.amount).toHexString()) == hexStripZeros(amtProofResponse.storageProof[0].value), "Fetched and proven [amount] mismatch");

			// Wait briefly
			console.log(`Sleeping ${PROOF_DELAY_MSECS} milliseconds`);
			await sleep(PROOF_DELAY_MSECS); 

			// Get the "end" proof
			const endSlot = BigNumber.from(dblKeckedLBAmt).add(1).toHexString();
			// console.log(`endSlot: ${endSlot}`);
			// console.log(`endSlot (parsed): ${parseInt(endSlot, 16)}`);
			const endProofResponse = await mainnetProvider.send('eth_getProof', [
				'0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0',
				[endSlot],
				blockHexed,
			]);
			usrResponse.storageProof2 = endProofResponse.storageProof[0].proof;
			usrResponse.provenEndTs = parseInt(endProofResponse.storageProof[0].value);

			// const stringedJson2 = JSON.stringify(endProofResponse, null, 4);
			// fs.writeFileSync("endProofResponse.json", stringedJson2, function(err) {
			// 	if (err) throw err;
			// 	console.log('complete');
			// 	}
			// );
			
			// Check that the proven and fetched ending timestamps match
			assert(hexStripZeros(BigNumber.from(mainnetLocked.end).toHexString()) == hexStripZeros(endProofResponse.storageProof[0].value), "Fetched and proven [ending timestamp] mismatch");
		}
		catch (err) {
			console.log(`Failed for ${userAddress}: ${err}`);
		}

		// Push the result into the final response
		mainResponse.push(usrResponse);

		// PROVING ON FRAXTAL
		// ==============================================

		// Submit the proof
		try {
			console.log(`Trying to prove with nonce ${availableNonceFraxtal}`);

			console.log(`Sending tx`);
			await l1vefxsFraxtal.proofVeFXS(
				userAddress, 
				blockToUse, 
				usrResponse.accountProof, 
				usrResponse.storageProof1, 
				usrResponse.storageProof2
			, { 
				// gasLimit: '50000000',
				gasPrice: '15000',
				nonce: availableNonceFraxtal
			});

			console.log(`Proof for ${userAddress} submitted with nonce ${availableNonceFraxtal}. veFXS: ${usrResponse.provenAmount}, end: ${usrResponse.provenEndTs}`);

			// Increment the nonce
			availableNonceFraxtal++;
		} catch (err) {
			console.log(`l1vefxsFraxtal.proofVeFXS failed for ${userAddress}: ${err}`);
		}




		
	}


	// console.log("================== MAIN RESPONSE ==================");
	// console.log(mainResponse);

	// Write to file
	// const stringedJson = JSON.stringify(mainResponse, null, 4);
	// fs.writeFileSync("proofs.json", stringedJson, function(err) {
	// 	if (err) throw err;
	// 	console.log('complete');
	// 	}
	// );

	console.log(`Sleeping ${SLEEP_MSECS} milliseconds`);
	await sleep(SLEEP_MSECS); 
}

const increaseGasLimit = (estimatedGasLimit) => {
	return estimatedGasLimit.mul(115).div(100) // increase by 15%
  }

function convertHeaderFields(headerFields) {
    for (var i = 0; i < headerFields.length; i++) {
        var field = headerFields[i];
        if (field == "0x0") field = "0x";
        if (field.length % 2 == 1) field = "0x0" + field.substring(2);
        headerFields[i] = field;
    }
}

const getBlockHeaderInfo = async (blockHexed, provider) => {
	const blkHeaderResponse = await provider.send('eth_getBlockByNumber', [
		blockHexed,
		true
	]);

	// const blockHdrJson = JSON.stringify(blkHeaderResponse, null, 4);
	// fs.writeFileSync("blockHdr.json", blockHdrJson, function(err) {
	// 	if (err) throw err;
	// 	console.log('complete');
	// 	}
	// );

	let headerFields = [];
	let block = blkHeaderResponse;

	headerFields.push(block.parentHash);
	headerFields.push(block.sha3Uncles);
	headerFields.push(block.miner);
	headerFields.push(block.stateRoot);
	headerFields.push(block.transactionsRoot);
	headerFields.push(block.receiptsRoot);
	headerFields.push(block.logsBloom);
	headerFields.push(block.difficulty);
	headerFields.push(block.number);
	headerFields.push(block.gasLimit);
	headerFields.push(block.gasUsed);
	headerFields.push(block.timestamp);
	headerFields.push(block.extraData);
	headerFields.push(block.mixHash);
	headerFields.push(block.nonce);
	headerFields.push(block.baseFeePerGas);
	if (block.withdrawalsRoot) {
		headerFields.push(block.withdrawalsRoot);
	}
	if (block.blobGasUsed) {
		headerFields.push(block.blobGasUsed);
	}
	if (block.excessBlobGas) {
		headerFields.push(block.excessBlobGas);
	}
	if (block.parentBeaconBlockRoot) {
		headerFields.push(block.parentBeaconBlockRoot);
	}

	// console.log("========================= headerFields (raw) =========================");

	// console.log(headerFields);

	// console.log("========================= headerFields (converted) =========================");

	convertHeaderFields(headerFields);
	// console.log(headerFields);

	// console.log("========================= rlpData =========================");

	const rlpData = encode(headerFields);
	// console.log(rlpData);

	return rlpData;
};


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});


