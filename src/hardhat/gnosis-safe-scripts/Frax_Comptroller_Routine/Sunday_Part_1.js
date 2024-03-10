const path = require("path");
const envPath = path.join(process.cwd(), "../../../.env");
require("dotenv").config({ path: envPath });
const { ethers } = require("hardhat");

// const { BigNumber } = require("@ethersproject/bignumber");
const util = require("util");
const chalk = require("chalk");
const fse = require("fs-extra");
const { formatUnits } = require("ethers");
const { BIG6, BIG18, stringifyReplacer, serializeJSONObject, calculateChecksum, GetCVXMintAmount } = require("../utils/utils");
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

	// Useful info to use later
	const summary_info = {
		crv_to_save: BigInt(0),
		crv_to_convert_to_cvxcrv: BigInt(0),
		crv_to_send_to_curve_voter_proxy: BigInt(0),
		crv_new_voter_proxy_add_done: false,
		crv_to_sell: BigInt(0),
		cvx_to_lock: BigInt(0),
		cvx_new_lock_done: false,
		cvx_to_sell: BigInt(0),
		"3crv_direct_collected": BigInt(0),
		cvxcrv_direct_collected: BigInt(0),
	}

	console.log(`Using env file from ${envPath}`);
	const thisBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());


	// // ===============================================================
	// // ===================== WEEKLY veFXS YIELD ======================
	// // ===============================================================

	// // Approve for weekly veFXS rewards
	// // =====================================
	// batch_json.transactions.push({
	// 	"to": "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0",
	// 	"value": "0",
	// 	"data": null,
	// 	"contractMethod": {
	// 		"inputs": [
	// 			{
	// 				"internalType": "address",
	// 				"name": "spender",
	// 				"type": "address"
	// 			},
	// 			{
	// 				"internalType": "uint256",
	// 				"name": "amount",
	// 				"type": "uint256"
	// 			}
	// 		],
	// 		"name": "approve",
	// 		"payable": false
	// 	},
	// 	"contractInputsValues": {
	// 		"spender": "0xc6764e58b36e26b08Fd1d2AeD4538c02171fA872",
	// 		"amount": "3250000000000000000000"
	// 	}
	// });

	// // NotifyRewardAmount for weekly veFXS rewards
	// // =====================================
	// batch_json.transactions.push({
	// 	"to": "0xc6764e58b36e26b08Fd1d2AeD4538c02171fA872",
	// 	"value": "0",
	// 	"data": null,
	// 	"contractMethod": {
	// 		"inputs": [
	// 			{
	// 				"internalType": "uint256",
	// 				"name": "amount",
	// 				"type": "uint256"
	// 			},
	// 		],
	// 		"name": "notifyRewardAmount",
	// 		"payable": false
	// 	},
	// 	"contractInputsValues": {
	// 		"amount": "3250000000000000000000"
	// 	}
	// });


	// ===============================================================
	// =========================== CONVEX ============================
	// ===============================================================

	// Convex AMO rewards (collect)
	// =====================================
	// Record the amount of CRV and CVX earned first
	// Get CVX total supply
	const ERC20_json_path = path.join(__dirname, '../../artifacts/contracts/ERC20/ERC20.sol/ERC20.json');
	const { abi: ERC20_ABI } = JSON.parse( await fse.readFileSync(ERC20_json_path, 'utf-8'));
	const cvx = new ethers.Contract("0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b", ERC20_ABI).connect(owner);
	const cvx_total_supply = BigInt(await cvx.totalSupply());
	// console.log(cvx_total_supply.toString());

	// // Get CRV rewards
	// const IConvexAMO_Old_json_path = path.join(__dirname, '../../artifacts/contracts/Misc_AMOs/IConvexAMO_Old.sol/IConvexAMO_Old.json');
	// const { abi: IConvexAMO_Old_ABI } = JSON.parse( await fse.readFileSync(IConvexAMO_Old_json_path, 'utf-8'));
	// const convex_amo = new ethers.Contract("0x49ee75278820f409ecd67063D8D717B38d66bd71", IConvexAMO_Old_ABI).connect(owner);
	// const convex_amo_rewards = await convex_amo.showRewards();
	// const crv_from_convex_amo = BigInt(convex_amo_rewards[0]);
	// const cvx_from_convex_amo = GetCVXMintAmount(crv_from_convex_amo, cvx_total_supply);
	// console.log(`----------- Convex AMO (FRAX3CRV) -----------`);
	// console.log(`CRV: ${formatUnits(crv_from_convex_amo, 18)}`);
	// console.log(`CVX: ${formatUnits(cvx_from_convex_amo, 18)}`);
	// summary_info.crv_to_sell = summary_info.crv_to_sell.add(crv_from_convex_amo);
	// summary_info.cvx_to_lock = summary_info.cvx_to_lock.add(cvx_from_convex_amo);

	// batch_json.transactions.push({
	// 	"to": "0x49ee75278820f409ecd67063D8D717B38d66bd71",
	// 	"value": "0",
	// 	"data": null,
	// 	"contractMethod": {
	// 		"inputs": [],
	// 		"name": "claimRewardsFRAX3CRV",
	// 		"payable": false
	// 	},
	// 	"contractInputsValues": null
	// });

	// // Convex AMO rewards (withdraw)
	// // =====================================
	// batch_json.transactions.push({
	// 	"to": "0x49ee75278820f409ecd67063D8D717B38d66bd71",
	// 	"value": "0",
	// 	"data": null,
	// 	"contractMethod": {
	// 		"inputs": [
	// 			{
	// 			  "internalType": "uint256",
	// 			  "name": "crv_amt",
	// 			  "type": "uint256"
	// 			},
	// 			{
	// 			  "internalType": "uint256",
	// 			  "name": "cvx_amt",
	// 			  "type": "uint256"
	// 			},
	// 			{
	// 			  "internalType": "uint256",
	// 			  "name": "cvxCRV_amt",
	// 			  "type": "uint256"
	// 			},
	// 			{
	// 			  "internalType": "uint256",
	// 			  "name": "fxs_amt",
	// 			  "type": "uint256"
	// 			}
	// 		  ],
	// 		"name": "withdrawRewards",
	// 		"payable": false
	// 	},
	// 	"contractInputsValues": {
	// 		"crv_amt": crv_from_convex_amo.toString(),
	// 		"cvx_amt": cvx_from_convex_amo.toString(),
	// 		"cvxCRV_amt": "0",
	// 		"fxs_amt": "0",
	// 	}
	// });

	// Curve Voter Proxy (withdraw 3CRV rewards)
	// TODO

	// Curve Voter Proxy rewards (claim rewards)
	// =====================================
	// batch_json.transactions.push({
	// 	"to": "0x847FA1A5337C7f24D7066E467F2e2A0f969Ca79F",
	// 	"value": "0",
	// 	"data": null,
	// 	"contractMethod": {
	// 		"inputs": [
	// 			{
	// 				"internalType": "address[]",
	// 				"name": "_gauges",
	// 				"type": "address[]"
	// 			}
	// 		],
	// 		"name": "claimEverything",
	// 		"payable": false
	// 	},
	// 	"contractInputsValues": {
	// 		"_gauges": "[\"0x2932a86df44Fe8D2A706d8e9c5d51c24883423F5\", \"0xCFc25170633581Bf896CB6CDeE170e3E3Aa59503\"]"
	// 	}
	// });

	// Convex Frax FRAX/USDC (stkcvxFRAXBP) rewards
	// ================================================================
	const IStakingProxyConvex = path.join(__dirname, '../../artifacts/contracts/Misc_AMOs/convex/IStakingProxyConvex.sol/IStakingProxyConvex.json');
	const { abi: IStakingProxyConvex_ABI } = JSON.parse( await fse.readFileSync(IStakingProxyConvex, 'utf-8'));
	const convex_frax_usdc_staking_proxy = new ethers.Contract("0x2AA609715488B09EFA93883759e8B089FBa11296", IStakingProxyConvex_ABI).connect(owner);
	const convex_frax_usdc_rewards = await convex_frax_usdc_staking_proxy.earned();
	const crv_from_convex_frax_usdc = BigInt(convex_frax_usdc_rewards[1][1]);
	const cvx_from_convex_frax_usdc = BigInt(convex_frax_usdc_rewards[1][2]);
	
	// FRAXBP rewards: 0% of CRV and 100% of CVX is saved/reinvested
	summary_info.crv_to_save = summary_info.crv_to_save + ((crv_from_convex_frax_usdc * BigInt(0)) / BigInt(1000)); // 0%
	summary_info.crv_to_sell = summary_info.crv_to_sell + ((crv_from_convex_frax_usdc * BigInt(1000)) / BigInt(1000)); // 100%
	summary_info.cvx_to_lock = summary_info.cvx_to_lock + (cvx_from_convex_frax_usdc);
	console.log(`----------- Convex Frax FRAX/USDC (stkcvxFRAXBP) -----------`);
	console.log(`CRV: ${formatUnits(crv_from_convex_frax_usdc, 18)}`);
	console.log(`CVX: ${formatUnits(cvx_from_convex_frax_usdc, 18)}`);

	// =====================================
	batch_json.transactions.push({
		"to": "0x2AA609715488B09EFA93883759e8B089FBa11296",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": null
	});


	// Convex Frax FRAX/USDP (stkcvxFRAXUSDP) rewards
	// ================================================================
	const convex_frax_usdp_staking_proxy = new ethers.Contract("0xD25D60aBafC220dd6F7BA37baD23e1105Db05a06", IStakingProxyConvex_ABI).connect(owner);
	const convex_frax_usdp_rewards = await convex_frax_usdp_staking_proxy.earned.staticCall();
	const crv_from_convex_frax_usdp = BigInt(convex_frax_usdp_rewards[1][1]);
	const cvx_from_convex_frax_usdp = BigInt(convex_frax_usdp_rewards[1][2]);
	
	// FRAXUSDP Rewards: Sell all
	summary_info.crv_to_sell = summary_info.crv_to_sell + crv_from_convex_frax_usdp;
	summary_info.cvx_to_sell = summary_info.cvx_to_sell + cvx_from_convex_frax_usdp;
	console.log(`----------- Convex Frax FRAX/USDP (stkcvxFRAXUSDP) -----------`);
	console.log(`CRV: ${formatUnits(crv_from_convex_frax_usdp, 18)}`);
	console.log(`CVX: ${formatUnits(cvx_from_convex_frax_usdp, 18)}`);

	// =====================================
	batch_json.transactions.push({
		"to": "0xD25D60aBafC220dd6F7BA37baD23e1105Db05a06",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": null
	});


	// // Convex Frax Frax/FPI (stkcvxFPIFRAX) rewards
	// const convex_frax_fpi_staking_proxy = new ethers.Contract("0x2df2378103baB456457329D4C603440B92b9c0bd", IStakingProxyConvex_ABI).connect(owner);
	// const convex_frax_fpi_rewards = await convex_frax_fpi_staking_proxy.earned();
	// const crv_from_convex_frax_fpi = BigInt(convex_frax_fpi_rewards[1][1]);
	// const cvx_from_convex_frax_fpi = BigInt(convex_frax_fpi_rewards[1][2]);
	// summary_info.crv_to_sell = summary_info.crv_to_sell.add(crv_from_convex_frax_fpi);
	// summary_info.cvx_to_sell = summary_info.cvx_to_sell.add(cvx_from_convex_frax_fpi);
	// console.log(`----------- Convex Frax FRAX/FPI (stkcvxFPIFRAX) -----------`);
	// console.log(`CRV: ${formatUnits(crv_from_convex_frax_fpi, 18)}`);
	// console.log(`CVX: ${formatUnits(cvx_from_convex_frax_fpi, 18)}`);
	// // =====================================
	// batch_json.transactions.push({
	// 	"to": "0x2df2378103baB456457329D4C603440B92b9c0bd",
	// 	"value": "0",
	// 	"data": null,
	// 	"contractMethod": {
	// 		"inputs": [],
	// 		"name": "getReward",
	// 		"payable": false
	// 	},
	// 	"contractInputsValues": null
	// });

	// Convex Curve (cvxLP) Claim All (excluding cvxCRV and locked CVX)
	// =====================================
	const IConvexBaseRewardPool = path.join(__dirname, '../../artifacts/contracts/Misc_AMOs/convex/IConvexBaseRewardPool.sol/IConvexBaseRewardPool.json');
	const { abi: IConvexBaseRewardPool_ABI } = JSON.parse( await fse.readFileSync(IConvexBaseRewardPool, 'utf-8'));
	const convex_cvxcrvfrax_brp = new ethers.Contract("0x7e880867363A7e321f5d260Cade2B0Bb2F717B02", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxcrvfrax_usdp_brp = new ethers.Contract("0x6991C1CD588c4e6f6f1de3A0bac5B8BbAb7aAF6d", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxalusd_frax3CRV = new ethers.Contract("0x26598e3E511ADFadefD70ab2C3475Ff741741104", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxgusd_frax3CRV = new ethers.Contract("0x47809eE386D1dEC29c0b13f21ba30F564517538B", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxlusd_frax3CRV = new ethers.Contract("0x053e1dad223A206e6BCa24C77786bb69a10e427d", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxFRAXFPI = new ethers.Contract("0x062450B06EB92F1C4E227C41c987ed97c93Ae232", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxFRAXPYUSD = new ethers.Contract("0xB10a6e39Ed8a66fEd3aAef3866a95611a49B9a95", IConvexBaseRewardPool_ABI).connect(owner);
	const convex_cvxFRAXsDAI = new ethers.Contract("0xE627082369689b2B86D948c377A4aE4e739C59eE", IConvexBaseRewardPool_ABI).connect(owner);


	// Get earned CRV
	const cvx_crv_claim_all_rews = await Promise.all([
		convex_cvxcrvfrax_brp.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxcrvfrax_usdp_brp.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxalusd_frax3CRV.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxgusd_frax3CRV.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxlusd_frax3CRV.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxFRAXFPI.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxFRAXPYUSD.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
		convex_cvxFRAXsDAI.earned("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27"),
	])

	// FRAXBP rewards get saved/reinvested, everything else is sold.
	// CRV
	// summary_info.crv_to_save = summary_info.crv_to_save.add(cvx_crv_claim_all_rews[0]);
	summary_info.crv_to_sell = summary_info.crv_to_sell
		 + cvx_crv_claim_all_rews[0]
		 + cvx_crv_claim_all_rews[1]
		 + cvx_crv_claim_all_rews[2]
		 + cvx_crv_claim_all_rews[3]
		 + cvx_crv_claim_all_rews[4]
		 + cvx_crv_claim_all_rews[5]
		 + cvx_crv_claim_all_rews[6]
		 + cvx_crv_claim_all_rews[7];

	// CVX
	summary_info.cvx_to_lock = summary_info.cvx_to_lock + GetCVXMintAmount(cvx_crv_claim_all_rews[0], cvx_total_supply)
	summary_info.cvx_to_sell = summary_info.cvx_to_sell 
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[1], cvx_total_supply)
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[2], cvx_total_supply)
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[3], cvx_total_supply)
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[4], cvx_total_supply)
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[5], cvx_total_supply)
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[6], cvx_total_supply)
		+ GetCVXMintAmount(cvx_crv_claim_all_rews[7], cvx_total_supply);

	console.log(`----------- Convex Curve Others -----------`);
	console.log(`convex_cvxcrvfrax_brp: ${formatUnits(cvx_crv_claim_all_rews[0], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[0], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxcrvfrax_usdp_brp: ${formatUnits(cvx_crv_claim_all_rews[1], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[1], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxalusd_frax3CRV: ${formatUnits(cvx_crv_claim_all_rews[2], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[2], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxgusd_frax3CRV: ${formatUnits(cvx_crv_claim_all_rews[3], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[3], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxlusd_frax3CRV: ${formatUnits(cvx_crv_claim_all_rews[4], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[4], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxFRAXFPI: ${formatUnits(cvx_crv_claim_all_rews[5], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[5], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxFRAXPYUSD: ${formatUnits(cvx_crv_claim_all_rews[6], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[6], cvx_total_supply), 18)} CVX`); 
	console.log(`convex_cvxFRAXsDAI: ${formatUnits(cvx_crv_claim_all_rews[7], 18)} CRV, ${formatUnits(GetCVXMintAmount(cvx_crv_claim_all_rews[7], cvx_total_supply), 18)} CVX`); 


	batch_json.transactions.push({
		"to": "0x3f29cB4111CbdA8081642DA1f75B3c12DECf2516",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address[]",
					"name": "rewardContracts",
					"type": "address[]"
				},
				{
					"internalType": "address[]",
					"name": "extraRewardContracts",
					"type": "address[]"
				},
				{
					"internalType": "address[]",
					"name": "tokenRewardContracts",
					"type": "address[]"
				},
				{
					"internalType": "address[]",
					"name": "tokenRewardTokens",
					"type": "address[]"
				},
				{
					"internalType": "uint256",
					"name": "depositCrvMaxAmount",
					"type": "uint256"
				},
				{
					"internalType": "uint256",
					"name": "minAmountOut",
					"type": "uint256"
				},
				{
					"internalType": "uint256",
					"name": "depositCvxMaxAmount",
					"type": "uint256"
				},
				{
					"internalType": "uint256",
					"name": "spendCvxAmount",
					"type": "uint256"
				},
				{
					"internalType": "uint256",
					"name": "options",
					"type": "uint256"
				}
			],
			"name": "claimRewards",
			"payable": false
		},
		"contractInputsValues": {
			"rewardContracts": "[\"0x7e880867363A7e321f5d260Cade2B0Bb2F717B02\", \"0x6991C1CD588c4e6f6f1de3A0bac5B8BbAb7aAF6d\", \"0x26598e3E511ADFadefD70ab2C3475Ff741741104\", \"0x47809eE386D1dEC29c0b13f21ba30F564517538B\", \"0x053e1dad223A206e6BCa24C77786bb69a10e427d\", \"0x062450B06EB92F1C4E227C41c987ed97c93Ae232\", \"0xB10a6e39Ed8a66fEd3aAef3866a95611a49B9a95\", \"0xE627082369689b2B86D948c377A4aE4e739C59eE\"]",
			"extraRewardContracts": "[]",
			"tokenRewardContracts": "[]",
			"tokenRewardTokens": "[]",
			"depositCrvMaxAmount": "0",
			"minAmountOut": "0",
			"depositCvxMaxAmount": "0",
			"spendCvxAmount": "0",
			"options": "0",
		}
	});

	// Convex Staked cvxCRV rewards (in 3CRV)
	// TODO: 3CRV in. Seems complex
	// =====================================
	batch_json.transactions.push({
		"to": "0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address",
					"name": "_account",
					"type": "address"
				}
			],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": {
			"_account": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
		}
	});

	// Convex Locked CVX rewards
	// =====================================
	const ICvxLockerV2_json_path = path.join(__dirname, '../../artifacts/contracts/Misc_AMOs/convex/ICvxLockerV2.sol/ICvxLockerV2.json');
	const { abi: ICvxLockerV2_ABI } = JSON.parse( await fse.readFileSync(ICvxLockerV2_json_path, 'utf-8'));
	let cvx_locker = new ethers.Contract("0x72a19342e8F1838460eBFCCEf09F6585e32db86E", ICvxLockerV2_ABI).connect(owner);;
	const locked_cvx_rewards = await cvx_locker.claimableRewards("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27");
	summary_info.cvxcrv_direct_collected = summary_info.cvxcrv_direct_collected + locked_cvx_rewards[0][1];
	console.log(`----------- Convex Curve Others -----------`);
	console.log(`cvxcrv_direct_collected: ${formatUnits(locked_cvx_rewards[0][1], 18)} cvxCRV`); 

	batch_json.transactions.push({
		"to": "0x72a19342e8F1838460eBFCCEf09F6585e32db86E",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address",
					"name": "_account",
					"type": "address"
				},
			],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": {
			"_account": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
		}
	});

	// Convex Prisma
	// =====================================
	batch_json.transactions.push({
		"to": "0x0c73f1cFd5C9dFc150C8707Aa47Acbd14F0BE108",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address",
					"name": "_account",
					"type": "address"
				},
			],
			"name": "getReward",
			"payable": false
		},
		"contractInputsValues": {
			"_account": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
		}
	});

	// Relock expired locked CVX
	// =====================================
	// Determine if you need to process expired locks
	const cvx_lock_status = await cvx_locker.lockedBalances("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27");
	const PROCESS_EXPIRED_LOCKS = (BigInt(cvx_lock_status.unlockable) > BigInt(0));
	if (PROCESS_EXPIRED_LOCKS) {
		batch_json.transactions.push({
			"to": "0x72a19342e8F1838460eBFCCEf09F6585e32db86E",
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
						"internalType": "bool",
						"name": "_relock",
						"type": "bool"
					}
				],
				"name": "processExpiredLocks",
				"payable": false
			},
			"contractInputsValues": {
				"_relock": true,
			}
		});
	}
	else {
		console.log("No expired locks to process")
	}

	// ===============================================================
	// ============================ PRISMA ===========================
	// ===============================================================

	// PRISMA rewards
	// =====================================
	batch_json.transactions.push({
		"to": "0xC72bc1a8cf9b1A218386df641d8bE99B40436A0f",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address",
					"name": "account",
					"type": "address"
				}
			],
			"name": "claim",
			"payable": false
		},
		"contractInputsValues": {
			"account": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
		}
	});
	

	// ===============================================================
	// ===================== frxETH --> sfrxETH ======================
	// ===============================================================

	// frxETH to sfrxETH approve
	// =====================================
	const frxETH = new ethers.Contract("0x5E8422345238F34275888049021821E8E08CAa1f", ERC20_ABI).connect(owner);
	const frxETH_balance = await frxETH.balanceOf("0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27");
	const frxETH_balance_dec = formatUnits(frxETH_balance, 18);
	if (frxETH_balance_dec > 0) {
		batch_json.transactions.push({
			"to": "0x5E8422345238F34275888049021821E8E08CAa1f",
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
					  "internalType": "address",
					  "name": "spender",
					  "type": "address"
					},
					{
					  "internalType": "uint256",
					  "name": "amount",
					  "type": "uint256"
					}
				],
				"name": "approve",
				"payable": false
			},
			"contractInputsValues": {
				"spender": "0xac3E018457B222d93114458476f3E3416Abbe38F",
				"amount": frxETH_balance.toString(),
			}
		});
	
		// frxETH to sfrxETH deposit
		// =====================================
		batch_json.transactions.push({
			"to": "0xac3E018457B222d93114458476f3E3416Abbe38F",
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
						"internalType": "uint256",
						"name": "assets",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "receiver",
						"type": "address"
					}
				],
				"name": "deposit",
				"payable": false
			},
			"contractInputsValues": {
				"assets": frxETH_balance.toString(),
				"receiver": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
			}
		});
	}
	


	// ===============================================================
	// ============================ SADDLE ===========================
	// ===============================================================

	// Saddle rewards
	// =====================================
	batch_json.transactions.push({
		"to": "0x358fE82370a1B9aDaE2E3ad69D6cF9e503c96018",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address",
					"name": "gauge_addr",
					"type": "address"
				}
			],
			"name": "mint",
			"payable": false
		},
		"contractInputsValues": {
			"gauge_addr": "0xB2Ac3382dA625eb41Fc803b57743f941a484e2a6",
		}
	});

	// ===============================================================
	// ============================ TOKEMAK ===========================
	// ===============================================================
	// TODO, but very complicated

	
	// ===============================================================
	// ============================ UniV3 ============================
	// ===============================================================

	// UniV3 AMO Fees
	// =====================================
	batch_json.transactions.push({
		"to": "0x3814307b86b54b1d8e7B2Ac34662De9125F8f4E6",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [],
			"name": "collectFees",
			"payable": false
		},
		"contractInputsValues": null
	});

	// UniV3 NFTs
	// =====================================
	// Claim once every 4 weeks to save gas
	if ((Math.floor(Date.now() / 604800000) % 4) == 0) {
		// FRAX / FPI 0.3%
		batch_json.transactions.push({
			"to": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
			"value": "0",
			"data": null,
			"contractMethod": {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "tokenId",
                                "type": "uint256"
                            },
                            {
                                "internalType": "address",
                                "name": "recipient",
                                "type": "address"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount0Max",
                                "type": "uint128"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount1Max",
                                "type": "uint128"
                            }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "payable": true
            },
            "contractInputsValues": {
                "params": "[\"215775\",\"0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27\",\"340282366920938463463374607431768211455\",\"340282366920938463463374607431768211455\"]"
            }
		});

		// FRAX / FPIS 1%
		batch_json.transactions.push({
			"to": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
			"value": "0",
			"data": null,
			"contractMethod": {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "tokenId",
                                "type": "uint256"
                            },
                            {
                                "internalType": "address",
                                "name": "recipient",
                                "type": "address"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount0Max",
                                "type": "uint128"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount1Max",
                                "type": "uint128"
                            }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "payable": true
            },
            "contractInputsValues": {
                "params": "[\"219036\",\"0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27\",\"340282366920938463463374607431768211455\",\"340282366920938463463374607431768211455\"]"
            }
		});

		// FPIS / ETH 1%
		batch_json.transactions.push({
			"to": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
			"value": "0",
			"data": null,
			"contractMethod": {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "tokenId",
                                "type": "uint256"
                            },
                            {
                                "internalType": "address",
                                "name": "recipient",
                                "type": "address"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount0Max",
                                "type": "uint128"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount1Max",
                                "type": "uint128"
                            }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "payable": true
            },
            "contractInputsValues": {
                "params": "[\"219099\",\"0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27\",\"340282366920938463463374607431768211455\",\"340282366920938463463374607431768211455\"]"
            }
		});

		// FRAX / FXS 1%
		batch_json.transactions.push({
			"to": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
			"value": "0",
			"data": null,
			"contractMethod": {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "tokenId",
                                "type": "uint256"
                            },
                            {
                                "internalType": "address",
                                "name": "recipient",
                                "type": "address"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount0Max",
                                "type": "uint128"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount1Max",
                                "type": "uint128"
                            }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "payable": true
            },
            "contractInputsValues": {
                "params": "[\"304636\",\"0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27\",\"340282366920938463463374607431768211455\",\"340282366920938463463374607431768211455\"]"
            }
		});

		// FRAX / frxETH 1%
		batch_json.transactions.push({
			"to": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
			"value": "0",
			"data": null,
			"contractMethod": {
                "inputs": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "tokenId",
                                "type": "uint256"
                            },
                            {
                                "internalType": "address",
                                "name": "recipient",
                                "type": "address"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount0Max",
                                "type": "uint128"
                            },
                            {
                                "internalType": "uint128",
                                "name": "amount1Max",
                                "type": "uint128"
                            }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "payable": true
            },
            "contractInputsValues": {
                "params": "[\"419023\",\"0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27\",\"340282366920938463463374607431768211455\",\"340282366920938463463374607431768211455\"]"
            }
		});
	}


	// ===============================================================================
	// ============================= CALCULATE SELL STUFF ============================
	// ===============================================================================
	// CRV (For SAVED CRV, 100% goes to voter proxy for now. We are not adding to our cvxCRV stake)
	summary_info.crv_to_convert_to_cvxcrv = (summary_info.crv_to_save * BigInt(0)) / (BigInt(100)); // 0%
	summary_info.crv_to_send_to_curve_voter_proxy = (summary_info.crv_to_save * BigInt(0)) / (BigInt(100)); // 0%
	summary_info.crv_to_save = BigInt(0);

	console.log(`\n----------- Post Reward Collection Status -----------`);
	console.log(summary_info);

	// ===============================================================
	// =================== RENEW CRV AND CVX LOCKS ===================
	// ===============================================================

	// Curve Voter Proxy (transfer CRV to proxy)
	// =====================================
	if (summary_info.crv_to_send_to_curve_voter_proxy > 0){
		batch_json.transactions.push({
			"to": "0xD533a949740bb3306d119CC777fa900bA034cd52",
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
						"name": "_to",
						"type": "address"
					},
					{
						"name": "_value",
						"type": "uint256"
					}
				],
				"name": "transfer",
				"payable": false
			},
			"contractInputsValues": {
				"_to": "0x847FA1A5337C7f24D7066E467F2e2A0f969Ca79F",
				"_value": summary_info.crv_to_send_to_curve_voter_proxy.toString(),
			}
		});
	
		// Curve Voter Proxy Lock
		// =====================================
		batch_json.transactions.push({
			"to": "0x847FA1A5337C7f24D7066E467F2e2A0f969Ca79F",
			"value": "0",
			"data": null,
			"contractMethod": {
				"inputs": [
					{
						"internalType": "uint256",
						"name": "_value",
						"type": "uint256"
					}
				],
				"name": "increaseAmount",
				"payable": false
			},
			"contractInputsValues": {
				"_value": summary_info.crv_to_send_to_curve_voter_proxy.toString(),
			}
		});
		summary_info.crv_to_send_to_curve_voter_proxy = BigInt(0);
	}
	
	summary_info.crv_new_voter_proxy_add_done = true;

	// Convex Re-lock (should already be approved)
	// =====================================
	batch_json.transactions.push({
		"to": "0x72a19342e8F1838460eBFCCEf09F6585e32db86E",
		"value": "0",
		"data": null,
		"contractMethod": {
			"inputs": [
				{
					"internalType": "address",
					"name": "_account",
					"type": "address"
				},
				{
					"internalType": "uint256",
					"name": "_amount",
					"type": "uint256"
				},
				{
					"internalType": "uint256",
					"name": "_spendRatio",
					"type": "uint256"
				}
			],
			"name": "lock",
			"payable": false
		},
		"contractInputsValues": {
			"_account": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
			"_amount": summary_info.cvx_to_lock.toString(),
			"_spendRatio": "0",
		}
	});
	summary_info.cvx_to_lock = BigInt(0);
	summary_info.cvx_new_lock_done = true;


	console.log(`\n----------- Post CRV and CVX relock Status -----------`);
	console.log(summary_info);


	// ===============================================================
	// ======================== HANDLE CVXCRV ========================
	// ===============================================================

	// // Swap CRV for cvxCRV
	// // =====================================
	// if (summary_info.crv_to_convert_to_cvxcrv.gt(BigInt(0))) {
	// 	const I2PoolcvxCRVCRV_json_path = path.join(__dirname, '../../artifacts/contracts/Misc_AMOs/curve/I2PoolcvxCRVCRV.sol/I2PoolcvxCRVCRV.json');
	// 	const { abi: I2PoolcvxCRVCRV_ABI } = JSON.parse( await fse.readFileSync(I2PoolcvxCRVCRV_json_path, 'utf-8'));
	// 	let cvxcrvcrv = new ethers.Contract("0x971add32ea87f10bd192671630be3be8a11b8623", I2PoolcvxCRVCRV_ABI).connect(owner);
	// 	const est_cvxcrv_out = await cvxcrvcrv.get_dy(0, 1, summary_info.crv_to_convert_to_cvxcrv);
	// 	const slipped_cvxcrv_out = est_cvxcrv_out.mul(9997).div(10000); // 0.03% slippage
	// 	batch_json.transactions.push({
	// 		"to": "0x971add32ea87f10bd192671630be3be8a11b8623",
	// 		"value": "0",
	// 		"data": null,
	// 		"contractMethod": {
	// 			"inputs": [
	// 				{
	// 					"name": "i",
	// 					"type": "int128"
	// 				},
	// 				{
	// 					"name": "j",
	// 					"type": "int128"
	// 				},
	// 				{
	// 					"name": "_dx",
	// 					"type": "uint256"
	// 				},
	// 				{
	// 					"name": "_min_dy",
	// 					"type": "uint256"
	// 				}
	// 			],
	// 			"name": "exchange",
	// 			"payable": false
	// 		},
	// 		"contractInputsValues": {
	// 			"i": "0",
	// 			"j": "1",
	// 			"_dx": summary_info.crv_to_convert_to_cvxcrv.toString(),
	// 			"_min_dy": slipped_cvxcrv_out.toString(),
	// 		}
	// 	});
	// 	summary_info.crv_to_convert_to_cvxcrv = BigInt(0);
	// 	summary_info.cvxcrv_direct_collected = summary_info.cvxcrv_direct_collected.add(slipped_cvxcrv_out);
	
	// 	// Lock the cvxCRV in Convex (approve)
	// 	// =====================================
	// 	batch_json.transactions.push({
	// 		"to": "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7",
	// 		"value": "0",
	// 		"data": null,
	// 		"contractMethod": {
	// 			"inputs": [
	// 				{
	// 					"internalType": "address",
	// 					"name": "spender",
	// 					"type": "address"
	// 				},
	// 				{
	// 					"internalType": "uint256",
	// 					"name": "amount",
	// 					"type": "uint256"
	// 				}
	// 			],
	// 			"name": "approve",
	// 			"payable": false
	// 		},
	// 		"contractInputsValues": {
	// 			"spender": "0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434",
	// 			"amount": summary_info.cvxcrv_direct_collected.toString()
	// 		}
	// 	});
	
	// 	// Lock the cvxCRV in Convex (stake)
	// 	// =====================================
	// 	batch_json.transactions.push({
	// 		"to": "0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434",
	// 		"value": "0",
	// 		"data": null,
	// 		"contractMethod": {
	// 			"inputs": [
	// 				{
	// 					"internalType": "uint256",
	// 					"name": "_amount",
	// 					"type": "uint256"
	// 				},
	// 				{
	// 					"internalType": "address",
	// 					"name": "_to",
	// 					"type": "address"
	// 				}
	// 			],
	// 			"name": "stake",
	// 			"payable": false
	// 		},
	// 		"contractInputsValues": {
	// 			"_amount": summary_info.cvxcrv_direct_collected.toString(),
	// 			"_to": "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
	// 		}
	// 	});
	// 	summary_info.crv_to_convert_to_cvxcrv = BigInt(0);
	// 	summary_info.cvxcrv_direct_collected = BigInt(0);
	
	// 	console.log(`\n----------- Post cvxCRV Handling Status -----------`);
	// 	console.log(summary_info);
	// }
	


	// ===============================================================
	// ===================== SELL THE CVX AND CRV ====================
	// ===============================================================
	// TODO




	// ===============================================================
	// ======================= CREATE THE JSON =======================
	// ===============================================================

	// Insert the checksum and the timestamp
	batch_json.createdAt = thisBlock.timestamp * 1000;
	batch_json.meta.checksum = calculateChecksum(batch_json);

	// console.log(JSON.stringify(batch_json));
	fse.writeFileSync(
		path.join(__dirname, 'Sunday_Part_1.json'),
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
