const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FPI", function () {
	it("setupFPIContracts", async function () {
		var contracts = await setupFPIContracts();
	});

	it("stake", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupFPIContracts();
		// Transfer initial rewards to the pool
		await contracts.fpiToken.transfer(contracts.fpiStaking.address,"100000000000000000000");
		expect(await contracts.fpiToken.balanceOf(contracts.fpiStaking.address)).to.equal("100000000000000000000");

		// Stake
		await contracts.fpiToken.approve(contracts.fpiStaking.address,"100000000000000000000");
		await contracts.fpiStaking.stake("100000000000000000000");

		// Funds have move from owner to the staking pool
		expect(await contracts.fpiToken.balanceOf(contracts.fpiStaking.address)).to.equal("200000000000000000000");
		expect(await contracts.fpiToken.balanceOf(owner.address)).to.equal("800000000000000000000");

		// sFPI tokens have been minted
		expect(await contracts.sFPIToken.totalSupply()).to.equal("100000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equal("100000000000000000000");
	});

	it("stake-wait-unstake", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupFPIContracts();
		// Init and Stake
		await contracts.fpiToken.transfer(contracts.fpiStaking.address,"100000000000000000000");
		await contracts.fpiToken.approve(contracts.fpiStaking.address,"100000000000000000000");
		await contracts.fpiStaking.stake("100000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equal("100000000000000000000");

		var lastUpdatedTime = parseInt(await contracts.fpiStaking.lastUpdatedTime());
		// Staking multiplier starts at 1 and goes up at almost 1% in the first days and slower over time
		expect(await contracts.fpiStaking.stakingMultiplierAt(lastUpdatedTime+0)).to.equal("1000000000000000000"); // 2-exp(0) = 1.0
		expect(await contracts.fpiStaking.stakingMultiplierAt(lastUpdatedTime+1*24*60*60)).to.equal("1009950166250831946"); // 2-exp(-1/100) = 1.009950166
		expect(await contracts.fpiStaking.stakingMultiplierAt(lastUpdatedTime+2*24*60*60)).to.equal("1019801326693244697"); // 2-exp(-1/2) = 1.019801327
		expect(await contracts.fpiStaking.stakingMultiplierAt(lastUpdatedTime+10*24*60*60)).to.equal("1095162581964040426"); // 2-exp(-1/10) = 1.095162582
		expect(await contracts.fpiStaking.stakingMultiplierAt(lastUpdatedTime+100*24*60*60)).to.equal("1632120558828557678"); // 2-exp(-1) = 1.632120559

		// Wait and unstake
		expect(await contracts.fpiToken.balanceOf(owner.address)).to.equal("800000000000000000000");
		await contracts.sFPIToken.approve(contracts.fpiStaking.address,"100000000000000000000");
		await waitTill(lastUpdatedTime+100*24*60*60);
		await contracts.fpiStaking.unstake("100000000000000000000");
		expect(await contracts.fpiToken.balanceOf(owner.address)).to.be.closeTo("963212055882855767800","10000000000000");
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

async function setupFPIContracts() {
	const [owner,user1,user2,user3] = await ethers.getSigners();

	// Deploy FPI token and distribute
	const FPI = await ethers.getContractFactory("FPI");
	var fpiToken = await FPI.deploy();
	await fpiToken.mint(owner.address,"1000000000000000000000");
	await fpiToken.mint(user1.address,"1000000000000000000000");
	await fpiToken.mint(user2.address,"1000000000000000000000");
	await fpiToken.mint(user3.address,"1000000000000000000000");

	// Deploy FPIStaking
	const FPIStaking = await ethers.getContractFactory("FPIStaking");
	var fpiStaking = await FPIStaking.deploy(fpiToken.address, 100*24*60*60);

	const StakedFPI = await ethers.getContractFactory("StakedFPI");
	var sFPIToken = StakedFPI.attach((await fpiStaking.sFPI()));

	// Pack contracts in an object
	var result = {};
    result.fpiToken = fpiToken;
    result.fpiStaking = fpiStaking;
    result.sFPIToken = sFPIToken;
    return result;
}





