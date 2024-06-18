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

const VEFXS_AGGREGATOR_ABI = [{"type":"constructor","inputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"acceptOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"addAddlVeFXSContract","inputs":[{"name":"_addr","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"addlVeContracts","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"addlVeContractsArr","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"allAddlVeContractsAddresses","inputs":[],"outputs":[{"name":"_addresses","type":"address[]","internalType":"address[]"}],"stateMutability":"view"},{"type":"function","name":"allAddlVeContractsLength","inputs":[],"outputs":[{"name":"_length","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"fpisLocker","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IFPISLocker"}],"stateMutability":"view"},{"type":"function","name":"getAllCurrActiveLocks","inputs":[{"name":"_account","type":"address","internalType":"address"},{"name":"_estimateCrudeVeFXS","type":"bool","internalType":"bool"}],"outputs":[{"name":"_currActiveLocks","type":"tuple[]","internalType":"struct IveFXSStructs.LockedBalanceExtendedV2[]","components":[{"name":"id","type":"uint256","internalType":"uint256"},{"name":"index","type":"uint128","internalType":"uint128"},{"name":"amount","type":"int128","internalType":"int128"},{"name":"end","type":"uint128","internalType":"uint128"},{"name":"location","type":"address","internalType":"address"},{"name":"estimatedCurrLockVeFXS","type":"uint256","internalType":"uint256"}]}],"stateMutability":"view"},{"type":"function","name":"getAllExpiredLocks","inputs":[{"name":"_account","type":"address","internalType":"address"}],"outputs":[{"name":"_expiredLocks","type":"tuple[]","internalType":"struct IveFXSStructs.LockedBalanceExtendedV2[]","components":[{"name":"id","type":"uint256","internalType":"uint256"},{"name":"index","type":"uint128","internalType":"uint128"},{"name":"amount","type":"int128","internalType":"int128"},{"name":"end","type":"uint128","internalType":"uint128"},{"name":"location","type":"address","internalType":"address"},{"name":"estimatedCurrLockVeFXS","type":"uint256","internalType":"uint256"}]}],"stateMutability":"view"},{"type":"function","name":"initialize","inputs":[{"name":"_owner","type":"address","internalType":"address"},{"name":"_timelockAddress","type":"address","internalType":"address"},{"name":"_veAddresses","type":"address[6]","internalType":"address[6]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"l1VeFXSTotalSupplyOracle","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract L1VeFXSTotalSupplyOracle"}],"stateMutability":"view"},{"type":"function","name":"l1veFXS","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IL1VeFXS"}],"stateMutability":"view"},{"type":"function","name":"lFpisUtils","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract FPISLockerUtils"}],"stateMutability":"view"},{"type":"function","name":"nominateNewOwner","inputs":[{"name":"_owner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"nominatedOwner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"recoverERC20","inputs":[{"name":"_tokenAddress","type":"address","internalType":"address"},{"name":"_tokenAmount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"removeAddlVeFXSContract","inputs":[{"name":"_addr","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setAddresses","inputs":[{"name":"_veAddresses","type":"address[6]","internalType":"address[6]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setTimelock","inputs":[{"name":"_newTimelock","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"timelockAddress","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"ttlCombinedVeFXS","inputs":[{"name":"_user","type":"address","internalType":"address"}],"outputs":[{"name":"_currBal","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"ttlCombinedVeFXSTotalSupply","inputs":[],"outputs":[{"name":"_totalSupply","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"ttlCombinedVeFXSTotalSupplyDetailed","inputs":[],"outputs":[{"name":"_supplyInfo","type":"tuple","internalType":"struct VeFXSAggregator.DetailedTotalSupplyInfo","components":[{"name":"vestedFXSTotal","type":"uint256","internalType":"uint256"},{"name":"fpisLockerTotal","type":"uint256","internalType":"uint256"},{"name":"l1veFXSTotal","type":"uint256","internalType":"uint256"},{"name":"otherSourcesTotal","type":"uint256","internalType":"uint256"},{"name":"grandTotal","type":"uint256","internalType":"uint256"}]}],"stateMutability":"view"},{"type":"function","name":"veFXS","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IVestedFXS"}],"stateMutability":"view"},{"type":"function","name":"veFXSUtils","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IVestedFXSUtils"}],"stateMutability":"view"},{"type":"event","name":"AddlVeFXSContractAdded","inputs":[{"name":"addr","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"AddlVeFXSContractRemoved","inputs":[{"name":"addr","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"DefaultInitialization","inputs":[],"anonymous":false},{"type":"event","name":"OwnerChanged","inputs":[{"name":"oldOwner","type":"address","indexed":false,"internalType":"address"},{"name":"newOwner","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"OwnerNominated","inputs":[{"name":"newOwner","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"RecoveredERC20","inputs":[{"name":"token","type":"address","indexed":false,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"RewardAdded","inputs":[{"name":"reward","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"yieldRate","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"TimelockChanged","inputs":[{"name":"timelock_address","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"YieldCollected","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"yield","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"tokenAddress","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"YieldDurationUpdated","inputs":[{"name":"newDuration","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"error","name":"InitializeFailed","inputs":[]},{"type":"error","name":"InvalidOwnershipAcceptance","inputs":[]},{"type":"error","name":"NotOwnerOrTimelock","inputs":[]},{"type":"error","name":"OnlyOwner","inputs":[]},{"type":"error","name":"OwnerCannotBeZero","inputs":[]},{"type":"error","name":"TransferHelperTransferFailed","inputs":[]}];
const YIELD_DISTRIBUTOR_ABI = [{"type":"constructor","inputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"acceptOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"bulkCheckpointOtherUsers","inputs":[{"name":"_accounts","type":"address[]","internalType":"address[]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"checkpoint","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"checkpointOtherUser","inputs":[{"name":"_account","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"earned","inputs":[{"name":"_account","type":"address","internalType":"address"}],"outputs":[{"name":"_earned","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"eligibleCurrentVeFXS","inputs":[{"name":"_user","type":"address","internalType":"address"}],"outputs":[{"name":"_eligibleVefxsBal","type":"uint256","internalType":"uint256"},{"name":"_storedEndingTimestamp","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"emittedToken","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract ERC20"}],"stateMutability":"view"},{"type":"function","name":"emittedTokenAddress","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"fractionParticipating","inputs":[],"outputs":[{"name":"_fraction","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"getYield","inputs":[],"outputs":[{"name":"_yield0","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"getYieldForDuration","inputs":[],"outputs":[{"name":"_yield","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"getYieldThirdParty","inputs":[{"name":"_staker","type":"address","internalType":"address"}],"outputs":[{"name":"_yield0","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"greylist","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"greylistAddress","inputs":[{"name":"_address","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"initialize","inputs":[{"name":"_owner","type":"address","internalType":"address"},{"name":"_timelockAddress","type":"address","internalType":"address"},{"name":"_emittedToken","type":"address","internalType":"address"},{"name":"_veFXSAggregator","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"lastTimeYieldApplicable","inputs":[],"outputs":[{"name":"_ts","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"lastUpdateTime","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"nominateNewOwner","inputs":[{"name":"_owner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"nominatedOwner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"notifyRewardAmount","inputs":[{"name":"_amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"periodFinish","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"recoverERC20","inputs":[{"name":"_tokenAddress","type":"address","internalType":"address"},{"name":"_tokenAmount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"rewardNotifiers","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"setPauses","inputs":[{"name":"_yieldCollectionPaused","type":"bool","internalType":"bool"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setThirdPartyClaimer","inputs":[{"name":"_staker","type":"address","internalType":"address"},{"name":"_claimer","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setTimelock","inputs":[{"name":"_newTimelock","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setVeFXSAggregator","inputs":[{"name":"_veFXSAggregator","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setYieldDuration","inputs":[{"name":"_yieldDuration","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setYieldRate","inputs":[{"name":"_newRate","type":"uint256","internalType":"uint256"},{"name":"_syncToo","type":"bool","internalType":"bool"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"sync","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"thirdPartyClaimers","inputs":[{"name":"staker","type":"address","internalType":"address"}],"outputs":[{"name":"claimer","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"timelockAddress","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"toggleRewardNotifier","inputs":[{"name":"_notifierAddr","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"totalComboVeFXSSupplyStored","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"totalVeFXSParticipating","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"userIsInitialized","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"userVeFXSCheckpointed","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"userVeFXSEndpointCheckpointed","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"userYieldPerTokenPaid","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"veFXSAggregator","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract VeFXSAggregator"}],"stateMutability":"view"},{"type":"function","name":"yieldCollectionPaused","inputs":[],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"yieldDuration","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"yieldPerVeFXS","inputs":[],"outputs":[{"name":"_yield","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"yieldPerVeFXSStored","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"yieldRate","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"yields","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"event","name":"DefaultInitialization","inputs":[],"anonymous":false},{"type":"event","name":"OwnerChanged","inputs":[{"name":"oldOwner","type":"address","indexed":false,"internalType":"address"},{"name":"newOwner","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"OwnerNominated","inputs":[{"name":"newOwner","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"RecoveredERC20","inputs":[{"name":"token","type":"address","indexed":false,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"RewardAdded","inputs":[{"name":"reward","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"yieldRate","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"TimelockChanged","inputs":[{"name":"timelock_address","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"YieldCollected","inputs":[{"name":"staker","type":"address","indexed":true,"internalType":"address"},{"name":"recipient","type":"address","indexed":true,"internalType":"address"},{"name":"yield","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"tokenAddress","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"YieldDurationUpdated","inputs":[{"name":"newDuration","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"error","name":"AddressGreylisted","inputs":[]},{"type":"error","name":"InitializeFailed","inputs":[]},{"type":"error","name":"InvalidOwnershipAcceptance","inputs":[]},{"type":"error","name":"NotOwnerOrTimelock","inputs":[]},{"type":"error","name":"OnlyOwner","inputs":[]},{"type":"error","name":"OwnerCannotBeZero","inputs":[]},{"type":"error","name":"SenderNotAuthorizedClaimer","inputs":[]},{"type":"error","name":"SenderNotRewarder","inputs":[]},{"type":"error","name":"TransferHelperTransferFailed","inputs":[]},{"type":"error","name":"YieldCollectionPaused","inputs":[]},{"type":"error","name":"YieldPeriodMustCompleteBeforeChangingToNewPeriod","inputs":[]}];
const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

// MANUALLY SET THESE
// LIST OF ALL veFXS holders: https://api.frax.finance/v2/vefxs/users
const MANUAL_ADDRESS_LIST = [
	// "0x5180db0237291A6449DdA9ed33aD90a38787621c",
	"0x00ea95c08064a987f96e2632b78951e5dd0bc0e3",
	"0x02654d401cea4c544418aca90a631079756904ed",
	"0x10c16c7b8b1ddcfe65990ec822de4379dd8a86de",
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
const LOCK_LOCATIONS = {
	[CONTRACT_ADDRESSES.fraxtal.misc.L1VEFXS_PROXY.toLowerCase()]: 'L1veFXS',
	[CONTRACT_ADDRESSES.fraxtal.misc.FPIS_LOCKER_PROXY.toLowerCase()]: 'FPISLocker',
	[CONTRACT_ADDRESSES.fraxtal.misc.VESTED_FXS_PROXY.toLowerCase()]: 'VestedFXS',
}
const SENDER_ADDRESS = process.env.L1VEFXS_PROVER_ADDRESS_ROPSTEN_10;
const PKEY = process.env.L1VEFXS_PROVER_PRIVATE_KEY;
const SLEEP_MSECS = 500;
const USE_BULK_ROUTE = true;
const BULK_BATCH_INTERVAL = 50;
const USE_MANUAL_ADDRESS_LIST = false;
const OFFSET = 0;
const VEFXS_CUTOFF_BN = BigNumber.from("10000000000000000000"); // 10e18
const VEFXS_CUTOFF_DEC = VEFXS_CUTOFF_BN.div("1000000000000000000").toNumber();
const BIG18 = BigNumber.from("1000000000000000000"); // 1e18 

// Helpful: https://github.com/FraxFinance/fraxtal-proof-client
async function main() {
	// Initialize the providers and wallets
	const fraxtalProvider = new JsonRpcProvider(process.env.FRAXTAL_NETWORK_ENDPOINT);
	const fraxtalWallet = new Wallet(PKEY, fraxtalProvider);

	// Initialize the main response
	const mainResponse = [];

	// Instantiate the contracts
	let vefxsAggregator = new Contract(CONTRACT_ADDRESSES.fraxtal.misc.VEFXS_AGGREGATOR_PROXY, VEFXS_AGGREGATOR_ABI, fraxtalWallet);
	let yieldDistributor = new Contract(CONTRACT_ADDRESSES.fraxtal.misc.YIELD_DISTRIBUTOR_PROXY, YIELD_DISTRIBUTOR_ABI, fraxtalWallet);

	// Determine the address list
	let addressesToUse = [];
	let numBatches = 0;
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

		// Determine how many bulk batches to use
		numBatches = Math.ceil(addressesToUse.length / BULK_BATCH_INTERVAL);

		console.log(`Found ${addressesToUse.length} unexpired veFXS users above ${VEFXS_CUTOFF_DEC} veFXS`);
		console.log(`numBatches: ${numBatches}`);
		console.log(addressesToUse);
	}

	// PROCESS USERS
	// ==============================================
	
	// Nonce tracking
	// let availableNonceMainnet = await mainnetProvider.getTransactionCount(SENDER_ADDRESS);
	let availableNonceFraxtal = await fraxtalProvider.getTransactionCount(SENDER_ADDRESS);
	console.log(`availableNonceFraxtal: ${availableNonceFraxtal}`);

	// Loop through the addresses
	let bulkAddressesToCheckpoint = [];
	for (let i = 0; i < addressesToUse.length; i++) {
		// Initialize the user
		const userAddress = addressesToUse[i];

		console.log(chalk.blue(`\n================= PROCESSING USER ${userAddress} [#${i} IN JSON] =================`));
		
		// Fetch the user's active locks
		const activeLocks = await vefxsAggregator.getAllCurrActiveLocks(userAddress, false, { gasLimit: '50000000' });
		console.log(`Number of active locks: ${activeLocks.length}`);

		// Fetch the user's checkpointed endpoint
		const checkpointedEndTs = await yieldDistributor.userVeFXSEndpointCheckpointed(userAddress, { gasLimit: '50000000' });
		const endCheckpointBig = BigNumber.from(checkpointedEndTs);
		const endCheckpointDec = checkpointedEndTs.toNumber();
		console.log(`Ending checkpoint: ${endCheckpointDec}`);

		// See if the user needs to be checkpointed
		// --------------------------------

		// Loop through the user locks. userVeFXSEndpointCheckpointed needs to match one of the locks
		let needToCheckpoint = true;
		console.log(`----- Locks -----`);
		for (let j = 0; j < activeLocks.length; j++) {
			// Get the lock
			const theLock = activeLocks[j];
			
			// Print info
			console.log(`Lock #${j} @ ${LOCK_LOCATIONS[theLock.location.toLowerCase()]} || amount ${theLock.amount.div(BIG18).toNumber()} end: ${theLock.end.toNumber()}`);
			console.log(`  -- amount ${theLock.amount.div(BIG18).toNumber()}`);
			console.log(`  -- end: ${theLock.end.toNumber()}`);

			// See if there is a match
			if (theLock.end.eq(checkpointedEndTs)) {
				needToCheckpoint = false;
				console.log(chalk.yellow(`  -- Match found, no need to checkpoint, so far`));
				break;
			}
		}

		// Also see if veFXS increased
		console.log(`----- veFXS -----`);
		if (!needToCheckpoint) {
			// See the aggregator's current total combined veFXS
			const currAggregatorVeFXS = await vefxsAggregator.ttlCombinedVeFXS(userAddress, { gasLimit: '50000000' });

			// See the checkpointed veFXS
			const checkpointedVeFXS = await yieldDistributor.userVeFXSCheckpointed(userAddress, { gasLimit: '50000000' });

			// Print info
			console.log(`  -- VeFXSAggregator: ${currAggregatorVeFXS.div(BIG18).toNumber()}`);
			console.log(`  -- YieldDistributor: ${checkpointedVeFXS.div(BIG18).toNumber()}`);

			// If the current veFXS > checkpointed veFXS, you should checkpoint
			if (currAggregatorVeFXS.gt(checkpointedVeFXS)) {
				needToCheckpoint = true;
				console.log(chalk.hex('#FFA500')(`  -- Aggregator veFXS > Checkpointed veFXS, so you should checkpoint`));
			} else {
				needToCheckpoint = false;
				console.log(chalk.green(`  -- Checkpointed veFXS > Aggregator veFXS, so don't need to checkpoint`));
			}
		} else {
			console.log(chalk.hex('#FFA500')(`  -- No match found, so you need to checkpoint`));
		}

		// Checkpoint if you need to
		if (needToCheckpoint) {
			// If you are going the bulk route, add the address for later
			if (USE_BULK_ROUTE) {
				// Push the address into the array
				bulkAddressesToCheckpoint.push(userAddress);
				console.log(`Will bulk checkpoint ${userAddress} later`);
			}
			else {
				try {
					console.log(`Trying to checkpoint with nonce ${availableNonceFraxtal}`);
	
					console.log(`Sending tx`);
					const tx = await yieldDistributor.checkpointOtherUser(
						userAddress 
					, { 
						// gasLimit: '50000000',
						gasPrice: '15000',
						nonce: availableNonceFraxtal
					});
	
					console.log(`Checkpoint for ${userAddress} submitted with nonce ${availableNonceFraxtal}`);
					console.log(`TxID: ${tx.hash}`);
	
					// Increment the nonce
					availableNonceFraxtal++;

				} catch (err) {
					console.log(`yieldDistributor.checkpointOtherUser failed for ${userAddress}: ${err}`);
				}
			}
		}

		// Bulk checkpoint, if applicable
		// Every BULK_BATCH_INTERVAL, or if you reached the end
		if ((i > 0) && (bulkAddressesToCheckpoint.length > 0) && (((i % BULK_BATCH_INTERVAL) == 0) || (i == addressesToUse.length - 1))) {
			try {
				console.log(`=================== BULK CHECKPOINT ===================`);
				console.log(`Trying to bulk checkpoint with nonce ${availableNonceFraxtal}`);
				console.log(bulkAddressesToCheckpoint);
				console.log(`Sending tx`);
				const tx = await yieldDistributor.bulkCheckpointOtherUsers(
					bulkAddressesToCheckpoint 
				, { 
					// gasLimit: '50000000',
					gasPrice: '15000',
					nonce: availableNonceFraxtal
				});

				console.log(`Checkpoint for bulk users submitted with nonce ${availableNonceFraxtal}`);
				console.log(`TxID: ${tx.hash}`);

				// Increment the nonce
				availableNonceFraxtal++;
			} catch (err) {
				console.log(`yieldDistributor.bulkCheckpointOtherUsers failed: ${err}`);
			}

			// Clear the batch array
			bulkAddressesToCheckpoint = [];

			// Increment the nonce
			availableNonceFraxtal++;


		}


		// Sleep
		console.log(`Sleeping ${SLEEP_MSECS} milliseconds`);
		await sleep(SLEEP_MSECS); 
	}



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});


