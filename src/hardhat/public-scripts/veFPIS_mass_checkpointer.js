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

const VEFPIS_ABI = [{"name":"NominateOwnership","inputs":[{"name":"admin","type":"address","indexed":false}],"anonymous":false,"type":"event"},{"name":"AcceptOwnership","inputs":[{"name":"admin","type":"address","indexed":false}],"anonymous":false,"type":"event"},{"name":"Deposit","inputs":[{"name":"provider","type":"address","indexed":true},{"name":"payer_addr","type":"address","indexed":true},{"name":"value","type":"uint256","indexed":false},{"name":"locktime","type":"uint256","indexed":true},{"name":"type","type":"int128","indexed":false},{"name":"ts","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"Withdraw","inputs":[{"name":"provider","type":"address","indexed":true},{"name":"to_addr","type":"address","indexed":true},{"name":"value","type":"uint256","indexed":false},{"name":"ts","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"Supply","inputs":[{"name":"prevSupply","type":"uint256","indexed":false},{"name":"supply","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"TransferToApp","inputs":[{"name":"staker_addr","type":"address","indexed":true},{"name":"app_addr","type":"address","indexed":true},{"name":"transfer_amt","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"TransferFromApp","inputs":[{"name":"app_addr","type":"address","indexed":true},{"name":"staker_addr","type":"address","indexed":true},{"name":"transfer_amt","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"ProxyAdd","inputs":[{"name":"staker_addr","type":"address","indexed":true},{"name":"proxy_addr","type":"address","indexed":true},{"name":"add_amt","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"ProxySlash","inputs":[{"name":"staker_addr","type":"address","indexed":true},{"name":"proxy_addr","type":"address","indexed":true},{"name":"slash_amt","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"SmartWalletCheckerComitted","inputs":[{"name":"future_smart_wallet_checker","type":"address","indexed":false}],"anonymous":false,"type":"event"},{"name":"SmartWalletCheckerApplied","inputs":[{"name":"smart_wallet_checker","type":"address","indexed":false}],"anonymous":false,"type":"event"},{"name":"EmergencyUnlockToggled","inputs":[{"name":"emergencyUnlockActive","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"AppIncreaseAmountForsToggled","inputs":[{"name":"appIncreaseAmountForsEnabled","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"ProxyTransferFromsToggled","inputs":[{"name":"appTransferFromsEnabled","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"ProxyTransferTosToggled","inputs":[{"name":"appTransferTosEnabled","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"ProxyAddsToggled","inputs":[{"name":"proxyAddsEnabled","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"ProxySlashesToggled","inputs":[{"name":"proxySlashesEnabled","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"LendingProxySet","inputs":[{"name":"proxy_address","type":"address","indexed":false}],"anonymous":false,"type":"event"},{"name":"HistoricalProxyToggled","inputs":[{"name":"proxy_address","type":"address","indexed":false},{"name":"enabled","type":"bool","indexed":false}],"anonymous":false,"type":"event"},{"name":"StakerProxySet","inputs":[{"name":"proxy_address","type":"address","indexed":false}],"anonymous":false,"type":"event"},{"stateMutability":"nonpayable","type":"constructor","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"nominate_ownership","inputs":[{"name":"addr","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"accept_transfer_ownership","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"commit_smart_wallet_checker","inputs":[{"name":"addr","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"apply_smart_wallet_checker","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"recoverERC20","inputs":[{"name":"token_addr","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[]},{"stateMutability":"view","type":"function","name":"get_last_user_slope","inputs":[{"name":"addr","type":"address"}],"outputs":[{"name":"","type":"int128"}]},{"stateMutability":"view","type":"function","name":"get_last_user_bias","inputs":[{"name":"addr","type":"address"}],"outputs":[{"name":"","type":"int128"}]},{"stateMutability":"view","type":"function","name":"get_last_user_point","inputs":[{"name":"addr","type":"address"}],"outputs":[{"name":"","type":"tuple","components":[{"name":"bias","type":"int128"},{"name":"slope","type":"int128"},{"name":"ts","type":"uint256"},{"name":"blk","type":"uint256"},{"name":"fpis_amt","type":"uint256"}]}]},{"stateMutability":"view","type":"function","name":"user_point_history__ts","inputs":[{"name":"_addr","type":"address"},{"name":"_idx","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"get_last_point","inputs":[],"outputs":[{"name":"","type":"tuple","components":[{"name":"bias","type":"int128"},{"name":"slope","type":"int128"},{"name":"ts","type":"uint256"},{"name":"blk","type":"uint256"},{"name":"fpis_amt","type":"uint256"}]}]},{"stateMutability":"view","type":"function","name":"locked__end","inputs":[{"name":"_addr","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"locked__amount","inputs":[{"name":"_addr","type":"address"}],"outputs":[{"name":"","type":"int128"}]},{"stateMutability":"view","type":"function","name":"curr_period_start","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"next_period_start","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"nonpayable","type":"function","name":"checkpoint","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"create_lock","inputs":[{"name":"_value","type":"uint256"},{"name":"_unlock_time","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"increase_amount","inputs":[{"name":"_value","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"increase_amount_for","inputs":[{"name":"_staker_addr","type":"address"},{"name":"_value","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"checkpoint_user","inputs":[{"name":"_staker_addr","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"increase_unlock_time","inputs":[{"name":"_unlock_time","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"proxy_add","inputs":[{"name":"_staker_addr","type":"address"},{"name":"_add_amt","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"proxy_slash","inputs":[{"name":"_staker_addr","type":"address"},{"name":"_slash_amt","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"withdraw","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"transfer_from_app","inputs":[{"name":"_staker_addr","type":"address"},{"name":"_app_addr","type":"address"},{"name":"_transfer_amt","type":"int128"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"transfer_to_app","inputs":[{"name":"_staker_addr","type":"address"},{"name":"_app_addr","type":"address"},{"name":"_transfer_amt","type":"int128"}],"outputs":[]},{"stateMutability":"view","type":"function","name":"balanceOf","inputs":[{"name":"addr","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"balanceOf","inputs":[{"name":"addr","type":"address"},{"name":"_t","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"balanceOfAt","inputs":[{"name":"addr","type":"address"},{"name":"_block","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"totalSupply","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"totalSupply","inputs":[{"name":"t","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"totalSupplyAt","inputs":[{"name":"_block","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"totalFPISSupply","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"totalFPISSupplyAt","inputs":[{"name":"_block","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"nonpayable","type":"function","name":"toggleEmergencyUnlock","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"toggleAppIncreaseAmountFors","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"toggleTransferFromApp","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"toggleTransferToApp","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"toggleProxyAdds","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"toggleProxySlashes","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"adminSetProxy","inputs":[{"name":"_proxy","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"adminToggleHistoricalProxy","inputs":[{"name":"_proxy","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"stakerSetProxy","inputs":[{"name":"_proxy","type":"address"}],"outputs":[]},{"stateMutability":"view","type":"function","name":"token","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"supply","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"locked","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"tuple","components":[{"name":"amount","type":"int128"},{"name":"end","type":"uint256"}]}]},{"stateMutability":"view","type":"function","name":"epoch","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"point_history","inputs":[{"name":"arg0","type":"uint256"}],"outputs":[{"name":"","type":"tuple","components":[{"name":"bias","type":"int128"},{"name":"slope","type":"int128"},{"name":"ts","type":"uint256"},{"name":"blk","type":"uint256"},{"name":"fpis_amt","type":"uint256"}]}]},{"stateMutability":"view","type":"function","name":"user_point_history","inputs":[{"name":"arg0","type":"address"},{"name":"arg1","type":"uint256"}],"outputs":[{"name":"","type":"tuple","components":[{"name":"bias","type":"int128"},{"name":"slope","type":"int128"},{"name":"ts","type":"uint256"},{"name":"blk","type":"uint256"},{"name":"fpis_amt","type":"uint256"}]}]},{"stateMutability":"view","type":"function","name":"user_point_epoch","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"slope_changes","inputs":[{"name":"arg0","type":"uint256"}],"outputs":[{"name":"","type":"int128"}]},{"stateMutability":"view","type":"function","name":"appIncreaseAmountForsEnabled","inputs":[],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"appTransferFromsEnabled","inputs":[],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"appTransferTosEnabled","inputs":[],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"proxyAddsEnabled","inputs":[],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"proxySlashesEnabled","inputs":[],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"emergencyUnlockActive","inputs":[],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"current_proxy","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"historical_proxies","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"staker_whitelisted_proxy","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"user_proxy_balance","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"name","inputs":[],"outputs":[{"name":"","type":"string"}]},{"stateMutability":"view","type":"function","name":"symbol","inputs":[],"outputs":[{"name":"","type":"string"}]},{"stateMutability":"view","type":"function","name":"version","inputs":[],"outputs":[{"name":"","type":"string"}]},{"stateMutability":"view","type":"function","name":"decimals","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"future_smart_wallet_checker","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"smart_wallet_checker","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"admin","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"future_admin","inputs":[],"outputs":[{"name":"","type":"address"}]}];
const YIELD_DISTRIBUTOR_ABI = [{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"_emittedToken","type":"address"},{"internalType":"address","name":"_timelock_address","type":"address"},{"internalType":"address","name":"_veFPIS_address","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[],"name":"DefaultInitialization","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"yield","type":"uint256"},{"indexed":false,"internalType":"address","name":"token_address","type":"address"}],"name":"OldYieldCollected","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldOwner","type":"address"},{"indexed":false,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerNominated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RecoveredERC20","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"yieldRate","type":"uint256"}],"name":"RewardAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"yield","type":"uint256"},{"indexed":false,"internalType":"address","name":"token_address","type":"address"}],"name":"YieldCollected","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newDuration","type":"uint256"}],"name":"YieldDurationUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"yieldRate","type":"uint256"}],"name":"YieldPeriodRenewed","type":"event"},{"inputs":[],"name":"acceptOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"checkpoint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user_addr","type":"address"}],"name":"checkpointOtherUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"earned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"eligibleCurrentVeFPIS","outputs":[{"internalType":"uint256","name":"eligible_vefpis_bal","type":"uint256"},{"internalType":"uint256","name":"stored_ending_timestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"emittedToken","outputs":[{"internalType":"contract ERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"emitted_token_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"fractionParticipating","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getYield","outputs":[{"internalType":"uint256","name":"yield0","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getYieldForDuration","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"greylist","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_address","type":"address"}],"name":"greylistAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"lastTimeYieldApplicable","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastUpdateTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"nominateNewOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nominatedOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"notifyRewardAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"periodFinish","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"recoverERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"reward_notifiers","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_yieldCollectionPaused","type":"bool"}],"name":"setPauses","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_new_timelock","type":"address"}],"name":"setTimelock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_yieldDuration","type":"uint256"}],"name":"setYieldDuration","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_new_rate0","type":"uint256"},{"internalType":"bool","name":"sync_too","type":"bool"}],"name":"setYieldRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"sync","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"timelock_address","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"notifier_addr","type":"address"}],"name":"toggleRewardNotifier","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalVeFPISParticipating","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalVeFPISSupplyStored","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userIsInitialized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userVeFPISCheckpointed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userVeFPISEndpointCheckpointed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userYieldPerTokenPaid","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"yieldCollectionPaused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"yieldDuration","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"yieldPerVeFPIS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"yieldPerVeFPISStored","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"yieldRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"yields","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
const CONTRACT_ADDRESSES = constants.CONTRACT_ADDRESSES;

// MANUALLY SET THESE
// LIST OF ALL veFXS holders: https://api.frax.finance/v2/vefxs/users
const MANUAL_ADDRESS_LIST = [
	"0x006b4b47c7f404335c87e85355e217305f97e789",
	"0x008d63fab8179ee0ae2082bb57c72ed0c61f990f",
	"0x00957d7b5b9155ea78d89f747dc0fcaad52ba243",
	"0x00c0623736a3ae2aa61007c5ff81a8adf2b6d505",
	"0x01fdd6d8b0c414127b01c02a8261cccffe0e5781",
	"0x0202ed9ff0d505f9b064a610199a001cef9977bd",
	"0x0220076461176fe37f54aa97313bb306f8d843b7",
	"0x030f4d6e39cf3b6359ee6da62dcbf8f46653971c",
	"0x036130a4058659953d3d19b9ae10554ecaa740a8",
	"0x0380486a5fdd13774ca3896db6eaaba43fac20bd",
	"0x038673370955eb929d94f9d0c7992bb48137e998",
	"0x0459dda9eb7062e6fdca6293a4c363722fca6102",
	"0x045e41068dab0f64f7e51b050fd9287d346f14ed",
	"0x060284e0a026633f4e5b0f832695452d71a9b9dc",
	"0x060570e3678ac239c8d1aaf0ab47a8dce52fa9c0",
	"0x063d261427a2241953c68594b0b97aace0698feb",
	"0x06ab7b6155f5fe588d02aa18fcf8d6fa11e71b2b",
	"0x06bb0c0436c0d57e47388335547c572c2aa57141",
	"0x07cddff5e6c565eabff2e8b15af08acbbae8be82",
	"0x082c86a0687c655325c13b1464c7eddee4923a10",
	"0x0890d96f2793c629c576b611d60d872b83ab7bdd",
	"0x0932d103c76b35f70c523566f1d09a405f6f7835",
	"0x0942086a607b12fe0dd5467620e6231c354ba175",
	"0x09d57f361f794d150c04443a7b6e369120dc2bea",
	"0x09fa38eba245bb68354b8950fa2fe71f02863393",
	"0x0a2931a4fe078f740cfaa8416f23870fa4f4a948",
	"0x0bb35f7533263c41327eedf5a9718dee888f77e0",
	"0x0c0313dd1df6b171ea9a8df3f95102bb54faba57",
	"0x0d5d5aab608003d1a8572f1e99c31566bee9e7ef",
	"0x0f4bc970e348a061b69d05b7e2e5c13eb687e5e3",
	"0x0f696812f40d52327b8cc419b1044b0e9c162ac9",
	"0x0fe34364c5659d5be6e59fb47e15bda6ee9d13d3",
	"0x101d88a0f5ffee6879070a11eb20a2ffa3e1074e",
	"0x104feb5cd1a56eca6405c48331ce2fd5bd9eaa04",
	"0x10c16c7b8b1ddcfe65990ec822de4379dd8a86de",
	"0x114ab988799ea396bfa2d549ffe7bb6e6f29322e",
	"0x1243e7ad51eda47e580c20e751acaa0b8863c17c",
	"0x125b45c0f4a55ff08cfdded26faaec37f0432c94",
	"0x12dec026d5826f95ba23957529b36a386e085583",
	"0x12fbf7d613ad282fa3daa58c927c1686cbcc9e6c",
	"0x13b5c89b6d22b82182c24c2d968dfc3f2535c3e9",
	"0x13c9d9b81513fe8ef119408f916b74118478cb03",
	"0x1488a4c4c06eebbde696a633c703dcc1896ef996",
	"0x14b1b3ff91525dd00e8fb8ce000097ce7d1cb251",
	"0x1572a9bb16a624bd9748c0f365c55935b91aefbf",
	"0x15b4e804f546346ce529a7804b8aeb1f114491bd",
	"0x1621c4f772b284dd71052e882e197366e1faa942",
	"0x164a150c7a026040337aed383432b6a166c6136e",
	"0x16668854dd35b25d3b219db372cb256eb9898b98",
	"0x1693fa60c8f364cb62f642144fb19599faee378e",
	"0x17359937bc169a348aaea90871765aca4071c8d3",
	"0x17ab0a8fc0c3137b9ee490568e9f51177144a9a3",
	"0x185f236ad1a5d8c4b115083b2b45de6a6c896ace",
	"0x18a5579f085fdde7000e3f67d659b49629f57299",
	"0x18bcc4888de504e6972251527ee1fa787cf69111",
	"0x18ed6033aa257db86c8199efddc05c021cc6a85c",
	"0x1947a993be42ba5346f920b24cb48a57d08f28d4",
	"0x1a0b494845b2cfaff017cc967409d49a33c5dc26",
	"0x1a2db2ab3ee6a960f51f06969a697317fbd44e9e",
	"0x1aaf5e41c2c73617bc120097547a3410caf6718a",
	"0x1b0dcfd4c1df4d179e8ef07dd4963ceb40bed5f2",
	"0x1b1b3ee4d70b6cff84fee1c4ce5c5d9b42053e7b",
	"0x1b7ea7d42c476a1e2808f23e18d850c5a4692df7",
	"0x1b9c81c9588ed126593d33e93d8c2b039a5503ab",
	"0x1ce5181124c33abc281bf0f07ef4fb8573556aa5",
	"0x1ce99932fd278e00911814dc4bd403e1293d8ed2",
	"0x1d1c4379c5dca8bdc0e7de6dd58948c439b3bc0b",
	"0x1d2f93def8c4958b8f4c8377de435dd3c2d1e594",
	"0x1d8ac69ed56f6dbd336e949fe9a8b6b1f7b6f076",
	"0x1ddc2dd58444902528718a7e903a8c0c0f81dda9",
	"0x1e4a86e6fd5c2186e78356324e5976698e026aae",
	"0x1eb24d88150460198ee4137cc258ad82908107e6",
	"0x1ed9af007e4f70fc63464ccb1360f2017c9ea9cf",
	"0x1ef10ee39e4504ffa239dd4bdd298496b8048a33",
	"0x1f5f05a2567727c0c139af8cee903f365a8d8df2",
	"0x1fe5753d8b89e1655a4a07a884e3ac91a3b30803",
	"0x203e9d647ca61b986cb2058d255f66d4a2bdee28",
	"0x2124133edfe67158db7f2a54ebfea11b41242568",
	"0x21fac85314ec208b2f57ca52a07f7f8a336d2159",
	"0x2218e241f4a037184125a46df2c2013d808611e3",
	"0x249d13dd82b44ec7dd731244b50e5a6efa6e9754",
	"0x267325e03527ede18a77cfc3e320bcc356560184",
	"0x270c3196c6382b5fa85c0be9e88f91710ca9ddfa",
	"0x27b5491b519e72ce52f0dc9ccc9d7dc3d1e7b964",
	"0x27e5343620b95645448de3710ca4162055670109",
	"0x28eafbe7fd5cbbd938470237d76ae61f3bd191be",
	"0x293cea2c4a9a68292fac73fb57d4fd7d7bd1daca",
	"0x29dc6c4b90fb17ae1c6a5f61be5081ded5ebb7bf",
	"0x2a776df062b4272f09d29920404ef877c69b12f0",
	"0x2c5597f6fe46305b70413eb84ae28cb57438d538",
	"0x2e05c1d5157b45454d7f03ffbc5f158b307bcc27",
	"0x2e7182c1648e31b661b3716caadae5401459334d",
	"0x2ef0782745b9890c2d1047cbd33be98e22ec35a2",
	"0x2f707265e61300e8290c18e38ebcbd129fb0b0f5",
	"0x31562ae726afebe25417df01bedc72ef489f45b3",
	"0x32bfa11cd3ac197c6c6f3658d981d46efd9e9a6e",
	"0x339836e472d5f852f6d421a73a3fed2c1c9abb09",
	"0x33dcde3a53d901a39c0621f662065607ccd56b4a",
	"0x33fd649546ced00212e2c2c67047048bd7db7feb",
	"0x3437811a594f18425493dec19bf7157b377cffda",
	"0x34ab6cc693ed5f706ecece5f8074edff3ed58bcf",
	"0x36de560dc716a68d3067e2457d21de0001eac1df",
	"0x36ecbe947115ede61a66b3cfcfb659097db3927c",
	"0x374d5221a4367fe746cc6c92d333c6ce15386fcd",
	"0x376c655f1cd6fb45529b54719cee61eb1f906d36",
	"0x379c05dbc584ae8d593a88a23144dfbb734be64e",
	"0x37b1884205cc47c2bf5cf5a0248946c4c0c85724",
	"0x38bda5bc5d7c5f02b44dd2ae77fd25cb398d745a",
	"0x3922deedbe225bdeaad29817b89e4feaeb74e5a8",
	"0x3a652f60622d22cde49de3d9b5e9d0dcd4d6c32a",
	"0x3a7d27264bf91b534dc4a83360cafba020539cef",
	"0x3ab0e4d61e48cb85c48063687a4124077046a25a",
	"0x3ad47112944dfba299bf5d511b6d52df8ccec548",
	"0x3af7fa91f0b2b2d148622831e3a21c165c8c8e49",
	"0x3b1d6ef5359b6ba1991ab2a00cf5e193f6611e47",
	"0x3c28c42b24b7909c8292920929f083f60c4997a6",
	"0x3d8bbf1fae74db45436d1cfbc513267acb03da7a",
	"0x3dc606ce9cca12196917a3267a8ae7008e018958",
	"0x3df1c8f0766f46d009a842b05bf2366a446292aa",
	"0x3e2a4ad57e996d9d12013afe4a72bef17aef6b14",
	"0x3e3ec66966db8dd00ab4d766e738ef39aa2399e0",
	"0x3e76aecaf65c25fe8f569900ec22e9cfdb89654c",
	"0x3f3b9b0f14def5817a61437ccb25ccbbd4853ffd",
	"0x40bbae8813c1808f8f5cffcdadc16338ac36c17e",
	"0x4116fd2960521d0c5b35d85738aa0fbbeeeef71d",
	"0x41fe16b5f6bc44b79b1ec8f060a992898d0b95b4",
	"0x420a6c1c79a6ce31ed9dc1c4343310c97b378f83",
	"0x428d5d2d6541dbf11055e84262145e06b4eeae7f",
	"0x42a1de863683f3230568900ba23f86991d012f42",
	"0x4371ebaaefeb8e56ea8448787508efefa2291d74",
	"0x4385239147a45b560a8fa1e8dd58998868e8af87",
	"0x4422f783229bc33fde3e4bf09496ba717d52c9cf",
	"0x44408cd97a1bd28cfd7b0b3b5f3d96d38a65e873",
	"0x4688b6f3c384c3cffe95c92f599213de4a9fa9ca",
	"0x47005117818b443b39c8449f5e10e101fc2b59e0",
	"0x472a790042dddff840f8b6a633c4bdf00128acc3",
	"0x47ecd582e8a640e0a77c2572987fba82826ae274",
	"0x484b4fda86b95d1c1e99f84669e9aa1bd84b974f",
	"0x48e7819861c12f0ff1154051da6a4738eadd3233",
	"0x495690ecbd0d835815e13c0dc63f3e60e04601e8",
	"0x49b259608c6ace71a30ffc35d3e216978157e944",
	"0x4b2ba76169d4a9b1aaee7eb21f17a0dc040525f1",
	"0x4b3897e40749587ffbfb2732008d026db2c8d588",
	"0x4ea0d69b9e1fe826745e2e914a92c486d536c17f",
	"0x4ee98b27eef58844e460922ec9da7c05d32f284a",
	"0x510b10184853d3999ab01cbce24eebf4e406829a",
	"0x510b15abd7078878141a5a49b0ee246c8aee6712",
	"0x510bd1a857df836c2ad57aa3a6fae396e011d958",
	"0x511b57a2f63a68dddc8b747910df698813ef1231",
	"0x5180db0237291a6449dda9ed33ad90a38787621c",
	"0x5187aca6a74b5377d4f33bd7cf81129d2e2fd045",
	"0x519124fe40ffba95d121a8efd24a020fe3f3da38",
	"0x52a64ff6ed9c7e5dbc97166be3e896293579935c",
	"0x5345462544ed763639519376c298e939228dd1f4",
	"0x55e8f135e05b9a7e73947bc2cc69ddde7d1aec36",
	"0x5652615791eb9eeb167ed11eb54928a360938d39",
	"0x567b5f182bd68a820308a3cd565087d25aa76b3d",
	"0x587b938a8b21ea570325e91bdd01b161783a75e8",
	"0x5b6c9938ab5d4f0a80b7f6f146b8b155164f4dcf",
	"0x5b7d25e2c242fa82cf24678c2d3d7cbea4f507e9",
	"0x5b9967538c7ecf515de37961ac097f14d0661055",
	"0x5bdf2df91ca26331e718ae3ac7cdba360ee6b950",
	"0x5cc76f46639ae790526c8cb5a9934359d123b8cb",
	"0x5d71babf4f697c25cde72ddf4045d2ca4bdcfb32",
	"0x5ef47f1b3d81e4f49317505be9f275ecdbbdef5b",
	"0x5efa253bfa8c626000393c6c654611267261d942",
	"0x60b5c386a9d5ebf2652956f5cf48f80bf709fa9e",
	"0x640a11d9a4b1db94b30a9cca25dc1e6870d7afc3",
	"0x657bf0f8483615f599e713c977f53273acfd6d63",
	"0x66c348c2d6f0a5c2d1b34dc87ab61bfd62feb9cd",
	"0x67776b1b56401d903b9706b6d9073079b2587833",
	"0x67a7c80ebfecb2a789f03f0d64d151d0e3fa4424",
	"0x67b21fb5f5a1ffd8c07799dcfa117b7e301d377d",
	"0x6800304b221660f23f382cf5ec42ab2dfc66890f",
	"0x687c121cc556038a1d44fd6ffcad6eb32245e54b",
	"0x68a1e5b239bfa068d6231e80c64c5d7ffbf9cee4",
	"0x68adf8ea6f7c86c07425271240fbd8ed069c5be7",
	"0x6acc1f67290e711912eddcc4511835c15c252828",
	"0x6c226b553ba4116fcec9d2ef1c1772ad2704da50",
	"0x6ccaf7c0bfabcbdcc28c20f123e497ec208168b0",
	"0x6d6bb0505447b1f419a52df925d4d56d685050cf",
	"0x6f8adc605edf0da9f3970d12405e8e47e9ac7454",
	"0x6fdf8c591ff43f90081a3f6676bc3057ff8ee823",
	"0x703a50b54ab2bed1bf575e4e995e1ca0f0abe499",
	"0x710fdb2dc7774a9755ca36070704d7b12625dff5",
	"0x719f0226a1adfffc216aa27c0c42ff699972bb6c",
	"0x7269cad927f2d98abfd06b0eb1da318525c6c304",
	"0x728e7f512e01e7811037985ddfb15f9bfef517a8",
	"0x733371d7c15acecf9e120dd037d6bcdb6e069148",
	"0x73af687b4bc949054d058be3172d1b5289cb659e",
	"0x751d985d4f9ecdb773ba53c9a4cc5d34b0254613",
	"0x7708782d4d81a11f169b5248b434b80c152243f0",
	"0x77fc54677f6cd1c3a669b9c2ff032836af59c5b8",
	"0x7adc457434e8c57737ad2ace768a863865f2aabc",
	"0x7b0c025529f5e5f158fd1278415eb156ed01e9d1",
	"0x7b73abbef85ef34c4d373fdee63473e231039bef",
	"0x7bfee91193d9df2ac0bfe90191d40f23c773c060",
	"0x7eba9bcbaf748a2dd7c01cf833a96fcefad38fe3",
	"0x7f0a1d27cce6bb5abbec43223abe78a9c054e963",
	"0x7f1ee637f2fa4ca62e33ae58b496e4130756a557",
	"0x7f977c4cff92c055173b865bcbd8158161ab95a9",
	"0x80223b82cc86c20d1011576f731b226999e00531",
	"0x827eb4260508f8ce4d97847c7cfa13f6521f0e06",
	"0x82b44dd64a3f5f14725f5ffa918a82d376500d67",
	"0x82b8b659a4a98f69cb7899e1a07089ea3b90a894",
	"0x84119e837dbef0f4fb877681687a2869b220533b",
	"0x85187ddcc767f84bc40338c673de07ba6183dd18",
	"0x858e313b9f60bb138305a7904571d172201b1ef0",
	"0x858e8de00e19f8e86e98372b1222859714f6bb41",
	"0x8593b031d147cb86824ba55dacc7625a9d446bcf",
	"0x85dbf9e8a6fefb08c18b7d72b9a5bc86979bd3d3",
	"0x86aa575618ba2c34a3190f5f2b4358b216b04c75",
	"0x8735532508f78883c837cab119e53466be8cf892",
	"0x87d4921038bd828fd06b9936da6e1fcff8c6232b",
	"0x87edd1aa75af9f9677908e286f405a124785e7ed",
	"0x88156facf7c584bf658badba8bf4d17af6fb150e",
	"0x8844657af9b631cefd5686b514b00d8a6f332189",
	"0x884de35810b085e0f15a1ac7efb86040cdb10bb7",
	"0x88e863d4572d2dae27db81e98837a9dbeb0e7a12",
	"0x8a7081a44c72c984c548a0de822615fb15d1619c",
	"0x8b4c432ed7eeca8fe3c2c8fa1358568f4d4287e7",
	"0x8b7a6fec5c6638c1d667ef8126b457fec09376eb",
	"0x8c78d21f1ea29a3571356483da01fa0babef7f36",
	"0x8cb71cec028ccb62a88a89364884d1df5c0c5273",
	"0x8df937afdf1d08c2ba565d636ca1365a42144385",
	"0x8e007c75a6e998309df58a50f11e5fd063d30ea8",
	"0x8f3b92a7a8be91a087b7549d5134c44708e6ed1d",
	"0x90a69b1a180f60c0059f149577919c778ce2b9e1",
	"0x913782500cc8acdfc8afa2591222d4ad8771a9d1",
	"0x914b68718c3920ed020d172c96c8826827ef5c70",
	"0x941b5790108a359241caff127bbf0b16e2bef085",
	"0x946f7ff0942162a8deb3a2f1c972c55f8c962a0c",
	"0x96668cf0cb358ecfa05873285696e0c23577e50a",
	"0x96adc904b512c6fe6e9ea64f4e0327c7920af981",
	"0x9751beee7a2ae7efe102d6a5f807e60d0bf7b22b",
	"0x97ae3d6eceec4a733fa0cdb6a1eac636ac1b9892",
	"0x9948ffd4b0e40a096f8979cdaeea7d852f6ea177",
	"0x997541c653fe2e37711e4245d63edd4ba9a02c3e",
	"0x9996f0625a29ac20e06bac3e95e753b5bab2a6f6",
	"0x9b616ac1d31f17be9b23560d93699ca7732e2808",
	"0x9c5083dd4838e120dbeac44c052179692aa5dac5",
	"0x9d4418155daaba307339b517646477178d0af9e4",
	"0x9dbd5d4c7659963de885e29280da361dfd200836",
	"0x9dc03477a733c1d580d0fa76e9dcffdbda9c89b0",
	"0x9de9fbc5dfa267610e7d8ba137fb4fe18ce39900",
	"0x9e9fca8212355ce0a26d6a96f227750b189efd9a",
	"0x9ef261da98c870d4dfc661250aefb4212d742bcc",
	"0x9fae1b2be0a8d7e64780fd740f8ad05188e8170a",
	"0xa12ac5088de5c394505d3ded4c2b5f2a81858753",
	"0xa2ca91849e76164f71f54b8ec64b4b356ccf711c",
	"0xa2e81f9f15f130898c27531c4323506e34c13e3c",
	"0xa41dd9b4728158dc78feced1f19d177e63048076",
	"0xa43a9d3965bb30991407e51e193974cbac51dfd9",
	"0xa448833bece66fd8803ac0c390936c79b5fd6edf",
	"0xa47ee5197e0bc05180f799caa4abd3cefdc7fd1d",
	"0xa4c9d9a5568781867a61a78b96098036defbd65e",
	"0xa4eca7b6c9cb3f313eb1546d010c9a4fb06ce8bc",
	"0xa81ace214b97d4b9c2072a934d0c4de486757538",
	"0xa924d56f26f9acb8515b3984543b07d34bc4731c",
	"0xa9bdadce387700b18a3d5c2a668395bdadc7b76b",
	"0xaaa53e3f65fe4165ce912c1619b49f39655300fb",
	"0xaac0aa431c237c2c0b5f041c8e59b3f1a43ac78f",
	"0xaae1478ee9f89f07c789e7d2c3647e606cfb0386",
	"0xab47329b3ca2e5bab139f8a34067c11449d4ae19",
	"0xaba9a8776c462e2853f7eb28e246ccea527f6943",
	"0xabeaa41fd6a7464b1203b24486526b0461a5cea4",
	"0xac30115df144e88d3a22761bb002e728349ef232",
	"0xac3411717fdcf6fee99a9f852781ddfb8b70c1bc",
	"0xad6ceebf622314386b4821af3d8b8f6972ed0e32",
	"0xae10875367f6f4c61c3dfbe9d112619ac6917d45",
	"0xae30d834be2dc2f67d809dde43eeec346bba892a",
	"0xaf8c992578bcd951bd9d92e12220eb8bcfbf6539",
	"0xb03f5438f9a243de5c3b830b7841ec315034cd5f",
	"0xb0720a40d6335df0ac90ff9e4b755217632ca78c",
	"0xb0bcd27acb5e7eeadb701d4443cc7edc635e2994",
	"0xb1a29cc83536dc4c4149e487b3454b77ce1be6ee",
	"0xb2d8f9f4137d5649fba9cd71d451e96603541a89",
	"0xb3eab1278ce109aec27ed7c822f09f67bda19caa",
	"0xb43fb3e80ae805fcb8a76160cd3f10e48ee3a019",
	"0xb45832ac58767f40d44f88c6ad26ebc5b3047a75",
	"0xb47e83e60fdc6a56f5611d2ae369019405bd47e5",
	"0xb5a36603326df7994241f2e1d38b25135b680cc7",
	"0xb687fad4248de4d20e10d16cf36608eef74e8997",
	"0xb6da08cd77da865e99bba2868aac74ea2cd58162",
	"0xb744bea7e6892c380b781151554c7ebcc764910b",
	"0xb818e7d50bb2364c3c82e8e30b35f6a074c5413e",
	"0xb957dccaa1ccfb1eb78b495b499801d591d8a403",
	"0xba358136836ae1351d40bbe898f2bcd719f205f4",
	"0xbaa32387bd55553ec806622d524b12bbb8242a19",
	"0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50",
	"0xc0c21f1ae0c7c194a76168288dd251e0cd551ac4",
	"0xc1017ace98795ceb701251ec98b0d76d1d689c01",
	"0xc19105f21f353f6a457a7c4ca1feab6f1199c7bf",
	"0xc36ed8a273bec828fdd8f4697d75a279431d57ad",
	"0xc3ad78caa7984ecabb06c6bd4934c3d8e9efd593",
	"0xc3d6f21c79c2567a1858d8b93a4edbd9db399d9d",
	"0xc6c6c38f00741daf4180ecf7aa43f94368272f65",
	"0xc6e34e7bee3c459c99412ece5ec409caf4c9a372",
	"0xc71bc2e4f9ea287cf73b294aa16f74a5b5480dc0",
	"0xc7636c5e8ae9f8c2c79b15ab2e727c7bc7d146d9",
	"0xc7ac422595da7c1aef9e2f1119a015272c27faf7",
	"0xc8ccf63be989076fc699f52664b46fd247abaecd",
	"0xc9542bc5003e22fd7a87ec9fa8d9a8d76ddbee64",
	"0xc9bf6864339a648c17f3205285cf8e1c8ddebd9b",
	"0xc9c2c47494cef2b801e56c38299ebf5ab5bf3adf",
	"0xcac0eb798903ffe73ab1776da3174e6e40e721c6",
	"0xcada4bcf6d2a32481eb9edd8e6657214ee0b6126",
	"0xcb6cf65c6be2d3e094828223d8225f0ee0f8e3ac",
	"0xcc4e62029e0491a61a7ac1b60ab1721f6df841e3",
	"0xcd0b0aee446c17988525fe9645ccf93622e50d17",
	"0xcd94b66bcfb70c8d56f1c6e0a3de10742faa0eef",
	"0xcde4df56cc96eaf90d5246d0e3c27b0c1174cc15",
	"0xce5a9c9775e47c6df3ef4eac865ae3741d11fa33",
	"0xcea3b38ba474a92202611547615b749212f50967",
	"0xcfcca7aea9e403744858c53e13adf8975db9038b",
	"0xd001a6ae65e88867ecc5c8c1fe68108511c6b344",
	"0xd010ab6883d1f16441a1c53b1618a8800eeb2cf3",
	"0xd1f2739ad714045be6146915275d0a2b822ec1cc",
	"0xd2406ad7fb9eae64d43e16ed49076f5d39209a89",
	"0xd59228cea6d813012c58a3e74c7dcfe5dcaa137e",
	"0xd5b449ea979d9bc595a3b5c2bb4b0a1d1d730866",
	"0xd84e11bee5d555ccd905817cb8cbbd5b6e6c4f0d",
	"0xd9a2614ff0f2139d63df23dd1f4782d20323da67",
	"0xda3d5f26ccba56a5e5e36607c9824834c1c586ce",
	"0xdb714714f05ce065fbbff0444130f4ccd1936482",
	"0xdb9f34d96ccf206d2f07c59f03f382ea4250d8ee",
	"0xdc5d3004426d36323f40b3fabe8c50ff6e11adc5",
	"0xdc880af08a101fcc3da95f873155c1c6fe25c4c7",
	"0xdfa497551f03a4dfc26e686cc5d80df1397992ff",
	"0xe03328b604e2cacc4e5e512dcef97938a7f09e48",
	"0xe03e5a23c93d7bfc98755db641c2321ea8555314",
	"0xe0430c83f34b4d722636ec1988412f756b1cee4d",
	"0xe0e897edc5245201064b97d93d21876a9ae29dd9",
	"0xe27c6d0626c87faa401dd55f9d8bbc99076273d5",
	"0xe2e77b90da44c4f3f793f099ccbaa143e8a9fc8f",
	"0xe33644c3c2f7cd27f56c5e841f2f963d1b6d655f",
	"0xe4390e398f6e0bddfae605d079841191ed0e8a06",
	"0xe456f33a10c423c6e0296aa14c2762595ac255e7",
	"0xe468deccec9c452199139ec9b3fcfa0918982dbb",
	"0xe53befb50c7a5d8392246506ff3e5a8e66eb5100",
	"0xe6882e6093a69c47fc21426c2dfdb4a08eb2dec8",
	"0xe6ba1be7ba3e8b9e819ea0014e8a712f5edc586b",
	"0xe76293614c4f9318225bb8d4b3bb5f2a0ca409b9",
	"0xe9bd9bce3b1ab61f380547ebac49b4d0bfae1c0c",
	"0xeb4576fe753dab07635c0bb6c8f0a355e1db5d31",
	"0xeb62eae6d396ff145810f9f99d2c0fb94f3f1fc7",
	"0xecb1a3aa9fa462e30eb2a88ebd7de40a74a06795",
	"0xee8787aa507958905edbd99ccdc53f223d4b60b1",
	"0xef532911656c39c6bc23fbabd05f816055949cf7",
	"0xeffe0c909fd3d8cd2e83cebfc92744447431da85",
	"0xf0dd673bd6f8d87d66b0f78a8a0ddb14baa51efa",
	"0xf13e4a9f8ba72ad91f26b71c7b57dbfff9a8d550",
	"0xf3bd66ca9b2b43f6aa11afa6f4dfdc836150d973",
	"0xf43f6b9bf1a88075a3fa4a8791958586ea199da5",
	"0xf463968e8e07e3039ba265751ba36fc3b61f880a",
	"0xf52afbcea01039a60d2daa465112e3bc04a939de",
	"0xf5659d33af64b5b987f048a4ba7cfca1c96f7f7a",
	"0xf5894d2339ae08b4f9d3a09e10da129960f1d53a",
	"0xf6ae2ad155bfea6b95d9a7610c0d06ea854dafa4",
	"0xf85385347f56819c316939434d427d0c9537eddc",
	"0xf856034e9264f13ac8b5140f43068604c9ae41e8",
	"0xf8cbde834e9fed2c4baf4926a174868234ebdd9b",
	"0xf913798c220cf4d20c1bc4676fa7221a997a3da5",
	"0xfa4843c82789f00311e6ae1b67f35849b6a9f7fd",
	"0xfba77704280f1ceef0ea5fb1c215c600648b41ed",
	"0xfc93ee9e8d2a16e6ae4308ec9482ad3178c23ea5",
	"0xfdb714222de5bfd1fb0571b22878a52488c46538",
	"0xfe6086eed8255df2329913faa7f699084ec9068f",
	"0xfebd4a70aeaa0e335e0ded66eb3a33c3c425010d",
	"0xff26ccf9058b9bd8facfb6a8876864fec193285d",
	"0xff401c4aef18b8141cf9711b67e9658c1be9520c",
	"0xff5dba627ccd55c61c55db9ec6490051f3fbce13",
	"0xffcfa5f7b994aeb4c6931e0a6cd95d8984e038ce",
	"0xfffb6f497d6f36ef546e1122299a6c4e6af7d5a3",		
]; 
const SENDER_ADDRESS = process.env.L1VEFXS_PROVER_ADDRESS_ROPSTEN_10;
const PKEY = process.env.L1VEFXS_PROVER_PRIVATE_KEY;
const SLEEP_MSECS = 1000;
const BULK_BATCH_INTERVAL = 50;
const USE_MANUAL_ADDRESS_LIST = true;
const OFFSET = 0;
const GAS_PRICE = 7000000000; // 7 Gwei
const GAS_LIMIT = 250000;
const VEFPIS_CUTOFF_BN = BigNumber.from("10000000000000000000"); // 10e18
const VEFPIS_CUTOFF_DEC = VEFPIS_CUTOFF_BN.div("1000000000000000000").toNumber();
const BIG18 = BigNumber.from("1000000000000000000"); // 1e18 

// Helpful: https://github.com/FraxFinance/fraxtal-proof-client
async function main() {
	// Initialize the providers and wallets
	const mainnetProvider = new JsonRpcProvider(process.env.ETHEREUM_NETWORK_ENDPOINT);
	const mainnetWallet = new Wallet(PKEY, mainnetProvider);

	// Initialize the main response
	const mainResponse = [];

	// Instantiate the contracts
	let vefpis = new Contract(CONTRACT_ADDRESSES.ethereum.main.veFPIS, VEFPIS_ABI, mainnetWallet);
	let yieldDistributor = new Contract("0xE6D31C144BA99Af564bE7E81261f7bD951b802F6", YIELD_DISTRIBUTOR_ABI, mainnetWallet);

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

		// Remove expired positions and amounts under VEFPIS_CUTOFF_BN
		for (let i = OFFSET; i < users.length; i++) {
			// Get the user object
			const theUser = users[i];

			// Get the amount and end time
			const usrAmount = theUser.vefxsBalance;
			const usrEndMs = Date.parse(theUser.lockEndsAt);

			// Reject if the amount is below the cutoff, or if the position is expired
			if ((usrAmount < VEFPIS_CUTOFF_DEC) || (usrEndMs <= Date.now())){
				continue;
			} else {
				addressesToUse.push(theUser.address);
			}
		}

		// Determine how many bulk batches to use
		numBatches = Math.ceil(addressesToUse.length / BULK_BATCH_INTERVAL);

		console.log(`Found ${addressesToUse.length} unexpired veFPIS users above ${VEFPIS_CUTOFF_DEC} veFPIS`);
		console.log(`numBatches: ${numBatches}`);
		console.log(addressesToUse);
	}

	// PROCESS USERS
	// ==============================================
	
	// Nonce tracking
	let availableNonceMainnet = await mainnetProvider.getTransactionCount(SENDER_ADDRESS);
	console.log(`availableNonceMainnet: ${availableNonceMainnet}`);

	// Loop through the addresses
	let bulkAddressesToCheckpoint = [];
	for (let i = 0; i < addressesToUse.length; i++) {
		// Initialize the user
		const userAddress = addressesToUse[i];

		console.log(chalk.blue(`\n================= PROCESSING USER ${userAddress} [#${i} IN JSON] =================`));
		
		// // Fetch the user's active locks
		// const activeLocks = await vefpis.getAllCurrActiveLocks(userAddress, false, { gasLimit: '50000000' });
		// console.log(`Number of active locks: ${activeLocks.length}`);

		// // Fetch the user's checkpointed endpoint
		// const checkpointedEndTs = await yieldDistributor.userVeFXSEndpointCheckpointed(userAddress, { gasLimit: '50000000' });
		// const endCheckpointBig = BigNumber.from(checkpointedEndTs);
		// const endCheckpointDec = checkpointedEndTs.toNumber();
		// console.log(`Ending checkpoint: ${endCheckpointDec}`);

		// // See if the user needs to be checkpointed
		// // --------------------------------

		// // Loop through the user locks. userVeFXSEndpointCheckpointed needs to match one of the locks
		// let needToCheckpoint = true;
		// console.log(`----- Locks -----`);
		// for (let j = 0; j < activeLocks.length; j++) {
		// 	// Get the lock
		// 	const theLock = activeLocks[j];
			
		// 	// Print info
		// 	console.log(`Lock #${j} @ ${LOCK_LOCATIONS[theLock.location.toLowerCase()]} || amount ${theLock.amount.div(BIG18).toNumber()} end: ${theLock.end.toNumber()}`);
		// 	console.log(`  -- amount ${theLock.amount.div(BIG18).toNumber()}`);
		// 	console.log(`  -- end: ${theLock.end.toNumber()}`);

		// 	// See if there is a match
		// 	if (theLock.end.eq(checkpointedEndTs)) {
		// 		needToCheckpoint = false;
		// 		console.log(chalk.yellow(`  -- Match found, no need to checkpoint, so far`));
		// 		break;
		// 	}
		// }

		// // Also see if veFXS increased
		// console.log(`----- veFXS -----`);
		// if (!needToCheckpoint) {
		// 	// See the aggregator's current total combined veFXS
		// 	const currAggregatorVeFXS = await vefpis.ttlCombinedVeFXS(userAddress, { gasLimit: '50000000' });

		// 	// See the checkpointed veFXS
		// 	const checkpointedVeFXS = await yieldDistributor.userVeFXSCheckpointed(userAddress, { gasLimit: '50000000' });

		// 	// Print info
		// 	console.log(`  -- vefpis: ${currAggregatorVeFXS.div(BIG18).toNumber()}`);
		// 	console.log(`  -- YieldDistributor: ${checkpointedVeFXS.div(BIG18).toNumber()}`);

		// 	// If the current veFXS > checkpointed veFXS, you should checkpoint
		// 	if (currAggregatorVeFXS.gt(checkpointedVeFXS)) {
		// 		needToCheckpoint = true;
		// 		console.log(chalk.hex('#FFA500')(`  -- Aggregator veFXS > Checkpointed veFXS, so you should checkpoint`));
		// 	} else {
		// 		needToCheckpoint = false;
		// 		console.log(chalk.green(`  -- Checkpointed veFXS > Aggregator veFXS, so don't need to checkpoint`));
		// 	}
		// } else {
		// 	console.log(chalk.hex('#FFA500')(`  -- No match found, so you need to checkpoint`));
		// }

		// Checkpoint if you need to
		// TODO: Override for now
		needToCheckpoint = true;
		if (needToCheckpoint) {
			// If you are going the bulk route, add the address for later
			try {
				console.log(`Trying to checkpoint with nonce ${availableNonceMainnet}`);

				console.log(`Sending tx`);
				const tx = await yieldDistributor.checkpointOtherUser(
					userAddress 
				, { 
					gasLimit: GAS_LIMIT,
					gasPrice: GAS_PRICE,
					nonce: availableNonceMainnet
				});

				console.log(`Checkpoint for ${userAddress} submitted with nonce ${availableNonceMainnet}`);
				console.log(`TxID: ${tx.hash}`);

				// Increment the nonce
				availableNonceMainnet++;

			} catch (err) {
				console.log(`yieldDistributor.checkpointOtherUser failed for ${userAddress}: ${err}`);
			}
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


