/*
** Run test while genache is running on localhost: npx hardhat --network localhost test test/Fraxoracle-test.js
*/

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { rlp } = require("ethereumjs-util");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");


describe("Fraxoracle", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("addRoundData", async function () {
		var contracts = await setupContracts();
		var lowPrice = BigInt(100E18);
		var highPrice = BigInt(101E18);

		/// Set dummy price to Fraxoracle
		await contracts.dummyPriceOracle.setPrices(false, lowPrice, highPrice);
		var blockNumber = (await contracts.fraxoraclePriceSource.addRoundData()).blockNumber;
		var block = await ethers.provider.getBlock(blockNumber);//await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});
		//console.log("block:"+JSON.stringify(block));
		var timestamp = Number(BigInt(block.timestamp));

		// Get prices and check if correct
		var prices = await contracts.fraxoracle.getPrices();
		expect(prices._isBadData).to.equal(false);
		expect(prices._priceLow).to.equal(lowPrice);
		expect(prices._priceHigh).to.equal(highPrice);

		// Get latestRoundData and check if correct
		var latestRoundData = await contracts.fraxoracle.latestRoundData();
		expect(latestRoundData.roundId).to.equal(0);
		expect(latestRoundData.answer).to.equal((lowPrice+highPrice)/BigInt(2));
		expect(latestRoundData.startedAt).to.equal(timestamp);
		expect(latestRoundData.updatedAt).to.equal(timestamp);
		expect(latestRoundData.answeredInRound).to.equal(0);

		// Get roundData and check if correct
		var roundData = await contracts.fraxoracle.getRoundData(0);
		expect(roundData.roundId).to.equal(0);
		expect(roundData.answer).to.equal((lowPrice+highPrice)/BigInt(2));
		expect(roundData.startedAt).to.equal(timestamp);
		expect(roundData.updatedAt).to.equal(timestamp);
		expect(roundData.answeredInRound).to.equal(0);

		// Get prices after MAX_DELAY and check if data is bad
		await waitTill(timestamp+24*60*60+1);

		var prices2 = await contracts.fraxoracle.getPrices();
		expect(prices2._isBadData).to.equal(true);
		expect(prices2._priceLow).to.equal(lowPrice);
		expect(prices2._priceHigh).to.equal(highPrice);
	});

	it("MerkleProofPriceSource", async function () {
		var contracts = await setupContracts();
		var lowPrice = BigInt(100E18);
		var highPrice = BigInt(101E18);

		/// Set dummy price to fraxoracle
		await contracts.dummyPriceOracle.setPrices(false, lowPrice, highPrice);
		var blockNumber = (await contracts.fraxoraclePriceSource.addRoundData()).blockNumber;
		var block = await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});
		var timestamp = Number(BigInt(block.timestamp));
		//console.log("block:"+JSON.stringify(block));
		await contracts.dummyStateRootOracle.setStateRoot(blockNumber,block.stateRoot,block.timestamp);

		// Generate Merkle proof
		var slot = keccak256("0x0000000000000000000000000000000000000000000000000000000000000000");
		var result = await network.provider.request({
			  "method": "eth_getProof",
			  "params": [
				 // the address to query and generate proof for
				 contracts.fraxoracle.address,
				 // storage keys to generate proofs for
				 ["0x"+(BigInt(slot)+BigInt(0)).toString(16),"0x"+(BigInt(slot)+BigInt(1)).toString(16),"0x"+(BigInt(slot)+BigInt(2)).toString(16)],
				 // the block at which to generate the proof
				 "0x"+BigInt(blockNumber).toString(16)
			  ]
		});
		//console.log(result);
		var proof = eval(result);
		var proofs = [];
		for (var i=0;i<proof.storageProof.length;i++) proofs.push(proof.storageProof[i].proof);

		await contracts.merkleProofPriceSource.addRoundData(blockNumber, proof.accountProof,proofs);

		// Get prices and check if correct
		var prices = await contracts.fraxoracleL2.getPrices();

		expect(prices._priceLow).to.equal(lowPrice);
		expect(prices._priceHigh).to.equal(highPrice);
		expect(prices._isBadData).to.equal(false);

		// Get latestRoundData and check if correct
		var latestRoundData = await contracts.fraxoracleL2.latestRoundData();
		expect(latestRoundData.roundId).to.equal(0);
		expect(latestRoundData.answer).to.equal((lowPrice+highPrice)/BigInt(2));
		expect(latestRoundData.startedAt).to.equal(timestamp);
		expect(latestRoundData.updatedAt).to.equal(timestamp);
		expect(latestRoundData.answeredInRound).to.equal(0);

		// Get roundData and check if correct
		var roundData = await contracts.fraxoracleL2.getRoundData(0);
		expect(roundData.roundId).to.equal(0);
		expect(roundData.answer).to.equal((lowPrice+highPrice)/BigInt(2));
		expect(roundData.startedAt).to.equal(timestamp);
		expect(roundData.updatedAt).to.equal(timestamp);
		expect(roundData.answeredInRound).to.equal(0);

		// Get prices after MAX_DELAY and check if data is bad
		await waitTill(timestamp+24*60*60+1);
		var prices2 = await contracts.fraxoracleL2.getPrices();
		expect(prices2._isBadData).to.equal(true);
		expect(prices2._priceLow).to.equal(lowPrice);
		expect(prices2._priceHigh).to.equal(highPrice);
	});

});

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

	const DummyStateRootOracle = await ethers.getContractFactory("DummyStateRootOracle");
	var dummyStateRootOracle = await DummyStateRootOracle.deploy();

	const DummyPriceOracle = await ethers.getContractFactory("DummyPriceOracle");
	var dummyPriceOracle = await DummyPriceOracle.deploy();

	const Fraxoracle = await ethers.getContractFactory("Fraxoracle");
	var fraxoracle = await Fraxoracle.deploy(18, "TestFraxoracle", 1, 24*60*60, BigInt(2e16));
	var fraxoracleL2 = await Fraxoracle.deploy(18, "TestFraxoracleL2", 1, 24*60*60, BigInt(2e16));

	const FraxoraclePriceSource = await ethers.getContractFactory("FraxoraclePriceSource");
	var fraxoraclePriceSource = await FraxoraclePriceSource.deploy(fraxoracle.address,dummyPriceOracle.address);
	await fraxoracle.setPriceSource(fraxoraclePriceSource.address);

	const MerkleProofPriceSource = await ethers.getContractFactory("MerkleProofPriceSource");
	var merkleProofPriceSource = await MerkleProofPriceSource.deploy(fraxoracleL2.address,dummyStateRootOracle.address,fraxoracle.address);
	await fraxoracleL2.setPriceSource(merkleProofPriceSource.address);


	// Pack contracts in an object
	var result = {};
	result.fraxoracle = fraxoracle;
	result.fraxoracleL2 = fraxoracleL2;
	result.fraxoraclePriceSource = fraxoraclePriceSource;
	result.merkleProofPriceSource = merkleProofPriceSource;
	result.dummyStateRootOracle = dummyStateRootOracle
	result.dummyPriceOracle = dummyPriceOracle;
	return result;
}
