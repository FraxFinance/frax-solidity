const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UniswapV2 AMM", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("mint", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.pair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.pair.address,"100000000000000000000");
		await contracts.pair.mint(owner.address);
		expect(await contracts.token0.balanceOf(contracts.pair.address)).to.equal("100000000000000000000");
		expect(await contracts.token1.balanceOf(contracts.pair.address)).to.equal("100000000000000000000");
		expect(await contracts.pair.balanceOf(owner.address)).to.equal(BigInt("100000000000000000000")-BigInt(1000));
	});

	it("swap", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		var reserveIn = BigInt("100000000000000000000");
		var reserveOut = BigInt("100000000000000000000");

		// Add initial liquidity
		await contracts.token0.transfer(contracts.pair.address,reserveIn);
		await contracts.token1.transfer(contracts.pair.address,reserveOut);
		await contracts.pair.mint(owner.address);

		var tradeAmount = BigInt("1000000000000000000");

		var reserves = await contracts.pair.getReserves();
		var expectedOutput = (tradeAmount*BigInt(997)*BigInt(reserves._reserve1))/(BigInt(reserves._reserve0)*BigInt(1000)+tradeAmount*BigInt(997));

		var balanceBefore = await contracts.token1.balanceOf(user1.address);
		await contracts.token0.connect(user1).transfer(contracts.pair.address,tradeAmount);
		await contracts.pair.swap(0,expectedOutput,user1.address,[]);
		var balanceAfter = await contracts.token1.balanceOf(user1.address);
		var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
		expect(balanceDiff.toString()).to.equal(expectedOutput.toString());
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

async function setupContracts() {
	const [owner,user1,user2,user3] = await ethers.getSigners();

	// Deploy token0/token1 token and distribute
	const DummyToken = await ethers.getContractFactory("DummyToken");
	var token0 = await DummyToken.deploy();
	var token1 = await DummyToken.deploy();
	if (token1.address.toUpperCase()<token0.address.toUpperCase()) {
		var temp=token1;
		token1=token0;
		token0=temp;
	}
	await token0.mint(owner.address,"1000000000000000000000");
	await token0.mint(user1.address,"1000000000000000000000");
	await token0.mint(user2.address,"1000000000000000000000");
	await token0.mint(user3.address,"1000000000000000000000");
	await token1.mint(owner.address,"1000000000000000000000");
	await token1.mint(user1.address,"1000000000000000000000");
	await token1.mint(user2.address,"1000000000000000000000");
	await token1.mint(user3.address,"1000000000000000000000");

	// Deploy UniswapV2Factory
	const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
	var factory = await UniswapV2Factory.deploy(owner.address);

	// Create UniswapV2Pair
	const UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair");
	await factory.createPair(token0.address,token1.address);
	var pair = UniswapV2Pair.attach(await factory.allPairs(0));

	// Pack contracts in an object
	var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.pair = pair;
    result.factory = factory;
    return result;
}





