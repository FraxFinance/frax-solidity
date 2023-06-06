const { expect } = require("chai");
const { ethers } = require("hardhat");
const { rlp } = require("ethereumjs-util");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");


describe("FerryV2", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("L1 -> L2", async function () {
		const [owner,user1,user2,user3,user4] = await ethers.getSigners();
		var contracts = await setupContracts();
		// Init captain
		await contracts.ferryOnL1.connect(owner).initCaptain(0, 1000, 0);

		// Captain deposit on L2
		await contracts.tokenL2.connect(owner).approve(contracts.ferryOnL2.address,BigInt(100e18));
		await contracts.ferryOnL2.connect(owner).captainDeposit(BigInt(100e18));

		// User embarks twice on L1
		await contracts.tokenL1.connect(user1).approve(contracts.ferryOnL1.address, BigInt(100e18));
		await contracts.ferryOnL1.connect(user1).embarkWithRecipient(BigInt(10e18), user1.address, owner.address, 0);
		await contracts.ferryOnL1.connect(user1).embarkWithRecipient(BigInt(20e18), user1.address, owner.address, BigInt(10e18));

		// Store state root in the dummyStateRootOracle
		var blockNumber = await ethers.provider.getBlockNumber();
		var block = await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});
		await contracts.dummyStateRootOracle.setStateRoot(blockNumber,block.stateRoot,block.timestamp);

		// Generate Merkle proof
		var slotPos ="0x000000000000000000000000"+owner.address.substring(2)+"0000000000000000000000000000000000000000000000000000000000000000";
		var slot = keccak256(slotPos);
		var result = await network.provider.request({
			  "method": "eth_getProof",
			  "params": [
				 // the address to query and generate proof for
				 contracts.ferryOnL1.address,
				 // storage keys to generate proofs for
				 ["0x"+(BigInt(keccak256(slot))+BigInt(0)).toString(16),"0x"+(BigInt(keccak256(slot))+BigInt(1)).toString(16)],
				 // the block at which to generate the proof
				 "0x"+BigInt(blockNumber).toString(16)
			  ]
		});
		//console.log(result);
		var proof = eval(result);

		// Disembark on L2
		var user1BalanceBefore = BigInt(await contracts.tokenL2.balanceOf(user1.address));
		var proofs = [];
		for (var i=0;i<proof.storageProof.length;i++) proofs.push(proof.storageProof[i].proof);
		await contracts.ferryOnL2.connect(user1).disembark(owner.address, 0, blockNumber, proof.accountProof,proofs);
		var user1TokenL2Received = BigInt(await contracts.tokenL2.balanceOf(user1.address))-user1BalanceBefore;
		expect(user1TokenL2Received).to.equal(BigInt(30e18));

		// Captain withdraws tokens on L1
		var ownerBalanceBefore = BigInt(await contracts.tokenL1.balanceOf(owner.address));
		await contracts.ferryOnL1.connect(owner).withdraw();
		var ownerTokenL1Received = BigInt(await contracts.tokenL1.balanceOf(owner.address))-ownerBalanceBefore;
		expect(ownerTokenL1Received).to.equal(BigInt(30e18));
	});

	it("L2 -> L1", async function () {
		const [owner,user1,user2,user3,user4] = await ethers.getSigners();
		var contracts = await setupContracts();

		// User embarks on L2
		var now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
		var deadline = now+(60*60);
		await contracts.tokenL2.connect(user1).approve(contracts.ferryOnL2.address,BigInt(10e18));
		await contracts.ferryOnL2.connect(user1).embarkWithRecipient(BigInt(10e18), BigInt(0), user1.address,deadline);

		// Captain disembarks on L1
		await contracts.tokenL1.connect(owner).approve(contracts.ferryOnL1.address,BigInt(10e18));
		var user1BalanceBefore = BigInt(await contracts.tokenL1.balanceOf(user1.address));
		await contracts.ferryOnL1.connect(owner).disembark(BigInt(10e18), user1.address,0, owner.address,deadline);
		var user1TokenL1Received = BigInt(await contracts.tokenL1.balanceOf(user1.address))-user1BalanceBefore;
		expect(user1TokenL1Received).to.equal(BigInt(10e18));


		// Generate Merkle proof
		var blockNumber = await ethers.provider.getBlockNumber();
		var block = await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});
		await contracts.dummyStateRootOracle.setStateRoot(blockNumber,block.stateRoot,block.timestamp);
		var toHash = "0x"+toUint256Hex(BigInt(10e18))+user1.address.substring(2)+toUint32Hex(0);
		var hash = keccak256(toHash);
		var slotPos ="0x"+hash.substring(2)+"0000000000000000000000000000000000000000000000000000000000000001";
		var slot = keccak256(slotPos);
		var result = await network.provider.request({
		  "method": "eth_getProof",
		  "params": [
			 // the address to query and generate proof for
			 contracts.ferryOnL1.address,
			 // storage keys to generate proofs for
			 [slot],
			 // the block at which to generate the proof
			 "0x"+BigInt(blockNumber).toString(16)
		  ]
		});
		var proof = eval(result);
		//console.log(proof);

		// Collect captains tokens on L2
		var ownerBalanceBefore = BigInt(await contracts.tokenL2.balanceOf(owner.address));
		await contracts.ferryOnL2.connect(owner).collect(0, blockNumber, proof.accountProof,proof.storageProof[0].proof);
		var ownerTokenL2Received = BigInt(await contracts.tokenL2.balanceOf(owner.address))-ownerBalanceBefore;
		expect(ownerTokenL2Received).to.equal(BigInt(10e18));
   });

   it("L2 -> L1 no disembark", async function () {
		const [owner,user1,user2,user3,user4] = await ethers.getSigners();
		var contracts = await setupContracts();

		// User embarks on L2
		var now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
		var deadline = now+(60*60);
		await contracts.tokenL2.connect(user1).approve(contracts.ferryOnL2.address,BigInt(10e18));
		await contracts.ferryOnL2.connect(user1).embarkWithRecipient(BigInt(10e18), BigInt(0), user1.address,deadline);

		// Wait till deadline
		await waitTill(deadline);
		await ethers.provider.send("evm_mine");

		// Generate Merkle proof
		var blockNumber = await ethers.provider.getBlockNumber();
		var block = await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});
		await contracts.dummyStateRootOracle.setStateRoot(blockNumber,block.stateRoot,block.timestamp);
		var toHash = "0x"+toUint256Hex(BigInt(10e18))+user1.address.substring(2)+toUint32Hex(0);
		var hash = keccak256(toHash);
		var slotPos ="0x"+hash.substring(2)+"0000000000000000000000000000000000000000000000000000000000000001";
		var slot = keccak256(slotPos);
		var result = await network.provider.request({
		  "method": "eth_getProof",
		  "params": [
			 // the address to query and generate proof for
			 contracts.ferryOnL1.address,
			 // storage keys to generate proofs for
			 [slot],
			 // the block at which to generate the proof
			 "0x"+BigInt(blockNumber).toString(16)
		  ]
		});
		var proof = eval(result);
		//console.log(proof);

		// Collect users tokens on L2, because there was no disembark
		var user1BalanceBefore = BigInt(await contracts.tokenL2.balanceOf(user1.address));
		await contracts.ferryOnL2.connect(owner).collect(0, blockNumber, proof.accountProof,proof.storageProof[0].proof);
		var user1TokenL2Received = BigInt(await contracts.tokenL2.balanceOf(user1.address))-user1BalanceBefore;
		expect(user1TokenL2Received).to.equal(BigInt(10e18));
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

	// Deploy token0/token1 token and distribute
	const DummyToken = await ethers.getContractFactory("DummyToken");
	var tokenL1 = await DummyToken.deploy();
	await tokenL1.mint(owner.address,ethers.constants.MaxUint256);
	var tokenL2 = await DummyToken.deploy();
	await tokenL2.mint(owner.address,ethers.constants.MaxUint256);

	await tokenL1.transfer(user1.address, "1000000000000000000000");
	await tokenL2.transfer(user1.address, "1000000000000000000000");
	await tokenL1.transfer(user2.address, "1000000000000000000000");
	await tokenL2.transfer(user2.address, "1000000000000000000000");
	await tokenL1.transfer(user3.address, "1000000000000000000000");
	await tokenL2.transfer(user3.address, "1000000000000000000000");
	await tokenL1.transfer(user4.address, "1000000000000000000000");
	await tokenL2.transfer(user4.address, "1000000000000000000000");

	const DummyStateRootOracle = await ethers.getContractFactory("DummyStateRootOracle");
	var dummyStateRootOracle = await DummyStateRootOracle.deploy();

	const FerryOnL1 = await ethers.getContractFactory("FerryOnL1");
	var ferryOnL1 = await FerryOnL1.deploy(tokenL1.address);

	const FerryOnL2 = await ethers.getContractFactory("FerryOnL2");
	var ferryOnL2 = await FerryOnL2.deploy(tokenL2.address,ferryOnL1.address,dummyStateRootOracle.address);

	// Pack contracts in an object
	var result = {};
	result.tokenL1 = tokenL1;
	result.tokenL2 = tokenL2;
	result.dummyStateRootOracle = dummyStateRootOracle
	result.ferryOnL1 = ferryOnL1;
	result.ferryOnL2 = ferryOnL2;
	return result;
}
