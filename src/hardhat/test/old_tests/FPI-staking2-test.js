const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FPI Staking2", function () {
	it("setupFPIContracts", async function () {
		var contracts = await setupFPIContracts();
	});

	it("stake", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupFPIContracts();
		// Transfer some rewards to the pool
		var rewardsAmount = BigInt("100000000000000000000");
		await contracts.fpiToken.transfer(contracts.fpiStaking.address,rewardsAmount);
		expect(await contracts.fpiToken.balanceOf(contracts.fpiStaking.address)).to.equal(rewardsAmount);

		// Stake
		var stakeAmount = BigInt("100000000000000000000");
		var balanceStart = BigInt(await contracts.fpiToken.balanceOf(owner.address));
		await contracts.fpiToken.approve(contracts.fpiStaking.address,stakeAmount);
		await contracts.fpiStaking.stake(stakeAmount);

		// Funds have moved from owner to the staking pool
		expect(await contracts.fpiToken.balanceOf(contracts.fpiStaking.address)).to.equal((stakeAmount+rewardsAmount).toString());
		expect(await contracts.fpiToken.balanceOf(owner.address)).to.equal(balanceStart-rewardsAmount);

		// sFPI tokens have been minted
		expect(await contracts.sFPIToken.totalSupply()).to.be.closeTo(stakeAmount.toString(), ethers.utils.parseUnits('100000000000000', 'wei'));
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.be.closeTo(stakeAmount.toString(), ethers.utils.parseUnits('100000000000000', 'wei'));
	});

	it("stakingMultiplierAt", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupFPIContracts();
		var contractsInitTime = parseInt(await contracts.fpiStaking.lastUpdatedTime());
		// Staking multiplier starts at 1 and goes up at almost 1% in the first days and slower over time
		var precision = ethers.utils.parseUnits('100000', 'wei');
		expect(await contracts.fpiStaking.stakingMultiplierAt(contractsInitTime+0)).to.equal("1000000000000000000",precision); // 1
		expect(await contracts.fpiStaking.stakingMultiplierAt(contractsInitTime+1*24*60*60)).to.be.closeTo("1010000000000000000",precision); // 1.01^1 = 1.01
		expect(await contracts.fpiStaking.stakingMultiplierAt(contractsInitTime+2*24*60*60)).to.be.closeTo("1020100000000000000",precision); // 1.01^2 = 1.0201
		expect(await contracts.fpiStaking.stakingMultiplierAt(contractsInitTime+10*24*60*60)).to.be.closeTo("1104622125411200000",precision); // 1.01^10 = 1.104622125
		expect(await contracts.fpiStaking.stakingMultiplierAt(contractsInitTime+100*24*60*60)).to.be.closeTo("2704813829421530000",precision); // 1.01^100 = 2.704813829
	});

	it("stake-wait-unstake", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupFPIContracts();

		// Init and Stake
		var rewardsAmount = BigInt("200000000000000000000");
		var stakeAmount = BigInt("100000000000000000000");
		var precision = ethers.utils.parseUnits('100000000000000', 'wei');
		await contracts.fpiToken.transfer(contracts.fpiStaking.address,rewardsAmount);
		await contracts.fpiToken.approve(contracts.fpiStaking.address,stakeAmount);
		await contracts.fpiStaking.stake(stakeAmount);
		var sFPITokenAmount = await contracts.sFPIToken.balanceOf(owner.address);
		expect(sFPITokenAmount).to.be.closeTo(stakeAmount.toString(), precision);

		var lastUpdatedTime = parseInt(await contracts.fpiStaking.lastUpdatedTime());

		// Wait and unstake
		var balanceStart = BigInt(await contracts.fpiToken.balanceOf(owner.address));
		await contracts.sFPIToken.approve(contracts.fpiStaking.address,sFPITokenAmount);
		await waitTill(lastUpdatedTime+100*24*60*60);
		await contracts.fpiStaking.unstake(sFPITokenAmount);
		var expectedBalanceEnd = BigInt(balanceStart)+BigInt("2704813829421530000")*BigInt(sFPITokenAmount)/BigInt("1000000000000000000");
		expect(await contracts.fpiToken.balanceOf(owner.address)).to.be.closeTo(expectedBalanceEnd.toString(),"10000000000000000");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equals("0");
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
	const FPIStaking = await ethers.getContractFactory("FPIStaking2");
	var fpiStaking = await FPIStaking.deploy(fpiToken.address, 24*60*60);

	const StakedFPI = await ethers.getContractFactory("StakedFPI");
	var sFPIToken = StakedFPI.attach((await fpiStaking.sFPI()));

	// Pack contracts in an object
	var result = {};
    result.fpiToken = fpiToken;
    result.fpiStaking = fpiStaking;
    result.sFPIToken = sFPIToken;
    return result;
}





