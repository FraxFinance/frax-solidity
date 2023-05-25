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
		await contracts.tokenL2.connect(owner).approve(contracts.ferryOnL2.address,BigInt(100e18));
		await contracts.ferryOnL2.connect(owner).captainDeposit(BigInt(100e18));

		await contracts.tokenL1.connect(user1).approve(contracts.ferryOnL1.address, BigInt(100e18));
		await contracts.ferryOnL1.connect(user1).embarkWithRecipient(BigInt(10e18), user1.address, owner.address, 0);
		await contracts.ferryOnL1.connect(user1).embarkWithRecipient(BigInt(20e18), user1.address, owner.address, BigInt(10e18));

		//var blockOld = await network.provider.request({"method": "eth_getBlockByNumber","params": [BigInt(17280000).toString(),false]});
		//console.log("stateRoot 17280000:"+blockOld.stateRoot);

		var blockNumber = await ethers.provider.getBlockNumber();
		console.log("blockNumber:"+blockNumber);
		var blockNumber2 = await network.provider.request({"method": "eth_blockNumber","params": []});
		console.log("blockNumber2:"+blockNumber2);

		var block = await network.provider.request({"method": "eth_getBlockByNumber","params": ["0x"+BigInt(blockNumber).toString(16),false]});
		console.log("block:"+block);
		console.log("stateRoot:"+block.stateRoot);

		await contracts.dummyStateRootOracle.setStateRoot(blockNumber,block.stateRoot);

		var slotPos ="0x000000000000000000000000"+owner.address.substring(2)+"0000000000000000000000000000000000000000000000000000000000000000";
		var slot = keccak256(slotPos);
		console.log("slot:"+slot);
		var result = await network.provider.request({
			  "method": "eth_getProof",
			  "params": [
				 // the address to query and generate proof for
				 contracts.ferryOnL1.address,
				 // storage keys to generate proofs for
				 ["0x"+(BigInt(keccak256(slot))+BigInt(0)).toString(16)],
				 // the block at which to generate the proof
				 "0x"+BigInt(blockNumber).toString(16)
			  ]
		});
		console.log(result);
		var proof = eval(result);
		console.log(proof.storageProof[0].proof);

		await contracts.ferryOnL2.connect(user1).disembark(owner.address, 0, blockNumber, proof.accountProof,proof.storageProof[0].proof);

	});

});

async function waitTill(time) {
	var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
	var waitPeriod = time-currentblock.timestamp;
	if (waitPeriod>0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
	}
}
async function wait(waitPeriod) {
	if (waitPeriod>0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
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
