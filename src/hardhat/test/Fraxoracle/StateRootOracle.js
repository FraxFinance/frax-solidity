/*
** Run test while genache is running on localhost: npx hardhat --network localhost test test/Fraxoracle-test.js
*/

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { rlp } = require("ethereumjs-util");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");


describe("StateRootOracle", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("proofStateRoot", async function () {
		const [owner,user1,user2,user3,user4] = await ethers.getSigners();
		var contracts = await setupContracts();

		var blockNumber = await ethers.provider.getBlockNumber()
		var block = await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});

		await contracts.operatorBlockhashProvider1.connect(user1).receiveBlockHash(block.hash);
		await contracts.operatorBlockhashProvider2.connect(user2).receiveBlockHash(block.hash);
		await contracts.operatorBlockhashProvider3.connect(user3).receiveBlockHash(block.hash);


		//console.log("block:"+JSON.stringify(block,null,2));
		var headerFields=[];
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
		headerFields.push(block.withdrawalsRoot);
		//headerFields.push(block.excessDataGas);
		convertHeaderFields(headerFields);
		var header = rlp.encode(headerFields);
		var hash = keccak256(header);
		//console.log("hash:"+hash);
		expect(block.hash).to.equals(hash);

		await contracts.stateRootOracle.proofStateRoot(header);

		var blockInfo = await contracts.stateRootOracle.getBlockInfo(blockNumber);
		console.log("blockInfo:"+blockInfo);
	});

});

function convertHeaderFields(headeFields) {
	for (var i=0;i<headeFields.length;i++) {
		var field = headeFields[i];
		if (field=="0x0") field = "0x";
		if (field.length%2==1) field="0x0"+field.substring(2);
		headeFields[i]=field;
	}
}

function toUint256Hex(value) {
	var result = "0000000000000000000000000000000000000000000000000000000000000000"+BigInt(value).toString(16);
	return result.substring(result.length-64);
}

function toUint32Hex(value) {
	var result = "00000000"+BigInt(value).toString(16);
	return result.substring(result.length-8);
}

async function waitTill(time) {
	await ethers.provider.send("evm_mine"); // mine the next block
	do {
		var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
		var waitPeriod = time-currentblock.timestamp;
		if (waitPeriod>0) {
			await ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
			await ethers.provider.send("evm_mine"); // mine the next block
		}
	} while (waitPeriod>0);
}

async function wait(waitPeriod) {
	if (waitPeriod>0) {
		await ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		await ethers.provider.send("evm_mine"); // mine the next block
	}
}

async function setupContracts() {
	const [owner,user1,user2,user3,user4] = await ethers.getSigners();

	const OperatorBlockhashProvider = await ethers.getContractFactory("OperatorBlockhashProvider");
	var operatorBlockhashProvider1 = await OperatorBlockhashProvider.deploy(user1.address);
	var operatorBlockhashProvider2 = await OperatorBlockhashProvider.deploy(user2.address);
	var operatorBlockhashProvider3 = await OperatorBlockhashProvider.deploy(user3.address);
	var providers=[];
	providers.push(operatorBlockhashProvider1.address);
	providers.push(operatorBlockhashProvider2.address);
	providers.push(operatorBlockhashProvider2.address);

	const StateRootOracle = await ethers.getContractFactory("StateRootOracle");
	var stateRootOracle = await StateRootOracle.deploy(providers,2);

	// Pack contracts in an object
	var result = {};
	result.operatorBlockhashProvider1 = operatorBlockhashProvider1;
	result.operatorBlockhashProvider2 = operatorBlockhashProvider2;
	result.operatorBlockhashProvider3 = operatorBlockhashProvider3;
	result.stateRootOracle = stateRootOracle;
	return result;
}
