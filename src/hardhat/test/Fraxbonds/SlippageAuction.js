/*
** Run test while genache is running on localhost: npx hardhat --network localhost test test/Fraxoracle-test.js
*/

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { rlp } = require("ethereumjs-util");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");


describe("SlippageAuction", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("createAuction", async function () {
		var contracts = await setupContracts();
		await contracts.token2.approve(contracts.auction.address,BigInt(1e18));
		await contracts.auction.createAuction(contracts.token1.address, contracts.token2.address, BigInt(1e18), BigInt(1e18), BigInt(1e14), BigInt(1e16));
	});

	it("buy", async function () {
		const [owner,user1,user2,user3,user4] = await ethers.getSigners();
		var contracts = await setupContracts();
		await contracts.token2.approve(contracts.auction.address,BigInt(1e18));
		await contracts.auction.createAuction(contracts.token1.address, contracts.token2.address, BigInt(1e18), BigInt(1e18), BigInt(1e14), BigInt(1e16));

		for (var i=0;i<20;i++) {
			console.log(await contracts.auction.getAmountOut(0,BigInt(1e16)));
			await wait(10);
		}

		await contracts.token1.connect(user1).approve(contracts.auction.address,BigInt(1e16));
		await contracts.auction.connect(user1).buy(0, BigInt(1e16),BigInt(1e16));
	});

	it("exit", async function () {
		const [owner,user1,user2,user3,user4] = await ethers.getSigners();
		var contracts = await setupContracts();
		var ownerBalance1Before = BigInt(await contracts.token1.balanceOf(owner.address));
		var ownerBalance2Before = BigInt(await contracts.token2.balanceOf(owner.address));
		var user1Balance1Before = BigInt(await contracts.token1.balanceOf(user1.address));
		var user1Balance2Before = BigInt(await contracts.token2.balanceOf(user1.address));
		await contracts.token2.approve(contracts.auction.address,BigInt(1e18));
		await contracts.auction.createAuction(contracts.token1.address, contracts.token2.address, BigInt(1e18), BigInt(1e18), BigInt(1e14), BigInt(1e16));

		await wait(10);

		await contracts.token1.connect(user1).approve(contracts.auction.address,BigInt(1e16));
		await contracts.auction.connect(user1).buy(0, BigInt(1e16),BigInt(1e16));

		await contracts.auction.connect(owner).exit(0);

		var ownerBalance1After = BigInt(await contracts.token1.balanceOf(owner.address));
		var ownerBalance2After = BigInt(await contracts.token2.balanceOf(owner.address));
		var user1Balance1After = BigInt(await contracts.token1.balanceOf(user1.address));
		var user1Balance2After = BigInt(await contracts.token2.balanceOf(user1.address));

		expect(BigInt(ownerBalance1After)-BigInt(ownerBalance1Before)).to.equal(BigInt(user1Balance1Before)-BigInt(user1Balance1After));
		expect(BigInt(ownerBalance1After)-BigInt(ownerBalance1Before)).to.equal(BigInt(1e16));
		expect(BigInt(ownerBalance2Before)-BigInt(ownerBalance2After)).to.equal(BigInt(user1Balance2After)-BigInt(user1Balance1Before));
		expect(await contracts.token1.balanceOf(contracts.auction.address)).to.equal(0);
		expect(await contracts.token2.balanceOf(contracts.auction.address)).to.equal(0);
	});
});

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
	var token1 = await DummyToken.deploy();
	await token1.mint(owner.address,ethers.constants.MaxUint256);
	var token2 = await DummyToken.deploy();
	await token2.mint(owner.address,ethers.constants.MaxUint256);

	await token1.transfer(user1.address, "1000000000000000000000");
	await token2.transfer(user1.address, "1000000000000000000000");
	await token1.transfer(user2.address, "1000000000000000000000");
	await token2.transfer(user2.address, "1000000000000000000000");
	await token1.transfer(user3.address, "1000000000000000000000");
	await token2.transfer(user3.address, "1000000000000000000000");
	await token1.transfer(user4.address, "1000000000000000000000");
	await token2.transfer(user4.address, "1000000000000000000000");

	const SlippageAuction = await ethers.getContractFactory("SlippageAuction");
	var auction = await SlippageAuction.deploy();

	// Pack contracts in an object
	var result = {};
	result.token1 = token1;
	result.token2 = token2;
	result.auction = auction;
	return result;
}
