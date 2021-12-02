const path = require('path');
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });
const chalk = require('chalk');
const BigNumber = require('bignumber.js');
const ethers = require('ethers');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const MigrationBundleUtils = artifacts.require("Utils/MigrationBundleUtils");
const StakingRewards_FRAX_USDC = artifacts.require("Staking/Variants/Stake_FRAX_USDC");
const UniV3_FRAX_USDC = artifacts.require("Uniswap_V3/IUniswapV3Pool");
const NonfungiblePositionManager = artifacts.require("Uniswap_V3/uniswap-v3-periphery/interfaces/INonfungiblePositionManager");
const FRAXStablecoin = artifacts.require("Frax/IFrax");
const USDC = artifacts.require("ERC20/ERC20");
const UNIV2_FRAX_USDC = artifacts.require("Uniswap/IUniswapV2Pair");
const IUniswapV2Router02 = artifacts.require("Uniswap/Interfaces/IUniswapV2Router02");
const FraxUniV3Farm_Stable_FRAX_USDC = artifacts.require("Staking/FraxUniV3Farm_Stable_FRAX_USDC");

const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

contract('Contract & Environment Tests', async (accounts) => {

	const STAKING_OWNER = '0x23B76a542278253090Cd74B6127C8F116939a6C1'; // old: 0xfF5B4BCbf765FE363269114e1c765229a29eDeFD
	const locked_staker = "0xD84c2FDF2F8733A5BbEA65EEC0bB211947792871";

	let migrationBundleUtils_instance;
	let stakingInstance_FRAX_USDC;
	let uni_v3_instance_FRAX_USDC;
	let nft_manager_instance;
	let frax_instance;
	let usdc_instance;
	let univ2_frax_usdc_instance;
	let routerInstance; 
	let FraxUniV3Farm_Stable_FRAX_USDC_instance;

	beforeEach(async() => {
		migrationBundleUtils_instance = await MigrationBundleUtils.deployed();
		stakingInstance_FRAX_USDC = await StakingRewards_FRAX_USDC.at('0xa29367a3f057F3191b62bd4055845a33411892b6');
		uni_v3_instance_FRAX_USDC = await UniV3_FRAX_USDC.at('0xc63B0708E2F7e69CB8A1df0e1389A98C35A76D52');
		nft_manager_instance = await NonfungiblePositionManager.at('0xc36442b4a4522e871399cd717abdd847ab11fe88');
		frax_instance = await FRAXStablecoin.at('0x853d955aCEf822Db058eb8505911ED77F175b99e');
		usdc_instance = await USDC.at('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
		univ2_frax_usdc_instance = await UNIV2_FRAX_USDC.at('0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D');
		routerInstance = await UniswapV2Router02.at('0x7a250d5630b4cf539739df2c5dacb4c659f2488d'); 
		FraxUniV3Farm_Stable_FRAX_USDC_instance = await FraxUniV3Farm_Stable_FRAX_USDC.at('0x1C21Dd0cE3bA89375Fc39F1B134AD15671022660');

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [STAKING_OWNER]
		});

		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [locked_staker]
		});

	}); 

	it("looks for tx in mempool", async () => {
		console.log("pending mempool tx:", (parseInt(await hre.network.provider.request({
			method: "eth_getTransactionByHash",
			params: ["0x1693ec63fad42be859224fb4f1efd88494b404d5a05dc21b383b9a085195a9be"]
		}))));
	});

	it("checks parent hash", async () => {

		let latestBlock = await hre.network.provider.request({
			method: "eth_getBlockByNumber",
			params: ["latest", false]}
		);

		console.log("latest block parent hash:", latestBlock.parentHash);
		console.log("checkParentHash:", await migrationBundleUtils_instance.checkParentHash(latestBlock.parentHash));
	});

	it("returns false on stale hash", async () => {

		let oldBlock = await hre.network.provider.request({
			method: "eth_getBlockByNumber",
			params: ["0xB71B00", false]} // block 12,000,0000
		);

		console.log("old block hash valid:", await migrationBundleUtils_instance.checkParentHash(oldBlock.hash));
	});

	it("unlocks the FRAX-USDC staking contract", async () => {
		console.log("stakes unlocked:", await stakingInstance_FRAX_USDC.unlockedStakes());
		await stakingInstance_FRAX_USDC.unlockStakes({from: STAKING_OWNER });
		console.log("stakes unlocked:", await stakingInstance_FRAX_USDC.unlockedStakes());
	});

	it("withdraws a user's locked FRAX-USDC stake and deposits it into uni v3", async () => {

		const locked_stake_id = "0xa50f3f91bf3cbb1b329b37529b1241d0c7c58083ce988b7353ad9040d8a733d6";

		//console.log("locked stake of user:", (await stakingInstance_FRAX_USDC.lockedStakesOf(locked_staker))[7]);
		await stakingInstance_FRAX_USDC.withdrawLocked(locked_stake_id, { from: locked_staker });
		//console.log("locked stake of user (after):", (await stakingInstance_FRAX_USDC.lockedStakesOf(locked_staker))[7]);

		let locked_staker_univ2_balance = new BigNumber(await univ2_frax_usdc_instance.balanceOf(locked_staker));
		console.log("locked_staker UNIv2_FRAX_USDC balance:", locked_staker_univ2_balance.div(BIG18).toNumber());
		await univ2_frax_usdc_instance.approve(routerInstance.address, new BigNumber("100e18"), { from: locked_staker });
		await routerInstance.removeLiquidity(
			'0x853d955aCEf822Db058eb8505911ED77F175b99e',
			'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
			locked_staker_univ2_balance,
			0,
			0,
			locked_staker,
			1650000000,
			{ from: locked_staker }
		);

		console.log("locked_staker FRAX balance:", new BigNumber(await frax_instance.balanceOf(locked_staker)).div(BIG18).toNumber());
		console.log("locked_staker USDC balance:", new BigNumber(await usdc_instance.balanceOf(locked_staker)).div(BIG6).toNumber());

		await frax_instance.approve(nft_manager_instance.address, new BigNumber("100e18"), { from: locked_staker });
		await usdc_instance.approve(nft_manager_instance.address, new BigNumber("100e6"), { from: locked_staker });

		const mintStruct = {
			token0: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
			token1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
			fee: '500',
			tickLower: '-276420',
			tickUpper: '-276230',
			amount0Desired: ethers.utils.parseUnits('100.0',18),
			amount1Desired: ethers.utils.parseUnits('100.0',6),
			amount0Min: 0,
			amount1Min: 0,
			recipient: locked_staker,
			deadline: 1650000000
		};

		console.log("locked_staker univ3 nft count:", (await nft_manager_instance.balanceOf(locked_staker)).toNumber());
		console.log("depositing into Uni v3");
		const mintedNFT = await nft_manager_instance.mint.call(mintStruct, { from: locked_staker });
		await nft_manager_instance.mint(mintStruct, { from: locked_staker });

		const nft_count = await nft_manager_instance.balanceOf(locked_staker);
		const nft_id = await nft_manager_instance.tokenOfOwnerByIndex(locked_staker, nft_count - 1);
		const nft_position = await nft_manager_instance.positions(nft_id);
		
		console.log("locked_staker univ3 nft count:", (await nft_manager_instance.balanceOf(locked_staker)).toNumber());
		console.log("nft_id:", new BigNumber(nft_id).toNumber());;
		console.log("mintedNFT.tokenId:", new BigNumber(mintedNFT.tokenId).toNumber());

		console.log("locked_staker FRAX balance:", new BigNumber(await frax_instance.balanceOf(locked_staker)).div(BIG18).toNumber());
		console.log("locked_staker USDC balance:", new BigNumber(await usdc_instance.balanceOf(locked_staker)).div(BIG6).toNumber());

	});

	it("stakes the uni v3 NFT locked", async() => {
		const nft_count = await nft_manager_instance.balanceOf(locked_staker);
		const nft_id = await nft_manager_instance.tokenOfOwnerByIndex(locked_staker, nft_count - 1);

		await nft_manager_instance.approve(FraxUniV3Farm_Stable_FRAX_USDC_instance.address, nft_id, { from: locked_staker, gasLimit: new BigNumber("1e6") });
		await FraxUniV3Farm_Stable_FRAX_USDC_instance.stakeLocked(nft_id, 86400 * 3, { from: locked_staker, gasLimit: new BigNumber("1e6") });
	});

	it("pays the miner", async() => {
		console.log("accounts[0] balance:", (parseInt(await hre.network.provider.request({
			method: "eth_getBalance",
			params: [accounts[0], "latest"]
		}))));

		const lockedNFTs = await FraxUniV3Farm_Stable_FRAX_USDC_instance.lockedNFTsOf(locked_staker);
		//console.log("lockedNFTs:", lockedNFTs);
		//console.log("length:", lockedNFTs.length);

		let nft_id;
		for(let i = 0; i < lockedNFTs.length; i++){
			console.log("token_id:", lockedNFTs[i].token_id);
			nft_id = lockedNFTs[i].token_id;
		}

		let latestBlock = await hre.network.provider.request({
			method: "eth_getBlockByNumber",
			params: ["latest", false]}
		);

		console.log("nft_id:", nft_id);
		console.log("checkParentHash:", await migrationBundleUtils_instance.checkParentHash(latestBlock.parentHash));
		await migrationBundleUtils_instance.payFlashbotsMiner(latestBlock.hash, new BigNumber("1e16"), locked_staker, nft_id, { from: accounts[0], value: new BigNumber("1e16"), gasLimit: new BigNumber("1e6") }); // 0.01 ETH
	});

	it("relocks the FRAX-USDC staking contract", async() => {
		console.log("stakes unlocked:", await stakingInstance_FRAX_USDC.unlockedStakes());
		await stakingInstance_FRAX_USDC.unlockStakes({from: STAKING_OWNER });
		console.log("stakes unlocked:", await stakingInstance_FRAX_USDC.unlockedStakes());
	});
})